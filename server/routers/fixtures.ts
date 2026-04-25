import { z } from "zod";
import { eq, and, min } from "drizzle-orm";
import { router, tenantAdminProcedure, protectedProcedure, systemAdminProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { fixtures, teams, rounds, competitions, tenants, scheduledJobs } from "../../drizzle/schema";
import { EmailService } from "../services/emailService";

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Cancel all pending reminder + round_starting jobs for a round, then
 * reschedule them based on the new tipsCloseAt and the earliest fixture startTime.
 * Returns a summary of newly scheduled jobs for the UI confirmation panel.
 */
async function rescheduleRoundJobs(
  db: Awaited<ReturnType<typeof import("../db").getDb>>,
  roundId: number,
  tenantId: number,
  competitionId: number,
  newTipsCloseAt: Date | null,
  earliestStartTime: Date | null,
): Promise<Array<{ jobType: string; scheduledAt: Date }>> {
  if (!db) return [];
  const now = Date.now();

  const timeBasedJobTypes = [
    "admin_round_starting",
    "tips_closing_24h",
    "tips_closing_4h",
    "tips_closing_2h",
  ] as const;

  // Build the list of new jobs to insert before entering the transaction
  const toInsert: Array<{ jobType: string; scheduledAt: Date }> = [];

  if (earliestStartTime && earliestStartTime.getTime() > now) {
    const scheduledAt = new Date(earliestStartTime.getTime() - 4 * 60 * 60 * 1000);
    if (scheduledAt.getTime() > now) {
      toInsert.push({ jobType: "admin_round_starting", scheduledAt });
    }
  }

  if (newTipsCloseAt && newTipsCloseAt.getTime() > now) {
    const offsets: Array<{ jobType: string; offsetMs: number }> = [
      { jobType: "tips_closing_24h", offsetMs: 24 * 60 * 60 * 1000 },
      { jobType: "tips_closing_4h",  offsetMs:  4 * 60 * 60 * 1000 },
      { jobType: "tips_closing_2h",  offsetMs:  2 * 60 * 60 * 1000 },
    ];
    for (const { jobType, offsetMs } of offsets) {
      const scheduledAt = new Date(newTipsCloseAt.getTime() - offsetMs);
      if (scheduledAt.getTime() > now) {
        toInsert.push({ jobType, scheduledAt });
      }
    }
  }

  // Atomic: cancel existing pending jobs + insert new ones in a single transaction
  await db.transaction(async (tx) => {
    for (const jobType of timeBasedJobTypes) {
      await tx.update(scheduledJobs).set({ status: "cancelled" }).where(
        and(
          eq(scheduledJobs.jobType, jobType),
          eq(scheduledJobs.referenceId, roundId),
          eq(scheduledJobs.status, "pending"),
        )
      );
    }
    for (const { jobType, scheduledAt } of toInsert) {
      await tx.insert(scheduledJobs).values({
        jobType,
        referenceId: roundId,
        tenantId,
        scheduledAt,
        payload: JSON.stringify({ roundId, competitionId }),
      });
    }
  }).catch(() => { /* non-fatal: if transaction fails, jobs stay as-is */ });

  return toInsert;
}

export const fixturesRouter = router({
  // ── Public / protected ────────────────────────────────────────────────────

  // List fixtures for a round (enriched with team names)
  list: protectedProcedure
    .input(z.object({ roundId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const rows = await db.select().from(fixtures)
        .where(eq(fixtures.roundId, input.roundId))
        .orderBy(fixtures.startTime);
      const allTeams = await db.select().from(teams);
      const teamMap = Object.fromEntries(allTeams.map(t => [t.id, t]));
      return rows.map(f => ({
        ...f,
        homeTeam: teamMap[f.homeTeamId] ?? null,
        awayTeam: teamMap[f.awayTeamId] ?? null,
        winner: f.winnerId ? teamMap[f.winnerId] ?? null : null,
      }));
    }),

  // ── System Admin ──────────────────────────────────────────────────────────

  /**
   * Return all rounds across all tenants, enriched with competition name,
   * tenant name, and fixture count — for the system admin round selector.
   */
  listAllRounds: systemAdminProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) return [];
      const allRounds = await db.select({
        id:            rounds.id,
        roundNumber:   rounds.roundNumber,
        name:          rounds.name,
        status:        rounds.status,
        tipsCloseAt:   rounds.tipsCloseAt,
        competitionId: rounds.competitionId,
      }).from(rounds).orderBy(rounds.id);

      const allComps = await db.select({
        id:       competitions.id,
        name:     competitions.name,
        tenantId: competitions.tenantId,
      }).from(competitions);
      const compMap = Object.fromEntries(allComps.map(c => [c.id, c]));

      const allTenants = await db.select({ id: tenants.id, name: tenants.name }).from(tenants);
      const tenantMap = Object.fromEntries(allTenants.map(t => [t.id, t]));

      // Count fixtures per round in one query
      const allFixtures = await db.select({ roundId: fixtures.roundId }).from(fixtures);
      const fixtureCounts: Record<number, number> = {};
      for (const f of allFixtures) {
        fixtureCounts[f.roundId] = (fixtureCounts[f.roundId] ?? 0) + 1;
      }

      return allRounds.map(r => {
        const comp = compMap[r.competitionId];
        const tenant = comp ? tenantMap[comp.tenantId] : null;
        return {
          ...r,
          competitionName: comp?.name ?? "Unknown",
          tenantName: tenant?.name ?? "Unknown",
          fixtureCount: fixtureCounts[r.id] ?? 0,
        };
      });
    }),

  /**
   * Return all fixtures for a given round, enriched with team names and the
   * round's current tipsCloseAt — for the fixture editor table.
   */
  getFixturesForRound: systemAdminProcedure
    .input(z.object({ roundId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { fixtures: [], tipsCloseAt: null };

      const [round] = await db.select({
        tipsCloseAt:   rounds.tipsCloseAt,
        competitionId: rounds.competitionId,
      }).from(rounds).where(eq(rounds.id, input.roundId)).limit(1);

      const rows = await db.select().from(fixtures)
        .where(eq(fixtures.roundId, input.roundId))
        .orderBy(fixtures.startTime);

      const allTeams = await db.select().from(teams);
      const teamMap = Object.fromEntries(allTeams.map(t => [t.id, t]));

      return {
        tipsCloseAt: round?.tipsCloseAt ?? null,
        fixtures: rows.map(f => ({
          ...f,
          homeTeam: teamMap[f.homeTeamId] ?? null,
          awayTeam: teamMap[f.awayTeamId] ?? null,
        })),
      };
    }),

  /**
   * System admin: update a fixture's start time.
   * - Updates the fixture row
   * - Recalculates the round's tipsCloseAt to the earliest fixture startTime
   * - Cancels all pending time-based jobs for the round
   * - Reschedules admin_round_starting, tips_closing_24h/4h/2h
   * - Returns the new tipsCloseAt and a list of rescheduled jobs for the UI
   */
  systemUpdateStartTime: systemAdminProcedure
    .input(z.object({
      fixtureId: z.number(),
      startTime: z.string().nullable(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");

      const newStartTime = input.startTime ? new Date(input.startTime) : null;

      // 1. Update the fixture
      await db.update(fixtures)
        .set({ startTime: newStartTime })
        .where(eq(fixtures.id, input.fixtureId));

      // 2. Fetch the round + competition + tenant
      const [fixture] = await db.select({ roundId: fixtures.roundId })
        .from(fixtures).where(eq(fixtures.id, input.fixtureId)).limit(1);
      if (!fixture) return { success: true, newTipsCloseAt: null, scheduledJobs: [] };

      const [round] = await db.select({ competitionId: rounds.competitionId, tipsCloseAt: rounds.tipsCloseAt })
        .from(rounds).where(eq(rounds.id, fixture.roundId)).limit(1);
      if (!round) return { success: true, newTipsCloseAt: null, scheduledJobs: [] };

      const [comp] = await db.select({ tenantId: competitions.tenantId })
        .from(competitions).where(eq(competitions.id, round.competitionId)).limit(1);
      if (!comp) return { success: true, newTipsCloseAt: null, scheduledJobs: [] };

      // 3. Recalculate tipsCloseAt = earliest startTime across all fixtures in the round
      const [earliest] = await db
        .select({ minStart: min(fixtures.startTime) })
        .from(fixtures)
        .where(eq(fixtures.roundId, fixture.roundId));

      const newTipsCloseAt = earliest?.minStart ?? null;

      if (newTipsCloseAt) {
        await db.update(rounds)
          .set({ tipsCloseAt: newTipsCloseAt })
          .where(eq(rounds.id, fixture.roundId));
      }

      // 4. Cancel + reschedule all time-based jobs
      const rescheduled = await rescheduleRoundJobs(
        db,
        fixture.roundId,
        comp.tenantId,
        round.competitionId,
        newTipsCloseAt,
        newTipsCloseAt, // earliest fixture startTime drives admin_round_starting
      );

      return {
        success: true,
        newTipsCloseAt,
        scheduledJobs: rescheduled,
      };
    }),

  // ── Tenant Admin ──────────────────────────────────────────────────────────

  // Create fixture
  create: tenantAdminProcedure
    .input(z.object({
      roundId: z.number(),
      homeTeamId: z.number(),
      awayTeamId: z.number(),
      venue: z.string().optional(),
      startTime: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const startTime = input.startTime ? new Date(input.startTime) : null;
      await db.insert(fixtures).values({
        roundId: input.roundId,
        homeTeamId: input.homeTeamId,
        awayTeamId: input.awayTeamId,
        venue: input.venue ?? null,
        startTime,
        status: "scheduled",
      });
      // Schedule admin_round_starting job 4h before this fixture's startTime (non-fatal)
      if (startTime && startTime.getTime() > Date.now()) {
        const scheduledAt = new Date(startTime.getTime() - 4 * 60 * 60 * 1000);
        if (scheduledAt.getTime() > Date.now()) {
          const [round] = await db.select({ competitionId: rounds.competitionId })
            .from(rounds).where(eq(rounds.id, input.roundId)).limit(1);
          if (round) {
            const [comp] = await db.select({ tenantId: competitions.tenantId })
              .from(competitions).where(eq(competitions.id, round.competitionId)).limit(1);
            if (comp) {
              await db.insert(scheduledJobs).values({
                jobType: "admin_round_starting",
                referenceId: input.roundId,
                tenantId: comp.tenantId,
                scheduledAt,
                payload: JSON.stringify({ roundId: input.roundId, competitionId: round.competitionId }),
              }).catch(() => { /* non-fatal */ });
            }
          }
        }
      }
      return { success: true };
    }),

  // Enter result
  enterResult: tenantAdminProcedure
    .input(z.object({
      id: z.number(),
      homeScore: z.number(),
      awayScore: z.number(),
      winnerId: z.number().nullable(),
      margin: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db.update(fixtures).set({
        homeScore: input.homeScore,
        awayScore: input.awayScore,
        winnerId: input.winnerId,
        margin: input.margin ?? Math.abs(input.homeScore - input.awayScore),
        status: "completed",
      }).where(eq(fixtures.id, input.id));

      // Send admin_draw_match email when the result is a draw
      if (input.winnerId === null && input.homeScore === input.awayScore) {
        const [fixture] = await db.select({ roundId: fixtures.roundId, homeTeamId: fixtures.homeTeamId, awayTeamId: fixtures.awayTeamId })
          .from(fixtures).where(eq(fixtures.id, input.id)).limit(1);
        if (fixture) {
          const [round] = await db.select({ competitionId: rounds.competitionId, roundNumber: rounds.roundNumber, name: rounds.name })
            .from(rounds).where(eq(rounds.id, fixture.roundId)).limit(1);
          if (round) {
            const [comp] = await db.select({ tenantId: competitions.tenantId, name: competitions.name })
              .from(competitions).where(eq(competitions.id, round.competitionId)).limit(1);
            if (comp) {
              const [tenant] = await db.select({ contactEmail: tenants.contactEmail, name: tenants.name })
                .from(tenants).where(eq(tenants.id, comp.tenantId)).limit(1);
              if (tenant?.contactEmail) {
                const allTeams = await db.select().from(teams);
                const teamMap = Object.fromEntries(allTeams.map(t => [t.id, t]));
                const homeTeam = teamMap[fixture.homeTeamId]?.name ?? "Home";
                const awayTeam = teamMap[fixture.awayTeamId]?.name ?? "Away";
                EmailService.sendEmail({
                  to: tenant.contactEmail,
                  templateKey: "admin_draw_match",
                  tenantId: comp.tenantId,
                  transactional: true,
                  placeholders: {
                    user_name: tenant.name ?? "Admin",
                    competition_name: comp.name,
                    round_number: round.roundNumber,
                    round_name: round.name ?? `Round ${round.roundNumber}`,
                    home_team: homeTeam,
                    away_team: awayTeam,
                    score: `${input.homeScore}–${input.awayScore}`,
                    leaderboard_url: `/admin/competitions/${round.competitionId}`,
                  },
                }).catch(() => { /* non-fatal */ });
              }
            }
          }
        }
      }
      return { success: true };
    }),

  // Tenant admin: update a fixture's start time (reschedules admin_round_starting job only)
  updateStartTime: tenantAdminProcedure
    .input(z.object({
      id: z.number(),
      startTime: z.string().nullable(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const newStartTime = input.startTime ? new Date(input.startTime) : null;
      await db.update(fixtures).set({ startTime: newStartTime }).where(eq(fixtures.id, input.id));

      const [fixture] = await db.select({ roundId: fixtures.roundId })
        .from(fixtures).where(eq(fixtures.id, input.id)).limit(1);
      if (!fixture) return { success: true };

      await db.update(scheduledJobs).set({ status: "cancelled" }).where(
        and(
          eq(scheduledJobs.jobType, "admin_round_starting"),
          eq(scheduledJobs.referenceId, fixture.roundId),
          eq(scheduledJobs.status, "pending"),
        )
      ).catch(() => { /* non-fatal */ });

      if (newStartTime && newStartTime.getTime() > Date.now()) {
        const scheduledAt = new Date(newStartTime.getTime() - 4 * 60 * 60 * 1000);
        if (scheduledAt.getTime() > Date.now()) {
          const [round] = await db.select({ competitionId: rounds.competitionId })
            .from(rounds).where(eq(rounds.id, fixture.roundId)).limit(1);
          if (round) {
            const [comp] = await db.select({ tenantId: competitions.tenantId })
              .from(competitions).where(eq(competitions.id, round.competitionId)).limit(1);
            if (comp) {
              await db.insert(scheduledJobs).values({
                jobType: "admin_round_starting",
                referenceId: fixture.roundId,
                tenantId: comp.tenantId,
                scheduledAt,
                payload: JSON.stringify({ roundId: fixture.roundId, competitionId: round.competitionId }),
              }).catch(() => { /* non-fatal */ });
            }
          }
        }
      }
      return { success: true };
    }),
});

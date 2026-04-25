import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { router, tenantAdminProcedure, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { fixtures, teams, rounds, competitions, tenants, scheduledJobs } from "../../drizzle/schema";
import { EmailService } from "../services/emailService";

export const fixturesRouter = router({
  // List fixtures for a round
  list: protectedProcedure
    .input(z.object({ roundId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const rows = await db.select().from(fixtures)
        .where(eq(fixtures.roundId, input.roundId))
        .orderBy(fixtures.startTime);
      // Enrich with team names
      const allTeams = await db.select().from(teams);
      const teamMap = Object.fromEntries(allTeams.map(t => [t.id, t]));
      return rows.map(f => ({
        ...f,
        homeTeam: teamMap[f.homeTeamId] ?? null,
        awayTeam: teamMap[f.awayTeamId] ?? null,
        winner: f.winnerId ? teamMap[f.winnerId] ?? null : null,
      }));
    }),

  // Tenant admin: create fixture
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

  // Tenant admin: enter result
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

      // Send admin_draw_match email when the result is a draw (winnerId null, equal scores)
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

  // Tenant admin: update a fixture's start time (reschedules admin_round_starting job)
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

      // Cancel any pending admin_round_starting job for this fixture's round, then reschedule
      const [fixture] = await db.select({ roundId: fixtures.roundId })
        .from(fixtures).where(eq(fixtures.id, input.id)).limit(1);
      if (!fixture) return { success: true };

      // Cancel existing pending job for this round
      await db.update(scheduledJobs).set({ status: "cancelled" }).where(
        and(
          eq(scheduledJobs.jobType, "admin_round_starting"),
          eq(scheduledJobs.referenceId, fixture.roundId),
          eq(scheduledJobs.status, "pending"),
        )
      ).catch(() => { /* non-fatal */ });

      // Reschedule if new startTime is in the future
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

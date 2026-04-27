import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { router, tenantAdminProcedure, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { rounds, competitions, competitionEntrants, users, roundReminders, tips, fixtures, scheduledJobs } from "../../drizzle/schema";
import { notifyOwner } from "../_core/notification";
import { EmailService } from "../services/emailService";

/**
 * Inserts scheduled_jobs rows for time-based email reminders for a round.
 * All inserts are non-fatal (fire and forget).
 */
async function scheduleRoundEmailJobs(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  roundId: number,
  competitionId: number,
  tenantId: number,
  tipsCloseAt: Date | null,
): Promise<void> {
  if (!tipsCloseAt) return;
  const ms = tipsCloseAt.getTime();
  const now = Date.now();
  const jobs = [
    { jobType: "tips_closing_24h", scheduledAt: new Date(ms - 24 * 60 * 60 * 1000) },
    { jobType: "tips_closing_4h",  scheduledAt: new Date(ms -  4 * 60 * 60 * 1000) },
    { jobType: "tips_closing_2h",  scheduledAt: new Date(ms -  2 * 60 * 60 * 1000) },
  ].filter(j => j.scheduledAt.getTime() > now);
  if (jobs.length === 0) return;
  const payload = JSON.stringify({ roundId, competitionId });
  await db.insert(scheduledJobs)
    .values(jobs.map(j => ({ jobType: j.jobType, referenceId: roundId, tenantId, scheduledAt: j.scheduledAt, payload })))
    .catch(() => { /* non-fatal */ });
}

export const roundsRouter = router({
  // List rounds for a competition
  list: protectedProcedure
    .input(z.object({ competitionId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(rounds)
        .where(eq(rounds.competitionId, input.competitionId))
        .orderBy(rounds.roundNumber);
    }),

  // Tenant admin: create round
  create: tenantAdminProcedure
    .input(z.object({
      competitionId: z.number(),
      roundNumber: z.number(),
      name: z.string().optional(),
      tipsOpenAt: z.string().optional(),
      tipsCloseAt: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const tipsCloseAt = input.tipsCloseAt ? new Date(input.tipsCloseAt) : null;
      const [result] = await db.insert(rounds).values({
        competitionId: input.competitionId,
        roundNumber: input.roundNumber,
        name: input.name ?? `Round ${input.roundNumber}`,
        status: "upcoming",
        tipsOpenAt: input.tipsOpenAt ? new Date(input.tipsOpenAt) : null,
        tipsCloseAt,
      });
      // Schedule time-based reminder jobs if tipsCloseAt was provided
      if (tipsCloseAt) {
        const [comp] = await db.select({ tenantId: competitions.tenantId })
          .from(competitions).where(eq(competitions.id, input.competitionId)).limit(1);
        if (comp) {
          const newRoundId = (result as unknown as { insertId: number }).insertId;
          await scheduleRoundEmailJobs(db, newRoundId, input.competitionId, comp.tenantId, tipsCloseAt);
        }
      }
      return { success: true };
    }),

  // Tenant admin: update round status (open/close)
  setStatus: tenantAdminProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["upcoming", "open", "closed", "scored"]),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db.update(rounds).set({ status: input.status }).where(eq(rounds.id, input.id));
      return { success: true };
    }),

  // Tenant admin: set the tipsCloseAt deadline for a round
  setDeadline: tenantAdminProcedure
    .input(z.object({
      id: z.number(),
      tipsCloseAt: z.string(), // ISO date string
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const tipsCloseAt = new Date(input.tipsCloseAt);
      await db.update(rounds)
        .set({ tipsCloseAt })
        .where(eq(rounds.id, input.id));
      // Fetch round's competitionId and tenant to schedule reminder jobs
      const [round] = await db.select({ competitionId: rounds.competitionId })
        .from(rounds).where(eq(rounds.id, input.id)).limit(1);
      if (round) {
        const [comp] = await db.select({ tenantId: competitions.tenantId })
          .from(competitions).where(eq(competitions.id, round.competitionId)).limit(1);
        if (comp) {
          await scheduleRoundEmailJobs(db, input.id, round.competitionId, comp.tenantId, tipsCloseAt);
        }
      }
      return { success: true };
    }),

  // Get current open round for a competition
  getCurrent: protectedProcedure
    .input(z.object({ competitionId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const rows = await db.select().from(rounds)
        .where(and(eq(rounds.competitionId, input.competitionId), eq(rounds.status, "open")))
        .limit(1);
      return rows[0] ?? null;
    }),

  // Get reminder history for a round
  getReminderHistory: tenantAdminProcedure
    .input(z.object({ roundId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(roundReminders)
        .where(eq(roundReminders.roundId, input.roundId))
        .orderBy(roundReminders.sentAt);
    }),

  /**
   * Send reminder notifications to all active entrants in a competition round.
   *
   * Delivery model:
   * - Logs a reminder record in round_reminders (audit trail)
   * - Notifies the platform owner with a full participant summary
   * - In production this would dispatch a personalised email per entrant via
   *   a transactional email service (Resend / SendGrid). The per-entrant
   *   notification list is returned so the caller can display it in the UI.
   */
  sendRoundReminder: tenantAdminProcedure
    .input(z.object({
      roundId: z.number(),
      competitionId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");

      // Fetch the round
      const [round] = await db.select().from(rounds).where(eq(rounds.id, input.roundId)).limit(1);
      if (!round) throw new Error("Round not found");
      if (round.status !== "open") throw new Error("Reminders can only be sent for open rounds");

      // Fetch the competition name
      const [comp] = await db.select().from(competitions).where(eq(competitions.id, input.competitionId)).limit(1);
      if (!comp) throw new Error("Competition not found");

      // Fetch active entrants with their user details
      const entrantRows = await db
        .select({
          userId: competitionEntrants.userId,
          userName: users.name,
          userEmail: users.email,
        })
        .from(competitionEntrants)
        .innerJoin(users, eq(competitionEntrants.userId, users.id))
        .where(and(
          eq(competitionEntrants.competitionId, input.competitionId),
          eq(competitionEntrants.isActive, true),
        ));

      if (entrantRows.length === 0) {
        return { sent: 0, message: "No active participants to notify.", participants: [] };
      }

      // Format the deadline for display
      const deadline = round.tipsCloseAt
        ? new Date(round.tipsCloseAt).toLocaleString("en-AU", {
            weekday: "long",
            day: "numeric",
            month: "long",
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Australia/Sydney",
          })
        : "soon";

      const roundLabel = round.name ?? `Round ${round.roundNumber}`;

      // Build participant list for the owner notification
      const participantList = entrantRows
        .slice(0, 15)
        .map(e => `  • ${e.userName ?? "Unknown"} <${e.userEmail ?? "no email"}>`)
        .join("\n");
      const moreCount = entrantRows.length > 15 ? `\n  … and ${entrantRows.length - 15} more` : "";

      // Dispatch owner notification (in production: also send per-entrant emails)
      await notifyOwner({
        title: `Round reminder sent: ${comp.name} — ${roundLabel}`,
        content: [
          `A tipping deadline reminder has been dispatched to ${entrantRows.length} participant${entrantRows.length !== 1 ? "s" : ""}.`,
          ``,
          `Competition: ${comp.name}`,
          `Round: ${roundLabel}`,
          `Deadline: ${deadline}`,
          ``,
          `Participants notified:`,
          participantList + moreCount,
        ].join("\n"),
      }).catch(() => { /* non-fatal */ });

      // Send per-entrant reminder emails (non-fatal — fire and forget)
      for (const entrant of entrantRows) {
        if (entrant.userEmail) {
          EmailService.sendEmail({
            to: entrant.userEmail,
            templateKey: "entrant_tips_closing_24h",
            tenantId: comp.tenantId,
            placeholders: {
              user_name: entrant.userName ?? entrant.userEmail,
              competition_name: comp.name,
              round_number: round.roundNumber,
              round_close_time: deadline,
              games_list: "See the platform for this round's fixtures.",
              tips_url: `/comp/${comp.id}`,
            },
          }).catch(() => { /* non-fatal */ });
        }
      }

      // Log the reminder send in the database
      await db.insert(roundReminders).values({
        roundId: input.roundId,
        competitionId: input.competitionId,
        recipientCount: entrantRows.length,
        sentByUserId: ctx.user.id,
      });

      return {
        sent: entrantRows.length,
        deadline,
        roundLabel,
        participants: entrantRows.map(e => ({ name: e.userName, email: e.userEmail })),
        message: `Reminder sent to ${entrantRows.length} participant${entrantRows.length !== 1 ? "s" : ""}.`,
      };
    }),
  /**
   * Send a 2-hour reminder to entrants who have NOT yet submitted any tips
   * for the specified round.  Uses a single SQL query to find the gap between
   * all active entrants and those who already have at least one tip for a
   * fixture in this round, keeping DB load minimal.
   *
   * Intended to be called by an automated scheduler (e.g. a cron job or the
   * scheduledJobsProcessor) 2 hours before the round's tipsCloseAt time.
   * Can also be triggered manually by a tenant admin.
   */
  send2hReminder: tenantAdminProcedure
    .input(z.object({
      roundId: z.number(),
      competitionId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");

      // Fetch round
      const [round] = await db.select().from(rounds).where(eq(rounds.id, input.roundId)).limit(1);
      if (!round) throw new Error("Round not found");
      if (round.status !== "open") throw new Error("Reminders can only be sent for open rounds");

      // Fetch competition
      const [comp] = await db.select().from(competitions).where(eq(competitions.id, input.competitionId)).limit(1);
      if (!comp) throw new Error("Competition not found");

      // Get all fixture IDs for this round (used to detect whether a user has tipped)
      const roundFixtures = await db
        .select({ id: fixtures.id })
        .from(fixtures)
        .where(eq(fixtures.roundId, input.roundId));
      const fixtureIds = roundFixtures.map((f) => f.id);

      // Get all active entrants
      const allEntrants = await db
        .select({
          userId: competitionEntrants.userId,
          userName: users.name,
          userEmail: users.email,
        })
        .from(competitionEntrants)
        .innerJoin(users, eq(competitionEntrants.userId, users.id))
        .where(and(
          eq(competitionEntrants.competitionId, input.competitionId),
          eq(competitionEntrants.isActive, true),
        ));

      if (allEntrants.length === 0) {
        return { sent: 0, skipped: 0, message: "No active participants." };
      }

      // Get distinct userIds who already have at least one tip for this round
      let tippedUserIds = new Set<number>();
      if (fixtureIds.length > 0) {
        const tippedRows = await db
          .select({ userId: tips.userId, fixtureId: tips.fixtureId })
          .from(tips)
          .where(eq(tips.competitionId, input.competitionId));
        // Filter to only tips that belong to fixtures in this round
        tippedRows
          .filter((t) => fixtureIds.includes(t.fixtureId))
          .forEach((t) => tippedUserIds.add(t.userId));
      }

      // Only notify entrants who have NOT yet tipped
      const untippedEntrants = allEntrants.filter((e) => !tippedUserIds.has(e.userId));

      if (untippedEntrants.length === 0) {
        return { sent: 0, skipped: allEntrants.length, message: "All participants have already submitted tips." };
      }

      const roundLabel = round.name ?? `Round ${round.roundNumber}`;

      // Send per-entrant 2h reminder emails (non-fatal — fire and forget)
      for (const entrant of untippedEntrants) {
        if (entrant.userEmail) {
          EmailService.sendEmail({
            to: entrant.userEmail,
            templateKey: "entrant_tips_closing_2h",
            tenantId: comp.tenantId,
            placeholders: {
              user_name: entrant.userName ?? entrant.userEmail,
              competition_name: comp.name,
              round_number: round.roundNumber,
              tips_url: `/comp/${comp.id}`,
            },
          }).catch(() => { /* non-fatal */ });
        }
      }

      // Owner notification (non-fatal)
      await notifyOwner({
        title: `2h reminder sent: ${comp.name} — ${roundLabel}`,
        content: [
          `A 2-hour deadline reminder was sent to ${untippedEntrants.length} participant(s) who had not yet tipped.`,
          `${tippedUserIds.size} participant(s) already had tips and were skipped.`,
          `Competition: ${comp.name}`,
          `Round: ${roundLabel}`,
        ].join("\n"),
      }).catch(() => { /* non-fatal */ });

      return {
        sent: untippedEntrants.length,
        skipped: tippedUserIds.size,
        message: `2h reminder sent to ${untippedEntrants.length} participant(s). ${tippedUserIds.size} already tipped (skipped).`,
      };
    }),

  // Tenant admin: set the tie-breaker fixture for a round
  setTieBreaker: tenantAdminProcedure
    .input(z.object({
      roundId: z.number(),
      fixtureId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const tenantId = ctx.user.tenantId;
      if (!tenantId) throw new Error("No tenant assigned");
      const [round] = await db
        .select({ id: rounds.id, competitionId: rounds.competitionId })
        .from(rounds)
        .where(eq(rounds.id, input.roundId))
        .limit(1);
      if (!round) throw new Error("Round not found");
      const [comp] = await db
        .select({ id: competitions.id })
        .from(competitions)
        .where(and(eq(competitions.id, round.competitionId), eq(competitions.tenantId, tenantId)))
        .limit(1);
      if (!comp) throw new Error("Competition not found or access denied");
      await db.update(rounds)
        .set({ tieBreakerFixtureId: input.fixtureId })
        .where(eq(rounds.id, input.roundId));
      return { success: true };
    }),

  // Tenant admin: get all fixtures for a round
  getFixtures: tenantAdminProcedure
    .input(z.object({ roundId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db
        .select()
        .from(fixtures)
        .where(eq(fixtures.roundId, input.roundId))
        .orderBy(fixtures.startTime);
    }),

});

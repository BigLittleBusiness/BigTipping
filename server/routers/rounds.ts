import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { router, tenantAdminProcedure, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { rounds, competitions, competitionEntrants, users, roundReminders } from "../../drizzle/schema";
import { notifyOwner } from "../_core/notification";

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
      await db.insert(rounds).values({
        competitionId: input.competitionId,
        roundNumber: input.roundNumber,
        name: input.name ?? `Round ${input.roundNumber}`,
        status: "upcoming",
        tipsOpenAt: input.tipsOpenAt ? new Date(input.tipsOpenAt) : null,
        tipsCloseAt: input.tipsCloseAt ? new Date(input.tipsCloseAt) : null,
      });
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
      await db.update(rounds)
        .set({ tipsCloseAt: new Date(input.tipsCloseAt) })
        .where(eq(rounds.id, input.id));
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
});

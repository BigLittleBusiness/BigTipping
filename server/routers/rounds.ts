import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { router, tenantAdminProcedure, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { rounds } from "../../drizzle/schema";

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
});

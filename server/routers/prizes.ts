import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { router, tenantAdminProcedure, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { prizes, users } from "../../drizzle/schema";

export const prizesRouter = router({
  // List prizes for a competition
  list: protectedProcedure
    .input(z.object({ competitionId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const rows = await db.select().from(prizes).where(eq(prizes.competitionId, input.competitionId));
      const allUsers = await db.select().from(users);
      const userMap = Object.fromEntries(allUsers.map(u => [u.id, u]));
      return rows.map(p => ({
        ...p,
        awardedTo: p.awardedToUserId ? userMap[p.awardedToUserId] ?? null : null,
      }));
    }),

  // Tenant admin: create prize
  create: tenantAdminProcedure
    .input(z.object({
      competitionId: z.number(),
      name: z.string().min(1),
      description: z.string().optional(),
      type: z.enum(["weekly", "season", "special"]),
      roundId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const tenantId = ctx.user.tenantId;
      if (!tenantId) throw new Error("No tenant assigned");
      await db.insert(prizes).values({
        competitionId: input.competitionId,
        tenantId,
        name: input.name,
        description: input.description ?? null,
        type: input.type,
        roundId: input.roundId ?? null,
        isAwarded: false,
      });
      return { success: true };
    }),

  // Tenant admin: award prize to user
  award: tenantAdminProcedure
    .input(z.object({
      prizeId: z.number(),
      userId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db.update(prizes).set({
        awardedToUserId: input.userId,
        isAwarded: true,
      }).where(eq(prizes.id, input.prizeId));
      return { success: true };
    }),
});

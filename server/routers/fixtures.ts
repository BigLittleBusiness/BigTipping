import { z } from "zod";
import { eq } from "drizzle-orm";
import { router, tenantAdminProcedure, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { fixtures, teams } from "../../drizzle/schema";

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
      await db.insert(fixtures).values({
        roundId: input.roundId,
        homeTeamId: input.homeTeamId,
        awayTeamId: input.awayTeamId,
        venue: input.venue ?? null,
        startTime: input.startTime ? new Date(input.startTime) : null,
        status: "scheduled",
      });
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
      return { success: true };
    }),
});

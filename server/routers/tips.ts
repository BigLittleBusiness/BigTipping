import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { router, entrantProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { tips, fixtures, teams } from "../../drizzle/schema";

export const tipsRouter = router({
  // Submit or update a tip
  submit: entrantProcedure
    .input(z.object({
      fixtureId: z.number(),
      competitionId: z.number(),
      pickedTeamId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db.insert(tips).values({
        userId: ctx.user.id,
        fixtureId: input.fixtureId,
        competitionId: input.competitionId,
        pickedTeamId: input.pickedTeamId,
        isCorrect: null,
        pointsEarned: 0,
      }).onDuplicateKeyUpdate({
        set: { pickedTeamId: input.pickedTeamId, isCorrect: null, pointsEarned: 0 },
      });
      return { success: true };
    }),

  // Get my tips for a round
  myRoundTips: entrantProcedure
    .input(z.object({ roundId: z.number(), competitionId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      // Get fixtures for the round
      const roundFixtures = await db.select().from(fixtures).where(eq(fixtures.roundId, input.roundId));
      const fixtureIds = roundFixtures.map(f => f.id);
      if (!fixtureIds.length) return [];
      // Get my tips for those fixtures
      const myTips = await db.select().from(tips).where(
        and(eq(tips.userId, ctx.user.id), eq(tips.competitionId, input.competitionId))
      );
      const tipMap = Object.fromEntries(myTips.map(t => [t.fixtureId, t]));
      const allTeams = await db.select().from(teams);
      const teamMap = Object.fromEntries(allTeams.map(t => [t.id, t]));
      return roundFixtures.map(f => ({
        fixture: {
          ...f,
          homeTeam: teamMap[f.homeTeamId] ?? null,
          awayTeam: teamMap[f.awayTeamId] ?? null,
          winner: f.winnerId ? teamMap[f.winnerId] ?? null : null,
        },
        tip: tipMap[f.id] ?? null,
        pickedTeam: tipMap[f.id] ? teamMap[tipMap[f.id].pickedTeamId] ?? null : null,
      }));
    }),

  // Get my full tip history for a competition
  myHistory: entrantProcedure
    .input(z.object({ competitionId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      const myTips = await db.select().from(tips).where(
        and(eq(tips.userId, ctx.user.id), eq(tips.competitionId, input.competitionId))
      );
      const allTeams = await db.select().from(teams);
      const teamMap = Object.fromEntries(allTeams.map(t => [t.id, t]));
      return myTips.map(t => ({
        ...t,
        pickedTeam: teamMap[t.pickedTeamId] ?? null,
      }));
    }),
});

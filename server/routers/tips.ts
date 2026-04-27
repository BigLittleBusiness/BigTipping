import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, entrantProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { tips, fixtures, teams, rounds } from "../../drizzle/schema";

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

      // ── Server-side lock-out: verify round is open and deadline hasn't passed ──
      const [fixture] = await db.select().from(fixtures).where(eq(fixtures.id, input.fixtureId)).limit(1);
      if (!fixture) throw new TRPCError({ code: "NOT_FOUND", message: "Fixture not found" });

      const [round] = await db.select().from(rounds).where(eq(rounds.id, fixture.roundId)).limit(1);
      if (!round) throw new TRPCError({ code: "NOT_FOUND", message: "Round not found" });

      if (round.status !== "open") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: round.status === "upcoming"
            ? "Tipping has not opened yet for this round."
            : "Tipping is closed for this round.",
        });
      }

      if (round.tipsCloseAt && new Date() > new Date(round.tipsCloseAt)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "The tipping deadline for this round has passed.",
        });
      }

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

  // Get my summary stats for a specific round (correct count, total, points earned)
  myRoundSummary: entrantProcedure
    .input(z.object({ roundId: z.number(), competitionId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return null;
      // Get all fixture IDs for this round
      const roundFixtures = await db.select({ id: fixtures.id })
        .from(fixtures)
        .where(eq(fixtures.roundId, input.roundId));
      if (!roundFixtures.length) return null;
      const fixtureIds = roundFixtures.map(f => f.id);
      // Get my tips for those fixtures in this competition
      const myTips = await db.select().from(tips).where(
        and(eq(tips.userId, ctx.user.id), eq(tips.competitionId, input.competitionId))
      );
      const relevantTips = myTips.filter(t => fixtureIds.includes(t.fixtureId));
      if (!relevantTips.length) return null;
      // Only show summary if at least one tip has been scored
      const scored = relevantTips.some(t => t.isCorrect !== null);
      if (!scored) return null;
      const totalTips    = relevantTips.length;
      const correctTips  = relevantTips.filter(t => t.isCorrect === true).length;
      const pointsEarned = relevantTips.reduce((sum, t) => sum + (t.pointsEarned ?? 0), 0);
      // Get round label
      const [round] = await db.select({ roundNumber: rounds.roundNumber, name: rounds.name })
        .from(rounds).where(eq(rounds.id, input.roundId)).limit(1);
      return {
        roundId:     input.roundId,
        roundLabel:  round?.name ?? `Round ${round?.roundNumber ?? "?"}`,
        totalTips,
        correctTips,
        pointsEarned,
      };
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

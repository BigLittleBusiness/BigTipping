import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, entrantProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { tips, fixtures, teams, rounds, competitions } from "../../drizzle/schema";

export const tipsRouter = router({
  // Submit or update a tip (pickedTeamId is null for draw tips)
  submit: entrantProcedure
    .input(z.object({
      fixtureId: z.number(),
      competitionId: z.number(),
      pickedTeamId: z.number().nullable().optional(),
      isDraw: z.boolean().optional().default(false),
      tieBreakerValue: z.number().int().optional().nullable(),
      useJoker: z.boolean().optional().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");

      // Validate: must pick a team OR select draw
      if (!input.isDraw && input.pickedTeamId == null) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Must pick a team or select Draw." });
      }

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

      const pickedTeamId = input.isDraw ? null : (input.pickedTeamId ?? null);
      const isDraw = input.isDraw ?? false;

      const tieBreakerValue = input.tieBreakerValue ?? null;
      const useJoker = input.useJoker ?? false;

      await db.insert(tips).values({
        userId: ctx.user.id,
        fixtureId: input.fixtureId,
        competitionId: input.competitionId,
        pickedTeamId,
        isDraw,
        tieBreakerValue,
        useJoker,
        isCorrect: null,
        pointsEarned: 0,
      }).onDuplicateKeyUpdate({
        set: { pickedTeamId, isDraw, tieBreakerValue, useJoker, isCorrect: null, pointsEarned: 0 },
      });
      return { success: true };
    }),

  // Get my tips for a round (includes bye teams inferred from sport)
  myRoundTips: entrantProcedure
    .input(z.object({ roundId: z.number(), competitionId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { fixtures: [], byeTeams: [] };
      // Get the competition to find the sport
      const [comp] = await db.select({ sportId: competitions.sportId })
        .from(competitions).where(eq(competitions.id, input.competitionId)).limit(1);
      // Get fixtures for the round
      const roundFixtures = await db.select().from(fixtures).where(eq(fixtures.roundId, input.roundId));
      // Get all active teams for this sport
      const sportTeams = comp
        ? await db.select().from(teams).where(and(eq(teams.sportId, comp.sportId), eq(teams.isActive, true)))
        : [];
      const teamMap = Object.fromEntries(sportTeams.map(t => [t.id, t]));
      // Determine bye teams: active sport teams not in any fixture this round
      const playingTeamIds = new Set<number>();
      for (const f of roundFixtures) {
        playingTeamIds.add(f.homeTeamId);
        playingTeamIds.add(f.awayTeamId);
      }
      const byeTeams = sportTeams.filter(t => !playingTeamIds.has(t.id));
      if (!roundFixtures.length) return { fixtures: [], byeTeams };
      // Get my tips for those fixtures
      const myTips = await db.select().from(tips).where(
        and(eq(tips.userId, ctx.user.id), eq(tips.competitionId, input.competitionId))
      );
      const tipMap = Object.fromEntries(myTips.map(t => [t.fixtureId, t]));
      const fixtureRows = roundFixtures.map(f => ({
        fixture: {
          ...f,
          homeTeam: teamMap[f.homeTeamId] ?? null,
          awayTeam: teamMap[f.awayTeamId] ?? null,
          winner: f.winnerId ? teamMap[f.winnerId] ?? null : null,
        },
        tip: tipMap[f.id] ?? null,
        pickedTeam: tipMap[f.id]?.pickedTeamId != null ? teamMap[tipMap[f.id]!.pickedTeamId!] ?? null : null,
      }));
      return { fixtures: fixtureRows, byeTeams };
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

  // Get my round-by-round points breakdown for a competition
  myRoundBreakdown: entrantProcedure
    .input(z.object({ competitionId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      const myTips = await db.select().from(tips).where(
        and(eq(tips.userId, ctx.user.id), eq(tips.competitionId, input.competitionId))
      );
      if (!myTips.length) return [];
      // Get all fixtures to map fixtureId -> roundId
      const allFixtures = await db.select({ id: fixtures.id, roundId: fixtures.roundId }).from(fixtures);
      const fixtureToRound = Object.fromEntries(allFixtures.map(f => [f.id, f.roundId]));
      // Get all rounds for this competition
      const allRounds = await db.select().from(rounds).where(eq(rounds.competitionId, input.competitionId));
      const roundMap = Object.fromEntries(allRounds.map(r => [r.id, r]));
      // Aggregate tips by round
      const byRound: Record<number, { points: number; correct: number; total: number }> = {};
      for (const tip of myTips) {
        const roundId = fixtureToRound[tip.fixtureId];
        if (!roundId) continue;
        if (!byRound[roundId]) byRound[roundId] = { points: 0, correct: 0, total: 0 };
        byRound[roundId].points  += tip.pointsEarned ?? 0;
        byRound[roundId].correct += tip.isCorrect === true ? 1 : 0;
        byRound[roundId].total   += 1;
      }
      // Return only scored rounds (those with at least one scored tip)
      return Object.entries(byRound)
        .filter(([roundId]) => {
          const r = roundMap[Number(roundId)];
          return r?.status === "scored";
        })
        .map(([roundId, stats]) => {
          const r = roundMap[Number(roundId)];
          return {
            roundId:     Number(roundId),
            roundLabel:  r?.name ?? `Round ${r?.roundNumber ?? "?"}`,
            roundNumber: r?.roundNumber ?? 0,
            points:      stats.points,
            correct:     stats.correct,
            total:       stats.total,
          };
        })
        .sort((a, b) => a.roundNumber - b.roundNumber);
    }),

  // Get my full tip history for a competition (enriched with fixture + round context)
  myHistory: entrantProcedure
    .input(z.object({ competitionId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      const myTips = await db.select().from(tips).where(
        and(eq(tips.userId, ctx.user.id), eq(tips.competitionId, input.competitionId))
      );
      if (!myTips.length) return [];
      // Fetch all fixtures and rounds referenced by these tips
      const allFixtures = await db.select().from(fixtures);
      const allRounds   = await db.select().from(rounds);
      const allTeams    = await db.select().from(teams);
      const fixtureMap  = Object.fromEntries(allFixtures.map(f => [f.id, f]));
      const roundMap    = Object.fromEntries(allRounds.map(r => [r.id, r]));
      const teamMap     = Object.fromEntries(allTeams.map(t => [t.id, t]));
      return myTips.map(t => {
        const fixture = fixtureMap[t.fixtureId] ?? null;
        const round   = fixture ? roundMap[fixture.roundId] ?? null : null;
        return {
          ...t,
          pickedTeam:  t.pickedTeamId != null ? teamMap[t.pickedTeamId] ?? null : null,
          fixture: fixture ? {
            id:          fixture.id,
            venue:       fixture.venue,
            startTime:   fixture.startTime,
            homeScore:   fixture.homeScore,
            awayScore:   fixture.awayScore,
            winnerId:    fixture.winnerId,
            homeTeam:    teamMap[fixture.homeTeamId] ?? null,
            awayTeam:    teamMap[fixture.awayTeamId] ?? null,
          } : null,
          round: round ? {
            id:          round.id,
            roundNumber: round.roundNumber,
            name:        round.name,
          } : null,
        };
      });
    }),
});

import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { router, tenantAdminProcedure, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { leaderboardEntries, tips, fixtures, rounds, users, competitions } from "../../drizzle/schema";

export const leaderboardRouter = router({
  // Get leaderboard for a competition (top N)
  get: protectedProcedure
    .input(z.object({ competitionId: z.number(), limit: z.number().default(50) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const entries = await db.select().from(leaderboardEntries)
        .where(eq(leaderboardEntries.competitionId, input.competitionId))
        .orderBy(desc(leaderboardEntries.totalPoints), desc(leaderboardEntries.correctTips))
        .limit(input.limit);
      const allUsers = await db.select().from(users);
      const userMap = Object.fromEntries(allUsers.map(u => [u.id, u]));
      return entries.map((e, idx) => ({
        ...e,
        rank: idx + 1,
        user: userMap[e.userId] ? { id: userMap[e.userId].id, name: userMap[e.userId].name } : null,
        rankBadge: idx === 0 ? "Gold" : idx === 1 ? "Silver" : idx === 2 ? "Bronze" : null,
      }));
    }),

  // Get my leaderboard position
  myPosition: protectedProcedure
    .input(z.object({ competitionId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return null;
      const rows = await db.select().from(leaderboardEntries)
        .where(and(
          eq(leaderboardEntries.competitionId, input.competitionId),
          eq(leaderboardEntries.userId, ctx.user.id)
        )).limit(1);
      return rows[0] ?? null;
    }),

  // Tenant admin: trigger scoring for a round
  scoreRound: tenantAdminProcedure
    .input(z.object({ roundId: z.number(), competitionId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");

      // Get competition scoring rules
      const compRows = await db.select().from(competitions).where(eq(competitions.id, input.competitionId)).limit(1);
      const comp = compRows[0];
      if (!comp) throw new Error("Competition not found");
      const rules = comp.scoringRules ?? { pointsPerCorrectTip: 1, bonusPerfectRound: 3, streakBonusEnabled: false };

      // Get all fixtures for this round
      const roundFixtures = await db.select().from(fixtures).where(
        and(eq(fixtures.roundId, input.roundId), eq(fixtures.status, "completed"))
      );
      if (!roundFixtures.length) return { scored: 0 };

      const fixtureIds = roundFixtures.map(f => f.id);
      const winnerMap = Object.fromEntries(roundFixtures.map(f => [f.id, f.winnerId]));

      // Get all tips for these fixtures in this competition
      const allTips = await db.select().from(tips).where(
        eq(tips.competitionId, input.competitionId)
      );
      const relevantTips = allTips.filter(t => fixtureIds.includes(t.fixtureId));

      // Group tips by user
      const tipsByUser: Record<number, typeof relevantTips> = {};
      for (const tip of relevantTips) {
        if (!tipsByUser[tip.userId]) tipsByUser[tip.userId] = [];
        tipsByUser[tip.userId].push(tip);
      }

      // Score each user
      for (const [userIdStr, userTips] of Object.entries(tipsByUser)) {
        const userId = Number(userIdStr);
        let roundPoints = 0;
        let roundCorrect = 0;

        for (const tip of userTips) {
          const correctWinner = winnerMap[tip.fixtureId];
          const isCorrect = correctWinner !== null && correctWinner !== undefined && tip.pickedTeamId === correctWinner;
          const pts = isCorrect ? rules.pointsPerCorrectTip : 0;
          await db.update(tips).set({ isCorrect, pointsEarned: pts }).where(eq(tips.id, tip.id));
          if (isCorrect) { roundCorrect++; roundPoints += pts; }
        }

        // Bonus for perfect round
        const perfectRound = roundCorrect === fixtureIds.length && fixtureIds.length > 0;
        if (perfectRound) roundPoints += rules.bonusPerfectRound;

        // Update leaderboard entry
        const existing = await db.select().from(leaderboardEntries).where(
          and(eq(leaderboardEntries.competitionId, input.competitionId), eq(leaderboardEntries.userId, userId))
        ).limit(1);

        if (existing.length) {
          const prev = existing[0];
          const newStreak = roundCorrect > 0 ? prev.currentStreak + 1 : 0;
          await db.update(leaderboardEntries).set({
            totalPoints: prev.totalPoints + roundPoints,
            correctTips: prev.correctTips + roundCorrect,
            totalTips: prev.totalTips + userTips.length,
            currentStreak: newStreak,
            bestStreak: Math.max(prev.bestStreak, newStreak),
            previousRank: prev.rank,
          }).where(eq(leaderboardEntries.id, prev.id));
        } else {
          await db.insert(leaderboardEntries).values({
            competitionId: input.competitionId,
            userId,
            totalPoints: roundPoints,
            correctTips: roundCorrect,
            totalTips: userTips.length,
            currentStreak: roundCorrect > 0 ? 1 : 0,
            bestStreak: roundCorrect > 0 ? 1 : 0,
          });
        }
      }

      // Re-rank all entries
      const allEntries = await db.select().from(leaderboardEntries)
        .where(eq(leaderboardEntries.competitionId, input.competitionId))
        .orderBy(desc(leaderboardEntries.totalPoints), desc(leaderboardEntries.correctTips));

      for (let i = 0; i < allEntries.length; i++) {
        await db.update(leaderboardEntries)
          .set({ rank: i + 1 })
          .where(eq(leaderboardEntries.id, allEntries[i].id));
      }

      // Mark round as scored
      await db.update(rounds).set({ status: "scored", scoringCompleted: true }).where(eq(rounds.id, input.roundId));

      return { scored: relevantTips.length };
    }),
});

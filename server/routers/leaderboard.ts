import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { router, tenantAdminProcedure, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { leaderboardEntries, tips, fixtures, rounds, users, competitions, tenants, scheduledJobs, emailEvents } from "../../drizzle/schema";
import { EmailService } from "../services/emailService";

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

      // Mark round as scored and record the timestamp
      const scoredAt = new Date();
      await db.update(rounds).set({ status: "scored", scoringCompleted: true, scoredAt }).where(eq(rounds.id, input.roundId));

      // Schedule admin digest email 24 hours after scoring (best-effort)
      const digestScheduledAt = new Date(scoredAt.getTime() + 24 * 60 * 60 * 1000);
      await db.insert(scheduledJobs).values({
        jobType: "admin_weekly_digest",
        referenceId: input.roundId,
        tenantId: comp.tenantId,
        scheduledAt: digestScheduledAt,
        payload: JSON.stringify({ roundId: input.roundId, competitionId: input.competitionId }),
      }).catch(() => { /* non-fatal */ });

      // ── Post-scoring emails ────────────────────────────────────────────────
      // Fetch the round details for email placeholders
      const [roundRow] = await db.select().from(rounds).where(eq(rounds.id, input.roundId)).limit(1);
      const roundNumber = roundRow?.roundNumber ?? input.roundId;
      const totalFixtures = fixtureIds.length;

      // Send per-entrant round results emails (non-fatal)
      const allEntrantsForEmail = await db.select({ userId: leaderboardEntries.userId })
        .from(leaderboardEntries)
        .where(eq(leaderboardEntries.competitionId, input.competitionId));

      for (const entrant of allEntrantsForEmail) {
        const [entrantUser] = await db.select({ email: users.email, name: users.name })
          .from(users).where(eq(users.id, entrant.userId)).limit(1);
        if (!entrantUser?.email) continue;

        const userTips = tipsByUser[entrant.userId] ?? [];
        const correct = userTips.filter(t => winnerMap[t.fixtureId] !== null && t.pickedTeamId === winnerMap[t.fixtureId]).length;

        EmailService.sendEmail({
          to: entrantUser.email,
          templateKey: "entrant_round_results",
          tenantId: comp.tenantId,
          placeholders: {
            user_name: entrantUser.name ?? entrantUser.email,
            competition_name: comp.name,
            round_number: roundNumber,
            score: correct,
            total: totalFixtures,
            results_table_rows: "",
            leaderboard_url: `/comp/${input.competitionId}`,
          },
        }).catch(() => { /* non-fatal */ });
      }

      // Determine round winner (rank 1 after re-ranking)
      const [winner] = await db.select().from(leaderboardEntries)
        .where(and(
          eq(leaderboardEntries.competitionId, input.competitionId),
          eq(leaderboardEntries.rank, 1)
        )).limit(1);

      if (winner) {
        const [winnerUser] = await db.select({ email: users.email, name: users.name })
          .from(users).where(eq(users.id, winner.userId)).limit(1);

        // Notify winner
        if (winnerUser?.email) {
          EmailService.sendEmail({
            to: winnerUser.email,
            templateKey: "entrant_weekly_winner",
            tenantId: comp.tenantId,
            placeholders: {
              user_name: winnerUser.name ?? winnerUser.email,
              competition_name: comp.name,
              round_number: roundNumber,
              score: winner.correctTips,
              total: totalFixtures,
              prize_description: "Check with your competition organiser",
              leaderboard_url: `/comp/${input.competitionId}`,
            },
          }).catch(() => { /* non-fatal */ });
        }
      }

      // ── Admin notification emails ───────────────────────────────────────────────
      // Fetch the tenant admin email for this competition
      const [tenantRow] = await db.select().from(tenants)
        .where(eq(tenants.id, comp.tenantId)).limit(1);
      const adminEmail = tenantRow?.contactEmail;
      const adminName = tenantRow?.name ?? "Admin";

      if (adminEmail) {
        // admin_round_scored notification
        EmailService.sendEmail({
          to: adminEmail,
          templateKey: "admin_round_scored",
          tenantId: comp.tenantId,
          transactional: true,
          placeholders: {
            user_name: adminName,
            competition_name: comp.name,
            round_number: roundNumber,
            leaderboard_url: `/admin/competitions/${input.competitionId}`,
          },
        }).catch(() => { /* non-fatal */ });

        // admin_round_winner notification (if winner exists)
        if (winner) {
          const [winnerUser2] = await db.select({ name: users.name })
            .from(users).where(eq(users.id, winner.userId)).limit(1);
          const winnerName = winnerUser2?.name ?? `User #${winner.userId}`;

          EmailService.sendEmail({
            to: adminEmail,
            templateKey: "admin_round_winner",
            tenantId: comp.tenantId,
            transactional: true,
            placeholders: {
              user_name: adminName,
              competition_name: comp.name,
              round_number: roundNumber,
              winner_name: winnerName,
              winner_score: winner.correctTips,
              margin: 0,
              prize_description: "Check prize configuration",
              leaderboard_url: `/admin/competitions/${input.competitionId}`,
            },
          }).catch(() => { /* non-fatal */ });
        }
      }

      // ── Milestone emails (idempotent: skip if already sent for this user+round) ──
      // Re-fetch updated entries with streak/rank data for milestone detection
      const updatedEntries = await db.select().from(leaderboardEntries)
        .where(eq(leaderboardEntries.competitionId, input.competitionId));
      const STREAK_MILESTONES = [5, 10, 15, 20];
      const RANK_MILESTONES = [10, 20, 50];
      // Helper: check if a milestone email was already sent for this user+round
      const alreadySent = async (userId: number, templateKey: string): Promise<boolean> => {
        const rows = await db.select({ id: emailEvents.id }).from(emailEvents).where(
          and(
            eq(emailEvents.userId, userId),
            eq(emailEvents.templateKey, templateKey),
            eq(emailEvents.referenceId, input.roundId),
            eq(emailEvents.eventType, "sent"),
          )
        ).limit(1);
        return rows.length > 0;
      };
      for (const entry of updatedEntries) {
        const [entrantUser] = await db.select({ email: users.email, name: users.name })
          .from(users).where(eq(users.id, entry.userId)).limit(1);
        if (!entrantUser?.email) continue;
        const userTips = tipsByUser[entry.userId] ?? [];
        const correct = userTips.filter(
          t => winnerMap[t.fixtureId] !== null && t.pickedTeamId === winnerMap[t.fixtureId]
        ).length;
        // entrant_perfect_round: all fixtures tipped correctly this round
        if (correct === fixtureIds.length && fixtureIds.length > 0) {
          if (!await alreadySent(entry.userId, "entrant_perfect_round")) {
            EmailService.sendEmail({
              to: entrantUser.email,
              templateKey: "entrant_perfect_round",
              tenantId: comp.tenantId,
              userId: entry.userId,
              referenceId: input.roundId,
              placeholders: {
                user_name: entrantUser.name ?? entrantUser.email,
                competition_name: comp.name,
                round_number: roundNumber,
                score: correct,
                total: fixtureIds.length,
                leaderboard_url: `/comp/${input.competitionId}`,
              },
            }).catch(() => { /* non-fatal */ });
          }
        }
        // entrant_streak_milestone: cumulative streak hits 5, 10, 15, or 20
        if (STREAK_MILESTONES.includes(entry.currentStreak)) {
          if (!await alreadySent(entry.userId, "entrant_streak_milestone")) {
            EmailService.sendEmail({
              to: entrantUser.email,
              templateKey: "entrant_streak_milestone",
              tenantId: comp.tenantId,
              userId: entry.userId,
              referenceId: input.roundId,
              placeholders: {
                user_name: entrantUser.name ?? entrantUser.email,
                competition_name: comp.name,
                streak: entry.currentStreak,
                leaderboard_url: `/comp/${input.competitionId}`,
              },
            }).catch(() => { /* non-fatal */ });
          }
        }
        // entrant_leaderboard_milestone: moved into Top 10 / 20 / 50 for the first time this round
        const crossedMilestone = RANK_MILESTONES.find(
          m => entry.rank <= m && (entry.previousRank > m || entry.previousRank === 0)
        );
        if (crossedMilestone) {
          if (!await alreadySent(entry.userId, "entrant_leaderboard_milestone")) {
            EmailService.sendEmail({
              to: entrantUser.email,
              templateKey: "entrant_leaderboard_milestone",
              tenantId: comp.tenantId,
              userId: entry.userId,
              referenceId: input.roundId,
              placeholders: {
                user_name: entrantUser.name ?? entrantUser.email,
                competition_name: comp.name,
                rank: entry.rank,
                milestone: crossedMilestone,
                leaderboard_url: `/comp/${input.competitionId}`,
              },
            }).catch(() => { /* non-fatal */ });
          }
        }
      }

      return { scored: relevantTips.length };
    }),
});

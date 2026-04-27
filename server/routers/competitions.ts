import { z } from "zod";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { router, tenantAdminProcedure, protectedProcedure, publicProcedure } from "../_core/trpc";
import { getDb } from "../db";
import {
  competitions, competitionEntrants, leaderboardEntries, users,
  rounds, tips, fixtures, competitionBranding,
} from "../../drizzle/schema";
import { EmailService } from "../services/emailService";

const LIFECYCLE = ["draft", "active", "round-by-round", "completed"] as const;

export const competitionsRouter = router({
  // ── Public / Entrant ────────────────────────────────────────────────────────

  // Public: get competition by id (for landing page)
  get: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const rows = await db.select().from(competitions).where(eq(competitions.id, input.id)).limit(1);
      return rows[0] ?? null;
    }),

  // Public: list public competitions for a tenant
  listPublic: publicProcedure
    .input(z.object({ tenantId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(competitions).where(
        and(eq(competitions.tenantId, input.tenantId), eq(competitions.isPublic, true))
      );
    }),

  // Entrant: join a competition
  join: protectedProcedure
    .input(z.object({ competitionId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db.insert(competitionEntrants)
        .values({ competitionId: input.competitionId, userId: ctx.user.id })
        .onDuplicateKeyUpdate({ set: { isActive: true } });
      await db.insert(leaderboardEntries)
        .values({ competitionId: input.competitionId, userId: ctx.user.id })
        .onDuplicateKeyUpdate({ set: { updatedAt: new Date() } });
      return { success: true };
    }),

  // Entrant: list competitions they're enrolled in
  myCompetitions: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    const entrants = await db.select().from(competitionEntrants)
      .where(and(eq(competitionEntrants.userId, ctx.user.id), eq(competitionEntrants.isActive, true)));
    if (!entrants.length) return [];
    const ids = entrants.map(e => e.competitionId);
    const all = await db.select().from(competitions);
    return all.filter(c => ids.includes(c.id));
  }),

  // ── Tenant Admin ────────────────────────────────────────────────────────────

  // List competitions for tenant
  list: tenantAdminProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    const tenantId = ctx.user.tenantId;
    if (!tenantId) return [];
    return db.select().from(competitions).where(eq(competitions.tenantId, tenantId));
  }),

  // Create competition
  create: tenantAdminProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      sportId: z.number(),
      season: z.string().optional(),
      scoringRules: z.object({
        pointsPerCorrectTip: z.number().default(1),
        bonusPerfectRound: z.number().default(3),
        streakBonusEnabled: z.boolean().default(false),
        incorrectTipPoints: z.number().default(0),
        bonusMarginCorrect: z.number().default(0),
        defaultScoreForUntipped: z.number().default(0),
        defaultMarginValue: z.number().default(0),
        jokerRoundEnabled: z.boolean().default(false),
        jokerMultiplier: z.number().default(2),
      }).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const tenantId = ctx.user.tenantId;
      if (!tenantId) throw new Error("No tenant assigned");
      await db.insert(competitions).values({
        tenantId,
        sportId: input.sportId,
        name: input.name,
        description: input.description ?? null,
        season: input.season ?? null,
        status: "draft",
        scoringRules: input.scoringRules ?? {
          pointsPerCorrectTip: 1,
          bonusPerfectRound: 3,
          streakBonusEnabled: false,
          incorrectTipPoints: 0,
          bonusMarginCorrect: 0,
          defaultScoreForUntipped: 0,
          defaultMarginValue: 0,
          jokerRoundEnabled: false,
          jokerMultiplier: 2,
        },
        isPublic: true,
      });
      return { success: true };
    }),

  // Advance competition lifecycle
  advanceStatus: tenantAdminProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(LIFECYCLE),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const tenantId = ctx.user.tenantId;
      if (!tenantId) throw new Error("No tenant assigned");
      await db.update(competitions)
        .set({ status: input.status })
        .where(and(eq(competitions.id, input.id), eq(competitions.tenantId, tenantId)));
      return { success: true };
    }),

  // Dashboard stats for a specific competition
  dashboardStats: tenantAdminProcedure
    .input(z.object({ competitionId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return null;
      const tenantId = ctx.user.tenantId;
      if (!tenantId) return null;

      // Verify competition belongs to tenant
      const [comp] = await db.select().from(competitions)
        .where(and(eq(competitions.id, input.competitionId), eq(competitions.tenantId, tenantId)))
        .limit(1);
      if (!comp) return null;

      // Active entrant count
      const [entrantCount] = await db.select({ count: sql<number>`count(*)` })
        .from(competitionEntrants)
        .where(and(
          eq(competitionEntrants.competitionId, input.competitionId),
          eq(competitionEntrants.isActive, true),
        ));

      // Current open round
      const [currentRound] = await db.select().from(rounds)
        .where(and(eq(rounds.competitionId, input.competitionId), eq(rounds.status, "open")))
        .limit(1);

      // Tips submitted for current round
      let tipsSubmitted = 0;
      let tipsTotal = 0;
      if (currentRound) {
        const roundFixtures = await db.select({ id: fixtures.id })
          .from(fixtures).where(eq(fixtures.roundId, currentRound.id));
        const fixtureIds = roundFixtures.map(f => f.id);
        if (fixtureIds.length > 0) {
          const [tipCount] = await db.select({ count: sql<number>`count(distinct userId)` })
            .from(tips).where(inArray(tips.fixtureId, fixtureIds));
          tipsSubmitted = Number(tipCount?.count ?? 0);
          tipsTotal = Number(entrantCount?.count ?? 0);
        }
      }

      // Top 5 leaderboard
      const top5 = await db.select({
        userId: leaderboardEntries.userId,
        totalPoints: leaderboardEntries.totalPoints,
        rank: leaderboardEntries.rank,
        correctTips: leaderboardEntries.correctTips,
        userName: users.name,
        userEmail: users.email,
      })
        .from(leaderboardEntries)
        .innerJoin(users, eq(leaderboardEntries.userId, users.id))
        .where(eq(leaderboardEntries.competitionId, input.competitionId))
        .orderBy(leaderboardEntries.rank)
        .limit(5);

      // Recent rounds (last 3 scored)
      const recentRounds = await db.select().from(rounds)
        .where(and(eq(rounds.competitionId, input.competitionId), eq(rounds.scoringCompleted, true)))
        .orderBy(desc(rounds.scoredAt))
        .limit(3);

      // Alerts: rounds open with no deadline set
      const openRoundsNoDl = await db.select({ id: rounds.id, name: rounds.name, roundNumber: rounds.roundNumber })
        .from(rounds)
        .where(and(
          eq(rounds.competitionId, input.competitionId),
          eq(rounds.status, "open"),
          sql`${rounds.tipsCloseAt} IS NULL`,
        ));

      return {
        competition: comp,
        entrantCount: Number(entrantCount?.count ?? 0),
        tipsSubmitted,
        tipsTotal,
        currentRound: currentRound ?? null,
        top5,
        recentRounds,
        alerts: openRoundsNoDl.map(r => ({
          type: "warning" as const,
          message: `${r.name ?? `Round ${r.roundNumber}`} is open but has no tips deadline set.`,
        })),
      };
    }),

  // List entrants with user details (enhanced)
  listEntrants: tenantAdminProcedure
    .input(z.object({
      competitionId: z.number(),
      search: z.string().optional(),
      page: z.number().default(1),
      pageSize: z.number().default(50),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { rows: [], total: 0 };
      const offset = (input.page - 1) * input.pageSize;
      const baseWhere = eq(competitionEntrants.competitionId, input.competitionId);

      const [{ total }] = await db.select({ total: sql<number>`count(*)` })
        .from(competitionEntrants)
        .innerJoin(users, eq(competitionEntrants.userId, users.id))
        .where(baseWhere);

      const rows = await db
        .select({
          id: competitionEntrants.id,
          userId: competitionEntrants.userId,
          competitionId: competitionEntrants.competitionId,
          joinedAt: competitionEntrants.joinedAt,
          isActive: competitionEntrants.isActive,
          userName: users.name,
          userEmail: users.email,
          userMobile: users.mobile,
        })
        .from(competitionEntrants)
        .innerJoin(users, eq(competitionEntrants.userId, users.id))
        .where(baseWhere)
        .limit(input.pageSize)
        .offset(offset);

      // Client-side search filter (MySQL LIKE would be better for large datasets)
      const filtered = input.search
        ? rows.filter(r =>
            (r.userName ?? "").toLowerCase().includes(input.search!.toLowerCase()) ||
            (r.userEmail ?? "").toLowerCase().includes(input.search!.toLowerCase())
          )
        : rows;

      return { rows: filtered, total: Number(total) };
    }),

  // Update entrant details (name, email, mobile)
  updateEntrant: tenantAdminProcedure
    .input(z.object({
      userId: z.number(),
      name: z.string().min(1).optional(),
      email: z.string().email().optional(),
      mobile: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const updates: Record<string, unknown> = {};
      if (input.name !== undefined) updates.name = input.name;
      if (input.email !== undefined) updates.email = input.email;
      if (input.mobile !== undefined) updates.mobile = input.mobile;
      if (Object.keys(updates).length === 0) return { success: true };
      await db.update(users).set(updates).where(eq(users.id, input.userId));
      return { success: true };
    }),

  // Remove a single entrant from a competition
  removeEntrant: tenantAdminProcedure
    .input(z.object({
      competitionId: z.number(),
      userId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db.update(competitionEntrants)
        .set({ isActive: false })
        .where(and(
          eq(competitionEntrants.competitionId, input.competitionId),
          eq(competitionEntrants.userId, input.userId),
        ));
      return { success: true };
    }),

  // Bulk remove entrants from a competition
  bulkRemoveEntrants: tenantAdminProcedure
    .input(z.object({
      competitionId: z.number(),
      userIds: z.array(z.number()).min(1),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db.update(competitionEntrants)
        .set({ isActive: false })
        .where(and(
          eq(competitionEntrants.competitionId, input.competitionId),
          inArray(competitionEntrants.userId, input.userIds),
        ));
      return { success: true, removed: input.userIds.length };
    }),

  // Bulk import entrants from CSV rows (name, email, mobile)
  bulkImportEntrants: tenantAdminProcedure
    .input(z.object({
      competitionId: z.number(),
      rows: z.array(z.object({
        name: z.string(),
        email: z.string().email(),
        mobile: z.string().optional(),
      })).min(1).max(500),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const tenantId = ctx.user.tenantId;
      if (!tenantId) throw new Error("No tenant assigned");

      const [comp] = await db.select().from(competitions)
        .where(and(eq(competitions.id, input.competitionId), eq(competitions.tenantId, tenantId)))
        .limit(1);
      if (!comp) throw new Error("Competition not found");

      let invited = 0;
      let skipped = 0;
      const errors: string[] = [];

      for (const row of input.rows) {
        try {
          // Find or create user by email
          let [existingUser] = await db.select().from(users).where(eq(users.email, row.email)).limit(1);
          if (!existingUser) {
            // Create a placeholder user (no openId — they'll claim it on first login)
            const [result] = await db.insert(users).values({
              openId: `import_${Date.now()}_${Math.random().toString(36).slice(2)}`,
              name: row.name,
              email: row.email,
              mobile: row.mobile ?? null,
              role: "entrant",
              tenantId,
            });
            const insertId = (result as unknown as { insertId: number }).insertId;
            existingUser = { id: insertId } as typeof existingUser;
          } else {
            // Update name/mobile if provided
            await db.update(users).set({
              name: row.name,
              ...(row.mobile ? { mobile: row.mobile } : {}),
            }).where(eq(users.id, existingUser.id));
          }

          // Enrol in competition
          await db.insert(competitionEntrants)
            .values({ competitionId: input.competitionId, userId: existingUser.id })
            .onDuplicateKeyUpdate({ set: { isActive: true } });

          // Ensure leaderboard entry
          await db.insert(leaderboardEntries)
            .values({ competitionId: input.competitionId, userId: existingUser.id })
            .onDuplicateKeyUpdate({ set: { updatedAt: new Date() } });

          // Send join confirmation email (non-fatal)
          EmailService.sendEmail({
            to: row.email,
            templateKey: "entrant_join_confirmation",
            tenantId,
            placeholders: {
              user_name: row.name,
              competition_name: comp.name,
              competition_url: `/comp/${comp.id}`,
            },
          }).catch(() => {});

          invited++;
        } catch (e) {
          skipped++;
          errors.push(`${row.email}: ${(e as Error).message}`);
        }
      }

      return { invited, skipped, errors };
    }),

  // Resend invite email to an entrant
  resendInvite: tenantAdminProcedure
    .input(z.object({
      competitionId: z.number(),
      userId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const tenantId = ctx.user.tenantId;
      if (!tenantId) throw new Error("No tenant assigned");

      const [comp] = await db.select().from(competitions)
        .where(and(eq(competitions.id, input.competitionId), eq(competitions.tenantId, tenantId)))
        .limit(1);
      if (!comp) throw new Error("Competition not found");

      const [user] = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);
      if (!user?.email) throw new Error("Entrant has no email address");

      await EmailService.sendEmail({
        to: user.email,
        templateKey: "entrant_join_confirmation",
        tenantId,
        placeholders: {
          user_name: user.name ?? user.email,
          competition_name: comp.name,
          competition_url: `/comp/${comp.id}`,
        },
      });

      return { success: true };
    }),

  // Get all tips for an entrant across all rounds in a competition
  getEntrantTips: tenantAdminProcedure
    .input(z.object({
      competitionId: z.number(),
      userId: z.number(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const allRounds = await db.select().from(rounds)
        .where(eq(rounds.competitionId, input.competitionId))
        .orderBy(rounds.roundNumber);

      const result = [];
      for (const round of allRounds) {
        const roundFixtures = await db.select().from(fixtures)
          .where(eq(fixtures.roundId, round.id));
        const fixtureIds = roundFixtures.map(f => f.id);
        if (fixtureIds.length === 0) {
          result.push({ round, fixtures: [], tips: [] });
          continue;
        }
        const roundTips = await db.select().from(tips)
          .where(and(
            eq(tips.userId, input.userId),
            inArray(tips.fixtureId, fixtureIds),
          ));
        result.push({ round, fixtures: roundFixtures, tips: roundTips });
      }
      return result;
    }),

  // Get / update competition branding
  getBranding: tenantAdminProcedure
    .input(z.object({ competitionId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const [row] = await db.select().from(competitionBranding)
        .where(eq(competitionBranding.competitionId, input.competitionId))
        .limit(1);
      return row ?? null;
    }),

  updateBranding: tenantAdminProcedure
    .input(z.object({
      competitionId: z.number(),
      fontColour: z.string().optional(),
      fontType: z.string().optional(),
      bgColour: z.string().optional(),
      bgImageUrl: z.string().optional(),
      bgImageMode: z.enum(["centred", "full_width", "tile"]).optional(),
      landingPageText: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const tenantId = ctx.user.tenantId;
      if (!tenantId) throw new Error("No tenant assigned");

      // Verify ownership
      const [comp] = await db.select({ id: competitions.id }).from(competitions)
        .where(and(eq(competitions.id, input.competitionId), eq(competitions.tenantId, tenantId)))
        .limit(1);
      if (!comp) throw new Error("Competition not found");

      const { competitionId, ...fields } = input;
      const updates: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(fields)) {
        if (v !== undefined) updates[k] = v;
      }

      await db.insert(competitionBranding)
        .values({ competitionId, ...updates })
        .onDuplicateKeyUpdate({ set: updates });

      return { success: true };
    }),

  // Update general competition settings (allowDraw, etc.)
  updateSettings: tenantAdminProcedure
    .input(z.object({
      competitionId: z.number(),
      allowDraw: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const tenantId = ctx.user.tenantId;
      if (!tenantId) throw new Error("No tenant assigned");
      const patch: Record<string, unknown> = {};
      if (input.allowDraw !== undefined) patch.allowDraw = input.allowDraw;
      if (Object.keys(patch).length === 0) return { success: true };
      await db.update(competitions)
        .set(patch)
        .where(and(eq(competitions.id, input.competitionId), eq(competitions.tenantId, tenantId)));
      return { success: true };
    }),

  // Update scoring rules for a competition
  updateScoringRules: tenantAdminProcedure
    .input(z.object({
      competitionId: z.number(),
      scoringRules: z.object({
        pointsPerCorrectTip: z.number(),
        bonusPerfectRound: z.number(),
        streakBonusEnabled: z.boolean(),
        incorrectTipPoints: z.number(),
        bonusMarginCorrect: z.number(),
        defaultScoreForUntipped: z.number(),
        defaultMarginValue: z.number(),
        jokerRoundEnabled: z.boolean(),
        jokerRoundId: z.number().nullable().optional(),
        jokerMultiplier: z.number(),
      }),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const tenantId = ctx.user.tenantId;
      if (!tenantId) throw new Error("No tenant assigned");
      await db.update(competitions)
        .set({ scoringRules: input.scoringRules })
        .where(and(eq(competitions.id, input.competitionId), eq(competitions.tenantId, tenantId)));
      return { success: true };
    }),
});

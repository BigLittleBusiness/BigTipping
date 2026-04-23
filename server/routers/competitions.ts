import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { router, tenantAdminProcedure, protectedProcedure, publicProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { competitions, competitionEntrants, leaderboardEntries, users } from "../../drizzle/schema";

const LIFECYCLE = ["draft", "active", "round-by-round", "completed"] as const;

export const competitionsRouter = router({
  // Tenant admin: list competitions for their tenant
  list: tenantAdminProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    const tenantId = ctx.user.tenantId;
    if (!tenantId) return [];
    return db.select().from(competitions).where(eq(competitions.tenantId, tenantId));
  }),

  // Public: get competition by id (for landing page)
  get: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const rows = await db.select().from(competitions).where(eq(competitions.id, input.id)).limit(1);
      return rows[0] ?? null;
    }),

  // Public: list public competitions for a tenant slug
  listPublic: publicProcedure
    .input(z.object({ tenantId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(competitions).where(
        and(eq(competitions.tenantId, input.tenantId), eq(competitions.isPublic, true))
      );
    }),

  // Tenant admin: create competition
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
        },
        isPublic: true,
      });
      return { success: true };
    }),

  // Tenant admin: advance competition lifecycle
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

  // Entrant: join a competition
  join: protectedProcedure
    .input(z.object({ competitionId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      // Upsert entrant
      await db.insert(competitionEntrants)
        .values({ competitionId: input.competitionId, userId: ctx.user.id })
        .onDuplicateKeyUpdate({ set: { isActive: true } });
      // Ensure leaderboard entry exists
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

  // Tenant admin: list entrants for a competition (with user details)
  listEntrants: tenantAdminProcedure
    .input(z.object({ competitionId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const rows = await db
        .select({
          id: competitionEntrants.id,
          userId: competitionEntrants.userId,
          competitionId: competitionEntrants.competitionId,
          joinedAt: competitionEntrants.joinedAt,
          isActive: competitionEntrants.isActive,
          userName: users.name,
          userEmail: users.email,
        })
        .from(competitionEntrants)
        .innerJoin(users, eq(competitionEntrants.userId, users.id))
        .where(eq(competitionEntrants.competitionId, input.competitionId));
      return rows;
    }),
});

import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc.ts";
import { tenantAdminProcedure } from "../_core/trpc.ts";
import { getDb } from "../db.ts";
import {
  competitions,
  competitionEntrants,
  leaderboardEntries,
  tenants,
  sports,
} from "../../drizzle/schema.ts";

export const invitesRouter = router({
  /**
   * Generate (or regenerate) an invite token for a competition.
   * Only the tenant admin who owns the competition can call this.
   */
  generateLink: tenantAdminProcedure
    .input(z.object({ competitionId: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      // Verify the competition belongs to the caller's tenant
      const [comp] = await db
        .select()
        .from(competitions)
        .where(
          and(
            eq(competitions.id, input.competitionId),
            eq(competitions.tenantId, ctx.user.tenantId!)
          )
        )
        .limit(1);

      if (!comp) throw new Error("Competition not found or access denied");

      const token = nanoid(32); // URL-safe, 32-char token

      await db
        .update(competitions)
        .set({ inviteToken: token, inviteEnabled: true })
        .where(eq(competitions.id, input.competitionId));

      return { token };
    }),

  /**
   * Toggle the invite link on/off without changing the token.
   */
  toggleLink: tenantAdminProcedure
    .input(
      z.object({
        competitionId: z.number().int().positive(),
        enabled: z.boolean(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      const [comp] = await db
        .select()
        .from(competitions)
        .where(
          and(
            eq(competitions.id, input.competitionId),
            eq(competitions.tenantId, ctx.user.tenantId!)
          )
        )
        .limit(1);

      if (!comp) throw new Error("Competition not found or access denied");

      await db
        .update(competitions)
        .set({ inviteEnabled: input.enabled })
        .where(eq(competitions.id, input.competitionId));

      return { enabled: input.enabled };
    }),

  /**
   * Public: look up a competition by its invite token.
   * Returns enough info to render the join page without exposing sensitive data.
   */
  getByToken: publicProcedure
    .input(z.object({ token: z.string().min(1) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      const rows = await db
        .select({
          id: competitions.id,
          name: competitions.name,
          description: competitions.description,
          season: competitions.season,
          status: competitions.status,
          inviteEnabled: competitions.inviteEnabled,
          sportName: sports.name,
          tenantName: tenants.name,
          tenantSlug: tenants.slug,
        })
        .from(competitions)
        .innerJoin(tenants, eq(competitions.tenantId, tenants.id))
        .innerJoin(sports, eq(competitions.sportId, sports.id))
        .where(eq(competitions.inviteToken, input.token))
        .limit(1);

      const comp = rows[0];
      if (!comp) return null;
      if (!comp.inviteEnabled) return { disabled: true as const };

      return comp;
    }),

  /**
   * Protected: enrol the currently logged-in user into a competition via invite token.
   * Idempotent — safe to call multiple times.
   */
  joinViaInvite: protectedProcedure
    .input(z.object({ token: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      // Resolve competition from token
      const [comp] = await db
        .select()
        .from(competitions)
        .where(eq(competitions.inviteToken, input.token))
        .limit(1);

      if (!comp) throw new Error("Invalid or expired invite link");
      if (!comp.inviteEnabled) throw new Error("This invite link has been disabled");
      if (comp.status === "completed") throw new Error("This competition has already ended");

      // Upsert entrant record (ignore duplicate)
      try {
        await db.insert(competitionEntrants).values({
          competitionId: comp.id,
          userId: ctx.user.id,
          isActive: true,
        });
      } catch {
        // Duplicate key = already enrolled — that's fine
      }

      // Ensure a leaderboard entry exists for this user
      try {
        await db.insert(leaderboardEntries).values({
          competitionId: comp.id,
          userId: ctx.user.id,
          totalPoints: 0,
          rank: 0,
          previousRank: 0,
          correctTips: 0,
          totalTips: 0,
          currentStreak: 0,
          bestStreak: 0,
        });
      } catch {
        // Already exists — fine
      }

      return { competitionId: comp.id, competitionName: comp.name };
    }),
});

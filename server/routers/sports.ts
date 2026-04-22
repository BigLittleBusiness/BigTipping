import { z } from "zod";
import { eq } from "drizzle-orm";
import { router, systemAdminProcedure, publicProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { sports, teams } from "../../drizzle/schema";

export const sportsRouter = router({
  // Public: list active sports
  list: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(sports).where(eq(sports.isActive, true));
  }),

  // System admin: list all sports (incl. inactive)
  listAll: systemAdminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(sports);
  }),

  // System admin: toggle sport active state
  setActive: systemAdminProcedure
    .input(z.object({ id: z.number(), isActive: z.boolean() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db.update(sports).set({ isActive: input.isActive }).where(eq(sports.id, input.id));
      return { success: true };
    }),

  // Public: list teams for a sport
  listTeams: publicProcedure
    .input(z.object({ sportId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(teams)
        .where(eq(teams.sportId, input.sportId));
    }),

  // System admin: create team
  createTeam: systemAdminProcedure
    .input(z.object({
      sportId: z.number(),
      name: z.string().min(1),
      abbreviation: z.string().max(10).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db.insert(teams).values({
        sportId: input.sportId,
        name: input.name,
        abbreviation: input.abbreviation ?? null,
      });
      return { success: true };
    }),
});

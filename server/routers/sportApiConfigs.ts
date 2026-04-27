import { z } from "zod";
import { eq } from "drizzle-orm";
import { router, systemAdminProcedure, publicProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { sportApiConfigs } from "../../drizzle/schema";

export const sportApiConfigsRouter = router({
  // List all API configs (system admin only)
  list: systemAdminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(sportApiConfigs).orderBy(sportApiConfigs.sportId as any);
  }),

  // Get config for a specific sport
  getBySport: systemAdminProcedure
    .input(z.object({ sportId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const rows = await db.select().from(sportApiConfigs)
        .where(eq(sportApiConfigs.sportId, input.sportId))
        .limit(1);
      return rows[0] ?? null;
    }),

  // Upsert (create or update) config for a sport
  upsert: systemAdminProcedure
    .input(z.object({
      sportId:           z.number(),
      providerName:      z.string().min(1).max(255),
      baseUrl:           z.string().url().max(500),
      apiKey:            z.string().max(500).optional().nullable(),
      endpointFixtures:  z.string().max(500).optional().nullable(),
      endpointResults:   z.string().max(500).optional().nullable(),
      additionalHeaders: z.record(z.string(), z.string()).optional().nullable(),
      isActive:          z.boolean().optional().default(true),
      notes:             z.string().optional().nullable(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");

      // Check if a config already exists for this sport
      const existing = await db.select({ id: sportApiConfigs.id })
        .from(sportApiConfigs)
        .where(eq(sportApiConfigs.sportId, input.sportId))
        .limit(1);

      if (existing.length > 0) {
        // Update
        await db.update(sportApiConfigs)
          .set({
            providerName:      input.providerName,
            baseUrl:           input.baseUrl,
            apiKey:            input.apiKey ?? null,
            endpointFixtures:  input.endpointFixtures ?? null,
            endpointResults:   input.endpointResults ?? null,
            additionalHeaders: input.additionalHeaders ?? null,
            isActive:          input.isActive ?? true,
            notes:             input.notes ?? null,
          })
          .where(eq(sportApiConfigs.sportId, input.sportId));
        return { action: "updated" as const };
      } else {
        // Insert
        await db.insert(sportApiConfigs).values({
          sportId:           input.sportId,
          providerName:      input.providerName,
          baseUrl:           input.baseUrl,
          apiKey:            input.apiKey ?? null,
          endpointFixtures:  input.endpointFixtures ?? null,
          endpointResults:   input.endpointResults ?? null,
          additionalHeaders: (input.additionalHeaders ?? null) as Record<string, string> | null,
          isActive:          input.isActive ?? true,
          notes:             input.notes ?? null,
        });
        return { action: "created" as const };
      }
    }),

  // Delete a config
  delete: systemAdminProcedure
    .input(z.object({ sportId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db.delete(sportApiConfigs).where(eq(sportApiConfigs.sportId, input.sportId));
      return { success: true };
    }),

  // Toggle active status
  toggleActive: systemAdminProcedure
    .input(z.object({ sportId: z.number(), isActive: z.boolean() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db.update(sportApiConfigs)
        .set({ isActive: input.isActive })
        .where(eq(sportApiConfigs.sportId, input.sportId));
      return { success: true };
    }),
});

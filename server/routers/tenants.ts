import { z } from "zod";
import { eq } from "drizzle-orm";
import { router, systemAdminProcedure, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { tenants, users } from "../../drizzle/schema";
import { seedEmailTemplatesForTenant } from "./email";

export const tenantsRouter = router({
  // System admin: list all tenants
  list: systemAdminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(tenants).orderBy(tenants.createdAt);
  }),

  // System admin: get single tenant
  get: systemAdminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const rows = await db.select().from(tenants).where(eq(tenants.id, input.id)).limit(1);
      return rows[0] ?? null;
    }),

  // System admin: create tenant
  create: systemAdminProcedure
    .input(z.object({
      name: z.string().min(1),
      slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
      description: z.string().optional(),
      contactEmail: z.string().email().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db.insert(tenants).values({
        name: input.name,
        slug: input.slug,
        description: input.description ?? null,
        contactEmail: input.contactEmail ?? null,
        status: "trial",
      });
      const rows = await db.select().from(tenants).where(eq(tenants.slug, input.slug)).limit(1);
      const newTenant = rows[0];
      // Seed default email templates for the new tenant (non-fatal)
      if (newTenant) {
        seedEmailTemplatesForTenant(newTenant.id).catch(() => { /* non-fatal */ });
      }
      return newTenant;
    }),

  // System admin: update tenant status
  updateStatus: systemAdminProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["active", "suspended", "trial"]),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db.update(tenants).set({ status: input.status }).where(eq(tenants.id, input.id));
      return { success: true };
    }),

  // Tenant admin: get own tenant
  getMine: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db || !ctx.user.tenantId) return null;
    const rows = await db.select().from(tenants).where(eq(tenants.id, ctx.user.tenantId)).limit(1);
    return rows[0] ?? null;
  }),

  // System admin: list users for a tenant
  listUsers: systemAdminProcedure
    .input(z.object({ tenantId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(users).where(eq(users.tenantId, input.tenantId));
    }),
});

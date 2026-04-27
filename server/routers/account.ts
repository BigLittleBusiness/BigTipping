import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { router, tenantAdminProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { subscriptions, billingHistory } from "../../drizzle/schema";

export const accountRouter = router({
  // Get subscription/org details for the current tenant
  getSubscription: tenantAdminProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return null;
    const tenantId = ctx.user.tenantId;
    if (!tenantId) return null;
    const [row] = await db.select().from(subscriptions)
      .where(eq(subscriptions.tenantId, tenantId))
      .limit(1);
    return row ?? null;
  }),

  // Upsert subscription/org details
  updateSubscription: tenantAdminProcedure
    .input(z.object({
      orgName: z.string().optional(),
      orgABN: z.string().optional(),
      orgAddress: z.string().optional(),
      orgPhone: z.string().optional(),
      invoiceRecipientName: z.string().optional(),
      invoiceRecipientEmail: z.string().email().optional(),
      invoicePONumber: z.string().optional(),
      paymentMethod: z.enum(["credit_card", "invoice"]).optional(),
      paymentTerm: z.enum(["monthly", "annually"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const tenantId = ctx.user.tenantId;
      if (!tenantId) throw new Error("No tenant assigned");

      const updates: Record<string, unknown> = { tenantId };
      for (const [k, v] of Object.entries(input)) {
        if (v !== undefined) updates[k] = v;
      }

      await db.insert(subscriptions)
        .values({ tenantId, ...updates })
        .onDuplicateKeyUpdate({ set: updates });

      return { success: true };
    }),

  // Get billing history for the current tenant
  getBillingHistory: tenantAdminProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    const tenantId = ctx.user.tenantId;
    if (!tenantId) return [];
    return db.select().from(billingHistory)
      .where(eq(billingHistory.tenantId, tenantId))
      .orderBy(desc(billingHistory.date))
      .limit(24);
  }),
});

import { z } from "zod";
import { eq, and, sql, desc } from "drizzle-orm";
import { router, tenantAdminProcedure } from "../_core/trpc";
import { getDb } from "../db";
import {
  emailTemplates,
  tenantEmailSettings,
  emailEvents,
} from "../../drizzle/schema";
import { EmailService } from "../services/emailService";
import {
  EMAIL_TEMPLATE_DEFAULTS,
  TEMPLATE_PLACEHOLDERS,
} from "../services/emailTemplateDefaults";

export const emailRouter = router({
  // ── Templates ──────────────────────────────────────────────────────────────

  /** List all email templates for the current tenant */
  listTemplates: tenantAdminProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    const tenantId = ctx.user.tenantId!;
    const rows = await db
      .select()
      .from(emailTemplates)
      .where(eq(emailTemplates.tenantId, tenantId))
      .orderBy(emailTemplates.recipientRole, emailTemplates.name);
    // Attach placeholder lists
    return rows.map((r) => ({
      ...r,
      placeholders: TEMPLATE_PLACEHOLDERS[r.templateKey] ?? [],
    }));
  }),

  /** Update a template's subject, body, or enabled state */
  updateTemplate: tenantAdminProcedure
    .input(
      z.object({
        templateKey: z.string(),
        subject: z.string().min(1).max(500).optional(),
        bodyHtml: z.string().min(1).optional(),
        isEnabled: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const tenantId = ctx.user.tenantId!;
      const update: Record<string, unknown> = {};
      if (input.subject !== undefined) update.subject = input.subject;
      if (input.bodyHtml !== undefined) update.bodyHtml = input.bodyHtml;
      if (input.isEnabled !== undefined) update.isEnabled = input.isEnabled;
      await db
        .update(emailTemplates)
        .set(update)
        .where(
          and(
            eq(emailTemplates.tenantId, tenantId),
            eq(emailTemplates.templateKey, input.templateKey)
          )
        );
      return { success: true };
    }),

  // ── Branding ───────────────────────────────────────────────────────────────

  /** Get email branding settings for the current tenant */
  getBranding: tenantAdminProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return null;
    const tenantId = ctx.user.tenantId!;
    const rows = await db
      .select()
      .from(tenantEmailSettings)
      .where(eq(tenantEmailSettings.tenantId, tenantId))
      .limit(1);
    return rows[0] ?? null;
  }),

  /** Upsert email branding settings for the current tenant */
  updateBranding: tenantAdminProcedure
    .input(
      z.object({
        logoUrl: z.string().url().nullable().optional(),
        logoPosition: z.enum(["top", "bottom"]).optional(),
        primaryColor: z
          .string()
          .regex(/^#[0-9A-Fa-f]{6}$/)
          .optional(),
        footerText: z.string().max(1000).nullable().optional(),
        businessAddress: z.string().max(500).nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const tenantId = ctx.user.tenantId!;
      const values = {
        tenantId,
        ...(input.logoUrl !== undefined && { logoUrl: input.logoUrl }),
        ...(input.logoPosition !== undefined && {
          logoPosition: input.logoPosition,
        }),
        ...(input.primaryColor !== undefined && {
          primaryColor: input.primaryColor,
        }),
        ...(input.footerText !== undefined && {
          footerText: input.footerText,
        }),
        ...(input.businessAddress !== undefined && {
          businessAddress: input.businessAddress,
        }),
      };
      await db
        .insert(tenantEmailSettings)
        .values(values)
        .onDuplicateKeyUpdate({ set: values });
      return { success: true };
    }),

  // ── Test Send ──────────────────────────────────────────────────────────────

  /** Send a test email to the current admin's email address */
  sendTest: tenantAdminProcedure
    .input(z.object({ templateKey: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user.tenantId!;
      const adminEmail = ctx.user.email;
      if (!adminEmail) throw new Error("No email address on your account");
      const result = await EmailService.sendTestEmail({
        to: adminEmail,
        templateKey: input.templateKey,
        tenantId,
      });
      return result;
    }),

  // ── Bounce Dashboard ───────────────────────────────────────────────────────

  /** Aggregate email event stats for the bounce dashboard */
  getBounceDashboard: tenantAdminProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { stats: [], recentEvents: [] };
    const tenantId = ctx.user.tenantId!;

    // Aggregate counts by eventType
    const stats = await db
      .select({
        eventType: emailEvents.eventType,
        count: sql<number>`cast(count(*) as unsigned)`,
      })
      .from(emailEvents)
      .where(eq(emailEvents.tenantId, tenantId))
      .groupBy(emailEvents.eventType);

    // Recent bounces and complaints
    const recentEvents = await db
      .select()
      .from(emailEvents)
      .where(
        and(
          eq(emailEvents.tenantId, tenantId),
          sql`${emailEvents.eventType} IN ('bounce', 'complaint')`
        )
      )
      .orderBy(desc(emailEvents.timestamp))
      .limit(50);

    return { stats, recentEvents };
  }),

  // ── Seed Templates ─────────────────────────────────────────────────────────

  /**
   * Seed default email templates for a tenant.
   * Called internally when a tenant is created.
   * Also exposed as a mutation so admins can re-seed if needed.
   */
  seedTemplates: tenantAdminProcedure
    .input(z.object({ tenantId: z.number().optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const tenantId = input.tenantId ?? ctx.user.tenantId!;
      await seedEmailTemplatesForTenant(tenantId);
      return { success: true, count: EMAIL_TEMPLATE_DEFAULTS.length };
    }),
});

/**
 * Seed default email templates for a given tenant ID.
 * Safe to call multiple times — uses INSERT IGNORE semantics via onDuplicateKeyUpdate.
 */
export async function seedEmailTemplatesForTenant(
  tenantId: number
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  for (const tpl of EMAIL_TEMPLATE_DEFAULTS) {
    await db
      .insert(emailTemplates)
      .values({
        tenantId,
        templateKey: tpl.templateKey,
        recipientRole: tpl.recipientRole,
        name: tpl.name,
        triggerDesc: tpl.triggerDesc,
        subject: tpl.subject,
        bodyHtml: tpl.bodyHtml,
        isEnabled: true,
      })
      .onDuplicateKeyUpdate({
        // Only update non-customised fields on re-seed; preserve user edits
        set: { name: tpl.name, triggerDesc: tpl.triggerDesc },
      });
  }
}

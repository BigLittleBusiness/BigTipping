import { z } from "zod";
import { eq, and, sql, desc } from "drizzle-orm";
import { router, tenantAdminProcedure } from "../_core/trpc";
import { getDb } from "../db";
import {
  emailTemplates,
  tenantEmailSettings,
  emailEvents,
  rounds,
  competitions,
  tenants,
} from "../../drizzle/schema";
import { EmailService, replacePlaceholders } from "../services/emailService";
import {
  EMAIL_TEMPLATE_DEFAULTS,
  TEMPLATE_PLACEHOLDERS,
} from "../services/emailTemplateDefaults";
import { getDigestStats } from "../services/scheduledJobsProcessor";

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

  // ── Digest Preview ─────────────────────────────────────────────────────────

  /**
   * Return a rendered preview of the admin_weekly_digest email using real
   * engagement data from the most recently scored round for this tenant.
   *
   * Returns:
   *  - hasData: false when no scored round exists yet
   *  - renderedHtml: fully substituted email body (ready for iframe srcdoc)
   *  - renderedSubject: the substituted subject line
   *  - stats: raw DigestStats for the summary cards
   *  - roundLabel: human-readable round name
   *  - competitionName: competition name
   */
  getDigestPreview: tenantAdminProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    const empty = {
      hasData: false as const,
      renderedHtml: "",
      renderedSubject: "",
      stats: { activeEntrants: 0, tipsSubmitted: 0, openRate: "N/A", bounceRate: "N/A" },
      roundLabel: "",
      competitionName: "",
    };
    if (!db) return empty;
    const tenantId = ctx.user.tenantId!;

    // Find the most recently scored round for this tenant (across all competitions)
    const recentRoundRows = await db
      .select({
        roundId: rounds.id,
        roundName: rounds.name,
        roundNumber: rounds.roundNumber,
        competitionId: rounds.competitionId,
      })
      .from(rounds)
      .innerJoin(competitions, eq(rounds.competitionId, competitions.id))
      .where(
        and(
          eq(competitions.tenantId, tenantId),
          sql`${rounds.scoredAt} IS NOT NULL`,
        ),
      )
      .orderBy(desc(rounds.scoredAt))
      .limit(1);

    if (recentRoundRows.length === 0) return empty;

    const { roundId, roundName, roundNumber, competitionId } = recentRoundRows[0];

    // Fetch competition name, tenant name, and stats in parallel
    const [compRows, tenantRows, stats] = await Promise.all([
      db.select({ name: competitions.name }).from(competitions)
        .where(eq(competitions.id, competitionId)).limit(1),
      db.select({ name: tenants.name }).from(tenants)
        .where(eq(tenants.id, tenantId)).limit(1),
      getDigestStats(tenantId, roundId, competitionId),
    ]);

    const competitionName = compRows[0]?.name ?? "Competition";
    const tenantName = tenantRows[0]?.name ?? "Admin";
    const roundLabel = roundName ?? `Round ${roundNumber}`;

    // Fetch the tenant's customised template (or fall back to default)
    const templateRows = await db
      .select({ subject: emailTemplates.subject, bodyHtml: emailTemplates.bodyHtml })
      .from(emailTemplates)
      .where(
        and(
          eq(emailTemplates.tenantId, tenantId),
          eq(emailTemplates.templateKey, "admin_weekly_digest"),
        ),
      )
      .limit(1);

    const defaultTpl = EMAIL_TEMPLATE_DEFAULTS.find(
      (t) => t.templateKey === "admin_weekly_digest",
    );
    const subject = templateRows[0]?.subject ?? defaultTpl?.subject ?? "";
    const bodyHtml = templateRows[0]?.bodyHtml ?? defaultTpl?.bodyHtml ?? "";

    const placeholders: Record<string, string | number> = {
      user_name: tenantName,
      competition_name: competitionName,
      active_entrants: stats.activeEntrants,
      tips_submitted: stats.tipsSubmitted,
      open_rate: stats.openRate,
      bounce_rate: stats.bounceRate,
      leaderboard_url: `/admin/competitions/${competitionId}`,
    };

    return {
      hasData: true as const,
      renderedHtml: replacePlaceholders(bodyHtml, placeholders),
      renderedSubject: replacePlaceholders(subject, placeholders),
      stats,
      roundLabel,
      competitionName,
    };
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

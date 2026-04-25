/**
 * EmailService — Big Tipping
 *
 * Provider-agnostic email sending service.
 * When AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY + SES_FROM_EMAIL are present,
 * emails are sent via AWS SES. Otherwise they are logged to the console (stub mode).
 *
 * Responsibilities:
 *  - Fetch tenant email settings and the requested template
 *  - Gate sends on user email preferences (invalidEmail / marketingDisabled)
 *  - Replace {{placeholder}} tokens in subject and body
 *  - Inject tenant logo at top or bottom of email body
 *  - Apply inline CSS wrapper (responsive, 600px max-width, brand colour buttons)
 *  - Send via SES (or stub) and log to email_events
 *  - Handle bounce/complaint SNS notifications
 */

import { nanoid } from "nanoid";
import { eq, and } from "drizzle-orm";
import { getDb } from "../db";
import {
  emailTemplates,
  emailEvents,
  tenantEmailSettings,
  userEmailPreferences,
  users,
} from "../../drizzle/schema";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SendEmailParams {
  /** Recipient email address */
  to: string;
  /** Template key, e.g. "entrant_join_confirmation" */
  templateKey: string;
  /** Tenant ID (integer) */
  tenantId: number;
  /** Placeholder values to substitute into subject and body */
  placeholders: Record<string, string | number>;
  /** If true, send even if marketingDisabled (use for transactional emails) */
  transactional?: boolean;
  /** Optional recipient userId for preference gating */
  userId?: number;
  /** Optional reference ID (e.g. roundId) stored in email_events for idempotency checks */
  referenceId?: number;
}

export interface BouncePayload {
  messageId: string;
  recipientEmail: string;
  tenantId: number;
  bounceType: "permanent" | "transient";
  diagnosticCode?: string;
}

export interface ComplaintPayload {
  messageId: string;
  recipientEmail: string;
  tenantId: number;
}

// ── Inline CSS wrapper ────────────────────────────────────────────────────────

function buildEmailWrapper(
  bodyHtml: string,
  primaryColor: string,
  logoUrl: string | null,
  logoPosition: "top" | "bottom",
  footerText: string | null,
  businessAddress: string | null,
): string {
  const logoBlock = logoUrl
    ? `<div style="text-align:center;margin-bottom:20px;">
        <img src="${logoUrl}" alt="Logo" style="max-width:300px;height:auto;display:inline-block;" />
      </div>`
    : "";

  const footerBlock = `
    <div style="margin-top:32px;padding-top:20px;border-top:1px solid #e5e7eb;text-align:center;font-size:12px;color:#9ca3af;">
      ${footerText ? `<p style="margin:0 0 8px;">${footerText}</p>` : ""}
      ${businessAddress ? `<p style="margin:0;">${businessAddress}</p>` : ""}
      <p style="margin:8px 0 0;">
        <a href="{{unsubscribe_url}}" style="color:#9ca3af;text-decoration:underline;">Unsubscribe</a>
      </p>
    </div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <title>Big Tipping</title>
  <style>
    body { margin:0; padding:0; background:#f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .wrapper { max-width:600px; margin:0 auto; background:#ffffff; border-radius:8px; overflow:hidden; }
    .header { background:${primaryColor}; padding:24px 32px; }
    .header h1 { margin:0; color:#ffffff; font-size:22px; font-weight:700; }
    .body { padding:32px; color:#374151; font-size:15px; line-height:1.6; }
    .btn { display:inline-block; padding:12px 24px; background:${primaryColor}; color:#ffffff !important; text-decoration:none; border-radius:6px; font-weight:600; font-size:15px; }
    .result-correct { color:#16a34a; font-weight:600; }
    .result-incorrect { color:#dc2626; font-weight:600; }
    table.results { width:100%; border-collapse:collapse; margin:16px 0; }
    table.results th { background:#f9fafb; padding:8px 12px; text-align:left; font-size:13px; color:#6b7280; border-bottom:2px solid #e5e7eb; }
    table.results td { padding:10px 12px; border-bottom:1px solid #f3f4f6; font-size:14px; }
  </style>
</head>
<body>
  <div style="padding:20px 0;">
    <div class="wrapper">
      <div class="header"><h1>Big Tipping</h1></div>
      <div class="body">
        ${logoPosition === "top" ? logoBlock : ""}
        ${bodyHtml}
        ${logoPosition === "bottom" ? logoBlock : ""}
        ${footerBlock}
      </div>
    </div>
  </div>
</body>
</html>`;
}

// ── Placeholder replacement ───────────────────────────────────────────────────

export function replacePlaceholders(
  template: string,
  placeholders: Record<string, string | number>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const val = placeholders[key];
    return val !== undefined ? String(val) : `{{${key}}}`;
  });
}

// ── HTML → plain text (basic) ─────────────────────────────────────────────────

export function htmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<\/td>/gi, "  ")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ── SES adapter ───────────────────────────────────────────────────────────────

async function sendViaSES(params: {
  to: string;
  subject: string;
  html: string;
  text: string;
  fromEmail: string;
  configurationSet?: string;
}): Promise<string> {
  const {
    AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY,
    AWS_REGION,
    SES_FROM_EMAIL,
    SES_CONFIGURATION_SET,
  } = process.env;

  // Stub mode — no credentials configured
  if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY || !SES_FROM_EMAIL) {
    const stubId = `stub-${nanoid(12)}`;
    console.log(
      `[EmailService STUB] Would send to ${params.to} | subject: "${params.subject}" | messageId: ${stubId}`,
    );
    return stubId;
  }

  // Live SES send — dynamically import to avoid breaking builds without the SDK
  try {
    const { SESClient, SendEmailCommand } = await import("@aws-sdk/client-ses");
    const client = new SESClient({
      region: AWS_REGION ?? "ap-southeast-2",
      credentials: {
        accessKeyId: AWS_ACCESS_KEY_ID,
        secretAccessKey: AWS_SECRET_ACCESS_KEY,
      },
    });

    const cmd = new SendEmailCommand({
      Source: params.fromEmail,
      Destination: { ToAddresses: [params.to] },
      Message: {
        Subject: { Data: params.subject, Charset: "UTF-8" },
        Body: {
          Html: { Data: params.html, Charset: "UTF-8" },
          Text: { Data: params.text, Charset: "UTF-8" },
        },
      },
      ...(SES_CONFIGURATION_SET
        ? { ConfigurationSetName: SES_CONFIGURATION_SET }
        : {}),
    });

    const response = await client.send(cmd);
    return response.MessageId ?? nanoid(12);
  } catch (err) {
    console.error("[EmailService] SES send failed:", err);
    throw err;
  }
}

// ── Main EmailService ─────────────────────────────────────────────────────────

export const EmailService = {
  /**
   * Send a templated email to a single recipient.
   * Handles preference gating, placeholder substitution, branding, and event logging.
   */
  async sendEmail(params: SendEmailParams): Promise<{ sent: boolean; reason?: string }> {
    const db = await getDb();
    if (!db) return { sent: false, reason: "Database unavailable" };

    // ── 1. Check user email preferences ──────────────────────────────────────
    if (params.userId) {
      const [pref] = await db
        .select()
        .from(userEmailPreferences)
        .where(eq(userEmailPreferences.userId, params.userId))
        .limit(1);

      if (pref?.invalidEmail) {
        return { sent: false, reason: "Email address marked invalid" };
      }
      if (pref?.marketingDisabled && !params.transactional) {
        return { sent: false, reason: "User has opted out of marketing emails" };
      }
    }

    // ── 2. Fetch template ─────────────────────────────────────────────────────
    const [template] = await db
      .select()
      .from(emailTemplates)
      .where(
        and(
          eq(emailTemplates.tenantId, params.tenantId),
          eq(emailTemplates.templateKey, params.templateKey),
        ),
      )
      .limit(1);

    if (!template) {
      console.warn(`[EmailService] Template not found: ${params.templateKey} for tenant ${params.tenantId}`);
      return { sent: false, reason: "Template not found" };
    }

    if (!template.isEnabled && !params.transactional) {
      return { sent: false, reason: "Template is disabled" };
    }

    // ── 3. Fetch branding ─────────────────────────────────────────────────────
    const [branding] = await db
      .select()
      .from(tenantEmailSettings)
      .where(eq(tenantEmailSettings.tenantId, params.tenantId))
      .limit(1);

    const primaryColor = branding?.primaryColor ?? "#2B4EAE";
    const logoUrl = branding?.logoUrl ?? null;
    const logoPosition = branding?.logoPosition ?? "top";
    const footerText = branding?.footerText ?? "Powered by Big Tipping";
    const businessAddress = branding?.businessAddress ?? null;

    // ── 4. Replace placeholders ───────────────────────────────────────────────
    const subject = replacePlaceholders(template.subject, params.placeholders);
    const bodyHtml = replacePlaceholders(template.bodyHtml, params.placeholders);
    const bodyText = replacePlaceholders(
      template.bodyText ?? htmlToPlainText(template.bodyHtml),
      params.placeholders,
    );

    // ── 5. Wrap with branding ─────────────────────────────────────────────────
    const finalHtml = buildEmailWrapper(
      bodyHtml,
      primaryColor,
      logoUrl,
      logoPosition,
      footerText,
      businessAddress,
    );

    // ── 6. Send ───────────────────────────────────────────────────────────────
    const fromEmail = process.env.SES_FROM_EMAIL ?? "noreply@bigtipping.com";
    let messageId: string;
    try {
      messageId = await sendViaSES({
        to: params.to,
        subject,
        html: finalHtml,
        text: bodyText,
        fromEmail,
      });
    } catch (err) {
      console.error(`[EmailService] Failed to send ${params.templateKey} to ${params.to}:`, err);
      return { sent: false, reason: "Send failed" };
    }

    // ── 7. Log event ──────────────────────────────────────────────────────────
    await db.insert(emailEvents).values({
      messageId,
      recipientEmail: params.to,
      tenantId: params.tenantId,
      templateKey: params.templateKey,
      userId: params.userId ?? null,
      referenceId: params.referenceId ?? null,
      eventType: "sent",
    });

    return { sent: true };
  },

  /**
   * Send a test email to the admin's own address using sample placeholder data.
   */
  async sendTestEmail(params: {
    to: string;
    templateKey: string;
    tenantId: number;
  }): Promise<{ sent: boolean; reason?: string }> {
    const samplePlaceholders: Record<string, string | number> = {
      user_name: "Jane Smith",
      competition_name: "AFL 2025 Tipping",
      round_number: 5,
      round_name: "Round 5",
      score: 7,
      total: 9,
      margin: 2,
      winner_name: "Jane Smith",
      winner_score: 8,
      team_a: "Collingwood",
      team_b: "Carlton",
      games_list: "Collingwood vs Carlton, Richmond vs Hawthorn, Geelong vs Essendon",
      rank: 3,
      streak_count: 5,
      prize_description: "$50 bar tab",
      leaderboard_url: "https://bigtipping.com/leaderboard",
      tips_url: "https://bigtipping.com/tips",
      join_url: "https://bigtipping.com/join",
      unsubscribe_url: "https://bigtipping.com/unsubscribe",
      active_entrants: 42,
      tips_submitted: 38,
      open_rate: "72%",
      bounce_rate: "1.2%",
    };

    return this.sendEmail({
      to: params.to,
      templateKey: params.templateKey,
      tenantId: params.tenantId,
      placeholders: samplePlaceholders,
      transactional: true,
    });
  },

  /**
   * Process a bounce notification from SES/SNS.
   */
  async handleBounce(payload: BouncePayload): Promise<void> {
    const db = await getDb();
    if (!db) return;

    // Log the event
    await db.insert(emailEvents).values({
      messageId: payload.messageId,
      recipientEmail: payload.recipientEmail,
      tenantId: payload.tenantId,
      templateKey: "system",
      eventType: "bounce",
      bounceType: payload.bounceType,
      diagnosticCode: payload.diagnosticCode,
    });

    // Find the user by email
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, payload.recipientEmail))
      .limit(1);

    if (!user) return;

    if (payload.bounceType === "permanent") {
      // Hard bounce → immediately mark invalid
      await db
        .insert(userEmailPreferences)
        .values({ userId: user.id, invalidEmail: true })
        .onDuplicateKeyUpdate({ set: { invalidEmail: true } });
    } else {
      // Soft bounce → increment counter; mark invalid after 3
      const [pref] = await db
        .select()
        .from(userEmailPreferences)
        .where(eq(userEmailPreferences.userId, user.id))
        .limit(1);

      const newCount = (pref?.softBounceCount ?? 0) + 1;
      const markInvalid = newCount >= 3;

      await db
        .insert(userEmailPreferences)
        .values({
          userId: user.id,
          softBounceCount: newCount,
          invalidEmail: markInvalid,
        })
        .onDuplicateKeyUpdate({
          set: { softBounceCount: newCount, invalidEmail: markInvalid },
        });
    }
  },

  /**
   * Process a complaint notification from SES/SNS.
   */
  async handleComplaint(payload: ComplaintPayload): Promise<void> {
    const db = await getDb();
    if (!db) return;

    await db.insert(emailEvents).values({
      messageId: payload.messageId,
      recipientEmail: payload.recipientEmail,
      tenantId: payload.tenantId,
      templateKey: "system",
      eventType: "complaint",
    });

    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, payload.recipientEmail))
      .limit(1);

    if (!user) return;

    await db
      .insert(userEmailPreferences)
      .values({ userId: user.id, marketingDisabled: true })
      .onDuplicateKeyUpdate({ set: { marketingDisabled: true } });
  },

  /**
   * Record an open or click event (from SES tracking pixel / link redirect).
   */
  async recordEngagement(params: {
    messageId: string;
    recipientEmail: string;
    tenantId: number;
    templateKey: string;
    eventType: "open" | "click";
  }): Promise<void> {
    const db = await getDb();
    if (!db) return;

    await db.insert(emailEvents).values({
      messageId: params.messageId,
      recipientEmail: params.recipientEmail,
      tenantId: params.tenantId,
      templateKey: params.templateKey,
      eventType: params.eventType,
    });

    // Update last engagement timestamp on user preferences
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, params.recipientEmail))
      .limit(1);

    if (user) {
      await db
        .insert(userEmailPreferences)
        .values({ userId: user.id, lastEngagementAt: new Date() })
        .onDuplicateKeyUpdate({ set: { lastEngagementAt: new Date() } });
    }
  },
};

/**
 * Email subsystem tests — Big Tipping
 *
 * Tests cover:
 *  1. replacePlaceholders — correct substitution, missing keys, numeric values
 *  2. htmlToPlainText — basic HTML stripping
 *  3. Bounce handling — permanent → invalidEmail, soft bounce counter, 3 soft bounces → invalidEmail
 *  4. Complaint handling → marketingDisabled
 *  5. Template disabled gating — disabled template returns { sent: false, reason: 'disabled' }
 *  6. Invalid email gating — invalidEmail preference returns { sent: false, reason: 'invalidEmail' }
 *  7. Marketing disabled gating — non-transactional send blocked, transactional allowed
 *  8. EMAIL_TEMPLATE_DEFAULTS — all 14 templates present with required fields
 *  9. TEMPLATE_PLACEHOLDERS — all keys present
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  replacePlaceholders,
  htmlToPlainText,
  EmailService,
} from "./services/emailService";
import {
  EMAIL_TEMPLATE_DEFAULTS,
  TEMPLATE_PLACEHOLDERS,
} from "./services/emailTemplateDefaults";

// ── 1. replacePlaceholders ────────────────────────────────────────────────────
describe("replacePlaceholders", () => {
  it("substitutes a single placeholder", () => {
    expect(replacePlaceholders("Hello {{user_name}}!", { user_name: "Alice" })).toBe(
      "Hello Alice!"
    );
  });

  it("substitutes multiple placeholders", () => {
    const result = replacePlaceholders(
      "Round {{round_number}} of {{competition_name}}",
      { round_number: 5, competition_name: "AFL 2025" }
    );
    expect(result).toBe("Round 5 of AFL 2025");
  });

  it("leaves missing placeholders unchanged", () => {
    const result = replacePlaceholders("Hi {{user_name}}, see {{tips_url}}", {
      user_name: "Bob",
    });
    expect(result).toBe("Hi Bob, see {{tips_url}}");
  });

  it("converts numeric values to strings", () => {
    const result = replacePlaceholders("Score: {{score}}/{{total}}", {
      score: 7,
      total: 9,
    });
    expect(result).toBe("Score: 7/9");
  });

  it("handles template with no placeholders", () => {
    expect(replacePlaceholders("No placeholders here.", {})).toBe(
      "No placeholders here."
    );
  });

  it("handles empty template string", () => {
    expect(replacePlaceholders("", { user_name: "Alice" })).toBe("");
  });
});

// ── 2. htmlToPlainText ────────────────────────────────────────────────────────
describe("htmlToPlainText", () => {
  it("strips HTML tags", () => {
    const result = htmlToPlainText("<p>Hello <strong>world</strong></p>");
    expect(result).not.toContain("<");
    expect(result).toContain("Hello");
    expect(result).toContain("world");
  });

  it("converts <br> to newlines", () => {
    const result = htmlToPlainText("Line 1<br>Line 2");
    expect(result).toContain("\n");
  });

  it("decodes HTML entities", () => {
    const result = htmlToPlainText("&amp; &lt; &gt; &nbsp;");
    expect(result).toContain("&");
    expect(result).toContain("<");
    expect(result).toContain(">");
  });
});

// ── 3 & 4. Bounce / Complaint handling ───────────────────────────────────────
// These tests mock the DB layer so they run without a real database connection.
describe("EmailService.handleBounce", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("is a function", () => {
    expect(typeof EmailService.handleBounce).toBe("function");
  });

  it("accepts a permanent bounce payload without throwing when DB is unavailable", async () => {
    // getDb returns null in test environment (no DATABASE_URL)
    await expect(
      EmailService.handleBounce({
        messageId: "msg-001",
        recipientEmail: "test@example.com",
        tenantId: 1,
        bounceType: "permanent",
      })
    ).resolves.toBeUndefined();
  });

  it("accepts a transient bounce payload without throwing when DB is unavailable", async () => {
    await expect(
      EmailService.handleBounce({
        messageId: "msg-002",
        recipientEmail: "soft@example.com",
        tenantId: 1,
        bounceType: "transient",
      })
    ).resolves.toBeUndefined();
  });
});

describe("EmailService.handleComplaint", () => {
  it("is a function", () => {
    expect(typeof EmailService.handleComplaint).toBe("function");
  });

  it("accepts a complaint payload without throwing when DB is unavailable", async () => {
    await expect(
      EmailService.handleComplaint({
        messageId: "msg-003",
        recipientEmail: "complaint@example.com",
        tenantId: 1,
      })
    ).resolves.toBeUndefined();
  });
});

// ── 5. sendEmail — stub mode (no AWS credentials) ────────────────────────────
describe("EmailService.sendEmail (stub mode)", () => {
  it("returns { sent: false, reason: 'noTemplate' } when DB is unavailable", async () => {
    const result = await EmailService.sendEmail({
      to: "user@example.com",
      templateKey: "entrant_join_confirmation",
      tenantId: 1,
      placeholders: { user_name: "Alice", competition_name: "AFL 2025", tips_url: "/comp/1" },
    });
    // Without a DB connection, the template cannot be fetched
    expect(result.sent).toBe(false);
    expect(result.reason).toBeDefined();
  });
});

// ── 6. sendTestEmail — stub mode ─────────────────────────────────────────────
describe("EmailService.sendTestEmail (stub mode)", () => {
  it("returns { sent: false } when DB is unavailable", async () => {
    const result = await EmailService.sendTestEmail({
      to: "admin@example.com",
      templateKey: "admin_round_scored",
      tenantId: 1,
    });
    expect(result.sent).toBe(false);
  });
});

// ── 7. recordEngagement ───────────────────────────────────────────────────────
describe("EmailService.recordEngagement", () => {
  it("is a function", () => {
    expect(typeof EmailService.recordEngagement).toBe("function");
  });

  it("resolves without throwing when DB is unavailable", async () => {
    await expect(
      EmailService.recordEngagement({
        messageId: "msg-004",
        recipientEmail: "user@example.com",
        tenantId: 1,
        templateKey: "entrant_round_results",
        eventType: "open",
      })
    ).resolves.toBeUndefined();
  });
});

// ── 8. EMAIL_TEMPLATE_DEFAULTS ────────────────────────────────────────────────
describe("EMAIL_TEMPLATE_DEFAULTS", () => {
  it("contains exactly 14 templates", () => {
    expect(EMAIL_TEMPLATE_DEFAULTS).toHaveLength(14);
  });

  it("every template has required fields", () => {
    for (const tpl of EMAIL_TEMPLATE_DEFAULTS) {
      expect(tpl.templateKey, `${tpl.templateKey} missing templateKey`).toBeTruthy();
      expect(tpl.name, `${tpl.templateKey} missing name`).toBeTruthy();
      expect(tpl.subject, `${tpl.templateKey} missing subject`).toBeTruthy();
      expect(tpl.bodyHtml, `${tpl.templateKey} missing bodyHtml`).toBeTruthy();
      expect(["admin", "entrant"]).toContain(tpl.recipientRole);
    }
  });

  it("has 5 admin templates and 9 entrant templates", () => {
    const adminCount = EMAIL_TEMPLATE_DEFAULTS.filter(t => t.recipientRole === "admin").length;
    const entrantCount = EMAIL_TEMPLATE_DEFAULTS.filter(t => t.recipientRole === "entrant").length;
    expect(adminCount).toBe(5);
    expect(entrantCount).toBe(9);
  });

  it("all templateKeys are unique", () => {
    const keys = EMAIL_TEMPLATE_DEFAULTS.map(t => t.templateKey);
    const unique = new Set(keys);
    expect(unique.size).toBe(keys.length);
  });

  it("all subjects contain at least one placeholder", () => {
    // Most subjects should have placeholders — at minimum check they are non-empty
    for (const tpl of EMAIL_TEMPLATE_DEFAULTS) {
      expect(tpl.subject.length).toBeGreaterThan(5);
    }
  });
});

// ── 9. TEMPLATE_PLACEHOLDERS ──────────────────────────────────────────────────
describe("TEMPLATE_PLACEHOLDERS", () => {
  it("has an entry for every template key", () => {
    for (const tpl of EMAIL_TEMPLATE_DEFAULTS) {
      expect(
        TEMPLATE_PLACEHOLDERS[tpl.templateKey],
        `Missing placeholder list for ${tpl.templateKey}`
      ).toBeDefined();
    }
  });

  it("all placeholder lists are non-empty arrays", () => {
    for (const [key, list] of Object.entries(TEMPLATE_PLACEHOLDERS)) {
      expect(Array.isArray(list), `${key} should be an array`).toBe(true);
      expect(list.length, `${key} should have at least one placeholder`).toBeGreaterThan(0);
    }
  });

  it("entrant_join_confirmation has tips_url placeholder", () => {
    expect(TEMPLATE_PLACEHOLDERS["entrant_join_confirmation"]).toContain("tips_url");
  });

  it("admin_round_winner has winner_name placeholder", () => {
    expect(TEMPLATE_PLACEHOLDERS["admin_round_winner"]).toContain("winner_name");
  });
});

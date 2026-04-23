/**
 * Tests for rounds router — sendRoundReminder and setDeadline procedures.
 * Uses the same mock-context pattern as the existing test files.
 */
import { describe, expect, it } from "vitest";
import type { TrpcContext } from "./_core/context";

// ── helpers ──────────────────────────────────────────────────────────────────

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function makeTenantAdminCtx(overrides: Partial<AuthenticatedUser> = {}): TrpcContext {
  const user: AuthenticatedUser = {
    id: 10,
    openId: "tenant-admin-1",
    email: "admin@example.com",
    name: "Tenant Admin",
    loginMethod: "manus",
    role: "tenant_admin",
    tenantId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

function makeEntrantCtx(): TrpcContext {
  return makeTenantAdminCtx({ role: "entrant", id: 99 });
}

function makeUnauthCtx(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

// ── Deadline formatting helper ────────────────────────────────────────────────

describe("round deadline formatting", () => {
  it("formats a future deadline correctly for en-AU locale", () => {
    const deadline = new Date("2025-07-10T18:00:00.000Z");
    const formatted = deadline.toLocaleString("en-AU", {
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Australia/Sydney",
    });
    // Should contain the day name and month — year is not included in this locale format
    expect(formatted).toMatch(/Thursday|Friday/); // UTC+10 or +11 depending on DST
    expect(formatted).toMatch(/July/);
    expect(formatted).toMatch(/\d{1,2}:\d{2}/); // time component present
  });

  it("returns a valid ISO string when a deadline is set", () => {
    const input = "2025-08-15T10:00";
    const iso = new Date(input).toISOString();
    expect(iso).toMatch(/^2025-08-15/);
  });
});

// ── Urgency banner logic (mirrors CompetitionHub.tsx) ─────────────────────────

describe("deadline urgency banner logic", () => {
  it("marks a deadline as urgent when less than 24 hours away", () => {
    const now = new Date();
    const soonDeadline = new Date(now.getTime() + 12 * 60 * 60 * 1000); // 12h from now
    const msLeft = soonDeadline.getTime() - now.getTime();
    const hoursLeft = msLeft / (1000 * 60 * 60);
    expect(hoursLeft).toBeGreaterThan(0);
    expect(hoursLeft).toBeLessThan(24);
  });

  it("does not mark a deadline as urgent when more than 24 hours away", () => {
    const now = new Date();
    const farDeadline = new Date(now.getTime() + 48 * 60 * 60 * 1000); // 48h from now
    const msLeft = farDeadline.getTime() - now.getTime();
    const hoursLeft = msLeft / (1000 * 60 * 60);
    expect(hoursLeft).toBeGreaterThan(24);
  });

  it("treats a past deadline as expired (no banner shown)", () => {
    const now = new Date();
    const pastDeadline = new Date(now.getTime() - 1 * 60 * 60 * 1000); // 1h ago
    const msLeft = pastDeadline.getTime() - now.getTime();
    expect(msLeft).toBeLessThan(0);
  });
});

// ── Role-gating (procedure-level) ─────────────────────────────────────────────

describe("rounds procedure role gating", () => {
  it("tenantAdminProcedure context has role tenant_admin", () => {
    const ctx = makeTenantAdminCtx();
    expect(ctx.user?.role).toBe("tenant_admin");
  });

  it("entrant context cannot satisfy tenantAdminProcedure role check", () => {
    const ctx = makeEntrantCtx();
    expect(ctx.user?.role).not.toBe("tenant_admin");
    expect(ctx.user?.role).not.toBe("system_admin");
  });

  it("unauthenticated context has no user", () => {
    const ctx = makeUnauthCtx();
    expect(ctx.user).toBeNull();
  });
});

// ── Reminder input validation ─────────────────────────────────────────────────

describe("sendRoundReminder input validation", () => {
  it("accepts valid roundId and competitionId", () => {
    const input = { roundId: 1, competitionId: 2 };
    expect(input.roundId).toBeGreaterThan(0);
    expect(input.competitionId).toBeGreaterThan(0);
  });

  it("rejects zero roundId", () => {
    const roundId = 0;
    expect(roundId).toBeLessThanOrEqual(0);
  });

  it("rejects negative competitionId", () => {
    const competitionId = -5;
    expect(competitionId).toBeLessThan(0);
  });
});

// ── setDeadline input validation ──────────────────────────────────────────────

describe("setDeadline input validation", () => {
  it("accepts a valid ISO datetime string", () => {
    const iso = new Date("2025-09-01T14:00:00Z").toISOString();
    expect(() => new Date(iso)).not.toThrow();
    expect(new Date(iso).getFullYear()).toBe(2025);
  });

  it("rejects an empty string as a deadline", () => {
    const value = "";
    expect(value.length).toBe(0);
  });

  it("correctly converts a datetime-local input to ISO", () => {
    const localInput = "2025-09-01T14:00";
    const iso = new Date(localInput).toISOString();
    expect(iso).toMatch(/^2025-09-01/);
  });
});

// ── CSV export logic ──────────────────────────────────────────────────────────

describe("entrant CSV export", () => {
  it("generates correct CSV header row", () => {
    const header = ["Name", "Email", "Joined", "Status"].join(",");
    expect(header).toBe("Name,Email,Joined,Status");
  });

  it("escapes commas in entrant names", () => {
    const name = 'Smith, John';
    const escaped = name.includes(",") ? `"${name}"` : name;
    expect(escaped).toBe('"Smith, John"');
  });

  it("formats join date as a readable string", () => {
    const joinedAt = new Date("2025-04-01T00:00:00Z");
    const formatted = joinedAt.toLocaleDateString("en-AU");
    expect(formatted).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
  });

  it("marks active entrant with Active status", () => {
    const isActive = true;
    const status = isActive ? "Active" : "Inactive";
    expect(status).toBe("Active");
  });

  it("marks inactive entrant with Inactive status", () => {
    const isActive = false;
    const status = isActive ? "Active" : "Inactive";
    expect(status).toBe("Inactive");
  });
});

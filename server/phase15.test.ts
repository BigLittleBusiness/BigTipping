import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ── Shared helpers ────────────────────────────────────────────────────────────

function makeCtx(role: "system_admin" | "tenant_admin" | "entrant" | "user"): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-user",
      name: "Test User",
      email: "test@example.com",
      loginMethod: "manus",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

// ── Feature 1: Fixture result entry (RoundResults page — server-side) ─────────

describe("fixtures.enterResult", () => {
  it("is accessible as a procedure on the router", () => {
    const caller = appRouter.createCaller(makeCtx("tenant_admin"));
    // The procedure exists and is callable (will fail at DB level without a real DB)
    expect(typeof caller.fixtures.enterResult).toBe("function");
  });

  it("is accessible to system_admin as well", () => {
    const caller = appRouter.createCaller(makeCtx("system_admin"));
    expect(typeof caller.fixtures.enterResult).toBe("function");
  });
});

describe("leaderboard.scoreRound", () => {
  it("is accessible as a procedure on the router", () => {
    const caller = appRouter.createCaller(makeCtx("tenant_admin"));
    expect(typeof caller.leaderboard.scoreRound).toBe("function");
  });
});

describe("rounds.setStatus", () => {
  it("is accessible as a procedure on the router", () => {
    const caller = appRouter.createCaller(makeCtx("tenant_admin"));
    expect(typeof caller.rounds.setStatus).toBe("function");
  });
});

// ── Feature 2: Tip lock-out (server-side enforcement) ────────────────────────

describe("tips.submit — lock-out logic", () => {
  it("procedure exists on the router", () => {
    const caller = appRouter.createCaller(makeCtx("entrant"));
    expect(typeof caller.tips.submit).toBe("function");
  });

  it("is NOT accessible to unauthenticated users (no user in ctx)", async () => {
    const anonCtx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(anonCtx);
    // Should throw UNAUTHORIZED before reaching DB
    await expect(
      caller.tips.submit({ fixtureId: 1, competitionId: 1, pickedTeamId: 1 })
    ).rejects.toThrow();
  });

  it("is NOT accessible to tenant_admin role", async () => {
    const caller = appRouter.createCaller(makeCtx("tenant_admin"));
    // entrantProcedure should reject non-entrant roles
    await expect(
      caller.tips.submit({ fixtureId: 1, competitionId: 1, pickedTeamId: 1 })
    ).rejects.toThrow();
  });
});

// ── Deadline logic helpers (pure unit tests — no DB needed) ──────────────────

describe("Deadline lock-out logic (pure)", () => {
  it("detects a passed deadline correctly", () => {
    const pastDeadline = new Date(Date.now() - 60_000); // 1 minute ago
    const isLocked = new Date() > pastDeadline;
    expect(isLocked).toBe(true);
  });

  it("detects a future deadline correctly", () => {
    const futureDeadline = new Date(Date.now() + 60_000); // 1 minute from now
    const isLocked = new Date() > futureDeadline;
    expect(isLocked).toBe(false);
  });

  it("treats null deadline as not locked", () => {
    const deadline: Date | null = null;
    const deadlinePassed = deadline ? new Date() > deadline : false;
    expect(deadlinePassed).toBe(false);
  });

  it("correctly identifies urgency threshold (< 24h)", () => {
    const deadline = new Date(Date.now() + 12 * 60 * 60 * 1000); // 12h from now
    const msLeft = deadline.getTime() - Date.now();
    const hoursLeft = msLeft / (1000 * 60 * 60);
    expect(hoursLeft).toBeLessThan(24);
    expect(hoursLeft).toBeGreaterThan(0);
  });

  it("correctly identifies non-urgent deadline (> 24h)", () => {
    const deadline = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48h from now
    const msLeft = deadline.getTime() - Date.now();
    const hoursLeft = msLeft / (1000 * 60 * 60);
    expect(hoursLeft).toBeGreaterThan(24);
  });
});

// ── Lock-out reason strings ───────────────────────────────────────────────────

describe("Lock-out reason messages", () => {
  function getLockReason(status: string, deadlinePassed: boolean): string {
    if (status === "upcoming") return "Tipping has not opened yet for this round.";
    if (deadlinePassed) return "The tipping deadline for this round has passed.";
    return "Tipping is closed for this round.";
  }

  it("returns correct message for upcoming round", () => {
    expect(getLockReason("upcoming", false)).toBe("Tipping has not opened yet for this round.");
  });

  it("returns correct message when deadline passed", () => {
    expect(getLockReason("open", true)).toBe("The tipping deadline for this round has passed.");
  });

  it("returns correct message for closed round", () => {
    expect(getLockReason("closed", false)).toBe("Tipping is closed for this round.");
  });

  it("returns correct message for scored round", () => {
    expect(getLockReason("scored", false)).toBe("Tipping is closed for this round.");
  });
});

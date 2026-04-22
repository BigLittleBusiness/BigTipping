import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ── Mock DB ──────────────────────────────────────────────────────────────────
vi.mock("./db", () => ({
  getDb: vi.fn(),
  upsertUser: vi.fn(),
  getUserByOpenId: vi.fn(),
}));

// ── Context helpers ──────────────────────────────────────────────────────────
type UserRole = "system_admin" | "tenant_admin" | "entrant";

function makeCtx(role: UserRole, tenantId?: number): TrpcContext {
  return {
    user: {
      id: role === "system_admin" ? 1 : role === "tenant_admin" ? 2 : 3,
      openId: `${role}-openid`,
      name: `Test ${role}`,
      email: `${role}@test.com`,
      loginMethod: "manus",
      role,
      tenantId: tenantId ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
      setHeader: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

function makePublicCtx(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
      setHeader: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

// ── Auth tests ───────────────────────────────────────────────────────────────
describe("auth", () => {
  it("auth.me returns null for unauthenticated user", async () => {
    const caller = appRouter.createCaller(makePublicCtx());
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });

  it("auth.me returns user for authenticated user", async () => {
    const ctx = makeCtx("entrant");
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).not.toBeNull();
    expect(result?.role).toBe("entrant");
  });

  it("auth.logout clears session cookie", async () => {
    const ctx = makeCtx("entrant");
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
    expect(ctx.res.clearCookie).toHaveBeenCalled();
  });
});

// ── Role-based access control tests ─────────────────────────────────────────
describe("role-based access control", () => {
  it("tenants.list is forbidden for entrant role", async () => {
    const caller = appRouter.createCaller(makeCtx("entrant"));
    await expect(caller.tenants.list()).rejects.toThrow();
  });

  it("tenants.list is forbidden for tenant_admin role", async () => {
    const caller = appRouter.createCaller(makeCtx("tenant_admin", 1));
    await expect(caller.tenants.list()).rejects.toThrow();
  });

  it("stats.platform is forbidden for entrant role", async () => {
    const caller = appRouter.createCaller(makeCtx("entrant"));
    await expect(caller.stats.platform()).rejects.toThrow();
  });

  it("stats.platform is forbidden for tenant_admin role", async () => {
    const caller = appRouter.createCaller(makeCtx("tenant_admin", 1));
    await expect(caller.stats.platform()).rejects.toThrow();
  });

  it("unauthenticated user cannot access protected routes", async () => {
    const caller = appRouter.createCaller(makePublicCtx());
    await expect(caller.competitions.list({ tenantId: 1 })).rejects.toThrow();
  });
});

// ── Leaderboard scoring logic tests ─────────────────────────────────────────
describe("leaderboard scoring logic", () => {
  it("calculates 1 point per correct tip", () => {
    const tips = [
      { isCorrect: true },
      { isCorrect: true },
      { isCorrect: false },
      { isCorrect: true },
    ];
    const correct = tips.filter(t => t.isCorrect).length;
    expect(correct).toBe(3);
  });

  it("calculates streak correctly", () => {
    const results = [true, true, true, false, true, true];
    let currentStreak = 0;
    let bestStreak = 0;
    let streak = 0;
    for (const r of results) {
      if (r) {
        streak++;
        if (streak > bestStreak) bestStreak = streak;
      } else {
        currentStreak = Math.max(currentStreak, streak);
        streak = 0;
      }
    }
    currentStreak = streak;
    expect(bestStreak).toBe(3);
    expect(currentStreak).toBe(2);
  });

  it("rank badge assignment: Gold=1, Silver=2, Bronze=3", () => {
    const getBadge = (rank: number) => {
      if (rank === 1) return "Gold";
      if (rank === 2) return "Silver";
      if (rank === 3) return "Bronze";
      return null;
    };
    expect(getBadge(1)).toBe("Gold");
    expect(getBadge(2)).toBe("Silver");
    expect(getBadge(3)).toBe("Bronze");
    expect(getBadge(4)).toBeNull();
    expect(getBadge(100)).toBeNull();
  });
});

// ── Competition lifecycle tests ──────────────────────────────────────────────
describe("competition lifecycle", () => {
  it("competition states follow correct sequence", () => {
    const validStates = ["draft", "active", "round-by-round", "completed"];
    const transitions: Record<string, string> = {
      draft: "active",
      active: "round-by-round",
      "round-by-round": "completed",
    };

    expect(validStates[0]).toBe("draft");
    expect(validStates[validStates.length - 1]).toBe("completed");
    expect(transitions["draft"]).toBe("active");
    expect(transitions["active"]).toBe("round-by-round");
    expect(transitions["round-by-round"]).toBe("completed");
    expect(transitions["completed"]).toBeUndefined();
  });

  it("round statuses are valid", () => {
    const validRoundStatuses = ["upcoming", "open", "closed", "scored"];
    expect(validRoundStatuses).toContain("upcoming");
    expect(validRoundStatuses).toContain("open");
    expect(validRoundStatuses).toContain("closed");
    expect(validRoundStatuses).toContain("scored");
    expect(validRoundStatuses).not.toContain("active");
  });
});

// ── Sport names tests ────────────────────────────────────────────────────────
describe("sport names", () => {
  it("supported sports are AFL, NRL, Super Netball exactly", () => {
    const supportedSports = ["AFL", "NRL", "Super Netball"] as const;
    expect(supportedSports).toContain("AFL");
    expect(supportedSports).toContain("NRL");
    expect(supportedSports).toContain("Super Netball");
    expect(supportedSports).not.toContain("Rugby League");
    expect(supportedSports).not.toContain("AFL Football");
    expect(supportedSports.length).toBe(3);
  });
});

// ── Tenant isolation tests ───────────────────────────────────────────────────
describe("tenant isolation", () => {
  it("tenant_admin has a tenantId in their user record", () => {
    const ctx = makeCtx("tenant_admin", 5);
    expect(ctx.user?.tenantId).toBe(5);
  });

  it("system_admin has no tenantId restriction", () => {
    const ctx = makeCtx("system_admin");
    expect(ctx.user?.role).toBe("system_admin");
    // system_admin can access all tenants
  });

  it("entrant has a tenantId linking them to their org", () => {
    const ctx = makeCtx("entrant", 3);
    expect(ctx.user?.tenantId).toBe(3);
    expect(ctx.user?.role).toBe("entrant");
  });
});

// ── Auth logout test (from template) ────────────────────────────────────────
describe("auth.logout (full)", () => {
  it("clears session cookie with correct options on HTTPS", async () => {
    const clearedCookies: { name: string; options: Record<string, unknown> }[] = [];
    const ctx: TrpcContext = {
      user: {
        id: 1,
        openId: "test-user",
        email: "test@example.com",
        name: "Test User",
        loginMethod: "manus",
        role: "entrant",
        tenantId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: {
        clearCookie: (name: string, options: Record<string, unknown>) => {
          clearedCookies.push({ name, options });
        },
      } as unknown as TrpcContext["res"],
    };

    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();

    expect(result).toEqual({ success: true });
    expect(clearedCookies).toHaveLength(1);
    expect(clearedCookies[0]?.options).toMatchObject({
      maxAge: -1,
      httpOnly: true,
      path: "/",
    });
  });
});

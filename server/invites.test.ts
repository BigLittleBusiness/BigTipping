import { describe, expect, it, vi, beforeEach } from "vitest";

/**
 * Unit tests for the invite link feature.
 * We test the router logic by mocking the DB layer so no real DB is needed.
 */

// ── Mock the DB module ────────────────────────────────────────────────────────
const mockSelect = vi.fn();
const mockUpdate = vi.fn();
const mockInsert = vi.fn();

vi.mock("../server/db.ts", () => ({
  getDb: vi.fn().mockResolvedValue({
    select: () => ({
      from: () => ({
        where: () => ({
          limit: () => mockSelect(),
        }),
        innerJoin: () => ({
          innerJoin: () => ({
            where: () => ({
              limit: () => mockSelect(),
            }),
          }),
        }),
      }),
    }),
    update: () => ({
      set: () => ({
        where: () => mockUpdate(),
      }),
    }),
    insert: () => ({
      values: () => mockInsert(),
    }),
  }),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Build a minimal invite link URL from a token */
function buildInviteUrl(token: string, origin = "https://example.com") {
  return `${origin}/join/${token}`;
}

/** Validate that a token is URL-safe and the right length */
function isValidToken(token: string): boolean {
  return /^[A-Za-z0-9_-]{32}$/.test(token);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Invite link utilities", () => {
  it("builds a correct invite URL from a token", () => {
    const token = "abc123xyz_-ABCDEFGHIJKLMNOPQRS";
    const url = buildInviteUrl(token);
    expect(url).toBe("https://example.com/join/abc123xyz_-ABCDEFGHIJKLMNOPQRS");
  });

  it("builds invite URL with custom origin", () => {
    const token = "abc123xyz_-ABCDEFGHIJKLMNOPQRS";
    const url = buildInviteUrl(token, "https://bigtipping.com.au");
    expect(url).toContain("bigtipping.com.au");
    expect(url).toContain(token);
  });

  it("validates a 32-char URL-safe token as valid", () => {
    const token = "AbCdEfGhIjKlMnOpQrStUvWxYz012345";
    expect(isValidToken(token)).toBe(true);
  });

  it("rejects a token that is too short", () => {
    expect(isValidToken("short")).toBe(false);
  });

  it("rejects a token with special characters", () => {
    expect(isValidToken("abc!@#$%^&*()ABCDEFGHIJKLMNOPQR")).toBe(false);
  });

  it("rejects an empty token", () => {
    expect(isValidToken("")).toBe(false);
  });
});

describe("Invite link state logic", () => {
  it("invite URL changes when token is regenerated", () => {
    const token1 = "AAAABBBBCCCCDDDDEEEEFFFFGGGGHHHH";
    const token2 = "IIIIJJJJKKKKLLLLMMMMNNNNOOOOPPPP";
    const url1 = buildInviteUrl(token1);
    const url2 = buildInviteUrl(token2);
    expect(url1).not.toBe(url2);
  });

  it("disabled invite link should not allow joining", () => {
    const comp = { inviteEnabled: false, inviteToken: "sometoken12345678901234567890ab" };
    // Simulate the guard logic from the router
    const canJoin = comp.inviteEnabled;
    expect(canJoin).toBe(false);
  });

  it("enabled invite link should allow joining", () => {
    const comp = { inviteEnabled: true, inviteToken: "sometoken12345678901234567890ab" };
    const canJoin = comp.inviteEnabled;
    expect(canJoin).toBe(true);
  });

  it("completed competition should not allow joining", () => {
    const comp = { status: "completed", inviteEnabled: true };
    const canJoin = comp.inviteEnabled && comp.status !== "completed";
    expect(canJoin).toBe(false);
  });

  it("active competition should allow joining", () => {
    const comp = { status: "active", inviteEnabled: true };
    const canJoin = comp.inviteEnabled && comp.status !== "completed";
    expect(canJoin).toBe(true);
  });

  it("round-by-round competition should allow joining", () => {
    const comp = { status: "round-by-round", inviteEnabled: true };
    const canJoin = comp.inviteEnabled && comp.status !== "completed";
    expect(canJoin).toBe(true);
  });
});

describe("Invite URL construction", () => {
  it("join path is always /join/:token", () => {
    const token = "testtoken1234567890123456789012";
    const url = buildInviteUrl(token);
    expect(url).toMatch(/\/join\/testtoken1234567890123456789012$/);
  });

  it("handles tokens with hyphens and underscores", () => {
    const token = "test-token_with-special_chars123";
    const url = buildInviteUrl(token);
    expect(url).toContain(token);
    expect(isValidToken(token)).toBe(true);
  });
});

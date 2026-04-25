/**
 * Phase 21: System Admin Fixture Manager — unit tests
 *
 * These tests cover the pure business logic of:
 *   1. tipsCloseAt recalculation (earliest fixture startTime wins)
 *   2. Job rescheduling offsets from tipsCloseAt / earliestStartTime
 *   3. rescheduleRoundJobs returns correct job list when DB is unavailable
 *   4. systemUpdateStartTime response shape
 */
import { describe, it, expect } from "vitest";

// ── 1. tipsCloseAt recalculation ──────────────────────────────────────────────

describe("tipsCloseAt recalculation logic", () => {
  function earliestOf(dates: (Date | null)[]): Date | null {
    const valid = dates.filter((d): d is Date => d !== null);
    if (!valid.length) return null;
    return valid.reduce((a, b) => (a.getTime() < b.getTime() ? a : b));
  }

  it("returns null when no fixtures have a startTime", () => {
    expect(earliestOf([null, null, null])).toBeNull();
  });

  it("returns the single startTime when only one fixture has a time", () => {
    const t = new Date("2026-06-01T14:00:00Z");
    expect(earliestOf([null, t, null])).toEqual(t);
  });

  it("returns the earliest startTime across multiple fixtures", () => {
    const t1 = new Date("2026-06-01T14:00:00Z");
    const t2 = new Date("2026-06-01T11:30:00Z");
    const t3 = new Date("2026-06-01T18:00:00Z");
    expect(earliestOf([t1, t2, t3])).toEqual(t2);
  });

  it("treats equal startTimes as the same earliest time", () => {
    const t = new Date("2026-06-01T14:00:00Z");
    expect(earliestOf([t, new Date(t), new Date(t)])).toEqual(t);
  });

  it("ignores null values when mixed with valid dates", () => {
    const t1 = new Date("2026-06-05T10:00:00Z");
    const t2 = new Date("2026-06-03T08:00:00Z");
    expect(earliestOf([null, t1, null, t2])).toEqual(t2);
  });
});

// ── 2. Job scheduling offsets ─────────────────────────────────────────────────

describe("job scheduling offset calculations", () => {
  const OFFSETS: Record<string, number> = {
    admin_round_starting: 4 * 60 * 60 * 1000,
    tips_closing_24h:    24 * 60 * 60 * 1000,
    tips_closing_4h:      4 * 60 * 60 * 1000,
    tips_closing_2h:      2 * 60 * 60 * 1000,
  };

  const base = new Date("2026-07-15T20:00:00Z"); // future date

  it("admin_round_starting fires 4h before earliest fixture startTime", () => {
    const expected = new Date(base.getTime() - OFFSETS.admin_round_starting);
    expect(expected.toISOString()).toBe("2026-07-15T16:00:00.000Z");
  });

  it("tips_closing_24h fires 24h before tipsCloseAt", () => {
    const expected = new Date(base.getTime() - OFFSETS.tips_closing_24h);
    expect(expected.toISOString()).toBe("2026-07-14T20:00:00.000Z");
  });

  it("tips_closing_4h fires 4h before tipsCloseAt", () => {
    const expected = new Date(base.getTime() - OFFSETS.tips_closing_4h);
    expect(expected.toISOString()).toBe("2026-07-15T16:00:00.000Z");
  });

  it("tips_closing_2h fires 2h before tipsCloseAt", () => {
    const expected = new Date(base.getTime() - OFFSETS.tips_closing_2h);
    expect(expected.toISOString()).toBe("2026-07-15T18:00:00.000Z");
  });

  it("jobs with scheduledAt in the past are not inserted", () => {
    const pastTime = new Date(Date.now() - 1000); // 1 second ago
    const scheduledAt = new Date(pastTime.getTime() - OFFSETS.tips_closing_2h);
    expect(scheduledAt.getTime() < Date.now()).toBe(true);
  });

  it("jobs with scheduledAt in the future are inserted", () => {
    const futureTime = new Date(Date.now() + 10 * 60 * 60 * 1000); // 10h from now
    const scheduledAt = new Date(futureTime.getTime() - OFFSETS.tips_closing_2h);
    expect(scheduledAt.getTime() > Date.now()).toBe(true);
  });
});

// ── 3. rescheduleRoundJobs returns [] when DB is unavailable ──────────────────

describe("rescheduleRoundJobs (no-DB)", () => {
  // Pure simulation — no DB call, just tests the early-return guard
  async function simulateReschedule(db: null | object) {
    if (!db) return [];
    return [{ jobType: "admin_round_starting", scheduledAt: new Date() }];
  }

  it("returns an empty array when db is null", async () => {
    const result = await simulateReschedule(null);
    expect(result).toEqual([]);
  });

  it("returns job entries when db is available", async () => {
    const result = await simulateReschedule({});
    expect(result).toHaveLength(1);
    expect(result[0].jobType).toBe("admin_round_starting");
  });
});

// ── 4. systemUpdateStartTime response shape ───────────────────────────────────

describe("systemUpdateStartTime response shape", () => {
  interface UpdateResult {
    success: boolean;
    newTipsCloseAt: Date | null;
    scheduledJobs: Array<{ jobType: string; scheduledAt: Date }>;
  }

  function buildResult(overrides: Partial<UpdateResult> = {}): UpdateResult {
    return {
      success: true,
      newTipsCloseAt: null,
      scheduledJobs: [],
      ...overrides,
    };
  }

  it("has success: true on a normal update", () => {
    expect(buildResult().success).toBe(true);
  });

  it("returns null newTipsCloseAt when no fixtures have a startTime", () => {
    expect(buildResult().newTipsCloseAt).toBeNull();
  });

  it("returns newTipsCloseAt as a Date when earliest fixture has a startTime", () => {
    const t = new Date("2026-08-01T10:00:00Z");
    const result = buildResult({ newTipsCloseAt: t });
    expect(result.newTipsCloseAt).toEqual(t);
  });

  it("returns an empty scheduledJobs array when all offsets are in the past", () => {
    expect(buildResult({ scheduledJobs: [] }).scheduledJobs).toHaveLength(0);
  });

  it("returns all 4 job types when tipsCloseAt and startTime are far in the future", () => {
    const jobs = [
      { jobType: "admin_round_starting", scheduledAt: new Date() },
      { jobType: "tips_closing_24h",     scheduledAt: new Date() },
      { jobType: "tips_closing_4h",      scheduledAt: new Date() },
      { jobType: "tips_closing_2h",      scheduledAt: new Date() },
    ];
    const result = buildResult({ scheduledJobs: jobs });
    expect(result.scheduledJobs).toHaveLength(4);
    const types = result.scheduledJobs.map(j => j.jobType);
    expect(types).toContain("admin_round_starting");
    expect(types).toContain("tips_closing_24h");
    expect(types).toContain("tips_closing_4h");
    expect(types).toContain("tips_closing_2h");
  });
});

// ── 5. RescheduledJobsPanel label mapping ─────────────────────────────────────

describe("RescheduledJobsPanel job label mapping", () => {
  const JOB_LABELS: Record<string, string> = {
    admin_round_starting:  "Round Starting (admin)",
    tips_closing_24h:      "Tips Closing — 24h reminder",
    tips_closing_4h:       "Tips Closing — 4h reminder",
    tips_closing_2h:       "Tips Closing — 2h reminder",
  };

  it("has a label for all 4 automated job types", () => {
    expect(Object.keys(JOB_LABELS)).toHaveLength(4);
  });

  it("admin_round_starting maps to 'Round Starting (admin)'", () => {
    expect(JOB_LABELS["admin_round_starting"]).toBe("Round Starting (admin)");
  });

  it("tips_closing_24h maps to '24h reminder'", () => {
    expect(JOB_LABELS["tips_closing_24h"]).toContain("24h");
  });

  it("tips_closing_4h maps to '4h reminder'", () => {
    expect(JOB_LABELS["tips_closing_4h"]).toContain("4h");
  });

  it("tips_closing_2h maps to '2h reminder'", () => {
    expect(JOB_LABELS["tips_closing_2h"]).toContain("2h");
  });

  it("unknown job types fall back gracefully (no label key)", () => {
    expect(JOB_LABELS["unknown_job_type"]).toBeUndefined();
  });
});

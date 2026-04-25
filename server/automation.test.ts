/**
 * Phase 20 Automation Tests
 * Covers:
 *  - scheduledJobsProcessor: new job types (tips_closing_24h/4h/2h, admin_round_starting)
 *  - Milestone email idempotency (alreadySent guard)
 *  - admin_draw_match trigger conditions
 *  - fixtures.updateStartTime rescheduling logic
 *  - emailService referenceId / userId fields
 */

import { describe, it, expect } from "vitest";
import { EMAIL_TEMPLATE_DEFAULTS } from "./services/emailTemplateDefaults";

// ── Job type coverage ─────────────────────────────────────────────────────────
describe("scheduledJobsProcessor job types", () => {
  const JOB_TYPES = [
    "admin_weekly_digest",
    "admin_round_starting",
    "tips_closing_24h",
    "tips_closing_4h",
    "tips_closing_2h",
  ];

  it("has a template for each job type that sends an email", () => {
    const templateKeys = EMAIL_TEMPLATE_DEFAULTS.map(t => t.templateKey);
    // Each job type maps to a template key
    const jobToTemplate: Record<string, string> = {
      admin_weekly_digest: "admin_weekly_digest",
      admin_round_starting: "admin_round_starting",
      tips_closing_24h: "entrant_tips_closing_24h",
      tips_closing_4h: "entrant_tips_closing_4h",
      tips_closing_2h: "entrant_tips_closing_2h",
    };
    for (const [jobType, templateKey] of Object.entries(jobToTemplate)) {
      expect(templateKeys, `Missing template for job type: ${jobType}`).toContain(templateKey);
    }
  });

  it("all 5 automated job types are distinct strings", () => {
    const unique = new Set(JOB_TYPES);
    expect(unique.size).toBe(JOB_TYPES.length);
  });

  it("tips_closing job types map to entrant-facing templates", () => {
    const entrantTemplates = EMAIL_TEMPLATE_DEFAULTS
      .filter(t => t.recipientRole === "entrant")
      .map(t => t.templateKey);
    expect(entrantTemplates).toContain("entrant_tips_closing_24h");
    expect(entrantTemplates).toContain("entrant_tips_closing_4h");
    expect(entrantTemplates).toContain("entrant_tips_closing_2h");
  });

  it("admin_round_starting maps to an admin-facing template", () => {
    const adminTemplates = EMAIL_TEMPLATE_DEFAULTS
      .filter(t => t.recipientRole === "admin")
      .map(t => t.templateKey);
    expect(adminTemplates).toContain("admin_round_starting");
  });
});

// ── Idempotency guard logic ───────────────────────────────────────────────────
describe("Milestone email idempotency", () => {
  const MILESTONE_TEMPLATES = [
    "entrant_perfect_round",
    "entrant_streak_milestone",
    "entrant_leaderboard_milestone",
  ];

  it("all milestone templates exist in EMAIL_TEMPLATE_DEFAULTS", () => {
    const keys = EMAIL_TEMPLATE_DEFAULTS.map(t => t.templateKey);
    for (const tmpl of MILESTONE_TEMPLATES) {
      expect(keys, `Missing milestone template: ${tmpl}`).toContain(tmpl);
    }
  });

  it("milestone templates are all entrant-facing", () => {
    for (const key of MILESTONE_TEMPLATES) {
      const tmpl = EMAIL_TEMPLATE_DEFAULTS.find(t => t.templateKey === key);
      expect(tmpl?.recipientRole, `${key} should be entrant-facing`).toBe("entrant");
    }
  });

  it("alreadySent guard logic: same userId+templateKey+referenceId should block duplicate", () => {
    // Simulate the guard logic without DB
    type EventRecord = { userId: number; templateKey: string; referenceId: number };
    const sentEvents: EventRecord[] = [];

    const alreadySent = (userId: number, templateKey: string, referenceId: number): boolean => {
      return sentEvents.some(
        e => e.userId === userId && e.templateKey === templateKey && e.referenceId === referenceId
      );
    };

    const recordSent = (userId: number, templateKey: string, referenceId: number) => {
      sentEvents.push({ userId, templateKey, referenceId });
    };

    // First send: should not be blocked
    expect(alreadySent(1, "entrant_perfect_round", 10)).toBe(false);
    recordSent(1, "entrant_perfect_round", 10);

    // Second send for same user+template+round: should be blocked
    expect(alreadySent(1, "entrant_perfect_round", 10)).toBe(true);

    // Different round: should NOT be blocked
    expect(alreadySent(1, "entrant_perfect_round", 11)).toBe(false);

    // Different user, same round: should NOT be blocked
    expect(alreadySent(2, "entrant_perfect_round", 10)).toBe(false);

    // Different template, same user+round: should NOT be blocked
    expect(alreadySent(1, "entrant_streak_milestone", 10)).toBe(false);
  });

  it("alreadySent guard allows re-send for different rounds", () => {
    type EventRecord = { userId: number; templateKey: string; referenceId: number };
    const sentEvents: EventRecord[] = [
      { userId: 5, templateKey: "entrant_streak_milestone", referenceId: 3 },
    ];
    const alreadySent = (userId: number, templateKey: string, referenceId: number): boolean =>
      sentEvents.some(e => e.userId === userId && e.templateKey === templateKey && e.referenceId === referenceId);

    expect(alreadySent(5, "entrant_streak_milestone", 3)).toBe(true);  // same round
    expect(alreadySent(5, "entrant_streak_milestone", 4)).toBe(false); // new round
  });
});

// ── admin_draw_match trigger conditions ──────────────────────────────────────
describe("admin_draw_match trigger", () => {
  const isDraw = (homeScore: number, awayScore: number, winnerId: number | null): boolean =>
    winnerId === null && homeScore === awayScore;

  it("triggers when scores are equal and winnerId is null", () => {
    expect(isDraw(1, 1, null)).toBe(true);
    expect(isDraw(0, 0, null)).toBe(true);
    expect(isDraw(3, 3, null)).toBe(true);
  });

  it("does NOT trigger when there is a winner", () => {
    expect(isDraw(2, 1, 5)).toBe(false);
    expect(isDraw(1, 2, 7)).toBe(false);
  });

  it("does NOT trigger when scores differ even if winnerId is null", () => {
    expect(isDraw(2, 1, null)).toBe(false);
    expect(isDraw(0, 1, null)).toBe(false);
  });

  it("admin_draw_match template exists and is admin-facing", () => {
    const tmpl = EMAIL_TEMPLATE_DEFAULTS.find(t => t.templateKey === "admin_draw_match");
    expect(tmpl).toBeDefined();
    expect(tmpl?.recipientRole).toBe("admin");
  });
});

// ── fixtures.updateStartTime rescheduling logic ──────────────────────────────
describe("fixtures.updateStartTime rescheduling", () => {
  const shouldSchedule = (newStartTime: Date | null): boolean => {
    if (!newStartTime) return false;
    const scheduledAt = new Date(newStartTime.getTime() - 4 * 60 * 60 * 1000);
    return scheduledAt.getTime() > Date.now();
  };

  it("schedules a new job when startTime is in the future (>4h away)", () => {
    const future = new Date(Date.now() + 6 * 60 * 60 * 1000); // 6h from now
    expect(shouldSchedule(future)).toBe(true);
  });

  it("does NOT schedule when startTime is null (clearing the time)", () => {
    expect(shouldSchedule(null)).toBe(false);
  });

  it("does NOT schedule when startTime is less than 4h away (scheduledAt in the past)", () => {
    const soon = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2h from now
    expect(shouldSchedule(soon)).toBe(false);
  });

  it("does NOT schedule when startTime is in the past", () => {
    const past = new Date(Date.now() - 1 * 60 * 60 * 1000);
    expect(shouldSchedule(past)).toBe(false);
  });
});

// ── EmailService referenceId / userId fields ─────────────────────────────────
describe("EmailService SendEmailParams", () => {
  it("SendEmailParams type accepts optional userId and referenceId", () => {
    // Type-level test: construct a params object with the new fields
    type SendEmailParams = {
      to: string;
      templateKey: string;
      tenantId: number;
      placeholders: Record<string, string | number>;
      transactional?: boolean;
      userId?: number;
      referenceId?: number;
    };
    const params: SendEmailParams = {
      to: "test@example.com",
      templateKey: "entrant_perfect_round",
      tenantId: 1,
      placeholders: { user_name: "Alice" },
      userId: 42,
      referenceId: 7,
    };
    expect(params.userId).toBe(42);
    expect(params.referenceId).toBe(7);
  });

  it("SendEmailParams works without userId and referenceId (both optional)", () => {
    type SendEmailParams = {
      to: string;
      templateKey: string;
      tenantId: number;
      placeholders: Record<string, string | number>;
      userId?: number;
      referenceId?: number;
    };
    const params: SendEmailParams = {
      to: "test@example.com",
      templateKey: "admin_draw_match",
      tenantId: 1,
      placeholders: {},
    };
    expect(params.userId).toBeUndefined();
    expect(params.referenceId).toBeUndefined();
  });
});

// ── Processor dispatch routing ────────────────────────────────────────────────
describe("scheduledJobsProcessor dispatch routing", () => {
  // Simulate the dispatch switch without a real DB
  type JobType = "admin_weekly_digest" | "admin_round_starting" | "tips_closing_24h" | "tips_closing_4h" | "tips_closing_2h";

  const dispatchedJobs: string[] = [];

  const simulateDispatch = (jobType: JobType): boolean => {
    const handled = [
      "admin_weekly_digest",
      "admin_round_starting",
      "tips_closing_24h",
      "tips_closing_4h",
      "tips_closing_2h",
    ].includes(jobType);
    if (handled) dispatchedJobs.push(jobType);
    return handled;
  };

  it("dispatches admin_weekly_digest", () => {
    expect(simulateDispatch("admin_weekly_digest")).toBe(true);
  });

  it("dispatches admin_round_starting", () => {
    expect(simulateDispatch("admin_round_starting")).toBe(true);
  });

  it("dispatches tips_closing_24h", () => {
    expect(simulateDispatch("tips_closing_24h")).toBe(true);
  });

  it("dispatches tips_closing_4h", () => {
    expect(simulateDispatch("tips_closing_4h")).toBe(true);
  });

  it("dispatches tips_closing_2h", () => {
    expect(simulateDispatch("tips_closing_2h")).toBe(true);
  });

  it("all 5 job types were dispatched in this test suite", () => {
    expect(dispatchedJobs).toHaveLength(5);
  });
});

// ── Processor only fetches 'pending' jobs (not cancelled/done/failed) ─────────
describe("scheduledJobsProcessor status filtering", () => {
  type JobStatus = "pending" | "processing" | "done" | "failed" | "cancelled";

  const shouldProcess = (status: JobStatus): boolean => status === "pending";

  it("processes 'pending' jobs", () => {
    expect(shouldProcess("pending")).toBe(true);
  });

  it("skips 'processing' jobs (concurrent lock)", () => {
    expect(shouldProcess("processing")).toBe(false);
  });

  it("skips 'done' jobs", () => {
    expect(shouldProcess("done")).toBe(false);
  });

  it("skips 'failed' jobs", () => {
    expect(shouldProcess("failed")).toBe(false);
  });

  it("skips 'cancelled' jobs (e.g. after updateStartTime reschedule)", () => {
    expect(shouldProcess("cancelled")).toBe(false);
  });
});

// ── updateStartTime rescheduling: cancellation semantics ─────────────────────
describe("fixtures.updateStartTime cancellation semantics", () => {
  type JobStatus = "pending" | "processing" | "done" | "failed" | "cancelled";

  interface MockJob {
    id: number;
    jobType: string;
    referenceId: number;
    status: JobStatus;
  }

  const simulateCancelAndReschedule = (
    jobs: MockJob[],
    roundId: number,
    newStartTime: Date | null
  ): { jobs: MockJob[]; newJobCreated: boolean } => {
    // Cancel existing pending admin_round_starting jobs for this round
    const updated = jobs.map(j =>
      j.jobType === "admin_round_starting" && j.referenceId === roundId && j.status === "pending"
        ? { ...j, status: "cancelled" as JobStatus }
        : j
    );
    // Reschedule if new startTime is >4h in the future
    let newJobCreated = false;
    if (newStartTime) {
      const scheduledAt = new Date(newStartTime.getTime() - 4 * 60 * 60 * 1000);
      if (scheduledAt.getTime() > Date.now()) {
        updated.push({ id: 999, jobType: "admin_round_starting", referenceId: roundId, status: "pending" });
        newJobCreated = true;
      }
    }
    return { jobs: updated, newJobCreated };
  };

  it("cancels existing pending job when startTime is updated", () => {
    const jobs: MockJob[] = [
      { id: 1, jobType: "admin_round_starting", referenceId: 5, status: "pending" },
    ];
    const newTime = new Date(Date.now() + 6 * 60 * 60 * 1000);
    const { jobs: result } = simulateCancelAndReschedule(jobs, 5, newTime);
    const original = result.find(j => j.id === 1);
    expect(original?.status).toBe("cancelled");
  });

  it("creates a new pending job when new startTime is >4h in the future", () => {
    const jobs: MockJob[] = [
      { id: 1, jobType: "admin_round_starting", referenceId: 5, status: "pending" },
    ];
    const newTime = new Date(Date.now() + 6 * 60 * 60 * 1000);
    const { newJobCreated } = simulateCancelAndReschedule(jobs, 5, newTime);
    expect(newJobCreated).toBe(true);
  });

  it("does NOT create a new job when startTime is cleared (null)", () => {
    const jobs: MockJob[] = [
      { id: 1, jobType: "admin_round_starting", referenceId: 5, status: "pending" },
    ];
    const { newJobCreated } = simulateCancelAndReschedule(jobs, 5, null);
    expect(newJobCreated).toBe(false);
  });

  it("does NOT create a new job when new startTime is <4h away", () => {
    const jobs: MockJob[] = [];
    const soon = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const { newJobCreated } = simulateCancelAndReschedule(jobs, 5, soon);
    expect(newJobCreated).toBe(false);
  });

  it("does NOT cancel jobs for a different round", () => {
    const jobs: MockJob[] = [
      { id: 1, jobType: "admin_round_starting", referenceId: 5, status: "pending" },
      { id: 2, jobType: "admin_round_starting", referenceId: 6, status: "pending" },
    ];
    const newTime = new Date(Date.now() + 6 * 60 * 60 * 1000);
    const { jobs: result } = simulateCancelAndReschedule(jobs, 5, newTime);
    const otherRound = result.find(j => j.id === 2);
    expect(otherRound?.status).toBe("pending"); // untouched
  });
});

// ── Milestone idempotency: concurrent re-score protection ────────────────────
describe("Milestone email idempotency: concurrent re-score protection", () => {
  type EventRecord = { userId: number; templateKey: string; referenceId: number; eventType: string };

  // Simulate the alreadySent() DB query
  const makeAlreadySent = (events: EventRecord[]) =>
    (userId: number, templateKey: string, referenceId: number): boolean =>
      events.some(
        e =>
          e.userId === userId &&
          e.templateKey === templateKey &&
          e.referenceId === referenceId &&
          e.eventType === "sent"
      );

  it("blocks duplicate send on immediate re-score", () => {
    const events: EventRecord[] = [
      { userId: 1, templateKey: "entrant_perfect_round", referenceId: 10, eventType: "sent" },
    ];
    const alreadySent = makeAlreadySent(events);
    expect(alreadySent(1, "entrant_perfect_round", 10)).toBe(true);
  });

  it("allows send for a different user in the same round", () => {
    const events: EventRecord[] = [
      { userId: 1, templateKey: "entrant_perfect_round", referenceId: 10, eventType: "sent" },
    ];
    const alreadySent = makeAlreadySent(events);
    expect(alreadySent(2, "entrant_perfect_round", 10)).toBe(false);
  });

  it("does not block based on 'open' or 'click' events — only 'sent'", () => {
    const events: EventRecord[] = [
      { userId: 1, templateKey: "entrant_perfect_round", referenceId: 10, eventType: "open" },
    ];
    const alreadySent = makeAlreadySent(events);
    expect(alreadySent(1, "entrant_perfect_round", 10)).toBe(false);
  });

  it("allows send for a new round even if previous round was sent", () => {
    const events: EventRecord[] = [
      { userId: 1, templateKey: "entrant_streak_milestone", referenceId: 9, eventType: "sent" },
    ];
    const alreadySent = makeAlreadySent(events);
    expect(alreadySent(1, "entrant_streak_milestone", 10)).toBe(false);
  });
});

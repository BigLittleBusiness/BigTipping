/**
 * Scheduled Jobs Processor
 *
 * A lightweight in-process job queue that polls the `scheduled_jobs` table
 * every 5 minutes and dispatches pending jobs whose `scheduledAt` time has
 * passed.  This avoids the need for an external worker process or cron daemon.
 *
 * Currently supported job types:
 *   - "admin_weekly_digest"  — sends the post-scoring digest email to the
 *                              tenant admin 24 hours after a round is scored.
 */

import { eq, and, lte, gte } from "drizzle-orm";
import { getDb } from "../db";
import {
  scheduledJobs,
  rounds,
  competitions,
  tenants,
  competitionEntrants,
  tips,
  fixtures,
  emailEvents,
} from "../../drizzle/schema";
import { EmailService } from "./emailService";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DigestStats {
  activeEntrants: number;
  tipsSubmitted: number;
  openRate: string;   // e.g. "68%"
  bounceRate: string; // e.g. "1.2%"
}

// ── Stats helper ──────────────────────────────────────────────────────────────

/**
 * Compute real engagement stats for a round's digest email.
 * All queries are single-pass aggregations to minimise DB round-trips.
 */
export async function getDigestStats(
  tenantId: number,
  roundId: number,
  competitionId: number,
): Promise<DigestStats> {
  const db = await getDb();
  if (!db) {
    return { activeEntrants: 0, tipsSubmitted: 0, openRate: "N/A", bounceRate: "N/A" };
  }

  // Active entrant count for this competition
  const entrantRows = await db
    .select({ userId: competitionEntrants.userId })
    .from(competitionEntrants)
    .where(
      and(
        eq(competitionEntrants.competitionId, competitionId),
        eq(competitionEntrants.isActive, true),
      ),
    );
  const activeEntrants = entrantRows.length;

  // Distinct users who submitted at least one tip for this round
  const roundFixtures = await db
    .select({ id: fixtures.id })
    .from(fixtures)
    .where(eq(fixtures.roundId, roundId));
  const fixtureIds = roundFixtures.map((f) => f.id);

  let tipsSubmitted = 0;
  if (fixtureIds.length > 0) {
    const allTips = await db
      .select({ userId: tips.userId, fixtureId: tips.fixtureId })
      .from(tips)
      .where(eq(tips.competitionId, competitionId));
    const usersWithTips = new Set(
      allTips.filter((t) => fixtureIds.includes(t.fixtureId)).map((t) => t.userId),
    );
    tipsSubmitted = usersWithTips.size;
  }

  // Email engagement stats from email_events (last 30 days for this tenant)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentEvents = await db
    .select({ eventType: emailEvents.eventType })
    .from(emailEvents)
    .where(
      and(
        eq(emailEvents.tenantId, tenantId),
        gte(emailEvents.timestamp, thirtyDaysAgo),
      ),
    );

  const sentCount = recentEvents.filter((e) => e.eventType === "sent").length;
  const openCount = recentEvents.filter((e) => e.eventType === "open").length;
  const bounceCount = recentEvents.filter((e) => e.eventType === "bounce").length;

  const openRate =
    sentCount > 0 ? `${Math.round((openCount / sentCount) * 100)}%` : "N/A";
  const bounceRate =
    sentCount > 0
      ? `${((bounceCount / sentCount) * 100).toFixed(1)}%`
      : "N/A";

  return { activeEntrants, tipsSubmitted, openRate, bounceRate };
}

// ── Job dispatcher ────────────────────────────────────────────────────────────

async function processDigestJob(job: typeof scheduledJobs.$inferSelect): Promise<void> {
  const db = await getDb();
  if (!db) return;

  let payload: { roundId: number; competitionId: number } | null = null;
  try {
    payload = job.payload ? JSON.parse(job.payload) : null;
  } catch {
    throw new Error("Invalid job payload JSON");
  }
  if (!payload?.roundId || !payload?.competitionId) {
    throw new Error("Missing roundId or competitionId in job payload");
  }

  const { roundId, competitionId } = payload;

  // Fetch round, competition, and tenant in parallel
  const [roundRows, compRows, tenantRows] = await Promise.all([
    db.select().from(rounds).where(eq(rounds.id, roundId)).limit(1),
    db.select().from(competitions).where(eq(competitions.id, competitionId)).limit(1),
    db.select().from(tenants).where(eq(tenants.id, job.tenantId)).limit(1),
  ]);

  const round = roundRows[0];
  const comp = compRows[0];
  const tenant = tenantRows[0];

  if (!round || !comp || !tenant) {
    throw new Error(`Missing data for digest job ${job.id}`);
  }

  const adminEmail = tenant.contactEmail;
  if (!adminEmail) {
    // No contact email configured — skip silently
    return;
  }

  const stats = await getDigestStats(job.tenantId, roundId, competitionId);

  await EmailService.sendEmail({
    to: adminEmail,
    templateKey: "admin_weekly_digest",
    tenantId: job.tenantId,
    transactional: true,
    placeholders: {
      user_name: tenant.name ?? "Admin",
      competition_name: comp.name,
      active_entrants: stats.activeEntrants,
      tips_submitted: stats.tipsSubmitted,
      open_rate: stats.openRate,
      bounce_rate: stats.bounceRate,
      leaderboard_url: `/admin/competitions/${competitionId}`,
    },
  });
}

// ── Main poll function ────────────────────────────────────────────────────────

/**
 * Process all pending scheduled jobs whose `scheduledAt` is in the past.
 * Uses optimistic locking (status → "processing") to prevent double-dispatch
 * if the interval fires while a previous run is still in progress.
 */
export async function processScheduledJobs(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const now = new Date();

  // Fetch pending jobs due now (status index keeps this fast)
  const pendingJobs = await db
    .select()
    .from(scheduledJobs)
    .where(
      and(
        eq(scheduledJobs.status, "pending"),
        lte(scheduledJobs.scheduledAt, now),
      ),
    )
    .limit(50); // process at most 50 per tick to bound execution time

  for (const job of pendingJobs) {
    // Optimistic lock: mark as "processing" before dispatching
    const updated = await db
      .update(scheduledJobs)
      .set({ status: "processing" })
      .where(
        and(
          eq(scheduledJobs.id, job.id),
          eq(scheduledJobs.status, "pending"), // guard against concurrent ticks
        ),
      );

    // If no rows were updated another tick already claimed this job
    if ((updated as unknown as { affectedRows: number }).affectedRows === 0) continue;

    try {
      if (job.jobType === "admin_weekly_digest") {
        await processDigestJob(job);
      }
      // Mark done
      await db
        .update(scheduledJobs)
        .set({ status: "done", completedAt: new Date() })
        .where(eq(scheduledJobs.id, job.id));
    } catch (err) {
      console.error(`[ScheduledJobs] Job ${job.id} (${job.jobType}) failed:`, err);
      await db
        .update(scheduledJobs)
        .set({ status: "failed" })
        .where(eq(scheduledJobs.id, job.id));
    }
  }
}

// ── Scheduler bootstrap ───────────────────────────────────────────────────────

let _intervalHandle: ReturnType<typeof setInterval> | null = null;

/**
 * Start the background polling loop.  Safe to call multiple times — only one
 * interval is ever registered.  Poll interval is 5 minutes (300 000 ms).
 */
export function startScheduledJobsProcessor(): void {
  if (_intervalHandle) return; // already running
  const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

  // Run once immediately on startup to catch any jobs that fired while the
  // server was down, then repeat on the interval.
  processScheduledJobs().catch((err) =>
    console.error("[ScheduledJobs] Initial poll error:", err),
  );

  _intervalHandle = setInterval(() => {
    processScheduledJobs().catch((err) =>
      console.error("[ScheduledJobs] Poll error:", err),
    );
  }, POLL_INTERVAL_MS);

  console.log("[ScheduledJobs] Processor started (poll interval: 5 min)");
}

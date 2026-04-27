import {
  boolean,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  index,
  uniqueIndex,
} from "drizzle-orm/mysql-core";

// ── Users ────────────────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id:          int("id").autoincrement().primaryKey(),
  openId:      varchar("openId", { length: 64 }).notNull().unique(),
  name:        text("name"),
  email:       varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role:        mysqlEnum("role", ["system_admin", "tenant_admin", "entrant"]).default("entrant").notNull(),
  tenantId:    int("tenantId"),
  createdAt:   timestamp("createdAt").defaultNow().notNull(),
  updatedAt:   timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  mobile:       varchar("mobile", { length: 20 }),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ── Tenants ──────────────────────────────────────────────────────────────────
export const tenants = mysqlTable("tenants", {
  id:          int("id").autoincrement().primaryKey(),
  name:        varchar("name", { length: 255 }).notNull(),
  slug:        varchar("slug", { length: 100 }).notNull().unique(),
  description: text("description"),
  logoUrl:     text("logoUrl"),
  status:      mysqlEnum("status", ["active", "suspended", "trial"]).default("trial").notNull(),
  contactEmail: varchar("contactEmail", { length: 320 }),
  createdAt:   timestamp("createdAt").defaultNow().notNull(),
  updatedAt:   timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = typeof tenants.$inferInsert;

// ── Sports ───────────────────────────────────────────────────────────────────
export const sports = mysqlTable("sports", {
  id:       int("id").autoincrement().primaryKey(),
  name:     mysqlEnum("name", ["AFL", "NRL", "Super Netball"]).notNull().unique(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Sport = typeof sports.$inferSelect;
export type InsertSport = typeof sports.$inferInsert;

// ── Teams ────────────────────────────────────────────────────────────────────
export const teams = mysqlTable("teams", {
  id:           int("id").autoincrement().primaryKey(),
  sportId:      int("sportId").notNull(),
  name:         varchar("name", { length: 255 }).notNull(),
  abbreviation: varchar("abbreviation", { length: 10 }),
  logoUrl:      text("logoUrl"),
  isActive:     boolean("isActive").default(true).notNull(),
  createdAt:    timestamp("createdAt").defaultNow().notNull(),
}, (t) => [index("teams_sportId_idx").on(t.sportId)]);

export type Team = typeof teams.$inferSelect;
export type InsertTeam = typeof teams.$inferInsert;

// ── Competitions ─────────────────────────────────────────────────────────────
export const competitions = mysqlTable("competitions", {
  id:          int("id").autoincrement().primaryKey(),
  tenantId:    int("tenantId").notNull(),
  sportId:     int("sportId").notNull(),
  name:        varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  season:      varchar("season", { length: 20 }),
  // Lifecycle: draft → active → round-by-round → completed
  status:      mysqlEnum("status", ["draft", "active", "round-by-round", "completed"]).default("draft").notNull(),
  scoringRules: json("scoringRules").$type<{
    pointsPerCorrectTip: number;
    bonusPerfectRound: number;
    streakBonusEnabled: boolean;
  }>(),
  startDate:   timestamp("startDate"),
  endDate:     timestamp("endDate"),
  isPublic:     boolean("isPublic").default(true).notNull(),
  allowDraw:          boolean("allowDraw").default(false).notNull(),
  jokerRoundEnabled:  boolean("jokerRoundEnabled").default(false).notNull(),
  jokerRoundId:       int("jokerRoundId"),   // which round is the joker round (null = any round)
  jokerMultiplier:    int("jokerMultiplier").default(2).notNull(), // points multiplier when joker used
  inviteToken:  varchar("inviteToken", { length: 64 }).unique(),
  inviteEnabled: boolean("inviteEnabled").default(true).notNull(),
  createdAt:    timestamp("createdAt").defaultNow().notNull(),
  updatedAt:    timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => [
  index("competitions_tenantId_idx").on(t.tenantId),
  index("competitions_sportId_idx").on(t.sportId),
  uniqueIndex("competitions_inviteToken_idx").on(t.inviteToken),
]);

export type Competition = typeof competitions.$inferSelect;
export type InsertCompetition = typeof competitions.$inferInsert;

// ── Rounds ───────────────────────────────────────────────────────────────────
export const rounds = mysqlTable("rounds", {
  id:              int("id").autoincrement().primaryKey(),
  competitionId:   int("competitionId").notNull(),
  roundNumber:     int("roundNumber").notNull(),
  name:            varchar("name", { length: 100 }),
  status:          mysqlEnum("status", ["upcoming", "open", "closed", "scored"]).default("upcoming").notNull(),
  tipsOpenAt:      timestamp("tipsOpenAt"),
  tipsCloseAt:     timestamp("tipsCloseAt"),
  scoringCompleted:     boolean("scoringCompleted").default(false).notNull(),
  scoredAt:             timestamp("scoredAt"),
  tieBreakerFixtureId:  int("tieBreakerFixtureId"),
  createdAt:       timestamp("createdAt").defaultNow().notNull(),
  updatedAt:       timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => [
  index("rounds_competitionId_idx").on(t.competitionId),
  uniqueIndex("rounds_comp_round_unique").on(t.competitionId, t.roundNumber),
]);

export type Round = typeof rounds.$inferSelect;
export type InsertRound = typeof rounds.$inferInsert;

// ── Fixtures ─────────────────────────────────────────────────────────────────
export const fixtures = mysqlTable("fixtures", {
  id:         int("id").autoincrement().primaryKey(),
  roundId:    int("roundId").notNull(),
  homeTeamId: int("homeTeamId").notNull(),
  awayTeamId: int("awayTeamId").notNull(),
  venue:      varchar("venue", { length: 255 }),
  startTime:  timestamp("startTime"),
  status:     mysqlEnum("status", ["scheduled", "in_progress", "completed", "cancelled"]).default("scheduled").notNull(),
  homeScore:  int("homeScore"),
  awayScore:  int("awayScore"),
  homeGoals:  int("homeGoals"),   // AFL only — informational
  homeBehinds: int("homeBehinds"), // AFL only — informational
  awayGoals:  int("awayGoals"),   // AFL only — informational
  awayBehinds: int("awayBehinds"), // AFL only — informational
  winnerId:   int("winnerId"),   // null = draw / not yet played
  margin:     int("margin"),
  createdAt:  timestamp("createdAt").defaultNow().notNull(),
  updatedAt:  timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => [index("fixtures_roundId_idx").on(t.roundId)]);

export type Fixture = typeof fixtures.$inferSelect;
export type InsertFixture = typeof fixtures.$inferInsert;

// ── Tips ─────────────────────────────────────────────────────────────────────
export const tips = mysqlTable("tips", {
  id:            int("id").autoincrement().primaryKey(),
  userId:        int("userId").notNull(),
  fixtureId:     int("fixtureId").notNull(),
  competitionId: int("competitionId").notNull(),
  pickedTeamId:    int("pickedTeamId"),    // null = draw tip
  isDraw:          boolean("isDraw").default(false).notNull(),
  isCorrect:       boolean("isCorrect"),   // null = not yet scored
  pointsEarned:    int("pointsEarned").default(0).notNull(),
  tieBreakerValue: int("tieBreakerValue"),  // entrant's tie-breaker prediction
  useJoker:        boolean("useJoker").default(false).notNull(), // entrant joker toggle for this round
  createdAt:     timestamp("createdAt").defaultNow().notNull(),
  updatedAt:     timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => [
  index("tips_userId_idx").on(t.userId),
  index("tips_fixtureId_idx").on(t.fixtureId),
  uniqueIndex("tips_user_fixture_unique").on(t.userId, t.fixtureId),
]);

export type Tip = typeof tips.$inferSelect;
export type InsertTip = typeof tips.$inferInsert;

// ── Leaderboard Entries ───────────────────────────────────────────────────────
export const leaderboardEntries = mysqlTable("leaderboard_entries", {
  id:            int("id").autoincrement().primaryKey(),
  competitionId: int("competitionId").notNull(),
  userId:        int("userId").notNull(),
  totalPoints:   int("totalPoints").default(0).notNull(),
  rank:          int("rank").default(0).notNull(),
  previousRank:  int("previousRank").default(0).notNull(),
  correctTips:   int("correctTips").default(0).notNull(),
  totalTips:     int("totalTips").default(0).notNull(),
  currentStreak: int("currentStreak").default(0).notNull(),
  bestStreak:    int("bestStreak").default(0).notNull(),
  updatedAt:     timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => [
  index("lb_competitionId_idx").on(t.competitionId),
  uniqueIndex("lb_comp_user_unique").on(t.competitionId, t.userId),
]);

export type LeaderboardEntry = typeof leaderboardEntries.$inferSelect;
export type InsertLeaderboardEntry = typeof leaderboardEntries.$inferInsert;

// ── Prizes ───────────────────────────────────────────────────────────────────
export const prizes = mysqlTable("prizes", {
  id:            int("id").autoincrement().primaryKey(),
  competitionId: int("competitionId").notNull(),
  tenantId:      int("tenantId").notNull(),
  name:          varchar("name", { length: 255 }).notNull(),
  description:   text("description"),
  type:          mysqlEnum("type", ["weekly", "season", "special"]).default("weekly").notNull(),
  roundId:       int("roundId"),   // null = season prize
  awardedToUserId: int("awardedToUserId"),
  isAwarded:     boolean("isAwarded").default(false).notNull(),
  createdAt:     timestamp("createdAt").defaultNow().notNull(),
  updatedAt:     timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => [index("prizes_competitionId_idx").on(t.competitionId)]);

export type Prize = typeof prizes.$inferSelect;
export type InsertPrize = typeof prizes.$inferInsert;

// ── Competition Entrants (join table) ─────────────────────────────────────────
export const competitionEntrants = mysqlTable("competition_entrants", {
  id:            int("id").autoincrement().primaryKey(),
  competitionId: int("competitionId").notNull(),
  userId:        int("userId").notNull(),
  joinedAt:      timestamp("joinedAt").defaultNow().notNull(),
  isActive:      boolean("isActive").default(true).notNull(),
}, (t) => [
  index("ce_competitionId_idx").on(t.competitionId),
  uniqueIndex("ce_comp_user_unique").on(t.competitionId, t.userId),
]);

export type CompetitionEntrant = typeof competitionEntrants.$inferSelect;
export type InsertCompetitionEntrant = typeof competitionEntrants.$inferInsert;

// ── Enquiries (contact / book-a-demo form) ───────────────────────────────────
export const enquiries = mysqlTable("enquiries", {
  id:                int("id").autoincrement().primaryKey(),
  name:              varchar("name", { length: 200 }).notNull(),
  email:             varchar("email", { length: 320 }).notNull(),
  business:          varchar("business", { length: 300 }).notNull(),
  businessType:      varchar("businessType", { length: 100 }).notNull(),
  estimatedEntrants: varchar("estimatedEntrants", { length: 50 }),
  message:           text("message"),
  createdAt:         timestamp("createdAt").defaultNow().notNull(),
});

export type Enquiry = typeof enquiries.$inferSelect;
export type InsertEnquiry = typeof enquiries.$inferInsert;

// ── Round Reminders (log of reminder sends) ───────────────────────────────────
export const roundReminders = mysqlTable("round_reminders", {
  id:            int("id").autoincrement().primaryKey(),
  roundId:       int("roundId").notNull(),
  competitionId: int("competitionId").notNull(),
  sentAt:        timestamp("sentAt").defaultNow().notNull(),
  recipientCount: int("recipientCount").notNull().default(0),
  sentByUserId:  int("sentByUserId").notNull(),
}, (t) => [
  index("rr_roundId_idx").on(t.roundId),
]);

export type RoundReminder = typeof roundReminders.$inferSelect;
export type InsertRoundReminder = typeof roundReminders.$inferInsert;

// ── Tenant Email Settings ─────────────────────────────────────────────────────
export const tenantEmailSettings = mysqlTable("tenant_email_settings", {
  id:              int("id").autoincrement().primaryKey(),
  tenantId:        int("tenantId").notNull().unique(),
  logoUrl:         text("logoUrl"),
  logoPosition:    mysqlEnum("logoPosition", ["top", "bottom"]).default("top").notNull(),
  primaryColor:    varchar("primaryColor", { length: 7 }).default("#2B4EAE").notNull(),
  footerText:      text("footerText"),
  businessAddress: text("businessAddress"),
  createdAt:       timestamp("createdAt").defaultNow().notNull(),
  updatedAt:       timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => [
  index("tes_tenantId_idx").on(t.tenantId),
]);
export type TenantEmailSettings = typeof tenantEmailSettings.$inferSelect;
export type InsertTenantEmailSettings = typeof tenantEmailSettings.$inferInsert;

// ── Email Templates ───────────────────────────────────────────────────────────
export const emailTemplates = mysqlTable("email_templates", {
  id:           int("id").autoincrement().primaryKey(),
  tenantId:     int("tenantId").notNull(),
  templateKey:  varchar("templateKey", { length: 100 }).notNull(),
  recipientRole: mysqlEnum("recipientRole", ["admin", "entrant"]).notNull(),
  name:         varchar("name", { length: 200 }).notNull(),
  triggerDesc:  text("triggerDesc"),
  isEnabled:    boolean("isEnabled").default(true).notNull(),
  subject:      varchar("subject", { length: 500 }).notNull(),
  bodyHtml:     text("bodyHtml").notNull(),
  bodyText:     text("bodyText"),
  updatedAt:    timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => [
  uniqueIndex("et_tenant_key_idx").on(t.tenantId, t.templateKey),
  index("et_tenantId_idx").on(t.tenantId),
]);
export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type InsertEmailTemplate = typeof emailTemplates.$inferInsert;

// ── Email Events (audit log) ──────────────────────────────────────────────────
export const emailEvents = mysqlTable("email_events", {
  id:             int("id").autoincrement().primaryKey(),
  messageId:      varchar("messageId", { length: 255 }).notNull(),
  recipientEmail: varchar("recipientEmail", { length: 320 }).notNull(),
  tenantId:       int("tenantId").notNull(),
  templateKey:    varchar("templateKey", { length: 100 }).notNull(),
  /** Optional: userId of the recipient (for idempotency checks on per-user milestone emails) */
  userId:         int("userId"),
  /** Optional: round/fixture/job reference ID (for idempotency checks — e.g. roundId for milestone emails) */
  referenceId:    int("referenceId"),
  eventType:      mysqlEnum("eventType", ["sent", "delivered", "bounce", "complaint", "open", "click"]).notNull(),
  bounceType:     varchar("bounceType", { length: 50 }),
  diagnosticCode: text("diagnosticCode"),
  timestamp:      timestamp("timestamp").defaultNow().notNull(),
}, (t) => [
  index("ee_tenantId_idx").on(t.tenantId),
  index("ee_recipient_idx").on(t.recipientEmail),
  index("ee_messageId_idx").on(t.messageId),
  index("ee_userId_template_ref_idx").on(t.userId, t.templateKey, t.referenceId),
]);
export type EmailEvent = typeof emailEvents.$inferSelect;
export type InsertEmailEvent = typeof emailEvents.$inferInsert;

// ── User Email Preferences ────────────────────────────────────────────────────
export const userEmailPreferences = mysqlTable("user_email_preferences", {
  id:                   int("id").autoincrement().primaryKey(),
  userId:               int("userId").notNull().unique(),
  invalidEmail:         boolean("invalidEmail").default(false).notNull(),
  marketingDisabled:    boolean("marketingDisabled").default(false).notNull(),
  lastEngagementAt:     timestamp("lastEngagementAt"),
  sunsetWarningSentAt:  timestamp("sunsetWarningSentAt"),
  softBounceCount:      int("softBounceCount").default(0).notNull(),
  updatedAt:            timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => [
  index("uep_userId_idx").on(t.userId),
]);
export type UserEmailPreference = typeof userEmailPreferences.$inferSelect;
export type InsertUserEmailPreference = typeof userEmailPreferences.$inferInsert;
// ── Scheduled Jobs (lightweight async job queue) ──────────────────────────────
export const scheduledJobs = mysqlTable("scheduled_jobs", {
  id:           int("id").autoincrement().primaryKey(),
  jobType:      varchar("jobType", { length: 100 }).notNull(),
  referenceId:  int("referenceId").notNull(),   // e.g. roundId
  tenantId:     int("tenantId").notNull(),
  scheduledAt:  timestamp("scheduledAt").notNull(),
  completedAt:  timestamp("completedAt"),
  status:       mysqlEnum("status", ["pending", "processing", "done", "failed", "cancelled"]).default("pending").notNull(),
  payload:      text("payload"),                // JSON blob for extra context
  createdAt:    timestamp("createdAt").defaultNow().notNull(),
}, (t) => [
  index("sj_status_scheduledAt_idx").on(t.status, t.scheduledAt),
  index("sj_tenantId_idx").on(t.tenantId),
]);
export type ScheduledJob = typeof scheduledJobs.$inferSelect;
export type InsertScheduledJob = typeof scheduledJobs.$inferInsert;
// ── Competition Branding ──────────────────────────────────────────────────────
export const competitionBranding = mysqlTable("competition_branding", {
  id:              int("id").autoincrement().primaryKey(),
  competitionId:   int("competitionId").notNull().unique(),
  fontColour:      varchar("fontColour", { length: 20 }).default("#1a1a1a").notNull(),
  fontType:        varchar("fontType", { length: 100 }).default("Inter").notNull(),
  bgColour:        varchar("bgColour", { length: 20 }).default("#ffffff").notNull(),
  bgImageUrl:      text("bgImageUrl"),
  bgImageMode:     mysqlEnum("bgImageMode", ["centred", "full_width", "tile"]).default("full_width"),
  landingPageText: text("landingPageText"),
  updatedAt:       timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type CompetitionBranding = typeof competitionBranding.$inferSelect;
export type InsertCompetitionBranding = typeof competitionBranding.$inferInsert;
// ── Prize Rules ───────────────────────────────────────────────────────────────
export const prizeRules = mysqlTable("prize_rules", {
  id:                  int("id").autoincrement().primaryKey(),
  competitionId:       int("competitionId").notNull().unique(),
  weeklyWinCondition:  mysqlEnum("weeklyWinCondition", ["all_correct", "highest_score", "highest_score_margin"]).default("highest_score").notNull(),
  seasonWinCondition:  mysqlEnum("seasonWinCondition", ["highest_score", "highest_score_margin", "highest_score_head_to_head"]).default("highest_score").notNull(),
  updatedAt:           timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type PrizeRule = typeof prizeRules.$inferSelect;
export type InsertPrizeRule = typeof prizeRules.$inferInsert;
// ── Prize Places ──────────────────────────────────────────────────────────────
export const prizePlaces = mysqlTable("prize_places", {
  id:           int("id").autoincrement().primaryKey(),
  prizeId:      int("prizeId").notNull(),
  place:        int("place").notNull(),           // 1 = 1st, 2 = 2nd, etc.
  name:         varchar("name", { length: 255 }).notNull(),
  value:        varchar("value", { length: 100 }),
  description:  text("description"),
  createdAt:    timestamp("createdAt").defaultNow().notNull(),
}, (t) => [
  index("pp_prizeId_idx").on(t.prizeId),
]);
export type PrizePlace = typeof prizePlaces.$inferSelect;
export type InsertPrizePlace = typeof prizePlaces.$inferInsert;
// ── Subscriptions ─────────────────────────────────────────────────────────────
export const subscriptions = mysqlTable("subscriptions", {
  id:                     int("id").autoincrement().primaryKey(),
  tenantId:               int("tenantId").notNull().unique(),
  level:                  varchar("level", { length: 50 }).default("Basic").notNull(),
  paymentTerm:            mysqlEnum("paymentTerm", ["monthly", "annually"]).default("monthly").notNull(),
  paymentMethod:          mysqlEnum("paymentMethod", ["credit_card", "invoice"]).default("invoice").notNull(),
  cardLast4:              varchar("cardLast4", { length: 4 }),
  cardBrand:              varchar("cardBrand", { length: 20 }),
  invoiceRecipientName:   varchar("invoiceRecipientName", { length: 255 }),
  invoiceRecipientEmail:  varchar("invoiceRecipientEmail", { length: 320 }),
  invoicePONumber:        varchar("invoicePONumber", { length: 100 }),
  orgName:                varchar("orgName", { length: 255 }),
  orgABN:                 varchar("orgABN", { length: 20 }),
  orgAddress:             text("orgAddress"),
  orgPhone:               varchar("orgPhone", { length: 20 }),
  createdAt:              timestamp("createdAt").defaultNow().notNull(),
  updatedAt:              timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;
// ── Billing History ───────────────────────────────────────────────────────────
export const billingHistory = mysqlTable("billing_history", {
  id:          int("id").autoincrement().primaryKey(),
  tenantId:    int("tenantId").notNull(),
  date:        timestamp("date").notNull(),
  amount:      int("amount").notNull(),           // cents
  currency:    varchar("currency", { length: 3 }).default("AUD").notNull(),
  status:      mysqlEnum("status", ["paid", "pending", "failed", "refunded"]).default("pending").notNull(),
  description: varchar("description", { length: 255 }),
  invoiceUrl:  text("invoiceUrl"),
  createdAt:   timestamp("createdAt").defaultNow().notNull(),
}, (t) => [
  index("bh_tenantId_idx").on(t.tenantId),
]);
export type BillingRecord = typeof billingHistory.$inferSelect;
export type InsertBillingRecord = typeof billingHistory.$inferInsert;
// ── Sport API Configurations ──────────────────────────────────────────────────
export const sportApiConfigs = mysqlTable("sport_api_configs", {
  id:               int("id").autoincrement().primaryKey(),
  sportId:          int("sportId").notNull(),
  providerName:     varchar("providerName", { length: 255 }).notNull(),
  baseUrl:          varchar("baseUrl", { length: 500 }).notNull(),
  apiKey:           varchar("apiKey", { length: 500 }),
  endpointFixtures: varchar("endpointFixtures", { length: 500 }),
  endpointResults:  varchar("endpointResults", { length: 500 }),
  additionalHeaders: json("additionalHeaders").$type<Record<string, string>>(),
  isActive:         boolean("isActive").default(true).notNull(),
  notes:            text("notes"),
  createdAt:        timestamp("createdAt").defaultNow().notNull(),
  updatedAt:        timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (t) => [
  index("sac_sportId_idx").on(t.sportId),
]);
export type SportApiConfig = typeof sportApiConfigs.$inferSelect;
export type InsertSportApiConfig = typeof sportApiConfigs.$inferInsert;

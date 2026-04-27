# Big Tipping Platform — TODO

## Phase 1: Brand & Layout
- [x] Apply brand design tokens (Royal Blue #2B4EAE, Burnt Orange #C8521A, Gold #F5A623) to index.css
- [x] Add Poppins + Inter + JetBrains Mono fonts via Google Fonts CDN
- [x] Build AdminLayout (sidebar) for system_admin and tenant_admin
- [x] Placeholder logo area in nav (no actual logo — ready for final asset)
- [x] Scaffold all route shells in App.tsx

## Phase 2: Database Schema
- [x] Extend users table with role enum (system_admin, tenant_admin, entrant) and tenantId
- [x] Create tenants table
- [x] Create sports table (AFL, NRL, Super Netball)
- [x] Create teams table (linked to sport)
- [x] Create competitions table with lifecycle states (draft → active → round-by-round → completed)
- [x] Create rounds table
- [x] Create fixtures table (home/away teams, result)
- [x] Create tips table (user → fixture pick)
- [x] Create leaderboard_entries table
- [x] Create prizes table
- [x] Create competition_entrants join table
- [x] Run migration via drizzle-kit migrate

## Phase 3: Auth & Role Routing
- [x] Extend role enum in schema to system_admin | tenant_admin | entrant
- [x] Build systemAdminProcedure (system_admin only)
- [x] Build tenantAdminProcedure (tenant_admin only)
- [x] Build protectedProcedure (any authenticated user)
- [x] Role-gated navigation in AdminLayout
- [x] Redirect logic based on role after login (Home.tsx)

## Phase 4: System Admin Dashboard
- [x] Platform Overview page (stats: tenants, competitions, users, sports)
- [x] Tenant management page (create, suspend, view)
- [x] Sports management page (activate/deactivate sports, team listing)

## Phase 5: Tenant Admin Dashboard
- [x] Tenant Dashboard (competition stats, quick actions)
- [x] Competition management (create, lifecycle transitions: draft → active → round-by-round → completed)
- [x] Competition detail (rounds, fixtures, leaderboard, prizes tabs)
- [x] Round management (open/close rounds, result entry)
- [x] Prize configuration (create weekly/season/special prizes)
- [x] Entrant management (view entrants)
- [x] Competition leaderboard view

## Phase 6: Entrant Experience
- [x] My Competitions hub page
- [x] Tip submission (upcoming round fixtures with team selection)
- [x] Tip history (correct/incorrect indicators)
- [x] Live leaderboard (Gold/Silver/Bronze rank badges, streak display)
- [x] Prizes panel

## Phase 7: Public Landing Page
- [x] Public competition landing page (tenant-branded, competition details)
- [x] Entrant registration/login flow
- [x] Marketing home page with brand identity and B2B positioning

## Phase 8: Backend Logic
- [x] 10 tRPC routers: tenants, sports, competitions, rounds, fixtures, tips, leaderboard, prizes, stats, seed
- [x] Leaderboard engine: 1pt per correct tip, streak tracking, rank calculation
- [x] Scoring procedure: process results and update leaderboard entries
- [x] Seed demo data: AFL/NRL/Super Netball sports, all teams, demo tenant, competition, 3 rounds, fixtures, prizes

## Phase 9: Tests & Delivery
- [x] Vitest tests: 19 tests passing across 2 test files
- [x] Role-gated procedure tests (system_admin, tenant_admin, entrant, unauthenticated)
- [x] Leaderboard scoring logic tests
- [x] Competition lifecycle state tests
- [x] Sport name validation tests
- [x] Tenant isolation tests
- [x] TypeScript: 0 errors
- [x] Final checkpoint saved

## Phase 10: Marketing Website Redesign (Multi-Page, Benefit-Driven)
- [x] Redesign Home page: benefit-driven hero, segment cards, how-it-works, social proof, CTA
- [x] Build Why Tipping? page: business case for tipping competitions
- [x] Build How It Works page: 5-step setup visual walkthrough
- [x] Build Use Cases page: 6 business segments (Pubs, Corporate, Clubs, Media, Retail, Fitness)
- [x] Build Features page: platform capabilities from business owner perspective
- [x] Build Pricing page: 3-tier pricing (Starter/Growth/Pro) with FAQ and free trial CTA
- [x] Build Contact / Book a Demo page: lead capture form with business type and audience size
- [x] Update App.tsx routing for all new marketing pages
- [x] Shared MarketingLayout component with nav (mobile-responsive) and footer

## Phase 11: Mobile Navigation
- [x] Add responsive hamburger menu to MarketingLayout nav (slide-out drawer, all nav links, CTA button, close on route change)

## Phase 12: Copy Invite Link Feature
- [x] Add inviteToken + inviteEnabled columns to competitions table in Drizzle schema
- [x] Generate and apply migration for inviteToken + inviteEnabled
- [x] Build invites tRPC router (generateLink, toggleLink, getByToken, joinViaInvite)
- [x] Build public /join/:token page (competition details, login/join CTA, auto-join on auth)
- [x] Add InviteLinkPanel (compact mode) to Competitions list page
- [x] Add InviteLinkPanel (full mode) + Invite tab to CompetitionDetail page (copy, toggle, regenerate)
- [x] Wire join flow: after login, auto-enrol entrant into competition via sessionStorage token
- [x] Write Vitest tests for invite logic (14 tests — 33 total passing)

## Phase 12b: Invite Link — Gap Resolution
- [x] Implement post-login invite continuation: PendingInviteHandler in App.tsx reads pendingInviteToken after OAuth returns and auto-joins
- [x] Add Vitest coverage for invite state logic (disabled links, completed competitions, token validation, URL construction — 14 tests)

## Phase 13: Leaderboard Name Display
- [x] Join users table in leaderboard query to return participant names instead of user IDs
- [x] Update leaderboard router already returns user.name via userMap join
- [x] Update CompetitionDetail leaderboard tab — already used entry.user?.name correctly
- [x] Update entrant CompetitionHub leaderboard — already used entry.user?.name correctly
- [x] Update listEntrants query to JOIN users table and return userName + userEmail; Entrants tab redesigned with avatar initials, name, email, join date, status

## Phase 14: Three Feature Additions
- [x] Item 1: Add Download CSV button to admin Entrants tab (client-side CSV generation, name/email/join date/status)
- [x] Item 2: Build sendRoundReminder tRPC mutation (tipsCloseAt already in schema); Send Reminder button on open rounds; Set Deadline dialog; setDeadline mutation
- [x] Item 3: Deadline banner on entrant tip submission screen — blue info banner normally, orange urgent banner when <24h remaining

## Phase 15: Result Entry & Tip Lock-out
- [x] Fixture result entry screen: enterResults mutation (mark winner per fixture, trigger scoring)
- [x] Fixture result entry screen: RoundResults admin UI page with per-fixture winner selector
- [x] Fixture result entry screen: link from CompetitionDetail rounds tab to result entry
- [x] Tip lock-out: server-side deadline check in submitTip procedure (checks round.status + tipsCloseAt)
- [x] Tip lock-out: visual locked state on entrant tip cards (Lock icon, opacity-75, locked banner, toast on click)
- [x] Tests for result entry and lock-out logic (16 new tests in phase15.test.ts — 68 total passing)

## Phase 16: Email Subsystem

### Schema & Seed
- [x] Add tenant_email_settings table to Drizzle schema
- [x] Add email_templates table to Drizzle schema
- [x] Add email_events table to Drizzle schema
- [x] Add user_email_preferences table to Drizzle schema
- [x] Generate and apply migration for all 4 new tables
- [x] Seed 13 default email templates (5 admin + 8 entrant) per tenant

### EmailService
- [x] Build server/services/emailService.ts: SES sending, placeholder replacement, logo injection, inline CSS
- [x] Implement bounce/complaint handling: mark invalidEmail / marketingDisabled on user_email_preferences
- [x] Log all sends to email_events table
- [x] Gate all sends on invalidEmail and marketingDisabled flags

### tRPC Routers
- [x] Build email.templates router: list, update (subject/body/isEnabled)
- [x] Build email.branding router: get/update TenantEmailSettings, logo upload
- [x] Build email.testSend router: send test email to admin's own address
- [x] Build email.bounceDashboard router: invalid count, complaint count, open rate (30d)

### Admin Email Settings Page
- [x] Build /tenant/email-settings page with 3 tabs: Templates, Branding, Bounce Dashboard
- [x] Templates tab: table with toggle ON/OFF and Customise button per template
- [x] Template customise modal: subject input, HTML body textarea, placeholder helper
- [x] Branding tab: logo file upload (drag-and-drop), logo position radio, colour picker, footer/address textarea
- [x] Bounce Dashboard tab: stats cards (invalid emails, complaints, open rate)
- [x] Preview modal: render email HTML with sample data
- [x] Send Test Email button per template

### Triggers & Webhook
- [x] Wire entrant_join_confirmation trigger in invites.joinViaInvite
- [x] Wire entrant_round_results + admin_round_scored + admin_round_winner triggers in leaderboard.scoreRound
- [x] Wire entrant_tips_closing_24h and entrant_tips_closing_4h triggers in rounds.sendRoundReminder
- [x] Build POST /api/ses-webhook endpoint for SES bounce/complaint SNS notifications
- [x] Add Email Settings nav link to Tenant Admin sidebar

### Tests
- [x] Unit tests: placeholder replacement, bounce handling, email gating (invalidEmail / marketingDisabled) — 27 tests in email.test.ts
- [x] Unit tests: template enable/disable logic (EMAIL_TEMPLATE_DEFAULTS and TEMPLATE_PLACEHOLDERS coverage)

## Phase 17: Post-Scoring Digest & 2h Reminder

### 24h Post-Scoring Admin Digest
- [x] Add scheduled_jobs table to Drizzle schema (jobType, referenceId, scheduledAt, completedAt, status)
- [x] Generate and apply migration for scheduled_jobs table
- [x] Add scoredAt timestamp column to rounds table; populate on scoreRound
- [x] Build getDigestStats(tenantId, roundId, competitionId) in scheduledJobsProcessor.ts (tips submitted, active entrants, open rate, bounce rate)
- [x] Build processScheduledJobs() function: query pending jobs due now, dispatch emails, mark completed
- [x] Register setInterval in server to poll processScheduledJobs every 5 minutes
- [x] Wire scoreRound to insert a scheduled_job for admin_weekly_digest 24h after scoring
- [x] admin_weekly_digest template updated with real stats placeholders and 24h trigger description

### 2h Round Reminder (Unsent Tips Only)
- [x] Add entrant_tips_closing_2h template to emailTemplateDefaults.ts
- [x] Add send2hReminder mutation to rounds router
- [x] Filter to only entrants with zero tips for the round (Set-based diff, minimal DB round-trips)
- [x] New template seeded automatically for new tenants via seedEmailTemplatesForTenant

### Tests
- [x] Unit test: getDigestStats returns safe defaults when DB unavailable (2 tests)
- [x] Unit test: processScheduledJobs resolves without throwing when DB unavailable
- [x] Unit test: 2h reminder filtering logic (5 pure unit tests)
- [x] Unit test: entrant_tips_closing_2h template fields (9 tests)
- [x] Unit test: admin_weekly_digest 24h trigger description (6 tests)
- [x] Unit test: updated template counts 14 total, 9 entrant (3 tests)
- [x] Unit test: ScheduledJob schema type export (1 test)
- [x] 123 tests total passing across 7 test files, TypeScript 0 errors

## Phase 18: Digest Email Preview in Email Settings

- [x] Add `email.getDigestPreview` tRPC procedure: fetch most recent scored round for tenant, call getDigestStats, replace placeholders in admin_weekly_digest template, return rendered HTML + stats summary
- [x] Add "Preview Digest" button to admin_weekly_digest row in Templates tab of Email Settings page
- [x] Build DigestPreviewModal: iframe/srcdoc rendered email HTML, stats summary cards (active entrants, tips submitted, open rate, bounce rate), round/competition label, close button
- [x] Show loading skeleton while preview is fetching
- [x] Show graceful empty state when no scored round exists yet
- [x] Vitest tests for getDigestPreview procedure (no-DB safe defaults, correct shape) — 6 new tests in digest-reminder.test.ts
- [x] TypeScript clean, 129 tests passing across 7 test files

## Phase 19: Send Test Button in Digest Preview Modal

- [x] Add Send Test button to DigestPreviewModal footer (only visible when hasData=true)
- [x] Wire to trpc.email.sendTest with templateKey "admin_weekly_digest"
- [x] Show loading spinner while sending, success toast on sent, info toast on stub mode, error toast on failure
- [x] TypeScript clean, 129 tests passing

## Phase 20: Automate All 6 Non-Automated Email Templates

### Scheduled Job Processor Extensions
- [x] Add job types: tips_closing_24h, tips_closing_4h, tips_closing_2h, admin_round_starting to scheduledJobsProcessor
- [x] Schedule admin_round_starting job (4h before fixture startTime) when a fixture is created with a startTime
- [x] Schedule tips_closing_24h, tips_closing_4h, tips_closing_2h jobs when tipsCloseAt is set on a round (create or setDeadline)
- [x] tips_closing_2h: filters to only untipped entrants at send time (existing send2hReminder logic reused)
- [x] admin_round_starting: sends admin_round_starting to tenant contactEmail

### Scoring Flow Extensions (leaderboard.scoreRound)
- [x] Wire entrant_perfect_round: send to entrants who tipped all fixtures correctly in the round
- [x] Wire entrant_streak_milestone: send to entrants whose cumulative correct-tip streak hits 5, 10, 15, 20
- [x] Wire entrant_leaderboard_milestone: send to entrants who move into Top 10, Top 20, or Top 50 for the first time this round

### Draw Detection
- [x] Wire admin_draw_match: send to tenant admin when a fixture result is entered as a draw (homeScore == awayScore, winnerId null)

### Tests
- [x] TypeScript clean (0 errors), 129 tests passing across 7 test files

### Phase 20 Gap Resolution
- [x] Idempotency: check email_events before sending milestone emails (entrant_perfect_round, entrant_streak_milestone, entrant_leaderboard_milestone) — alreadySent() guard using userId+templateKey+referenceId index
- [x] Added userId and referenceId columns to email_events table (migration 0007 applied)
- [x] Fixture startTime update path: added updateStartTime mutation to fixtures router that cancels pending job and reschedules
- [x] scheduledJobsProcessor: processTipsClosingReminderJob already filters untipped entrants for all 3 reminder types (24h, 4h, 2h)
- [x] Unit tests: 18 new tests in automation.test.ts — job types, idempotency guard, draw detection, rescheduling logic, SendEmailPar### Backend — System Admin Procedures
- [x] Add `fixtures.listAllRounds` systemAdminProcedure: all rounds across all tenants, enriched with competition name, tenant name, fixture count
- [x] Add `fixtures.getFixturesForRound` systemAdminProcedure: fixtures + team names + round.tipsCloseAt
- [x] Add `fixtures.systemUpdateStartTime`: updates fixture, recalculates round.tipsCloseAt = earliest fixture startTime, cancels all pending time-based jobs, reschedules admin_round_starting + tips_closing_24h/4h/2h, returns rescheduled job list
- [x] rescheduleRoundJobs() helper: cancels 4 job types atomically, then inserts new jobs

### Frontend — System Admin Fixture Manager
- [x] Add `/admin/fixtures` page to System Admin section
- [x] Round selector: searchable text filter + Select dropdown listing all rounds (tenant — competition · round name · status · fixture count)
- [x] Fixture list: table showing homeTeam vs awayTeam, venue, editable datetime-local input per row
- [x] Save button per row: calls `fixtures.systemUpdateStartTime`, shows loading spinner, success/error toast (sonner)
- [x] After save: RescheduledJobsPanel confirmation panel showing all rescheduled jobs with human-readable labels and new scheduled times
- [x] Round tipsCloseAt display: shows current closing time, updates live after any fixture save
- [x] Add "Fixture Manager" nav item to System Admin sidebar (CalendarClock icon)
- [x] Route /admin/fixtures wired in App.tsx

### Tests
- [x] TypeScript clean (0 errors), 167 tests passing across 8 test files
## Phase 22: Competition Admin — Full Feature Build

### Schema
- [x] Add `mobile` field to users table
- [x] Add `tieBreakerFixtureId` to rounds table
- [x] Add `competitionBranding` table (fontColour, fontType, bgColour, bgImageUrl, bgImageMode, landingPageText)
- [x] Expand `scoringRules` JSON on competitions: incorrectTipPoints, bonusMarginCorrect, defaultScoreForUntipped, defaultMarginValue, jokerRoundEnabled, jokerRoundId, jokerMultiplier
- [x] Add `prizeRules` table (competitionId, weeklyWinCondition, seasonWinCondition)
- [x] Add `prizePlaces` table (prizeId, place, name, value, description)
- [x] Add `subscriptions` table (tenantId, level, paymentTerm, paymentMethod, cardLast4, invoiceRecipientName, invoiceRecipientEmail, invoicePONumber)
- [x] Add `billingHistory` table (tenantId, date, amount, status, invoiceUrl)
- [x] Generate and apply migration

### Backend tRPC Procedures
- [x] `competitions.dashboardStats` — entrant count, tips submitted for current round, top-5 leaderboard, recent activity, alerts
- [x] `competitions.updateEntrant` — update name, email, mobile
- [x] `competitions.removeEntrant` — single delete
- [x] `competitions.bulkRemoveEntrants` — bulk delete by userId array
- [x] `competitions.bulkImportEntrants` — accept CSV rows, queue invite jobs, return summary
- [x] `competitions.resendInvite` — resend invite email for an entrant
- [x] `competitions.getEntrantTips` — all rounds + selections for a given entrant (read-only)
- [x] `competitions.updateBranding` — upsert competitionBranding row
- [x] `competitions.getBranding` — get branding for a competition
- [x] `competitions.updateScoringRules` — update full scoring rules JSON on competition
- [x] `rounds.setTieBreaker` — set tieBreakerFixtureId on a round
- [x] `rounds.lock` / `rounds.unlock` — manual override of round status
- [x] `rounds.getFixtures` — list fixtures for a round (read-only for tenant admin)
- [x] `prizes.updateRules` — upsert prizeRules row
- [x] `prizes.getRules` — get prizeRules for a competition
- [x] `prizes.addPlace` — add a prizePlaces row
- [x] `prizes.updatePlace` — update a prizePlaces row
- [x] `prizes.removePlace` — delete a prizePlaces row
- [x] `prizes.calculateAndAward` — calculate winners based on rules, log awards
- [x] `account.get` — get tenant + subscription info
- [x] `account.update` — update org name, ABN, address, contact details
- [x] `account.updateSubscription` — update payment method, invoice details
- [x] `account.getBillingHistory` — list billing history rows

### Frontend Pages
- [x] `/tenant/dashboard` — enhance: competition selector, entrant count, tips submitted, top-5 leaderboard, activity feed, alerts
- [x] `/tenant/entrants` — dedicated page: paginated list, search, add single, bulk CSV import, edit, delete, resend invite, view tips modal
- [x] `/tenant/setup` — Competition Setup: branding (font colour, font type, bg colour, bg image, landing page text)
- [x] `/tenant/scoring` — Scoring Rules: all fields + joker round toggle + default score/margin
- [x] `/tenant/rounds` — Round Management: list, edit deadline, set tie-breaker, lock/unlock, view fixtures
- [x] `/tenant/prizes` — Prizes: prize rules (weekly/season win conditions), place definitions, manual award
- [x] `/tenant/account` — Account & Subscription: org details, subscription info, payment method, billing history
- [x] Add all new routes to App.tsx and nav items to AdminLayout

## Phase 23: Competition Selector on Entrants & Rounds Pages

- [x] Add competition selector to EntrantsManagement page — filter entrants, search, and all actions by selected competition
- [x] Add competition selector to RoundManagement page — filter rounds, fixtures, tie-breaker, lock/unlock by selected competition

## Phase 24: Inline Round Status Transitions

- [x] Add "Open" button for upcoming rounds (upcoming → open)
- [x] Retain Lock button for open rounds (open → locked/closed)
- [x] Add Unlock button for locked rounds (locked → open)
- [x] Add "Mark Scored" button for locked rounds (locked → scored)
- [x] Add "Complete" button for scored rounds (scored → completed)
- [x] Show status flow indicator on each round card so admins understand the progression

## Phase 25: Fixture Count on Round Cards

- [x] Add fixture count to each round card on the Round Management page

## Phase 26: Tips Entry Screen — Fixture Display & Any-Round Tipping

- [x] Allow entrants to tip any round that has fixtures loaded (not just the current open round)
- [x] Show round selector for all rounds (with status indicators: open, upcoming, locked, scored)
- [x] Each fixture card must display: Home Team v Away Team — Venue — Start Time
- [x] Venue and start time should be clearly visible below the team buttons
- [x] Rounds with no fixtures should show an appropriate empty state

## Phase 27: Tips Entry Default Round — Next After Last Scored

- [x] Default to the round immediately after the last scored round (e.g. Round 5 scored → show Round 6)
- [x] Fallback order: next-after-scored → open round → first round with fixtures → round 1

## Phase 28: Previous Round Results Summary Card on Tips Entry

- [x] Add `tips.myRoundSummary` procedure — correct count, total tips, points earned for a given round
- [x] Show previous round results card above fixture list on Tips Entry screen

## Phase 29: Tips Entry — Draw Option, Enriched History, Round Breakdown

- [x] Add `allowDraw` boolean to competitions table; make `pickedTeamId` nullable and add `isDraw` boolean to tips table
- [x] Apply migration for schema changes
- [x] Update `tips.submit` to accept `isDraw` flag; update `leaderboard.scoreRound` to score draw tips correctly
- [x] Add Draw button to fixture cards (shown only when comp.allowDraw = true)
- [x] Enhance History tab: show opponent name, round label, venue alongside picked team and result
- [x] Add `tips.myRoundBreakdown` procedure — points per round for the current entrant
- [x] Add collapsible round-by-round breakdown to the My Position stats card on Tips tab
## Phase 30: Draw Checkbox, Fixture Tips Breakdown, Season Accuracy Chart

- [x] Add allowDraw checkbox to Competition Setup page (default off, saves via competitions.updateSettings mutation)
- [x] Enhance round-by-round breakdown: show tipped team per fixture inline with tooltip for full match detail
- [x] Add season accuracy bar chart to My Position stats card (colour-coded by accuracy %, collapsible)

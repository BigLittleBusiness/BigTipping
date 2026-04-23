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

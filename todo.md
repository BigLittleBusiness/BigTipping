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

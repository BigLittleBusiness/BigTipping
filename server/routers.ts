import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { tenantsRouter } from "./routers/tenants.ts";
import { sportsRouter } from "./routers/sports.ts";
import { competitionsRouter } from "./routers/competitions.ts";
import { roundsRouter } from "./routers/rounds.ts";
import { fixturesRouter } from "./routers/fixtures.ts";
import { tipsRouter } from "./routers/tips.ts";
import { leaderboardRouter } from "./routers/leaderboard.ts";
import { prizesRouter } from "./routers/prizes.ts";
import { statsRouter } from "./routers/stats.ts";
import { seedRouter } from "./routers/seed.ts";
import { contactRouter } from "./routers/contact.ts";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  tenants:      tenantsRouter,
  sports:       sportsRouter,
  competitions: competitionsRouter,
  rounds:       roundsRouter,
  fixtures:     fixturesRouter,
  tips:         tipsRouter,
  leaderboard:  leaderboardRouter,
  prizes:       prizesRouter,
  stats:        statsRouter,
  seed:         seedRouter,
  contact:      contactRouter,
});

export type AppRouter = typeof appRouter;

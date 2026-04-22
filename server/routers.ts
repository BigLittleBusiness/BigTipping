import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { tenantsRouter } from "./routers/tenants";
import { sportsRouter } from "./routers/sports";
import { competitionsRouter } from "./routers/competitions";
import { roundsRouter } from "./routers/rounds";
import { fixturesRouter } from "./routers/fixtures";
import { tipsRouter } from "./routers/tips";
import { leaderboardRouter } from "./routers/leaderboard";
import { prizesRouter } from "./routers/prizes";
import { statsRouter } from "./routers/stats";
import { seedRouter } from "./routers/seed";

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
});

export type AppRouter = typeof appRouter;

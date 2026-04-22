import { router, systemAdminProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { tenants, competitions, users, tips } from "../../drizzle/schema";

export const statsRouter = router({
  platform: systemAdminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { tenants: 0, competitions: 0, users: 0, tips: 0 };
    const [allTenants, allComps, allUsers, allTips] = await Promise.all([
      db.select().from(tenants),
      db.select().from(competitions),
      db.select().from(users),
      db.select().from(tips),
    ]);
    return {
      tenants: allTenants.length,
      activeTenants: allTenants.filter(t => t.status === "active").length,
      competitions: allComps.length,
      activeCompetitions: allComps.filter(c => c.status === "active" || c.status === "round-by-round").length,
      users: allUsers.length,
      tips: allTips.length,
    };
  }),
});

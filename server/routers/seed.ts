import { router, systemAdminProcedure } from "../_core/trpc";
import { getDb } from "../db";
import {
  tenants, sports, teams, competitions, rounds, fixtures,
  users, competitionEntrants, leaderboardEntries, prizes
} from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export const seedRouter = router({
  run: systemAdminProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");

    // 1. Seed sports
    const sportNames = ["AFL", "NRL", "Super Netball"] as const;
    for (const name of sportNames) {
      await db.insert(sports).values({ name, isActive: true })
        .onDuplicateKeyUpdate({ set: { isActive: true } });
    }
    const allSports = await db.select().from(sports);
    const aflSport = allSports.find(s => s.name === "AFL")!;

    // 2. Seed AFL teams
    const aflTeams = [
      { name: "Adelaide Crows", abbreviation: "ADE" },
      { name: "Brisbane Lions", abbreviation: "BRI" },
      { name: "Carlton", abbreviation: "CAR" },
      { name: "Collingwood", abbreviation: "COL" },
      { name: "Essendon", abbreviation: "ESS" },
      { name: "Fremantle", abbreviation: "FRE" },
      { name: "Geelong Cats", abbreviation: "GEE" },
      { name: "GWS Giants", abbreviation: "GWS" },
      { name: "Hawthorn", abbreviation: "HAW" },
      { name: "Melbourne", abbreviation: "MEL" },
      { name: "North Melbourne", abbreviation: "NTH" },
      { name: "Port Adelaide", abbreviation: "PTA" },
      { name: "Richmond", abbreviation: "RIC" },
      { name: "St Kilda", abbreviation: "STK" },
      { name: "Sydney Swans", abbreviation: "SYD" },
      { name: "West Coast Eagles", abbreviation: "WCE" },
      { name: "Western Bulldogs", abbreviation: "WBD" },
      { name: "Gold Coast Suns", abbreviation: "GCS" },
    ];
    for (const team of aflTeams) {
      await db.insert(teams).values({ sportId: aflSport.id, name: team.name, abbreviation: team.abbreviation, isActive: true })
        .onDuplicateKeyUpdate({ set: { isActive: true } });
    }
    const allTeams = await db.select().from(teams).where(eq(teams.sportId, aflSport.id));
    const teamMap = Object.fromEntries(allTeams.map(t => [t.abbreviation ?? t.name, t.id]));

    // 3. Seed NRL teams
    const nrlSport = allSports.find(s => s.name === "NRL")!;
    const nrlTeams = [
      { name: "Brisbane Broncos", abbreviation: "BRI" },
      { name: "Canberra Raiders", abbreviation: "CAN" },
      { name: "Canterbury Bulldogs", abbreviation: "CBY" },
      { name: "Cronulla Sharks", abbreviation: "CRO" },
      { name: "Gold Coast Titans", abbreviation: "GCT" },
      { name: "Manly Sea Eagles", abbreviation: "MAN" },
      { name: "Melbourne Storm", abbreviation: "MEL" },
      { name: "Newcastle Knights", abbreviation: "NEW" },
      { name: "North Queensland Cowboys", abbreviation: "NQC" },
      { name: "Parramatta Eels", abbreviation: "PAR" },
      { name: "Penrith Panthers", abbreviation: "PEN" },
      { name: "South Sydney Rabbitohs", abbreviation: "SSR" },
      { name: "St George Illawarra Dragons", abbreviation: "SGI" },
      { name: "Sydney Roosters", abbreviation: "SYD" },
      { name: "Wests Tigers", abbreviation: "WST" },
      { name: "New Zealand Warriors", abbreviation: "NZW" },
    ];
    for (const team of nrlTeams) {
      await db.insert(teams).values({ sportId: nrlSport.id, name: team.name, abbreviation: team.abbreviation, isActive: true })
        .onDuplicateKeyUpdate({ set: { isActive: true } });
    }

    // 4. Seed Super Netball teams
    const snSport = allSports.find(s => s.name === "Super Netball")!;
    const snTeams = [
      { name: "Adelaide Thunderbirds", abbreviation: "ADT" },
      { name: "Collingwood Magpies", abbreviation: "COL" },
      { name: "Giants Netball", abbreviation: "GNT" },
      { name: "Melbourne Vixens", abbreviation: "MEV" },
      { name: "Queensland Firebirds", abbreviation: "QFB" },
      { name: "Sunshine Coast Lightning", abbreviation: "SCL" },
      { name: "NSW Swifts", abbreviation: "NSW" },
      { name: "West Coast Fever", abbreviation: "WCF" },
    ];
    for (const team of snTeams) {
      await db.insert(teams).values({ sportId: snSport.id, name: team.name, abbreviation: team.abbreviation, isActive: true })
        .onDuplicateKeyUpdate({ set: { isActive: true } });
    }

    // 5. Seed demo tenant
    await db.insert(tenants).values({
      name: "The Crown Hotel",
      slug: "crown-hotel",
      description: "Demo pub tenant for Big Tipping",
      contactEmail: "admin@crownhotel.com.au",
      status: "active",
    }).onDuplicateKeyUpdate({ set: { status: "active" } });
    const tenantRows = await db.select().from(tenants).where(eq(tenants.slug, "crown-hotel")).limit(1);
    const tenant = tenantRows[0]!;

    // 6. Assign current user as tenant_admin for demo tenant
    await db.update(users).set({ role: "tenant_admin", tenantId: tenant.id }).where(eq(users.id, ctx.user.id));

    // 7. Seed competition
    await db.insert(competitions).values({
      tenantId: tenant.id,
      sportId: aflSport.id,
      name: "AFL 2025 Tipping Comp",
      description: "Crown Hotel AFL Tipping Competition 2025",
      season: "2025",
      status: "round-by-round",
      scoringRules: { pointsPerCorrectTip: 1, bonusPerfectRound: 3, streakBonusEnabled: true },
      isPublic: true,
    }).onDuplicateKeyUpdate({ set: { status: "round-by-round" } });
    const compRows = await db.select().from(competitions).where(eq(competitions.tenantId, tenant.id)).limit(1);
    const comp = compRows[0]!;

    // 8. Seed rounds 1-3
    for (let r = 1; r <= 3; r++) {
      await db.insert(rounds).values({
        competitionId: comp.id,
        roundNumber: r,
        name: `Round ${r}`,
        status: r < 3 ? "scored" : "open",
        scoringCompleted: r < 3,
      }).onDuplicateKeyUpdate({ set: { status: r < 3 ? "scored" : "open" } });
    }
    const allRounds = await db.select().from(rounds).where(eq(rounds.competitionId, comp.id));
    const r1 = allRounds.find(r => r.roundNumber === 1)!;
    const r2 = allRounds.find(r => r.roundNumber === 2)!;
    const r3 = allRounds.find(r => r.roundNumber === 3)!;

    // 9. Seed fixtures for round 1
    const r1Fixtures = [
      { home: "COL", away: "RIC" },
      { home: "GEE", away: "HAW" },
      { home: "SYD", away: "MEL" },
      { home: "CAR", away: "ESS" },
    ];
    for (const f of r1Fixtures) {
      const homeId = teamMap[f.home];
      const awayId = teamMap[f.away];
      if (!homeId || !awayId) continue;
      await db.insert(fixtures).values({
        roundId: r1.id,
        homeTeamId: homeId,
        awayTeamId: awayId,
        status: "completed",
        homeScore: Math.floor(Math.random() * 80) + 60,
        awayScore: Math.floor(Math.random() * 80) + 60,
        winnerId: homeId, // home wins for demo
        margin: Math.floor(Math.random() * 40) + 1,
      }).onDuplicateKeyUpdate({ set: { status: "completed" } });
    }

    // 10. Seed fixtures for round 2
    const r2Fixtures = [
      { home: "BRI", away: "ADE" },
      { home: "PTA", away: "WBD" },
      { home: "NTH", away: "GCS" },
      { home: "FRE", away: "WCE" },
    ];
    for (const f of r2Fixtures) {
      const homeId = teamMap[f.home];
      const awayId = teamMap[f.away];
      if (!homeId || !awayId) continue;
      await db.insert(fixtures).values({
        roundId: r2.id,
        homeTeamId: homeId,
        awayTeamId: awayId,
        status: "completed",
        homeScore: Math.floor(Math.random() * 80) + 60,
        awayScore: Math.floor(Math.random() * 80) + 60,
        winnerId: awayId, // away wins for demo
        margin: Math.floor(Math.random() * 30) + 1,
      }).onDuplicateKeyUpdate({ set: { status: "completed" } });
    }

    // 11. Seed fixtures for round 3 (upcoming / open)
    const r3Fixtures = [
      { home: "COL", away: "GEE" },
      { home: "SYD", away: "HAW" },
      { home: "MEL", away: "CAR" },
      { home: "RIC", away: "ESS" },
    ];
    for (const f of r3Fixtures) {
      const homeId = teamMap[f.home];
      const awayId = teamMap[f.away];
      if (!homeId || !awayId) continue;
      await db.insert(fixtures).values({
        roundId: r3.id,
        homeTeamId: homeId,
        awayTeamId: awayId,
        status: "scheduled",
      }).onDuplicateKeyUpdate({ set: { status: "scheduled" } });
    }

    // 12. Enrol current user in competition
    await db.insert(competitionEntrants).values({ competitionId: comp.id, userId: ctx.user.id })
      .onDuplicateKeyUpdate({ set: { isActive: true } });
    await db.insert(leaderboardEntries).values({ competitionId: comp.id, userId: ctx.user.id, totalPoints: 5, correctTips: 5, totalTips: 8, rank: 1 })
      .onDuplicateKeyUpdate({ set: { totalPoints: 5 } });

    // 13. Seed prizes
    await db.insert(prizes).values({
      competitionId: comp.id,
      tenantId: tenant.id,
      name: "Round 3 Weekly Prize",
      description: "$50 bar tab at The Crown Hotel",
      type: "weekly",
      roundId: r3.id,
      isAwarded: false,
    }).onDuplicateKeyUpdate({ set: { name: "Round 3 Weekly Prize" } });
    await db.insert(prizes).values({
      competitionId: comp.id,
      tenantId: tenant.id,
      name: "Season Champion",
      description: "$500 bar tab + trophy",
      type: "season",
      isAwarded: false,
    }).onDuplicateKeyUpdate({ set: { name: "Season Champion" } });

    return { success: true, tenantId: tenant.id, competitionId: comp.id };
  }),
});

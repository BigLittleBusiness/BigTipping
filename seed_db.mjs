import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("No DATABASE_URL found in environment");
  process.exit(1);
}
console.log("Connecting to DB...");
const conn = await mysql.createConnection(DATABASE_URL);
console.log("Connected!");

// Seed sports
const sports = ["AFL", "NRL", "Super Netball"];
for (const name of sports) {
  await conn.execute("INSERT INTO sports (name, isActive) VALUES (?, 1) ON DUPLICATE KEY UPDATE isActive=1", [name]);
}
console.log("✓ Sports seeded");

// Get sport IDs
const [sportRows] = await conn.execute("SELECT id, name FROM sports");
console.log("Sports:", sportRows.map(s => `${s.name}(${s.id})`).join(", "));

// Seed AFL teams
const aflId = sportRows.find(s => s.name === "AFL").id;
const aflTeams = [
  ["Adelaide Crows","ADE"],["Brisbane Lions","BRI"],["Carlton","CAR"],
  ["Collingwood","COL"],["Essendon","ESS"],["Fremantle","FRE"],
  ["Geelong Cats","GEE"],["GWS Giants","GWS"],["Hawthorn","HAW"],
  ["Melbourne","MEL"],["North Melbourne","NTH"],["Port Adelaide","PTA"],
  ["Richmond","RIC"],["St Kilda","STK"],["Sydney Swans","SYD"],
  ["West Coast Eagles","WCE"],["Western Bulldogs","WBD"],["Gold Coast Suns","GCS"],
];
for (const [name, abbr] of aflTeams) {
  await conn.execute("INSERT IGNORE INTO teams (sportId, name, abbreviation, isActive) VALUES (?,?,?,1)", [aflId, name, abbr]);
}
console.log("✓ AFL teams seeded");

// Seed NRL teams
const nrlId = sportRows.find(s => s.name === "NRL").id;
const nrlTeams = [
  ["Brisbane Broncos","BRI"],["Canberra Raiders","CAN"],["Canterbury Bulldogs","CBY"],
  ["Cronulla Sharks","CRO"],["Gold Coast Titans","GCT"],["Manly Sea Eagles","MAN"],
  ["Melbourne Storm","MEL"],["Newcastle Knights","NEW"],["North Queensland Cowboys","NQC"],
  ["Parramatta Eels","PAR"],["Penrith Panthers","PEN"],["South Sydney Rabbitohs","SSR"],
  ["St George Illawarra Dragons","SGI"],["Sydney Roosters","SYD"],["Wests Tigers","WTI"],
  ["New Zealand Warriors","NZW"],
];
for (const [name, abbr] of nrlTeams) {
  await conn.execute("INSERT IGNORE INTO teams (sportId, name, abbreviation, isActive) VALUES (?,?,?,1)", [nrlId, name, abbr]);
}
console.log("✓ NRL teams seeded");

// Seed Super Netball teams
const snId = sportRows.find(s => s.name === "Super Netball").id;
const snTeams = [
  ["Adelaide Thunderbirds","ADT"],["Collingwood Magpies","COL"],
  ["Giants Netball","GNT"],["Melbourne Vixens","MEV"],
  ["NSW Swifts","NSW"],["Queensland Firebirds","QFB"],
  ["Sunshine Coast Lightning","SCL"],["West Coast Fever","WCF"],
];
for (const [name, abbr] of snTeams) {
  await conn.execute("INSERT IGNORE INTO teams (sportId, name, abbreviation, isActive) VALUES (?,?,?,1)", [snId, name, abbr]);
}
console.log("✓ Super Netball teams seeded");

// Seed a demo tenant
await conn.execute(
  "INSERT IGNORE INTO tenants (name, slug, description, status, contactEmail) VALUES (?,?,?,?,?)",
  ["The Local Pub", "the-local-pub", "Demo pub tipping competition", "active", "admin@thelocalpub.com.au"]
);
console.log("✓ Demo tenant seeded");

const [tenantRows] = await conn.execute("SELECT id FROM tenants WHERE slug='the-local-pub'");
const tenantId = tenantRows[0].id;

// Seed a demo AFL competition
await conn.execute(
  "INSERT IGNORE INTO competitions (tenantId, sportId, name, description, season, status, isPublic) VALUES (?,?,?,?,?,?,?)",
  [tenantId, aflId, "AFL 2025 Tipping Comp", "Weekly AFL tips for pub regulars", "2025", "active", 1]
);
console.log("✓ Demo competition seeded");

const [compRows] = await conn.execute("SELECT id FROM competitions WHERE tenantId=? AND name='AFL 2025 Tipping Comp'", [tenantId]);
const compId = compRows[0].id;

// Seed demo rounds
const [teamRows] = await conn.execute("SELECT id, abbreviation FROM teams WHERE sportId=?", [aflId]);
const tMap = Object.fromEntries(teamRows.map(t => [t.abbreviation, t.id]));

const now = new Date();
const roundStatuses = ["scored", "open", "upcoming"];
for (let r = 1; r <= 3; r++) {
  const openAt = new Date(now.getTime() - (4-r)*7*24*60*60*1000);
  const closeAt = new Date(openAt.getTime() + 2*24*60*60*1000);
  await conn.execute(
    "INSERT IGNORE INTO rounds (competitionId, roundNumber, name, status, tipsOpenAt, tipsCloseAt) VALUES (?,?,?,?,?,?)",
    [compId, r, `Round ${r}`, roundStatuses[r-1], openAt, closeAt]
  );
}
console.log("✓ Demo rounds seeded");

const [roundRows] = await conn.execute("SELECT id, roundNumber FROM rounds WHERE competitionId=?", [compId]);
const round1 = roundRows.find(r => r.roundNumber === 1);
const round2 = roundRows.find(r => r.roundNumber === 2);

// Seed fixtures for round 1 (completed, with winners)
const fixtures1 = [
  [tMap["COL"], tMap["CAR"], tMap["COL"]],
  [tMap["RIC"], tMap["MEL"], tMap["MEL"]],
  [tMap["GEE"], tMap["HAW"], tMap["GEE"]],
  [tMap["SYD"], tMap["ESS"], tMap["SYD"]],
];
for (const [homeId, awayId, winnerId] of fixtures1) {
  await conn.execute(
    "INSERT IGNORE INTO fixtures (roundId, homeTeamId, awayTeamId, status, winnerId) VALUES (?,?,?,?,?)",
    [round1.id, homeId, awayId, "completed", winnerId]
  );
}
console.log("✓ Round 1 fixtures seeded (completed)");

// Seed fixtures for round 2 (upcoming, tips open)
const fixtures2 = [
  [tMap["ADE"], tMap["BRI"]],
  [tMap["FRE"], tMap["GWS"]],
  [tMap["PTA"], tMap["NTH"]],
  [tMap["STK"], tMap["WCE"]],
];
for (const [homeId, awayId] of fixtures2) {
  await conn.execute(
    "INSERT IGNORE INTO fixtures (roundId, homeTeamId, awayTeamId, status) VALUES (?,?,?,?)",
    [round2.id, homeId, awayId, "scheduled"]
  );
}
console.log("✓ Round 2 fixtures seeded (scheduled)");

// Seed prizes
await conn.execute(
  "INSERT IGNORE INTO prizes (competitionId, tenantId, name, description, type) VALUES (?,?,?,?,?)",
  [compId, tenantId, "Weekly Winner", "$50 bar tab at The Local Pub", "weekly"]
);
await conn.execute(
  "INSERT IGNORE INTO prizes (competitionId, tenantId, name, description, type) VALUES (?,?,?,?,?)",
  [compId, tenantId, "Season Champion", "Free membership for 2026 + $200 bar tab", "season"]
);
await conn.execute(
  "INSERT IGNORE INTO prizes (competitionId, tenantId, name, description, type) VALUES (?,?,?,?,?)",
  [compId, tenantId, "Best Round Score", "Bottle of wine from the cellar", "special"]
);
console.log("✓ Prizes seeded");

await conn.end();
console.log("\n✅ Seed complete! Database is ready.");

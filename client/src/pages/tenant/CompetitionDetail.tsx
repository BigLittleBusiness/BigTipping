import { useState } from "react";
import { useParams } from "wouter";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trophy, Medal, CheckCircle2, XCircle, Loader2 } from "lucide-react";

const RANK_BADGE: Record<number, { label: string; cls: string }> = {
  1: { label: "Gold",   cls: "bg-yellow-100 text-yellow-700 border border-yellow-300" },
  2: { label: "Silver", cls: "bg-gray-100 text-gray-600 border border-gray-300" },
  3: { label: "Bronze", cls: "bg-orange-100 text-orange-700 border border-orange-300" },
};

export default function CompetitionDetail() {
  const params = useParams<{ id: string }>();
  const compId = Number(params.id);

  const { data: comp } = trpc.competitions.get.useQuery({ id: compId });
  const { data: rounds, refetch: refetchRounds } = trpc.rounds.list.useQuery({ competitionId: compId });
  const { data: leaderboard } = trpc.leaderboard.get.useQuery({ competitionId: compId });
  const { data: prizes, refetch: refetchPrizes } = trpc.prizes.list.useQuery({ competitionId: compId });
  const { data: entrants } = trpc.competitions.listEntrants.useQuery({ competitionId: compId });

  const createRound = trpc.rounds.create.useMutation({ onSuccess: () => { refetchRounds(); setRoundOpen(false); toast.success("Round created"); } });
  const setRoundStatus = trpc.rounds.setStatus.useMutation({ onSuccess: () => { refetchRounds(); toast.success("Round updated"); } });
  const scoreRound = trpc.leaderboard.scoreRound.useMutation({ onSuccess: (d) => { refetchRounds(); toast.success(`Scored ${d.scored} tips`); } });
  const createPrize = trpc.prizes.create.useMutation({ onSuccess: () => { refetchPrizes(); setPrizeOpen(false); toast.success("Prize added"); } });

  const [roundOpen, setRoundOpen] = useState(false);
  const [prizeOpen, setPrizeOpen] = useState(false);
  const [selectedRoundId, setSelectedRoundId] = useState<number | null>(null);
  const [roundForm, setRoundForm] = useState({ roundNumber: "", name: "" });
  const [prizeForm, setPrizeForm] = useState({ name: "", description: "", type: "weekly" as "weekly" | "season" | "special", roundId: "" });

  // Fixtures for selected round
  const { data: fixtures, refetch: refetchFixtures } = trpc.fixtures.list.useQuery(
    { roundId: selectedRoundId! },
    { enabled: !!selectedRoundId }
  );
  const { data: sports } = trpc.sports.list.useQuery();
  const [fixOpen, setFixOpen] = useState(false);
  const [fixForm, setFixForm] = useState({ homeTeamId: "", awayTeamId: "", venue: "" });
  const [sportIdForTeams, setSportIdForTeams] = useState<number | null>(comp?.sportId ?? null);
  const { data: teams } = trpc.sports.listTeams.useQuery({ sportId: comp?.sportId ?? 0 }, { enabled: !!comp?.sportId });
  const createFixture = trpc.fixtures.create.useMutation({ onSuccess: () => { refetchFixtures(); setFixOpen(false); toast.success("Fixture added"); } });
  const enterResult = trpc.fixtures.enterResult.useMutation({ onSuccess: () => { refetchFixtures(); toast.success("Result entered"); } });
  const [resultFixId, setResultFixId] = useState<number | null>(null);
  const [resultForm, setResultForm] = useState({ homeScore: "", awayScore: "", winnerId: "" });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{comp?.name ?? "Competition"}</h1>
          <p className="text-muted-foreground mt-1">
            {comp?.season} · <span className="capitalize">{comp?.status}</span>
          </p>
        </div>

        <Tabs defaultValue="rounds">
          <TabsList>
            <TabsTrigger value="rounds">Rounds & Fixtures</TabsTrigger>
            <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
            <TabsTrigger value="prizes">Prizes</TabsTrigger>
            <TabsTrigger value="entrants">Entrants ({entrants?.length ?? 0})</TabsTrigger>
          </TabsList>

          {/* ── ROUNDS TAB ─────────────────────────────────────────── */}
          <TabsContent value="rounds" className="space-y-4 mt-4">
            <div className="flex justify-end">
              <Dialog open={roundOpen} onOpenChange={setRoundOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1"><Plus size={14} /> Add Round</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add Round</DialogTitle></DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div className="space-y-1">
                      <Label>Round Number</Label>
                      <Input type="number" value={roundForm.roundNumber} onChange={e => setRoundForm(f => ({ ...f, roundNumber: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label>Name (optional)</Label>
                      <Input value={roundForm.name} onChange={e => setRoundForm(f => ({ ...f, name: e.target.value }))} placeholder="Round 4" />
                    </div>
                    <Button className="w-full" onClick={() => createRound.mutate({ competitionId: compId, roundNumber: Number(roundForm.roundNumber), name: roundForm.name || undefined })} disabled={!roundForm.roundNumber}>
                      Create Round
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {rounds?.map(round => (
              <Card key={round.id} className={selectedRoundId === round.id ? "ring-2 ring-primary" : ""}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">{round.name ?? `Round ${round.roundNumber}`}</CardTitle>
                      <RoundStatusBadge status={round.status} />
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button variant="outline" size="sm" onClick={() => setSelectedRoundId(round.id === selectedRoundId ? null : round.id)}>
                        {selectedRoundId === round.id ? "Hide Fixtures" : "View Fixtures"}
                      </Button>
                      {round.status === "upcoming" && (
                        <Button size="sm" variant="outline" onClick={() => setRoundStatus.mutate({ id: round.id, status: "open" })}>Open Tips</Button>
                      )}
                      {round.status === "open" && (
                        <Button size="sm" variant="outline" onClick={() => setRoundStatus.mutate({ id: round.id, status: "closed" })}>Close Tips</Button>
                      )}
                      {round.status === "closed" && (
                        <Button size="sm" onClick={() => scoreRound.mutate({ roundId: round.id, competitionId: compId })} disabled={scoreRound.isPending}>
                          {scoreRound.isPending ? <Loader2 size={14} className="animate-spin mr-1" /> : null}
                          Score Round
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                {selectedRoundId === round.id && (
                  <CardContent className="pt-0">
                    <div className="flex justify-end mb-3">
                      <Dialog open={fixOpen} onOpenChange={setFixOpen}>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline" className="gap-1"><Plus size={12} /> Add Fixture</Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader><DialogTitle>Add Fixture</DialogTitle></DialogHeader>
                          <div className="space-y-4 pt-2">
                            <div className="space-y-1">
                              <Label>Home Team</Label>
                              <Select value={fixForm.homeTeamId} onValueChange={v => setFixForm(f => ({ ...f, homeTeamId: v }))}>
                                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                                <SelectContent>{teams?.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}</SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <Label>Away Team</Label>
                              <Select value={fixForm.awayTeamId} onValueChange={v => setFixForm(f => ({ ...f, awayTeamId: v }))}>
                                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                                <SelectContent>{teams?.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}</SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <Label>Venue (optional)</Label>
                              <Input value={fixForm.venue} onChange={e => setFixForm(f => ({ ...f, venue: e.target.value }))} />
                            </div>
                            <Button className="w-full" onClick={() => createFixture.mutate({ roundId: round.id, homeTeamId: Number(fixForm.homeTeamId), awayTeamId: Number(fixForm.awayTeamId), venue: fixForm.venue || undefined })} disabled={!fixForm.homeTeamId || !fixForm.awayTeamId}>
                              Add Fixture
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>

                    {!fixtures?.length ? (
                      <p className="text-sm text-muted-foreground text-center py-4">No fixtures yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {fixtures.map(f => (
                          <div key={f.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <span className="font-medium text-sm">{f.homeTeam?.name ?? "?"}</span>
                              <span className="text-xs text-muted-foreground">vs</span>
                              <span className="font-medium text-sm">{f.awayTeam?.name ?? "?"}</span>
                              {f.status === "completed" && f.winnerId && (
                                <span className="text-xs text-green-600 font-semibold ml-2">
                                  ✓ {f.winner?.name ?? "Draw"} won ({f.homeScore}–{f.awayScore})
                                </span>
                              )}
                            </div>
                            {f.status !== "completed" && round.status === "closed" && (
                              resultFixId === f.id ? (
                                <div className="flex items-center gap-2">
                                  <Input className="w-16 h-7 text-xs" type="number" placeholder="Home" value={resultForm.homeScore} onChange={e => setResultForm(r => ({ ...r, homeScore: e.target.value }))} />
                                  <Input className="w-16 h-7 text-xs" type="number" placeholder="Away" value={resultForm.awayScore} onChange={e => setResultForm(r => ({ ...r, awayScore: e.target.value }))} />
                                  <Select value={resultForm.winnerId} onValueChange={v => setResultForm(r => ({ ...r, winnerId: v }))}>
                                    <SelectTrigger className="h-7 w-32 text-xs"><SelectValue placeholder="Winner" /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value={String(f.homeTeamId)}>{f.homeTeam?.name}</SelectItem>
                                      <SelectItem value={String(f.awayTeamId)}>{f.awayTeam?.name}</SelectItem>
                                      <SelectItem value="0">Draw</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <Button size="sm" className="h-7 text-xs" onClick={() => {
                                    enterResult.mutate({ id: f.id, homeScore: Number(resultForm.homeScore), awayScore: Number(resultForm.awayScore), winnerId: resultForm.winnerId === "0" ? null : Number(resultForm.winnerId) });
                                    setResultFixId(null);
                                  }}>Save</Button>
                                </div>
                              ) : (
                                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setResultFixId(f.id)}>Enter Result</Button>
                              )
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            ))}
          </TabsContent>

          {/* ── LEADERBOARD TAB ────────────────────────────────────── */}
          <TabsContent value="leaderboard" className="mt-4">
            <Card>
              <CardContent className="p-0">
                {!leaderboard?.length ? (
                  <div className="text-center py-12 text-muted-foreground">No entries yet.</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/40">
                        <th className="text-left px-4 py-3 font-semibold text-muted-foreground w-12">Rank</th>
                        <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Participant</th>
                        <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Points</th>
                        <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Correct</th>
                        <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Streak</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboard.map(entry => (
                        <tr key={entry.id} className="border-b border-border hover:bg-muted/20">
                          <td className="px-4 py-3">
                            {entry.rankBadge ? (
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${RANK_BADGE[entry.rank]?.cls ?? ""}`}>
                                {entry.rankBadge}
                              </span>
                            ) : (
                              <span className="font-mono text-muted-foreground">#{entry.rank}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 font-medium">{entry.user?.name ?? "Unknown"}</td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-primary">{entry.totalPoints}</td>
                          <td className="px-4 py-3 text-right font-mono">{entry.correctTips}/{entry.totalTips}</td>
                          <td className="px-4 py-3 text-right font-mono">{entry.currentStreak}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── PRIZES TAB ─────────────────────────────────────────── */}
          <TabsContent value="prizes" className="space-y-4 mt-4">
            <div className="flex justify-end">
              <Dialog open={prizeOpen} onOpenChange={setPrizeOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1"><Plus size={14} /> Add Prize</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add Prize</DialogTitle></DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div className="space-y-1">
                      <Label>Prize Name</Label>
                      <Input value={prizeForm.name} onChange={e => setPrizeForm(f => ({ ...f, name: e.target.value }))} placeholder="Round 4 Winner" />
                    </div>
                    <div className="space-y-1">
                      <Label>Description</Label>
                      <Input value={prizeForm.description} onChange={e => setPrizeForm(f => ({ ...f, description: e.target.value }))} placeholder="$50 bar tab" />
                    </div>
                    <div className="space-y-1">
                      <Label>Type</Label>
                      <Select value={prizeForm.type} onValueChange={v => setPrizeForm(f => ({ ...f, type: v as any }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="season">Season</SelectItem>
                          <SelectItem value="special">Special</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button className="w-full" onClick={() => createPrize.mutate({ competitionId: compId, name: prizeForm.name, description: prizeForm.description || undefined, type: prizeForm.type })} disabled={!prizeForm.name}>
                      Add Prize
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            {!prizes?.length ? (
              <Card><CardContent className="text-center py-12 text-muted-foreground">No prizes yet.</CardContent></Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {prizes.map(p => (
                  <Card key={p.id}>
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-accent/20 rounded-lg"><Trophy size={18} className="text-accent-foreground" /></div>
                        <div className="flex-1">
                          <p className="font-semibold text-sm">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{p.description}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-muted">{p.type}</span>
                            {p.isAwarded && <span className="text-xs text-green-600 font-semibold">Awarded to {p.awardedTo?.name ?? "?"}</span>}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── ENTRANTS TAB ───────────────────────────────────────── */}
          <TabsContent value="entrants" className="mt-4">
            <Card>
              <CardContent className="p-0">
                {!entrants?.length ? (
                  <div className="text-center py-12 text-muted-foreground">No entrants yet.</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/40">
                        <th className="text-left px-4 py-3 font-semibold text-muted-foreground">User ID</th>
                        <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Joined</th>
                        <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entrants.map(e => (
                        <tr key={e.id} className="border-b border-border">
                          <td className="px-4 py-3 font-mono text-xs">{e.userId}</td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(e.joinedAt).toLocaleDateString()}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${e.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                              {e.isActive ? "Active" : "Inactive"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}

function RoundStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    upcoming: "bg-gray-100 text-gray-600",
    open: "bg-blue-100 text-blue-700",
    closed: "bg-orange-100 text-orange-700",
    scored: "bg-green-100 text-green-700",
  };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${map[status] ?? ""}`}>{status}</span>
  );
}

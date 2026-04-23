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
import { Plus, Trophy, Medal, CheckCircle2, XCircle, Loader2, Download, Bell, Clock, ClipboardList } from "lucide-react";
import { useLocation } from "wouter";
import InviteLinkPanel from "@/components/InviteLinkPanel";

/** Client-side CSV export — no server round-trip needed */
function downloadEntrantsCSV(
  entrants: Array<{ userName: string | null; userEmail: string | null; joinedAt: Date | string; isActive: boolean }>,
  competitionName: string
) {
  const header = ["#", "Name", "Email", "Joined", "Status"];
  const rows = entrants.map((e, i) => [
    String(i + 1),
    e.userName ?? "Unknown",
    e.userEmail ?? "",
    new Date(e.joinedAt).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }),
    e.isActive ? "Active" : "Inactive",
  ]);
  const csv = [header, ...rows].map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${competitionName.replace(/[^a-z0-9]/gi, "_")}_entrants.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const RANK_BADGE: Record<number, { label: string; cls: string }> = {
  1: { label: "Gold",   cls: "bg-yellow-100 text-yellow-700 border border-yellow-300" },
  2: { label: "Silver", cls: "bg-gray-100 text-gray-600 border border-gray-300" },
  3: { label: "Bronze", cls: "bg-orange-100 text-orange-700 border border-orange-300" },
};

export default function CompetitionDetail() {
  const params = useParams<{ id: string }>();
  const compId = Number(params.id);
  const [, navigate] = useLocation();

  const { data: comp } = trpc.competitions.get.useQuery({ id: compId });
  const { data: rounds, refetch: refetchRounds } = trpc.rounds.list.useQuery({ competitionId: compId });
  const { data: leaderboard } = trpc.leaderboard.get.useQuery({ competitionId: compId });
  const { data: prizes, refetch: refetchPrizes } = trpc.prizes.list.useQuery({ competitionId: compId });
  const { data: entrants } = trpc.competitions.listEntrants.useQuery({ competitionId: compId });

  const createRound = trpc.rounds.create.useMutation({ onSuccess: () => { refetchRounds(); setRoundOpen(false); toast.success("Round created"); } });
  const setRoundStatus = trpc.rounds.setStatus.useMutation({ onSuccess: () => { refetchRounds(); toast.success("Round updated"); } });
  const setDeadline = trpc.rounds.setDeadline.useMutation({ onSuccess: () => { refetchRounds(); toast.success("Deadline saved"); } });
  const sendReminder = trpc.rounds.sendRoundReminder.useMutation({
    onSuccess: (d) => toast.success(d.message),
    onError: () => toast.error("Failed to send reminder"),
  });
  const scoreRound = trpc.leaderboard.scoreRound.useMutation({ onSuccess: (d) => { refetchRounds(); toast.success(`Scored ${d.scored} tips`); } });
  const createPrize = trpc.prizes.create.useMutation({ onSuccess: () => { refetchPrizes(); setPrizeOpen(false); toast.success("Prize added"); } });
  const [deadlineRoundId, setDeadlineRoundId] = useState<number | null>(null);
  const [deadlineValue, setDeadlineValue] = useState("");

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
            <TabsTrigger value="invite">Invite Link</TabsTrigger>
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
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-base">{round.name ?? `Round ${round.roundNumber}`}</CardTitle>
                        <RoundStatusBadge status={round.status} />
                      </div>
                      {/* Deadline display */}
                      {round.tipsCloseAt ? (
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <Clock size={11} />
                          Tips close {new Date(round.tipsCloseAt).toLocaleString("en-AU", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      ) : (
                        <button
                          className="text-xs text-muted-foreground mt-1 hover:text-primary underline underline-offset-2 flex items-center gap-1"
                          onClick={() => { setDeadlineRoundId(round.id); setDeadlineValue(""); }}
                        >
                          <Clock size={11} /> Set tipping deadline
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button variant="outline" size="sm" onClick={() => setSelectedRoundId(round.id === selectedRoundId ? null : round.id)}>
                        {selectedRoundId === round.id ? "Hide Fixtures" : "View Fixtures"}
                      </Button>
                      {round.status === "upcoming" && (
                        <Button size="sm" variant="outline" onClick={() => setRoundStatus.mutate({ id: round.id, status: "open" })}>Open Tips</Button>
                      )}
                      {round.status === "open" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1"
                            disabled={sendReminder.isPending}
                            onClick={() => sendReminder.mutate({ roundId: round.id, competitionId: compId })}
                          >
                            {sendReminder.isPending ? <Loader2 size={12} className="animate-spin" /> : <Bell size={12} />}
                            Send Reminder
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setRoundStatus.mutate({ id: round.id, status: "closed" })}>Close Tips</Button>
                        </>
                      )}
                      {(round.status === "closed" || round.status === "open") && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1"
                          onClick={() => navigate(`/tenant/competitions/${compId}/results/${round.id}`)}
                        >
                          <ClipboardList size={12} /> Enter Results
                        </Button>
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
            ))}          </TabsContent>

          {/* ── SET DEADLINE DIALOG (outside tabs so it can overlay) ── */}
          <Dialog open={deadlineRoundId !== null} onOpenChange={open => { if (!open) setDeadlineRoundId(null); }}>
            <DialogContent>
              <DialogHeader><DialogTitle>Set Tipping Deadline</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <p className="text-sm text-muted-foreground">Choose when tips will close for this round. Participants will see this deadline on their tip submission screen.</p>
                <div className="space-y-1">
                  <Label>Close Date &amp; Time</Label>
                  <Input
                    type="datetime-local"
                    value={deadlineValue}
                    onChange={e => setDeadlineValue(e.target.value)}
                  />
                </div>
                <Button
                  className="w-full"
                  disabled={!deadlineValue || setDeadline.isPending}
                  onClick={() => {
                    if (deadlineRoundId && deadlineValue) {
                      setDeadline.mutate(
                        { id: deadlineRoundId, tipsCloseAt: new Date(deadlineValue).toISOString() },
                        { onSuccess: () => setDeadlineRoundId(null) }
                      );
                    }
                  }}
                >
                  {setDeadline.isPending ? <Loader2 size={14} className="animate-spin mr-2" /> : null}
                  Save Deadline
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* ── LEADERBOARD TAB ───────────────────────────────────────── */}         <TabsContent value="leaderboard" className="mt-4">
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
          <TabsContent value="entrants" className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{entrants?.length ?? 0} participant{(entrants?.length ?? 0) !== 1 ? "s" : ""} enrolled</p>
              {entrants && entrants.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => downloadEntrantsCSV(entrants, comp?.name ?? "competition")}
                >
                  <Download size={14} />
                  Download CSV
                </Button>
              )}
            </div>
            <Card>
              <CardContent className="p-0">
                {!entrants?.length ? (
                  <div className="text-center py-12 text-muted-foreground">No entrants yet. Share the invite link to get participants.</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/40">
                        <th className="text-left px-4 py-3 font-semibold text-muted-foreground">#</th>
                        <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Participant</th>
                        <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Email</th>
                        <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Joined</th>
                        <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entrants.map((e, idx) => (
                        <tr key={e.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3 text-muted-foreground text-xs font-mono">{idx + 1}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs flex-shrink-0">
                                {(e.userName ?? "?").charAt(0).toUpperCase()}
                              </div>
                              <span className="font-medium">{e.userName ?? "Unknown"}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">{e.userEmail ?? "—"}</td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(e.joinedAt).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}</td>
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

          {/* ── INVITE LINK TAB ────────────────────────────────────── */}
          <TabsContent value="invite" className="mt-4">
            <div className="max-w-xl space-y-4">
              <div>
                <h2 className="font-heading font-semibold text-gray-900 mb-1">Share Your Competition</h2>
                <p className="text-sm text-gray-500">
                  Generate a unique invite link and share it via email, social media, or your website.
                  Anyone who clicks the link can sign in and join this competition instantly.
                </p>
              </div>
              {comp && (
                <InviteLinkPanel
                  competitionId={compId}
                  competitionName={comp.name}
                  initialToken={(comp as any).inviteToken ?? null}
                  initialEnabled={(comp as any).inviteEnabled ?? false}
                />
              )}
              {/* Tips for sharing */}
              <div className="bg-[#2B4EAE]/5 border border-[#2B4EAE]/15 rounded-xl p-4">
                <h3 className="font-semibold text-[#2B4EAE] text-sm mb-2">Tips for sharing</h3>
                <ul className="space-y-1.5 text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="text-[#C8521A] font-bold mt-0.5">·</span>
                    Paste the link into your weekly email newsletter for maximum reach
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#C8521A] font-bold mt-0.5">·</span>
                    Post it on your social channels with a prize teaser to drive sign-ups
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#C8521A] font-bold mt-0.5">·</span>
                    Add it to your website or digital menu so walk-in customers can join
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#C8521A] font-bold mt-0.5">·</span>
                    Disable the link at any time to stop new entries without affecting existing ones
                  </li>
                </ul>
              </div>
            </div>
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

import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Lock, Unlock, Clock, Calendar, Trophy, ChevronRight } from "lucide-react";

function statusBadge(status: string) {
  const map: Record<string, string> = {
    upcoming: "bg-blue-100 text-blue-700",
    open: "bg-green-100 text-green-700",
    locked: "bg-yellow-100 text-yellow-700",
    scored: "bg-purple-100 text-purple-700",
    completed: "bg-gray-100 text-gray-600",
  };
  return <Badge className={`text-xs ${map[status] ?? "bg-gray-100 text-gray-600"}`}>{status}</Badge>;
}

export default function RoundManagement() {
  const { data: competitions } = trpc.competitions.list.useQuery();
  const [compId, setCompId] = useState<number>(0);
  const selectedComp = compId || competitions?.[0]?.id || 0;

  const { data: rounds, refetch } = trpc.rounds.list.useQuery(
    { competitionId: selectedComp },
    { enabled: selectedComp > 0 }
  );

  // Deadline modal
  const [deadlineRound, setDeadlineRound] = useState<number | null>(null);
  const [deadlineVal, setDeadlineVal] = useState("");

  // Tie-breaker modal
  const [tbRound, setTbRound] = useState<number | null>(null);
  const [tbFixtureId, setTbFixtureId] = useState<number | null>(null);

  // Fixtures modal
  const [fixturesRound, setFixturesRound] = useState<number | null>(null);
  const setDeadlineMut = trpc.rounds.setDeadline.useMutation({
    onSuccess: () => { toast.success("Deadline updated"); setDeadlineRound(null); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const setStatus = trpc.rounds.setStatus.useMutation({
    onSuccess: () => { toast.success("Round status updated"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const setTieBreaker = trpc.rounds.setTieBreaker.useMutation({
    onSuccess: () => { toast.success("Tie-breaker fixture set"); setTbRound(null); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  // Fixtures for the selected round in the fixtures modal
  const { data: roundFixtures } = trpc.rounds.getFixtures.useQuery(
    { roundId: fixturesRound! },
    { enabled: !!fixturesRound }
  );

  // Fixtures for the tie-breaker modal
  const { data: tbFixtures } = trpc.rounds.getFixtures.useQuery(
    { roundId: tbRound! },
    { enabled: !!tbRound }
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Round Management</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Set deadlines, lock rounds, and configure tie-breakers</p>
          </div>
          {competitions && competitions.length > 1 && (
            <Select value={String(selectedComp)} onValueChange={v => setCompId(Number(v))}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Competition" /></SelectTrigger>
              <SelectContent>
                {competitions.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>

        {!rounds || rounds.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground text-sm">
              No rounds found for this competition.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {rounds.map(round => (
              <Card key={round.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-base">
                        {round.name ?? `Round ${round.roundNumber}`}
                      </CardTitle>
                      {statusBadge(round.status)}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setFixturesRound(round.id)}
                      >
                        <Calendar size={13} className="mr-1" />
                        Fixtures
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setDeadlineRound(round.id);
                          setDeadlineVal(round.tipsCloseAt ? new Date(round.tipsCloseAt).toISOString().slice(0, 16) : "");
                        }}
                      >
                        <Clock size={13} className="mr-1" />
                        Set Deadline
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setTbRound(round.id)}
                      >
                        <Trophy size={13} className="mr-1" />
                        Tie-Breaker
                      </Button>
                      {round.status === "open" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setStatus.mutate({ id: round.id, status: "closed" })}
                          disabled={setStatus.isPending}
                        >
                          <Lock size={13} className="mr-1" />
                          Lock
                        </Button>
                      )}
                      {round.status === "closed" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setStatus.mutate({ id: round.id, status: "open" })}
                          disabled={setStatus.isPending}
                        >
                          <Unlock size={13} className="mr-1" />
                          Unlock
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-6 text-xs text-muted-foreground">
                    {round.tipsCloseAt && (
                      <span className="flex items-center gap-1">
                        <Clock size={11} />
                        Tips close: {new Date(round.tipsCloseAt).toLocaleString()}
                      </span>
                    )}
                    {round.tieBreakerFixtureId && (
                      <span className="flex items-center gap-1">
                        <Trophy size={11} />
                        Tie-breaker fixture set
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Set Deadline Modal */}
        <Dialog open={!!deadlineRound} onOpenChange={() => setDeadlineRound(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Set Tips Deadline</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <Label>Deadline (your local time)</Label>
              <Input
                type="datetime-local"
                value={deadlineVal}
                onChange={e => setDeadlineVal(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeadlineRound(null)}>Cancel</Button>
              <Button
                disabled={!deadlineVal || setDeadlineMut.isPending}
                onClick={() => setDeadlineMut.mutate({
                  id: deadlineRound!,
                  tipsCloseAt: new Date(deadlineVal).toISOString(),
                })}
              >
                {setDeadlineMut.isPending ? "Saving…" : "Save Deadline"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Tie-Breaker Modal */}
        <Dialog open={!!tbRound} onOpenChange={() => setTbRound(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Set Tie-Breaker Fixture</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <p className="text-sm text-muted-foreground">
                Select the fixture whose result will be used to break ties in this round.
              </p>
              {!tbFixtures || tbFixtures.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No fixtures in this round.</p>
              ) : (
                <div className="space-y-2">
                  {tbFixtures.map(fx => (
                    <button
                      key={fx.id}
                      onClick={() => setTbFixtureId(fx.id)}
                      className={`w-full text-left px-3 py-2 rounded border text-sm flex items-center justify-between transition-colors ${
                        tbFixtureId === fx.id
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border hover:bg-muted"
                      }`}
                    >
                      <span>{fx.homeTeamId ?? "Home"} vs {fx.awayTeamId ?? "Away"}</span>
                      {tbFixtureId === fx.id && <ChevronRight size={14} />}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setTbRound(null)}>Cancel</Button>
              <Button
                disabled={!tbFixtureId || setTieBreaker.isPending}
                onClick={() => setTieBreaker.mutate({ roundId: tbRound!, fixtureId: tbFixtureId! })}
              >
                {setTieBreaker.isPending ? "Saving…" : "Set Tie-Breaker"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Fixtures Modal */}
        <Dialog open={!!fixturesRound} onOpenChange={() => setFixturesRound(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Round Fixtures</DialogTitle>
            </DialogHeader>
            <div className="py-2">
              {!roundFixtures || roundFixtures.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No fixtures in this round.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-2 font-semibold text-muted-foreground">Match</th>
                      <th className="text-left py-2 px-2 font-semibold text-muted-foreground">Start Time</th>
                      <th className="text-left py-2 px-2 font-semibold text-muted-foreground">Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roundFixtures.map(fx => (
                      <tr key={fx.id} className="border-b border-border last:border-0">
                        <td className="py-2 px-2">{fx.homeTeamId ?? "Home"} vs {fx.awayTeamId ?? "Away"}</td>
                        <td className="py-2 px-2 text-muted-foreground text-xs">
                          {fx.startTime ? new Date(fx.startTime).toLocaleString() : "—"}
                        </td>
                        <td className="py-2 px-2 text-xs">
                          {fx.homeScore !== null && fx.awayScore !== null
                            ? `${fx.homeScore} – ${fx.awayScore}`
                            : <span className="text-muted-foreground">Pending</span>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setFixturesRound(null)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}

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
import {
  Lock, Unlock, Clock, Calendar, Trophy, ChevronRight,
  PlayCircle, CheckCircle2, Star, ArrowRight, Layers,
} from "lucide-react";

// Status display config
const STATUS_CONFIG: Record<string, { label: string; className: string; step: number }> = {
  upcoming: { label: "Upcoming",  className: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",     step: 0 },
  open:     { label: "Open",      className: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300", step: 1 },
  closed:   { label: "Locked",    className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300", step: 2 },
  scored:   { label: "Scored",    className: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300", step: 3 },
};

const STATUS_STEPS = ["upcoming", "open", "closed", "scored"] as const;
type RoundStatus = typeof STATUS_STEPS[number];

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, className: "bg-gray-100 text-gray-600" };
  return <Badge className={`text-xs font-medium ${cfg.className}`}>{cfg.label}</Badge>;
}

/** Horizontal step-flow indicator showing where this round sits in the lifecycle */
function StatusFlow({ current }: { current: string }) {
  const currentStep = STATUS_CONFIG[current]?.step ?? -1;
  return (
    <div className="flex items-center gap-1 text-xs">
      {STATUS_STEPS.map((s, i) => {
        const cfg = STATUS_CONFIG[s];
        const done = i < currentStep;
        const active = i === currentStep;
        return (
          <span key={s} className="flex items-center gap-1">
            <span
              className={`px-2 py-0.5 rounded-full font-medium transition-colors ${
                active
                  ? cfg.className
                  : done
                  ? "bg-muted text-muted-foreground line-through"
                  : "bg-muted/50 text-muted-foreground/50"
              }`}
            >
              {cfg.label}
            </span>
            {i < STATUS_STEPS.length - 1 && (
              <ArrowRight size={10} className={done || active ? "text-muted-foreground" : "text-muted-foreground/30"} />
            )}
          </span>
        );
      })}
    </div>
  );
}

export default function RoundManagement() {
  const { data: competitions, isLoading: compsLoading } = trpc.competitions.list.useQuery();
  const [compId, setCompId] = useState<number>(0);
  const selectedComp = compId || competitions?.[0]?.id || 0;
  const selectedCompName = competitions?.find(c => c.id === selectedComp)?.name ?? "";

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
    onSuccess: (_, vars) => {
      const label = STATUS_CONFIG[vars.status]?.label ?? vars.status;
      toast.success(`Round marked as ${label}`);
      refetch();
    },
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

  /** Returns the primary forward-transition button for a given status */
  function forwardButton(round: { id: number; status: string }) {
    const pending = setStatus.isPending;
    switch (round.status as RoundStatus) {
      case "upcoming":
        return (
          <Button
            size="sm"
            variant="default"
            className="bg-green-600 hover:bg-green-700 text-white"
            disabled={pending}
            onClick={() => setStatus.mutate({ id: round.id, status: "open" })}
          >
            <PlayCircle size={13} className="mr-1" />
            Open Round
          </Button>
        );
      case "open":
        return (
          <Button
            size="sm"
            variant="outline"
            className="border-yellow-400 text-yellow-700 hover:bg-yellow-50 dark:text-yellow-400 dark:hover:bg-yellow-900/20"
            disabled={pending}
            onClick={() => setStatus.mutate({ id: round.id, status: "closed" })}
          >
            <Lock size={13} className="mr-1" />
            Lock Round
          </Button>
        );
      case "closed":
        return (
          <Button
            size="sm"
            variant="outline"
            className="border-purple-400 text-purple-700 hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-purple-900/20"
            disabled={pending}
            onClick={() => setStatus.mutate({ id: round.id, status: "scored" })}
          >
            <Star size={13} className="mr-1" />
            Mark Scored
          </Button>
        );
      case "scored":
        return (
          <Button
            size="sm"
            variant="outline"
            className="border-gray-400 text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800"
            disabled={pending}
            onClick={() => {
              if (confirm("Mark this round as completed? This cannot be undone.")) {
                // "completed" is not in the DB enum — scored is the terminal state;
                // keep the button visible but inform the admin
                toast.info("Scored is the final state for a round.");
              }
            }}
          >
            <CheckCircle2 size={13} className="mr-1" />
            Completed
          </Button>
        );
      default:
        return null;
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Round Management</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              {selectedCompName ? (
                <span className="flex items-center gap-1.5">
                  <Trophy size={12} className="text-primary" />
                  {selectedCompName}
                </span>
              ) : "Set deadlines, lock rounds, and configure tie-breakers"}
            </p>
          </div>
        </div>

        {/* Competition selector — always visible */}
        <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-lg border border-border">
          <span className="text-sm font-medium text-muted-foreground shrink-0">Competition</span>
          {compsLoading ? (
            <div className="h-9 w-48 rounded-md bg-muted animate-pulse" />
          ) : !competitions || competitions.length === 0 ? (
            <span className="text-sm text-muted-foreground italic">No competitions found</span>
          ) : (
            <Select
              value={selectedComp > 0 ? String(selectedComp) : ""}
              onValueChange={v => setCompId(Number(v))}
            >
              <SelectTrigger className="w-64 bg-background">
                <SelectValue placeholder="Select a competition…" />
              </SelectTrigger>
              <SelectContent>
                {competitions.map(c => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {rounds && rounds.length > 0 && (
            <span className="text-xs text-muted-foreground ml-auto">
              {rounds.length} round{rounds.length !== 1 ? "s" : ""}
            </span>
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
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-base">
                        {round.name ?? `Round ${round.roundNumber}`}
                      </CardTitle>
                      <StatusBadge status={round.status} />
                    </div>
                    {/* Action buttons */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Utility actions — always available */}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-muted-foreground"
                        onClick={() => setFixturesRound(round.id)}
                      >
                        <Calendar size={13} className="mr-1" />
                        Fixtures
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-muted-foreground"
                        onClick={() => {
                          setDeadlineRound(round.id);
                          setDeadlineVal(round.tipsCloseAt ? new Date(round.tipsCloseAt).toISOString().slice(0, 16) : "");
                        }}
                      >
                        <Clock size={13} className="mr-1" />
                        Deadline
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-muted-foreground"
                        onClick={() => { setTbRound(round.id); setTbFixtureId(null); }}
                      >
                        <Trophy size={13} className="mr-1" />
                        Tie-Breaker
                      </Button>

                      {/* Divider */}
                      <span className="w-px h-5 bg-border" />

                      {/* Unlock back to open (only when locked/closed) */}
                      {round.status === "closed" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-muted-foreground"
                          disabled={setStatus.isPending}
                          onClick={() => setStatus.mutate({ id: round.id, status: "open" })}
                        >
                          <Unlock size={13} className="mr-1" />
                          Unlock
                        </Button>
                      )}

                      {/* Primary forward-transition button */}
                      {forwardButton(round)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-1">
                  {/* Status flow indicator */}
                  <div className="mb-2">
                    <StatusFlow current={round.status} />
                  </div>
                  {/* Meta info */}
                  <div className="flex flex-wrap gap-4 text-xs text-muted-foreground mt-1">
                    {/* Fixture count — highlighted in amber if zero */}
                    <span className={`flex items-center gap-1 font-medium ${
                      round.fixtureCount === 0
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-muted-foreground"
                    }`}>
                      <Layers size={11} />
                      {round.fixtureCount === 0
                        ? "No fixtures loaded"
                        : `${round.fixtureCount} fixture${round.fixtureCount !== 1 ? "s" : ""}`
                      }
                    </span>
                    {round.tipsCloseAt && (
                      <span className="flex items-center gap-1">
                        <Clock size={11} />
                        Tips close: {new Date(round.tipsCloseAt).toLocaleString()}
                      </span>
                    )}
                    {round.tieBreakerFixtureId && (
                      <span className="flex items-center gap-1">
                        <Trophy size={11} />
                        Tie-breaker set
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

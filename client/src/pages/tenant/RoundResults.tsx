import { useState, useRef } from "react";
import { useParams, useLocation } from "wouter";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  ArrowLeft, CheckCircle2, Circle, Trophy, Loader2,
  AlertTriangle, ClipboardCheck, Target,
} from "lucide-react";

// ── Status badge ─────────────────────────────────────────────────────────────
function FixtureStatusBadge({ status }: { status: string }) {
  if (status === "completed")
    return <Badge className="bg-green-100 text-green-700 border border-green-300 text-xs">Completed</Badge>;
  if (status === "in_progress")
    return <Badge className="bg-blue-100 text-blue-700 border border-blue-300 text-xs">Live</Badge>;
  return <Badge variant="outline" className="text-xs">Scheduled</Badge>;
}

// ── Individual fixture score row ──────────────────────────────────────────────
interface FixtureScoreRowProps {
  fixture: {
    id: number;
    status: string;
    homeTeamId: number;
    awayTeamId: number;
    homeScore: number | null;
    awayScore: number | null;
    homeGoals: number | null;
    homeBehinds: number | null;
    awayGoals: number | null;
    awayBehinds: number | null;
    winnerId: number | null;
    venue: string | null;
    startTime: Date | null;
    homeTeam: { id: number; name: string } | null;
    awayTeam: { id: number; name: string } | null;
    winner: { id: number; name: string } | null;
  };
  isAFL: boolean;
  isTieBreaker: boolean;
  roundStatus: string;
  /** tabIndex base — each fixture gets 4 tab stops (homeGoals, homeBehinds, homeTotal, awayGoals, awayBehinds, awayTotal) */
  tabBase: number;
  onSave: (id: number, data: {
    homeScore: number; awayScore: number;
    homeGoals?: number | null; homeBehinds?: number | null;
    awayGoals?: number | null; awayBehinds?: number | null;
  }) => void;
  isSaving: boolean;
}

function FixtureScoreRow({
  fixture: f, isAFL, isTieBreaker, roundStatus, tabBase, onSave, isSaving,
}: FixtureScoreRowProps) {
  const [editing, setEditing] = useState(false);
  const [homeGoals,   setHomeGoals]   = useState(f.homeGoals   != null ? String(f.homeGoals)   : "");
  const [homeBehinds, setHomeBehinds] = useState(f.homeBehinds != null ? String(f.homeBehinds) : "");
  const [homeScore,   setHomeScore]   = useState(f.homeScore   != null ? String(f.homeScore)   : "");
  const [awayGoals,   setAwayGoals]   = useState(f.awayGoals   != null ? String(f.awayGoals)   : "");
  const [awayBehinds, setAwayBehinds] = useState(f.awayBehinds != null ? String(f.awayBehinds) : "");
  const [awayScore,   setAwayScore]   = useState(f.awayScore   != null ? String(f.awayScore)   : "");

  const canEdit = ["upcoming", "open", "closed", "scored"].includes(roundStatus);
  const isComplete = f.status === "completed";

  // Auto-calculate AFL total when goals/behinds change
  const calcAFLTotal = (goals: string, behinds: string) => {
    const g = parseInt(goals, 10);
    const b = parseInt(behinds, 10);
    if (!isNaN(g) && !isNaN(b)) return String(g * 6 + b);
    return "";
  };

  const handleSave = () => {
    const hs = parseInt(homeScore, 10);
    const as_ = parseInt(awayScore, 10);
    if (isNaN(hs) || isNaN(as_)) {
      toast.error("Please enter valid scores for both teams");
      return;
    }
    onSave(f.id, {
      homeScore: hs,
      awayScore: as_,
      homeGoals:   isAFL && homeGoals   !== "" ? parseInt(homeGoals,   10) : null,
      homeBehinds: isAFL && homeBehinds !== "" ? parseInt(homeBehinds, 10) : null,
      awayGoals:   isAFL && awayGoals   !== "" ? parseInt(awayGoals,   10) : null,
      awayBehinds: isAFL && awayBehinds !== "" ? parseInt(awayBehinds, 10) : null,
    });
    setEditing(false);
  };

  const isDraw = isComplete && f.winnerId === null;

  return (
    <div
      className={`rounded-xl border p-4 transition-all ${
        isComplete
          ? "bg-green-50/50 border-green-200"
          : "bg-card border-border hover:border-primary/30"
      }`}
    >
      {/* Top meta row */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <FixtureStatusBadge status={f.status} />
        {isTieBreaker && (
          <Badge className="bg-purple-100 text-purple-700 border border-purple-300 text-xs gap-1">
            <Target size={10} /> Tie-Breaker
          </Badge>
        )}
        {f.venue && <span className="text-xs text-muted-foreground">{f.venue}</span>}
        {f.startTime && (
          <span className="text-xs text-muted-foreground ml-auto">
            {new Date(f.startTime).toLocaleString("en-AU", {
              weekday: "short", day: "numeric", month: "short",
              hour: "2-digit", minute: "2-digit",
            })}
          </span>
        )}
      </div>

      {/* Teams + score display */}
      <div className="flex items-center gap-4">
        {/* Home team */}
        <div className="flex-1 text-center">
          <div className={`font-semibold text-sm ${f.winnerId === f.homeTeamId ? "text-green-700" : ""}`}>
            {f.homeTeam?.name ?? "Home"}
          </div>
          {isComplete && isAFL && f.homeGoals != null && f.homeBehinds != null && (
            <div className="text-xs text-muted-foreground mt-0.5">
              {f.homeGoals}.{f.homeBehinds}
            </div>
          )}
          {f.winnerId === f.homeTeamId && (
            <div className="flex items-center justify-center gap-1 mt-0.5">
              <Trophy size={11} className="text-yellow-500" />
              <span className="text-xs text-green-600 font-medium">Winner</span>
            </div>
          )}
        </div>

        {/* Score */}
        <div className="text-center min-w-[80px]">
          {isComplete && f.homeScore !== null && f.awayScore !== null ? (
            <span className="font-mono font-bold text-lg">{f.homeScore} – {f.awayScore}</span>
          ) : (
            <span className="text-muted-foreground text-sm font-medium">vs</span>
          )}
          {isDraw && <div className="text-xs text-muted-foreground mt-0.5">Draw</div>}
        </div>

        {/* Away team */}
        <div className="flex-1 text-center">
          <div className={`font-semibold text-sm ${f.winnerId === f.awayTeamId ? "text-green-700" : ""}`}>
            {f.awayTeam?.name ?? "Away"}
          </div>
          {isComplete && isAFL && f.awayGoals != null && f.awayBehinds != null && (
            <div className="text-xs text-muted-foreground mt-0.5">
              {f.awayGoals}.{f.awayBehinds}
            </div>
          )}
          {f.winnerId === f.awayTeamId && (
            <div className="flex items-center justify-center gap-1 mt-0.5">
              <Trophy size={11} className="text-yellow-500" />
              <span className="text-xs text-green-600 font-medium">Winner</span>
            </div>
          )}
        </div>
      </div>

      {/* Edit / Save controls */}
      {canEdit && (
        <div className="mt-4 pt-3 border-t border-border/60">
          {editing ? (
            <div className="space-y-3">
              {isAFL ? (
                /* AFL: goals · behinds · total per team */
                <div className="grid grid-cols-2 gap-4">
                  {/* Home */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-center">{f.homeTeam?.name ?? "Home"}</p>
                    <div className="grid grid-cols-3 gap-1">
                      <div className="space-y-1">
                        <Label className="text-xs text-center block">Goals</Label>
                        <Input
                          type="number" min={0} className="h-8 text-sm text-center"
                          value={homeGoals}
                          tabIndex={tabBase}
                          onChange={e => {
                            setHomeGoals(e.target.value);
                            const calc = calcAFLTotal(e.target.value, homeBehinds);
                            if (calc) setHomeScore(calc);
                          }}
                          placeholder="0"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-center block">Behinds</Label>
                        <Input
                          type="number" min={0} className="h-8 text-sm text-center"
                          value={homeBehinds}
                          tabIndex={tabBase + 1}
                          onChange={e => {
                            setHomeBehinds(e.target.value);
                            const calc = calcAFLTotal(homeGoals, e.target.value);
                            if (calc) setHomeScore(calc);
                          }}
                          placeholder="0"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-center block">Total</Label>
                        <Input
                          type="number" min={0} className="h-8 text-sm text-center font-bold"
                          value={homeScore}
                          tabIndex={tabBase + 2}
                          onChange={e => setHomeScore(e.target.value)}
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </div>
                  {/* Away */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-center">{f.awayTeam?.name ?? "Away"}</p>
                    <div className="grid grid-cols-3 gap-1">
                      <div className="space-y-1">
                        <Label className="text-xs text-center block">Goals</Label>
                        <Input
                          type="number" min={0} className="h-8 text-sm text-center"
                          value={awayGoals}
                          tabIndex={tabBase + 3}
                          onChange={e => {
                            setAwayGoals(e.target.value);
                            const calc = calcAFLTotal(e.target.value, awayBehinds);
                            if (calc) setAwayScore(calc);
                          }}
                          placeholder="0"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-center block">Behinds</Label>
                        <Input
                          type="number" min={0} className="h-8 text-sm text-center"
                          value={awayBehinds}
                          tabIndex={tabBase + 4}
                          onChange={e => {
                            setAwayBehinds(e.target.value);
                            const calc = calcAFLTotal(awayGoals, e.target.value);
                            if (calc) setAwayScore(calc);
                          }}
                          placeholder="0"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-center block">Total</Label>
                        <Input
                          type="number" min={0} className="h-8 text-sm text-center font-bold"
                          value={awayScore}
                          tabIndex={tabBase + 5}
                          onChange={e => setAwayScore(e.target.value)}
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* NRL / Netball: just total scores side by side */
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs">{f.homeTeam?.name ?? "Home"} Score</Label>
                    <Input
                      type="number" min={0} className="h-8 text-sm"
                      value={homeScore}
                      tabIndex={tabBase}
                      onChange={e => setHomeScore(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{f.awayTeam?.name ?? "Away"} Score</Label>
                    <Input
                      type="number" min={0} className="h-8 text-sm"
                      value={awayScore}
                      tabIndex={tabBase + 1}
                      onChange={e => setAwayScore(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Equal scores will be recorded as a draw. Winner is determined automatically.
              </p>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
                <Button size="sm" onClick={handleSave} disabled={isSaving} className="gap-1">
                  {isSaving ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                  Save Score
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex justify-end">
              <Button
                variant={isComplete ? "outline" : "default"}
                size="sm"
                className="gap-1 text-xs"
                onClick={() => {
                  setHomeGoals(f.homeGoals   != null ? String(f.homeGoals)   : "");
                  setHomeBehinds(f.homeBehinds != null ? String(f.homeBehinds) : "");
                  setHomeScore(f.homeScore   != null ? String(f.homeScore)   : "");
                  setAwayGoals(f.awayGoals   != null ? String(f.awayGoals)   : "");
                  setAwayBehinds(f.awayBehinds != null ? String(f.awayBehinds) : "");
                  setAwayScore(f.awayScore   != null ? String(f.awayScore)   : "");
                  setEditing(true);
                }}
              >
                {isComplete ? (
                  <><CheckCircle2 size={12} className="text-green-600" /> Edit Score</>
                ) : (
                  <><Circle size={12} /> Enter Score</>
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function RoundResults() {
  const params = useParams<{ compId: string; roundId: string }>();
  const [, navigate] = useLocation();
  const compId = Number(params.compId);
  const roundId = Number(params.roundId);

  const { data: comp } = trpc.competitions.get.useQuery({ id: compId });
  const { data: allSports } = trpc.sports.list.useQuery();
  const sport = allSports?.find(s => s.id === comp?.sportId);
  const isAFL = sport?.name === "AFL";

  const { data: rounds } = trpc.rounds.list.useQuery({ competitionId: compId });
  const round = rounds?.find(r => r.id === roundId);
  const { data: fixtures, refetch: refetchFixtures } = trpc.fixtures.list.useQuery(
    { roundId },
    { enabled: !!roundId },
  );

  const enterScores = trpc.fixtures.enterScores.useMutation({
    onSuccess: (data) => {
      refetchFixtures();
      if ((data as any)?.autoFinalised) {
        toast.success("Score saved — all fixtures complete. Round auto-finalised!");
      } else {
        toast.success("Score saved");
      }
    },
    onError: () => toast.error("Failed to save score"),
  });

  const setRoundStatus = trpc.rounds.setStatus.useMutation({
    onSuccess: () => toast.success("Round status updated"),
    onError: () => toast.error("Failed to update round status"),
  });

  const scoreRound = trpc.leaderboard.scoreRound.useMutation({
    onSuccess: (d) => {
      toast.success(`Round scored — ${d.scored} tip${d.scored !== 1 ? "s" : ""} processed. Leaderboard updated.`);
    },
    onError: (e) => toast.error(e.message ?? "Scoring failed"),
  });

  const completedCount = fixtures?.filter(f => f.status === "completed").length ?? 0;
  const totalCount = fixtures?.length ?? 0;
  const allComplete = totalCount > 0 && completedCount === totalCount;
  const isScored = round?.status === "scored";
  const isClosed = round?.status === "closed";
  const canScore = (isClosed || allComplete) && !isScored && totalCount > 0;

  const tieBreakerFixtureId = round?.tieBreakerFixtureId ?? null;

  const handleSave = (id: number, data: {
    homeScore: number; awayScore: number;
    homeGoals?: number | null; homeBehinds?: number | null;
    awayGoals?: number | null; awayBehinds?: number | null;
  }) => {
    enterScores.mutate({ id, ...data });
  };

  const handleScoreRound = () => {
    scoreRound.mutate({ roundId, competitionId: compId });
  };

  return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start gap-4">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 mt-0.5 text-muted-foreground"
            onClick={() => navigate(`/tenant/competitions/${compId}`)}
          >
            <ArrowLeft size={14} /> Back
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold font-heading">
              {round?.name ?? `Round ${round?.roundNumber ?? "…"}`} — Results
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              {comp?.name ?? "Competition"} · {comp?.season}
              {sport && <> · {sport.name}</>}
            </p>
          </div>
        </div>

        {/* Progress summary card */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold font-mono">{completedCount}/{totalCount}</div>
                  <div className="text-xs text-muted-foreground">Scores entered</div>
                </div>
                <div className="h-8 w-px bg-border" />
                <div>
                  {isScored ? (
                    <Badge className="bg-green-100 text-green-700 border border-green-300 gap-1">
                      <CheckCircle2 size={12} /> Round Scored
                    </Badge>
                  ) : allComplete ? (
                    <Badge className="bg-blue-100 text-blue-700 border border-blue-300 gap-1">
                      <ClipboardCheck size={12} /> Ready to Score
                    </Badge>
                  ) : completedCount > 0 ? (
                    <Badge className="bg-amber-100 text-amber-700 border border-amber-300 gap-1">
                      <Circle size={12} /> Partial Results
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1 text-muted-foreground">
                      <Circle size={12} /> Results Pending
                    </Badge>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2">
                {round?.status === "open" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRoundStatus.mutate({ id: roundId, status: "closed" })}
                    disabled={setRoundStatus.isPending}
                  >
                    Close Tipping
                  </Button>
                )}
                <Button
                  size="sm"
                  className="gap-1"
                  disabled={!canScore || scoreRound.isPending}
                  onClick={handleScoreRound}
                >
                  {scoreRound.isPending ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Trophy size={14} />
                  )}
                  Score Round & Update Leaderboard
                </Button>
              </div>
            </div>

            {/* Progress bar */}
            {totalCount > 0 && (
              <div className="mt-4">
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${(completedCount / totalCount) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {completedCount === totalCount
                    ? "All scores entered — ready to score round"
                    : completedCount > 0
                      ? `${completedCount} of ${totalCount} scores entered — leaderboard updates with each save`
                      : `${totalCount} fixture${totalCount !== 1 ? "s" : ""} need scores`}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Partial scoring info */}
        {completedCount > 0 && !allComplete && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-sm">
            <ClipboardCheck size={16} className="mt-0.5 shrink-0" />
            <span>Scores are saved individually. The leaderboard updates after each save. The round will auto-finalise when all scores are entered.</span>
          </div>
        )}

        {/* Warning if not closed */}
        {round?.status === "open" && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span>Tipping is still open for this round. Consider closing tipping before entering results to prevent participants from changing their picks.</span>
          </div>
        )}

        {/* Already scored notice */}
        {isScored && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-green-50 border border-green-200 text-green-800 text-sm">
            <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
            <span>This round has been scored and the leaderboard has been updated. You can still edit individual scores and re-score if needed.</span>
          </div>
        )}

        {/* AFL score entry guide */}
        {isAFL && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-purple-50 border border-purple-200 text-purple-800 text-sm">
            <Target size={16} className="mt-0.5 shrink-0" />
            <span>AFL scoring: enter Goals and Behinds and the Total will be calculated automatically (Goals × 6 + Behinds). You can also enter the Total directly. Only the Total is used for calculations.</span>
          </div>
        )}

        {/* Fixture cards */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Fixtures
              {tieBreakerFixtureId && (
                <span className="ml-2 text-xs font-normal text-purple-600">
                  · Tie-breaker fixture is highlighted
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!fixtures?.length ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No fixtures have been added to this round yet.
              </div>
            ) : (
              fixtures.map((f, idx) => (
                <FixtureScoreRow
                  key={f.id}
                  fixture={f as any}
                  isAFL={isAFL}
                  isTieBreaker={f.id === tieBreakerFixtureId}
                  roundStatus={round?.status ?? "upcoming"}
                  tabBase={idx * 6 + 1}
                  onSave={handleSave}
                  isSaving={enterScores.isPending}
                />
              ))
            )}
          </CardContent>
        </Card>

        {/* Re-score button (bottom) if already scored */}
        {isScored && (
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              disabled={scoreRound.isPending}
              onClick={handleScoreRound}
            >
              {scoreRound.isPending ? <Loader2 size={12} className="animate-spin" /> : <Trophy size={12} />}
              Re-score Round
            </Button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

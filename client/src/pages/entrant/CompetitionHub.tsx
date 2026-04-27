import { useState, useMemo } from "react";
import { useParams } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Trophy, CheckCircle2, XCircle, Circle, ChevronLeft,
  Flame, Clock, AlertCircle, Lock, MapPin, Calendar,
  ChevronDown, ChevronUp, Minus, BarChart2,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from "recharts";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Link } from "wouter";

const RANK_BADGE: Record<number, { label: string; cls: string }> = {
  1: { label: "Gold",   cls: "bg-yellow-100 text-yellow-700 border border-yellow-300" },
  2: { label: "Silver", cls: "bg-gray-100 text-gray-600 border border-gray-300" },
  3: { label: "Bronze", cls: "bg-orange-100 text-orange-700 border border-orange-300" },
};

const ROUND_STATUS_CLS: Record<string, string> = {
  open:     "text-green-600",
  upcoming: "text-blue-500",
  closed:   "text-yellow-600",
  scored:   "text-purple-600",
};

function formatMatchTime(ts: Date | string | null | undefined): string {
  if (!ts) return "Time TBC";
  const d = new Date(ts);
  return d.toLocaleString("en-AU", {
    weekday: "short", day: "numeric", month: "short",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function CompetitionHub() {
  const params = useParams<{ id: string }>();
  const compId = Number(params.id);
  const { user } = useAuth();

  const { data: comp }         = trpc.competitions.get.useQuery({ id: compId });
  const { data: currentRound } = trpc.rounds.getCurrent.useQuery({ competitionId: compId });
  const { data: allRounds }    = trpc.rounds.list.useQuery({ competitionId: compId });
  const { data: leaderboard }  = trpc.leaderboard.get.useQuery({ competitionId: compId });
  const { data: prizes }       = trpc.prizes.list.useQuery({ competitionId: compId });
  const { data: history }      = trpc.tips.myHistory.useQuery({ competitionId: compId });
  const { data: roundBreakdown } = trpc.tips.myRoundBreakdown.useQuery({ competitionId: compId });

  const [selectedRoundId, setSelectedRoundId] = useState<number | null>(null);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [showChart, setShowChart] = useState(false);
  // Tie-breaker: local state per fixture (fixtureId -> value string)
  const [tieBreakerValues, setTieBreakerValues] = useState<Record<number, string>>({});
  // Joker: local state per round (roundId -> boolean)
  const [jokerRounds, setJokerRounds] = useState<Record<number, boolean>>({});

  // Active round: next after last scored → open → first with fixtures → first
  const activeRoundId = useMemo(() => {
    if (selectedRoundId) return selectedRoundId;
    if (allRounds && allRounds.length > 0) {
      const scoredRounds = allRounds
        .filter(r => r.status === "scored")
        .sort((a, b) => b.roundNumber - a.roundNumber);
      if (scoredRounds.length > 0) {
        const lastScoredNumber = scoredRounds[0].roundNumber;
        const nextRound = allRounds
          .filter(r => r.roundNumber > lastScoredNumber)
          .sort((a, b) => a.roundNumber - b.roundNumber)[0];
        if (nextRound) return nextRound.id;
      }
      if (currentRound?.id) return currentRound.id;
      const withFixtures = allRounds.find(
        r => ((r as typeof r & { fixtureCount?: number }).fixtureCount ?? 0) > 0
      );
      if (withFixtures) return withFixtures.id;
      return allRounds[0]?.id ?? null;
    }
    if (currentRound?.id) return currentRound.id;
    return null;
  }, [selectedRoundId, currentRound, allRounds]);

  const { data: roundTips, refetch: refetchTips } = trpc.tips.myRoundTips.useQuery(
    { roundId: activeRoundId!, competitionId: compId },
    { enabled: !!activeRoundId }
  );

  // Previous scored round (for summary card)
  const previousScoredRound = useMemo(() => {
    if (!allRounds || !activeRoundId) return null;
    const activeRoundNumber = allRounds.find(r => r.id === activeRoundId)?.roundNumber ?? Infinity;
    const scored = allRounds
      .filter(r => r.status === "scored" && r.roundNumber < activeRoundNumber)
      .sort((a, b) => b.roundNumber - a.roundNumber);
    return scored[0] ?? null;
  }, [allRounds, activeRoundId]);

  const { data: prevRoundSummary } = trpc.tips.myRoundSummary.useQuery(
    { roundId: previousScoredRound!.id, competitionId: compId },
    { enabled: !!previousScoredRound }
  );

  const submitTip = trpc.tips.submit.useMutation({
    onSuccess: () => { refetchTips(); toast.success("Tip saved!"); },
    onError: () => toast.error("Could not save tip."),
  });

  const myEntry     = leaderboard?.find(e => e.userId === user?.id);
  const activeRound = allRounds?.find(r => r.id === activeRoundId);
  const allowDraw         = (comp as (typeof comp & { allowDraw?: boolean }) | null)?.allowDraw ?? false;
  const jokerRoundEnabled = (comp as (typeof comp & { jokerRoundEnabled?: boolean }) | null)?.jokerRoundEnabled ?? false;
  const jokerMultiplier   = (comp as (typeof comp & { jokerMultiplier?: number }) | null)?.jokerMultiplier ?? 2;
  const jokerRoundId      = (comp as (typeof comp & { jokerRoundId?: number | null }) | null)?.jokerRoundId ?? null;
  // Joker available if enabled AND (no specific round set OR this is the joker round)
  const jokerAvailableThisRound = jokerRoundEnabled && (jokerRoundId === null || jokerRoundId === activeRoundId);
  const useJokerThisRound = jokerAvailableThisRound && !!(activeRoundId && jokerRounds[activeRoundId]);
  // Derive fixtures and byeTeams from new myRoundTips shape
  const roundData = roundTips as { fixtures: { fixture: { id: number; homeTeamId: number; awayTeamId: number; winnerId: number | null; homeScore: number | null; awayScore: number | null; margin: number | null; venue: string | null; startTime: Date | null; status: string; tieBreakerFixtureId?: never; homeTeam: { id: number; name: string; abbreviation: string | null } | null; awayTeam: { id: number; name: string; abbreviation: string | null } | null; winner: { id: number; name: string } | null }; tip: { id: number; pickedTeamId: number | null; isDraw: boolean | null; isCorrect: boolean | null; pointsEarned: number | null; tieBreakerValue: number | null; useJoker: boolean | null } | null; pickedTeam: { id: number; name: string; abbreviation: string | null } | null }[]; byeTeams: { id: number; name: string; abbreviation: string | null }[] } | undefined;
  const roundFixtures = roundData?.fixtures ?? [];
  const byeTeams      = roundData?.byeTeams ?? [];

  // History: group by round for display
  const historyByRound = useMemo(() => {
    if (!history?.length) return [];
    const groups: Record<number, { roundLabel: string; roundNumber: number; tips: typeof history }> = {};
    for (const t of history) {
      const roundId = t.round?.id ?? 0;
      if (!groups[roundId]) {
        groups[roundId] = {
          roundLabel:  t.round?.name ?? `Round ${t.round?.roundNumber ?? "?"}`,
          roundNumber: t.round?.roundNumber ?? 0,
          tips: [],
        };
      }
      groups[roundId].tips.push(t);
    }
    return Object.values(groups).sort((a, b) => b.roundNumber - a.roundNumber);
  }, [history]);

  // Build a lookup: roundId -> tips[] for use in breakdown
  const historyByRoundId = useMemo(() => {
    if (!history?.length) return {} as Record<number, typeof history>;
    const map: Record<number, typeof history> = {};
    for (const t of history) {
      const rid = t.round?.id ?? 0;
      if (!map[rid]) map[rid] = [];
      map[rid].push(t);
    }
    return map;
  }, [history]);

  return (
    <div className="min-h-screen bg-background">
      {/* Top nav */}
      <header className="h-14 border-b border-border bg-card flex items-center px-4 gap-3">
        <Link href="/my-competitions">
          <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground">
            <ChevronLeft size={14} /> Back
          </Button>
        </Link>
        <div className="w-7 h-7 rounded bg-accent flex items-center justify-center">
          <Trophy size={14} className="text-accent-foreground" />
        </div>
        <span className="font-heading font-bold text-base truncate">{comp?.name ?? "Competition"}</span>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* My stats card */}
        {myEntry && (
          <Card className="bg-primary text-primary-foreground overflow-hidden">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium opacity-70 uppercase tracking-wide">My Position</p>
                  <div className="flex items-center gap-2 mt-1">
                    {myEntry.rankBadge ? (
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${RANK_BADGE[myEntry.rank]?.cls ?? ""}`}>
                        {myEntry.rankBadge}
                      </span>
                    ) : (
                      <span className="text-2xl font-bold font-mono">#{myEntry.rank}</span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold font-mono">{myEntry.totalPoints}</p>
                  <p className="text-xs opacity-70">points</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold font-mono">{myEntry.correctTips}/{myEntry.totalTips}</p>
                  <p className="text-xs opacity-70">correct</p>
                </div>
                {myEntry.currentStreak > 0 && (
                  <div className="flex items-center gap-1 text-accent">
                    <Flame size={16} />
                    <span className="font-bold">{myEntry.currentStreak}</span>
                    <span className="text-xs opacity-70">streak</span>
                  </div>
                )}
              </div>

              {/* Round-by-round breakdown toggle */}
              {roundBreakdown && roundBreakdown.length > 0 && (
                <div className="mt-3 border-t border-white/20 pt-3 space-y-2">
                  {/* Breakdown rows */}
                  <button
                    className="flex items-center gap-1.5 text-xs font-medium opacity-80 hover:opacity-100 transition-opacity"
                    onClick={() => setShowBreakdown(v => !v)}
                  >
                    {showBreakdown ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    Round-by-round breakdown
                  </button>
                  {showBreakdown && (
                    <div className="mt-1 space-y-2 max-h-64 overflow-y-auto pr-1">
                      <TooltipProvider delayDuration={200}>
                        {roundBreakdown.map(r => {
                          const roundTips = historyByRoundId[r.roundId] ?? [];
                          return (
                            <div key={r.roundId} className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="opacity-70 truncate font-semibold">{r.roundLabel}</span>
                                <div className="flex items-center gap-3 shrink-0 ml-2">
                                  <span className="opacity-60">{r.correct}/{r.total}</span>
                                  <span className="font-mono font-bold">+{r.points}</span>
                                </div>
                              </div>
                              {/* Fixture-level tipped teams */}
                              {roundTips.length > 0 && (
                                <div className="pl-2 space-y-0.5">
                                  {roundTips.map(t => {
                                    const home = t.fixture?.homeTeam;
                                    const away = t.fixture?.awayTeam;
                                    const picked = t.isDraw ? "Draw" : t.pickedTeam?.abbreviation ?? t.pickedTeam?.name ?? "?";
                                    const matchup = home && away ? `${home.abbreviation ?? home.name} v ${away.abbreviation ?? away.name}` : "Match";
                                    return (
                                      <Tooltip key={t.id}>
                                        <TooltipTrigger asChild>
                                          <div className="flex items-center justify-between text-xs cursor-default">
                                            <span className="opacity-50 truncate">{matchup}</span>
                                            <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                              {t.isCorrect === true  && <CheckCircle2 size={10} className="text-green-400" />}
                                              {t.isCorrect === false && <XCircle size={10} className="text-red-400" />}
                                              {t.isCorrect === null  && <Circle size={10} className="opacity-40" />}
                                              <span className={`font-semibold ${
                                                t.isCorrect === true ? "text-green-300" :
                                                t.isCorrect === false ? "text-red-300" : "opacity-60"
                                              }`}>{picked}</span>
                                            </div>
                                          </div>
                                        </TooltipTrigger>
                                        <TooltipContent side="left" className="text-xs max-w-[200px]">
                                          <p className="font-semibold">{home?.name ?? "Home"} v {away?.name ?? "Away"}</p>
                                          <p>Tipped: <span className="font-bold">{t.isDraw ? "Draw" : t.pickedTeam?.name ?? "?"}</span></p>
                                          {t.fixture?.venue && <p className="opacity-70">{t.fixture.venue}</p>}
                                          {t.pointsEarned !== null && <p>Points: +{t.pointsEarned}</p>}
                                        </TooltipContent>
                                      </Tooltip>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </TooltipProvider>
                    </div>
                  )}

                  {/* Season accuracy chart toggle */}
                  <button
                    className="flex items-center gap-1.5 text-xs font-medium opacity-80 hover:opacity-100 transition-opacity"
                    onClick={() => setShowChart(v => !v)}
                  >
                    {showChart ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    <BarChart2 size={12} />
                    Season accuracy chart
                  </button>
                  {showChart && (
                    <div className="mt-1">
                      <ResponsiveContainer width="100%" height={110}>
                        <BarChart
                          data={roundBreakdown.map(r => ({
                            label: r.roundLabel.replace(/^Round /i, "R"),
                            accuracy: r.total > 0 ? Math.round((r.correct / r.total) * 100) : 0,
                            correct: r.correct,
                            total: r.total,
                          }))}
                          margin={{ top: 4, right: 4, left: -28, bottom: 0 }}
                          barCategoryGap="20%"
                        >
                          <XAxis dataKey="label" tick={{ fontSize: 9, fill: "rgba(255,255,255,0.6)" }} axisLine={false} tickLine={false} />
                          <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: "rgba(255,255,255,0.6)" }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                          <RechartsTooltip
                            contentStyle={{ background: "#1e293b", border: "none", borderRadius: 6, fontSize: 11 }}
                            labelStyle={{ color: "#fff", fontWeight: 600 }}
                            formatter={(value: number, _name: string, props: { payload?: { correct: number; total: number } }) => [
                              `${value}% (${props.payload?.correct ?? 0}/${props.payload?.total ?? 0})`,
                              "Accuracy",
                            ]}
                          />
                          <Bar dataKey="accuracy" radius={[3, 3, 0, 0]}>
                            {roundBreakdown.map((r) => (
                              <Cell
                                key={r.roundId}
                                fill={
                                  r.total > 0 && (r.correct / r.total) >= 0.7 ? "#4ade80" :
                                  r.total > 0 && (r.correct / r.total) >= 0.5 ? "#facc15" : "#f87171"
                                }
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                      <p className="text-center text-[10px] opacity-50 mt-0.5">Accuracy % per scored round</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="tips">
          <TabsList className="w-full">
            <TabsTrigger value="tips" className="flex-1">Submit Tips</TabsTrigger>
            <TabsTrigger value="history" className="flex-1">My History</TabsTrigger>
            <TabsTrigger value="leaderboard" className="flex-1">Leaderboard</TabsTrigger>
            <TabsTrigger value="prizes" className="flex-1">Prizes</TabsTrigger>
          </TabsList>

          {/* ── TIPS TAB ─────────────────────────────────────────────── */}
          <TabsContent value="tips" className="mt-4 space-y-4">

            {/* Previous round results summary card */}
            {prevRoundSummary && (
              <div className="flex items-center gap-4 px-4 py-3 rounded-lg border bg-muted/40 border-border">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {prevRoundSummary.roundLabel} Results
                  </p>
                  <p className="text-sm font-semibold mt-0.5">
                    {prevRoundSummary.correctTips}/{prevRoundSummary.totalTips} correct
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xl font-bold font-mono text-primary">+{prevRoundSummary.pointsEarned}</p>
                  <p className="text-xs text-muted-foreground">pts earned</p>
                </div>
                <div className="hidden sm:flex flex-col items-end gap-1 shrink-0 w-20">
                  <div className="w-full h-1.5 rounded-full bg-border overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${Math.round((prevRoundSummary.correctTips / prevRoundSummary.totalTips) * 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {Math.round((prevRoundSummary.correctTips / prevRoundSummary.totalTips) * 100)}% accuracy
                  </p>
                </div>
              </div>
            )}

            {/* Round selector */}
            {allRounds && allRounds.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {allRounds.map(r => {
                  const fc = (r as typeof r & { fixtureCount?: number }).fixtureCount ?? 0;
                  const isActive = r.id === activeRoundId;
                  const statusCls = ROUND_STATUS_CLS[r.status] ?? "text-muted-foreground";
                  return (
                    <button
                      key={r.id}
                      onClick={() => setSelectedRoundId(r.id)}
                      className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                        isActive
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-border hover:border-primary/50 text-foreground"
                      }`}
                    >
                      {r.status === "open" && (
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                      )}
                      <span>{r.name ?? `R${r.roundNumber}`}</span>
                      {fc > 0 && (
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-mono ${
                          isActive ? "bg-white/20 text-white" : "bg-background text-muted-foreground"
                        }`}>
                          {fc}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Deadline / status banner */}
            {activeRound && (() => {
              const deadline = activeRound.tipsCloseAt ? new Date(activeRound.tipsCloseAt) : null;
              const now = new Date();
              const deadlinePassed = deadline ? now > deadline : false;
              const roundClosed = activeRound.status !== "open";

              if (deadlinePassed || roundClosed) {
                const reason = activeRound.status === "upcoming"
                  ? "Tipping has not opened yet for this round."
                  : activeRound.status === "scored"
                  ? "This round has been scored. Results are shown below."
                  : deadlinePassed
                  ? `The tipping deadline passed on ${deadline!.toLocaleString("en-AU", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}.`
                  : "Tipping is closed for this round.";
                return (
                  <div className="flex items-center gap-3 px-4 py-3 rounded-lg border bg-muted/60 border-border text-sm font-medium text-muted-foreground">
                    <Lock size={16} className="shrink-0" />
                    <span>{reason}</span>
                  </div>
                );
              }

              if (!deadline) return null;
              const msLeft = deadline.getTime() - now.getTime();
              const hoursLeft = msLeft / (1000 * 60 * 60);
              const isUrgent = hoursLeft < 24;
              return (
                <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-sm font-medium ${
                  isUrgent
                    ? "bg-orange-50 border-orange-200 text-orange-800 dark:bg-orange-900/20 dark:border-orange-800 dark:text-orange-300"
                    : "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300"
                }`}>
                  {isUrgent ? <AlertCircle size={16} className="shrink-0" /> : <Clock size={16} className="shrink-0" />}
                  <div>
                    <span className="font-semibold">Tips close </span>
                    <span>
                      {deadline.toLocaleString("en-AU", {
                        weekday: "long", day: "numeric", month: "long",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </span>
                    {isUrgent && (
                      <span className="ml-2 font-bold">({Math.ceil(hoursLeft)}h left!)</span>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Joker round toggle */}
            {jokerAvailableThisRound && activeRoundId && (
              <div className="flex items-center justify-between px-4 py-3 rounded-lg border border-amber-300 bg-amber-50/60 dark:bg-amber-900/10">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🃏</span>
                  <div>
                    <p className="text-sm font-semibold">Use Joker this round</p>
                    <p className="text-xs text-muted-foreground">Multiplies your points by {jokerMultiplier}× for this round</p>
                  </div>
                </div>
                <button
                  onClick={() => setJokerRounds(prev => ({ ...prev, [activeRoundId]: !prev[activeRoundId] }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                    useJokerThisRound ? "bg-amber-500" : "bg-muted"
                  }`}
                  role="switch"
                  aria-checked={useJokerThisRound}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    useJokerThisRound ? "translate-x-6" : "translate-x-1"
                  }`} />
                </button>
              </div>
            )}

            {/* Fixtures list */}
            {!activeRoundId ? (
              <Card>
                <CardContent className="text-center py-12 text-muted-foreground">
                  No rounds found for this competition.
                </CardContent>
              </Card>
            ) : !roundTips ? (
              <Card>
                <CardContent className="text-center py-12 text-muted-foreground">
                  Loading fixtures…
                </CardContent>
              </Card>
            ) : roundFixtures.length === 0 ? (
              <Card>
                <CardContent className="text-center py-10 space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">No fixtures loaded for this round yet.</p>
                  <p className="text-xs text-muted-foreground">The administrator will add fixtures before the round opens.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {roundFixtures.map(({ fixture, tip }) => {
                  const isTieBreaker = activeRound?.tieBreakerFixtureId === fixture.id;
                  const isOpen = activeRound?.status === "open";
                  const deadline = activeRound?.tipsCloseAt ? new Date(activeRound.tipsCloseAt) : null;
                  const deadlinePassed = deadline ? new Date() > deadline : false;
                  const isLocked = !isOpen || deadlinePassed;
                  const isScored = fixture.status === "completed";
                  const isDrawResult = isScored && fixture.winnerId === null;

                  return (
                    <Card
                      key={fixture.id}
                      className={[
                        tip?.isCorrect === true  ? "border-green-300 bg-green-50/30 dark:bg-green-900/10" : "",
                        tip?.isCorrect === false ? "border-red-300 bg-red-50/30 dark:bg-red-900/10" : "",
                        isLocked && !isScored ? "opacity-80" : "",
                      ].filter(Boolean).join(" ")}
                    >
                      <CardContent className="py-4 space-y-3">
                        {/* Match header */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            {tip?.isCorrect === true  && <CheckCircle2 size={15} className="text-green-600 shrink-0" />}
                            {tip?.isCorrect === false && <XCircle size={15} className="text-red-500 shrink-0" />}
                            {tip?.isCorrect === null && tip && <Circle size={15} className="text-muted-foreground shrink-0" />}
                            <span className="text-sm font-semibold truncate">
                              {fixture.homeTeam?.name ?? "Home"}{" "}
                              <span className="text-muted-foreground font-normal">v</span>{" "}
                              {fixture.awayTeam?.name ?? "Away"}
                            </span>
                          </div>
                          {isLocked && !isScored && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                              <Lock size={11} /> Locked
                            </span>
                          )}
                          {isScored && (
                            <span className="text-xs font-semibold shrink-0">
                              {isDrawResult
                                ? <span className="text-yellow-600">Draw</span>
                                : <span className="text-green-600">{fixture.winner?.name} won</span>
                              }
                            </span>
                          )}
                        </div>

                        {/* Venue & start time */}
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MapPin size={11} className="shrink-0" />
                            {fixture.venue ?? <span className="italic">Venue TBC</span>}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar size={11} className="shrink-0" />
                            {formatMatchTime(fixture.startTime)}
                          </span>
                        </div>

                        {/* Team pick buttons + optional Draw button */}
                        <div className="flex items-center gap-2">
                          <TeamButton
                            team={fixture.homeTeam}
                            selected={!tip?.isDraw && tip?.pickedTeamId === fixture.homeTeamId}
                            correct={isScored ? fixture.winnerId === fixture.homeTeamId : undefined}
                            disabled={isLocked}
                            onClick={() => {
                              if (isLocked) {
                                toast.error(deadlinePassed ? "The tipping deadline has passed." : "Tipping is closed for this round.");
                                return;
                              }
                              submitTip.mutate({ fixtureId: fixture.id, competitionId: compId, pickedTeamId: fixture.homeTeamId, isDraw: false });
                            }}
                          />
                          {allowDraw && (
                            <DrawButton
                              selected={tip?.isDraw === true}
                              correct={isScored ? isDrawResult : undefined}
                              disabled={isLocked}
                              onClick={() => {
                                if (isLocked) {
                                  toast.error(deadlinePassed ? "The tipping deadline has passed." : "Tipping is closed for this round.");
                                  return;
                                }
                                submitTip.mutate({ fixtureId: fixture.id, competitionId: compId, isDraw: true });
                              }}
                            />
                          )}
                          <TeamButton
                            team={fixture.awayTeam}
                            selected={!tip?.isDraw && tip?.pickedTeamId === fixture.awayTeamId}
                            correct={isScored ? fixture.winnerId === fixture.awayTeamId : undefined}
                            disabled={isLocked}
                            onClick={() => {
                              if (isLocked) {
                                toast.error(deadlinePassed ? "The tipping deadline has passed." : "Tipping is closed for this round.");
                                return;
                              }
                              submitTip.mutate({ fixtureId: fixture.id, competitionId: compId, pickedTeamId: fixture.awayTeamId, isDraw: false });
                            }}
                          />
                        </div>

                        {/* Tie-breaker input */}
                        {isTieBreaker && !isLocked && (
                          <div className="flex items-center gap-2 pt-1">
                            <span className="text-xs text-muted-foreground font-medium shrink-0">Tie-breaker — predicted total score:</span>
                            <input
                              type="number"
                              min={0}
                              className="w-20 h-7 rounded border border-border bg-background px-2 text-sm text-center focus:outline-none focus:ring-1 focus:ring-primary"
                              placeholder="0"
                              value={tieBreakerValues[fixture.id] ?? (tip?.tieBreakerValue != null ? String(tip.tieBreakerValue) : "")}
                              onChange={e => setTieBreakerValues(prev => ({ ...prev, [fixture.id]: e.target.value }))}
                              onBlur={e => {
                                const val = e.target.value === "" ? null : parseInt(e.target.value, 10);
                                if (!isNaN(val as number) || val === null) {
                                  submitTip.mutate({
                                    fixtureId: fixture.id,
                                    competitionId: compId,
                                    pickedTeamId: tip?.pickedTeamId ?? null,
                                    isDraw: tip?.isDraw ?? false,
                                    tieBreakerValue: val,
                                    useJoker: useJokerThisRound,
                                  });
                                }
                              }}
                            />
                          </div>
                        )}
                        {isTieBreaker && isLocked && tip?.tieBreakerValue != null && (
                          <div className="text-xs text-muted-foreground pt-1">
                            Tie-breaker prediction: <span className="font-semibold text-foreground">{tip.tieBreakerValue}</span>
                          </div>
                        )}
                        {isTieBreaker && (
                          <div className="mt-1">
                            <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 px-2 py-0.5 rounded-full font-medium">
                              🏆 Tie-breaker fixture
                            </span>
                          </div>
                        )}

                        {/* Final score */}
                        {isScored && fixture.homeScore !== null && fixture.awayScore !== null && (
                          <div className="text-center text-xs text-muted-foreground font-mono">
                            Final: {fixture.homeTeam?.abbreviation ?? fixture.homeTeam?.name ?? "Home"}{" "}
                            <span className="font-bold text-foreground">{fixture.homeScore} – {fixture.awayScore}</span>{" "}
                            {fixture.awayTeam?.abbreviation ?? fixture.awayTeam?.name ?? "Away"}
                            {(fixture as { margin?: number | null }).margin != null && (
                              <span className="ml-2 text-muted-foreground">(margin: {(fixture as { margin?: number | null }).margin})</span>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}

                {/* Bye teams section */}
                {byeTeams.length > 0 && (
                  <div className="pt-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Teams with a bye this round</p>
                    <div className="flex flex-wrap gap-2">
                      {byeTeams.map(t => (
                        <span key={t.id} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border">
                          {t.name}{t.abbreviation ? ` (${t.abbreviation})` : ""}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* ── HISTORY TAB ────────────────────────────────────────── */}
          <TabsContent value="history" className="mt-4 space-y-3">
            {!historyByRound.length ? (
              <Card>
                <CardContent className="text-center py-12 text-muted-foreground">No tips submitted yet.</CardContent>
              </Card>
            ) : (
              historyByRound.map(group => (
                <Card key={group.roundNumber}>
                  <CardContent className="p-0">
                    <div className="px-4 py-2.5 border-b border-border bg-muted/30">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        {group.roundLabel}
                      </p>
                    </div>
                    <div className="divide-y divide-border">
                      {group.tips.map(t => {
                        const homeTeam = t.fixture?.homeTeam;
                        const awayTeam = t.fixture?.awayTeam;
                        const matchLabel = homeTeam && awayTeam
                          ? `${homeTeam.name} v ${awayTeam.name}`
                          : "Unknown match";
                        const pickedLabel = t.isDraw
                          ? "Draw"
                          : t.pickedTeam?.name ?? "Unknown";
                        const isDrawResult = t.fixture?.winnerId === null && t.fixture?.homeScore !== null;

                        return (
                          <div key={t.id} className="px-4 py-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-2.5 min-w-0">
                                <div className="mt-0.5 shrink-0">
                                  {t.isCorrect === true  && <CheckCircle2 size={15} className="text-green-600" />}
                                  {t.isCorrect === false && <XCircle size={15} className="text-red-500" />}
                                  {t.isCorrect === null  && <Circle size={15} className="text-muted-foreground" />}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium truncate">{matchLabel}</p>
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    Tipped: <span className="font-semibold text-foreground">{pickedLabel}</span>
                                    {t.fixture?.venue && (
                                      <span className="ml-2 opacity-60">· {t.fixture.venue}</span>
                                    )}
                                  </p>
                                  {/* Result row for scored fixtures */}
                                  {t.fixture && t.fixture.homeScore !== null && t.fixture.awayScore !== null && (
                                    <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                                      {homeTeam?.abbreviation ?? homeTeam?.name}{" "}
                                      <span className="font-bold text-foreground">
                                        {t.fixture.homeScore} – {t.fixture.awayScore}
                                      </span>{" "}
                                      {awayTeam?.abbreviation ?? awayTeam?.name}
                                      {isDrawResult && <span className="ml-1 text-yellow-600 font-semibold">(Draw)</span>}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <span className="font-mono text-sm font-bold text-primary">+{t.pointsEarned}</span>
                                <p className="text-xs text-muted-foreground">pts</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* ── LEADERBOARD TAB ────────────────────────────────────── */}
          <TabsContent value="leaderboard" className="mt-4">
            <Card>
              <CardContent className="p-0">
                {!leaderboard?.length ? (
                  <div className="text-center py-12 text-muted-foreground">No entries yet.</div>
                ) : (
                  <div className="divide-y divide-border">
                    {leaderboard.map(entry => (
                      <div
                        key={entry.id}
                        className={`flex items-center gap-3 px-4 py-3 ${entry.userId === user?.id ? "bg-primary/5" : ""}`}
                      >
                        <div className="w-10 shrink-0">
                          {entry.rankBadge ? (
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${RANK_BADGE[entry.rank]?.cls ?? ""}`}>
                              {entry.rankBadge}
                            </span>
                          ) : (
                            <span className="font-mono text-sm text-muted-foreground">#{entry.rank}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${entry.userId === user?.id ? "text-primary font-bold" : ""}`}>
                            {entry.user?.name ?? "Unknown"}
                            {entry.userId === user?.id && <span className="text-xs ml-1">(you)</span>}
                          </p>
                          <p className="text-xs text-muted-foreground">{entry.correctTips}/{entry.totalTips} correct</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-mono font-bold text-primary">{entry.totalPoints}</p>
                          <p className="text-xs text-muted-foreground">pts</p>
                        </div>
                        {entry.currentStreak > 1 && (
                          <div className="flex items-center gap-0.5 text-secondary shrink-0">
                            <Flame size={14} />
                            <span className="text-xs font-bold">{entry.currentStreak}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── PRIZES TAB ─────────────────────────────────────────── */}
          <TabsContent value="prizes" className="mt-4">
            {!prizes?.length ? (
              <Card>
                <CardContent className="text-center py-12 text-muted-foreground">No prizes announced yet.</CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {prizes.map(p => (
                  <Card key={p.id}>
                    <CardContent className="py-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-accent/20 rounded-lg shrink-0">
                          <Trophy size={18} className="text-accent-foreground" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-sm">{p.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{p.description}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-muted capitalize">{p.type}</span>
                            {p.isAwarded && (
                              <span className="text-xs text-green-600 font-semibold flex items-center gap-1">
                                <CheckCircle2 size={12} /> Awarded to {p.awardedTo?.name ?? "winner"}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function TeamButton({
  team, selected, correct, disabled, onClick,
}: {
  team: { id: number; name: string; abbreviation?: string | null } | null;
  selected: boolean;
  correct?: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const base = "flex-1 flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all font-medium text-sm";
  const state = selected
    ? correct === true  ? "border-green-500 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300"
      : correct === false ? "border-red-400 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400"
      : "border-primary bg-primary/10 text-primary"
    : disabled
    ? "border-border bg-muted/30 text-muted-foreground cursor-default"
    : "border-border hover:border-primary/50 hover:bg-primary/5 cursor-pointer";

  return (
    <button className={`${base} ${state}`} onClick={onClick} disabled={disabled}>
      <span className="text-lg font-bold">{team?.abbreviation ?? team?.name?.charAt(0) ?? "?"}</span>
      <span className="text-xs mt-0.5 text-center leading-tight">{team?.name ?? "TBD"}</span>
    </button>
  );
}

function DrawButton({
  selected, correct, disabled, onClick,
}: {
  selected: boolean;
  correct?: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const base = "flex flex-col items-center justify-center px-3 py-3 rounded-xl border-2 transition-all font-medium text-sm min-w-[56px]";
  const state = selected
    ? correct === true  ? "border-green-500 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300"
      : correct === false ? "border-red-400 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400"
      : "border-yellow-500 bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300"
    : disabled
    ? "border-border bg-muted/30 text-muted-foreground cursor-default"
    : "border-border hover:border-yellow-400 hover:bg-yellow-50/50 cursor-pointer text-muted-foreground";

  return (
    <button className={`${base} ${state}`} onClick={onClick} disabled={disabled}>
      <Minus size={16} />
      <span className="text-xs mt-0.5">Draw</span>
    </button>
  );
}

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
} from "lucide-react";
import { Link } from "wouter";

const RANK_BADGE: Record<number, { label: string; cls: string }> = {
  1: { label: "Gold",   cls: "bg-yellow-100 text-yellow-700 border border-yellow-300" },
  2: { label: "Silver", cls: "bg-gray-100 text-gray-600 border border-gray-300" },
  3: { label: "Bronze", cls: "bg-orange-100 text-orange-700 border border-orange-300" },
};

/** Round status pill colours */
const ROUND_STATUS_CLS: Record<string, string> = {
  open:     "text-green-600",
  upcoming: "text-blue-500",
  closed:   "text-yellow-600",
  scored:   "text-purple-600",
};

/** Format a UTC timestamp as a readable local date/time */
function formatMatchTime(ts: Date | string | null | undefined): string {
  if (!ts) return "Time TBC";
  const d = new Date(ts);
  return d.toLocaleString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function CompetitionHub() {
  const params = useParams<{ id: string }>();
  const compId = Number(params.id);
  const { user } = useAuth();

  const { data: comp } = trpc.competitions.get.useQuery({ id: compId });
  const { data: currentRound } = trpc.rounds.getCurrent.useQuery({ competitionId: compId });
  const { data: allRounds } = trpc.rounds.list.useQuery({ competitionId: compId });
  const { data: leaderboard } = trpc.leaderboard.get.useQuery({ competitionId: compId });
  const { data: myPosition } = trpc.leaderboard.myPosition.useQuery({ competitionId: compId });
  const { data: prizes } = trpc.prizes.list.useQuery({ competitionId: compId });

  const [selectedRoundId, setSelectedRoundId] = useState<number | null>(null);

  /**
   * Active round selection logic (in priority order):
   * 1. Explicit user selection
   * 2. Round immediately after the last scored round (e.g. Round 5 scored → show Round 6)
   * 3. Current open round
   * 4. First round with fixtures loaded (fixtureCount > 0)
   * 5. First round in the list
   */
  const activeRoundId = useMemo(() => {
    if (selectedRoundId) return selectedRoundId;
    if (allRounds && allRounds.length > 0) {
      // Find the highest roundNumber among scored rounds
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
      // Fallback: open round
      if (currentRound?.id) return currentRound.id;
      // Fallback: first round with fixtures
      const withFixtures = allRounds.find(
        r => ((r as typeof r & { fixtureCount?: number }).fixtureCount ?? 0) > 0
      );
      if (withFixtures) return withFixtures.id;
      // Fallback: first round
      return allRounds[0]?.id ?? null;
    }
    if (currentRound?.id) return currentRound.id;
    return null;
  }, [selectedRoundId, currentRound, allRounds]);

  const { data: roundTips, refetch: refetchTips } = trpc.tips.myRoundTips.useQuery(
    { roundId: activeRoundId!, competitionId: compId },
    { enabled: !!activeRoundId }
  );
  const { data: history } = trpc.tips.myHistory.useQuery({ competitionId: compId });

  const submitTip = trpc.tips.submit.useMutation({
    onSuccess: () => { refetchTips(); toast.success("Tip saved!"); },
    onError: () => toast.error("Could not save tip."),
  });

  const myEntry = leaderboard?.find(e => e.userId === user?.id);
  const activeRound = allRounds?.find(r => r.id === activeRoundId);

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
          <Card className="bg-primary text-primary-foreground">
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

            {/* Round selector — all rounds, with fixture count and status indicator */}
            {allRounds && allRounds.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {allRounds.map(r => {
                  const fc = (r as typeof r & { fixtureCount?: number }).fixtureCount ?? 0;
                  const statusCls = ROUND_STATUS_CLS[r.status] ?? "text-muted-foreground";
                  const isActive = activeRoundId === r.id;
                  return (
                    <button
                      key={r.id}
                      onClick={() => setSelectedRoundId(r.id)}
                      className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {r.name ?? `Round ${r.roundNumber}`}
                      {/* Status dot */}
                      {r.status === "open" && (
                        <span className={`${isActive ? "text-green-300" : statusCls}`}>●</span>
                      )}
                      {/* Fixture count badge */}
                      {fc > 0 && (
                        <span className={`text-[10px] px-1.5 py-0 rounded-full font-bold ${
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

            {/* Deadline / status banner for the active round */}
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
            ) : roundTips.length === 0 ? (
              <Card>
                <CardContent className="text-center py-10 space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">No fixtures loaded for this round yet.</p>
                  <p className="text-xs text-muted-foreground">The administrator will add fixtures before the round opens.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {roundTips.map(({ fixture, tip }) => {
                  const isOpen = activeRound?.status === "open";
                  const deadline = activeRound?.tipsCloseAt ? new Date(activeRound.tipsCloseAt) : null;
                  const deadlinePassed = deadline ? new Date() > deadline : false;
                  const isLocked = !isOpen || deadlinePassed;
                  const isScored = fixture.status === "completed";

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
                        {/* Match info header: Home v Away */}
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
                          {isScored && fixture.winner && (
                            <span className="text-xs text-green-600 font-semibold shrink-0">
                              {fixture.winner.name} won
                            </span>
                          )}
                        </div>

                        {/* Venue & start time */}
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          {fixture.venue ? (
                            <span className="flex items-center gap-1">
                              <MapPin size={11} className="shrink-0" />
                              {fixture.venue}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 italic">
                              <MapPin size={11} className="shrink-0" />
                              Venue TBC
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Calendar size={11} className="shrink-0" />
                            {formatMatchTime(fixture.startTime)}
                          </span>
                        </div>

                        {/* Team pick buttons */}
                        <div className="flex items-center gap-3">
                          <TeamButton
                            team={fixture.homeTeam}
                            selected={tip?.pickedTeamId === fixture.homeTeamId}
                            correct={isScored ? fixture.winnerId === fixture.homeTeamId : undefined}
                            disabled={isLocked}
                            onClick={() => {
                              if (isLocked) {
                                toast.error(deadlinePassed ? "The tipping deadline has passed." : "Tipping is closed for this round.");
                                return;
                              }
                              submitTip.mutate({ fixtureId: fixture.id, competitionId: compId, pickedTeamId: fixture.homeTeamId });
                            }}
                          />
                          <span className="text-xs font-bold text-muted-foreground shrink-0">VS</span>
                          <TeamButton
                            team={fixture.awayTeam}
                            selected={tip?.pickedTeamId === fixture.awayTeamId}
                            correct={isScored ? fixture.winnerId === fixture.awayTeamId : undefined}
                            disabled={isLocked}
                            onClick={() => {
                              if (isLocked) {
                                toast.error(deadlinePassed ? "The tipping deadline has passed." : "Tipping is closed for this round.");
                                return;
                              }
                              submitTip.mutate({ fixtureId: fixture.id, competitionId: compId, pickedTeamId: fixture.awayTeamId });
                            }}
                          />
                        </div>

                        {/* Score if completed */}
                        {isScored && fixture.homeScore !== null && fixture.awayScore !== null && (
                          <div className="text-center text-xs text-muted-foreground font-mono">
                            Final: {fixture.homeTeam?.abbreviation ?? fixture.homeTeam?.name ?? "Home"}{" "}
                            <span className="font-bold text-foreground">{fixture.homeScore} – {fixture.awayScore}</span>{" "}
                            {fixture.awayTeam?.abbreviation ?? fixture.awayTeam?.name ?? "Away"}
                            {fixture.margin !== null && fixture.margin !== undefined && (
                              <span className="ml-2 text-muted-foreground">(margin: {fixture.margin})</span>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ── HISTORY TAB ────────────────────────────────────────── */}
          <TabsContent value="history" className="mt-4">
            <Card>
              <CardContent className="p-0">
                {!history?.length ? (
                  <div className="text-center py-12 text-muted-foreground">No tips submitted yet.</div>
                ) : (
                  <div className="divide-y divide-border">
                    {history.map(t => (
                      <div key={t.id} className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-3">
                          {t.isCorrect === true  && <CheckCircle2 size={16} className="text-green-600 shrink-0" />}
                          {t.isCorrect === false && <XCircle size={16} className="text-red-500 shrink-0" />}
                          {t.isCorrect === null  && <Circle size={16} className="text-muted-foreground shrink-0" />}
                          <span className="text-sm font-medium">{t.pickedTeam?.name ?? "Unknown"}</span>
                        </div>
                        <span className="font-mono text-sm font-bold text-primary">+{t.pointsEarned}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
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

import { useState } from "react";
import { useParams, useLocation } from "wouter";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  ArrowLeft, CheckCircle2, Circle, Trophy, Loader2,
  AlertTriangle, ClipboardCheck,
} from "lucide-react";

// ── Status badge ─────────────────────────────────────────────────────────────
function FixtureStatusBadge({ status }: { status: string }) {
  if (status === "completed")
    return <Badge className="bg-green-100 text-green-700 border border-green-300 text-xs">Completed</Badge>;
  if (status === "in_progress")
    return <Badge className="bg-blue-100 text-blue-700 border border-blue-300 text-xs">Live</Badge>;
  return <Badge variant="outline" className="text-xs">Scheduled</Badge>;
}

// ── Individual fixture result row ─────────────────────────────────────────────
interface FixtureResultRowProps {
  fixture: {
    id: number;
    status: string;
    homeTeamId: number;
    awayTeamId: number;
    homeScore: number | null;
    awayScore: number | null;
    winnerId: number | null;
    venue: string | null;
    homeTeam: { id: number; name: string } | null;
    awayTeam: { id: number; name: string } | null;
    winner: { id: number; name: string } | null;
  };
  roundStatus: string;
  onSave: (id: number, homeScore: number, awayScore: number, winnerId: number | null) => void;
  isSaving: boolean;
}

function FixtureResultRow({ fixture: f, roundStatus, onSave, isSaving }: FixtureResultRowProps) {
  const [editing, setEditing] = useState(false);
  const [homeScore, setHomeScore] = useState(String(f.homeScore ?? ""));
  const [awayScore, setAwayScore] = useState(String(f.awayScore ?? ""));
  const [winnerId, setWinnerId] = useState(
    f.winnerId === null ? (f.status === "completed" ? "0" : "") : String(f.winnerId)
  );

  const canEdit = roundStatus === "closed" || roundStatus === "open";
  const isComplete = f.status === "completed";

  const handleSave = () => {
    if (!winnerId && winnerId !== "0") {
      toast.error("Please select a winner (or Draw)");
      return;
    }
    onSave(
      f.id,
      Number(homeScore) || 0,
      Number(awayScore) || 0,
      winnerId === "0" ? null : Number(winnerId),
    );
    setEditing(false);
  };

  return (
    <div
      className={`rounded-xl border p-4 transition-all ${
        isComplete
          ? "bg-green-50/50 border-green-200"
          : "bg-card border-border hover:border-primary/30"
      }`}
    >
      {/* Teams row */}
      <div className="flex items-center gap-3 mb-3">
        <FixtureStatusBadge status={f.status} />
        {f.venue && <span className="text-xs text-muted-foreground">{f.venue}</span>}
      </div>

      <div className="flex items-center gap-4">
        {/* Home team */}
        <div className="flex-1 text-center">
          <div className={`font-semibold text-sm ${f.winnerId === f.homeTeamId ? "text-green-700" : ""}`}>
            {f.homeTeam?.name ?? "Home"}
          </div>
          {f.winnerId === f.homeTeamId && (
            <div className="flex items-center justify-center gap-1 mt-0.5">
              <Trophy size={11} className="text-yellow-500" />
              <span className="text-xs text-green-600 font-medium">Winner</span>
            </div>
          )}
        </div>

        {/* Score / vs */}
        <div className="text-center min-w-[80px]">
          {isComplete && f.homeScore !== null && f.awayScore !== null ? (
            <span className="font-mono font-bold text-lg">{f.homeScore} – {f.awayScore}</span>
          ) : (
            <span className="text-muted-foreground text-sm font-medium">vs</span>
          )}
        </div>

        {/* Away team */}
        <div className="flex-1 text-center">
          <div className={`font-semibold text-sm ${f.winnerId === f.awayTeamId ? "text-green-700" : ""}`}>
            {f.awayTeam?.name ?? "Away"}
          </div>
          {f.winnerId === f.awayTeamId && (
            <div className="flex items-center justify-center gap-1 mt-0.5">
              <Trophy size={11} className="text-yellow-500" />
              <span className="text-xs text-green-600 font-medium">Winner</span>
            </div>
          )}
        </div>
      </div>

      {/* Draw label */}
      {isComplete && f.winnerId === null && (
        <div className="text-center mt-2">
          <Badge variant="outline" className="text-xs">Draw</Badge>
        </div>
      )}

      {/* Edit / Save controls */}
      {canEdit && (
        <div className="mt-4 pt-3 border-t border-border/60">
          {editing ? (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3 items-end">
                <div className="space-y-1">
                  <Label className="text-xs">{f.homeTeam?.name ?? "Home"} Score</Label>
                  <Input
                    type="number"
                    min={0}
                    className="h-8 text-sm"
                    value={homeScore}
                    onChange={e => setHomeScore(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{f.awayTeam?.name ?? "Away"} Score</Label>
                  <Input
                    type="number"
                    min={0}
                    className="h-8 text-sm"
                    value={awayScore}
                    onChange={e => setAwayScore(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Winner</Label>
                  <Select value={winnerId} onValueChange={setWinnerId}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Select winner…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={String(f.homeTeamId)}>{f.homeTeam?.name}</SelectItem>
                      <SelectItem value={String(f.awayTeamId)}>{f.awayTeam?.name}</SelectItem>
                      <SelectItem value="0">Draw</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
                <Button size="sm" onClick={handleSave} disabled={isSaving} className="gap-1">
                  {isSaving ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                  Save Result
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
                  setHomeScore(String(f.homeScore ?? ""));
                  setAwayScore(String(f.awayScore ?? ""));
                  setWinnerId(f.winnerId === null ? (isComplete ? "0" : "") : String(f.winnerId));
                  setEditing(true);
                }}
              >
                {isComplete ? (
                  <><CheckCircle2 size={12} className="text-green-600" /> Edit Result</>
                ) : (
                  <><Circle size={12} /> Enter Result</>
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
  const { data: rounds } = trpc.rounds.list.useQuery({ competitionId: compId });
  const round = rounds?.find(r => r.id === roundId);
  const { data: fixtures, refetch: refetchFixtures } = trpc.fixtures.list.useQuery(
    { roundId },
    { enabled: !!roundId },
  );

  const enterResult = trpc.fixtures.enterResult.useMutation({
    onSuccess: () => { refetchFixtures(); toast.success("Result saved"); },
    onError: () => toast.error("Failed to save result"),
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

  const handleSave = (id: number, homeScore: number, awayScore: number, winnerId: number | null) => {
    enterResult.mutate({ id, homeScore, awayScore, winnerId });
  };

  const handleScoreRound = () => {
    if (!allComplete) {
      toast.warning("Enter all fixture results before scoring the round.");
      return;
    }
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
                  <div className="text-xs text-muted-foreground">Results entered</div>
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
                    ? "All results entered — ready to score"
                    : `${totalCount - completedCount} fixture${totalCount - completedCount !== 1 ? "s" : ""} still need results`}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Warning if not closed */}
        {round?.status === "open" && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span>Tipping is still open for this round. Close tipping before entering results to prevent participants from changing their picks.</span>
          </div>
        )}

        {/* Already scored notice */}
        {isScored && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-green-50 border border-green-200 text-green-800 text-sm">
            <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
            <span>This round has been scored and the leaderboard has been updated. You can still edit individual results and re-score if needed.</span>
          </div>
        )}

        {/* Fixture cards */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Fixtures</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!fixtures?.length ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No fixtures have been added to this round yet.
              </div>
            ) : (
              fixtures.map(f => (
                <FixtureResultRow
                  key={f.id}
                  fixture={f as any}
                  roundStatus={round?.status ?? "upcoming"}
                  onSave={handleSave}
                  isSaving={enterResult.isPending}
                />
              ))
            )}
          </CardContent>
        </Card>

        {/* Re-score button (bottom) if already scored */}
        {isScored && allComplete && (
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

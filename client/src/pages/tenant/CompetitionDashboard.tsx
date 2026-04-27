import { useState } from "react";
import { useLocation } from "wouter";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, Users, Trophy, Target, TrendingUp } from "lucide-react";

export default function CompetitionDashboard() {
  const [, navigate] = useLocation();
  const { data: competitions } = trpc.competitions.list.useQuery();
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const compId = selectedId ?? competitions?.[0]?.id ?? 0;
  const { data: stats, isLoading } = trpc.competitions.dashboardStats.useQuery(
    { competitionId: compId },
    { enabled: compId > 0 }
  );

  const tipsPercent = stats && stats.tipsTotal > 0
    ? Math.round((stats.tipsSubmitted / stats.tipsTotal) * 100)
    : 0;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Competition Dashboard</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Real-time overview of your competition</p>
          </div>
          {competitions && competitions.length > 1 && (
            <Select
              value={String(compId)}
              onValueChange={v => setSelectedId(Number(v))}
            >
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Select competition" />
              </SelectTrigger>
              <SelectContent>
                {competitions.map(c => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {isLoading && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}><CardContent className="p-6"><div className="h-12 bg-muted animate-pulse rounded" /></CardContent></Card>
            ))}
          </div>
        )}

        {!isLoading && !stats && (
          <Card><CardContent className="py-16 text-center text-muted-foreground">No competition data available. Create a competition to get started.</CardContent></Card>
        )}

        {stats && (
          <>
            {/* Alerts */}
            {stats.alerts.length > 0 && (
              <div className="space-y-2">
                {stats.alerts.map((a, i) => (
                  <div key={i} className="flex items-center gap-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-4 py-3 text-sm">
                    <AlertTriangle size={16} className="shrink-0" />
                    {a.message}
                  </div>
                ))}
              </div>
            )}

            {/* Stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Users size={20} className="text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">Entrants</p>
                      <p className="text-2xl font-bold text-foreground">{stats.entrantCount}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                      <Target size={20} className="text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">Tips This Round</p>
                      <p className="text-2xl font-bold text-foreground">
                        {stats.currentRound ? `${stats.tipsSubmitted}/${stats.tipsTotal}` : "—"}
                      </p>
                      {stats.currentRound && (
                        <p className="text-xs text-muted-foreground">{tipsPercent}% submitted</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                      <Trophy size={20} className="text-purple-600" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">Current Round</p>
                      <p className="text-lg font-bold text-foreground">
                        {stats.currentRound ? (stats.currentRound.name ?? `Round ${stats.currentRound.roundNumber}`) : "None open"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                      <TrendingUp size={20} className="text-orange-600" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">Status</p>
                      <Badge variant={stats.competition.status === "active" ? "default" : "secondary"} className="mt-1">
                        {stats.competition.status}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tips progress bar */}
            {stats.currentRound && stats.tipsTotal > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">
                    Tips Submission Progress — {stats.currentRound.name ?? `Round ${stats.currentRound.roundNumber}`}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                    <div
                      className="h-3 bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${tipsPercent}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {stats.tipsSubmitted} of {stats.tipsTotal} entrants have submitted tips ({tipsPercent}%)
                  </p>
                  {stats.currentRound.tipsCloseAt && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Deadline: {new Date(stats.currentRound.tipsCloseAt).toLocaleString("en-AU", {
                        weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                      })}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Top 5 leaderboard */}
            {stats.top5.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Top 5 Leaderboard</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/40">
                        <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Rank</th>
                        <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Entrant</th>
                        <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground">Points</th>
                        <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground">Correct Tips</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.top5.map((e, i) => (
                        <tr key={e.userId} className="border-b border-border hover:bg-muted/20">
                          <td className="px-4 py-3">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${i === 0 ? "bg-yellow-100 text-yellow-700" : i === 1 ? "bg-gray-100 text-gray-600" : i === 2 ? "bg-orange-100 text-orange-600" : "text-muted-foreground"}`}>
                              #{e.rank ?? i + 1}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-medium">{e.userName ?? e.userEmail ?? "Unknown"}</td>
                          <td className="px-4 py-3 text-right font-bold text-primary">{e.totalPoints ?? 0}</td>
                          <td className="px-4 py-3 text-right text-muted-foreground">{e.correctTips ?? 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )}

            {/* Recent scored rounds */}
            {stats.recentRounds.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Recently Scored Rounds</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {stats.recentRounds.map(r => (
                      <div key={r.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 size={14} className="text-green-500" />
                          <span className="text-sm font-medium">{r.name ?? `Round ${r.roundNumber}`}</span>
                        </div>
                        {r.scoredAt && (
                          <span className="text-xs text-muted-foreground">
                            Scored {new Date(r.scoredAt).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}

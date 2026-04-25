import { useState, useMemo } from "react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarClock, CheckCircle2, Clock, Search, AlertTriangle } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ScheduledJobSummary {
  jobType: string;
  scheduledAt: Date | string;
}

interface FixtureRow {
  id: number;
  homeTeam: { name: string } | null;
  awayTeam: { name: string } | null;
  venue: string | null;
  startTime: Date | string | null;
  status: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const JOB_LABELS: Record<string, string> = {
  admin_round_starting:  "Round Starting (admin)",
  tips_closing_24h:      "Tips Closing — 24h reminder",
  tips_closing_4h:       "Tips Closing — 4h reminder",
  tips_closing_2h:       "Tips Closing — 2h reminder",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  upcoming:  "secondary",
  open:      "default",
  closed:    "outline",
  scored:    "outline",
};

function formatLocal(dt: Date | string | null): string {
  if (!dt) return "—";
  return new Date(dt).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function toDatetimeLocal(dt: Date | string | null): string {
  if (!dt) return "";
  const d = new Date(dt);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function RescheduledJobsPanel({ jobs }: { jobs: ScheduledJobSummary[] }) {
  if (!jobs.length) return null;
  return (
    <Alert className="border-green-500/40 bg-green-500/5 mt-4">
      <CheckCircle2 className="h-4 w-4 text-green-500" />
      <AlertTitle className="text-green-700 dark:text-green-400">
        Notifications rescheduled
      </AlertTitle>
      <AlertDescription>
        <ul className="mt-2 space-y-1 text-sm">
          {jobs.map((j, i) => (
            <li key={i} className="flex items-center gap-2">
              <Clock size={13} className="shrink-0 text-muted-foreground" />
              <span className="font-medium">{JOB_LABELS[j.jobType] ?? j.jobType}</span>
              <span className="text-muted-foreground">→ {formatLocal(j.scheduledAt)}</span>
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}

// ── Fixture row editor ────────────────────────────────────────────────────────

function FixtureEditorRow({
  fixture,
  roundId,
  onSaved,
}: {
  fixture: FixtureRow;
  roundId: number;
  onSaved: (jobs: ScheduledJobSummary[], newTipsCloseAt: Date | null) => void;
}) {
  const [value, setValue] = useState(toDatetimeLocal(fixture.startTime));
  const [dirty, setDirty] = useState(false);

  const utils = trpc.useUtils();
  const update = trpc.fixtures.systemUpdateStartTime.useMutation({
    onSuccess: (data) => {
      setDirty(false);
      toast.success("Start time updated", { description: `${fixture.homeTeam?.name} vs ${fixture.awayTeam?.name}` });
      utils.fixtures.getFixturesForRound.invalidate({ roundId });
      onSaved(
        (data.scheduledJobs ?? []) as ScheduledJobSummary[],
        data.newTipsCloseAt ? new Date(data.newTipsCloseAt) : null,
      );
    },
    onError: (err) => {
      toast.error("Update failed", { description: err.message });
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
    setDirty(e.target.value !== toDatetimeLocal(fixture.startTime));
  };

  const handleSave = () => {
    update.mutate({
      fixtureId: fixture.id,
      startTime: value ? new Date(value).toISOString() : null,
    });
  };

  return (
    <TableRow>
      <TableCell className="font-medium">
        {fixture.homeTeam?.name ?? "TBD"} <span className="text-muted-foreground">vs</span> {fixture.awayTeam?.name ?? "TBD"}
      </TableCell>
      <TableCell className="text-muted-foreground text-sm">{fixture.venue ?? "—"}</TableCell>
      <TableCell>
        <Input
          type="datetime-local"
          value={value}
          onChange={handleChange}
          className="w-52 text-sm"
        />
      </TableCell>
      <TableCell>
        <Button
          size="sm"
          disabled={!dirty || update.isPending}
          onClick={handleSave}
          className="min-w-[80px]"
        >
          {update.isPending ? (
            <span className="flex items-center gap-1.5">
              <span className="h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
              Saving
            </span>
          ) : "Save"}
        </Button>
      </TableCell>
    </TableRow>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function FixtureManager() {
  const [selectedRoundId, setSelectedRoundId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [lastRescheduled, setLastRescheduled] = useState<ScheduledJobSummary[]>([]);
  const [currentTipsCloseAt, setCurrentTipsCloseAt] = useState<Date | null>(null);

  const { data: allRounds = [], isLoading: roundsLoading } = trpc.fixtures.listAllRounds.useQuery();

  const { data: roundData, isLoading: fixturesLoading } = trpc.fixtures.getFixturesForRound.useQuery(
    { roundId: selectedRoundId! },
    { enabled: selectedRoundId !== null }
  );

  // Sync tipsCloseAt from query result
  useMemo(() => {
    if (roundData?.tipsCloseAt) {
      setCurrentTipsCloseAt(new Date(roundData.tipsCloseAt));
    } else {
      setCurrentTipsCloseAt(null);
    }
  }, [roundData?.tipsCloseAt]);

  const filteredRounds = useMemo(() => {
    const q = search.toLowerCase();
    return allRounds.filter(r =>
      !q ||
      r.competitionName.toLowerCase().includes(q) ||
      r.tenantName.toLowerCase().includes(q) ||
      (r.name ?? `Round ${r.roundNumber}`).toLowerCase().includes(q)
    );
  }, [allRounds, search]);

  const selectedRound = allRounds.find(r => r.id === selectedRoundId);

  const handleSaved = (jobs: ScheduledJobSummary[], newTipsCloseAt: Date | null) => {
    setLastRescheduled(jobs);
    if (newTipsCloseAt) setCurrentTipsCloseAt(newTipsCloseAt);
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-5xl">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-heading font-bold tracking-tight">Fixture Manager</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Edit fixture start times. Changes automatically update the round's tips closing time and reschedule all associated email notifications.
          </p>
        </div>

        {/* Round Selector */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Select Round</CardTitle>
            <CardDescription>Choose a round to view and edit its fixtures.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Search */}
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by competition, tenant, or round name…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 text-sm"
              />
            </div>

            {roundsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-9 w-full" />)}
              </div>
            ) : (
              <Select
                value={selectedRoundId?.toString() ?? ""}
                onValueChange={v => {
                  setSelectedRoundId(Number(v));
                  setLastRescheduled([]);
                }}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Choose a round…" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {filteredRounds.length === 0 ? (
                    <div className="py-4 text-center text-sm text-muted-foreground">No rounds found</div>
                  ) : (
                    filteredRounds.map(r => (
                      <SelectItem key={r.id} value={r.id.toString()}>
                        <span className="flex items-center gap-2">
                          <span>{r.tenantName} — {r.competitionName}</span>
                          <span className="text-muted-foreground">·</span>
                          <span>{r.name ?? `Round ${r.roundNumber}`}</span>
                          <Badge variant={STATUS_VARIANT[r.status] ?? "outline"} className="text-[10px] px-1.5 py-0">
                            {r.status}
                          </Badge>
                          <span className="text-muted-foreground text-xs">({r.fixtureCount} fixtures)</span>
                        </span>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            )}
          </CardContent>
        </Card>

        {/* Fixture Editor */}
        {selectedRoundId !== null && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <CalendarClock size={16} />
                    {selectedRound
                      ? `${selectedRound.tenantName} — ${selectedRound.competitionName} · ${selectedRound.name ?? `Round ${selectedRound.roundNumber}`}`
                      : "Fixtures"}
                  </CardTitle>
                  <CardDescription className="mt-1 flex items-center gap-2 text-xs">
                    <Clock size={12} />
                    Tips close:
                    {currentTipsCloseAt ? (
                      <span className="font-medium text-foreground">{formatLocal(currentTipsCloseAt)}</span>
                    ) : (
                      <span className="text-muted-foreground">Not set — will be set to the earliest fixture start time on first save</span>
                    )}
                  </CardDescription>
                </div>
                {selectedRound && (
                  <Badge variant={STATUS_VARIANT[selectedRound.status] ?? "outline"}>
                    {selectedRound.status}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {fixturesLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : !roundData?.fixtures.length ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <AlertTriangle size={32} className="text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">No fixtures found for this round.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Match</TableHead>
                      <TableHead>Venue</TableHead>
                      <TableHead>Start Time</TableHead>
                      <TableHead className="w-24"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(roundData.fixtures as FixtureRow[]).map(f => (
                      <FixtureEditorRow
                        key={f.id}
                        fixture={f}
                        roundId={selectedRoundId}
                        onSaved={handleSaved}
                      />
                    ))}
                  </TableBody>
                </Table>
              )}

              {/* Rescheduled jobs confirmation panel */}
              <RescheduledJobsPanel jobs={lastRescheduled} />
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}

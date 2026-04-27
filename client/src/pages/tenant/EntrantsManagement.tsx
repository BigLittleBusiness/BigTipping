import { useState, useRef } from "react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { UserPlus, Upload, Trash2, Mail, Eye, Search, ChevronLeft, ChevronRight, Trophy } from "lucide-react";

const PAGE_SIZE = 25;

export default function EntrantsManagement() {
  const { data: competitions, isLoading: compsLoading } = trpc.competitions.list.useQuery();
  const [compId, setCompId] = useState<number>(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const selectedComp = compId || competitions?.[0]?.id || 0;
  const selectedCompName = competitions?.find(c => c.id === selectedComp)?.name ?? "";

  const { data, refetch, isLoading } = trpc.competitions.listEntrants.useQuery(
    { competitionId: selectedComp, page, pageSize: PAGE_SIZE, search: search || undefined },
    { enabled: selectedComp > 0 }
  );

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Add entrant dialog
  const [addOpen, setAddOpen] = useState(false);
  const [addEmail, setAddEmail] = useState("");
  const [addName, setAddName] = useState("");
  const [addMobile, setAddMobile] = useState("");
  // For adding a new entrant we use bulkImportEntrants with a single row
  const addEntrantMutation = trpc.competitions.bulkImportEntrants.useMutation({
    onSuccess: () => { toast.success("Invite sent"); setAddOpen(false); setAddEmail(""); setAddName(""); setAddMobile(""); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  // Delete
  const removeEntrant = trpc.competitions.removeEntrant.useMutation({
    onSuccess: () => { toast.success("Entrant removed"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  // Resend invite
  const resendInvite = trpc.competitions.resendInvite.useMutation({
    onSuccess: () => toast.success("Invite resent"),
    onError: (e) => toast.error(e.message),
  });

  // View tips dialog
  const [tipsEntrantId, setTipsEntrantId] = useState<number | null>(null);
  const [tipsRoundId, setTipsRoundId] = useState<number | null>(null);
  const { data: rounds } = trpc.rounds.list.useQuery(
    { competitionId: selectedComp },
    { enabled: selectedComp > 0 }
  );
  const { data: entrantTipsData } = trpc.competitions.getEntrantTips.useQuery(
    { competitionId: selectedComp, userId: tipsEntrantId! },
    { enabled: !!tipsEntrantId }
  );
  // Flatten tips into rows for display, optionally filtered by round
  const entrantTips = (entrantTipsData ?? []).flatMap(roundData => {
    if (tipsRoundId && roundData.round.id !== tipsRoundId) return [];
    return roundData.fixtures.map(fx => {
      const tip = roundData.tips.find(t => t.fixtureId === fx.id);
      return {
        roundName: roundData.round.name ?? `Round ${roundData.round.roundNumber}`,
        homeTeam: fx.homeTeamId ? String(fx.homeTeamId) : "Home",
        awayTeam: fx.awayTeamId ? String(fx.awayTeamId) : "Away",
        tippedTeam: tip ? (tip.pickedTeamId ? String(tip.pickedTeamId) : "—") : null,
        isCorrect: tip?.isCorrect ?? null,
      };
    });
  });

  // CSV import
  const fileRef = useRef<HTMLInputElement>(null);
  const importCSV = trpc.competitions.bulkImportEntrants.useMutation({
    onSuccess: (r) => { toast.success(`Imported ${r.invited} entrants${r.skipped ? `, ${r.skipped} skipped` : ""}`); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  function parseCSV(csv: string): { name: string; email: string; mobile?: string }[] {
    const lines = csv.trim().split("\n").filter(Boolean);
    const hasHeader = lines[0]?.toLowerCase().includes("email");
    const dataLines = hasHeader ? lines.slice(1) : lines;
    return dataLines.map(line => {
      const cols = line.split(",").map(c => c.trim().replace(/^"|"$/g, ""));
      return { name: cols[0] ?? "", email: cols[1] ?? "", mobile: cols[2] || undefined };
    }).filter(r => r.email.includes("@"));
  }

  function handleCSVUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const csv = ev.target?.result as string;
      const rows = parseCSV(csv);
      if (rows.length === 0) { toast.error("No valid rows found in CSV"); return; }
      importCSV.mutate({ competitionId: selectedComp, rows });
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Entrants</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              {selectedCompName ? (
                <span className="flex items-center gap-1.5">
                  <Trophy size={12} className="text-primary" />
                  {selectedCompName}
                </span>
              ) : "Manage competition participants"}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleCSVUpload} />
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={importCSV.isPending || selectedComp === 0}>
              <Upload size={14} className="mr-1.5" />
              {importCSV.isPending ? "Importing…" : "Import CSV"}
            </Button>
            <Button size="sm" onClick={() => setAddOpen(true)} disabled={selectedComp === 0}>
              <UserPlus size={14} className="mr-1.5" />
              Add Entrant
            </Button>
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
              onValueChange={v => { setCompId(Number(v)); setPage(1); setSearch(""); setSearchInput(""); }}
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
          {selectedComp > 0 && (
            <span className="text-xs text-muted-foreground ml-auto">
              {total > 0 ? `${total} entrant${total !== 1 ? "s" : ""}` : ""}
            </span>
          )}
        </div>

        {/* Search */}
        <div className="flex gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Search by name or email…"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { setSearch(searchInput); setPage(1); } }}
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => { setSearch(searchInput); setPage(1); }}>Search</Button>
          {search && <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setSearchInput(""); setPage(1); }}>Clear</Button>}
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="py-16 text-center text-muted-foreground">Loading…</div>
            ) : rows.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground">
                {search ? "No entrants match your search." : "No entrants yet. Add one or import a CSV."}
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground">#</th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Name</th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Email</th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Mobile</th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Joined</th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Status</th>
                    <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((e, idx) => (
                    <tr key={e.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground text-xs font-mono">{(page - 1) * PAGE_SIZE + idx + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                            {(e.userName ?? "?").charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium">{e.userName ?? "Unknown"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{e.userEmail ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{e.userMobile ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {new Date(e.joinedAt).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={e.isActive ? "default" : "secondary"} className="text-xs">
                          {e.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost" size="icon" className="h-7 w-7"
                            title="View tips"
                            onClick={() => { setTipsEntrantId(e.userId); setTipsRoundId(null); }}
                          >
                            <Eye size={13} />
                          </Button>
                          <Button
                            variant="ghost" size="icon" className="h-7 w-7"
                            title="Resend invite"
                            onClick={() => resendInvite.mutate({ competitionId: selectedComp, userId: e.userId })}
                          >
                            <Mail size={13} />
                          </Button>
                          <Button
                            variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                            title="Remove entrant"
                            onClick={() => { if (confirm("Remove this entrant?")) removeEntrant.mutate({ competitionId: selectedComp, userId: e.userId }); }}
                          >
                            <Trash2 size={13} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}</span>
            <div className="flex gap-1">
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft size={14} />
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Add Entrant Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Entrant</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input placeholder="Full name" value={addName} onChange={e => setAddName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Email <span className="text-destructive">*</span></Label>
              <Input type="email" placeholder="email@example.com" value={addEmail} onChange={e => setAddEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Mobile</Label>
              <Input placeholder="+61 4xx xxx xxx" value={addMobile} onChange={e => setAddMobile(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button
            disabled={!addEmail || addEntrantMutation.isPending}
            onClick={() => addEntrantMutation.mutate({ competitionId: selectedComp, rows: [{ email: addEmail, name: addName || addEmail, mobile: addMobile || undefined }] })}
            >
              {addEntrantMutation.isPending ? "Sending…" : "Send Invite"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Tips Dialog */}
      <Dialog open={!!tipsEntrantId} onOpenChange={() => setTipsEntrantId(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Entrant Tips</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {rounds && rounds.length > 0 && (
              <Select value={tipsRoundId ? String(tipsRoundId) : ""} onValueChange={v => setTipsRoundId(v ? Number(v) : null)}>
                <SelectTrigger><SelectValue placeholder="All rounds" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All rounds</SelectItem>
                  {rounds.map(r => <SelectItem key={r.id} value={String(r.id)}>{r.name ?? `Round ${r.roundNumber}`}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            {!entrantTips || entrantTips.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">No tips found.</p>
            ) : (
              <div className="max-h-80 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Fixture</th>
                      <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Tip</th>
                      <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entrantTips.map((t, i) => (
                      <tr key={i} className="border-b border-border">
                        <td className="px-3 py-2 text-xs">{t.homeTeam} vs {t.awayTeam}</td>
                        <td className="px-3 py-2 text-xs font-medium">{t.tippedTeam ?? "—"}</td>
                        <td className="px-3 py-2">
                          {t.isCorrect === null ? (
                            <span className="text-xs text-muted-foreground">Pending</span>
                          ) : t.isCorrect ? (
                            <Badge className="text-xs bg-green-100 text-green-700">Correct</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">Wrong</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTipsEntrantId(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

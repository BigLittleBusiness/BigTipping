import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trophy, ChevronRight } from "lucide-react";
import { Link } from "wouter";
import InviteLinkPanel from "@/components/InviteLinkPanel";

const STATUS_SEQUENCE = ["draft", "active", "round-by-round", "completed"] as const;
type CompStatus = typeof STATUS_SEQUENCE[number];

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  active: "bg-blue-100 text-blue-700",
  "round-by-round": "bg-secondary/10 text-secondary",
  completed: "bg-green-100 text-green-700",
};

export default function TenantCompetitions() {
  const { data: competitions, refetch } = trpc.competitions.list.useQuery();
  const { data: sports } = trpc.sports.list.useQuery();
  const createComp = trpc.competitions.create.useMutation({
    onSuccess: () => { refetch(); setOpen(false); toast.success("Competition created"); },
  });
  const advanceStatus = trpc.competitions.advanceStatus.useMutation({
    onSuccess: () => { refetch(); toast.success("Status updated"); },
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", sportId: "", season: "" });

  const nextStatus = (current: CompStatus): CompStatus | null => {
    const idx = STATUS_SEQUENCE.indexOf(current);
    return idx < STATUS_SEQUENCE.length - 1 ? STATUS_SEQUENCE[idx + 1] : null;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Competitions</h1>
            <p className="text-muted-foreground mt-1">Create and manage your tipping competitions</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus size={16} /> New Competition</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Create Competition</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-1">
                  <Label>Competition Name</Label>
                  <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="AFL 2025 Tipping Comp" />
                </div>
                <div className="space-y-1">
                  <Label>Sport</Label>
                  <Select value={form.sportId} onValueChange={v => setForm(f => ({ ...f, sportId: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select sport…" /></SelectTrigger>
                    <SelectContent>
                      {sports?.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Season</Label>
                  <Input value={form.season} onChange={e => setForm(f => ({ ...f, season: e.target.value }))} placeholder="2025" />
                </div>
                <div className="space-y-1">
                  <Label>Description</Label>
                  <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional description…" rows={3} />
                </div>
                <Button
                  className="w-full"
                  onClick={() => createComp.mutate({
                    name: form.name,
                    sportId: Number(form.sportId),
                    season: form.season || undefined,
                    description: form.description || undefined,
                  })}
                  disabled={createComp.isPending || !form.name || !form.sportId}
                >
                  {createComp.isPending ? "Creating…" : "Create Competition"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {!competitions?.length ? (
          <Card>
            <CardContent className="flex flex-col items-center py-16">
              <Trophy size={40} className="text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No competitions yet. Create one above.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {competitions.map(c => {
              const next = nextStatus(c.status as CompStatus);
              return (
                <Card key={c.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold">{c.name}</h3>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[c.status] ?? ""}`}>
                            {c.status}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{c.season ?? "No season"}</p>
                        <div className="mt-2">
                          <InviteLinkPanel
                            competitionId={c.id}
                            competitionName={c.name}
                            initialToken={(c as any).inviteToken ?? null}
                            initialEnabled={(c as any).inviteEnabled ?? false}
                            compact
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {next && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => advanceStatus.mutate({ id: c.id, status: next })}
                            disabled={advanceStatus.isPending}
                          >
                            → {next}
                          </Button>
                        )}
                        <Link href={`/tenant/competitions/${c.id}`}>
                          <Button size="sm" variant="ghost" className="gap-1">
                            Manage <ChevronRight size={14} />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

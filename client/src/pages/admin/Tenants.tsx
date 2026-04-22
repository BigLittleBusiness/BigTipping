import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Building2, Plus } from "lucide-react";

export default function AdminTenants() {
  const { data: tenants, refetch } = trpc.tenants.list.useQuery();
  const createTenant = trpc.tenants.create.useMutation({ onSuccess: () => { refetch(); setOpen(false); toast.success("Tenant created"); } });
  const updateStatus = trpc.tenants.updateStatus.useMutation({ onSuccess: () => { refetch(); toast.success("Status updated"); } });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "", contactEmail: "" });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Tenants</h1>
            <p className="text-muted-foreground mt-1">Manage organisations using Big Tipping</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus size={16} /> New Tenant</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Tenant</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-1">
                  <Label>Organisation Name</Label>
                  <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="The Crown Hotel" />
                </div>
                <div className="space-y-1">
                  <Label>Slug (URL identifier)</Label>
                  <Input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") }))} placeholder="crown-hotel" />
                </div>
                <div className="space-y-1">
                  <Label>Contact Email</Label>
                  <Input type="email" value={form.contactEmail} onChange={e => setForm(f => ({ ...f, contactEmail: e.target.value }))} placeholder="admin@example.com" />
                </div>
                <Button
                  className="w-full"
                  onClick={() => createTenant.mutate({ name: form.name, slug: form.slug, contactEmail: form.contactEmail || undefined })}
                  disabled={createTenant.isPending || !form.name || !form.slug}
                >
                  {createTenant.isPending ? "Creating…" : "Create Tenant"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardContent className="p-0">
            {!tenants?.length ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Building2 size={40} className="text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No tenants yet. Create one to get started.</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Organisation</th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Slug</th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Contact</th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Status</th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tenants.map(t => (
                    <tr key={t.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-medium">{t.name}</td>
                      <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{t.slug}</td>
                      <td className="px-4 py-3 text-muted-foreground">{t.contactEmail ?? "—"}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={t.status} />
                      </td>
                      <td className="px-4 py-3">
                        <Select
                          value={t.status}
                          onValueChange={v => updateStatus.mutate({ id: t.id, status: v as "active" | "suspended" | "trial" })}
                        >
                          <SelectTrigger className="h-7 w-32 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="trial">Trial</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="suspended">Suspended</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "bg-green-100 text-green-700",
    suspended: "bg-red-100 text-red-700",
    trial: "bg-yellow-100 text-yellow-700",
  };
  return (
    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${map[status] ?? "bg-gray-100 text-gray-600"}`}>
      {status}
    </span>
  );
}

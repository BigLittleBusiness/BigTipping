import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, Users, Layers, ChevronRight } from "lucide-react";
import { Link } from "wouter";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  active: "bg-blue-100 text-blue-700",
  "round-by-round": "bg-secondary/10 text-secondary",
  completed: "bg-green-100 text-green-700",
};

export default function TenantDashboard() {
  const { data: tenant } = trpc.tenants.getMine.useQuery();
  const { data: competitions } = trpc.competitions.list.useQuery();

  const activeComps = competitions?.filter(c => c.status === "active" || c.status === "round-by-round") ?? [];
  const draftComps = competitions?.filter(c => c.status === "draft") ?? [];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{tenant?.name ?? "Dashboard"}</h1>
          <p className="text-muted-foreground mt-1">Manage your tipping competitions</p>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Competitions</p>
                  <p className="text-3xl font-bold font-mono mt-1">{competitions?.length ?? 0}</p>
                </div>
                <div className="p-2 bg-primary/10 rounded-lg"><Trophy size={20} className="text-primary" /></div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Active / Running</p>
                  <p className="text-3xl font-bold font-mono mt-1">{activeComps.length}</p>
                </div>
                <div className="p-2 bg-secondary/10 rounded-lg"><Layers size={20} className="text-secondary" /></div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Drafts</p>
                  <p className="text-3xl font-bold font-mono mt-1">{draftComps.length}</p>
                </div>
                <div className="p-2 bg-muted rounded-lg"><Layers size={20} className="text-muted-foreground" /></div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Competition list */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Your Competitions</CardTitle>
            <Link href="/tenant/competitions">
              <Button variant="outline" size="sm" className="gap-1">
                Manage <ChevronRight size={14} />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {!competitions?.length ? (
              <div className="text-center py-10">
                <Trophy size={36} className="text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">No competitions yet.</p>
                <Link href="/tenant/competitions">
                  <Button className="mt-4" size="sm">Create your first competition</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {competitions.map(c => (
                  <Link key={c.id} href={`/tenant/competitions/${c.id}`}>
                    <div className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors cursor-pointer">
                      <div>
                        <p className="font-medium text-sm">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.season ?? "No season"}</p>
                      </div>
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${STATUS_COLORS[c.status] ?? ""}`}>
                        {c.status}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

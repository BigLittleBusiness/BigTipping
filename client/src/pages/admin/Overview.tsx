import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Trophy, Users, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function AdminOverview() {
  const { data: stats, isLoading } = trpc.stats.platform.useQuery();
  const { data: tenants } = trpc.tenants.list.useQuery();

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Platform Overview</h1>
          <p className="text-muted-foreground mt-1">Big Tipping platform-wide statistics</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Tenants"
            value={stats?.tenants ?? 0}
            sub={`${stats?.activeTenants ?? 0} active`}
            icon={<Building2 className="text-primary" size={22} />}
            loading={isLoading}
          />
          <StatCard
            title="Competitions"
            value={stats?.competitions ?? 0}
            sub={`${stats?.activeCompetitions ?? 0} running`}
            icon={<Trophy className="text-secondary" size={22} />}
            loading={isLoading}
          />
          <StatCard
            title="Total Users"
            value={stats?.users ?? 0}
            sub="all roles"
            icon={<Users className="text-accent-foreground" size={22} />}
            loading={isLoading}
          />
          <StatCard
            title="Tips Submitted"
            value={stats?.tips ?? 0}
            sub="all time"
            icon={<Zap className="text-primary" size={22} />}
            loading={isLoading}
          />
        </div>

        {/* Recent tenants */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Tenants</CardTitle>
          </CardHeader>
          <CardContent>
            {!tenants?.length ? (
              <p className="text-muted-foreground text-sm">No tenants yet.</p>
            ) : (
              <div className="divide-y divide-border">
                {tenants.slice(0, 5).map(t => (
                  <div key={t.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-medium text-sm">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.slug}</p>
                    </div>
                    <StatusBadge status={t.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

function StatCard({ title, value, sub, icon, loading }: {
  title: string; value: number; sub: string; icon: React.ReactNode; loading?: boolean;
}) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</p>
            <p className="text-3xl font-bold font-mono mt-1">{loading ? "—" : value}</p>
            <p className="text-xs text-muted-foreground mt-1">{sub}</p>
          </div>
          <div className="p-2 bg-muted rounded-lg">{icon}</div>
        </div>
      </CardContent>
    </Card>
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

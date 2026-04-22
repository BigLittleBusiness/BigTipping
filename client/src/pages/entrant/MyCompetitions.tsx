import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, ChevronRight, LogOut } from "lucide-react";
import { Link } from "wouter";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  active: "bg-blue-100 text-blue-700",
  "round-by-round": "bg-secondary/10 text-secondary",
  completed: "bg-green-100 text-green-700",
};

export default function MyCompetitions() {
  const { user, loading, isAuthenticated } = useAuth();
  const { data: myComps } = trpc.competitions.myCompetitions.useQuery(undefined, { enabled: isAuthenticated });
  const logout = trpc.auth.logout.useMutation({ onSuccess: () => { window.location.href = "/"; } });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm">
          <CardContent className="pt-8 pb-8 text-center">
            <Trophy size={40} className="text-primary mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Big Tipping</h2>
            <p className="text-muted-foreground text-sm mb-6">Sign in to view your competitions</p>
            <Button className="w-full" onClick={() => window.location.href = getLoginUrl()}>Sign In</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top nav */}
      <header className="h-14 border-b border-border bg-card flex items-center px-4 gap-3">
        <div className="w-7 h-7 rounded bg-accent flex items-center justify-center">
          <Trophy size={14} className="text-accent-foreground" />
        </div>
        <span className="font-heading font-bold text-base">Big Tipping</span>
        <div className="flex-1" />
        <span className="text-sm text-muted-foreground">{user?.name}</span>
        <Button variant="ghost" size="sm" onClick={() => logout.mutate()} className="gap-1 text-muted-foreground">
          <LogOut size={14} /> Sign out
        </Button>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">My Competitions</h1>
          <p className="text-muted-foreground mt-1">Your active tipping competitions</p>
        </div>

        {!myComps?.length ? (
          <Card>
            <CardContent className="flex flex-col items-center py-16 text-center">
              <Trophy size={40} className="text-muted-foreground mb-3" />
              <p className="text-muted-foreground">You haven't joined any competitions yet.</p>
              <p className="text-sm text-muted-foreground mt-1">Ask your organiser for a link to join.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {myComps.map(c => (
              <Link key={c.id} href={`/comp/${c.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{c.name}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">{c.season ?? ""}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[c.status] ?? ""}`}>
                          {c.status}
                        </span>
                        <ChevronRight size={16} className="text-muted-foreground" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

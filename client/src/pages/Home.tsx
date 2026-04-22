import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Trophy, Users, BarChart3, Zap, ArrowRight, CheckCircle2,
  Building2, Shield, Layers
} from "lucide-react";
import { Link, useLocation } from "wouter";

export default function Home() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const seedData = trpc.seed.run.useMutation({
    onSuccess: (d) => {
      toast.success("Demo data seeded! Redirecting to tenant dashboard…");
      setTimeout(() => navigate("/tenant/dashboard"), 1200);
    },
    onError: (e) => toast.error("Seed failed: " + e.message),
  });

  // Role-based redirect for authenticated users
  const handleDashboard = () => {
    if (!user) return;
    if (user.role === "system_admin") navigate("/admin/overview");
    else if (user.role === "tenant_admin") navigate("/tenant/dashboard");
    else navigate("/my-competitions");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Nav */}
      <header className="h-16 border-b border-border bg-card/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Placeholder logo area */}
            <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center">
              <Trophy size={18} className="text-accent-foreground" />
            </div>
            <span className="font-heading font-bold text-lg">Big Tipping</span>
          </div>
          <div className="flex items-center gap-3">
            {loading ? null : isAuthenticated ? (
              <>
                <span className="text-sm text-muted-foreground hidden sm:block">{user?.name}</span>
                <Button onClick={handleDashboard} className="gap-2">
                  Dashboard <ArrowRight size={14} />
                </Button>
              </>
            ) : (
              <Button onClick={() => window.location.href = getLoginUrl()} className="gap-2">
                Sign In <ArrowRight size={14} />
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-primary text-primary-foreground py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-primary-foreground/10 text-primary-foreground/80 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
            <Zap size={12} /> AFL · NRL · Super Netball
          </div>
          <h1 className="text-4xl md:text-6xl font-bold font-heading leading-tight mb-6">
            Turn sports fans into<br />
            <span className="text-accent">loyal customers</span>
          </h1>
          <p className="text-xl text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
            Big Tipping lets pubs, clubs, and businesses run branded sports tipping competitions — no gambling, no complexity, just engagement.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {isAuthenticated ? (
              <Button
                size="lg"
                className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2 text-base font-semibold"
                onClick={handleDashboard}
              >
                Go to Dashboard <ArrowRight size={18} />
              </Button>
            ) : (
              <Button
                size="lg"
                className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2 text-base font-semibold"
                onClick={() => window.location.href = getLoginUrl()}
              >
                Get Started Free <ArrowRight size={18} />
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-10">Everything you need to run a great comp</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: <Building2 size={22} className="text-primary" />, title: "Multi-tenant", desc: "Each organisation gets their own branded competition space." },
              { icon: <Trophy size={22} className="text-secondary" />, title: "AFL, NRL & Super Netball", desc: "Full fixture support for Australia's biggest sports." },
              { icon: <BarChart3 size={22} className="text-primary" />, title: "Live Leaderboard", desc: "Real-time rankings with Gold, Silver, and Bronze badges." },
              { icon: <Zap size={22} className="text-secondary" />, title: "Instant Scoring", desc: "Enter results and scores update automatically across all entrants." },
              { icon: <Users size={22} className="text-primary" />, title: "Entrant Management", desc: "Invite participants, track engagement, and award prizes." },
              { icon: <Shield size={22} className="text-secondary" />, title: "Not Gambling", desc: "No money wagered. Prizes are provided by the organiser." },
            ].map((f, i) => (
              <Card key={i} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-5">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center mb-3">{f.icon}</div>
                  <h3 className="font-semibold mb-1">{f.title}</h3>
                  <p className="text-sm text-muted-foreground">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Roles overview */}
      <section className="bg-muted/30 border-y border-border py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-10">Built for everyone in the comp</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                role: "System Admin",
                icon: <Shield size={20} />,
                color: "bg-primary/10 text-primary",
                desc: "Manage tenants, configure sports and teams, and monitor platform-wide usage.",
              },
              {
                role: "Tenant Admin",
                icon: <Building2 size={20} />,
                color: "bg-secondary/10 text-secondary",
                desc: "Create competitions, set up rounds and fixtures, manage prizes and entrants.",
              },
              {
                role: "Entrant",
                icon: <Users size={20} />,
                color: "bg-accent/20 text-accent-foreground",
                desc: "Submit tips, track your score, and compete for prizes on the live leaderboard.",
              },
            ].map((r, i) => (
              <div key={i} className="text-center p-6 rounded-xl bg-card border border-border">
                <div className={`w-12 h-12 rounded-full ${r.color} flex items-center justify-center mx-auto mb-3`}>
                  {r.icon}
                </div>
                <h3 className="font-semibold mb-2">{r.role}</h3>
                <p className="text-sm text-muted-foreground">{r.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo seed section (for authenticated system_admin) */}
      {isAuthenticated && user?.role === "system_admin" && (
        <section className="py-10 px-4 border-b border-border">
          <div className="max-w-lg mx-auto text-center">
            <h3 className="font-bold mb-2">Quick Demo Setup</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Seed the platform with AFL teams, a demo tenant, and a sample competition to explore all features.
            </p>
            <Button
              variant="outline"
              onClick={() => seedData.mutate()}
              disabled={seedData.isPending}
              className="gap-2"
            >
              {seedData.isPending ? "Seeding…" : "Seed Demo Data"}
            </Button>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="mt-auto border-t border-border py-8 px-4 text-center text-xs text-muted-foreground">
        <p>© {new Date().getFullYear()} Big Tipping · No money is wagered on this platform · Australia & New Zealand</p>
      </footer>
    </div>
  );
}

import { useParams } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Trophy, Users, CheckCircle2, Zap, ArrowRight, Loader2 } from "lucide-react";
import { useLocation } from "wouter";

export default function CompetitionLanding() {
  const params = useParams<{ id: string }>();
  const compId = Number(params.id);
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();

  const { data: comp } = trpc.competitions.get.useQuery({ id: compId });
  const { data: leaderboard } = trpc.leaderboard.get.useQuery({ competitionId: compId }, { enabled: !!compId });
  const { data: prizes } = trpc.prizes.list.useQuery({ competitionId: compId }, { enabled: !!compId });

  const join = trpc.competitions.join.useMutation({
    onSuccess: () => {
      toast.success("You've joined the competition!");
      navigate(`/comp/${compId}`);
    },
    onError: () => toast.error("Could not join. Please try again."),
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (!comp) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Competition not found.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="bg-primary text-primary-foreground">
        <div className="max-w-3xl mx-auto px-4 py-16 text-center">
          {/* Placeholder logo area */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
              <Trophy size={20} className="text-accent-foreground" />
            </div>
            <span className="font-heading font-bold text-xl">Big Tipping</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold font-heading mb-4 leading-tight">
            {comp.name}
          </h1>
          {comp.description && (
            <p className="text-primary-foreground/80 text-lg mb-6 max-w-xl mx-auto">{comp.description}</p>
          )}
          {comp.season && (
            <p className="text-sm text-primary-foreground/60 mb-8">{comp.season} Season</p>
          )}

          {!isAuthenticated ? (
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                size="lg"
                className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2 text-base font-semibold"
                onClick={() => window.location.href = getLoginUrl()}
              >
                Sign In to Join <ArrowRight size={18} />
              </Button>
            </div>
          ) : (
            <Button
              size="lg"
              className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2 text-base font-semibold"
              onClick={() => join.mutate({ competitionId: compId })}
              disabled={join.isPending}
            >
              {join.isPending ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} />}
              Join Competition
            </Button>
          )}
        </div>
      </div>

      {/* How it works */}
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h2 className="text-xl font-bold text-center mb-8">How It Works</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            { icon: <Users size={24} />, title: "Join Free", desc: "Sign in and join this competition with one click." },
            { icon: <CheckCircle2 size={24} />, title: "Pick Your Winners", desc: "Submit your tips before each round closes." },
            { icon: <Trophy size={24} />, title: "Win Prizes", desc: "Climb the leaderboard and win prizes from the organiser." },
          ].map((step, i) => (
            <div key={i} className="flex flex-col items-center text-center p-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-3">
                {step.icon}
              </div>
              <h3 className="font-semibold mb-1">{step.title}</h3>
              <p className="text-sm text-muted-foreground">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Prizes preview */}
      {prizes && prizes.length > 0 && (
        <div className="bg-muted/30 border-y border-border">
          <div className="max-w-3xl mx-auto px-4 py-10">
            <h2 className="text-xl font-bold mb-6 text-center">Prizes</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {prizes.map(p => (
                <Card key={p.id}>
                  <CardContent className="py-4 flex items-start gap-3">
                    <div className="p-2 bg-accent/20 rounded-lg shrink-0">
                      <Trophy size={18} className="text-accent-foreground" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{p.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{p.description}</p>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted mt-2 inline-block capitalize">{p.type}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard preview */}
      {leaderboard && leaderboard.length > 0 && (
        <div className="max-w-3xl mx-auto px-4 py-10">
          <h2 className="text-xl font-bold mb-6 text-center">Current Standings</h2>
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {leaderboard.slice(0, 5).map(entry => {
                  const badge = entry.rankBadge as string | null;
                  const badgeStyle: Record<string, string> = {
                    Gold: "bg-yellow-100 text-yellow-700 border border-yellow-300",
                    Silver: "bg-gray-100 text-gray-600 border border-gray-300",
                    Bronze: "bg-orange-100 text-orange-700 border border-orange-300",
                  };
                  return (
                    <div key={entry.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="w-12 shrink-0">
                        {badge ? (
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badgeStyle[badge] ?? ""}`}>{badge}</span>
                        ) : (
                          <span className="font-mono text-sm text-muted-foreground">#{entry.rank}</span>
                        )}
                      </div>
                      <p className="flex-1 text-sm font-medium">{entry.user?.name ?? "—"}</p>
                      <p className="font-mono font-bold text-primary">{entry.totalPoints} pts</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Footer CTA */}
      <div className="border-t border-border py-8 text-center">
        {!isAuthenticated ? (
          <Button
            size="lg"
            className="gap-2"
            onClick={() => window.location.href = getLoginUrl()}
          >
            Sign In to Join <ArrowRight size={16} />
          </Button>
        ) : (
          <Button size="lg" className="gap-2" onClick={() => navigate(`/comp/${compId}`)}>
            Go to Competition <ArrowRight size={16} />
          </Button>
        )}
        <p className="text-xs text-muted-foreground mt-4">Powered by Big Tipping · No money is wagered</p>
      </div>
    </div>
  );
}

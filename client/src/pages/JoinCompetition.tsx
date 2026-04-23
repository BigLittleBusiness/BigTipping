import { useParams, useLocation } from "wouter";
import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Users, CheckCircle2, AlertCircle, Loader2, ArrowRight, Lock } from "lucide-react";
import { toast } from "sonner";

export default function JoinCompetition() {
  const { token } = useParams<{ token: string }>();
  const [, navigate] = useLocation();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [joined, setJoined] = useState(false);

  // Fetch competition details from the invite token (public)
  const { data: comp, isLoading: compLoading } = trpc.invites.getByToken.useQuery(
    { token: token ?? "" },
    { enabled: !!token, retry: false }
  );

  // Join mutation
  const joinMutation = trpc.invites.joinViaInvite.useMutation({
    onSuccess: (data) => {
      setJoined(true);
      toast.success(`You've joined "${data.competitionName}"!`);
      setTimeout(() => navigate("/my-competitions"), 2000);
    },
    onError: (err) => toast.error(err.message),
  });

  // Auto-join once authenticated and page is loaded.
  // We only auto-join here if the user is ALREADY authenticated when they arrive
  // (i.e. they clicked the link while already logged in).
  // If they were not authenticated and had to log in, PendingInviteHandler in
  // App.tsx handles the join after OAuth returns, to avoid a double-join race.
  const [autoJoinAttempted, setAutoJoinAttempted] = useState(false);
  const [wasAuthOnMount] = useState(() => !authLoading); // snapshot at mount
  useEffect(() => {
    if (
      isAuthenticated &&
      wasAuthOnMount && // only auto-join if already authed on arrival
      token &&
      comp &&
      "id" in comp &&
      !joined &&
      !autoJoinAttempted &&
      !joinMutation.isPending
    ) {
      setAutoJoinAttempted(true);
      joinMutation.mutate({ token });
    }
  }, [isAuthenticated, token, comp, joined, autoJoinAttempted, wasAuthOnMount]);

  // ── Loading states ─────────────────────────────────────────────────────────
  if (compLoading || authLoading) {
    return (
      <div className="min-h-screen bg-[#F9F9F9] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#2B4EAE]" />
      </div>
    );
  }

  // ── Invalid token ──────────────────────────────────────────────────────────
  if (!comp) {
    return (
      <div className="min-h-screen bg-[#F9F9F9] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="font-heading text-2xl font-bold text-gray-900 mb-2">
            Invalid Invite Link
          </h1>
          <p className="text-gray-500 mb-6">
            This invite link is invalid or has expired. Please ask the competition organiser for a new link.
          </p>
          <Button variant="outline" onClick={() => navigate("/")}>
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  // ── Disabled invite ────────────────────────────────────────────────────────
  if ("disabled" in comp) {
    return (
      <div className="min-h-screen bg-[#F9F9F9] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-amber-500" />
          </div>
          <h1 className="font-heading text-2xl font-bold text-gray-900 mb-2">
            Invitations Paused
          </h1>
          <p className="text-gray-500 mb-6">
            The organiser has temporarily disabled new entries for this competition. Please check back later or contact the organiser.
          </p>
          <Button variant="outline" onClick={() => navigate("/")}>
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  // ── Joined successfully ────────────────────────────────────────────────────
  if (joined) {
    return (
      <div className="min-h-screen bg-[#F9F9F9] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="font-heading text-2xl font-bold text-gray-900 mb-2">
            You're in!
          </h1>
          <p className="text-gray-500 mb-2">
            You've successfully joined <strong>{comp.name}</strong>.
          </p>
          <p className="text-sm text-gray-400">Redirecting you to your competitions…</p>
          <Loader2 className="w-5 h-5 animate-spin text-[#2B4EAE] mx-auto mt-4" />
        </div>
      </div>
    );
  }

  // ── Main join page ─────────────────────────────────────────────────────────
  const statusColour: Record<string, string> = {
    draft: "bg-gray-100 text-gray-600",
    active: "bg-green-100 text-green-700",
    "round-by-round": "bg-blue-100 text-blue-700",
    completed: "bg-red-100 text-red-600",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#2B4EAE] to-[#1a3580] flex items-center justify-center px-4 py-12">
      <div className="max-w-lg w-full">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header band */}
          <div className="bg-[#2B4EAE] px-8 py-6 text-white">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-[#F5A623]" />
              </div>
              <span className="text-sm font-semibold opacity-80 uppercase tracking-wider">
                {comp.tenantName}
              </span>
            </div>
            <h1 className="font-heading text-2xl font-bold mt-3 leading-tight">
              {comp.name}
            </h1>
            {comp.season && (
              <p className="text-white/70 text-sm mt-1">{comp.season}</p>
            )}
          </div>

          {/* Body */}
          <div className="px-8 py-6">
            {/* Meta badges */}
            <div className="flex flex-wrap gap-2 mb-5">
              <Badge className="bg-[#2B4EAE]/10 text-[#2B4EAE] border-0 font-semibold">
                {comp.sportName}
              </Badge>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                  statusColour[comp.status] ?? "bg-gray-100 text-gray-600"
                }`}
              >
                {comp.status}
              </span>
            </div>

            {comp.description && (
              <p className="text-gray-600 text-sm mb-5 leading-relaxed">
                {comp.description}
              </p>
            )}

            {/* What to expect */}
            <div className="bg-[#F9F9F9] rounded-xl p-4 mb-6 space-y-2">
              {[
                "Tip the winner of each match every round",
                "Earn points for every correct tip",
                "Climb the leaderboard and compete for prizes",
                "Weekly round results sent straight to your inbox",
              ].map((item) => (
                <div key={item} className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#2B4EAE] mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-700">{item}</span>
                </div>
              ))}
            </div>

            {/* CTA */}
            {isAuthenticated ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                  <Users className="w-4 h-4" />
                  <span>Joining as <strong>{user?.name ?? user?.email}</strong></span>
                </div>
                <Button
                  size="lg"
                  className="w-full bg-[#C8521A] hover:bg-[#b04516] text-white font-bold"
                  disabled={joinMutation.isPending}
                  onClick={() => joinMutation.mutate({ token: token! })}
                >
                  {joinMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Joining…
                    </>
                  ) : (
                    <>
                      Join Competition
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-500 text-center">
                  Sign in to join this competition — it only takes a moment.
                </p>
                <Button
                  size="lg"
                  className="w-full bg-[#2B4EAE] hover:bg-[#1a3580] text-white font-bold"
                  onClick={() => {
                    // Store the invite token so we can auto-join after login
                    sessionStorage.setItem("pendingInviteToken", token!);
                    window.location.href = getLoginUrl();
                  }}
                >
                  Sign In to Join
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
                <p className="text-xs text-gray-400 text-center">
                  No account? You'll be prompted to create one for free.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer note */}
        <p className="text-center text-white/60 text-xs mt-4">
          No gambling. No wagering. Prizes provided by {comp.tenantName}.
        </p>
      </div>
    </div>
  );
}

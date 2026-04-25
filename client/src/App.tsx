import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

// Public pages
import Home from "./pages/Home";
import CompetitionLanding from "./pages/CompetitionLanding";
import JoinCompetition from "./pages/JoinCompetition";

// Marketing pages
import WhyTipping from "./pages/marketing/WhyTipping";
import HowItWorks from "./pages/marketing/HowItWorks";
import UseCases from "./pages/marketing/UseCases";
import Features from "./pages/marketing/Features";
import Pricing from "./pages/marketing/Pricing";
import Contact from "./pages/marketing/Contact";

// System Admin pages
import AdminOverview from "./pages/admin/Overview";
import AdminTenants from "./pages/admin/Tenants";
import AdminSports from "./pages/admin/Sports";
import FixtureManager from "./pages/admin/FixtureManager";

// Tenant Admin pages
import TenantDashboard from "./pages/tenant/Dashboard";
import TenantCompetitions from "./pages/tenant/Competitions";
import CompetitionDetail from "./pages/tenant/CompetitionDetail";
import RoundResults from "./pages/tenant/RoundResults";
import EmailSettings from "./pages/tenant/EmailSettings";

// Entrant pages
import MyCompetitions from "./pages/entrant/MyCompetitions";
import CompetitionHub from "./pages/entrant/CompetitionHub";

/**
 * After OAuth completes, the user lands back on the app (usually at "/").
 * If they clicked an invite link before logging in, we stored the token in
 * sessionStorage. This component detects that case and auto-joins them.
 */
function PendingInviteHandler() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  const joinMutation = trpc.invites.joinViaInvite.useMutation({
    onSuccess: (data) => {
      toast.success(`You've joined "${data.competitionName}"!`);
      sessionStorage.removeItem("pendingInviteToken");
      navigate("/my-competitions");
    },
    onError: (err) => {
      toast.error(err.message);
      sessionStorage.removeItem("pendingInviteToken");
    },
  });

  useEffect(() => {
    if (!isAuthenticated) return;
    const token = sessionStorage.getItem("pendingInviteToken");
    if (!token) return;
    // Only attempt once — clear immediately to prevent double-fire
    sessionStorage.removeItem("pendingInviteToken");
    joinMutation.mutate({ token });
  }, [isAuthenticated]);

  return null;
}

function Router() {
  return (
    <Switch>
      {/* Public */}
      <Route path="/" component={Home} />
      <Route path="/join/:token" component={JoinCompetition} />
      <Route path="/competition/:id" component={CompetitionLanding} />

      {/* Marketing */}
      <Route path="/why-tipping" component={WhyTipping} />
      <Route path="/how-it-works" component={HowItWorks} />
      <Route path="/use-cases" component={UseCases} />
      <Route path="/features" component={Features} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/contact" component={Contact} />

      {/* System Admin */}
      <Route path="/admin/overview" component={AdminOverview} />
      <Route path="/admin/tenants" component={AdminTenants} />
      <Route path="/admin/sports" component={AdminSports} />
      <Route path="/admin/fixtures" component={FixtureManager} />

      {/* Tenant Admin */}
      <Route path="/tenant/dashboard" component={TenantDashboard} />
      <Route path="/tenant/competitions" component={TenantCompetitions} />
      <Route path="/tenant/competitions/:id" component={CompetitionDetail} />
      <Route path="/tenant/competitions/:compId/results/:roundId" component={RoundResults} />
      <Route path="/tenant/email-settings" component={EmailSettings} />

      {/* Entrant */}
      <Route path="/my-competitions" component={MyCompetitions} />
      <Route path="/comp/:id" component={CompetitionHub} />

      {/* Fallback */}
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <PendingInviteHandler />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

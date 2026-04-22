import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

// Public pages
import Home from "./pages/Home";
import CompetitionLanding from "./pages/CompetitionLanding";

// System Admin pages
import AdminOverview from "./pages/admin/Overview";
import AdminTenants from "./pages/admin/Tenants";
import AdminSports from "./pages/admin/Sports";

// Tenant Admin pages
import TenantDashboard from "./pages/tenant/Dashboard";
import TenantCompetitions from "./pages/tenant/Competitions";
import CompetitionDetail from "./pages/tenant/CompetitionDetail";

// Entrant pages
import MyCompetitions from "./pages/entrant/MyCompetitions";
import CompetitionHub from "./pages/entrant/CompetitionHub";

function Router() {
  return (
    <Switch>
      {/* Public */}
      <Route path="/" component={Home} />
      <Route path="/join/:id" component={CompetitionLanding} />

      {/* System Admin */}
      <Route path="/admin/overview" component={AdminOverview} />
      <Route path="/admin/tenants" component={AdminTenants} />
      <Route path="/admin/sports" component={AdminSports} />

      {/* Tenant Admin */}
      <Route path="/tenant/dashboard" component={TenantDashboard} />
      <Route path="/tenant/competitions" component={TenantCompetitions} />
      <Route path="/tenant/competitions/:id" component={CompetitionDetail} />

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
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

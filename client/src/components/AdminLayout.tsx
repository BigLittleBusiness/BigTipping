import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { cn } from "@/lib/utils";
import {
  BarChart3, Building2, ChevronRight, Layers, LogOut,
  Settings, Shield, Trophy, Users, Zap
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles: string[];
}

const NAV_ITEMS: NavItem[] = [
  // System Admin
  { label: "Platform Overview", href: "/admin/overview",    icon: <BarChart3 size={18} />, roles: ["system_admin"] },
  { label: "Tenants",           href: "/admin/tenants",     icon: <Building2 size={18} />, roles: ["system_admin"] },
  { label: "Sports & Teams",    href: "/admin/sports",      icon: <Zap size={18} />,       roles: ["system_admin"] },
  // Tenant Admin
  { label: "Dashboard",         href: "/tenant/dashboard",  icon: <Layers size={18} />,    roles: ["tenant_admin"] },
  { label: "Competitions",      href: "/tenant/competitions",icon: <Trophy size={18} />,   roles: ["tenant_admin"] },
  { label: "Entrants",          href: "/tenant/entrants",   icon: <Users size={18} />,     roles: ["tenant_admin"] },
  { label: "Prizes",            href: "/tenant/prizes",     icon: <Trophy size={18} />,    roles: ["tenant_admin"] },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, isAuthenticated } = useAuth();
  const [location] = useLocation();
  const logout = trpc.auth.logout.useMutation({
    onSuccess: () => { window.location.href = "/"; }
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    window.location.href = getLoginUrl();
    return null;
  }

  const role = user.role as string;
  const visibleNav = NAV_ITEMS.filter(n => n.roles.includes(role));

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar text-sidebar-foreground flex flex-col shrink-0">
        {/* Logo area */}
        <div className="h-16 flex items-center px-6 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            {/* Placeholder logo area — swap in final asset here */}
            <div className="w-8 h-8 rounded-md bg-accent flex items-center justify-center">
              <Trophy size={16} className="text-accent-foreground" />
            </div>
            <span className="font-heading font-bold text-lg text-sidebar-foreground tracking-tight">
              Big Tipping
            </span>
          </div>
        </div>

        {/* Role badge */}
        <div className="px-4 py-3 border-b border-sidebar-border">
          <span className={cn(
            "text-xs font-semibold px-2 py-1 rounded-full",
            role === "system_admin" && "bg-primary/20 text-primary-foreground",
            role === "tenant_admin" && "bg-secondary/20 text-secondary-foreground",
          )}>
            {role === "system_admin" ? "System Admin" : "Tenant Admin"}
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-2 space-y-1">
          {visibleNav.map(item => (
            <Link key={item.href} href={item.href}>
              <a className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                location === item.href || location.startsWith(item.href + "/")
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}>
                {item.icon}
                {item.label}
                {(location === item.href || location.startsWith(item.href + "/")) && (
                  <ChevronRight size={14} className="ml-auto" />
                )}
              </a>
            </Link>
          ))}
        </nav>

        {/* User footer */}
        <div className="border-t border-sidebar-border p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
              {user.name?.charAt(0)?.toUpperCase() ?? "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{user.name ?? "User"}</p>
              <p className="text-xs text-sidebar-foreground/50 truncate">{user.email ?? ""}</p>
            </div>
          </div>
          <button
            onClick={() => logout.mutate()}
            className="flex items-center gap-2 text-xs text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors w-full"
          >
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 p-6 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Trophy, Menu, X, ArrowRight, ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";

const navLinks = [
  { label: "Why Tipping?", href: "/why-tipping" },
  { label: "How It Works", href: "/how-it-works" },
  { label: "Use Cases", href: "/use-cases" },
  { label: "Features", href: "/features" },
  { label: "Pricing", href: "/pricing" },
];

// ─── Logo mark ────────────────────────────────────────────────────────────────
function LogoMark({ size = "md" }: { size?: "sm" | "md" }) {
  const dim = size === "sm" ? "w-7 h-7" : "w-8 h-8";
  const icon = size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4";
  const text = size === "sm" ? "text-lg" : "text-xl";
  return (
    <div className="flex items-center gap-2 cursor-pointer">
      {/* Placeholder logo area — swap in final asset here */}
      <div className={`${dim} rounded-lg bg-[#2B4EAE] flex items-center justify-center flex-shrink-0`}>
        <Trophy className={`${icon} text-[#F5A623]`} />
      </div>
      <span className={`font-heading font-bold ${text} text-[#2B4EAE]`}>Big Tipping</span>
    </div>
  );
}

// ─── Marketing Nav ────────────────────────────────────────────────────────────
export function MarketingNav() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [location] = useLocation();
  const [scrolled, setScrolled] = useState(false);

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
  }, [location]);

  // Elevate nav shadow on scroll
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100 transition-shadow duration-200 ${
          scrolled ? "shadow-md" : "shadow-sm"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/">
              <LogoMark />
            </Link>

            {/* Desktop nav links */}
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((l) => (
                <Link key={l.href} href={l.href}>
                  <span
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                      location === l.href
                        ? "text-[#2B4EAE] bg-[#2B4EAE]/8"
                        : "text-gray-600 hover:text-[#2B4EAE] hover:bg-gray-50"
                    }`}
                  >
                    {l.label}
                  </span>
                </Link>
              ))}
            </div>

            {/* Desktop CTAs */}
            <div className="hidden md:flex items-center gap-3">
              <Link href="/login">
                <Button variant="ghost" size="sm" className="text-[#2B4EAE] font-medium hover:bg-[#2B4EAE]/8">
                  Sign In
                </Button>
              </Link>
              <Link href="/contact">
                <Button size="sm" className="bg-[#C8521A] hover:bg-[#b04516] text-white font-semibold px-4">
                  Book a Demo
                </Button>
              </Link>
            </div>

            {/* Mobile hamburger button */}
            <button
              aria-label={drawerOpen ? "Close menu" : "Open menu"}
              aria-expanded={drawerOpen}
              aria-controls="mobile-drawer"
              className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
              onClick={() => setDrawerOpen((v) => !v)}
            >
              {drawerOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* ── Mobile drawer backdrop ── */}
      <div
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-gray-900/50 backdrop-blur-sm md:hidden transition-opacity duration-300 ${
          drawerOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setDrawerOpen(false)}
      />

      {/* ── Mobile slide-out drawer ── */}
      <div
        id="mobile-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className={`fixed top-0 right-0 bottom-0 z-50 w-72 max-w-[85vw] bg-white shadow-2xl md:hidden flex flex-col transition-transform duration-300 ease-in-out ${
          drawerOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-5 h-16 border-b border-gray-100 flex-shrink-0">
          <Link href="/">
            <LogoMark size="sm" />
          </Link>
          <button
            aria-label="Close menu"
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
            onClick={() => setDrawerOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <p className="px-3 pb-2 text-xs font-bold uppercase tracking-wider text-gray-400">
            Platform
          </p>
          <ul className="space-y-0.5">
            {navLinks.map((l) => (
              <li key={l.href}>
                <Link href={l.href}>
                  <div
                    className={`flex items-center justify-between px-3 py-3 rounded-xl cursor-pointer transition-colors ${
                      location === l.href
                        ? "bg-[#2B4EAE] text-white"
                        : "text-gray-700 hover:bg-gray-50 hover:text-[#2B4EAE]"
                    }`}
                  >
                    <span className="text-sm font-semibold">{l.label}</span>
                    <ChevronRight
                      className={`w-4 h-4 flex-shrink-0 ${
                        location === l.href ? "text-white/70" : "text-gray-400"
                      }`}
                    />
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="px-3 pb-2 text-xs font-bold uppercase tracking-wider text-gray-400">
              Account
            </p>
            <ul className="space-y-0.5">
              <li>
                <Link href="/login">
                  <div className="flex items-center justify-between px-3 py-3 rounded-xl text-gray-700 hover:bg-gray-50 hover:text-[#2B4EAE] cursor-pointer transition-colors">
                    <span className="text-sm font-semibold">Sign In</span>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                </Link>
              </li>
            </ul>
          </div>
        </nav>

        {/* Drawer footer CTA */}
        <div className="flex-shrink-0 px-5 py-5 border-t border-gray-100 bg-gray-50">
          <Link href="/contact">
            <Button
              size="lg"
              className="w-full bg-[#C8521A] hover:bg-[#b04516] text-white font-bold"
            >
              Book a Free Demo
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
          <p className="text-xs text-gray-400 text-center mt-2">
            14-day free trial · No credit card required
          </p>
        </div>
      </div>
    </>
  );
}

// ─── Marketing Footer ─────────────────────────────────────────────────────────
export function MarketingFooter() {
  return (
    <footer className="bg-gray-900 text-gray-400 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-[#2B4EAE] flex items-center justify-center">
                <Trophy className="w-3.5 h-3.5 text-[#F5A623]" />
              </div>
              <span className="font-heading font-bold text-white text-lg">Big Tipping</span>
            </div>
            <p className="text-sm leading-relaxed max-w-xs">
              The sports tipping platform built for businesses that want to engage their audience all season long.
            </p>
            <p className="text-xs mt-4 text-gray-600">AFL · NRL · Super Netball · Australia &amp; New Zealand</p>
          </div>
          <div>
            <h4 className="text-white font-semibold text-sm mb-3">Platform</h4>
            <ul className="space-y-2 text-sm">
              {navLinks.map((l) => (
                <li key={l.href}>
                  <Link href={l.href}>
                    <span className="hover:text-white transition-colors cursor-pointer">{l.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold text-sm mb-3">Company</h4>
            <ul className="space-y-2 text-sm">
              {[
                { label: "Contact Us", href: "/contact" },
                { label: "Book a Demo", href: "/contact" },
                { label: "Sign In", href: "/login" },
              ].map((l) => (
                <li key={l.label}>
                  <Link href={l.href}>
                    <span className="hover:text-white transition-colors cursor-pointer">{l.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 pt-6 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs">
          <p>© 2025 Big Tipping. All rights reserved.</p>
          <p className="text-gray-600">
            Not a gambling platform. No wagering. Prizes provided by competition organisers.
          </p>
        </div>
      </div>
    </footer>
  );
}

// ─── Layout wrapper ───────────────────────────────────────────────────────────
interface MarketingLayoutProps {
  children: React.ReactNode;
}

export default function MarketingLayout({ children }: MarketingLayoutProps) {
  return (
    <div className="min-h-screen bg-[#F9F9F9]">
      <MarketingNav />
      <main className="pt-0">{children}</main>
      <MarketingFooter />
    </div>
  );
}

import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Trophy, Menu, X } from "lucide-react";
import { useState } from "react";

const navLinks = [
  { label: "Why Tipping?", href: "/why-tipping" },
  { label: "How It Works", href: "/how-it-works" },
  { label: "Use Cases", href: "/use-cases" },
  { label: "Features", href: "/features" },
  { label: "Pricing", href: "/pricing" },
];

export function MarketingNav() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo placeholder */}
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer">
              <div className="w-8 h-8 rounded-lg bg-[#2B4EAE] flex items-center justify-center">
                <Trophy className="w-4 h-4 text-[#F5A623]" />
              </div>
              <span className="font-heading font-bold text-xl text-[#2B4EAE]">
                Big Tipping
              </span>
            </div>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((l) => (
              <Link key={l.href} href={l.href}>
                <span className="text-sm font-medium text-gray-600 hover:text-[#2B4EAE] transition-colors cursor-pointer">
                  {l.label}
                </span>
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="text-[#2B4EAE] font-medium">
                Sign In
              </Button>
            </Link>
            <Link href="/contact">
              <Button size="sm" className="bg-[#C8521A] hover:bg-[#b04516] text-white font-semibold px-4">
                Book a Demo
              </Button>
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-gray-100 py-4 space-y-1">
            {navLinks.map((l) => (
              <Link key={l.href} href={l.href}>
                <span
                  className="block px-3 py-2 text-sm font-medium text-gray-700 hover:text-[#2B4EAE] hover:bg-gray-50 rounded-lg cursor-pointer"
                  onClick={() => setMobileOpen(false)}
                >
                  {l.label}
                </span>
              </Link>
            ))}
            <div className="pt-3 flex flex-col gap-2 px-3">
              <Link href="/login">
                <Button variant="outline" size="sm" className="w-full">Sign In</Button>
              </Link>
              <Link href="/contact">
                <Button size="sm" className="w-full bg-[#C8521A] hover:bg-[#b04516] text-white">
                  Book a Demo
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

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
              {[{ label: "Contact Us", href: "/contact" }, { label: "Book a Demo", href: "/contact" }, { label: "Sign In", href: "/login" }].map((l) => (
                <li key={l.href}>
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
          <p className="text-gray-600">Not a gambling platform. No wagering. Prizes provided by competition organisers.</p>
        </div>
      </div>
    </footer>
  );
}

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

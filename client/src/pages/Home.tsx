import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Mail,
  TrendingUp,
  Trophy,
  Building2,
  Beer,
  Briefcase,
  ChevronRight,
  CheckCircle2,
  BarChart3,
  Zap,
  Shield,
  Star,
  ArrowRight,
  Play,
} from "lucide-react";
import { MarketingNav, MarketingFooter } from "@/components/MarketingLayout";

// Nav and Footer are imported from MarketingLayout

// ─── Hero ─────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="relative pt-24 pb-20 overflow-hidden bg-[#2B4EAE]">
      {/* Background texture */}
      <div className="absolute inset-0 opacity-10">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle at 25% 50%, #F5A623 0%, transparent 50%), radial-gradient(circle at 75% 20%, #C8521A 0%, transparent 40%)",
          }}
        />
      </div>
      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Copy */}
          <div>
            <Badge className="mb-6 bg-[#F5A623]/20 text-[#F5A623] border-[#F5A623]/30 font-semibold text-xs uppercase tracking-wider">
              AFL · NRL · Super Netball
            </Badge>
            <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
              Keep your customers{" "}
              <span className="text-[#F5A623]">coming back</span>{" "}
              all season long.
            </h1>
            <p className="text-lg text-blue-100 leading-relaxed mb-8 max-w-lg">
              Big Tipping gives your business a fully branded sports tipping
              competition — so you stay front-of-mind with clients and prospects
              every single week of the season.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-10">
              <Link href="/contact">
                <Button
                  size="lg"
                  className="bg-[#C8521A] hover:bg-[#b04516] text-white font-bold px-8 py-4 text-base shadow-lg"
                >
                  Book a Free Demo
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link href="/how-it-works">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/40 text-white hover:bg-white/10 font-semibold px-8 py-4 text-base"
                >
                  <Play className="mr-2 w-4 h-4" />
                  See How It Works
                </Button>
              </Link>
            </div>

            {/* Trust signals */}
            <div className="flex flex-wrap gap-6 text-sm text-blue-200">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#F5A623]" />
                <span>No gambling. No wagering.</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#F5A623]" />
                <span>Live in under 30 minutes</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#F5A623]" />
                <span>Your brand. Your prizes.</span>
              </div>
            </div>
          </div>

          {/* Right: Stats card */}
          <div className="hidden lg:block">
            <div className="relative">
              {/* Main card */}
              <div className="bg-white rounded-2xl shadow-2xl p-6 border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      The Plumbers Arms — AFL 2025
                    </p>
                    <p className="font-heading font-bold text-gray-800 text-lg">
                      Round 14 Leaderboard
                    </p>
                  </div>
                  <Badge className="bg-green-100 text-green-700 border-0 text-xs">
                    Live
                  </Badge>
                </div>

                {/* Leaderboard preview */}
                <div className="space-y-2 mb-4">
                  {[
                    { rank: 1, name: "Sarah M.", pts: 94, badge: "🥇" },
                    { rank: 2, name: "Dave K.", pts: 91, badge: "🥈" },
                    { rank: 3, name: "Priya L.", pts: 89, badge: "🥉" },
                    { rank: 4, name: "Tom R.", pts: 87, badge: "" },
                    { rank: 5, name: "Jess W.", pts: 85, badge: "" },
                  ].map((row) => (
                    <div
                      key={row.rank}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg ${
                        row.rank === 1
                          ? "bg-[#F5A623]/10 border border-[#F5A623]/30"
                          : "bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-mono font-bold text-gray-400 w-4">
                          {row.badge || row.rank}
                        </span>
                        <span className="text-sm font-semibold text-gray-800">
                          {row.name}
                        </span>
                      </div>
                      <span className="text-sm font-mono font-bold text-[#2B4EAE]">
                        {row.pts} pts
                      </span>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-3 flex items-center justify-between text-xs text-gray-500">
                  <span>142 entrants this season</span>
                  <span className="text-[#C8521A] font-semibold">
                    Round closes Fri 7pm ›
                  </span>
                </div>
              </div>

              {/* Floating email card */}
              <div className="absolute -bottom-6 -left-6 bg-white rounded-xl shadow-lg p-4 border border-gray-100 w-52">
                <div className="flex items-center gap-2 mb-1">
                  <Mail className="w-4 h-4 text-[#C8521A]" />
                  <span className="text-xs font-semibold text-gray-600">
                    Weekly email sent
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  142 opted-in subscribers opened your Round 14 email
                </p>
                <div className="mt-2 flex items-center gap-1">
                  <div className="h-1.5 rounded-full bg-[#2B4EAE] flex-1" />
                  <span className="text-xs font-bold text-[#2B4EAE]">68%</span>
                </div>
              </div>

              {/* Floating stat */}
              <div className="absolute -top-4 -right-4 bg-[#C8521A] rounded-xl shadow-lg p-3 text-white text-center w-28">
                <p className="text-2xl font-heading font-bold">26×</p>
                <p className="text-xs opacity-90">touchpoints per season</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Wave divider */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
          <path d="M0 60L1440 60L1440 20C1200 60 960 0 720 20C480 40 240 0 0 20L0 60Z" fill="#F9F9F9" />
        </svg>
      </div>
    </section>
  );
}

// ─── Social proof / logos strip ───────────────────────────────────────────────
function SocialProof() {
  return (
    <section className="bg-[#F9F9F9] py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-center text-sm font-semibold text-gray-400 uppercase tracking-widest mb-8">
          Trusted by businesses across Australia &amp; New Zealand
        </p>
        <div className="flex flex-wrap justify-center items-center gap-8 opacity-50">
          {[
            "Pubs & Bars",
            "RSL Clubs",
            "Sporting Clubs",
            "Accounting Firms",
            "Real Estate Agencies",
            "Corporate Teams",
            "Media Companies",
          ].map((type) => (
            <div
              key={type}
              className="px-5 py-2 bg-white rounded-full border border-gray-200 text-sm font-semibold text-gray-600 shadow-sm"
            >
              {type}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Core Benefits ────────────────────────────────────────────────────────────
function CoreBenefits() {
  const benefits = [
    {
      icon: <Mail className="w-7 h-7" />,
      colour: "#2B4EAE",
      title: "A direct line to your audience — every week",
      body: "Every entrant opts in to receive your emails. That's two touchpoints a week, for the entire season — without paying for ad space. No algorithm. No algorithm. Just your message, in their inbox.",
    },
    {
      icon: <Users className="w-7 h-7" />,
      colour: "#C8521A",
      title: "Turn prospects into regulars",
      body: "Invite prospects to enter your competition. They come back every round to check their tips, see the leaderboard, and engage with your brand — long before they ever become a customer.",
    },
    {
      icon: <TrendingUp className="w-7 h-7" />,
      colour: "#2B4EAE",
      title: "26+ brand touchpoints per season",
      body: "AFL, NRL, and Super Netball run for 26 rounds or more. That's 26+ weeks of consistent, welcome brand exposure — at a fraction of the cost of traditional advertising.",
    },
    {
      icon: <Trophy className="w-7 h-7" />,
      colour: "#C8521A",
      title: "You set the prizes. We run the comp.",
      body: "Offer a bar tab, a gift voucher, a weekend away — whatever fits your business. Big Tipping handles the platform, the scoring, the leaderboard, and the reminders. You just show up.",
    },
    {
      icon: <BarChart3 className="w-7 h-7" />,
      colour: "#2B4EAE",
      title: "Build a database you actually own",
      body: "Every entrant who registers is a consented contact in your database. No third-party platform owns that relationship. You do.",
    },
    {
      icon: <Shield className="w-7 h-7" />,
      colour: "#C8521A",
      title: "No gambling. No permits. No risk.",
      body: "Tipping competitions are not gambling under Australian law — no money is wagered, and prizes come from you, not the platform. Big Tipping is designed to keep you fully compliant.",
    },
  ];

  return (
    <section className="py-20 bg-[#F9F9F9]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <Badge className="mb-4 bg-[#2B4EAE]/10 text-[#2B4EAE] border-[#2B4EAE]/20 font-semibold text-xs uppercase tracking-wider">
            Why it works
          </Badge>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Sport is the world's greatest conversation starter.
            <br />
            <span className="text-[#2B4EAE]">Your brand should be in that conversation.</span>
          </h2>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">
            A tipping competition gives your business a reason to reach out every week — and gives your audience a reason to engage. It's the most cost-effective engagement tool in sport.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {benefits.map((b, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-white"
                style={{ backgroundColor: b.colour }}
              >
                {b.icon}
              </div>
              <h3 className="font-heading font-bold text-gray-900 text-lg mb-2">
                {b.title}
              </h3>
              <p className="text-gray-500 text-sm leading-relaxed">{b.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Who It's For ─────────────────────────────────────────────────────────────
function WhoItsFor() {
  const segments = [
    {
      icon: <Beer className="w-8 h-8" />,
      label: "Pubs & Clubs",
      headline: "Fill the bar every round day",
      body: "Run a tipping comp that brings punters back week after week. Offer a bar tab as the prize, promote specials in your weekly email, and build a loyal local following.",
      cta: "See how pubs use it",
      href: "/use-cases#pubs",
    },
    {
      icon: <Briefcase className="w-8 h-8" />,
      label: "Corporate & Professional Services",
      headline: "Stay top of mind between meetings",
      body: "Accountants, recruiters, real estate agents and law firms use tipping comps to maintain warm relationships with clients and prospects throughout the year — without a hard sell.",
      cta: "See how corporates use it",
      href: "/use-cases#corporate",
    },
    {
      icon: <Building2 className="w-8 h-8" />,
      label: "Sporting Clubs & Associations",
      headline: "Engage your members all season",
      body: "Keep members engaged beyond match day. Run a tipping comp as a membership benefit, drive traffic to your app or website, and create a community around your club.",
      cta: "See how clubs use it",
      href: "/use-cases#clubs",
    },
  ];

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <Badge className="mb-4 bg-[#C8521A]/10 text-[#C8521A] border-[#C8521A]/20 font-semibold text-xs uppercase tracking-wider">
            Who uses Big Tipping
          </Badge>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Built for every business that wants to{" "}
            <span className="text-[#C8521A]">own the season.</span>
          </h2>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">
            From local pubs to national firms, any business with customers who love sport can run a tipping competition that drives real engagement.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {segments.map((s, i) => (
            <div
              key={i}
              className="group relative rounded-2xl border border-gray-100 bg-[#F9F9F9] p-8 hover:border-[#2B4EAE]/30 hover:bg-white transition-all shadow-sm hover:shadow-md"
            >
              <div className="w-14 h-14 rounded-2xl bg-[#2B4EAE] text-white flex items-center justify-center mb-5 group-hover:bg-[#C8521A] transition-colors">
                {s.icon}
              </div>
              <Badge className="mb-3 bg-gray-200 text-gray-600 border-0 text-xs font-semibold">
                {s.label}
              </Badge>
              <h3 className="font-heading font-bold text-xl text-gray-900 mb-3">
                {s.headline}
              </h3>
              <p className="text-gray-500 text-sm leading-relaxed mb-5">{s.body}</p>
              <Link href={s.href}>
                <span className="inline-flex items-center text-sm font-semibold text-[#2B4EAE] hover:text-[#C8521A] transition-colors cursor-pointer">
                  {s.cta}
                  <ChevronRight className="w-4 h-4 ml-1" />
                </span>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── How It Works (3-step) ────────────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    {
      num: "01",
      title: "Set up your competition in minutes",
      body: "Choose your sport, set your rounds, add your prizes, and customise the competition with your business name. No technical knowledge required.",
      colour: "#2B4EAE",
    },
    {
      num: "02",
      title: "Invite your clients and prospects",
      body: "Share a unique link via email, social media, or in-store. Entrants register, opt in to your communications, and start tipping.",
      colour: "#C8521A",
    },
    {
      num: "03",
      title: "Engage all season — automatically",
      body: "Big Tipping sends weekly reminders, updates the leaderboard after every round, and keeps your audience coming back. You focus on your business.",
      colour: "#2B4EAE",
    },
  ];

  return (
    <section className="py-20 bg-[#2B4EAE] relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <Badge className="mb-4 bg-white/10 text-white border-white/20 font-semibold text-xs uppercase tracking-wider">
            Simple by design
          </Badge>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-white mb-4">
            Up and running in under 30 minutes.
          </h2>
          <p className="text-lg text-blue-200 max-w-xl mx-auto">
            No developers. No spreadsheets. No chasing tips by hand. Just a
            competition that runs itself.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((s, i) => (
            <div key={i} className="relative">
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-8 left-full w-full h-px bg-white/20 z-0" style={{ width: "calc(100% - 2rem)", left: "calc(100% - 1rem)" }} />
              )}
              <div className="relative bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 hover:bg-white/15 transition-colors">
                <div className="font-heading text-5xl font-bold text-[#F5A623] opacity-60 mb-4 font-mono">
                  {s.num}
                </div>
                <h3 className="font-heading font-bold text-white text-xl mb-3">
                  {s.title}
                </h3>
                <p className="text-blue-200 text-sm leading-relaxed">{s.body}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <Link href="/how-it-works">
            <Button
              size="lg"
              className="bg-[#F5A623] hover:bg-[#e09520] text-gray-900 font-bold px-8"
            >
              See the full walkthrough
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

// ─── Key Stats ────────────────────────────────────────────────────────────────
function KeyStats() {
  const stats = [
    { value: "26+", label: "Brand touchpoints per AFL/NRL season" },
    { value: "2×", label: "Weekly email opens per entrant" },
    { value: "30 min", label: "Average time to launch a competition" },
    { value: "100%", label: "Opt-in audience — no cold contacts" },
  ];

  return (
    <section className="py-16 bg-white border-y border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((s, i) => (
            <div key={i} className="text-center">
              <div className="font-heading text-4xl sm:text-5xl font-bold text-[#2B4EAE] mb-2">
                {s.value}
              </div>
              <p className="text-sm text-gray-500 leading-snug">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Feature Highlights ───────────────────────────────────────────────────────
function FeatureHighlights() {
  const features = [
    {
      icon: <Zap className="w-5 h-5" />,
      title: "Fully branded for your business",
      body: "Your competition name, your colours, your prizes. Entrants see your brand — not ours.",
    },
    {
      icon: <Mail className="w-5 h-5" />,
      title: "Automated weekly emails",
      body: "Round reminders and results emails go out automatically, with your branding and custom content.",
    },
    {
      icon: <BarChart3 className="w-5 h-5" />,
      title: "Live leaderboard",
      body: "Real-time rankings with Gold, Silver, and Bronze badges. Entrants check back every round.",
    },
    {
      icon: <Trophy className="w-5 h-5" />,
      title: "Flexible prize management",
      body: "Set weekly prizes, round prizes, and season-end prizes. You control what you offer.",
    },
    {
      icon: <Users className="w-5 h-5" />,
      title: "Multi-competition support",
      body: "Run separate competitions for different audiences — staff, clients, and prospects — all from one dashboard.",
    },
    {
      icon: <Shield className="w-5 h-5" />,
      title: "AFL, NRL & Super Netball fixtures",
      body: "Fixtures, results, and team data are managed for you. No manual data entry required.",
    },
  ];

  return (
    <section className="py-20 bg-[#F9F9F9]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <Badge className="mb-4 bg-[#2B4EAE]/10 text-[#2B4EAE] border-[#2B4EAE]/20 font-semibold text-xs uppercase tracking-wider">
              Platform features
            </Badge>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Everything you need.{" "}
              <span className="text-[#2B4EAE]">Nothing you don't.</span>
            </h2>
            <p className="text-gray-500 text-lg mb-8 leading-relaxed">
              Big Tipping is purpose-built for businesses running competitions for their audience — not for individual punters. Every feature is designed to make your life easier and your competition more engaging.
            </p>
            <Link href="/features">
              <Button
                className="bg-[#2B4EAE] hover:bg-[#1e3d8f] text-white font-semibold"
              >
                Explore all features
                <ChevronRight className="ml-1 w-4 h-4" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {features.map((f, i) => (
              <div
                key={i}
                className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="w-9 h-9 rounded-lg bg-[#2B4EAE]/10 text-[#2B4EAE] flex items-center justify-center mb-3">
                  {f.icon}
                </div>
                <h4 className="font-heading font-bold text-gray-900 text-sm mb-1">
                  {f.title}
                </h4>
                <p className="text-gray-500 text-xs leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── CTA Banner ───────────────────────────────────────────────────────────────
function CTABanner() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="bg-gradient-to-br from-[#2B4EAE] to-[#1e3d8f] rounded-3xl p-12 shadow-xl relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                "radial-gradient(circle at 80% 20%, #F5A623 0%, transparent 40%), radial-gradient(circle at 20% 80%, #C8521A 0%, transparent 40%)",
            }}
          />
          <div className="relative">
            <div className="flex justify-center mb-4">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-5 h-5 text-[#F5A623] fill-[#F5A623]" />
              ))}
            </div>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-white mb-4">
              Ready to own the season?
            </h2>
            <p className="text-blue-200 text-lg mb-8 max-w-xl mx-auto">
              Book a free 20-minute demo and we'll show you exactly how Big Tipping works for your type of business.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/contact">
                <Button
                  size="lg"
                  className="bg-[#C8521A] hover:bg-[#b04516] text-white font-bold px-8 shadow-lg"
                >
                  Book a Free Demo
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link href="/pricing">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/30 text-white hover:bg-white/10 font-semibold px-8"
                >
                  View Pricing
                </Button>
              </Link>
            </div>
            <p className="text-blue-300 text-sm mt-4">
              No credit card required. No lock-in contracts.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// Footer imported from MarketingLayout

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Home() {
  return (
    <div className="min-h-screen bg-[#F9F9F9]">
      <MarketingNav />
      <Hero />
      <SocialProof />
      <CoreBenefits />
      <WhoItsFor />
      <HowItWorks />
      <KeyStats />
      <FeatureHighlights />
      <CTABanner />
      <MarketingFooter />
    </div>
  );
}

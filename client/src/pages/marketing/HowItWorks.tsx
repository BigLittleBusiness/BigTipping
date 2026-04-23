import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Settings,
  UserPlus,
  Mail,
  BarChart3,
  Trophy,
  ArrowRight,
  CheckCircle2,
  Clock,
  Zap,
} from "lucide-react";
import MarketingLayout from "@/components/MarketingLayout";

const steps = [
  {
    num: "01",
    icon: <Settings className="w-7 h-7" />,
    title: "Set up your competition",
    timeEst: "~15 minutes",
    body: "Log in to your Big Tipping dashboard and create a new competition. Choose your sport (AFL, NRL, or Super Netball), give your competition a name, set the season dates, and configure your scoring rules. You can run multiple competitions simultaneously — for example, a client-facing competition and a separate internal staff comp.",
    checklist: [
      "Choose sport and season",
      "Name your competition",
      "Set scoring rules (points per correct tip, bonus for perfect round)",
      "Add your prizes (weekly, round, and season-end)",
      "Customise with your business name",
    ],
  },
  {
    num: "02",
    icon: <UserPlus className="w-7 h-7" />,
    title: "Invite your audience",
    timeEst: "~5 minutes",
    body: "Share your unique competition link via email, social media, your website, or in-store. When entrants click the link, they land on a branded registration page. They enter their details, opt in to receive your emails, and they're in. No app download required — everything works in the browser.",
    checklist: [
      "Copy your unique competition invite link",
      "Share via email, social media, or in-store QR code",
      "Entrants register and opt in to your communications",
      "Entrants are added to your competition automatically",
      "You can see all entrants in your dashboard",
    ],
  },
  {
    num: "03",
    icon: <Mail className="w-7 h-7" />,
    title: "Engage all season automatically",
    timeEst: "Set and forget",
    body: "Once your competition is live, Big Tipping handles the rest. Automated reminder emails go out before each round closes. Results emails go out after each round. Your entrants come back to check their tips, see the leaderboard, and stay engaged with your brand — week after week.",
    checklist: [
      "Automated round-open reminder emails (branded to your business)",
      "Automated round-close results emails with leaderboard",
      "Live leaderboard updates after every game",
      "Entrants can view their tip history and correct/incorrect results",
      "You can add custom content to each email",
    ],
  },
  {
    num: "04",
    icon: <BarChart3 className="w-7 h-7" />,
    title: "Track performance and manage results",
    timeEst: "Ongoing",
    body: "Your Tenant Admin dashboard gives you a real-time view of your competition. See how many entrants are active, which rounds are open, and who's leading the leaderboard. Enter round results after each game day, and the leaderboard updates automatically.",
    checklist: [
      "Enter match results after each round",
      "Leaderboard recalculates automatically",
      "View entrant activity and engagement stats",
      "Manage prizes and announce winners",
      "Export entrant data for your CRM",
    ],
  },
  {
    num: "05",
    icon: <Trophy className="w-7 h-7" />,
    title: "Reward your winners",
    timeEst: "End of season",
    body: "At the end of the season — or at any point during it — award prizes to your weekly, round, and season-end winners. Big Tipping shows you exactly who won and when. You deliver the prize. The platform handles the announcement.",
    checklist: [
      "Season-end leaderboard shows final rankings",
      "Gold, Silver, and Bronze rank badges for top three",
      "Announce winners via the platform or your own channels",
      "You deliver prizes directly to winners",
      "Entrants remain in your database for next season",
    ],
  },
];

export default function HowItWorks() {
  return (
    <MarketingLayout>
      {/* Hero */}
      <section className="pt-24 pb-16 bg-[#2B4EAE] relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Badge className="mb-4 bg-[#F5A623]/20 text-[#F5A623] border-[#F5A623]/30 font-semibold text-xs uppercase tracking-wider">
            Simple by design
          </Badge>
          <h1 className="font-heading text-4xl sm:text-5xl font-bold text-white mb-6">
            From sign-up to first round in{" "}
            <span className="text-[#F5A623]">under 30 minutes</span>
          </h1>
          <p className="text-lg text-blue-100 max-w-2xl mx-auto leading-relaxed">
            No developers. No spreadsheets. No chasing tips by hand. Big Tipping is designed to be set up by anyone — and then run itself.
          </p>
          <div className="flex flex-wrap justify-center gap-6 mt-8 text-sm text-blue-200">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#F5A623]" />
              <span>Live in under 30 minutes</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#F5A623]" />
              <span>No technical knowledge required</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#F5A623]" />
              <span>Full support included</span>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 60L1440 60L1440 20C1200 60 960 0 720 20C480 40 240 0 0 20L0 60Z" fill="#F9F9F9" />
          </svg>
        </div>
      </section>

      {/* Steps */}
      <section className="py-20 bg-[#F9F9F9]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-16">
            {steps.map((step, i) => (
              <div key={i} className="grid md:grid-cols-2 gap-10 items-start">
                <div className={i % 2 === 1 ? "md:order-2" : ""}>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="font-heading text-5xl font-bold text-[#2B4EAE]/20 font-mono">
                      {step.num}
                    </span>
                    <div>
                      <Badge className="bg-[#C8521A]/10 text-[#C8521A] border-[#C8521A]/20 text-xs font-semibold">
                        {step.timeEst}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-[#2B4EAE] text-white flex items-center justify-center">
                      {step.icon}
                    </div>
                    <h2 className="font-heading font-bold text-2xl text-gray-900">{step.title}</h2>
                  </div>
                  <p className="text-gray-600 leading-relaxed">{step.body}</p>
                </div>
                <div className={i % 2 === 1 ? "md:order-1" : ""}>
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">
                      What you'll do
                    </p>
                    <ul className="space-y-3">
                      {step.checklist.map((item, j) => (
                        <li key={j} className="flex items-start gap-3">
                          <CheckCircle2 className="w-4 h-4 text-[#2B4EAE] mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-gray-700">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-white">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="font-heading text-3xl font-bold text-gray-900 mb-4">
            See it live in 20 minutes
          </h2>
          <p className="text-gray-500 mb-8">
            Book a free demo and we'll walk you through the full setup for your specific business type.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/contact">
              <Button size="lg" className="bg-[#C8521A] hover:bg-[#b04516] text-white font-bold px-8">
                Book a Free Demo <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link href="/pricing">
              <Button size="lg" variant="outline" className="border-[#2B4EAE] text-[#2B4EAE] font-semibold px-8">
                View Pricing
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}

import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Mail,
  BarChart3,
  Trophy,
  Users,
  Zap,
  Shield,
  Settings,
  Smartphone,
  Globe,
  Bell,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import MarketingLayout from "@/components/MarketingLayout";

const featureGroups = [
  {
    category: "Competition Management",
    colour: "#2B4EAE",
    features: [
      {
        icon: <Settings className="w-5 h-5" />,
        title: "Full competition lifecycle control",
        body: "Create competitions in draft, launch them when ready, manage round-by-round, and close them out at season end. You're in control of every stage.",
      },
      {
        icon: <Trophy className="w-5 h-5" />,
        title: "AFL, NRL & Super Netball fixtures",
        body: "Fixture data for all three codes is managed for you. No manual data entry. Rounds open and close on schedule.",
      },
      {
        icon: <Zap className="w-5 h-5" />,
        title: "Multiple competitions simultaneously",
        body: "Run separate competitions for different audiences — a client comp, a staff comp, an AFL comp and an NRL comp — all from one dashboard.",
      },
      {
        icon: <Settings className="w-5 h-5" />,
        title: "Configurable scoring rules",
        body: "Set your points per correct tip, configure a perfect-round bonus, and enable streak tracking. Scoring is calculated automatically.",
      },
    ],
  },
  {
    category: "Entrant Experience",
    colour: "#C8521A",
    features: [
      {
        icon: <Smartphone className="w-5 h-5" />,
        title: "Mobile-friendly tip submission",
        body: "Entrants submit their tips from any device — phone, tablet, or desktop. No app download required. Works in any modern browser.",
      },
      {
        icon: <BarChart3 className="w-5 h-5" />,
        title: "Live leaderboard with rank badges",
        body: "Real-time rankings update after every game. Gold, Silver, and Bronze badges for the top three. Entrants check back every round.",
      },
      {
        icon: <CheckCircle2 className="w-5 h-5" />,
        title: "Tip history with correct/incorrect results",
        body: "Entrants can see their full tip history — which tips were correct, which were wrong, and how their score has built over the season.",
      },
      {
        icon: <Trophy className="w-5 h-5" />,
        title: "Prizes panel",
        body: "Entrants can see what prizes are on offer — weekly, round, and season-end — keeping them motivated to stay in the competition.",
      },
    ],
  },
  {
    category: "Email & Communications",
    colour: "#2B4EAE",
    features: [
      {
        icon: <Mail className="w-5 h-5" />,
        title: "Automated round reminder emails",
        body: "Reminder emails go out automatically before each round closes — branded to your business, with your name and competition details.",
      },
      {
        icon: <Mail className="w-5 h-5" />,
        title: "Automated results emails",
        body: "After each round, results emails go out with the updated leaderboard. Entrants see how they're tracking without needing to log in.",
      },
      {
        icon: <Bell className="w-5 h-5" />,
        title: "Custom email content",
        body: "Add your own content to every email — promotions, events, news, or anything else you want your audience to see.",
      },
      {
        icon: <Users className="w-5 h-5" />,
        title: "Opted-in subscriber list",
        body: "Every entrant explicitly opts in to receive your emails at registration. Your list is fully consented and SPAM-compliant.",
      },
    ],
  },
  {
    category: "Admin & Analytics",
    colour: "#C8521A",
    features: [
      {
        icon: <BarChart3 className="w-5 h-5" />,
        title: "Tenant Admin dashboard",
        body: "A clean, purpose-built dashboard for managing your competitions, entrants, rounds, fixtures, and prizes — all in one place.",
      },
      {
        icon: <Users className="w-5 h-5" />,
        title: "Entrant management",
        body: "View all entrants, their registration details, and their activity. Export your entrant list for use in your CRM or email platform.",
      },
      {
        icon: <Globe className="w-5 h-5" />,
        title: "Public competition landing page",
        body: "Each competition has its own branded landing page for entrant registration. Share the link anywhere — email, social, in-store.",
      },
      {
        icon: <Shield className="w-5 h-5" />,
        title: "Role-based access control",
        body: "Invite team members to help manage your competition. Set permissions so each person can only access what they need.",
      },
    ],
  },
  {
    category: "Platform & Security",
    colour: "#2B4EAE",
    features: [
      {
        icon: <Shield className="w-5 h-5" />,
        title: "Multi-tenant architecture",
        body: "Each business's data is completely isolated. Your entrants, competitions, and results are never visible to other organisations on the platform.",
      },
      {
        icon: <Globe className="w-5 h-5" />,
        title: "Australian & New Zealand hosting",
        body: "Big Tipping is built for the Australian and New Zealand market. Data is stored in compliance with Australian privacy law.",
      },
      {
        icon: <Zap className="w-5 h-5" />,
        title: "Always-on reliability",
        body: "The platform is designed to handle peak load during round-close periods — when thousands of entrants are submitting tips simultaneously.",
      },
      {
        icon: <Smartphone className="w-5 h-5" />,
        title: "No app required",
        body: "Everything works in the browser. No app store approvals, no download friction, no version management. Just a link.",
      },
    ],
  },
];

export default function Features() {
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
            Platform features
          </Badge>
          <h1 className="font-heading text-4xl sm:text-5xl font-bold text-white mb-6">
            Everything you need to run a{" "}
            <span className="text-[#F5A623]">world-class tipping competition</span>
          </h1>
          <p className="text-lg text-blue-100 max-w-2xl mx-auto leading-relaxed">
            Big Tipping is purpose-built for businesses running competitions for their audience. Every feature is designed to make your life easier and your competition more engaging.
          </p>
        </div>
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 60L1440 60L1440 20C1200 60 960 0 720 20C480 40 240 0 0 20L0 60Z" fill="#F9F9F9" />
          </svg>
        </div>
      </section>

      {/* Feature groups */}
      <section className="py-20 bg-[#F9F9F9]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          {featureGroups.map((group, gi) => (
            <div key={gi}>
              <div className="flex items-center gap-3 mb-8">
                <div
                  className="w-2 h-8 rounded-full"
                  style={{ backgroundColor: group.colour }}
                />
                <h2 className="font-heading font-bold text-2xl text-gray-900">
                  {group.category}
                </h2>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
                {group.features.map((f, fi) => (
                  <div
                    key={fi}
                    className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 text-white"
                      style={{ backgroundColor: group.colour }}
                    >
                      {f.icon}
                    </div>
                    <h3 className="font-heading font-bold text-gray-900 text-sm mb-2">{f.title}</h3>
                    <p className="text-gray-500 text-xs leading-relaxed">{f.body}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-white">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="font-heading text-3xl font-bold text-gray-900 mb-4">
            Ready to see it in action?
          </h2>
          <p className="text-gray-500 mb-8">
            Book a free demo and we'll walk you through every feature for your specific business type.
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

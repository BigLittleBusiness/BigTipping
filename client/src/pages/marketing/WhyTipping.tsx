import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Mail,
  Users,
  TrendingUp,
  DollarSign,
  BarChart3,
  Shield,
  ArrowRight,
  CheckCircle2,
  Trophy,
} from "lucide-react";
import MarketingLayout from "@/components/MarketingLayout";

export default function WhyTipping() {
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
            The business case
          </Badge>
          <h1 className="font-heading text-4xl sm:text-5xl font-bold text-white mb-6">
            Why a tipping competition is the{" "}
            <span className="text-[#F5A623]">smartest marketing tool</span>{" "}
            you're not using yet
          </h1>
          <p className="text-lg text-blue-100 max-w-2xl mx-auto leading-relaxed">
            Businesses across Australia spend thousands on advertising that gets
            ignored. A tipping competition gives your audience a reason to
            engage with your brand — voluntarily, repeatedly, and all season long.
          </p>
        </div>
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 60L1440 60L1440 20C1200 60 960 0 720 20C480 40 240 0 0 20L0 60Z" fill="#F9F9F9" />
          </svg>
        </div>
      </section>

      {/* The core argument */}
      <section className="py-20 bg-[#F9F9F9]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="font-heading text-3xl font-bold text-gray-900 mb-6">
                The problem with most business marketing
              </h2>
              <div className="space-y-4 text-gray-600 leading-relaxed">
                <p>
                  Most marketing interrupts people. Ads appear when they don't want them. Emails arrive when they're not thinking about you. Social posts get buried in algorithms.
                </p>
                <p>
                  The result? You spend money to reach people who aren't interested, and you lose the attention of people who are.
                </p>
                <p className="font-semibold text-gray-800">
                  A tipping competition flips this completely.
                </p>
                <p>
                  Your audience comes to <em>you</em> — twice a week, every week of the season — because they want to check their tips, see the leaderboard, and stay in the competition. Your brand is part of that experience, not an interruption to it.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Traditional digital ad", open: "~2%", cost: "High CPM", repeat: "One-time" },
                { label: "Tipping competition", open: "~65%", cost: "Flat season fee", repeat: "26× per season" },
              ].map((row, i) => (
                <div
                  key={i}
                  className={`rounded-2xl p-6 border ${
                    i === 1
                      ? "bg-[#2B4EAE] border-[#2B4EAE] text-white"
                      : "bg-white border-gray-200 text-gray-700"
                  }`}
                >
                  <p className={`text-xs font-bold uppercase tracking-wider mb-4 ${i === 1 ? "text-blue-200" : "text-gray-400"}`}>
                    {row.label}
                  </p>
                  <div className="space-y-3">
                    <div>
                      <p className={`text-xs ${i === 1 ? "text-blue-200" : "text-gray-400"}`}>Avg. open/engagement rate</p>
                      <p className={`font-heading font-bold text-2xl ${i === 1 ? "text-[#F5A623]" : "text-gray-400"}`}>{row.open}</p>
                    </div>
                    <div>
                      <p className={`text-xs ${i === 1 ? "text-blue-200" : "text-gray-400"}`}>Cost model</p>
                      <p className={`font-semibold text-sm ${i === 1 ? "text-white" : "text-gray-600"}`}>{row.cost}</p>
                    </div>
                    <div>
                      <p className={`text-xs ${i === 1 ? "text-blue-200" : "text-gray-400"}`}>Brand touchpoints</p>
                      <p className={`font-semibold text-sm ${i === 1 ? "text-white" : "text-gray-600"}`}>{row.repeat}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 6 business benefits */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Six ways a tipping competition{" "}
              <span className="text-[#2B4EAE]">grows your business</span>
            </h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: <Mail className="w-6 h-6" />,
                title: "1. A consented, engaged email list",
                body: "Every entrant explicitly opts in to receive your emails as part of registration. This isn't a purchased list — it's an audience that wants to hear from you. Industry data consistently shows tipping competition emails achieve open rates well above the 20–25% average for marketing emails.",
              },
              {
                icon: <Users className="w-6 h-6" />,
                title: "2. Prospect acquisition at scale",
                body: "Your existing clients invite their friends and colleagues. Prospects enter the competition and, in doing so, hand you their contact details and permission to market to them. It's word-of-mouth marketing with a built-in data capture mechanism.",
              },
              {
                icon: <TrendingUp className="w-6 h-6" />,
                title: "3. Consistent brand presence all season",
                body: "AFL runs 23 rounds. NRL runs 27. Super Netball runs 14. That's months of weekly brand exposure — without paying for ad space each time. Your name is in front of your audience every single round.",
              },
              {
                icon: <DollarSign className="w-6 h-6" />,
                title: "4. Exceptional cost-per-engagement",
                body: "Compare the cost of a Big Tipping subscription to the cost of reaching the same audience via paid social or Google Ads, at the same frequency, over the same period. The economics are not close.",
              },
              {
                icon: <BarChart3 className="w-6 h-6" />,
                title: "5. A database you own outright",
                body: "Unlike social media followers or ad platform audiences, your tipping competition entrants are in your database. You can segment them, email them, and market to them independently of any platform.",
              },
              {
                icon: <Shield className="w-6 h-6" />,
                title: "6. Positive brand association with sport",
                body: "Sport is one of the most emotionally engaging categories in Australian culture. By associating your brand with AFL, NRL, or Super Netball, you tap into that passion — and the positive feelings it generates.",
              },
            ].map((b, i) => (
              <div key={i} className="bg-[#F9F9F9] rounded-2xl p-6 border border-gray-100">
                <div className="w-10 h-10 rounded-xl bg-[#2B4EAE] text-white flex items-center justify-center mb-4">
                  {b.icon}
                </div>
                <h3 className="font-heading font-bold text-gray-900 text-lg mb-3">{b.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{b.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Not gambling section */}
      <section className="py-16 bg-[#F9F9F9]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-100 text-green-700 flex items-center justify-center flex-shrink-0">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-xl text-gray-900 mb-3">
                  Is a tipping competition gambling? No — and here's why that matters.
                </h3>
                <div className="space-y-3 text-gray-600 text-sm leading-relaxed">
                  <p>
                    Under Australian law, a tipping competition is not classified as gambling provided that: no money is wagered by participants, and prizes are provided by the competition organiser (not pooled from entry fees).
                  </p>
                  <p>
                    Big Tipping is designed specifically around this model. Entrants do not pay to participate. Prizes are set and funded by you, the business running the competition. This means no gambling permits are required in most Australian states and territories.
                  </p>
                  <p className="text-xs text-gray-400">
                    We recommend confirming the rules applicable in your specific state or territory, as regulations can vary. This is not legal advice.
                  </p>
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  {[
                    "No wagering by participants",
                    "Prizes funded by the organiser",
                    "No gambling permit required (most states)",
                    "Compliant with Australian consumer law",
                  ].map((point) => (
                    <div key={point} className="flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-50 px-3 py-1.5 rounded-full">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {point}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-white">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <Trophy className="w-12 h-12 text-[#F5A623] mx-auto mb-4" />
          <h2 className="font-heading text-3xl font-bold text-gray-900 mb-4">
            Ready to see it in action?
          </h2>
          <p className="text-gray-500 mb-8">
            Book a free 20-minute demo and we'll walk you through exactly how Big Tipping works for your business.
          </p>
          <Link href="/contact">
            <Button size="lg" className="bg-[#C8521A] hover:bg-[#b04516] text-white font-bold px-8">
              Book a Free Demo <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>
    </MarketingLayout>
  );
}

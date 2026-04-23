import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ArrowRight, HelpCircle } from "lucide-react";
import MarketingLayout from "@/components/MarketingLayout";

const plans = [
  {
    name: "Starter",
    price: "$49",
    period: "/month",
    description: "Perfect for small businesses running their first tipping competition.",
    highlight: false,
    badge: null,
    entrants: "Up to 100 entrants",
    features: [
      "1 active competition",
      "1 sport (AFL, NRL, or Super Netball)",
      "Automated round reminder emails",
      "Automated results emails",
      "Live leaderboard",
      "Public competition landing page",
      "Basic entrant management",
      "Email support",
    ],
    cta: "Start Free Trial",
    ctaHref: "/contact",
  },
  {
    name: "Growth",
    price: "$129",
    period: "/month",
    description: "For businesses serious about using sport to drive client engagement.",
    highlight: true,
    badge: "Most Popular",
    entrants: "Up to 500 entrants",
    features: [
      "3 active competitions",
      "All 3 sports (AFL, NRL, Super Netball)",
      "Custom email content per round",
      "Automated round reminder emails",
      "Automated results emails",
      "Live leaderboard with rank badges",
      "Full entrant management & export",
      "Prizes management",
      "Competition analytics dashboard",
      "Priority email support",
    ],
    cta: "Start Free Trial",
    ctaHref: "/contact",
  },
  {
    name: "Pro",
    price: "$299",
    period: "/month",
    description: "For larger organisations running multiple competitions across multiple audiences.",
    highlight: false,
    badge: null,
    entrants: "Unlimited entrants",
    features: [
      "Unlimited active competitions",
      "All 3 sports (AFL, NRL, Super Netball)",
      "Custom email content per round",
      "Advanced email branding",
      "Automated round & results emails",
      "Live leaderboard with rank badges",
      "Full entrant management & export",
      "Prizes management",
      "Advanced analytics & reporting",
      "Multiple team members / admins",
      "Dedicated onboarding support",
      "Phone & email support",
    ],
    cta: "Book a Demo",
    ctaHref: "/contact",
  },
];

const faqs = [
  {
    q: "Is there a free trial?",
    a: "Yes. All plans include a 14-day free trial — no credit card required. You can set up your competition, invite entrants, and run a full round before committing to a paid plan.",
  },
  {
    q: "Are there lock-in contracts?",
    a: "No. All plans are month-to-month. You can cancel at any time. We also offer annual billing with a 20% discount for businesses that want to plan ahead.",
  },
  {
    q: "What happens if I exceed my entrant limit?",
    a: "We'll notify you when you're approaching your limit and make it easy to upgrade. We won't cut off your competition mid-season.",
  },
  {
    q: "Can I run competitions for multiple sports simultaneously?",
    a: "Yes, on the Growth and Pro plans. You can run an AFL competition and an NRL competition at the same time, with separate entrant lists and leaderboards.",
  },
  {
    q: "Do entrants need to pay anything?",
    a: "No. Entrants never pay to participate. Big Tipping is not a gambling platform — no money is wagered. Prizes are funded by you, the competition organiser.",
  },
  {
    q: "Can I customise the competition with my own branding?",
    a: "Yes. Your competition is branded with your business name. Emails are sent in your name. The leaderboard shows your competition name. Entrants see your brand throughout.",
  },
];

export default function Pricing() {
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
            Simple, transparent pricing
          </Badge>
          <h1 className="font-heading text-4xl sm:text-5xl font-bold text-white mb-6">
            Plans for every business,{" "}
            <span className="text-[#F5A623]">every season</span>
          </h1>
          <p className="text-lg text-blue-100 max-w-2xl mx-auto leading-relaxed">
            No setup fees. No per-entrant charges. No surprises. Just a flat monthly subscription that covers everything you need to run a world-class tipping competition.
          </p>
        </div>
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 60L1440 60L1440 20C1200 60 960 0 720 20C480 40 240 0 0 20L0 60Z" fill="#F9F9F9" />
          </svg>
        </div>
      </section>

      {/* Pricing cards */}
      <section className="py-20 bg-[#F9F9F9]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-6 items-start">
            {plans.map((plan, i) => (
              <div
                key={i}
                className={`rounded-2xl border p-8 relative ${
                  plan.highlight
                    ? "bg-[#2B4EAE] border-[#2B4EAE] shadow-2xl scale-105"
                    : "bg-white border-gray-100 shadow-sm"
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-[#F5A623] text-gray-900 border-0 font-bold text-xs px-3 py-1">
                      {plan.badge}
                    </Badge>
                  </div>
                )}

                <div className="mb-6">
                  <p className={`font-heading font-bold text-lg mb-1 ${plan.highlight ? "text-white" : "text-gray-900"}`}>
                    {plan.name}
                  </p>
                  <div className="flex items-end gap-1 mb-2">
                    <span className={`font-heading font-bold text-4xl ${plan.highlight ? "text-white" : "text-gray-900"}`}>
                      {plan.price}
                    </span>
                    <span className={`text-sm mb-1 ${plan.highlight ? "text-blue-200" : "text-gray-400"}`}>
                      {plan.period}
                    </span>
                  </div>
                  <p className={`text-sm leading-relaxed ${plan.highlight ? "text-blue-200" : "text-gray-500"}`}>
                    {plan.description}
                  </p>
                </div>

                <div
                  className={`rounded-xl px-4 py-2 mb-6 text-sm font-semibold ${
                    plan.highlight ? "bg-white/10 text-white" : "bg-[#2B4EAE]/5 text-[#2B4EAE]"
                  }`}
                >
                  {plan.entrants}
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((f, fi) => (
                    <li key={fi} className="flex items-start gap-2.5">
                      <CheckCircle2
                        className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                          plan.highlight ? "text-[#F5A623]" : "text-[#2B4EAE]"
                        }`}
                      />
                      <span className={`text-sm ${plan.highlight ? "text-blue-100" : "text-gray-600"}`}>
                        {f}
                      </span>
                    </li>
                  ))}
                </ul>

                <Link href={plan.ctaHref}>
                  <Button
                    size="lg"
                    className={`w-full font-bold ${
                      plan.highlight
                        ? "bg-[#C8521A] hover:bg-[#b04516] text-white"
                        : "bg-[#2B4EAE] hover:bg-[#1e3d8f] text-white"
                    }`}
                  >
                    {plan.cta}
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>

                {i < 2 && (
                  <p className={`text-xs text-center mt-3 ${plan.highlight ? "text-blue-300" : "text-gray-400"}`}>
                    14-day free trial · No credit card required
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Annual discount note */}
          <div className="mt-10 text-center">
            <div className="inline-flex items-center gap-2 bg-[#F5A623]/10 border border-[#F5A623]/30 rounded-full px-5 py-2.5 text-sm font-semibold text-[#C8521A]">
              <span>💡</span>
              Save 20% with annual billing — contact us for details
            </div>
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-heading text-3xl font-bold text-gray-900 mb-3">
              Frequently asked questions
            </h2>
            <p className="text-gray-500">
              Can't find the answer you're looking for?{" "}
              <Link href="/contact">
                <span className="text-[#2B4EAE] font-semibold cursor-pointer hover:underline">
                  Get in touch.
                </span>
              </Link>
            </p>
          </div>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-[#F9F9F9] rounded-2xl p-6 border border-gray-100">
                <div className="flex items-start gap-3">
                  <HelpCircle className="w-5 h-5 text-[#2B4EAE] mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-heading font-bold text-gray-900 mb-2">{faq.q}</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">{faq.a}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-[#F9F9F9]">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="font-heading text-3xl font-bold text-gray-900 mb-4">
            Not sure which plan is right for you?
          </h2>
          <p className="text-gray-500 mb-8">
            Book a free demo and we'll recommend the best plan for your business size and goals.
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

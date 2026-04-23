import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, CheckCircle2, Beer, Briefcase, Building2, Dumbbell, Tv, ShoppingBag } from "lucide-react";
import MarketingLayout from "@/components/MarketingLayout";

const segments = [
  {
    id: "pubs",
    icon: <Beer className="w-8 h-8" />,
    label: "Pubs, Bars & Hospitality",
    headline: "Fill the bar every round day — and keep them coming back.",
    intro:
      "For pubs, bars, and hospitality venues, a tipping competition is one of the most natural and effective engagement tools available. Your customers already love sport. Give them a reason to think of your venue every time they check their tips.",
    benefits: [
      "Entrants check their tips and the leaderboard 2–3 times per week — from their phone, often while deciding where to watch the game",
      "Weekly emails keep your specials, events, and promotions front-of-mind",
      "Offer a bar tab, meal voucher, or experience as the prize — low cost, high perceived value",
      "Build a database of opted-in locals you can market to year-round",
      "Run separate competitions for AFL, NRL, and Super Netball to extend your season",
    ],
    example:
      "A local pub runs an AFL tipping competition with a $200 bar tab as the season prize. 180 locals sign up. Every round, they receive an email with the round fixtures, the current leaderboard, and a note about that week's specials. Round-day foot traffic increases noticeably.",
    colour: "#2B4EAE",
  },
  {
    id: "corporate",
    icon: <Briefcase className="w-8 h-8" />,
    label: "Corporate & Professional Services",
    headline: "Stay top of mind between meetings — without a hard sell.",
    intro:
      "Accountants, financial planners, recruiters, real estate agents, lawyers, and mortgage brokers all face the same challenge: staying relevant to clients and prospects between engagements. A tipping competition solves this elegantly.",
    benefits: [
      "Clients and prospects engage with your brand voluntarily, twice a week, for the entire season",
      "Weekly emails are welcomed — not treated as spam — because they contain something the recipient actually wants",
      "Prospects enter the competition and hand you their contact details and permission to market to them",
      "The competition creates natural conversation starters at client meetings and networking events",
      "A low-cost prize (e.g., a gift card or dinner voucher) is far more memorable than a branded pen",
    ],
    example:
      "A mid-sized accounting firm runs an NRL tipping competition for its 300 business clients. Partners mention it in their quarterly newsletters. Clients forward the link to colleagues. By Round 5, the competition has 420 entrants — including 120 new contacts who had never engaged with the firm before.",
    colour: "#C8521A",
  },
  {
    id: "clubs",
    icon: <Building2 className="w-8 h-8" />,
    label: "Sporting Clubs & Associations",
    headline: "Engage your members beyond match day.",
    intro:
      "Sporting clubs and associations have a passionate, sport-loving membership base — but engagement often drops off between seasons or between games. A tipping competition keeps your community active and connected all year.",
    benefits: [
      "Give members a reason to engage with your club brand outside of game days",
      "Use the competition to drive traffic to your club app, website, or social channels",
      "Offer club merchandise, memberships, or experiences as prizes",
      "Build a richer picture of your members' interests and engagement patterns",
      "Run competitions across multiple sports to extend engagement across the full calendar year",
    ],
    example:
      "A community football club runs a Super Netball tipping competition as a membership benefit. Members invite their families and friends. The club's weekly email — which previously had a 15% open rate — now achieves over 60% opens because it contains the round results and leaderboard.",
    colour: "#2B4EAE",
  },
  {
    id: "media",
    icon: <Tv className="w-8 h-8" />,
    label: "Media & Publishing",
    headline: "Drive repeat traffic and grow your subscriber base.",
    intro:
      "For media companies, publishers, and digital content platforms, a tipping competition is a powerful audience retention and acquisition tool. It gives your audience a reason to return to your platform multiple times per week.",
    benefits: [
      "Drive repeat visits to your website or app every round",
      "Grow your email subscriber list with opted-in sports fans",
      "Create editorial content around the competition (weekly tips, expert picks, leaderboard updates)",
      "Offer advertising or sponsorship inventory within the competition to generate revenue",
      "Extend your audience relationship beyond the news cycle",
    ],
    example:
      "A regional news website runs an AFL tipping competition branded to their masthead. Readers sign up and receive weekly emails that include the round fixtures, the leaderboard, and links to the week's top sports stories. Website traffic on round days increases by 35%.",
    colour: "#C8521A",
  },
  {
    id: "retail",
    icon: <ShoppingBag className="w-8 h-8" />,
    label: "Retail & Consumer Brands",
    headline: "Turn customers into a community.",
    intro:
      "Retailers and consumer brands can use a tipping competition to build a loyal, engaged customer community around a shared passion for sport — and keep their brand in the conversation all season long.",
    benefits: [
      "Collect first-party customer data with explicit opt-in consent",
      "Offer store credit, product vouchers, or experiences as prizes",
      "Include promotional content in weekly emails (new arrivals, sale events, exclusive offers)",
      "Build brand affinity through association with sport",
      "Re-engage dormant customers with a fun, low-pressure touchpoint",
    ],
    example:
      "A sporting goods retailer runs an NRL tipping competition for its loyalty program members. The season prize is a $500 store voucher. Weekly emails include the leaderboard and a featured product. Email click-through rates are 4× higher than standard promotional emails.",
    colour: "#2B4EAE",
  },
  {
    id: "fitness",
    icon: <Dumbbell className="w-8 h-8" />,
    label: "Gyms, Health & Fitness",
    headline: "Build community and reduce churn.",
    intro:
      "Gyms and fitness businesses face constant churn pressure. A tipping competition gives members a social, community-focused reason to stay connected to your brand — and to each other — beyond their workouts.",
    benefits: [
      "Create a sense of community among members who might not otherwise interact",
      "Offer free sessions, merchandise, or supplements as prizes",
      "Keep your brand in members' inboxes twice a week with welcome content",
      "Attract new members through referrals from existing competition entrants",
      "Run competitions across AFL, NRL, and Super Netball to cover the full year",
    ],
    example:
      "A fitness studio with 400 members runs an AFL tipping competition. The prize is three months of free membership. Members invite friends and partners. 85 new contacts register, of whom 12 convert to paid memberships during the season.",
    colour: "#C8521A",
  },
];

export default function UseCases() {
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
            Use cases
          </Badge>
          <h1 className="font-heading text-4xl sm:text-5xl font-bold text-white mb-6">
            Built for every business that{" "}
            <span className="text-[#F5A623]">wants to own the season</span>
          </h1>
          <p className="text-lg text-blue-100 max-w-2xl mx-auto leading-relaxed">
            From local pubs to national brands, any business with customers who love sport can run a tipping competition that drives real engagement and measurable results.
          </p>
        </div>

        {/* Segment quick-links */}
        <div className="relative max-w-5xl mx-auto px-4 mt-10">
          <div className="flex flex-wrap justify-center gap-3">
            {segments.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm font-semibold rounded-full border border-white/20 transition-colors"
              >
                {s.label}
              </a>
            ))}
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 60L1440 60L1440 20C1200 60 960 0 720 20C480 40 240 0 0 20L0 60Z" fill="#F9F9F9" />
          </svg>
        </div>
      </section>

      {/* Segments */}
      <section className="py-20 bg-[#F9F9F9]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-20">
          {segments.map((s, i) => (
            <div key={s.id} id={s.id} className="scroll-mt-20">
              <div className="grid md:grid-cols-2 gap-10 items-start">
                <div className={i % 2 === 1 ? "md:order-2" : ""}>
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className="w-14 h-14 rounded-2xl text-white flex items-center justify-center"
                      style={{ backgroundColor: s.colour }}
                    >
                      {s.icon}
                    </div>
                    <Badge className="bg-gray-200 text-gray-600 border-0 text-xs font-semibold">
                      {s.label}
                    </Badge>
                  </div>
                  <h2 className="font-heading font-bold text-2xl sm:text-3xl text-gray-900 mb-4">
                    {s.headline}
                  </h2>
                  <p className="text-gray-600 leading-relaxed mb-6">{s.intro}</p>
                  <ul className="space-y-3">
                    {s.benefits.map((b, j) => (
                      <li key={j} className="flex items-start gap-3">
                        <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: s.colour }} />
                        <span className="text-sm text-gray-700 leading-relaxed">{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className={i % 2 === 1 ? "md:order-1" : ""}>
                  <div
                    className="rounded-2xl p-6 border text-white"
                    style={{ backgroundColor: s.colour }}
                  >
                    <p className="text-xs font-bold uppercase tracking-wider opacity-70 mb-3">
                      Example scenario
                    </p>
                    <p className="text-sm leading-relaxed opacity-90">{s.example}</p>
                  </div>
                </div>
              </div>
              {i < segments.length - 1 && (
                <div className="mt-16 border-t border-gray-200" />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-white">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="font-heading text-3xl font-bold text-gray-900 mb-4">
            Don't see your industry? Let's talk.
          </h2>
          <p className="text-gray-500 mb-8">
            Big Tipping works for any business with an audience that loves sport. Book a free demo and we'll show you how it can work for yours.
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

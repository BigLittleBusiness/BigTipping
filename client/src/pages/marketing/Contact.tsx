import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle2, Mail, Clock, Users, ArrowRight } from "lucide-react";
import MarketingLayout from "@/components/MarketingLayout";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export default function Contact() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    business: "",
    businessType: "",
    entrants: "",
    message: "",
  });

  const submitEnquiry = trpc.contact.submitEnquiry.useMutation({
    onSuccess: () => setSubmitted(true),
    onError: (err) => toast.error(err.message || "Something went wrong. Please try again."),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.business || !form.businessType) {
      toast.error("Please fill in all required fields.");
      return;
    }
    submitEnquiry.mutate({
      name: form.name,
      email: form.email,
      business: form.business,
      businessType: form.businessType,
      entrants: form.entrants || undefined,
      message: form.message || undefined,
    });
  };

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
            Get in touch
          </Badge>
          <h1 className="font-heading text-4xl sm:text-5xl font-bold text-white mb-6">
            Book your free{" "}
            <span className="text-[#F5A623]">20-minute demo</span>
          </h1>
          <p className="text-lg text-blue-100 max-w-2xl mx-auto leading-relaxed">
            Tell us about your business and we'll show you exactly how Big Tipping can work for your audience, your sport, and your goals.
          </p>
        </div>
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 60L1440 60L1440 20C1200 60 960 0 720 20C480 40 240 0 0 20L0 60Z" fill="#F9F9F9" />
          </svg>
        </div>
      </section>

      {/* Form + Info */}
      <section className="py-20 bg-[#F9F9F9]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16">
            {/* Left: form */}
            <div>
              {submitted ? (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                  </div>
                  <h2 className="font-heading font-bold text-2xl text-gray-900 mb-3">
                    Thanks, {form.name.split(" ")[0]}!
                  </h2>
                  <p className="text-gray-500 leading-relaxed">
                    We've received your enquiry and will be in touch within one business day to schedule your demo.
                  </p>
                  <p className="text-sm text-gray-400 mt-4">
                    In the meantime, feel free to explore the{" "}
                    <a href="/features" className="text-[#2B4EAE] font-semibold hover:underline">
                      platform features
                    </a>{" "}
                    or{" "}
                    <a href="/pricing" className="text-[#2B4EAE] font-semibold hover:underline">
                      view our pricing
                    </a>
                    .
                  </p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
                  <h2 className="font-heading font-bold text-2xl text-gray-900 mb-6">
                    Tell us about your business
                  </h2>
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name" className="text-sm font-semibold text-gray-700 mb-1.5 block">
                          Your name <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="name"
                          placeholder="Jane Smith"
                          value={form.name}
                          onChange={(e) => setForm({ ...form, name: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="email" className="text-sm font-semibold text-gray-700 mb-1.5 block">
                          Work email <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="jane@business.com.au"
                          value={form.email}
                          onChange={(e) => setForm({ ...form, email: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="business" className="text-sm font-semibold text-gray-700 mb-1.5 block">
                        Business name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="business"
                        placeholder="The Plumbers Arms"
                        value={form.business}
                        onChange={(e) => setForm({ ...form, business: e.target.value })}
                        required
                      />
                    </div>

                    <div>
                      <Label className="text-sm font-semibold text-gray-700 mb-1.5 block">
                        Business type <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={form.businessType}
                        onValueChange={(v) => setForm({ ...form, businessType: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select your business type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pub-bar-hospitality">Pub, Bar or Hospitality</SelectItem>
                          <SelectItem value="rsl-club">RSL or Members Club</SelectItem>
                          <SelectItem value="sporting-club">Sporting Club or Association</SelectItem>
                          <SelectItem value="corporate-professional">Corporate or Professional Services</SelectItem>
                          <SelectItem value="retail">Retail</SelectItem>
                          <SelectItem value="media-publishing">Media or Publishing</SelectItem>
                          <SelectItem value="gym-fitness">Gym or Fitness</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-sm font-semibold text-gray-700 mb-1.5 block">
                        Estimated audience size
                      </Label>
                      <Select
                        value={form.entrants}
                        onValueChange={(v) => setForm({ ...form, entrants: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="How many entrants do you expect?" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="under-50">Under 50</SelectItem>
                          <SelectItem value="50-100">50–100</SelectItem>
                          <SelectItem value="100-250">100–250</SelectItem>
                          <SelectItem value="250-500">250–500</SelectItem>
                          <SelectItem value="500-plus">500+</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="message" className="text-sm font-semibold text-gray-700 mb-1.5 block">
                        Anything else you'd like us to know?
                      </Label>
                      <Textarea
                        id="message"
                        placeholder="Which sport are you most interested in? Do you have any specific requirements?"
                        rows={3}
                        value={form.message}
                        onChange={(e) => setForm({ ...form, message: e.target.value })}
                      />
                    </div>

                    <Button
                      type="submit"
                      size="lg"
                      disabled={submitEnquiry.isPending}
                      className="w-full bg-[#C8521A] hover:bg-[#b04516] text-white font-bold"
                    >
                      {submitEnquiry.isPending ? "Sending..." : "Book My Free Demo"}
                      {!submitEnquiry.isPending && <ArrowRight className="ml-2 w-5 h-5" />}
                    </Button>
                    <p className="text-xs text-gray-400 text-center">
                      We'll be in touch within one business day. No spam, ever.
                    </p>
                  </form>
                </div>
              )}
            </div>

            {/* Right: what to expect */}
            <div className="space-y-6">
              <div>
                <h2 className="font-heading font-bold text-2xl text-gray-900 mb-4">
                  What to expect from your demo
                </h2>
                <p className="text-gray-600 leading-relaxed">
                  Our demos are tailored to your business type. We'll show you exactly how Big Tipping works for a pub, a corporate firm, a sporting club — or whatever your business is. No generic slides.
                </p>
              </div>

              <div className="space-y-4">
                {[
                  {
                    icon: <Clock className="w-5 h-5" />,
                    title: "20 minutes, no fluff",
                    body: "We respect your time. The demo covers the full platform in 20 minutes, with time for your questions.",
                  },
                  {
                    icon: <Users className="w-5 h-5" />,
                    title: "Tailored to your business",
                    body: "We'll configure a sample competition for your industry so you can see exactly what your entrants will experience.",
                  },
                  {
                    icon: <Mail className="w-5 h-5" />,
                    title: "See the email experience",
                    body: "We'll show you what your weekly round and results emails look like — branded to your business.",
                  },
                  {
                    icon: <CheckCircle2 className="w-5 h-5" />,
                    title: "No pressure, no commitment",
                    body: "The demo is free. There's no obligation to sign up. We just want to show you what's possible.",
                  },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-4 bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
                    <div className="w-10 h-10 rounded-lg bg-[#2B4EAE] text-white flex items-center justify-center flex-shrink-0">
                      {item.icon}
                    </div>
                    <div>
                      <h3 className="font-heading font-bold text-gray-900 text-sm mb-1">{item.title}</h3>
                      <p className="text-gray-500 text-sm leading-relaxed">{item.body}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-[#2B4EAE] rounded-2xl p-6 text-white">
                <p className="text-xs font-bold uppercase tracking-wider text-blue-300 mb-2">
                  Prefer to just get started?
                </p>
                <p className="text-sm text-blue-100 leading-relaxed mb-4">
                  All plans include a 14-day free trial. You can set up your competition and invite entrants before you pay a cent.
                </p>
                <a href="/pricing" className="inline-flex items-center text-sm font-semibold text-[#F5A623] hover:text-[#e09520] transition-colors">
                  View pricing plans <ArrowRight className="ml-1 w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}

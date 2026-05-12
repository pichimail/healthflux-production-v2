import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Check, ArrowRight, HelpCircle, ChevronDown, ChevronUp } from "lucide-react";
import MarketingShell from "@/components/marketing/MarketingShell";
import { createPageUrl } from "@/utils";

const ACCENT = {
  lemon:    { bg: "#d7f576", text: "#0a1200", soft: "rgba(215,245,118,0.15)" },
  lavender: { bg: "#c9bbff", text: "#1a0a40", soft: "rgba(201,187,255,0.15)" },
  mint:     { bg: "#a8e6cf", text: "#003d20", soft: "rgba(168,230,207,0.15)" },
};

const PLANS = [
  {
    name: "Starter",
    price: "₹0",
    period: "forever free",
    accent: "mint",
    desc: "For individuals who want to explore HealthFlux and build their health baseline.",
    cta: "Start free",
    features: {
      "Core tracking": ["Vitals logging (BP, HR, SpO₂, glucose, weight)", "Medication list & basic reminders", "Up to 50 document uploads", "Lab result entry"],
      "AI features": ["10 AI assistant queries / month", "Basic document extraction"],
      "Other": ["Single health profile", "Web app access"],
    },
  },
  {
    name: "Care Pro",
    price: "₹299",
    period: "/month",
    accent: "lemon",
    featured: true,
    desc: "For active self-managers who rely on deep AI insights and full workflow coverage.",
    cta: "Get Care Pro",
    features: {
      "Core tracking": ["Unlimited vitals, medications, documents", "Prescription OCR scanning", "Lab trends & abnormal alerts", "Nutrition & meal logging with photo scan", "Advanced trend charts & analytics"],
      "AI features": ["Unlimited AI assistant", "Weekly & monthly AI health reports", "Drug interaction checks", "Skin assessment", "Personalized diet planning"],
      "Other": ["2 health profiles", "Export & care-circle sharing", "Wellness goals & gamification", "Priority email support"],
    },
  },
  {
    name: "Family Grid",
    price: "₹599",
    period: "/month",
    accent: "lavender",
    desc: "For families and caregivers coordinating health across multiple members.",
    cta: "Get Family Grid",
    features: {
      "Family management": ["Up to 15 health profiles", "Role-based caregiver access", "Shared care visibility controls", "Emergency profile for each member"],
      "All Care Pro features": ["Full AI suite", "Unlimited records & uploads", "Nutrition & wellness tools"],
      "Other": ["ABHA digital health integration", "Telehealth preparation tools", "Advanced admin controls", "Dedicated support"],
    },
  },
];

const COMPARISON = [
  { feature: "Health profiles",         starter: "1",          pro: "2",            family: "Up to 15" },
  { feature: "Document uploads",        starter: "50",         pro: "Unlimited",    family: "Unlimited" },
  { feature: "Vitals & medications",    starter: "Basic",      pro: "Full",         family: "Full" },
  { feature: "AI assistant",            starter: "10/month",   pro: "Unlimited",    family: "Unlimited" },
  { feature: "AI health reports",       starter: false,        pro: true,           family: true },
  { feature: "Prescription OCR",        starter: false,        pro: true,           family: true },
  { feature: "Drug interaction check",  starter: false,        pro: true,           family: true },
  { feature: "Nutrition photo scan",    starter: false,        pro: true,           family: true },
  { feature: "Skin assessment",         starter: false,        pro: true,           family: true },
  { feature: "Caregiver access",        starter: false,        pro: false,          family: true },
  { feature: "Emergency profiles",      starter: false,        pro: false,          family: true },
  { feature: "ABHA integration",        starter: false,        pro: false,          family: true },
  { feature: "Wellness gamification",   starter: false,        pro: true,           family: true },
  { feature: "Export & sharing",        starter: false,        pro: true,           family: true },
];

const FAQS = [
  {
    q: "Is the free plan genuinely useful?",
    a: "Yes. The Starter plan gives you a fully functional health dashboard for vitals, medications, documents, and lab results. It's designed to show you the real product — not a crippled demo.",
  },
  {
    q: "Can I cancel my subscription anytime?",
    a: "Yes. You can cancel at any time from your account settings. Your data remains accessible until the end of your billing period.",
  },
  {
    q: "What happens to my data if I downgrade to Starter?",
    a: "Your existing records are preserved. You'll just be limited to the Starter feature set going forward — no data is deleted on downgrade.",
  },
  {
    q: "Does Family Grid require everyone to be on the same account?",
    a: "Family members are separate profiles within your account. You manage their health data on their behalf with their consent. Each profile maintains its own private records.",
  },
  {
    q: "Is there a discount for annual billing?",
    a: "Yes — annual plans receive approximately 20% discount compared to monthly billing. Annual billing options are available at checkout.",
  },
  {
    q: "Do you offer plans for healthcare providers or clinics?",
    a: "Enterprise and clinical plans are available with custom pricing, EHR integration, and dedicated support. Contact us for more information.",
  },
];

function FAQ({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(15,23,42,0.08)" }}>
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-4 px-6 py-4 text-left"
        style={{ background: open ? "#fafaf8" : "#ffffff" }}>
        <span className="font-semibold text-sm" style={{ color: "#0f172a" }}>{q}</span>
        {open ? <ChevronUp size={16} style={{ color: "#94a3b8", flexShrink: 0 }} /> : <ChevronDown size={16} style={{ color: "#94a3b8", flexShrink: 0 }} />}
      </button>
      {open && (
        <div className="px-6 pb-5 pt-1" style={{ background: "#fafaf8" }}>
          <p className="text-sm leading-relaxed" style={{ color: "#64748b" }}>{a}</p>
        </div>
      )}
    </div>
  );
}

function CheckMark({ value, accent }) {
  if (value === true) return <Check size={16} style={{ color: accent || "#5a7a00", margin: "0 auto" }} />;
  if (value === false) return <span style={{ color: "#cbd5e1", display: "block", textAlign: "center" }}>—</span>;
  return <span className="text-xs font-medium" style={{ color: "#475569" }}>{value}</span>;
}

export default function Pricing() {
  const [showComparison, setShowComparison] = useState(false);

  return (
    <MarketingShell currentPage="Pricing">
      {/* Hero */}
      <section className="py-20 px-6" style={{ background: "linear-gradient(135deg, #fafaf8 0%, #fdf9f0 60%, #f5f0ff 100%)" }}>
        <div className="max-w-2xl mx-auto text-center">
          <span className="inline-block px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest mb-6"
            style={{ background: "rgba(247,201,163,0.3)", color: "#7a3d00" }}>
            Simple, transparent pricing
          </span>
          <h1 className="text-5xl font-black mb-5 leading-tight" style={{ color: "#0f172a" }}>
            Plans for every health journey
          </h1>
          <p className="text-lg leading-relaxed" style={{ color: "#475569" }}>
            Start free and upgrade when you need more. All plans include the core HealthFlux 
            experience — no hidden fees, no data sold.
          </p>
        </div>
      </section>

      {/* Pricing cards */}
      <section className="py-16 px-6" style={{ background: "#ffffff" }}>
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6 mb-10">
            {PLANS.map(plan => {
              const a = ACCENT[plan.accent];
              return (
                <div key={plan.name}
                  className="p-7 rounded-2xl flex flex-col relative"
                  style={{
                    background: plan.featured ? "#0f172a" : "#fafaf8",
                    border: plan.featured ? `2px solid ${a.bg}` : "1px solid rgba(15,23,42,0.09)",
                  }}>
                  {plan.featured && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-black"
                      style={{ background: a.bg, color: a.text }}>
                      Most popular
                    </div>
                  )}
                  <div className="mb-6">
                    <span className="text-xs font-black uppercase tracking-widest"
                      style={{ color: plan.featured ? a.bg : "#94a3b8" }}>
                      {plan.name}
                    </span>
                    <div className="flex items-end gap-1 mt-2 mb-3">
                      <span className="text-4xl font-black" style={{ color: plan.featured ? "#ffffff" : "#0f172a" }}>
                        {plan.price}
                      </span>
                      <span className="mb-1.5 text-sm" style={{ color: plan.featured ? "#64748b" : "#94a3b8" }}>
                        {plan.period}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: plan.featured ? "#94a3b8" : "#64748b" }}>
                      {plan.desc}
                    </p>
                  </div>

                  <div className="space-y-5 mb-8 flex-1">
                    {Object.entries(plan.features).map(([group, items]) => (
                      <div key={group}>
                        <p className="text-[10px] font-black uppercase tracking-widest mb-2"
                          style={{ color: plan.featured ? "#64748b" : "#94a3b8" }}>
                          {group}
                        </p>
                        <ul className="space-y-1.5">
                          {items.map(f => (
                            <li key={f} className="flex items-start gap-2 text-xs"
                              style={{ color: plan.featured ? "#cbd5e1" : "#475569" }}>
                              <Check size={12} className="flex-shrink-0 mt-0.5"
                                style={{ color: plan.featured ? a.bg : "#5a7a00" }} />
                              {f}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>

                  <Link to={createPageUrl("Onboarding")}
                    className="block w-full text-center py-3.5 rounded-xl text-sm font-bold transition-all hover:opacity-90"
                    style={{
                      background: plan.featured ? a.bg : "#0f172a",
                      color: plan.featured ? a.text : "#ffffff",
                    }}>
                    {plan.cta}
                  </Link>
                </div>
              );
            })}
          </div>

          {/* Full comparison toggle */}
          <div className="text-center">
            <button onClick={() => setShowComparison(o => !o)}
              className="inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl border transition-colors hover:bg-slate-50"
              style={{ color: "#475569", borderColor: "rgba(15,23,42,0.12)" }}>
              {showComparison ? "Hide" : "Show"} full feature comparison
              {showComparison ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>

          {showComparison && (
            <div className="mt-8 overflow-x-auto rounded-2xl" style={{ border: "1px solid rgba(15,23,42,0.08)" }}>
              <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(15,23,42,0.08)", background: "#f8fafc" }}>
                    <th className="text-left px-5 py-4 font-bold text-xs uppercase tracking-widest" style={{ color: "#64748b", minWidth: 200 }}>Feature</th>
                    {PLANS.map(p => (
                      <th key={p.name} className="text-center px-5 py-4 font-black text-xs uppercase tracking-widest" style={{ color: "#0f172a" }}>
                        {p.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON.map((row, i) => (
                    <tr key={row.feature} style={{ borderBottom: "1px solid rgba(15,23,42,0.05)", background: i % 2 === 0 ? "#ffffff" : "#fafaf8" }}>
                      <td className="px-5 py-3 text-sm font-medium" style={{ color: "#0f172a" }}>{row.feature}</td>
                      <td className="px-5 py-3 text-center"><CheckMark value={row.starter} /></td>
                      <td className="px-5 py-3 text-center"><CheckMark value={row.pro} accent="#5a7a00" /></td>
                      <td className="px-5 py-3 text-center"><CheckMark value={row.family} accent="#1a0a40" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-6" style={{ background: "#fafaf8" }}>
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black mb-3" style={{ color: "#0f172a" }}>
              Pricing questions
            </h2>
            <p style={{ color: "#64748b" }}>Everything you need to know before choosing a plan.</p>
          </div>
          <div className="space-y-3">
            {FAQS.map(faq => <FAQ key={faq.q} q={faq.q} a={faq.a} />)}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6" style={{ background: "#0c1120" }}>
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-black mb-4" style={{ color: "#ffffff" }}>
            Start with Starter, upgrade anytime
          </h2>
          <p className="mb-8" style={{ color: "#94a3b8" }}>
            No credit card required for the free plan. Upgrade in seconds when you're ready for more.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to={createPageUrl("Onboarding")}
              className="px-8 py-4 rounded-xl text-sm font-bold flex items-center gap-2"
              style={{ background: "#d7f576", color: "#0a1200" }}>
              Start for free <ArrowRight size={14} />
            </Link>
            <Link to={createPageUrl("Platform")}
              className="px-8 py-4 rounded-xl text-sm font-semibold border"
              style={{ borderColor: "rgba(255,255,255,0.15)", color: "#cbd5e1" }}>
              See all features
            </Link>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}

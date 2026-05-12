import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight, Activity, Brain, FileText, Pill, HeartPulse,
  TestTube2, Apple, Leaf, Stethoscope, Shield, Users,
  Check, Zap, Star, ChevronDown,
} from "lucide-react";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import MarketingShell from "@/components/marketing/MarketingShell";

/* ── Color tokens ── */
const ACCENTS = {
  lemon:   { bg: "#d7f576", text: "#0a1200", soft: "rgba(215,245,118,0.15)" },
  lavender:{ bg: "#c9bbff", text: "#1a0a40", soft: "rgba(201,187,255,0.15)" },
  mint:    { bg: "#a8e6cf", text: "#003d20", soft: "rgba(168,230,207,0.15)" },
  peach:   { bg: "#f7c9a3", text: "#3d1a00", soft: "rgba(247,201,163,0.15)" },
  sky:     { bg: "#9bb4ff", text: "#0a1240", soft: "rgba(155,180,255,0.15)" },
  coral:   { bg: "#f28c8c", text: "#4d0a0a", soft: "rgba(242,140,140,0.15)" },
};

const FEATURES = [
  { icon: HeartPulse,  label: "Vitals Tracking",     accent: "coral",    desc: "Log blood pressure, heart rate, SpO₂, glucose, weight, and more. See trends over days, weeks, and months with smart pattern detection." },
  { icon: Pill,        label: "Medication Manager",   accent: "peach",    desc: "Track all medications with dosage, schedules, refill reminders, and AI-powered drug interaction checks in real time." },
  { icon: FileText,    label: "Medical Documents",    accent: "sky",      desc: "Upload prescriptions, reports, and discharge summaries. AI extracts key data, flags abnormals, and links records to your profile." },
  { icon: TestTube2,   label: "Lab Results",          accent: "mint",     desc: "Structured lab entry with reference ranges, abnormal flags, and trend charts. Understand your bloodwork without medical jargon." },
  { icon: Brain,       label: "AI Health Reports",    accent: "lavender", desc: "AI generates weekly and monthly health summaries, correlates vitals with medications, and explains patterns in plain language." },
  { icon: Leaf,        label: "Wellness & Nutrition", accent: "lemon",    desc: "Log meals, set nutrition goals, track water intake, and scan food for calorie and macronutrient breakdowns using your camera." },
  { icon: Users,       label: "Family Care Circle",   accent: "peach",    desc: "Manage up to 15 family profiles. Share health context with caregivers, coordinate medications, and coordinate emergency information." },
  { icon: Stethoscope, label: "Telehealth Ready",     accent: "sky",      desc: "Prepare for doctor appointments with AI-generated summaries, export shareable health reports, and connect with ABHA integration." },
];

const STATS = [
  { value: "12+",         label: "Health workflows" },
  { value: "AI + OCR",    label: "Smart extraction" },
  { value: "5 Hubs",      label: "Unified navigation" },
  { value: "15 Profiles", label: "Family support" },
];

const PLANS = [
  {
    name: "Starter",
    price: "Free",
    period: "",
    accent: "mint",
    desc: "For individuals who want to explore HealthFlux and understand their health baseline.",
    features: [
      "Dashboard with vitals & medications",
      "Up to 50 document uploads",
      "Basic AI assistant queries",
      "Single health profile",
      "Web access",
    ],
  },
  {
    name: "Care Pro",
    price: "₹299",
    period: "/month",
    accent: "lemon",
    featured: true,
    desc: "For active self-managers who want deep AI insights, exports, and full workflow access.",
    features: [
      "Unlimited records & uploads",
      "AI health reports (weekly + monthly)",
      "Medication OCR & interaction checks",
      "Lab result trends & abnormal alerts",
      "Nutrition scan & meal analysis",
      "Wellness goals & gamification",
      "Export & care-circle sharing",
    ],
  },
  {
    name: "Family Grid",
    price: "₹599",
    period: "/month",
    accent: "lavender",
    desc: "For families and caregivers coordinating health across multiple people.",
    features: [
      "Up to 15 family profiles",
      "Shared care context & visibility",
      "Caregiver access controls",
      "Emergency profile management",
      "Advanced analytics & insights",
      "Priority support",
      "Telehealth preparation tools",
    ],
  },
];

function HeroSection({ isAuthenticated }) {
  return (
    <section className="relative overflow-hidden" style={{ background: "linear-gradient(135deg, #fafaf8 0%, #f0f9eb 50%, #eff4ff 100%)" }}>
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full opacity-30"
          style={{ background: "radial-gradient(circle, rgba(215,245,118,0.4) 0%, transparent 70%)" }} />
        <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, rgba(155,180,255,0.5) 0%, transparent 70%)" }} />
      </div>

      <div className="max-w-7xl mx-auto px-6 py-24 md:py-32 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8"
            style={{ background: "rgba(215,245,118,0.3)", border: "1px solid rgba(215,245,118,0.5)" }}>
            <Zap size={14} style={{ color: "#5a7a00" }} />
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "#5a7a00" }}>
              AI-Powered Personal Health OS
            </span>
          </div>

          <h1 className="text-5xl md:text-6xl lg:text-7xl font-black tracking-tight mb-6 leading-tight" style={{ color: "#0f172a" }}>
            Your complete{" "}
            <span className="relative inline-block">
              <span className="relative z-10" style={{ color: "#0a1200" }}>health record</span>
              <span className="absolute bottom-1 left-0 right-0 h-4 rounded-sm -z-0"
                style={{ background: "#d7f576" }} />
            </span>
            {" "}in one place
          </h1>

          <p className="text-xl leading-relaxed mb-10" style={{ color: "#475569", maxWidth: 560, margin: "0 auto 2.5rem" }}>
            HealthFlux unifies vitals, medications, lab results, medical documents, 
            nutrition, wellness goals, and family care into one AI-powered operating system.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            {isAuthenticated ? (
              <Link to={createPageUrl("Dashboard")}
                className="px-8 py-4 rounded-2xl text-base font-bold flex items-center gap-2 transition-all hover:opacity-90 active:scale-95"
                style={{ background: "#0f172a", color: "#ffffff" }}>
                Go to Dashboard <ArrowRight size={16} />
              </Link>
            ) : (
              <Link to={createPageUrl("Onboarding")}
                className="px-8 py-4 rounded-2xl text-base font-bold flex items-center gap-2 transition-all hover:opacity-90 active:scale-95"
                style={{ background: "#0f172a", color: "#ffffff" }}>
                Start for free <ArrowRight size={16} />
              </Link>
            )}
            <Link to={createPageUrl("Platform")}
              className="px-8 py-4 rounded-2xl text-base font-semibold border-2 transition-all hover:opacity-80 active:scale-95"
              style={{ borderColor: "rgba(15,23,42,0.14)", color: "#475569", background: "rgba(255,255,255,0.8)" }}>
              See all features
            </Link>
          </div>

          {/* Trust micro-copy */}
          <p className="mt-6 text-xs" style={{ color: "#94a3b8" }}>
            Free to start. No credit card required. Available on web, iOS, and Android.
          </p>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-20 max-w-3xl mx-auto">
          {STATS.map(({ value, label }) => (
            <div key={label} className="text-center p-5 rounded-2xl"
              style={{ background: "rgba(255,255,255,0.8)", border: "1px solid rgba(15,23,42,0.07)", backdropFilter: "blur(10px)" }}>
              <p className="text-2xl font-black mb-1" style={{ color: "#0f172a" }}>{value}</p>
              <p className="text-xs" style={{ color: "#64748b" }}>{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  return (
    <section className="py-24 px-6" style={{ background: "#ffffff" }}>
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: "#94a3b8" }}>
            Full platform coverage
          </p>
          <h2 className="text-4xl md:text-5xl font-black mb-5" style={{ color: "#0f172a" }}>
            Everything health, in one app
          </h2>
          <p className="text-lg max-w-xl mx-auto" style={{ color: "#64748b" }}>
            HealthFlux replaces the scattered collection of apps, spreadsheets, and paper records 
            most people use to manage their health.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map(({ icon: Icon, label, accent, desc }) => {
            const a = ACCENTS[accent];
            return (
              <div key={label} className="p-6 rounded-2xl group cursor-default transition-all hover:-translate-y-1 hover:shadow-lg"
                style={{ background: "#fafaf8", border: "1px solid rgba(15,23,42,0.07)" }}>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: a.soft, border: `1.5px solid ${a.bg}` }}>
                  <Icon size={20} style={{ color: a.text === "#0a1200" ? "#5a7a00" : a.text }} />
                </div>
                <h3 className="font-bold mb-2 text-sm" style={{ color: "#0f172a" }}>{label}</h3>
                <p className="text-xs leading-relaxed" style={{ color: "#64748b" }}>{desc}</p>
              </div>
            );
          })}
        </div>

        <div className="text-center mt-12">
          <Link to={createPageUrl("Platform")}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all hover:opacity-80"
            style={{ background: "#f1f5f9", color: "#0f172a", border: "1px solid rgba(15,23,42,0.1)" }}>
            Explore all features <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  const steps = [
    { n: "01", title: "Create your profile", desc: "Sign up and set up your personal health profile — or add family members right away. No medical history required to get started." },
    { n: "02", title: "Log your health data", desc: "Add vitals, medications, lab results, and documents. Use the camera to scan prescription labels or upload PDFs directly." },
    { n: "03", title: "Get AI insights", desc: "HealthFlux AI analyses your data, detects patterns, generates plain-language summaries, and flags things worth discussing with your doctor." },
    { n: "04", title: "Stay on track", desc: "Set wellness goals, receive medication reminders, track nutrition, and use the care circle to keep family health visible and coordinated." },
  ];

  return (
    <section className="py-24 px-6" style={{ background: "#fafaf8" }}>
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: "#94a3b8" }}>
            How it works
          </p>
          <h2 className="text-4xl font-black" style={{ color: "#0f172a" }}>
            Up and running in minutes
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {steps.map(({ n, title, desc }) => (
            <div key={n} className="p-8 rounded-2xl flex gap-5"
              style={{ background: "#ffffff", border: "1px solid rgba(15,23,42,0.07)" }}>
              <div className="flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black"
                style={{ background: "#d7f576", color: "#0a1200" }}>{n}</div>
              <div>
                <h3 className="font-bold mb-2" style={{ color: "#0f172a" }}>{title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "#64748b" }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingSection() {
  return (
    <section className="py-24 px-6" style={{ background: "#ffffff" }}>
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: "#94a3b8" }}>
            Simple pricing
          </p>
          <h2 className="text-4xl font-black mb-4" style={{ color: "#0f172a" }}>
            Plans for every need
          </h2>
          <p className="text-lg" style={{ color: "#64748b" }}>
            Start free. Upgrade when you need more. Cancel anytime.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {PLANS.map((plan) => {
            const a = ACCENTS[plan.accent];
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
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm font-bold px-3 py-1 rounded-full"
                      style={{ background: a.soft, color: plan.featured ? a.bg : a.text }}>
                      {plan.name}
                    </span>
                  </div>
                  <div className="flex items-end gap-1 mb-2">
                    <span className="text-4xl font-black" style={{ color: plan.featured ? "#ffffff" : "#0f172a" }}>
                      {plan.price}
                    </span>
                    {plan.period && (
                      <span className="mb-1.5 text-sm" style={{ color: plan.featured ? "#94a3b8" : "#94a3b8" }}>
                        {plan.period}
                      </span>
                    )}
                  </div>
                  <p className="text-sm mb-6 leading-relaxed" style={{ color: plan.featured ? "#94a3b8" : "#64748b" }}>
                    {plan.desc}
                  </p>
                  <ul className="space-y-2.5 mb-8">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-start gap-2.5 text-sm"
                        style={{ color: plan.featured ? "#cbd5e1" : "#475569" }}>
                        <Check size={14} className="flex-shrink-0 mt-0.5"
                          style={{ color: plan.featured ? a.bg : "#5a7a00" }} />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-auto">
                  <Link to={createPageUrl("Onboarding")}
                    className="block w-full text-center py-3 rounded-xl text-sm font-bold transition-all hover:opacity-90"
                    style={{
                      background: plan.featured ? a.bg : "#0f172a",
                      color: plan.featured ? a.text : "#ffffff",
                    }}>
                    {plan.price === "Free" ? "Start free" : "Get started"}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        <div className="text-center mt-8">
          <Link to={createPageUrl("Pricing")}
            className="text-sm font-semibold hover:opacity-70 transition-opacity"
            style={{ color: "#64748b" }}>
            See full plan comparison →
          </Link>
        </div>
      </div>
    </section>
  );
}

function CTASection({ isAuthenticated }) {
  return (
    <section className="py-24 px-6" style={{ background: "#0c1120" }}>
      <div className="max-w-3xl mx-auto text-center">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-8"
          style={{ background: "#d7f576" }}>
          <HeartPulse size={28} style={{ color: "#0a1200" }} />
        </div>
        <h2 className="text-4xl md:text-5xl font-black mb-6" style={{ color: "#ffffff" }}>
          Your health deserves better tools
        </h2>
        <p className="text-lg mb-10" style={{ color: "#94a3b8" }}>
          Stop juggling apps, folders, and paper records. HealthFlux puts everything in one place 
          so you can focus on what matters — living well.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          {isAuthenticated ? (
            <Link to={createPageUrl("Dashboard")}
              className="px-8 py-4 rounded-2xl text-base font-bold flex items-center gap-2 transition-all hover:opacity-90"
              style={{ background: "#d7f576", color: "#0a1200" }}>
              Go to Dashboard <ArrowRight size={16} />
            </Link>
          ) : (
            <Link to={createPageUrl("Onboarding")}
              className="px-8 py-4 rounded-2xl text-base font-bold flex items-center gap-2 transition-all hover:opacity-90"
              style={{ background: "#d7f576", color: "#0a1200" }}>
              Start for free <ArrowRight size={16} />
            </Link>
          )}
          <Link to={createPageUrl("Platform")}
            className="px-8 py-4 rounded-2xl text-base font-semibold border transition-all hover:opacity-80"
            style={{ borderColor: "rgba(255,255,255,0.15)", color: "#cbd5e1" }}>
            See features
          </Link>
        </div>
        <p className="mt-6 text-xs" style={{ color: "#475569" }}>
          Free plan always available. Upgrade anytime. No credit card for free tier.
        </p>
      </div>
    </section>
  );
}

export default function MarketingHome() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    base44.auth.isAuthenticated().then(setIsAuthenticated).catch(() => {});
  }, []);

  return (
    <MarketingShell currentPage="MarketingHome">
      <HeroSection isAuthenticated={isAuthenticated} />
      <FeaturesSection />
      <HowItWorksSection />
      <PricingSection />
      <CTASection isAuthenticated={isAuthenticated} />
    </MarketingShell>
  );
}

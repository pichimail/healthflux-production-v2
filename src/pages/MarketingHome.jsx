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

/* --- Shared Animation Variants --- */
const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.2 }
  }
};

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
};

/* --- 1. Hero Section with Parallax --- */
const HeroSection = ({ isAuthenticated }) => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y1 = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const y2 = useTransform(scrollYProgress, [0, 1], [0, -150]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <section ref={ref} className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-slate-950 dark:via-indigo-950/30 dark:to-purple-950/30 pt-20">
      <motion.div style={{ y: y1, opacity }} className="relative z-10 w-full max-w-7xl mx-auto px-6 text-center">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.8, ease: "backOut" }} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/60 dark:bg-white/10 backdrop-blur-md border border-indigo-100 dark:border-indigo-800/50 mb-8 shadow-sm">
          <Sparkles className="w-4 h-4 text-purple-500" />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">The Future of Personal Health Tracking is Here</span>
        </motion.div>
        
        <motion.h1 initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.8, delay: 0.2 }} className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-6">
          Your Health Data, <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-pink-500">Beautifully Connected</span>
        </motion.h1>
        
        <motion.p initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.8, delay: 0.3 }} className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-10">
          HealthFluxi eliminates the chaos of scattered medical records, tangled vital logs, and forgotten medications. Experience predictive AI insights wrapped in a stunning, seamless dashboard.
        </motion.p>
        
        <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.8, delay: 0.4 }} className="flex flex-col sm:flex-row items-center justify-center gap-4">
          {isAuthenticated ? (
            <Link to="/dashboard" className="px-8 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center gap-2 transition-all shadow-lg hover:shadow-indigo-500/25 active:scale-95 group">
              Go to Dashboard <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          ) : (
            <button onClick={() => base44.auth.redirectToLogin('/onboarding')} className="px-8 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center gap-2 transition-all shadow-lg hover:shadow-indigo-500/25 active:scale-95 group">
              Get Started <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          )}
          <Link to="/solutions" className="px-8 py-4 rounded-2xl bg-white dark:bg-slate-800 hover:bg-pink-50 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-semibold transition-all shadow-sm border border-slate-200 dark:border-slate-700 active:scale-95">
            See the Solution
          </Link>
        </motion.div>
      </motion.div>

      {/* Floating Parallax Elements */}
      <motion.div style={{ y: y2 }} className="absolute hidden lg:flex top-32 left-20 w-24 h-24 bg-white/40 dark:bg-white/5 backdrop-blur-xl rounded-3xl border border-white/50 dark:border-white/10 shadow-2xl items-center justify-center rotate-12">
        <Heart className="w-10 h-10 text-pink-500 drop-shadow-md" />
      </motion.div>
      <motion.div style={{ y: y1 }} className="absolute hidden lg:flex bottom-40 right-24 w-32 h-32 bg-white/40 dark:bg-white/5 backdrop-blur-xl rounded-full border border-white/50 dark:border-white/10 shadow-2xl items-center justify-center -rotate-12">
        <Brain className="w-12 h-12 text-indigo-500 drop-shadow-md" />
      </motion.div>
    </section>
  );
};

/* --- 2. Problem vs Solution Section --- */
const ProblemSolutionSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="py-24 bg-white dark:bg-slate-900 border-y border-slate-100 dark:border-slate-800 px-6">
      <div className="max-w-7xl mx-auto">
        <motion.div variants={staggerContainer} initial="hidden" animate={isInView ? "visible" : "hidden"} className="grid md:grid-cols-2 gap-12 items-center">
          
          <motion.div variants={fadeUp} className="group relative p-1 lg:p-2 rounded-3xl bg-gradient-to-br from-red-100 to-orange-50 dark:from-red-950/30 dark:to-orange-950/10">
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-8 lg:p-10 rounded-2xl h-full border border-red-100 dark:border-red-900/30">
              <ShieldAlert className="w-12 h-12 text-red-500 mb-6" />
              <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-4">The Old Way is Broken</h3>
              <ul className="space-y-4">
                {["Scattered paper records & lab results", "Missing medication doses", "Disjointed vitals tracking in 5 apps", "No intelligent correlations"].map((text, i) => (
                  <li key={i} className="flex items-start text-slate-600 dark:text-slate-400">
                    <span className="mr-3 text-red-400 mt-1">✗</span> {text}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>

          <motion.div variants={fadeUp} className="group relative p-1 lg:p-2 rounded-3xl bg-gradient-to-br from-teal-100 to-emerald-50 dark:from-teal-950/30 dark:to-emerald-950/10 hover:-translate-y-2 transition-transform duration-500">
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-8 lg:p-10 rounded-2xl h-full border border-teal-100 dark:border-teal-900/30 shadow-xl shadow-teal-500/10">
              <Zap className="w-12 h-12 text-teal-500 mb-6" />
              <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-4">The HealthFluxi Solution</h3>
              <ul className="space-y-4">
                {["Centralized, instant document AI scanning", "Smart medication adherence & alerts", "Unified sync with wearables", "Proactive AI health coaching"].map((text, i) => (
                  <li key={i} className="flex items-start text-slate-600 dark:text-slate-400">
                    <span className="mr-3 text-teal-500 mt-1">✓</span> {text}
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <Link to="/problem-solution" className="text-teal-600 dark:text-teal-400 font-medium flex items-center hover:text-teal-700 transition-colors">
                  Explore how we fix it <ChevronRight className="w-4 h-4 ml-1" />
                </Link>
              </div>
            </div>
          </motion.div>

        </motion.div>
      </div>
    </section>
  );
};

/* --- 3. Interactive Features Bento Box --- */
const FeaturesSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const features = [
    { title: "AI Health Coach", desc: "Get real-time insights based on your vitals, labs, and habits.", icon: Brain, color: "from-indigo-400 to-purple-400", colSpan: "md:col-span-2" },
    { title: "Smart Documents", desc: "Drop any lab report. We extract the data.", icon: FileText, color: "from-blue-400 to-cyan-400", colSpan: "md:col-span-1" },
    { title: "Vital Tracking", desc: "Sync effortlessly with Apple Health & Google Fit.", icon: Activity, color: "from-emerald-400 to-teal-400", colSpan: "md:col-span-1" },
    { title: "Medication Manager", desc: "Never miss a dose with our predictive refill alerts.", icon: Pill, color: "from-rose-400 to-orange-400", colSpan: "md:col-span-2" },
  ];

  return (
    <section className="py-24 bg-slate-50 dark:bg-slate-950 px-6">
      <div className="max-w-7xl mx-auto" ref={ref}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={isInView ? { opacity: 1, y: 0 } : {}} className="text-center mb-16">
          <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">Everything You Need. <span className="text-purple-500">In One App.</span></h2>
          <p className="text-lg text-slate-600 dark:text-slate-400">Discover all modules packed into the most beautiful dashboard.</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feature, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={isInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ delay: idx * 0.1, duration: 0.5 }}
              whileHover={{ scale: 1.02 }}
              className={`p-1 rounded-3xl bg-gradient-to-br ${feature.color} ${feature.colSpan} cursor-pointer group`}
            >
              <div className="bg-white dark:bg-slate-900 h-full w-full rounded-[22px] p-8 flex flex-col justify-between transition-colors group-hover:bg-white/90 dark:group-hover:bg-slate-900/90">
                <div>
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-6`}>
                    <feature.icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-3">{feature.title}</h3>
                  <p className="text-slate-600 dark:text-slate-400">{feature.desc}</p>
                </div>
                <div className="mt-8 flex justify-end">
                  <Link to="/features" className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white transition-colors duration-300">
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

/* --- 4. Developer & API Section (Teaser) --- */
const DevelopersSection = () => {
  return (
    <section className="py-24 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 px-6 overflow-hidden relative">
      <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-blue-50 to-transparent dark:from-blue-900/10 -z-10" />
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
        <div className="w-full lg:w-1/2">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer} className="space-y-6">
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-semibold">
              For Developers
            </motion.div>
            <motion.h2 variants={fadeUp} className="text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white">Build upon our Health Core.</motion.h2>
            <motion.p variants={fadeUp} className="text-lg text-slate-600 dark:text-slate-400">
              Integrate the HealthFluxi AI models and unified data schema directly into your own patient portals and clinical systems. Full API documentation, webhooks, and Convex integration guides available.
            </motion.p>
            <motion.div variants={fadeUp}>
              <Link to="/dev-docs" className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 font-medium hover:text-blue-700 hover:gap-3 transition-all">
                Read the Docs <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          </motion.div>
        </div>
        <div className="w-full lg:w-1/2">
          <motion.div 
            initial={{ opacity: 0, x: 50, rotateY: -10 }} 
            whileInView={{ opacity: 1, x: 0, rotateY: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="perspective-[1000px]"
          >
            <div className="bg-slate-950 p-6 rounded-2xl shadow-2xl border border-slate-800 shadow-blue-500/20 font-mono text-sm text-blue-300 overflow-hidden transform rotate-2 hover:rotate-0 transition-transform duration-500">
              <pre>
                <code>
{`async function analyzeHealthData(vitals) {
  const insight = await api.aiHealthChat({
    context: vitals.history,
    prompt: "Any anomalies today?"
  });
  
  if (insight.anomalyDetected) {
     triggerWarning(insight.patientId);
  }
  return insight;
}`}
                </code>
              </pre>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

/* --- 5. Giant Final CTA --- */
const CTASection = ({ isAuthenticated }) => {
  return (
    <section className="py-32 px-6 bg-slate-900 dark:bg-slate-950 relative overflow-hidden">
      {/* Decorative Orbs */}
      <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-purple-500/30 blur-[128px] rounded-full -translate-y-1/2"></div>
      <div className="absolute top-1/2 right-1/4 w-96 h-96 bg-indigo-500/30 blur-[128px] rounded-full -translate-y-1/2"></div>

      <div className="max-w-4xl mx-auto text-center relative z-10">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} whileInView={{ scale: 1, opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.8 }}>
          <TrendingUp className="w-16 h-16 text-white/80 mx-auto mb-8" />
          <h2 className="text-5xl md:text-6xl font-extrabold text-white mb-8 tracking-tight">Ready to take control?</h2>
          <p className="text-xl text-purple-200 mb-12 max-w-2xl mx-auto">
            Join thousands of users tracking vitals, medications, and unlocking AI-driven health insights every single day.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {isAuthenticated ? (
              <Link to="/dashboard" className="px-8 py-4 rounded-2xl tracking-wide bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-white font-bold text-lg shadow-xl hover:shadow-indigo-500/50 hover:-translate-y-1 transition-all active:scale-95">
                Go to Dashboard
              </Link>
            ) : (
              <button onClick={() => base44.auth.redirectToLogin('/onboarding')} className="px-8 py-4 rounded-2xl tracking-wide bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-white font-bold text-lg shadow-xl hover:shadow-indigo-500/50 hover:-translate-y-1 transition-all active:scale-95">
                Get Started Free
              </button>
            )}
            <Link to="/pricing" className="px-8 py-4 rounded-2xl tracking-wide bg-white/10 hover:bg-white/20 backdrop-blur-lg border border-white/20 text-white font-bold text-lg transition-all active:scale-95">
              View Pricing
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

/* --- Main Home Page Assembly --- */
export default function MarketingHome() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    base44.auth.isAuthenticated().then(setIsAuthenticated).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 font-sans selection:bg-indigo-200 selection:text-indigo-900">
      <main>
        <HeroSection isAuthenticated={isAuthenticated} />
        <ProblemSolutionSection />
        <FeaturesSection />
        <DevelopersSection />
        <CTASection isAuthenticated={isAuthenticated} />
      </main>
    </div>
  );
}
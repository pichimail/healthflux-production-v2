import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity, Brain, FileText, HeartPulse, Leaf, Pill, ScanSearch,
  Stethoscope, TestTube2, Users, BellRing, Camera, Zap, Shield,
  ArrowRight, Check, ChevronDown, ChevronUp, Target, BarChart3,
  Globe, Lock, Smartphone, Workflow,
} from "lucide-react";
import MarketingShell from "@/components/marketing/MarketingShell";
import { createPageUrl } from "@/utils";

const ACCENT = {
  lemon:    { bg: "#d7f576", text: "#0a1200", soft: "rgba(215,245,118,0.15)", border: "rgba(215,245,118,0.5)" },
  lavender: { bg: "#c9bbff", text: "#1a0a40", soft: "rgba(201,187,255,0.15)", border: "rgba(201,187,255,0.5)" },
  mint:     { bg: "#a8e6cf", text: "#003d20", soft: "rgba(168,230,207,0.15)", border: "rgba(168,230,207,0.5)" },
  peach:    { bg: "#f7c9a3", text: "#3d1a00", soft: "rgba(247,201,163,0.15)", border: "rgba(247,201,163,0.5)" },
  sky:      { bg: "#9bb4ff", text: "#0a1240", soft: "rgba(155,180,255,0.15)", border: "rgba(155,180,255,0.5)" },
  coral:    { bg: "#f28c8c", text: "#4d0a0a", soft: "rgba(242,140,140,0.15)", border: "rgba(242,140,140,0.5)" },
};

const HUBS = [
  {
    name: "Health Hub",
    accent: "coral",
    icon: HeartPulse,
    desc: "The core data layer — vitals, medications, lab results, and documents all managed in structured, actionable workflows.",
    features: [
      { icon: HeartPulse, title: "Vitals Tracking", desc: "Log blood pressure, heart rate, SpO₂, blood glucose, temperature, and weight. View trend charts and historical data going back months." },
      { icon: Pill,        title: "Medication Management", desc: "Track every medication with dosage, schedule, prescriber, and refill dates. Get reminders and real-time drug interaction warnings." },
      { icon: FileText,   title: "Medical Documents", desc: "Upload prescriptions, discharge summaries, reports, and imaging results. AI extracts structured data and flags abnormal values." },
      { icon: TestTube2,  title: "Lab Results", desc: "Structured lab entry with reference ranges and abnormal flags. Trend charts show how values change over time." },
      { icon: Camera,     title: "Prescription Scan (OCR)", desc: "Point your camera at a prescription label or report. HealthFlux extracts medication names, dosages, and instructions automatically." },
    ],
  },
  {
    name: "AI Hub",
    accent: "lavender",
    icon: Brain,
    desc: "Intelligent analysis that turns raw health data into clear, actionable explanations — without replacing your doctor.",
    features: [
      { icon: Brain,       title: "AI Health Assistant", desc: "Ask questions about your health records in plain language. Get contextual answers grounded in your actual vitals, meds, and labs." },
      { icon: Activity,   title: "AI Health Reports", desc: "Weekly and monthly AI-generated summaries of your health trends, medication adherence, and notable changes." },
      { icon: ScanSearch, title: "Medical Imaging Analysis", desc: "Upload X-rays, MRIs, and ultrasound images for AI-assisted pattern recognition. Results are informational and should be reviewed by a doctor." },
      { icon: Zap,        title: "Skin Assessment", desc: "Camera-based skin analysis for common dermatological patterns. Helps users decide if a dermatologist visit is warranted." },
      { icon: Leaf,       title: "Personalized Diet Planning", desc: "AI generates meal plans aligned with your health conditions, lab results, and nutrition goals." },
    ],
  },
  {
    name: "Wellness Hub",
    accent: "mint",
    icon: Leaf,
    desc: "Goal-setting, habit tracking, and nutrition management to support long-term health behaviour change.",
    features: [
      { icon: Target,     title: "Wellness Goals", desc: "Set structured health goals — weight, activity, sleep, hydration — and track progress with streaks and milestone rewards." },
      { icon: ScanSearch, title: "Nutrition & Meal Logging", desc: "Log meals manually or scan food with your camera for instant calorie and macro breakdowns. Track against your daily targets." },
      { icon: BarChart3,  title: "Health Insights & Trends", desc: "Cross-domain insights that connect vitals, nutrition, activity, and sleep to surface meaningful health patterns." },
      { icon: BellRing,   title: "Gamification & Rewards", desc: "Earn points for consistent logging, completing goals, and improving health markers. Streaks and badges keep motivation high." },
    ],
  },
  {
    name: "Care Hub",
    accent: "peach",
    icon: Stethoscope,
    desc: "Coordination tools for families, caregivers, and healthcare preparation — beyond individual self-tracking.",
    features: [
      { icon: Users,       title: "Family & Care Circle", desc: "Manage up to 15 family profiles. Share selected health context with caregivers. Each person has their own private records." },
      { icon: Stethoscope, title: "Telehealth Preparation", desc: "Generate visit summaries, export health timelines, and prepare shareable reports before doctor appointments." },
      { icon: Shield,      title: "Emergency Profile", desc: "Store critical health info — blood type, allergies, emergency contacts, critical medications — accessible even without login." },
      { icon: Globe,       title: "ABHA Integration", desc: "Link your Ayushman Bharat Health Account for interoperability with India's national digital health ecosystem." },
    ],
  },
];

const CROSS_CUTTING = [
  { icon: Smartphone, title: "Mobile-first design", desc: "Built for iOS and Android with a native app feel. Works offline for critical data." },
  { icon: Lock,       title: "Privacy by design", desc: "Your health data is never used for advertising. Sharing is always explicit and user-controlled." },
  { icon: Workflow,   title: "Modular architecture", desc: "Each hub works independently and together. Add features without disrupting existing workflows." },
  { icon: Shield,     title: "Role-aware access", desc: "Family members, caregivers, and admins have distinct access boundaries designed around real care relationships." },
];

function HubSection({ hub }) {
  const [open, setOpen] = useState(false);
  const a = ACCENT[hub.accent];
  const Icon = hub.icon;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(15,23,42,0.08)" }}>
      {/* Hub header */}
      <div className="p-8" style={{ background: a.soft }}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: a.bg }}>
              <Icon size={22} style={{ color: a.text }} />
            </div>
            <div>
              <h3 className="text-xl font-black mb-1" style={{ color: "#0f172a" }}>{hub.name}</h3>
              <p className="text-sm" style={{ color: "#64748b" }}>{hub.desc}</p>
            </div>
          </div>
          <button onClick={() => setOpen(o => !o)}
            className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
            style={{ background: "rgba(255,255,255,0.7)", color: "#475569" }}>
            {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* Feature grid */}
      {open && (
        <div className="grid sm:grid-cols-2 gap-0 divide-y sm:divide-y-0 sm:divide-x"
          style={{ background: "#ffffff", borderTop: "1px solid rgba(15,23,42,0.07)", divideColor: "rgba(15,23,42,0.07)" }}>
          {hub.features.map(({ icon: FIcon, title, desc }) => (
            <div key={title} className="p-6" style={{ borderBottom: "1px solid rgba(15,23,42,0.05)" }}>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: a.soft }}>
                  <FIcon size={14} style={{ color: a.text === "#0a1200" ? "#5a7a00" : a.text }} />
                </div>
                <span className="font-bold text-sm" style={{ color: "#0f172a" }}>{title}</span>
              </div>
              <p className="text-xs leading-relaxed pl-10" style={{ color: "#64748b" }}>{desc}</p>
            </div>
          ))}
        </div>
      )}

      {!open && (
        <div className="px-8 py-4 flex items-center gap-4 flex-wrap"
          style={{ background: "#ffffff", borderTop: "1px solid rgba(15,23,42,0.06)" }}>
          {hub.features.map(({ title }) => (
            <span key={title} className="text-xs font-medium px-3 py-1.5 rounded-full"
              style={{ background: a.soft, color: a.text === "#0a1200" ? "#5a7a00" : a.text }}>
              {title}
            </span>
          ))}
          <button onClick={() => setOpen(true)} className="ml-auto text-xs font-semibold flex items-center gap-1"
            style={{ color: "#94a3b8" }}>
            Show details <ChevronDown size={12} />
          </button>
        </div>
      )}
    </div>
  );
}

export default function Platform() {
  return (
    <MarketingShell currentPage="Platform">
      {/* Hero */}
      <section className="py-20 px-6" style={{ background: "linear-gradient(135deg, #fafaf8 0%, #f0f9eb 60%, #eff4ff 100%)" }}>
        <div className="max-w-3xl mx-auto text-center">
          <span className="inline-block px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest mb-6"
            style={{ background: "rgba(215,245,118,0.3)", color: "#5a7a00" }}>
            Platform features
          </span>
          <h1 className="text-5xl font-black mb-5 leading-tight" style={{ color: "#0f172a" }}>
            Every health workflow,<br />covered completely
          </h1>
          <p className="text-lg leading-relaxed mb-8" style={{ color: "#475569" }}>
            HealthFlux is organised into four interconnected hubs — Health, AI, Wellness, and Care —
            each with deep, purpose-built workflows that share the same unified patient context.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link to={createPageUrl("Auth")}
              className="px-7 py-3 rounded-xl text-sm font-bold flex items-center gap-2"
              style={{ background: "#0f172a", color: "#ffffff" }}>
              Try all features free <ArrowRight size={14} />
            </Link>
            <Link to={createPageUrl("Pricing")}
              className="px-7 py-3 rounded-xl text-sm font-semibold border"
              style={{ borderColor: "rgba(15,23,42,0.14)", color: "#475569" }}>
              See pricing
            </Link>
          </div>
        </div>
      </section>

      {/* Hub sections */}
      <section className="py-20 px-6" style={{ background: "#ffffff" }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black mb-3" style={{ color: "#0f172a" }}>Four hubs, one platform</h2>
            <p className="text-base" style={{ color: "#64748b" }}>
              Click any hub to explore its features in detail.
            </p>
          </div>
          <div className="space-y-4">
            {HUBS.map(hub => <HubSection key={hub.name} hub={hub} />)}
          </div>
        </div>
      </section>

      {/* Platform capabilities */}
      <section className="py-20 px-6" style={{ background: "#fafaf8" }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black mb-3" style={{ color: "#0f172a" }}>Platform-wide capabilities</h2>
            <p className="text-base" style={{ color: "#64748b" }}>
              Built into every part of HealthFlux, not bolted on.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            {CROSS_CUTTING.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex gap-4 p-6 rounded-2xl"
                style={{ background: "#ffffff", border: "1px solid rgba(15,23,42,0.07)" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(215,245,118,0.2)" }}>
                  <Icon size={18} style={{ color: "#5a7a00" }} />
                </div>
                <div>
                  <h3 className="font-bold mb-1 text-sm" style={{ color: "#0f172a" }}>{title}</h3>
                  <p className="text-xs leading-relaxed" style={{ color: "#64748b" }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6" style={{ background: "#0c1120" }}>
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-black mb-4" style={{ color: "#ffffff" }}>
            Start exploring the platform
          </h2>
          <p className="mb-8" style={{ color: "#94a3b8" }}>
            The free plan includes the core dashboard, vitals, medications, and limited AI access.
            Upgrade to unlock the full platform.
          </p>
          <Link to={createPageUrl("Auth")}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-sm font-bold"
            style={{ background: "#d7f576", color: "#0a1200" }}>
            Get started free <ArrowRight size={14} />
          </Link>
        </div>
      </section>
    </MarketingShell>
  );
}

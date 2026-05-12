import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Heart, Users, Brain, Stethoscope, Activity, FileText, Pill, Leaf } from "lucide-react";
import MarketingShell from "@/components/marketing/MarketingShell";
import { createPageUrl } from "@/utils";

const SOLUTIONS = [
  {
    id: "individual",
    accent: { bg: "#d7f576", text: "#0a1200", soft: "rgba(215,245,118,0.15)" },
    icon: Heart,
    tag: "For individuals",
    title: "Your personal health command center",
    desc: "One place to track everything that matters to your health — vitals, medications, documents, labs, and AI insights — without switching between apps.",
    scenarios: [
      {
        icon: Activity,
        title: "Managing a chronic condition",
        story: "Track blood pressure and blood glucose daily. Review trends over weeks. Get AI-generated summaries to bring to your next appointment. Set medication reminders so you never miss a dose.",
      },
      {
        icon: Pill,
        title: "Taking multiple medications",
        story: "Scan prescriptions with your phone camera. HealthFlux extracts medication names, dosages, and schedules. The drug interaction checker flags combinations worth discussing with your doctor.",
      },
      {
        icon: FileText,
        title: "Building a health record",
        story: "Upload lab reports, discharge summaries, and old prescriptions. The AI extracts key data — doctor names, diagnoses, medications, test values — and makes everything searchable.",
      },
    ],
  },
  {
    id: "families",
    accent: { bg: "#c9bbff", text: "#1a0a40", soft: "rgba(201,187,255,0.15)" },
    icon: Users,
    tag: "For families",
    title: "Health management for the whole household",
    desc: "Manage health records for every family member — children, elderly parents, or anyone in your care — from a single account with role-based access controls.",
    scenarios: [
      {
        icon: Users,
        title: "Caring for elderly parents",
        story: "Create a profile for each parent. Track their medications, vitals, and doctor appointments. Grant limited view access to siblings who need to stay informed. Keep everyone aligned without constant calls.",
      },
      {
        icon: Heart,
        title: "Managing a child's health",
        story: "Upload vaccination records, growth charts, and pediatrician notes. Track symptoms over time to identify patterns. Export a complete health summary for any new doctor.",
      },
      {
        icon: FileText,
        title: "Emergency preparedness",
        story: "Each profile has an emergency-accessible summary: blood type, allergies, active medications, and key conditions. Critical information available when it matters most.",
      },
    ],
  },
  {
    id: "wellness",
    accent: { bg: "#a8e6cf", text: "#003d20", soft: "rgba(168,230,207,0.15)" },
    icon: Leaf,
    tag: "For wellness",
    title: "Turn intentions into lasting habits",
    desc: "HealthFlux's wellness tools connect daily health data to actionable goals — with AI coaching, streaks, and nutrition tracking to keep momentum going.",
    scenarios: [
      {
        icon: Leaf,
        title: "Weight and nutrition goals",
        story: "Log meals with photo scanning or manual entry. Track calories, protein, carbs, and fat. Get a personalized diet plan from the AI based on your health profile and goals.",
      },
      {
        icon: Activity,
        title: "Building consistent habits",
        story: "Set daily wellness goals — steps, water intake, sleep, medication adherence. Track streaks, earn points, and review weekly progress reports to stay on course.",
      },
      {
        icon: Brain,
        title: "Understanding your health data",
        story: "Ask the AI health assistant anything about your recent records. Get plain-language explanations of lab values, medication side effects, or what a blood pressure trend might mean.",
      },
    ],
  },
  {
    id: "clinical-readiness",
    accent: { bg: "#fca5a5", text: "#450a0a", soft: "rgba(252,165,165,0.15)" },
    icon: Stethoscope,
    tag: "For care coordination",
    title: "Better prepared for every appointment",
    desc: "HealthFlux helps you arrive at medical appointments with organized, exportable records — so your care team has the context they need.",
    scenarios: [
      {
        icon: FileText,
        title: "Appointment preparation",
        story: "Generate a provider-ready health summary before any visit — current medications, recent vitals, recent lab results, and a list of concerns. Export as PDF and share directly with your care team.",
      },
      {
        icon: Stethoscope,
        title: "Telehealth consultations",
        story: "Before a video consultation, pull up your medication list, recent vitals, and relevant documents in one view. No scrambling through paper records or different apps.",
      },
      {
        icon: Activity,
        title: "Second opinions",
        story: "Export a complete, organized health record when seeking a second opinion. All documents, labs, vitals, and medications — structured and searchable — ready to share.",
      },
    ],
  },
];

function ScenarioCard({ scenario }) {
  const Icon = scenario.icon;
  return (
    <div className="p-5 rounded-2xl" style={{ background: "#ffffff", border: "1px solid rgba(15,23,42,0.08)" }}>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3"
        style={{ background: "#fafaf8" }}>
        <Icon size={15} style={{ color: "#64748b" }} />
      </div>
      <h4 className="font-bold text-sm mb-2" style={{ color: "#0f172a" }}>{scenario.title}</h4>
      <p className="text-sm leading-relaxed" style={{ color: "#64748b" }}>{scenario.story}</p>
    </div>
  );
}

export default function Solutions() {
  return (
    <MarketingShell currentPage="Solutions">
      {/* Hero */}
      <section className="py-20 px-6" style={{ background: "linear-gradient(135deg, #fafaf8 0%, #f0f9eb 60%, #eff4ff 100%)" }}>
        <div className="max-w-3xl mx-auto text-center">
          <span className="inline-block px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest mb-6"
            style={{ background: "rgba(215,245,118,0.3)", color: "#0a1200" }}>
            Solutions
          </span>
          <h1 className="text-5xl font-black mb-5 leading-tight" style={{ color: "#0f172a" }}>
            HealthFlux for every health journey
          </h1>
          <p className="text-lg leading-relaxed" style={{ color: "#475569" }}>
            Whether you're managing your own health, caring for family, building wellness habits,
            or preparing for medical care — HealthFlux has a workflow for it.
          </p>
        </div>
      </section>

      {/* Solution sections */}
      {SOLUTIONS.map((solution, idx) => {
        const Icon = solution.icon;
        return (
          <section key={solution.id} id={solution.id}
            className="py-20 px-6 scroll-mt-20"
            style={{ background: idx % 2 === 0 ? "#ffffff" : "#fafaf8" }}>
            <div className="max-w-5xl mx-auto">
              <div className="flex flex-col lg:flex-row gap-12">
                {/* Left: context */}
                <div className="lg:w-64 flex-shrink-0">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
                    style={{ background: solution.accent.soft }}>
                    <Icon size={22} style={{ color: solution.accent.text === "#0a1200" ? "#5a7a00" : solution.accent.text }} />
                  </div>
                  <span className="text-xs font-black uppercase tracking-widest"
                    style={{ color: "#94a3b8" }}>
                    {solution.tag}
                  </span>
                  <h2 className="text-2xl font-black mt-2 mb-3 leading-tight" style={{ color: "#0f172a" }}>
                    {solution.title}
                  </h2>
                  <p className="text-sm leading-relaxed" style={{ color: "#64748b" }}>
                    {solution.desc}
                  </p>
                </div>
                {/* Right: scenarios */}
                <div className="flex-1 grid sm:grid-cols-3 gap-4">
                  {solution.scenarios.map(s => <ScenarioCard key={s.title} scenario={s} />)}
                </div>
              </div>
            </div>
          </section>
        );
      })}

      {/* CTA */}
      <section className="py-20 px-6" style={{ background: "#0c1120" }}>
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-black mb-4" style={{ color: "#ffffff" }}>
            Start your health journey today
          </h2>
          <p className="mb-8" style={{ color: "#94a3b8" }}>
            Free to start. No credit card required. Your data, your control.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to={createPageUrl("Onboarding")}
              className="px-8 py-4 rounded-xl text-sm font-bold flex items-center gap-2"
              style={{ background: "#d7f576", color: "#0a1200" }}>
              Get started free <ArrowRight size={14} />
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

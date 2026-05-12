import React from "react";
import { Link } from "react-router-dom";
import { Shield, Lock, Eye, UserCheck, Database, ArrowRight, Mail } from "lucide-react";
import MarketingShell from "@/components/marketing/MarketingShell";
import { createPageUrl } from "@/utils";

const LAST_UPDATED = "May 2026";

const SECTIONS = [
  {
    id: "overview",
    icon: Shield,
    accent: "#d7f576",
    accentText: "#0a1200",
    title: "Privacy overview",
    content: [
      {
        heading: "Our commitment",
        text: "HealthFlux is a personal health operating system. We handle deeply sensitive medical information — vitals, medications, lab results, medical documents, and AI-generated health insights. We take this responsibility seriously.",
      },
      {
        heading: "Core principles",
        list: [
          "Your health data belongs to you, not to us",
          "We do not sell, rent, or use your health data for advertising",
          "Sharing is always explicit, visible, and user-controlled",
          "AI processing is scoped to your own records, not pooled across users",
          "You can export or delete your data at any time",
        ],
      },
    ],
  },
  {
    id: "data-collected",
    icon: Database,
    accent: "#9bb4ff",
    accentText: "#0a1240",
    title: "What data we collect",
    content: [
      {
        heading: "Account & profile data",
        text: "Your name, email address, date of birth, and account credentials. If you create family profiles, we collect the same information for each profile you manage.",
      },
      {
        heading: "Health data you enter",
        list: [
          "Vitals: blood pressure, heart rate, SpO₂, blood glucose, weight, temperature",
          "Medications: names, dosages, schedules, prescribing doctors, refill dates",
          "Medical documents: uploaded prescriptions, lab reports, discharge summaries, imaging",
          "Lab results: structured test values and reference ranges",
          "Nutrition: meal logs, food items, macro and calorie data",
          "Wellness: goals, progress logs, activity data, hydration",
        ],
      },
      {
        heading: "Usage & technical data",
        text: "Device type, operating system, app version, feature interactions, and error logs. This data is used to improve reliability and fix bugs — not for profiling.",
      },
      {
        heading: "Camera & file data",
        text: "When you use the prescription scanner, document upload, meal photo analysis, or skin assessment features, images are processed to extract information. Images are not stored permanently unless you explicitly save the extracted data.",
      },
    ],
  },
  {
    id: "how-we-use",
    icon: Eye,
    accent: "#a8e6cf",
    accentText: "#003d20",
    title: "How we use your data",
    content: [
      {
        heading: "Core service delivery",
        list: [
          "Displaying your health records, vitals, and medications in the dashboard",
          "Sending medication reminders and refill notifications",
          "Generating AI health summaries, reports, and insights",
          "Processing uploaded documents and extracting structured data with OCR",
          "Running drug interaction checks against your medication list",
        ],
      },
      {
        heading: "AI features",
        text: "The AI assistant, health coach, imaging analysis, and skin assessment use your profile context to generate relevant responses. AI processing runs on your individual profile data — it is not pooled across user accounts for model training without explicit consent.",
      },
      {
        heading: "Family & care coordination",
        text: "When you share profile visibility with a family member or caregiver, they can see the data you've explicitly granted access to. You control this through the Care Circle settings and can revoke access at any time.",
      },
      {
        heading: "What we do NOT do",
        list: [
          "We do not sell your health data to third parties",
          "We do not use health data for targeted advertising",
          "We do not share data with insurance companies or employers",
          "We do not use your data to train shared AI models without consent",
        ],
      },
    ],
  },
  {
    id: "sharing",
    icon: UserCheck,
    accent: "#f7c9a3",
    accentText: "#3d1a00",
    title: "Data sharing & disclosure",
    content: [
      {
        heading: "User-initiated sharing",
        text: "You can share health reports, export summaries, or grant caregiver access through explicit in-app actions. All sharing is visible in your settings and reversible.",
      },
      {
        heading: "Service providers",
        text: "We use third-party infrastructure providers (cloud hosting, database services, AI model providers) that process data on our behalf under data processing agreements. These providers are not permitted to use your data for their own purposes.",
      },
      {
        heading: "Legal requirements",
        text: "We may disclose data if required by law, court order, or government authority. We will notify you of such requests where legally permitted.",
      },
      {
        heading: "ABHA integration",
        text: "If you link your Ayushman Bharat Health Account (ABHA), data exchange with the national digital health ecosystem follows the ABDM guidelines. You control which records are shared through the ABHA connection settings.",
      },
    ],
  },
  {
    id: "security",
    icon: Lock,
    accent: "#c9bbff",
    accentText: "#1a0a40",
    title: "Data security",
    content: [
      {
        heading: "Technical safeguards",
        list: [
          "All data is encrypted in transit using TLS 1.3",
          "Health data is encrypted at rest in our databases",
          "Authentication uses industry-standard protocols",
          "Role-based access controls limit internal data access",
          "Regular security reviews and penetration testing",
        ],
      },
      {
        heading: "Incident response",
        text: "In the event of a data breach affecting your health information, we will notify you within 72 hours of becoming aware of the incident, consistent with applicable law.",
      },
    ],
  },
  {
    id: "rights",
    icon: UserCheck,
    accent: "#d7f576",
    accentText: "#0a1200",
    title: "Your rights & controls",
    content: [
      {
        heading: "Access & portability",
        text: "You can view and export all your health data at any time from Settings > Export. Exports include vitals, medications, documents, lab results, and wellness data in standard formats.",
      },
      {
        heading: "Correction & deletion",
        text: "You can edit or delete any record directly in the app. To delete your entire account and all associated data, go to Settings > Account > Delete Account. Deletion is permanent and irreversible.",
      },
      {
        heading: "Consent withdrawal",
        text: "You can withdraw consent for specific data processing (such as AI analysis or ABHA integration) at any time in Settings > Privacy. Withdrawing consent does not affect data processed before withdrawal.",
      },
      {
        heading: "Data retention",
        text: "Active accounts retain health data indefinitely to support longitudinal health tracking. When you delete your account, all personal data is purged within 30 days.",
      },
    ],
  },
];

function SectionBlock({ section }) {
  const Icon = section.icon;
  return (
    <div id={section.id} className="scroll-mt-24">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: section.accent + "33" }}>
          <Icon size={18} style={{ color: section.accentText === "#0a1200" ? "#5a7a00" : section.accentText }} />
        </div>
        <h2 className="text-xl font-black" style={{ color: "#0f172a" }}>{section.title}</h2>
      </div>
      <div className="space-y-5 pl-13">
        {section.content.map((block, i) => (
          <div key={i}>
            {block.heading && (
              <h3 className="text-sm font-bold mb-2" style={{ color: "#0f172a" }}>{block.heading}</h3>
            )}
            {block.text && (
              <p className="text-sm leading-relaxed" style={{ color: "#475569" }}>{block.text}</p>
            )}
            {block.list && (
              <ul className="space-y-1.5">
                {block.list.map(item => (
                  <li key={item} className="flex items-start gap-2 text-sm" style={{ color: "#475569" }}>
                    <span className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ background: "#94a3b8" }} />
                    {item}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Privacy() {
  return (
    <MarketingShell currentPage="Privacy">
      {/* Hero */}
      <section className="py-16 px-6" style={{ background: "linear-gradient(135deg, #fafaf8 0%, #f0fdf4 100%)" }}>
        <div className="max-w-3xl mx-auto">
          <span className="inline-block px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest mb-6"
            style={{ background: "rgba(168,230,207,0.3)", color: "#003d20" }}>
            Privacy policy
          </span>
          <h1 className="text-4xl md:text-5xl font-black mb-5 leading-tight" style={{ color: "#0f172a" }}>
            Your health data, your control
          </h1>
          <p className="text-lg leading-relaxed mb-6" style={{ color: "#475569" }}>
            HealthFlux handles deeply personal health information. This policy explains exactly what 
            we collect, how we use it, and the controls you have — written in plain language.
          </p>
          <p className="text-sm" style={{ color: "#94a3b8" }}>Last updated: {LAST_UPDATED}</p>
        </div>
      </section>

      {/* Main content */}
      <section className="py-16 px-6" style={{ background: "#ffffff" }}>
        <div className="max-w-3xl mx-auto">
          {/* Table of contents */}
          <div className="p-6 rounded-2xl mb-12" style={{ background: "#fafaf8", border: "1px solid rgba(15,23,42,0.08)" }}>
            <p className="text-xs font-black uppercase tracking-widest mb-4" style={{ color: "#94a3b8" }}>
              Contents
            </p>
            <div className="grid sm:grid-cols-2 gap-2">
              {SECTIONS.map(s => (
                <a key={s.id} href={`#${s.id}`}
                  className="text-sm font-medium hover:opacity-70 transition-opacity"
                  style={{ color: "#0f172a" }}>
                  → {s.title}
                </a>
              ))}
            </div>
          </div>

          {/* Sections */}
          <div className="space-y-14 divide-y" style={{ divideColor: "rgba(15,23,42,0.06)" }}>
            {SECTIONS.map(s => (
              <div key={s.id} className="pt-14 first:pt-0">
                <SectionBlock section={s} />
              </div>
            ))}
          </div>

          {/* Contact */}
          <div className="mt-14 p-6 rounded-2xl" style={{ background: "#fafaf8", border: "1px solid rgba(15,23,42,0.08)" }}>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(215,245,118,0.3)" }}>
                <Mail size={18} style={{ color: "#5a7a00" }} />
              </div>
              <div>
                <h3 className="font-bold mb-1" style={{ color: "#0f172a" }}>Privacy questions</h3>
                <p className="text-sm mb-3" style={{ color: "#64748b" }}>
                  For privacy-related requests — data access, deletion, or corrections — contact us 
                  directly. We respond within 5 business days.
                </p>
                <a href="mailto:privacy@healthflux.app"
                  className="text-sm font-semibold"
                  style={{ color: "#5a7a00" }}>
                  privacy@healthflux.app
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Related links */}
      <section className="py-16 px-6" style={{ background: "#fafaf8" }}>
        <div className="max-w-3xl mx-auto">
          <h2 className="text-xl font-black mb-6" style={{ color: "#0f172a" }}>Related policies</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { label: "Terms of Service", page: "Terms", desc: "Usage rules and account terms" },
              { label: "Cookie Policy", page: "Cookies", desc: "How we use cookies and tracking" },
              { label: "Trust Center", page: "TrustCenter", desc: "Security and compliance overview" },
            ].map(({ label, page, desc }) => (
              <Link key={page} to={createPageUrl(page)}
                className="p-5 rounded-2xl flex flex-col gap-1.5 hover:shadow-sm transition-shadow"
                style={{ background: "#ffffff", border: "1px solid rgba(15,23,42,0.08)" }}>
                <span className="font-bold text-sm" style={{ color: "#0f172a" }}>{label}</span>
                <span className="text-xs" style={{ color: "#64748b" }}>{desc}</span>
                <ArrowRight size={12} className="mt-1" style={{ color: "#94a3b8" }} />
              </Link>
            ))}
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}

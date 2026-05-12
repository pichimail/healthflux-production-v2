import React from "react";
import { Link } from "react-router-dom";
import { Shield, Lock, Eye, Server, UserCheck, AlertCircle, ArrowRight } from "lucide-react";
import MarketingShell from "@/components/marketing/MarketingShell";
import { createPageUrl } from "@/utils";

const PILLARS = [
  {
    icon: Lock,
    accent: { bg: "rgba(215,245,118,0.25)", icon: "#5a7a00" },
    title: "Data encryption",
    desc: "All data is encrypted in transit using TLS 1.3. Health data is encrypted at rest in our databases. Encryption keys are managed separately from data stores.",
    points: ["TLS 1.3 for all client-server communication", "AES-256 encryption at rest", "Separate key management"],
  },
  {
    icon: UserCheck,
    accent: { bg: "rgba(201,187,255,0.25)", icon: "#7c3aed" },
    title: "Authentication & access",
    desc: "Role-based access controls ensure users only see data they're authorized to access. Caregiver access is explicitly scoped and can be revoked at any time.",
    points: ["Secure session management", "Role-based profile access", "Caregiver permission scoping", "Account activity logging"],
  },
  {
    icon: Eye,
    accent: { bg: "rgba(168,230,207,0.25)", icon: "#047857" },
    title: "No advertising surveillance",
    desc: "HealthFlux does not sell health data. We do not use your health records for advertising. AI processing runs on your individual data only — not pooled for model training without consent.",
    points: ["No third-party ad tracking", "No health data sold to brokers", "AI scoped to individual profiles", "No behavioral profiling"],
  },
  {
    icon: Server,
    accent: { bg: "rgba(252,165,165,0.25)", icon: "#b91c1c" },
    title: "Infrastructure security",
    desc: "HealthFlux runs on enterprise-grade cloud infrastructure with redundancy, automated backups, and continuous monitoring.",
    points: ["Redundant cloud infrastructure", "Automated daily backups", "Continuous uptime monitoring", "Vulnerability scanning"],
  },
  {
    icon: AlertCircle,
    accent: { bg: "rgba(253,224,71,0.25)", icon: "#a16207" },
    title: "Incident response",
    desc: "We maintain an incident response plan for security events. Affected users are notified within 72 hours of confirmed data breaches, consistent with applicable law.",
    points: ["Defined incident response plan", "72-hour breach notification", "Post-incident reviews", "Security team on-call"],
  },
  {
    icon: Shield,
    accent: { bg: "rgba(147,197,253,0.25)", icon: "#1d4ed8" },
    title: "Compliance posture",
    desc: "HealthFlux is designed for compliance with Indian data protection laws and ABDM guidelines for digital health. We review our practices against evolving regulatory requirements.",
    points: ["DPDP Act alignment", "ABDM guidelines for ABHA integration", "Regular policy reviews", "Data residency in India"],
  },
];

export default function TrustCenter() {
  return (
    <MarketingShell currentPage="TrustCenter">
      {/* Hero */}
      <section className="py-20 px-6" style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)" }}>
        <div className="max-w-3xl mx-auto">
          <span className="inline-block px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest mb-6"
            style={{ background: "rgba(215,245,118,0.15)", color: "#d7f576" }}>
            Trust & security
          </span>
          <h1 className="text-4xl md:text-5xl font-black mb-5 leading-tight" style={{ color: "#ffffff" }}>
            How we protect your health data
          </h1>
          <p className="text-lg leading-relaxed" style={{ color: "#94a3b8" }}>
            HealthFlux handles sensitive medical information. This page explains the technical, 
            operational, and policy measures we use to protect it.
          </p>
        </div>
      </section>

      {/* Core statement */}
      <section className="py-10 px-6" style={{ background: "#fafaf8" }}>
        <div className="max-w-3xl mx-auto">
          <div className="p-6 rounded-2xl flex items-start gap-4"
            style={{ background: "#ffffff", border: "1px solid rgba(15,23,42,0.08)" }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(215,245,118,0.3)" }}>
              <Shield size={18} style={{ color: "#5a7a00" }} />
            </div>
            <div>
              <p className="font-bold mb-1" style={{ color: "#0f172a" }}>Our security commitment</p>
              <p className="text-sm leading-relaxed" style={{ color: "#64748b" }}>
                We treat your health data with the same care you would expect from your most 
                trusted healthcare provider. Security is a core part of how HealthFlux is built 
                — not an afterthought.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pillars */}
      <section className="py-16 px-6" style={{ background: "#ffffff" }}>
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-6">
            {PILLARS.map(pillar => {
              const Icon = pillar.icon;
              return (
                <div key={pillar.title} className="p-6 rounded-2xl"
                  style={{ background: "#fafaf8", border: "1px solid rgba(15,23,42,0.08)" }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                    style={{ background: pillar.accent.bg }}>
                    <Icon size={18} style={{ color: pillar.accent.icon }} />
                  </div>
                  <h3 className="font-black text-base mb-2" style={{ color: "#0f172a" }}>{pillar.title}</h3>
                  <p className="text-sm leading-relaxed mb-4" style={{ color: "#64748b" }}>{pillar.desc}</p>
                  <ul className="space-y-1.5">
                    {pillar.points.map(pt => (
                      <li key={pt} className="flex items-center gap-2 text-xs" style={{ color: "#475569" }}>
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: pillar.accent.icon }} />
                        {pt}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* AI trust section */}
      <section className="py-16 px-6" style={{ background: "#fafaf8" }}>
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-black mb-6" style={{ color: "#0f172a" }}>AI and your health data</h2>
          <div className="space-y-4">
            {[
              { q: "Does HealthFlux train AI models on my health data?", a: "No. AI processing in HealthFlux uses your profile data as context for generating responses — it does not feed your health records into shared model training without explicit opt-in consent." },
              { q: "Who can see my AI conversations?", a: "AI conversations are tied to your account and profile. Your chat history is private and not accessible to HealthFlux staff for any purpose other than security incident investigation with appropriate legal basis." },
              { q: "How accurate are AI health insights?", a: "AI-generated insights are informational only. They are not medical diagnoses. We include clear disclaimers on all AI outputs and recommend consulting qualified healthcare professionals for clinical decisions." },
              { q: "What happens when I use drug interaction checking?", a: "Drug interaction checks use your medication list as input. The result is generated by AI based on clinical knowledge. This is informational guidance — it does not replace pharmacist or physician review." },
            ].map(item => (
              <div key={item.q} className="p-5 rounded-2xl" style={{ background: "#ffffff", border: "1px solid rgba(15,23,42,0.08)" }}>
                <h3 className="font-bold text-sm mb-2" style={{ color: "#0f172a" }}>{item.q}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "#64748b" }}>{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Reporting */}
      <section className="py-16 px-6" style={{ background: "#ffffff" }}>
        <div className="max-w-3xl mx-auto">
          <div className="p-6 rounded-2xl" style={{ background: "#fafaf8", border: "1px solid rgba(15,23,42,0.08)" }}>
            <h2 className="font-black text-lg mb-3" style={{ color: "#0f172a" }}>Report a security issue</h2>
            <p className="text-sm leading-relaxed mb-4" style={{ color: "#64748b" }}>
              If you discover a security vulnerability in HealthFlux, please report it responsibly. 
              We take all reports seriously and aim to acknowledge within 48 hours.
            </p>
            <a href="mailto:security@healthflux.app" className="text-sm font-semibold" style={{ color: "#5a7a00" }}>
              security@healthflux.app
            </a>
          </div>
        </div>
      </section>

      {/* Links to policies */}
      <section className="py-16 px-6" style={{ background: "#fafaf8" }}>
        <div className="max-w-3xl mx-auto">
          <h2 className="text-xl font-black mb-6" style={{ color: "#0f172a" }}>Full policy documentation</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { label: "Privacy Policy", page: "Privacy", desc: "How we collect and use your data" },
              { label: "Terms of Service", page: "Terms", desc: "Usage rules and account terms" },
              { label: "Cookie Policy", page: "Cookies", desc: "How we use cookies" },
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


export default function TrustCenter() {
  return (
    <MarketingShell
      currentPage="TrustCenter"
      heroTone="sky"
      eyebrow="Trust center"
      title="Trust in HealthFlux comes from explicit boundaries, safer defaults, and explainable product behavior"
      description="This page translates the application architecture into trust language: profile-aware access, structured records, AI safety framing, privacy posture, and operational resilience."
      stats={[
        { value: "Profile-aware", label: "Context stays attached to the right person" },
        { value: "AI-assisted", label: "Informational, never a substitute for care" },
        { value: "Exportable", label: "Users can move data where needed" },
        { value: "Resilient", label: "Modular frontend and service boundaries" },
      ]}
      sectionLinks={[
        { href: "#security", label: "Security" },
        { href: "#privacy", label: "Privacy" },
        { href: "#ai-safety", label: "AI safety" },
        { href: "#governance", label: "Governance" },
      ]}
      heroAside={
        <div className="marketing-preview-stack">
          <div className="marketing-preview-card marketing-preview-card-wide">
            <span>Trust framework</span>
            <strong>Profile boundaries, safe messaging, exportable records, operational clarity</strong>
          </div>
          <div className="marketing-preview-grid">
            {[Shield, Lock, Bot, Users].map((Icon, index) => (
              <div key={index} className="marketing-preview-card">
                <Icon size={16} />
                <span>Layer {index + 1}</span>
              </div>
            ))}
          </div>
        </div>
      }
    >
      <SectionBlock
        id="security"
        eyebrow="Section 01"
        title="Security starts with clean context boundaries"
        body="The product architecture separates page responsibilities, guards authenticated routes, and keeps user actions tied to explicit profile and feature contexts."
      >
        <div className="marketing-grid marketing-grid-2">
          {trustHighlights.map((item) => (
            <FeatureCard key={item.title} {...item} />
          ))}
        </div>
      </SectionBlock>

      <SectionBlock
        id="privacy"
        eyebrow="Section 02"
        title="Privacy is a product behavior, not just a policy PDF"
        body="A health platform earns trust when the interface reinforces who the data belongs to, what AI is doing, and how records move between workflows."
      >
        <StoryBand
          items={[
            { title: "Visible ownership", body: "Profile switching makes it clear whose records are currently active.", tone: "lavender" },
            { title: "Intentional sharing", body: "Care-circle and export routes imply deliberate action rather than silent leakage.", tone: "mint" },
            { title: "High-sensitivity framing", body: "Documents, labs, medications, and emergency data are consistently treated as critical surfaces.", tone: "sky" },
          ]}
        />
      </SectionBlock>

      <SectionBlock
        id="ai-safety"
        eyebrow="Section 03"
        title="AI is framed as decision support, not authority"
        body="HealthFlux uses assistant, OCR, summaries, reports, and coaching flows to improve understanding. The app should still clearly route serious concerns toward medical professionals."
      >
        <div className="marketing-grid marketing-grid-3">
          {[
            { title: "Assistant boundaries", body: "The assistant references available records and explains them, but should never posture as definitive medical care.", icon: Bot, tone: "lemon" },
            { title: "Triage signaling", body: "Urgency states, symptom flows, and telehealth paths reduce the chance of AI becoming the final stop.", icon: Stethoscope, tone: "peach" },
            { title: "Explainability over magic", body: "The app is strongest when it shows why it surfaced a signal or recommendation.", icon: ShieldCheck, tone: "mint" },
          ].map((item) => (
            <FeatureCard key={item.title} {...item} />
          ))}
        </div>
      </SectionBlock>

      <SectionBlock
        id="governance"
        eyebrow="Section 04"
        title="Operational governance matters as much as feature count"
        body="The current product uses modular routes, service files, overlay primitives, and hub segmentation to keep the system governable as it expands."
        action={<Link to={createPageUrl("DevDocs")} className="marketing-text-link">Open developer docs</Link>}
      >
        <StatRow
          items={[
            { value: "Modular pages", label: "Product growth without one giant screen" },
            { value: "Shared overlays", label: "Consistent mobile interaction rules" },
            { value: "Entity-backed services", label: "Predictable domain boundaries" },
            { value: "Feature gating", label: "Controlled plan and rollout exposure" },
          ]}
        />
      </SectionBlock>

      <section className="marketing-section">
        <CTABanner
          title="Trust is strongest when product, docs, and rollout all agree"
          body="The next step is understanding how the application is packaged, shipped, and implemented across the updated public site."
          primary={<Link to={createPageUrl("Pricing")} className="marketing-primary-button">Pricing and rollout</Link>}
          secondary={<Link to={createPageUrl("Terms")} className="marketing-secondary-button">Read legal terms</Link>}
        />
      </section>
    </MarketingShell>
  );
}

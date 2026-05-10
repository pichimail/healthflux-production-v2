import React from "react";
import { Link } from "react-router-dom";
import {
  Bot,
  Lock,
  Shield,
  ShieldCheck,
  Stethoscope,
  Users,
} from "lucide-react";
import MarketingShell from "@/components/marketing/MarketingShell";
import { CTABanner, FeatureCard, SectionBlock, StatRow, StoryBand } from "@/components/marketing/MarketingBlocks";
import { trustHighlights } from "@/components/marketing/marketing-data";
import { createPageUrl } from "@/utils";

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

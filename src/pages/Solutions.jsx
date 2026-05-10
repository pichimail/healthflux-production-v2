import React from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  Brain,
  Building2,
  HeartHandshake,
  Pill,
  Shield,
  Stethoscope,
  Users,
} from "lucide-react";
import MarketingShell from "@/components/marketing/MarketingShell";
import { CTABanner, FeatureCard, SectionBlock, StatRow, StoryBand } from "@/components/marketing/MarketingBlocks";
import { createPageUrl } from "@/utils";

export default function Solutions() {
  return (
    <MarketingShell
      currentPage="Solutions"
      heroTone="mint"
      eyebrow="Solution stories"
      title="HealthFlux is designed around specific operating models, not generic feature lists"
      description="The same core application serves different jobs: self-management, caregiver support, clinical preparation, and admin/ops visibility. This page explains those solution paths."
      stats={[
        { value: "Patients", label: "Daily understanding and habit support" },
        { value: "Families", label: "Shared visibility across profiles" },
        { value: "Clinicians", label: "Cleaner summaries and exports" },
        { value: "Teams", label: "Admin and telemetry surfaces" },
      ]}
      sectionLinks={[
        { href: "#patient", label: "Patient" },
        { href: "#care-models", label: "Caregiver" },
        { href: "#clinical", label: "Clinical" },
        { href: "#outcomes", label: "Outcomes" },
      ]}
      heroAside={
        <div className="marketing-preview-stack">
          <div className="marketing-preview-card marketing-preview-card-wide">
            <span>Solution coverage</span>
            <strong>Individual care, family coordination, provider prep, admin oversight</strong>
          </div>
          <div className="marketing-preview-grid">
            {[Users, HeartHandshake, Stethoscope, Building2].map((Icon, index) => (
              <div key={index} className="marketing-preview-card">
                <Icon size={16} />
                <span>Flow {index + 1}</span>
              </div>
            ))}
          </div>
        </div>
      }
    >
      <SectionBlock
        id="patient"
        eyebrow="Section 01"
        title="For patients: reduce ambiguity and keep next actions obvious"
        body="The patient experience is built around visibility. Users can see what changed, what matters, and what to do next without interpreting raw records alone."
      >
        <div className="marketing-grid marketing-grid-3">
          {[
            { title: "Know your current state", body: "Vitals, labs, adherence, meals, and goals are visible in one environment.", icon: Activity, tone: "lemon" },
            { title: "Understand with guidance", body: "AI assistant, insights, and reports explain patterns in accessible language.", icon: Brain, tone: "lavender" },
            { title: "Stay on plan", body: "Medication reminders, goals, streaks, and nutrition flows support follow-through.", icon: Pill, tone: "peach" },
          ].map((item) => (
            <FeatureCard key={item.title} {...item} />
          ))}
        </div>
      </SectionBlock>

      <SectionBlock
        id="care-models"
        eyebrow="Section 02"
        title="For families and caregivers: coordinate without losing profile boundaries"
        body="Family care is not a shared spreadsheet problem. HealthFlux treats each person as a distinct profile while making switching and oversight efficient."
      >
        <StoryBand
          items={[
            {
              title: "Switch profiles quickly",
              body: "One account can move between self, parents, children, and dependents with clear context switching.",
              tone: "mint",
            },
            {
              title: "Preserve record clarity",
              body: "Documents, meds, vitals, and goals stay associated with the right person instead of mixing into one feed.",
              tone: "sky",
            },
            {
              title: "Share responsibilities",
              body: "Care circle and export flows make it easier to coordinate with siblings, partners, or providers.",
              tone: "lavender",
            },
          ]}
        />
      </SectionBlock>

      <SectionBlock
        id="clinical"
        eyebrow="Section 03"
        title="For providers and clinical workflows: make handoffs cleaner"
        body="The application is not an EHR, but it is built to prepare better conversations and cleaner health summaries before escalation into clinical care."
      >
        <div className="marketing-grid marketing-grid-2">
          {[
            { title: "Telehealth readiness", body: "Users can move from self-monitoring to virtual consultations when the data suggests they should.", icon: Stethoscope, tone: "peach" },
            { title: "Exportable summaries", body: "AI reports and structured record exports reduce friction before doctor visits.", icon: Shield, tone: "lemon" },
            { title: "Medication review context", body: "Current regimens, OCR-extracted details, and adherence history become easier to review.", icon: Pill, tone: "rose" },
            { title: "Trend-based explanation", body: "The value is not a single reading but the narrative across measurements over time.", icon: Activity, tone: "sky" },
          ].map((item) => (
            <FeatureCard key={item.title} {...item} />
          ))}
        </div>
      </SectionBlock>

      <SectionBlock
        id="outcomes"
        eyebrow="Section 04"
        title="The solution value is operational, not cosmetic"
        body="Better UI matters, but the deeper win is lower coordination overhead, more interpretable health history, and faster movement from signal to action."
        action={<Link to={createPageUrl("DevDocs")} className="marketing-text-link">See how the app is structured</Link>}
      >
        <StatRow
          items={[
            { value: "Less re-entry", label: "OCR, AI fills, and structured forms" },
            { value: "Faster understanding", label: "Summaries over raw PDFs and isolated values" },
            { value: "Cleaner care handoff", label: "Exports, reports, and telehealth routing" },
            { value: "Higher continuity", label: "One record spine across the application" },
          ]}
        />
      </SectionBlock>

      <section className="marketing-section">
        <CTABanner
          title="If the solution model fits, the next question is trust and rollout"
          body="The adjacent pages explain how the product approaches security, privacy, AI safety, implementation, and commercial packaging."
          primary={<Link to={createPageUrl("TrustCenter")} className="marketing-primary-button">Trust center</Link>}
          secondary={<Link to={createPageUrl("Pricing")} className="marketing-secondary-button">Pricing and rollout</Link>}
        />
      </section>
    </MarketingShell>
  );
}

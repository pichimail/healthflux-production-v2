import React from "react";
import { Link } from "react-router-dom";
import MarketingShell from "@/components/marketing/MarketingShell";
import { CTABanner, SectionBlock } from "@/components/marketing/MarketingBlocks";
import { createPageUrl } from "@/utils";

const sections = [
  {
    id: "scope",
    eyebrow: "Section 01",
    title: "Scope of service",
    body: "HealthFlux is a personal health platform for records, reminders, AI summaries, and care coordination. It is not a replacement for licensed medical diagnosis or emergency care.",
  },
  {
    id: "accounts",
    eyebrow: "Section 02",
    title: "Accounts, profiles, and data responsibility",
    body: "Users are responsible for account security, profile accuracy, and appropriate use of shared family or caregiver access. Profile context should reflect the real person whose data is being managed.",
  },
  {
    id: "ai",
    eyebrow: "Section 03",
    title: "AI-generated content disclaimer",
    body: "AI assistant, OCR, reports, and summaries are informational. They may be incomplete or mistaken, and must not be treated as a substitute for qualified medical advice.",
  },
  {
    id: "limits",
    eyebrow: "Section 04",
    title: "Operational limits and acceptable use",
    body: "Users may not misuse the service, access systems without permission, or depend on the platform as the sole source of care in urgent situations. Severe or emergency concerns should be escalated immediately.",
  },
];

export default function Terms() {
  return (
    <MarketingShell
      currentPage="Terms"
      heroTone="peach"
      eyebrow="Terms of service"
      title="Terms that match the product as it exists today"
      description="This summary explains the basic legal and operational expectations for using HealthFlux. It reflects the application’s current role as a health operating system with AI support, not a clinical authority."
      stats={[
        { value: "Informational AI", label: "Not medical advice" },
        { value: "Profile-based use", label: "Keep account context accurate" },
        { value: "Shared care possible", label: "With deliberate user action" },
        { value: "Emergency escalation", label: "Always outside the app" },
      ]}
      sectionLinks={sections.map((section) => ({ href: `#${section.id}`, label: section.title }))}
      heroAside={
        <div className="marketing-preview-stack">
          <div className="marketing-preview-card marketing-preview-card-wide">
            <span>Important note</span>
            <strong>HealthFlux supports health understanding and organization. It does not replace professional medical judgment.</strong>
          </div>
        </div>
      }
    >
      {sections.map((section) => (
        <SectionBlock key={section.id} {...section}>
          <div className="marketing-faq-card">
            <p>{section.body}</p>
          </div>
        </SectionBlock>
      ))}

      <section className="marketing-section">
        <CTABanner
          title="Use the legal pages together with privacy and trust guidance"
          body="The best understanding of HealthFlux comes from reading the trust, privacy, and product pages together, because the platform’s safety depends on all three."
          primary={<Link to={createPageUrl("Privacy")} className="marketing-primary-button">Privacy policy</Link>}
          secondary={<Link to={createPageUrl("TrustCenter")} className="marketing-secondary-button">Trust center</Link>}
        />
      </section>
    </MarketingShell>
  );
}

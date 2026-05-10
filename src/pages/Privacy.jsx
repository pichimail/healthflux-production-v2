import React from "react";
import { Link } from "react-router-dom";
import MarketingShell from "@/components/marketing/MarketingShell";
import { CTABanner, SectionBlock } from "@/components/marketing/MarketingBlocks";
import { createPageUrl } from "@/utils";

const sections = [
  {
    id: "collection",
    eyebrow: "Section 01",
    title: "What data the platform handles",
    body: "HealthFlux may process account details, profile information, vitals, medications, labs, uploaded documents, goals, nutrition logs, and product interaction data required to run the application.",
  },
  {
    id: "usage",
    eyebrow: "Section 02",
    title: "Why the data is used",
    body: "The platform uses this information to support recordkeeping, reminders, AI explanations, OCR extraction, reporting, wellness workflows, and care coordination. It is not intended for ad targeting.",
  },
  {
    id: "sharing",
    eyebrow: "Section 03",
    title: "How sharing should be understood",
    body: "Data sharing should happen through explicit user actions such as exports, telehealth flows, or caregiver access. The product is designed so these moments are visible rather than hidden.",
  },
  {
    id: "rights",
    eyebrow: "Section 04",
    title: "User rights and control",
    body: "Users should be able to access, manage, correct, and export their health information. Privacy expectations should remain aligned with the product’s multi-profile and family-care use cases.",
  },
];

export default function Privacy() {
  return (
    <MarketingShell
      currentPage="Privacy"
      heroTone="mint"
      eyebrow="Privacy policy"
      title="Privacy framed around how health data actually moves through the application"
      description="This summary explains HealthFlux privacy expectations in product terms: profile ownership, high-sensitivity records, AI processing boundaries, and explicit user-controlled sharing."
      stats={[
        { value: "Health records", label: "High-sensitivity data handling" },
        { value: "Explicit exports", label: "Sharing should be visible" },
        { value: "Family-aware", label: "Multi-profile privacy matters" },
        { value: "No ad posture", label: "Health context is not for advertising" },
      ]}
      sectionLinks={sections.map((section) => ({ href: `#${section.id}`, label: section.title }))}
      heroAside={
        <div className="marketing-preview-stack">
          <div className="marketing-preview-card marketing-preview-card-wide">
            <span>Privacy stance</span>
            <strong>The application should make health-data ownership and movement legible at every critical workflow edge.</strong>
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
          title="Read privacy in context with product design and trust architecture"
          body="The current public site now connects privacy language directly to the way the application is structured and used."
          primary={<Link to={createPageUrl("Terms")} className="marketing-primary-button">Terms of service</Link>}
          secondary={<Link to={createPageUrl("DevDocs")} className="marketing-secondary-button">Developer docs</Link>}
        />
      </section>
    </MarketingShell>
  );
}

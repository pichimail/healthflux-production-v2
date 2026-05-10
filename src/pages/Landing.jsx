import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Brain,
  FileText,
  HeartPulse,
  Pill,
} from "lucide-react";
import MarketingShell from "@/components/marketing/MarketingShell";
import {
  CTABanner,
  FeatureCard,
  SectionBlock,
  StatRow,
  StoryBand,
} from "@/components/marketing/MarketingBlocks";
import {
  featureHighlights,
  problemBlocks,
  productModules,
  rolloutStats,
} from "@/components/marketing/marketing-data";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";

export default function Landing() {
  const [isAuthed, setIsAuthed] = useState(false);
  useEffect(() => {
    base44.auth.isAuthenticated().then(setIsAuthed).catch(() => {});
  }, []);

  return (
    <MarketingShell
      currentPage="Landing"
      heroTone="lemon"
      eyebrow="HealthFlux website rebooted for the current product"
      title="A premium health operating system for patients, families, and care teams"
      description="HealthFlux now brings vitals, medication workflows, AI guidance, medical document intelligence, labs, wellness, nutrition, family profiles, and telehealth into one explainable, pastel-first experience."
      stats={rolloutStats}
      sectionLinks={[
        { href: "#problem", label: "The problem" },
        { href: "#platform-map", label: "Platform map" },
        { href: "#release-story", label: "Release story" },
        { href: "#next-step", label: "Next step" },
      ]}
      heroAside={
        <div className="marketing-preview-stack">
          <div className="marketing-preview-card marketing-preview-card-wide">
            <span>Updated product surface</span>
            <strong>5 hubs, 12+ workflows, AI + OCR + family coordination</strong>
          </div>
          <div className="marketing-preview-grid">
            {[
              { icon: HeartPulse, label: "Vitals" },
              { icon: Pill, label: "Meds" },
              { icon: FileText, label: "Docs" },
              { icon: Brain, label: "AI" },
            ].map((item) => (
              <div key={item.label} className="marketing-preview-card">
                <item.icon size={16} />
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      }
    >
      <SectionBlock
        id="problem"
        eyebrow="Section 01"
        title="The product solves the real fragmentation problem, not just one isolated task"
        body="Most health products do one thing well and then force the user to bridge everything else manually. HealthFlux is built around continuity of context."
      >
        <div className="marketing-grid marketing-grid-3">
          {problemBlocks.map((item) => (
            <FeatureCard key={item.title} {...item} to={`${createPageUrl("Solutions")}#care-models`} label="See the solution model" />
          ))}
        </div>
      </SectionBlock>

      <SectionBlock
        id="platform-map"
        eyebrow="Section 02"
        title="One application, multiple coordinated surfaces"
        body="The update expands HealthFlux into a connected product family instead of a single dashboard. Each hub keeps its own focus while sharing the same patient context."
        action={<Link to={createPageUrl("Platform")} className="marketing-text-link">Explore the full platform</Link>}
      >
        <div className="marketing-grid marketing-grid-2">
          {productModules.map((item) => (
            <FeatureCard key={item.title} {...item} to={createPageUrl("Platform")} label="Open platform page" />
          ))}
        </div>
      </SectionBlock>

      <SectionBlock
        id="release-story"
        eyebrow="Section 03"
        title="What the latest build now includes"
        body="The current release combines patient utility, caregiver coordination, AI assistance, and operational admin surfaces in one coherent system."
      >
        <div className="marketing-grid marketing-grid-3">
          {featureHighlights.map((item) => (
            <FeatureCard
              key={item.title}
              {...item}
              body="Deep workflow coverage with mobile-first interactions, actionable states, and linked records."
              to={createPageUrl("Platform")}
            />
          ))}
        </div>
      </SectionBlock>

      <SectionBlock
        id="proof"
        eyebrow="Section 04"
        title="The experience is designed around real journeys"
        body="The application supports the end-to-end flow from first capture to explanation, reminders, care coordination, and longitudinal review."
      >
        <StoryBand
          items={[
            {
              title: "Capture",
              body: "Scan prescriptions, upload reports, log a meal, or measure heart rate directly from a mobile-first flow.",
              tone: "lemon",
            },
            {
              title: "Understand",
              body: "AI summarises records, explains risk patterns, and turns isolated health events into a readable narrative.",
              tone: "lavender",
            },
            {
              title: "Act",
              body: "Users set goals, follow reminders, export reports, book telehealth support, or share context with caregivers.",
              tone: "mint",
            },
          ]}
        />
        <StatRow
          items={[
            { value: "Vitals + Labs", label: "Structured measurement history" },
            { value: "AI + OCR", label: "Data interpretation layer" },
            { value: "Family profiles", label: "Caregiver-ready architecture" },
            { value: "Pastel mobile UI", label: "High-clarity visual system" },
          ]}
        />
      </SectionBlock>

      <section id="next-step" className="marketing-section">
        <CTABanner
          title="Move from brochureware health apps to one connected operating layer"
          body="Use the website to understand the full product, then drop into the actual application flows from the same system."
          primary={
            isAuthed ? (
              <Link to={createPageUrl("Dashboard")} className="marketing-primary-button">
                Go to Dashboard
              </Link>
            ) : (
              <button onClick={() => base44.auth.redirectToLogin('/onboarding')} className="marketing-primary-button">
                Get Started
              </button>
            )
          }
          secondary={
            <Link to={createPageUrl("DevDocs")} className="marketing-secondary-button">
              Read implementation docs
            </Link>
          }
        />
      </section>
    </MarketingShell>
  );
}
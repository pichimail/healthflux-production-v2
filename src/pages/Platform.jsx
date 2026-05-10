import React from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  BellRing,
  Brain,
  FileText,
  HeartPulse,
  Leaf,
  Pill,
  ScanSearch,
  Stethoscope,
  TestTube2,
  Users,
  Workflow,
} from "lucide-react";
import MarketingShell from "@/components/marketing/MarketingShell";
import { CTABanner, FeatureCard, SectionBlock, StoryBand } from "@/components/marketing/MarketingBlocks";
import { createPageUrl } from "@/utils";

const workflowCards = [
  {
    title: "Health Hub depth",
    body: "Vitals, medications, documents, labs, trends, and nutrition all stay linked through the same profile context.",
    icon: Activity,
    tone: "lemon",
  },
  {
    title: "AI Hub orchestration",
    body: "Assistant, coach, reports, imaging, and diet planning turn record history into interpretable guidance.",
    icon: Brain,
    tone: "lavender",
  },
  {
    title: "Wellness and care loop",
    body: "Goals, streaks, rewards, care circle flows, emergency access, and telehealth turn insights into follow-through.",
    icon: Leaf,
    tone: "mint",
  },
];

export default function Platform() {
  return (
    <MarketingShell
      currentPage="Platform"
      heroTone="lavender"
      eyebrow="Platform architecture"
      title="Every feature in the application is now legible as part of one coordinated platform"
      description="The updated website maps how each product area works together: capture data, interpret it with AI, route the user into action, and keep every downstream workflow connected."
      stats={[
        { value: "Health Hub", label: "Vitals, meds, docs, labs, nutrition" },
        { value: "AI Hub", label: "Assistant, coach, reports, imaging" },
        { value: "Wellness Hub", label: "Goals, rewards, care circle" },
        { value: "Care Hub", label: "Telehealth, emergency, ABHA" },
      ]}
      sectionLinks={[
        { href: "#hubs", label: "Hubs" },
        { href: "#flows", label: "Flows" },
        { href: "#signals", label: "Signals" },
        { href: "#activation", label: "Activation" },
      ]}
      heroAside={
        <div className="marketing-preview-stack">
          <div className="marketing-preview-card marketing-preview-card-wide">
            <span>Connected product map</span>
            <strong>Capture → analyze → decide → track → share</strong>
          </div>
          <div className="marketing-preview-grid">
            {[Activity, Brain, Leaf, Stethoscope].map((Icon, index) => (
              <div key={index} className="marketing-preview-card">
                <Icon size={16} />
                <span>Hub {index + 1}</span>
              </div>
            ))}
          </div>
        </div>
      }
    >
      <SectionBlock
        id="hubs"
        eyebrow="Section 01"
        title="The hub model keeps complexity understandable"
        body="Users are not dropped into one overloaded mega-dashboard. The app is intentionally segmented into hubs with strong thematic boundaries."
      >
        <div className="marketing-grid marketing-grid-3">
          {workflowCards.map((item) => (
            <FeatureCard key={item.title} {...item} />
          ))}
        </div>
      </SectionBlock>

      <SectionBlock
        id="flows"
        eyebrow="Section 02"
        title="Capture workflows are designed for real mobile behavior"
        body="The product now supports scanning, uploading, measuring, logging, and manual entry in ways that reduce friction rather than increasing it."
      >
        <div className="marketing-grid marketing-grid-3">
          {[
            { title: "Heart rate camera flow", body: "Measure, review, and save readings directly into vitals history.", icon: HeartPulse, tone: "rose" },
            { title: "Prescription OCR", body: "Scan or upload medication images, extract details, then review before saving.", icon: Pill, tone: "peach" },
            { title: "Document ingestion", body: "Upload reports and let the app parse provider details, labs, meds, and summaries.", icon: FileText, tone: "sky" },
            { title: "Meal image analysis", body: "Use photo-driven nutrition logging alongside manual macro entry.", icon: ScanSearch, tone: "lemon" },
            { title: "Lab result entry", body: "Track structured values, reference ranges, and abnormal flags for trend visibility.", icon: TestTube2, tone: "mint" },
            { title: "Goal logging", body: "Translate daily effort into streaks, progress, and weekly reports.", icon: BellRing, tone: "lavender" },
          ].map((item) => (
            <FeatureCard key={item.title} {...item} />
          ))}
        </div>
      </SectionBlock>

      <SectionBlock
        id="signals"
        eyebrow="Section 03"
        title="Signals become useful only when the app can relate them"
        body="The value is not just storing data. It is in connecting vitals, medications, documents, labs, wellness targets, and AI narratives into one interpretive layer."
      >
        <StoryBand
          items={[
            {
              title: "Reference historical trends",
              body: "Trend cards, abnormal flags, adherence history, and daily targets keep each measurement in context.",
              tone: "sky",
            },
            {
              title: "Explain with AI",
              body: "The assistant, coach, insights, and reports surfaces convert raw records into actionable reading.",
              tone: "lavender",
            },
            {
              title: "Route to action",
              body: "Users can move from an insight into wellness goals, telehealth, exports, or document review without losing context.",
              tone: "mint",
            },
          ]}
        />
      </SectionBlock>

      <SectionBlock
        id="activation"
        eyebrow="Section 04"
        title="The platform is built for activation, not passive storage"
        body="Every product area pushes toward a next action: measure again, log a medication, upload evidence, contact care, or close the loop with a goal."
        action={<Link to={createPageUrl("Solutions")} className="marketing-text-link">See solution journeys</Link>}
      >
        <div className="marketing-grid marketing-grid-2">
          {[
            { title: "Patient self-management", body: "Daily decisions become easier when the product keeps a current view of health status.", icon: Users, tone: "lemon" },
            { title: "Caregiver coordination", body: "Family profiles and care-circle features help one account manage multiple people responsibly.", icon: Users, tone: "mint" },
            { title: "Clinical handoff readiness", body: "Exports, summaries, and telehealth support make the data portable when outside care is required.", icon: Stethoscope, tone: "peach" },
            { title: "Operational continuity", body: "The application structure keeps the next step visible instead of hiding it behind deep navigation.", icon: Workflow, tone: "lavender" },
          ].map((item) => (
            <FeatureCard key={item.title} {...item} />
          ))}
        </div>
      </SectionBlock>

      <section className="marketing-section">
        <CTABanner
          title="Open the product map, then dive into trust, pricing, or implementation"
          body="The platform page is the center of the new website, but every adjacent page expands one of the critical decision layers."
          primary={<Link to={createPageUrl("TrustCenter")} className="marketing-primary-button">Review trust architecture</Link>}
          secondary={<Link to={createPageUrl("Pricing")} className="marketing-secondary-button">See pricing and rollout</Link>}
        />
      </section>
    </MarketingShell>
  );
}

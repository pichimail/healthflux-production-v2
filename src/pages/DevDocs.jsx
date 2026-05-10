import React from "react";
import { Link } from "react-router-dom";
import {
  Blocks,
  Database,
  FileCode2,
  GitBranchPlus,
  LayoutPanelTop,
  ScanText,
  ShieldCheck,
  Workflow,
} from "lucide-react";
import MarketingShell from "@/components/marketing/MarketingShell";
import { CTABanner, FeatureCard, SectionBlock, StoryBand } from "@/components/marketing/MarketingBlocks";
import { developerPillars } from "@/components/marketing/marketing-data";
import { createPageUrl } from "@/utils";

export default function DevDocs() {
  return (
    <MarketingShell
      currentPage="DevDocs"
      heroTone="sky"
      eyebrow="Developer documentation"
      title="Separate dev docs for the application, public-site rebuild, and product architecture"
      description="This page documents how the current HealthFlux app is organized so designers, frontend developers, and product owners can reason about what was built and how the new website maps onto it."
      stats={[
        { value: "Public routes", label: "Marketing website and docs" },
        { value: "Authenticated hubs", label: "Health, AI, wellness, care, account" },
        { value: "Shared overlays", label: "Bottom sheets, dialogs, mobile UX" },
        { value: "Entity services", label: "Vitals, labs, meds, docs, goals" },
      ]}
      sectionLinks={[
        { href: "#architecture", label: "Architecture" },
        { href: "#domains", label: "Domains" },
        { href: "#frontend-system", label: "Frontend system" },
        { href: "#release-notes", label: "Release notes" },
      ]}
      heroAside={
        <div className="marketing-preview-stack">
          <div className="marketing-preview-card marketing-preview-card-wide">
            <span>Documentation focus</span>
            <strong>Routes, components, domains, UI system, release workflow</strong>
          </div>
          <div className="marketing-preview-grid">
            {[LayoutPanelTop, Blocks, Database, GitBranchPlus].map((Icon, index) => (
              <div key={index} className="marketing-preview-card">
                <Icon size={16} />
                <span>Doc {index + 1}</span>
              </div>
            ))}
          </div>
        </div>
      }
    >
      <SectionBlock
        id="architecture"
        eyebrow="Section 01"
        title="Application architecture overview"
        body="The codebase is a React + Vite application with a route registry, layout shell, feature hubs, and shared UI primitives. Public pages are now separated from authenticated product surfaces."
      >
        <div className="marketing-grid marketing-grid-2">
          {developerPillars.map((item) => (
            <FeatureCard key={item.title} {...item} />
          ))}
        </div>
      </SectionBlock>

      <SectionBlock
        id="domains"
        eyebrow="Section 02"
        title="Core domain map"
        body="The app is organized around domain entities and pages rather than generic tabs alone. Each domain has its own workflow surface, supporting services, and increasingly shared AI touchpoints."
      >
        <div className="marketing-grid marketing-grid-3">
          {[
            { title: "Vitals domain", body: "Manual logs, camera heart-rate capture, trends, and dashboard integration.", icon: Workflow, tone: "rose" },
            { title: "Medication domain", body: "Add/edit flows, reminder schedules, OCR extraction, adherence, and interaction checks.", icon: ScanText, tone: "peach" },
            { title: "Document domain", body: "Upload, processing, extraction, review, and downstream health insight generation.", icon: FileCode2, tone: "sky" },
            { title: "Lab domain", body: "Structured entry, flags, trend visualization, and abnormal-range surfacing.", icon: Database, tone: "mint" },
            { title: "Wellness domain", body: "Goals, logs, streaks, rewards, AI feedback, and health-platform sync.", icon: ShieldCheck, tone: "lemon" },
            { title: "Public-site domain", body: "Landing, platform, solution, trust, pricing, and docs pages share one marketing shell.", icon: LayoutPanelTop, tone: "lavender" },
          ].map((item) => (
            <FeatureCard key={item.title} {...item} />
          ))}
        </div>
      </SectionBlock>

      <SectionBlock
        id="frontend-system"
        eyebrow="Section 03"
        title="Frontend system notes"
        body="The rebuild uses a shared marketing shell, reusable section blocks, hover-responsive cards, pastel tone tokens, and independent public-site styling so the product shell remains intact."
      >
        <StoryBand
          items={[
            { title: "Shared marketing shell", body: "A common nav, hero, footer, and background system keeps all public pages consistent.", tone: "sky" },
            { title: "Reusable block kit", body: "Section headings, CTA bands, stat rows, story rails, and feature cards reduce design drift.", tone: "mint" },
            { title: "Route isolation", body: "Public pages are explicitly treated as no-layout routes so the authenticated app chrome never leaks into marketing.", tone: "lavender" },
          ]}
        />
      </SectionBlock>

      <SectionBlock
        id="release-notes"
        eyebrow="Section 04"
        title="Current website rebuild release notes"
        body="The previous landing page has been replaced with a full multi-page public site. Branding, favicons, manifest, page routing, and developer docs have all been refreshed together."
      >
        <div className="marketing-faq-stack">
          {[
            ["What changed?", "A one-page landing file was replaced by a public-site system with multiple routes, shared branding, richer navigation, and deeper product storytelling."],
            ["Why isolate the public site?", "Because authenticated product layout and marketing UX serve different jobs. The new structure avoids cross-contaminating app chrome and public pages."],
            ["How should future updates land?", "Add new public pages through the same marketing shell, update route registration, and keep product descriptions aligned with live application behavior."],
            ["Where do legal pages fit?", "Terms and privacy remain public routes and should be kept visually consistent with the marketing system."],
          ].map(([question, answer]) => (
            <div key={question} className="marketing-faq-card">
              <h3>{question}</h3>
              <p>{answer}</p>
            </div>
          ))}
        </div>
      </SectionBlock>

      <section className="marketing-section">
        <CTABanner
          title="Use the docs to navigate the product and the new website together"
          body="The docs page is intentionally public so design, product, and engineering stakeholders can discuss the current system from the same reference point."
          primary={<Link to={createPageUrl("Landing")} className="marketing-primary-button">Back to website</Link>}
          secondary={<Link to={createPageUrl("Dashboard")} className="marketing-secondary-button">Open product app</Link>}
        />
      </section>
    </MarketingShell>
  );
}

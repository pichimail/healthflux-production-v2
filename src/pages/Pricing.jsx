import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, Headset, Rocket, WandSparkles } from "lucide-react";
import MarketingShell from "@/components/marketing/MarketingShell";
import { CTABanner, SectionBlock, StoryBand } from "@/components/marketing/MarketingBlocks";
import { marketingTones, pricingTiers } from "@/components/marketing/marketing-data";
import { createPageUrl } from "@/utils";

export default function Pricing() {
  return (
    <MarketingShell
      currentPage="Pricing"
      heroTone="peach"
      eyebrow="Pricing and rollout"
      title="Commercial packaging built around how the product is actually used"
      description="Pricing is not presented as random buckets. It reflects the product’s maturity across self-tracking, AI-supported care, family coordination, and implementation depth."
      stats={[
        { value: "Starter", label: "Evaluate the experience" },
        { value: "Care Pro", label: "Use AI and health workflows deeply" },
        { value: "Family Grid", label: "Coordinate across multiple profiles" },
        { value: "Docs + rollout", label: "Support implementation decisions" },
      ]}
      sectionLinks={[
        { href: "#plans", label: "Plans" },
        { href: "#packages", label: "Packages" },
        { href: "#support", label: "Support" },
        { href: "#faq", label: "FAQ" },
      ]}
      heroAside={
        <div className="marketing-preview-stack">
          <div className="marketing-preview-card marketing-preview-card-wide">
            <span>Commercial framing</span>
            <strong>Try → adopt → scale → coordinate</strong>
          </div>
          <div className="marketing-preview-grid">
            {[Rocket, WandSparkles, Headset, Check].map((Icon, index) => (
              <div key={index} className="marketing-preview-card">
                <Icon size={16} />
                <span>Tier {index + 1}</span>
              </div>
            ))}
          </div>
        </div>
      }
    >
      <SectionBlock
        id="plans"
        eyebrow="Section 01"
        title="Three plans cover the main use modes"
        body="The current product does enough that the website needs to explain why someone would choose each tier, not just what features happen to be toggled."
      >
        <div className="marketing-pricing-grid">
          {pricingTiers.map((plan) => {
            const palette = marketingTones[plan.tone];
            return (
              <article
                key={plan.name}
                className="marketing-price-card"
                style={{
                  background: plan.featured ? "rgba(255,255,255,0.96)" : "rgba(255,255,255,0.88)",
                  borderColor: plan.featured ? palette.solid : "rgba(15,23,42,0.08)",
                  boxShadow: plan.featured ? `0 26px 60px ${palette.soft}` : "0 20px 48px rgba(15,23,42,0.08)",
                }}
              >
                <span className="marketing-plan-badge" style={{ background: palette.soft, color: palette.text }}>
                  {plan.featured ? "Recommended" : "Plan"}
                </span>
                <h3>{plan.name}</h3>
                <div className="marketing-price-row">
                  <strong>{plan.price}</strong>
                  <span>{plan.period}</span>
                </div>
                <p>{plan.summary}</p>
                <ul className="marketing-plan-list">
                  {plan.features.map((item) => (
                    <li key={item}>
                      <Check size={14} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <Link to={createPageUrl("Onboarding")} className="marketing-primary-button">
                  Choose {plan.name}
                </Link>
              </article>
            );
          })}
        </div>
      </SectionBlock>

      <SectionBlock
        id="packages"
        eyebrow="Section 02"
        title="Rollout packages align with the product’s growth path"
        body="The website now needs to support both marketing and practical evaluation, so this page explains where each commercial step fits in adoption."
      >
        <StoryBand
          items={[
            { title: "Try the surface", body: "Start with starter-grade onboarding to understand the record system, AI layer, and mobile interactions.", tone: "mint" },
            { title: "Run the workflows", body: "Move to Care Pro when OCR, AI summaries, nutrition, exports, and structured tracking become everyday tools.", tone: "lemon" },
            { title: "Scale coordination", body: "Family Grid is built for multi-profile households and caregivers managing repeated routines.", tone: "lavender" },
          ]}
        />
      </SectionBlock>

      <SectionBlock
        id="support"
        eyebrow="Section 03"
        title="Support is product guidance, not just ticket handling"
        body="The platform is broad enough that onboarding, data understanding, and workflow adoption matter as much as pure bug support."
      >
        <div className="marketing-grid marketing-grid-3">
          {[
            { title: "Onboarding support", body: "Help users set up profiles, documents, meds, and first goals correctly.", icon: Rocket, tone: "sky" },
            { title: "Feature guidance", body: "Explain when to use AI assistant, AI reports, OCR, and telehealth flows.", icon: WandSparkles, tone: "lavender" },
            { title: "Continuity support", body: "Keep long-term users moving smoothly as the product expands.", icon: Headset, tone: "peach" },
          ].map((item) => (
            <Link key={item.title} to={createPageUrl("DevDocs")} className="marketing-card-link">
              <div className="marketing-feature-card">
                <div className="marketing-feature-icon" style={{ background: marketingTones[item.tone].soft, color: marketingTones[item.tone].text }}>
                  <item.icon size={18} />
                </div>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
                <span className="marketing-inline-link" style={{ color: marketingTones[item.tone].text }}>
                  Read the docs <ArrowRight size={14} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </SectionBlock>

      <SectionBlock
        id="faq"
        eyebrow="Section 04"
        title="Common pricing and rollout questions"
        body="This page handles the questions a buyer or evaluator actually asks once the platform story is clear."
      >
        <div className="marketing-faq-stack">
          {[
            ["Does the free tier still show the real product?", "Yes. It should expose the product logic clearly, while leaving higher-intensity AI, coordination, and scale workflows for paid tiers."],
            ["Why have a family plan instead of just more storage?", "Because the core complexity is profile coordination, caregiver switching, and repeated daily workflows, not just document volume."],
            ["Can I evaluate before fully moving in?", "Yes. The new public-site structure is designed to help users understand the product before committing to full operational use."],
            ["Where do technical details live?", "The dedicated developer docs page explains route structure, feature organization, and implementation-level choices."],
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
          title="Move from pricing into implementation"
          body="Once the commercial framing makes sense, the next step is understanding the actual application structure and release documentation."
          primary={<Link to={createPageUrl("DevDocs")} className="marketing-primary-button">Developer docs</Link>}
          secondary={<Link to={createPageUrl("Landing")} className="marketing-secondary-button">Back to overview</Link>}
        />
      </section>
    </MarketingShell>
  );
}

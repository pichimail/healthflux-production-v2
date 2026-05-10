import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { createPageUrl } from "@/utils";
import { marketingTones } from "./marketing-data";

/**
 * @typedef {{
 *   eyebrow?: React.ReactNode,
 *   title: React.ReactNode,
 *   body?: React.ReactNode,
 *   action?: React.ReactNode,
 * }} SectionHeadingProps
 *
 * @typedef {SectionHeadingProps & {
 *   id?: string,
 *   children?: React.ReactNode,
 * }} SectionBlockProps
 *
 * @typedef {{
 *   label: React.ReactNode,
 *   value: React.ReactNode,
 * }} StatItem
 *
 * @typedef {{
 *   icon: React.ComponentType<any>,
 *   tone?: string,
 *   title: React.ReactNode,
 *   body: React.ReactNode,
 *   to?: string,
 *   label?: React.ReactNode,
 * }} FeatureCardProps
 *
 * @typedef {{
 *   title: React.ReactNode,
 *   body: React.ReactNode,
 *   tone?: string,
 * }} StoryBandItem
 *
 * @typedef {{
 *   title: React.ReactNode,
 *   body: React.ReactNode,
 *   primary?: React.ReactNode,
 *   secondary?: React.ReactNode,
 * }} CTABannerProps
 */

export function toneStyle(tone = "lemon") {
  return marketingTones[tone] || marketingTones.lemon;
}

/**
 * @param {SectionHeadingProps} props
 */
export function SectionHeading({ eyebrow, title, body, action }) {
  return (
    <div className="marketing-heading">
      {eyebrow ? <span className="marketing-eyebrow">{eyebrow}</span> : null}
      <div className="marketing-heading-row">
        <div>
          <h2>{title}</h2>
          {body ? <p>{body}</p> : null}
        </div>
        {action ? <div className="marketing-heading-action">{action}</div> : null}
      </div>
    </div>
  );
}

/**
 * @param {SectionBlockProps} props
 */
export function SectionBlock({ id, eyebrow, title, body, action, children }) {
  return (
    <section id={id} className="marketing-section">
      <SectionHeading eyebrow={eyebrow} title={title} body={body} action={action} />
      {children}
    </section>
  );
}

/**
 * @param {{ items: StatItem[] }} props
 */
export function StatRow({ items }) {
  return (
    <div className="marketing-stat-row">
      {items.map((item, index) => (
        <div key={`stat-${index}`} className="marketing-stat-card">
          <div className="marketing-stat-value">{item.value}</div>
          <div className="marketing-stat-label">{item.label}</div>
        </div>
      ))}
    </div>
  );
}

/**
 * @param {FeatureCardProps} props
 */
export function FeatureCard({ icon: Icon, tone = "lemon", title, body, to, label = "Learn more" }) {
  const palette = toneStyle(tone);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const transform = useMemo(
    () => `perspective(1000px) rotateX(${offset.y}deg) rotateY(${offset.x}deg) translateY(0px)`,
    [offset.x, offset.y]
  );

  const card = (
    <motion.article
      className="marketing-feature-card"
      whileHover={{ y: -8 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      style={{ transform }}
      onMouseMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width - 0.5) * 9;
        const y = ((event.clientY - rect.top) / rect.height - 0.5) * -9;
        setOffset({ x, y });
      }}
      onMouseLeave={() => setOffset({ x: 0, y: 0 })}
    >
      <div className="marketing-feature-icon" style={{ background: palette.soft, color: palette.text }}>
        <Icon size={18} />
      </div>
      <h3>{title}</h3>
      <p>{body}</p>
      {to ? (
        <span className="marketing-inline-link" style={{ color: palette.text }}>
          {label} <ArrowRight size={14} />
        </span>
      ) : null}
    </motion.article>
  );

  if (!to) return card;

  const href = to.startsWith("/") || to.startsWith("#") ? to : createPageUrl(to);
  const isHashOnly = to.startsWith("#");

  return isHashOnly ? (
    <a href={href} className="marketing-card-link">{card}</a>
  ) : (
    <Link to={href} className="marketing-card-link">{card}</Link>
  );
}

/**
 * @param {{ items: StoryBandItem[] }} props
 */
export function StoryBand({ items }) {
  return (
    <div className="marketing-story-band">
      {items.map((item, index) => {
        const palette = toneStyle(item.tone);
        return (
          <div key={`story-${index}`} className="marketing-story-card">
            <div className="marketing-story-index" style={{ color: palette.text }}>
              0{index + 1}
            </div>
            <h3>{item.title}</h3>
            <p>{item.body}</p>
          </div>
        );
      })}
    </div>
  );
}

/**
 * @param {CTABannerProps} props
 */
export function CTABanner({ title, body, primary, secondary }) {
  return (
    <div className="marketing-cta-banner">
      <div>
        <span className="marketing-eyebrow">Ready to explore the platform?</span>
        <h3>{title}</h3>
        <p>{body}</p>
      </div>
      <div className="marketing-cta-actions">
        {primary}
        {secondary}
      </div>
    </div>
  );
}

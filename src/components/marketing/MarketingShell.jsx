import React from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { createPageUrl } from "@/utils";
import { marketingNav, marketingTones } from "./marketing-data";

function BrandLockup() {
  return (
    <Link to={createPageUrl("Landing")} className="marketing-brand">
      <img src="/healthflux-logo.svg" alt="HealthFlux" className="marketing-brand-image" />
    </Link>
  );
}

function NavLink({ page, label, currentPage }) {
  const active = currentPage === page;
  return (
    <Link
      to={createPageUrl(page)}
      className="marketing-nav-link"
      style={{
        background: active ? "rgba(255,255,255,0.85)" : "transparent",
        color: active ? "#0f172a" : "#425066",
        boxShadow: active ? "0 18px 30px rgba(15, 23, 42, 0.08)" : "none",
      }}
    >
      {label}
    </Link>
  );
}

export default function MarketingShell({
  currentPage,
  eyebrow,
  title,
  description,
  heroTone = "lemon",
  stats = [],
  sectionLinks = [],
  heroAside,
  children,
}) {
  const { scrollY } = useScroll();
  const orbA = useTransform(scrollY, [0, 1400], [0, 180]);
  const orbB = useTransform(scrollY, [0, 1400], [0, -160]);
  const palette = marketingTones[heroTone] || marketingTones.lemon;

  return (
    <div className="marketing-shell">
      <motion.div className="marketing-orb marketing-orb-a" style={{ y: orbA }} />
      <motion.div className="marketing-orb marketing-orb-b" style={{ y: orbB }} />
      <motion.div className="marketing-grid-glow" />

      <header className="marketing-header">
        <div className="marketing-header-inner">
          <BrandLockup />
          <nav className="marketing-nav-desktop">
            {marketingNav.map((item) => (
              <NavLink key={item.page} page={item.page} label={item.label} currentPage={currentPage} />
            ))}
          </nav>
          <div className="marketing-nav-actions">
            <Link to={createPageUrl("Dashboard")} className="marketing-secondary-button">
              Product tour
            </Link>
            <Link to={createPageUrl("Onboarding")} className="marketing-primary-button">
              Get started <ArrowRight size={15} />
            </Link>
          </div>
          <Link to={createPageUrl("Onboarding")} className="marketing-nav-mobile" aria-label="Get started">
            <ArrowRight size={18} />
          </Link>
        </div>
        <div className="marketing-nav-mobile-row">
          {marketingNav.map((item) => (
            <NavLink key={item.page} page={item.page} label={item.label} currentPage={currentPage} />
          ))}
        </div>
      </header>

      <main className="marketing-main">
        <section className="marketing-hero">
          <div className="marketing-hero-copy">
            <span className="marketing-eyebrow">
              <Sparkles size={13} />
              {eyebrow}
            </span>
            <h1>{title}</h1>
            <p>{description}</p>
            <div className="marketing-hero-actions">
              <Link to={createPageUrl("Onboarding")} className="marketing-primary-button">
                Explore the experience <ArrowRight size={15} />
              </Link>
              <Link to={createPageUrl("DevDocs")} className="marketing-secondary-button">
                Read dev docs
              </Link>
            </div>
            {sectionLinks.length > 0 ? (
              <div className="marketing-section-links">
                {sectionLinks.map((link) => (
                  <a key={link.href} href={link.href} className="marketing-section-chip">
                    {link.label}
                  </a>
                ))}
              </div>
            ) : null}
          </div>

          <div className="marketing-hero-aside">
            <div className="marketing-hero-panel">
              <div className="marketing-hero-panel-top">
                <div className="marketing-status-dot" style={{ background: palette.solid }} />
                <span style={{ color: palette.text }}>Pastel-first product system</span>
              </div>
              {heroAside}
              {stats.length > 0 ? (
                <div className="marketing-hero-stats">
                  {stats.map((stat) => (
                    <div key={stat.label} className="marketing-hero-stat">
                      <span className="marketing-hero-stat-value">{stat.value}</span>
                      <span className="marketing-hero-stat-label">{stat.label}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </section>

        {children}
      </main>

      <footer className="marketing-footer">
        <div className="marketing-footer-top">
          <BrandLockup />
          <p>
            HealthFlux brings vitals, medications, labs, nutrition, AI guidance, documents,
            wellness, family care, and telehealth into one operating system.
          </p>
        </div>
        <div className="marketing-footer-grid">
          <div>
            <span className="marketing-footer-label">Explore</span>
            <div className="marketing-footer-links">
              {marketingNav.map((item) => (
                <Link key={item.page} to={createPageUrl(item.page)}>{item.label}</Link>
              ))}
            </div>
          </div>
          <div>
            <span className="marketing-footer-label">Application</span>
            <div className="marketing-footer-links">
              <Link to={createPageUrl("HealthHub")}>Health Hub</Link>
              <Link to={createPageUrl("AIHub")}>AI Hub</Link>
              <Link to={createPageUrl("WellnessHub")}>Wellness Hub</Link>
              <Link to={createPageUrl("CareHub")}>Care Hub</Link>
            </div>
          </div>
          <div>
            <span className="marketing-footer-label">Policies</span>
            <div className="marketing-footer-links">
              <Link to={createPageUrl("Terms")}>Terms</Link>
              <Link to={createPageUrl("Privacy")}>Privacy</Link>
              <Link to={createPageUrl("DevDocs")}>Developer Docs</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

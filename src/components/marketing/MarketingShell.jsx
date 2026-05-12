import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Menu, X } from "lucide-react";
import { createPageUrl } from "@/utils";

const NAV_LINKS = [
  { label: "Features", page: "Platform" },
  { label: "Solutions", page: "Solutions" },
  { label: "Pricing", page: "Pricing" },
  { label: "Docs", page: "DevDocs" },
];

const FOOTER_COLS = {
  Product: [
    { label: "Features", page: "Platform" },
    { label: "Solutions", page: "Solutions" },
    { label: "Pricing", page: "Pricing" },
    { label: "API Docs", page: "DevDocs" },
  ],
  Legal: [
    { label: "Privacy Policy", page: "Privacy" },
    { label: "Terms of Service", page: "Terms" },
    { label: "Cookie Policy", page: "Cookies" },
    { label: "Trust Center", page: "TrustCenter" },
  ],
  App: [
    { label: "Health Hub", page: "HealthHub" },
    { label: "AI Hub", page: "AIHub" },
    { label: "Wellness Hub", page: "WellnessHub" },
    { label: "Care Hub", page: "CareHub" },
  ],
};

export default function MarketingShell({ children, currentPage }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <div className="min-h-screen" style={{ background: "#fafaf8", color: "#101322" }}>
      {/* ── Header ── */}
      <header
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          background: scrolled ? "rgba(255,255,255,0.96)" : "rgba(250,250,248,0.92)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: scrolled ? "1px solid rgba(15,23,42,0.09)" : "1px solid transparent",
          boxShadow: scrolled ? "0 2px 20px rgba(15,23,42,0.06)" : "none",
        }}
      >
        <div className="max-w-7xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to={createPageUrl("Landing")} className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm select-none"
              style={{ background: "#d7f576", color: "#0a1200" }}>HF</div>
            <span className="font-bold text-lg tracking-tight" style={{ color: "#101322" }}>HealthFlux</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-0.5">
            {NAV_LINKS.map(({ label, page }) => (
              <Link key={page} to={createPageUrl(page)}
                className="px-4 py-2 rounded-xl text-sm transition-all"
                style={{
                  color: currentPage === page ? "#0a1200" : "#475569",
                  background: currentPage === page ? "#d7f576" : "transparent",
                  fontWeight: currentPage === page ? 700 : 500,
                }}>
                {label}
              </Link>
            ))}
          </nav>

          {/* CTA buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Link to={createPageUrl("Dashboard")}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-all hover:opacity-75"
              style={{ color: "#475569" }}>
              Sign in
            </Link>
            <Link to={createPageUrl("Onboarding")}
              className="px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-1.5 transition-all hover:opacity-90 active:scale-95"
              style={{ background: "#0f172a", color: "#ffffff" }}>
              Get started <ArrowRight size={13} />
            </Link>
          </div>

          {/* Mobile toggle */}
          <button onClick={() => setMobileOpen(o => !o)}
            className="md:hidden p-2 rounded-xl transition-colors"
            style={{ color: "#101322" }}
            aria-label="Toggle menu">
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile dropdown */}
        {mobileOpen && (
          <div className="md:hidden border-t px-4 py-4 space-y-1"
            style={{ borderColor: "rgba(15,23,42,0.09)", background: "rgba(255,255,255,0.99)" }}>
            {NAV_LINKS.map(({ label, page }) => (
              <Link key={page} to={createPageUrl(page)}
                onClick={() => setMobileOpen(false)}
                className="block px-4 py-3 rounded-xl text-sm font-semibold"
                style={{
                  color: currentPage === page ? "#0a1200" : "#475569",
                  background: currentPage === page ? "#d7f576" : "transparent",
                }}>
                {label}
              </Link>
            ))}
            <div className="pt-3 border-t space-y-2" style={{ borderColor: "rgba(15,23,42,0.09)" }}>
              <Link to={createPageUrl("Dashboard")} onClick={() => setMobileOpen(false)}
                className="block w-full text-center px-5 py-2.5 rounded-xl text-sm font-semibold border"
                style={{ color: "#475569", borderColor: "rgba(15,23,42,0.14)" }}>
                Sign in
              </Link>
              <Link to={createPageUrl("Onboarding")} onClick={() => setMobileOpen(false)}
                className="block w-full text-center px-5 py-3 rounded-xl text-sm font-bold"
                style={{ background: "#0f172a", color: "#ffffff" }}>
                Get started free
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ── Main content ── */}
      <main className="pt-16">{children}</main>

      {/* ── Footer ── */}
      <footer style={{ background: "#0c1120", color: "#cbd5e1" }}>
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 mb-14">
            {/* Brand column */}
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm"
                  style={{ background: "#d7f576", color: "#0a1200" }}>HF</div>
                <span className="font-bold text-lg text-white">HealthFlux</span>
              </div>
              <p className="text-sm leading-relaxed mb-6" style={{ color: "#94a3b8", maxWidth: 320 }}>
                Your personal AI health operating system — vitals, medications, labs, documents, 
                nutrition, wellness, family care, and telehealth in one seamless experience.
              </p>
              <Link to={createPageUrl("Onboarding")}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold"
                style={{ background: "#d7f576", color: "#0a1200" }}>
                Start for free <ArrowRight size={14} />
              </Link>
            </div>

            {/* Link columns */}
            {Object.entries(FOOTER_COLS).map(([group, links]) => (
              <div key={group}>
                <p className="text-xs font-black uppercase tracking-widest mb-4" style={{ color: "#64748b" }}>
                  {group}
                </p>
                <ul className="space-y-3">
                  {links.map(({ label, page }) => (
                    <li key={page}>
                      <Link to={createPageUrl(page)}
                        className="text-sm transition-colors hover:text-white"
                        style={{ color: "#94a3b8" }}>
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Bottom bar */}
          <div className="border-t pt-8 flex flex-col sm:flex-row items-center justify-between gap-4"
            style={{ borderColor: "rgba(255,255,255,0.07)" }}>
            <p className="text-xs" style={{ color: "#475569" }}>
              © {new Date().getFullYear()} HealthFlux Technologies. All rights reserved.
            </p>
            <div className="flex items-center gap-5">
              {[{ label: "Privacy", page: "Privacy" }, { label: "Terms", page: "Terms" }, { label: "Cookies", page: "Cookies" }].map(({ label, page }) => (
                <Link key={page} to={createPageUrl(page)}
                  className="text-xs hover:text-white transition-colors"
                  style={{ color: "#475569" }}>
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

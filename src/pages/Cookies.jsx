import React from "react";
import { Link } from "react-router-dom";
import { Cookie, Settings, BarChart2, Shield, ArrowRight, Mail } from "lucide-react";
import MarketingShell from "@/components/marketing/MarketingShell";
import { createPageUrl } from "@/utils";

const LAST_UPDATED = "May 2026";

const COOKIE_TYPES = [
  {
    id: "essential",
    icon: Shield,
    iconColor: "#5a7a00",
    iconBg: "rgba(215,245,118,0.25)",
    badge: "Always active",
    badgeColor: "#003d20",
    badgeBg: "rgba(168,230,207,0.3)",
    title: "Essential cookies",
    desc: "Required for HealthFlux to function. These cannot be disabled.",
    cookies: [
      { name: "hf-session", purpose: "Maintains your authentication session so you stay logged in", duration: "Session / 30 days" },
      { name: "hf-csrf", purpose: "CSRF protection token to prevent cross-site request forgery attacks", duration: "Session" },
      { name: "hf-device", purpose: "Identifies your device to enforce account security policies", duration: "1 year" },
    ],
  },
  {
    id: "functional",
    icon: Settings,
    iconColor: "#1a0a40",
    iconBg: "rgba(201,187,255,0.25)",
    badge: "Always active",
    badgeColor: "#1a0a40",
    badgeBg: "rgba(201,187,255,0.3)",
    title: "Functional cookies",
    desc: "Store your preferences to improve your experience. These are necessary for the app to remember your settings.",
    cookies: [
      { name: "hf-theme", purpose: "Stores your light/dark theme preference", duration: "1 year" },
      { name: "hf-lang", purpose: "Stores your language preference", duration: "1 year" },
      { name: "hf-active-profile", purpose: "Remembers which health profile was last active in a multi-profile account", duration: "Session" },
      { name: "hf-nav-state", purpose: "Saves sidebar navigation state (expanded/collapsed)", duration: "1 year" },
    ],
  },
  {
    id: "analytics",
    icon: BarChart2,
    iconColor: "#003d20",
    iconBg: "rgba(168,230,207,0.25)",
    badge: "Optional",
    badgeColor: "#003d20",
    badgeBg: "rgba(168,230,207,0.2)",
    title: "Analytics cookies",
    desc: "Help us understand how HealthFlux is used so we can improve it. No health data is included in analytics.",
    cookies: [
      { name: "_ga, _gid", purpose: "Google Analytics — aggregate usage statistics (page views, session duration, feature interactions). Data is anonymized and never tied to health records.", duration: "2 years / 24 hours" },
      { name: "hf-perf", purpose: "Performance timing data to identify slow-loading features", duration: "30 days" },
    ],
  },
];

const WHAT_WE_DONT_USE = [
  "Third-party advertising cookies or ad tracking pixels",
  "Cross-site tracking to follow you outside HealthFlux",
  "Cookies that sell or share your data with data brokers",
  "Social media tracking cookies",
  "Fingerprinting or other non-cookie tracking technologies for marketing",
];

export default function Cookies() {
  return (
    <MarketingShell currentPage="Cookies">
      {/* Hero */}
      <section className="py-16 px-6" style={{ background: "linear-gradient(135deg, #fafaf8 0%, #f0fff8 100%)" }}>
        <div className="max-w-3xl mx-auto">
          <span className="inline-block px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest mb-6"
            style={{ background: "rgba(168,230,207,0.3)", color: "#003d20" }}>
            Cookie policy
          </span>
          <h1 className="text-4xl md:text-5xl font-black mb-5 leading-tight" style={{ color: "#0f172a" }}>
            What cookies we use and why
          </h1>
          <p className="text-lg leading-relaxed mb-6" style={{ color: "#475569" }}>
            HealthFlux uses a small number of cookies to keep you logged in, remember your 
            preferences, and improve the app. We do not use advertising cookies.
          </p>
          <p className="text-sm" style={{ color: "#94a3b8" }}>Last updated: {LAST_UPDATED}</p>
        </div>
      </section>

      {/* What are cookies */}
      <section className="py-12 px-6" style={{ background: "#ffffff" }}>
        <div className="max-w-3xl mx-auto">
          <div className="p-6 rounded-2xl" style={{ background: "#fafaf8", border: "1px solid rgba(15,23,42,0.08)" }}>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(215,245,118,0.3)" }}>
                <Cookie size={18} style={{ color: "#5a7a00" }} />
              </div>
              <div>
                <h2 className="font-bold mb-2" style={{ color: "#0f172a" }}>What are cookies?</h2>
                <p className="text-sm leading-relaxed" style={{ color: "#64748b" }}>
                  Cookies are small text files stored in your browser when you visit a website or use a web app. 
                  They let us recognize your browser between sessions, remember your preferences, and keep you securely logged in. 
                  They contain no executable code and cannot access files on your device.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Cookie types */}
      <section className="py-8 px-6 pb-16" style={{ background: "#ffffff" }}>
        <div className="max-w-3xl mx-auto space-y-8">
          {COOKIE_TYPES.map(type => {
            const Icon = type.icon;
            return (
              <div key={type.id} id={type.id} className="rounded-2xl overflow-hidden scroll-mt-24"
                style={{ border: "1px solid rgba(15,23,42,0.08)" }}>
                {/* Header */}
                <div className="p-5 flex items-center gap-4"
                  style={{ background: "#fafaf8", borderBottom: "1px solid rgba(15,23,42,0.06)" }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: type.iconBg }}>
                    <Icon size={18} style={{ color: type.iconColor }} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-0.5">
                      <h3 className="font-black text-base" style={{ color: "#0f172a" }}>{type.title}</h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest"
                        style={{ background: type.badgeBg, color: type.badgeColor }}>
                        {type.badge}
                      </span>
                    </div>
                    <p className="text-xs" style={{ color: "#64748b" }}>{type.desc}</p>
                  </div>
                </div>
                {/* Cookie table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid rgba(15,23,42,0.06)" }}>
                        <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-widest" style={{ color: "#94a3b8", minWidth: 120 }}>Cookie name</th>
                        <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-widest" style={{ color: "#94a3b8" }}>Purpose</th>
                        <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-widest" style={{ color: "#94a3b8", minWidth: 110 }}>Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      {type.cookies.map((c, i) => (
                        <tr key={c.name} style={{ borderBottom: i < type.cookies.length - 1 ? "1px solid rgba(15,23,42,0.04)" : "none" }}>
                          <td className="px-5 py-3 font-mono text-xs font-semibold" style={{ color: "#0f172a" }}>{c.name}</td>
                          <td className="px-5 py-3 text-xs leading-relaxed" style={{ color: "#475569" }}>{c.purpose}</td>
                          <td className="px-5 py-3 text-xs" style={{ color: "#64748b" }}>{c.duration}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* What we don't use */}
      <section className="py-16 px-6" style={{ background: "#fafaf8" }}>
        <div className="max-w-3xl mx-auto">
          <h2 className="text-xl font-black mb-3" style={{ color: "#0f172a" }}>What we don't use</h2>
          <p className="text-sm mb-6" style={{ color: "#64748b" }}>
            HealthFlux is a health platform, not an ad platform. We have no interest in tracking you for commercial purposes.
          </p>
          <ul className="space-y-2">
            {WHAT_WE_DONT_USE.map(item => (
              <li key={item} className="flex items-start gap-3 text-sm p-3 rounded-xl"
                style={{ background: "#ffffff", border: "1px solid rgba(15,23,42,0.06)" }}>
                <span className="text-base leading-none mt-0.5">✗</span>
                <span style={{ color: "#475569" }}>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Managing cookies */}
      <section className="py-16 px-6" style={{ background: "#ffffff" }}>
        <div className="max-w-3xl mx-auto">
          <h2 className="text-xl font-black mb-6" style={{ color: "#0f172a" }}>Managing your cookies</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              {
                title: "Browser settings",
                desc: "You can block or delete cookies through your browser settings. Note that blocking essential cookies will prevent you from logging in to HealthFlux.",
              },
              {
                title: "App preferences",
                desc: "Theme and language preferences stored via cookies can be reset in Settings > Preferences. This clears the functional cookie and resets to defaults.",
              },
              {
                title: "Analytics opt-out",
                desc: "You can opt out of analytics cookies by installing the Google Analytics opt-out browser add-on or by blocking analytics domains in your browser.",
              },
              {
                title: "Account deletion",
                desc: "Deleting your HealthFlux account removes all server-side data and session cookies associated with your account within 30 days.",
              },
            ].map(item => (
              <div key={item.title} className="p-5 rounded-2xl"
                style={{ background: "#fafaf8", border: "1px solid rgba(15,23,42,0.08)" }}>
                <h3 className="font-bold text-sm mb-2" style={{ color: "#0f172a" }}>{item.title}</h3>
                <p className="text-xs leading-relaxed" style={{ color: "#64748b" }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="py-12 px-6" style={{ background: "#fafaf8" }}>
        <div className="max-w-3xl mx-auto">
          <div className="p-6 rounded-2xl" style={{ background: "#ffffff", border: "1px solid rgba(15,23,42,0.08)" }}>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(215,245,118,0.3)" }}>
                <Mail size={18} style={{ color: "#5a7a00" }} />
              </div>
              <div>
                <h3 className="font-bold mb-1" style={{ color: "#0f172a" }}>Cookie questions</h3>
                <p className="text-sm mb-3" style={{ color: "#64748b" }}>
                  If you have questions about our cookie use, contact us directly.
                </p>
                <a href="mailto:privacy@healthflux.app" className="text-sm font-semibold" style={{ color: "#5a7a00" }}>
                  privacy@healthflux.app
                </a>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <h2 className="text-xl font-black mb-6" style={{ color: "#0f172a" }}>Related policies</h2>
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { label: "Privacy Policy", page: "Privacy", desc: "Full data handling practices" },
                { label: "Terms of Service", page: "Terms", desc: "Usage rules and account terms" },
                { label: "Trust Center", page: "TrustCenter", desc: "Security and compliance" },
              ].map(({ label, page, desc }) => (
                <Link key={page} to={createPageUrl(page)}
                  className="p-5 rounded-2xl flex flex-col gap-1.5 hover:shadow-sm transition-shadow"
                  style={{ background: "#ffffff", border: "1px solid rgba(15,23,42,0.08)" }}>
                  <span className="font-bold text-sm" style={{ color: "#0f172a" }}>{label}</span>
                  <span className="text-xs" style={{ color: "#64748b" }}>{desc}</span>
                  <ArrowRight size={12} className="mt-1" style={{ color: "#94a3b8" }} />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}

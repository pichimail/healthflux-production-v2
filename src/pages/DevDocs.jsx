import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Code, Terminal, ArrowRight, ChevronDown, ChevronUp, Database, Cpu, FileText, Lock, Webhook } from "lucide-react";
import MarketingShell from "@/components/marketing/MarketingShell";
import { createPageUrl } from "@/utils";

const ENTITIES = [
  { name: "VitalLog", desc: "Blood pressure, heart rate, SpO₂, glucose, weight readings tied to a profile and timestamp", fields: ["profileId", "type", "value", "unit", "timestamp", "notes"] },
  { name: "Medication", desc: "Prescribed or OTC medications with dosage, frequency, and prescriber details", fields: ["profileId", "name", "dosage", "frequency", "prescribedBy", "startDate", "active"] },
  { name: "MedicalDocument", desc: "Uploaded health documents with AI-extracted metadata and full-text search index", fields: ["profileId", "title", "type", "fileUrl", "extractedText", "tags", "uploadedAt"] },
  { name: "MealLog", desc: "Nutrition tracking entries with per-item macros and calorie data", fields: ["profileId", "date", "mealType", "items", "calories", "protein", "carbs", "fat"] },
  { name: "AIHealthReport", desc: "Periodic AI-generated health summaries based on recent vitals, labs, and records", fields: ["profileId", "reportType", "period", "insights", "recommendations", "generatedAt"] },
  { name: "CareCircle", desc: "Caregiver relationship linking two accounts with defined access scope", fields: ["ownerId", "caregiverId", "profileId", "accessLevel", "grantedAt", "active"] },
  { name: "GamificationProfile", desc: "Points, badges, streaks, and level progress for wellness goal tracking", fields: ["userId", "points", "level", "badges", "currentStreak", "longestStreak"] },
  { name: "UserPreferences", desc: "Per-user app settings including theme, notifications, and language", fields: ["userId", "theme", "language", "notificationsEnabled", "reminderTimes"] },
];

const AI_FUNCTIONS = [
  { name: "aiHealthChat", desc: "Conversational AI assistant with profile context. Handles health questions, medication queries, and general guidance.", params: "{ message, profileId, conversationHistory }", returns: "{ response, sources, disclaimer }" },
  { name: "generateAIHealthReport", desc: "Generates a structured weekly or monthly health summary from recent vitals, labs, and medication adherence data.", params: "{ profileId, period, includeRecommendations }", returns: "{ summary, keyInsights, trends, recommendations }" },
  { name: "checkDrugInteractions", desc: "Screens a list of medications for known interaction risks using clinical knowledge.", params: "{ medications: [{ name, dosage }] }", returns: "{ interactions: [{ drugs, severity, description }] }" },
  { name: "analyzeMedicalImage", desc: "Extracts structured data from lab report or prescription images using OCR and AI parsing.", params: "{ imageUrl, documentType }", returns: "{ extractedData, confidence, rawText }" },
  { name: "analyzeSkinImage", desc: "Analyzes uploaded skin image for visible dermatological patterns (informational only — not diagnostic).", params: "{ imageUrl }", returns: "{ observations, recommendations, disclaimer }" },
  { name: "generateDietPlan", desc: "Creates a personalized meal plan based on health goals, conditions, and nutritional targets.", params: "{ profileId, goals, restrictions, duration }", returns: "{ plan: [{ day, meals }], nutritionSummary }" },
  { name: "documentProcessor", desc: "Full pipeline: upload document, OCR extraction, entity parsing, tagging, and indexing for search.", params: "{ fileUrl, profileId, documentType }", returns: "{ document, extractedEntities, tags }" },
  { name: "aiDocumentSearch", desc: "Semantic search across all indexed medical documents for a profile.", params: "{ profileId, query, limit }", returns: "{ results: [{ document, relevanceScore, excerpt }] }" },
];

const API_ROUTES = [
  { method: "POST", path: "/api/ai/chat", desc: "Send a message to the AI health assistant with profile context" },
  { method: "POST", path: "/api/ai/report", desc: "Generate an AI health report for a profile and period" },
  { method: "POST", path: "/api/ai/drug-interactions", desc: "Check for drug interactions across a medication list" },
  { method: "POST", path: "/api/ai/analyze-image", desc: "Submit a medical image URL for OCR and AI extraction" },
  { method: "POST", path: "/api/ai/analyze-skin", desc: "Submit a skin photo for dermatological observation" },
  { method: "POST", path: "/api/ai/diet-plan", desc: "Generate a personalized diet plan" },
  { method: "POST", path: "/api/ai/document", desc: "Process and index an uploaded medical document" },
  { method: "POST", path: "/api/ai/search", desc: "Semantic search across indexed medical documents" },
];

const METHOD_COLORS = {
  GET: { bg: "rgba(168,230,207,0.3)", text: "#003d20" },
  POST: { bg: "rgba(201,187,255,0.3)", text: "#1a0a40" },
  PUT: { bg: "rgba(215,245,118,0.3)", text: "#0a1200" },
  DELETE: { bg: "rgba(255,180,180,0.3)", text: "#4a0000" },
};

function Accordion({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(15,23,42,0.08)" }}>
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-4 px-6 py-4 text-left"
        style={{ background: open ? "#fafaf8" : "#ffffff" }}>
        <span className="font-bold text-sm" style={{ color: "#0f172a" }}>{title}</span>
        {open ? <ChevronUp size={16} style={{ color: "#94a3b8" }} /> : <ChevronDown size={16} style={{ color: "#94a3b8" }} />}
      </button>
      {open && <div style={{ background: "#fafaf8", borderTop: "1px solid rgba(15,23,42,0.06)" }}>{children}</div>}
    </div>
  );
}

export default function DevDocs() {
  return (
    <MarketingShell currentPage="DevDocs">
      {/* Hero */}
      <section className="py-20 px-6" style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)" }}>
        <div className="max-w-3xl mx-auto">
          <span className="inline-block px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest mb-6"
            style={{ background: "rgba(201,187,255,0.2)", color: "#c9bbff" }}>
            Developer documentation
          </span>
          <h1 className="text-4xl md:text-5xl font-black mb-5 leading-tight" style={{ color: "#ffffff" }}>
            HealthFlux platform reference
          </h1>
          <p className="text-lg leading-relaxed mb-8" style={{ color: "#94a3b8" }}>
            Architecture overview, data models, AI functions, and API routes for the HealthFlux 
            health operating system.
          </p>
          <div className="flex flex-wrap gap-3">
            {["Data entities", "AI functions", "API routes", "Architecture"].map(tag => (
              <a key={tag} href={`#${tag.toLowerCase().replace(" ", "-")}`}
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{ background: "rgba(255,255,255,0.08)", color: "#cbd5e1" }}>
                {tag} →
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Architecture */}
      <section id="architecture" className="py-16 px-6 scroll-mt-20" style={{ background: "#ffffff" }}>
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(201,187,255,0.2)" }}>
              <Cpu size={18} style={{ color: "#7c3aed" }} />
            </div>
            <h2 className="text-2xl font-black" style={{ color: "#0f172a" }}>Architecture overview</h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 mb-8">
            {[
              { label: "Frontend", value: "React + Vite", note: "Single-page app with Tailwind CSS and lucide-react icons" },
              { label: "Backend functions", value: "base44 functions", note: "Serverless backend functions for AI processing and data operations" },
              { label: "Database", value: "Supabase", note: "PostgreSQL with row-level security, file storage, and real-time subscriptions" },
              { label: "AI layer", value: "OpenRouter", note: "Multi-model AI routing for chat, analysis, reports, and OCR processing" },
              { label: "Auth", value: "base44 auth", note: "Managed authentication with session handling and profile switching" },
              { label: "Mobile", value: "Capacitor", note: "Native Android and iOS wrapper for the web app with camera access" },
            ].map(item => (
              <div key={item.label} className="p-4 rounded-xl" style={{ background: "#fafaf8", border: "1px solid rgba(15,23,42,0.07)" }}>
                <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: "#94a3b8" }}>{item.label}</span>
                <p className="font-black text-base mt-1 mb-1" style={{ color: "#0f172a" }}>{item.value}</p>
                <p className="text-xs" style={{ color: "#64748b" }}>{item.note}</p>
              </div>
            ))}
          </div>

          <div className="p-5 rounded-xl font-mono text-xs" style={{ background: "#0f172a", color: "#a5f3fc" }}>
            <p className="text-slate-500 mb-2"># Data flow</p>
            <p>User → React UI → base44 functions → OpenRouter AI</p>
            <p className="mt-1">User → React UI → Supabase (direct for CRUD)</p>
            <p className="mt-1">Mobile (Capacitor) → Camera → AI image analysis</p>
          </div>
        </div>
      </section>

      {/* Data entities */}
      <section id="data-entities" className="py-16 px-6 scroll-mt-20" style={{ background: "#fafaf8" }}>
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(215,245,118,0.25)" }}>
              <Database size={18} style={{ color: "#5a7a00" }} />
            </div>
            <h2 className="text-2xl font-black" style={{ color: "#0f172a" }}>Data entities</h2>
          </div>

          <div className="space-y-3">
            {ENTITIES.map(entity => (
              <Accordion key={entity.name} title={entity.name}>
                <div className="px-6 py-4">
                  <p className="text-sm mb-4" style={{ color: "#475569" }}>{entity.desc}</p>
                  <p className="text-xs font-bold mb-2 uppercase tracking-widest" style={{ color: "#94a3b8" }}>Key fields</p>
                  <div className="flex flex-wrap gap-2">
                    {entity.fields.map(f => (
                      <span key={f} className="px-2.5 py-1 rounded-lg font-mono text-xs"
                        style={{ background: "#0f172a", color: "#a5f3fc" }}>
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              </Accordion>
            ))}
          </div>
        </div>
      </section>

      {/* AI Functions */}
      <section id="ai-functions" className="py-16 px-6 scroll-mt-20" style={{ background: "#ffffff" }}>
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(201,187,255,0.25)" }}>
              <Cpu size={18} style={{ color: "#7c3aed" }} />
            </div>
            <h2 className="text-2xl font-black" style={{ color: "#0f172a" }}>AI functions</h2>
          </div>
          <p className="text-sm mb-8" style={{ color: "#64748b" }}>
            Serverless functions that wrap OpenRouter AI calls with HealthFlux context, input validation, and output formatting.
          </p>

          <div className="space-y-3">
            {AI_FUNCTIONS.map(fn => (
              <Accordion key={fn.name} title={fn.name}>
                <div className="px-6 py-4 space-y-3">
                  <p className="text-sm" style={{ color: "#475569" }}>{fn.desc}</p>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: "#94a3b8" }}>Input</p>
                    <div className="p-3 rounded-lg font-mono text-xs" style={{ background: "#0f172a", color: "#86efac" }}>{fn.params}</div>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: "#94a3b8" }}>Returns</p>
                    <div className="p-3 rounded-lg font-mono text-xs" style={{ background: "#0f172a", color: "#a5f3fc" }}>{fn.returns}</div>
                  </div>
                </div>
              </Accordion>
            ))}
          </div>
        </div>
      </section>

      {/* API Routes */}
      <section id="api-routes" className="py-16 px-6 scroll-mt-20" style={{ background: "#fafaf8" }}>
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(168,230,207,0.25)" }}>
              <Webhook size={18} style={{ color: "#047857" }} />
            </div>
            <h2 className="text-2xl font-black" style={{ color: "#0f172a" }}>API routes</h2>
          </div>
          <p className="text-sm mb-8" style={{ color: "#64748b" }}>
            All AI-powered endpoints are served from <code className="px-1.5 py-0.5 rounded text-xs" style={{ background: "#f1f5f9", color: "#0f172a" }}>api/routes/ai.js</code> via Express.
            Authentication is required for all endpoints — include your session token in the Authorization header.
          </p>

          <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(15,23,42,0.08)" }}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "1px solid rgba(15,23,42,0.08)" }}>
                    <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-widest" style={{ color: "#94a3b8" }}>Method</th>
                    <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-widest" style={{ color: "#94a3b8" }}>Path</th>
                    <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-widest" style={{ color: "#94a3b8" }}>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {API_ROUTES.map((route, i) => {
                    const mc = METHOD_COLORS[route.method] || METHOD_COLORS.GET;
                    return (
                      <tr key={route.path} style={{ borderBottom: i < API_ROUTES.length - 1 ? "1px solid rgba(15,23,42,0.05)" : "none", background: i % 2 === 0 ? "#ffffff" : "#fafaf8" }}>
                        <td className="px-5 py-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-black"
                            style={{ background: mc.bg, color: mc.text }}>
                            {route.method}
                          </span>
                        </td>
                        <td className="px-5 py-3 font-mono text-xs font-semibold" style={{ color: "#0f172a" }}>{route.path}</td>
                        <td className="px-5 py-3 text-xs" style={{ color: "#64748b" }}>{route.desc}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-6 p-5 rounded-xl" style={{ background: "#0f172a" }}>
            <p className="text-xs font-mono mb-2" style={{ color: "#64748b" }}># Example request</p>
            <pre className="text-xs font-mono leading-relaxed" style={{ color: "#a5f3fc" }}>{`POST /api/ai/chat
Authorization: Bearer <session-token>
Content-Type: application/json

{
  "message": "What do my recent blood pressure readings suggest?",
  "profileId": "profile_abc123",
  "conversationHistory": []
}`}</pre>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6" style={{ background: "#0c1120" }}>
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-black mb-4" style={{ color: "#ffffff" }}>
            Start building with HealthFlux
          </h2>
          <p className="mb-8" style={{ color: "#94a3b8" }}>
            Create an account to access the full platform — including the AI features, data models, and developer tooling.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to={createPageUrl("Auth")}
              className="px-8 py-4 rounded-xl text-sm font-bold flex items-center gap-2"
              style={{ background: "#d7f576", color: "#0a1200" }}>
              Get started free <ArrowRight size={14} />
            </Link>
            <Link to={createPageUrl("Platform")}
              className="px-8 py-4 rounded-xl text-sm font-semibold border"
              style={{ borderColor: "rgba(255,255,255,0.15)", color: "#cbd5e1" }}>
              Platform overview
            </Link>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}

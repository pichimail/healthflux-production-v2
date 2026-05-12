/**
 * HealthFlux AI Service — Production OpenRouter Integration
 *
 * Every AI call in the application routes through this module.
 * No base44.functions.invoke() or InvokeLLM calls anywhere.
 *
 * All endpoints go to /api/ai/* which are backed by OpenRouter.
 * Models are selected per-task (Claude Sonnet for reasoning, Gemini for vision).
 */

const API_BASE = import.meta.env.VITE_API_URL || '/api';

async function getAuthHeader() {
  try {
    const { default: db } = await import('@/lib/db');
    const { data: { session } } = await db.auth.getSession();
    return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
  } catch {
    return {};
  }
}

async function callRoute(route, body) {
  const auth = await getAuthHeader();
  const res = await fetch(`${API_BASE}/ai/${route}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...auth },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`AI /api/ai/${route} failed (${res.status}): ${txt.slice(0, 200)}`);
  }
  return res.json();
}

// ───────────── Generic AI text ─────────────
export async function callAI({ prompt, systemPrompt, responseJsonSchema, response_json_schema, addContext, add_context_from_internet, functionName }) {
  return callRoute('invoke', {
    prompt,
    system_prompt: systemPrompt,
    response_json_schema: responseJsonSchema || response_json_schema,
    add_context_from_internet: addContext ?? add_context_from_internet,
    function_name: functionName || 'default',
  });
}

// ───────────── Vision / file-based AI ─────────────
export async function callAIVision({ prompt, fileUrls, file_urls, responseJsonSchema, response_json_schema, functionName }) {
  return callRoute('vision', {
    prompt,
    file_urls: fileUrls || file_urls || [],
    response_json_schema: responseJsonSchema || response_json_schema,
    function_name: functionName || 'vision',
  });
}

// ───────────── File extract (PDFs/images → structured JSON) ─────────────
export async function extractDataFromFile({ file_url, json_schema, fileUrl, jsonSchema }) {
  return callRoute('extract', {
    file_url: file_url || fileUrl,
    json_schema: json_schema || jsonSchema,
  });
}

// ───────────── Upload file (Supabase Storage) ─────────────
export async function uploadFile(file, opts = {}) {
  const { default: db } = await import('@/lib/db');
  const { storageUpload } = await import('@/services/storageService');
  return storageUpload(file, opts);
}

// ───────────── Email + SMS ─────────────
export async function sendEmail({ to, subject, body, fromName }) {
  return callRoute('email', { to, subject, body, from_name: fromName });
}

// ───────────── Named AI functions (all replace base44.functions.invoke) ─────────────
export async function aiHealthChat(params)               { return callRoute('health-chat', params); }
export async function symptomTriage(params)              { return callRoute('symptom-triage', params); }
export async function checkDrugInteractions(params)      { return callRoute('drug-interactions', params); }
export async function analyzeMedicalImage(params)        { return callRoute('analyze-image', { ...params, type: 'medical' }); }
export async function analyzeSkinImage(params)           { return callRoute('analyze-image', { ...params, type: 'skin' }); }
export async function nutritionImageAnalysis(params)     { return callRoute('analyze-image', { ...params, type: 'nutrition' }); }
export async function generateDietPlan(params)           { return callRoute('diet-plan', params); }
export async function generateAIHealthReport(params)     { return callRoute('health-report', params); }
export async function aiDocumentSearch(params)           { return callRoute('document-search', params); }
export async function askDocumentQuestion(params)        { return callRoute('document-qa', params); }
export async function extractMedicationFromImage(params) { return callRoute('extract-medication', params); }
export async function healthCoaching(params)             { return callRoute('health-coaching', params); }
export async function dailyHealthGoals(params)           { return callRoute('daily-goals', params); }
export async function crossDocumentInsights(params)      { return callRoute('cross-insights', params); }
export async function parseVoiceLog(params)              { return callRoute('parse-voice', params); }
export async function semanticDocumentSearch(params)     { return callRoute('document-search', params); }
export async function reconcileMedications(params)       { return callRoute('reconcile-medications', params); }
export async function ocrLabReport(params)               { return callRoute('ocr-lab-report', params); }
export async function extractFamilyProfiles(params)      { return callRoute('extract-family', params); }
export async function extractInsuranceData(params)       { return callRoute('extract-insurance', params); }
export async function multiSnapAnalyze(params)           { return callRoute('multi-snap', params); }
export async function enhancedDocumentSummary(params)    { return callRoute('enhanced-summary', params); }
export async function predictiveHealthAnalysis(params)   { return callRoute('predictive-analysis', params); }
export async function healthPredictions(params)          { return callRoute('health-predictions', params); }
export async function generateProviderReport(params)     { return callRoute('provider-report', params); }
export async function analyzeAdherence(params)           { return callRoute('analyze-adherence', params); }
export async function enhancedDocumentProcessor(params)  { return callRoute('enhanced-document', params); }
export async function generateEnhancedReport(params)     { return callRoute('enhanced-report', params); }

// ───────────── Shim for legacy base44.functions.invoke('name', payload) ─────────────
// Maps every old base44 function name → its /api/ai/* equivalent.
// This keeps any leftover call-sites working without grep-replacing 100+ files.
const FUNCTION_MAP = {
  aiHealthChat, symptomTriage, checkDrugInteractions, analyzeMedicalImage,
  analyzeSkinImage, nutritionImageAnalysis, generateDietPlan,
  generateAIHealthReport, aiDocumentSearch, askDocumentQuestion,
  extractMedicationFromImage, healthCoaching, dailyHealthGoals,
  crossDocumentInsights, parseVoiceLog, semanticDocumentSearch,
  reconcileMedications, ocrLabReport, extractFamilyProfiles,
  extractInsuranceData, multiSnapAnalyze, enhancedDocumentSummary,
  predictiveHealthAnalysis, healthPredictions, generateProviderReport,
  analyzeAdherence, enhancedDocumentProcessor, generateEnhancedReport,
};

export async function invokeFunction(name, params = {}) {
  const fn = FUNCTION_MAP[name];
  if (fn) return fn(params);
  // Fallback: generic invoke
  return callAI({ prompt: JSON.stringify(params), functionName: name });
}

export default {
  callAI, callAIVision, extractDataFromFile, uploadFile, sendEmail,
  invokeFunction, ...FUNCTION_MAP,
};

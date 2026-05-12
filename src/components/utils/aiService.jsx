// @ts-nocheck
/**
 * HealthFlux AI Service — Production
 * All InvokeLLM calls replaced with OpenRouter API calls
 * Routes to /api/ai/* endpoints (see api/routes/)
 */

const API_BASE = import.meta.env.VITE_API_URL || '/api';
const STORAGE_BUCKET = import.meta.env.VITE_SUPABASE_STORAGE_BUCKET || 'uploads';

const GLOBAL_TEXT_SYSTEM_PROMPT = `You are HealthFlux AI, a clinical-grade health assistant.
Follow these rules for every response:
1. Be medically cautious and evidence-aware; never fabricate facts.
2. Use only the user-provided context, records, and uploaded data.
3. If information is missing or uncertain, say what is missing.
4. Give concise, actionable guidance and clear next steps.
5. Never claim a diagnosis; provide risk-aware interpretation.
6. For urgent red-flag symptoms, advise immediate in-person care.
7. Do not output markdown tables unless explicitly requested.
8. Keep PHI-sensitive details minimal and relevant.
9. Prefer structured JSON-compatible wording when schema mode is requested.
10. End medical advice with a brief safety disclaimer when clinically relevant.`;

const GLOBAL_VISION_SYSTEM_PROMPT = `You are HealthFlux Vision AI for medical and insurance documents/images.
Rules:
1. Extract text and entities faithfully from the image/document.
2. Do not hallucinate values not visible in the source.
3. Preserve original units, dates, and names where possible.
4. Normalize key fields (dates, gender, relationship, medication names) when confident.
5. If confidence is low, return null/unknown for that field.
6. For insurance docs, extract all family members and policy details exactly.
7. For lab reports, preserve numeric values and reference ranges accurately.
8. Return compact, structured output suitable for DB persistence.
9. Mention ambiguities explicitly instead of guessing.
10. Never include unrelated prose when structured output is requested.`;

async function getAuthHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  try {
    const { default: db } = await import('@/lib/db');
    const { data } = await db.auth.getSession();
    const token = data?.session?.access_token;
    if (token) headers.Authorization = `Bearer ${token}`;
  } catch {}
  return headers;
}

async function callRoute(route, body) {
  const res = await fetch(`${API_BASE}/ai/${route}`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    credentials: 'include',
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`AI route /api/ai/${route} failed (${res.status}): ${err}`);
  }
  return res.json();
}

// ── Text AI call ──
export async function callAI({
  prompt = '',
  systemPrompt,
  responseJsonSchema,
  response_json_schema,
  addContext,
  add_context_from_internet,
  functionName,
} = {}) {
  return callRoute('invoke', {
    prompt,
    system_prompt: systemPrompt || GLOBAL_TEXT_SYSTEM_PROMPT,
    response_json_schema: responseJsonSchema || response_json_schema,
    add_context_from_internet: addContext ?? add_context_from_internet,
    function_name: functionName || 'default',
  });
}

// ── Vision AI call ──
export async function callAIVision({
  prompt = '',
  systemPrompt,
  fileUrls,
  file_urls,
  responseJsonSchema,
  response_json_schema,
  functionName,
} = {}) {
  return callRoute('vision', {
    prompt,
    system_prompt: systemPrompt || GLOBAL_VISION_SYSTEM_PROMPT,
    file_urls: fileUrls || file_urls || [],
    response_json_schema: responseJsonSchema || response_json_schema,
    function_name: functionName || 'vision',
  });
}

// ── Extract data from file ──
export async function extractDataFromFile({ file_url, json_schema, fileUrl, jsonSchema } = {}) {
  return callRoute('extract', {
    file_url: file_url || fileUrl,
    json_schema: json_schema || jsonSchema,
  });
}

// ── Upload file ──
export async function uploadFile(file) {
  const { getSupabaseClient } = await import('@/lib/db');
  const supabase = await getSupabaseClient();
  const safeName = (file.name || 'document')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 80);
  const path = `insurance/${Date.now()}_${Math.random().toString(36).slice(2, 10)}_${safeName}`;

  const candidateBuckets = [STORAGE_BUCKET, 'documents', 'uploads'];
  let lastError = null;

  for (const bucket of candidateBuckets) {
    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    });
    if (!error) {
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      return { url: data.publicUrl, file_url: data.publicUrl, path, bucket, size: file.size };
    }
    lastError = error;
  }

  throw lastError || new Error('File upload failed');
}

// ── Send email ──
export async function sendEmail({ to, subject, body, fromName } = {}) {
  return callRoute('email', { to, subject, body, from_name: fromName });
}

// ── Specific AI functions ──
export async function aiHealthChat(params) {
  return callRoute('health-chat', params);
}
export async function symptomTriage(params) {
  return callRoute('symptom-triage', params);
}
export async function checkDrugInteractions(params) {
  return callRoute('drug-interactions', params);
}
export async function analyzeMedicalImage(params) {
  return callRoute('analyze-image', { ...params, type: 'medical' });
}
export async function analyzeSkinImage(params) {
  return callRoute('analyze-image', { ...params, type: 'skin' });
}
export async function generateDietPlan(params) {
  return callRoute('diet-plan', params);
}
export async function generateAIHealthReport(params) {
  return callRoute('health-report', params);
}
export async function aiDocumentSearch(params) {
  return callRoute('document-search', params);
}
export async function askDocumentQuestion(params) {
  return callRoute('document-qa', params);
}
export async function extractMedicationFromImage(params) {
  return callRoute('extract-medication', params);
}
export async function healthCoaching(params) {
  return callRoute('health-coaching', params);
}
export async function dailyHealthGoals(params) {
  return callRoute('daily-goals', params);
}
export async function crossDocumentInsights(params) {
  return callRoute('cross-insights', params);
}
export async function parseVoiceLog(params) {
  return callRoute('parse-voice', params);
}
export async function nutritionImageAnalysis(params) {
  return callRoute('analyze-image', { ...params, type: 'nutrition' });
}
export async function semanticDocumentSearch(params) {
  return callRoute('document-search', params);
}
export async function reconcileMedications(params) {
  return callRoute('reconcile-medications', params);
}
export async function ocrLabReport(params) {
  return callRoute('ocr-lab-report', params);
}
export async function extractFamilyProfiles(params) {
  return callRoute('extract-family', params);
}
export async function multiSnapAnalyze(params) {
  return callRoute('multi-snap', params);
}
export async function enhancedDocumentSummary(params) {
  return callRoute('enhanced-summary', params);
}
export async function predictiveHealthAnalysis(params) {
  return callRoute('predictive-analysis', params);
}
export async function healthPredictions(params) {
  return callRoute('health-predictions', params);
}
export async function generateProviderReport(params) {
  return callRoute('provider-report', params);
}

/**
 * HealthFlux AI Service — Production
 * All InvokeLLM calls replaced with OpenRouter API calls
 * Routes to /api/ai/* endpoints (see api/routes/)
 */

const API_BASE = import.meta.env.VITE_API_URL || '/api';

async function callRoute(route, body) {
  const res = await fetch(`${API_BASE}/ai/${route}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
  prompt,
  systemPrompt,
  responseJsonSchema,
  response_json_schema,
  addContext,
  add_context_from_internet,
  functionName,
}) {
  return callRoute('invoke', {
    prompt,
    system_prompt: systemPrompt,
    response_json_schema: responseJsonSchema || response_json_schema,
    add_context_from_internet: addContext ?? add_context_from_internet,
    function_name: functionName || 'default',
  });
}

// ── Vision AI call ──
export async function callAIVision({
  prompt,
  fileUrls,
  file_urls,
  responseJsonSchema,
  response_json_schema,
  functionName,
}) {
  return callRoute('vision', {
    prompt,
    file_urls: fileUrls || file_urls || [],
    response_json_schema: responseJsonSchema || response_json_schema,
    function_name: functionName || 'vision',
  });
}

// ── Extract data from file ──
export async function extractDataFromFile({ file_url, json_schema, fileUrl, jsonSchema }) {
  return callRoute('extract', {
    file_url: file_url || fileUrl,
    json_schema: json_schema || jsonSchema,
  });
}

// ── Upload file ──
export async function uploadFile(file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/storage/upload`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });
  if (!res.ok) throw new Error('File upload failed');
  return res.json(); // { url, path, size }
}

// ── Send email ──
export async function sendEmail({ to, subject, body, fromName }) {
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

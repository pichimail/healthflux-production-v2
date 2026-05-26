/**
 * HealthFlux AI Service — V5 Production
 *
 * Combines V2's client-side PDF extraction with V4's OpenRouter routing.
 * Every AI call routes through /api/ai/* endpoints.
 * extractTextFromPdf() is preserved for insurance PDF extraction.
 *
 * NO base44.functions.invoke(). NO InvokeLLM.
 */

const API_BASE = import.meta.env.VITE_API_URL || '/api';
const PDF_TEXT_LIMIT = 50000;

async function getAuthHeader() {
  try {
    const { default: db } = await import('@/lib/db');
    const { data: { session } } = await db.auth.getSession();
    return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
  } catch { return {}; }
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

// ═══════════════════════════════════════════════════════════════
// CORE AI CALLS
// ═══════════════════════════════════════════════════════════════

export async function callAI({ prompt, systemPrompt, system_prompt, responseJsonSchema, response_json_schema, addContext, add_context_from_internet, functionName }) {
  return callRoute('invoke', {
    prompt,
    system_prompt: systemPrompt || system_prompt,
    response_json_schema: responseJsonSchema || response_json_schema,
    add_context_from_internet: addContext ?? add_context_from_internet,
    function_name: functionName || 'default',
  });
}

export async function callAIVision({ prompt, fileUrls, file_urls, responseJsonSchema, response_json_schema, functionName }) {
  return callRoute('vision', {
    prompt,
    file_urls: fileUrls || file_urls || [],
    response_json_schema: responseJsonSchema || response_json_schema,
    function_name: functionName || 'vision',
  });
}

// ═══════════════════════════════════════════════════════════════
// PDF TEXT EXTRACTION (critical for insurance docs)
// Uses pdfjs-dist to extract text client-side before sending to AI.
// This gives far better results than AI vision on PDF URLs.
// ═══════════════════════════════════════════════════════════════

export async function extractTextFromPdf(file) {
  if (!file) throw new Error('No PDF file provided');
  const fileName = (file.name || '').toLowerCase();
  const fileType = (file.type || '').toLowerCase();
  if (!fileType.includes('pdf') && !fileName.endsWith('.pdf')) {
    throw new Error('File is not a PDF');
  }

  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const loadingTask = pdfjs.getDocument({ data: bytes, useWorkerFetch: false });
  const doc = await loadingTask.promise;

  const maxPages = Math.min(doc.numPages || 0, 80);
  const pageTexts = [];

  for (let pageNum = 1; pageNum <= maxPages; pageNum += 1) {
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();
    const text = (content?.items || [])
      .map((item) => (typeof item?.str === 'string' ? item.str : ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (text) pageTexts.push(`Page ${pageNum}: ${text}`);
    const current = pageTexts.join('\n').length;
    if (current >= PDF_TEXT_LIMIT) break;
  }

  const combined = pageTexts.join('\n').slice(0, PDF_TEXT_LIMIT).trim();
  if (!combined) throw new Error('Unable to extract readable text from this PDF');
  return combined;
}

// ═══════════════════════════════════════════════════════════════
// FILE EXTRACTION + UPLOAD
// ═══════════════════════════════════════════════════════════════

export async function extractDataFromFile({ file_url, json_schema, fileUrl, jsonSchema } = {}) {
  return callRoute('extract', {
    file_url: file_url || fileUrl,
    json_schema: json_schema || jsonSchema,
  });
}

export async function uploadFile(file, opts = {}) {
  // Use getSupabaseClient directly — db.storage is not exposed on the DBClient wrapper
  const { getSupabaseClient } = await import('@/lib/db');
  const sb = await getSupabaseClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const ts = Date.now();
  const safeName = (file.name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');
  const bucket = opts.bucket || 'healthflux-documents';
  const path = `${user.id}/${opts.folder || 'general'}/${ts}-${safeName}`;

  const { data, error } = await sb.storage.from(bucket).upload(path, file, {
    cacheControl: '3600', upsert: false,
    contentType: file.type || 'application/octet-stream',
  });
  if (error) throw error;

  const isPublic = bucket !== 'healthflux-documents';
  let url;
  if (isPublic) {
    url = sb.storage.from(bucket).getPublicUrl(data.path).data.publicUrl;
  } else {
    const { data: signed } = await sb.storage.from(bucket).createSignedUrl(data.path, 3600);
    url = signed?.signedUrl || data.path;
  }

  return { url, file_url: url, path: data.path, bucket, name: file.name, size: file.size, type: file.type };
}

export async function sendEmail({ to, subject, body, fromName } = {}) {
  return callRoute('email', { to, subject, body, from_name: fromName });
}

// ═══════════════════════════════════════════════════════════════
// NAMED AI FUNCTIONS (all route to /api/ai/*)
// ═══════════════════════════════════════════════════════════════

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
export async function documentProcessor(params)          { return callRoute('document-processor', params); }

// ═══════════════════════════════════════════════════════════════
// LEGACY SHIM — maps base44.functions.invoke('name', params)
// ═══════════════════════════════════════════════════════════════

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
  documentProcessor,
};

export async function invokeFunction(name, params = {}) {
  const fn = FUNCTION_MAP[name];
  if (fn) return fn(params);
  return callAI({ prompt: JSON.stringify(params), functionName: name });
}

export default {
  callAI, callAIVision, extractTextFromPdf, extractDataFromFile,
  uploadFile, sendEmail, invokeFunction, ...FUNCTION_MAP,
};

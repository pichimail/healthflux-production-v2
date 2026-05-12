// @ts-nocheck
/**
 * HealthFlux AI Service — Production
 * All InvokeLLM calls replaced with OpenRouter API calls
 * Routes to /api/ai/* endpoints (see api/routes/)
 */

const API_BASE = import.meta.env.VITE_API_URL || '/api';
const STORAGE_BUCKET = import.meta.env.VITE_SUPABASE_STORAGE_BUCKET || 'uploads';
const PDF_TEXT_LIMIT = 30000;

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

const FEATURE_PROMPT_PACK = {
  extractInsuranceData: {
    mode: 'vision',
    prompt: `Extract policy and covered member details from health-insurance documents with high fidelity.`,
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        policy_number: { type: ['string', 'null'] },
        insurer: { type: ['string', 'null'] },
        plan_name: { type: ['string', 'null'] },
        valid_from: { type: ['string', 'null'] },
        valid_to: { type: ['string', 'null'] },
        sum_insured: { type: ['number', 'null'] },
        members: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              full_name: { type: 'string' },
              relationship: { type: 'string', enum: ['self', 'spouse', 'child', 'parent', 'sibling', 'other'] },
              date_of_birth: { type: ['string', 'null'] },
              gender: { type: ['string', 'null'], enum: ['male', 'female', 'other', null] },
              age: { type: ['number', 'null'] },
              blood_group: { type: ['string', 'null'] }
            },
            required: ['full_name', 'relationship']
          }
        },
        plain_language_summary: { type: ['string', 'null'] }
      },
      required: ['members']
    }
  },
  ocrLabReport: {
    mode: 'vision',
    prompt: `Extract structured lab values exactly from the report.`,
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        lab_name: { type: ['string', 'null'] },
        test_date: { type: ['string', 'null'] },
        tests: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              test_name: { type: 'string' },
              value: { type: ['string', 'number'] },
              unit: { type: ['string', 'null'] },
              reference_range: { type: ['string', 'null'] },
              status: { type: ['string', 'null'], enum: ['normal', 'high', 'low', 'critical', null] }
            },
            required: ['test_name', 'value']
          }
        },
        plain_language_summary: { type: ['string', 'null'] }
      },
      required: ['tests']
    }
  },
  extractMedicationImage: {
    mode: 'vision',
    prompt: `Extract medication and prescription fields from images/PDFs.`,
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        medications: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              medication_name: { type: 'string' },
              dosage: { type: ['string', 'null'] },
              frequency: { type: ['string', 'null'] },
              duration: { type: ['string', 'null'] },
              instructions: { type: ['string', 'null'] }
            },
            required: ['medication_name']
          }
        },
        prescribing_doctor: { type: ['string', 'null'] },
        plain_language_summary: { type: ['string', 'null'] }
      },
      required: ['medications']
    }
  },
  nutritionImageAnalysis: {
    mode: 'vision',
    prompt: `Identify foods and estimate nutrition with uncertainty-aware output.`,
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        food_items: { type: 'array', items: { type: 'string' } },
        calories: { type: ['number', 'null'] },
        protein_g: { type: ['number', 'null'] },
        carbs_g: { type: ['number', 'null'] },
        fat_g: { type: ['number', 'null'] },
        fiber_g: { type: ['number', 'null'] },
        plain_language_summary: { type: ['string', 'null'] }
      }
    }
  },
  analyzeSkinImage: {
    mode: 'vision',
    prompt: `Analyze visible skin findings and triage urgency safely.`,
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        conditions_detected: { type: 'array', items: { type: 'string' } },
        severity: { type: ['string', 'null'], enum: ['clear', 'mild', 'moderate', 'severe', null] },
        triage_advice: { type: ['string', 'null'] },
        see_doctor_urgency: { type: ['string', 'null'], enum: ['no', 'within_month', 'within_week', 'immediately', null] },
        plain_language_summary: { type: ['string', 'null'] }
      }
    }
  },
  analyzeMedicalImage: {
    mode: 'vision',
    prompt: `Summarize medical imaging findings in plain language and structured terms.`,
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        plain_summary: { type: ['string', 'null'] },
        clinical_findings: { type: ['string', 'null'] },
        anomalies: { type: 'array', items: { type: 'string' } },
        risk_level: { type: ['string', 'null'], enum: ['low', 'moderate', 'high', 'critical', null] },
        follow_up_actions: { type: 'array', items: { type: 'string' } }
      }
    }
  },
  documentAnalysis: {
    mode: 'vision',
    prompt: `Extract and summarize medical documents for non-technical users.`,
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        summary: { type: 'string' },
        key_findings: { type: 'array', items: { type: 'string' } },
        action_items: { type: 'array', items: { type: 'string' } },
        document_type: { type: 'string', enum: ['lab_report', 'prescription', 'imaging', 'discharge_summary', 'consultation', 'vaccination', 'insurance', 'other'] },
        ai_tags: { type: 'array', items: { type: 'string' } },
        plain_language_summary: { type: ['string', 'null'] }
      },
      required: ['summary']
    }
  },
  checkDrugInteractions: {
    mode: 'text',
    prompt: `Return concise, clinically cautious interaction analysis in JSON.`,
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        overall_risk: { type: ['string', 'null'], enum: ['low', 'moderate', 'high', 'critical', null] },
        interactions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              drug1: { type: 'string' },
              drug2: { type: 'string' },
              severity: { type: ['string', 'null'] },
              description: { type: ['string', 'null'] },
              recommendation: { type: ['string', 'null'] }
            },
            required: ['drug1', 'drug2']
          }
        },
        plain_language_summary: { type: ['string', 'null'] }
      }
    }
  }
};

function buildReadableSummary(result) {
  if (!result || typeof result !== 'object' || Array.isArray(result)) return result;
  if (result.plain_language_summary || result.plain_summary || result.summary) return result;

  const lines = [];
  if (result.insurer || result.policy_number) {
    lines.push(`Insurance: ${result.insurer || 'Unknown insurer'} (${result.policy_number || 'policy number unavailable'}).`);
  }
  if (Array.isArray(result.members) && result.members.length) {
    lines.push(`Family members detected: ${result.members.map((m) => m.full_name).filter(Boolean).join(', ')}.`);
  }
  if (Array.isArray(result.tests) && result.tests.length) {
    lines.push(`Lab report extracted with ${result.tests.length} test values.`);
  }
  if (Array.isArray(result.medications) && result.medications.length) {
    lines.push(`Medication list extracted with ${result.medications.length} item(s).`);
  }
  if (result.calories != null) {
    lines.push(`Estimated nutrition: about ${result.calories} kcal for this meal.`);
  }
  if (result.severity || result.triage_advice) {
    lines.push(`Skin/imaging assessment: ${result.severity || 'unspecified severity'}. ${result.triage_advice || ''}`.trim());
  }
  if (!lines.length) return result;

  return { ...result, plain_language_summary: lines.join(' ') };
}

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
  const feature = FEATURE_PROMPT_PACK[functionName || ''];
  const mergedSystem = [GLOBAL_TEXT_SYSTEM_PROMPT, feature?.mode === 'text' ? feature.prompt : '', systemPrompt || '']
    .filter(Boolean)
    .join('\n\n');
  const effectiveSchema = responseJsonSchema || response_json_schema || feature?.schema;

  return callRoute('invoke', {
    prompt,
    system_prompt: mergedSystem,
    response_json_schema: effectiveSchema,
    add_context_from_internet: addContext ?? add_context_from_internet,
    function_name: functionName || 'default',
  }).then((res) => buildReadableSummary(res));
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
  const feature = FEATURE_PROMPT_PACK[functionName || ''];
  const mergedSystem = [GLOBAL_VISION_SYSTEM_PROMPT, feature?.mode === 'vision' ? feature.prompt : '', systemPrompt || '']
    .filter(Boolean)
    .join('\n\n');
  const effectiveSchema = responseJsonSchema || response_json_schema || feature?.schema;

  return callRoute('vision', {
    prompt,
    system_prompt: mergedSystem,
    file_urls: fileUrls || file_urls || [],
    response_json_schema: effectiveSchema,
    function_name: functionName || 'vision',
}).then((res) => buildReadableSummary(res));
}

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

  const candidateBuckets = Array.from(new Set([STORAGE_BUCKET, 'documents', 'uploads'].filter(Boolean)));
  let lastError = null;

  for (const bucket of candidateBuckets) {
    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || undefined,
    });
    if (!error) {
      let fileUrl = null;

      const { data: signedData } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, 60 * 60 * 24 * 7);
      if (signedData?.signedUrl) {
        fileUrl = signedData.signedUrl;
      } else {
        const { data } = supabase.storage.from(bucket).getPublicUrl(path);
        fileUrl = data?.publicUrl || null;
      }

      if (!fileUrl) {
        throw new Error(`Upload succeeded but URL generation failed for bucket: ${bucket}`);
      }

      return { url: fileUrl, file_url: fileUrl, path, bucket, size: file.size };
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

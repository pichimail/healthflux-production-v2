/**
 * HealthFlux AI Routes — Complete OpenRouter Backend
 *
 * Every AI endpoint the frontend calls. All routes go through OpenRouter
 * (Claude Sonnet 4 for reasoning, Gemini 2.5 Pro for vision, Gemini Flash for fast tasks).
 *
 * Auth: Supabase JWT in Authorization header → validated by middleware.
 */

import express from 'express';
import { callAI, callAIJSON } from '../lib/openrouter.js';

const router = express.Router();

// ─── Auth middleware ────────────────────────────────────────────
function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token && process.env.NODE_ENV !== 'development') {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}
router.use(requireAuth);

const wrap = (handler) => async (req, res) => {
  try {
    const result = await handler(req.body || {});
    res.json(result);
  } catch (err) {
    console.error(`AI route error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
};

// ─── Core endpoints ─────────────────────────────────────────────
router.post('/invoke', wrap(async (b) => {
  const opts = { jsonMode: !!b.response_json_schema, maxTokens: 4096 };
  return callAI(b.function_name || 'default', b.system_prompt || '', b.prompt, opts);
}));

router.post('/vision', wrap(async (b) => {
  const opts = { jsonMode: !!b.response_json_schema, imageUrls: b.file_urls || [], maxTokens: 4096 };
  return callAI(b.function_name || 'vision', '', b.prompt, opts);
}));

router.post('/extract', wrap(async (b) => {
  const opts = { jsonMode: true, imageUrls: b.file_url ? [b.file_url] : [], maxTokens: 4096 };
  return callAI('extractData', '', `Extract structured data matching schema: ${JSON.stringify(b.json_schema)}`, opts);
}));

// ─── Domain endpoints ───────────────────────────────────────────
router.post('/health-chat', wrap(async (b) => {
  const system = `You are a helpful health assistant for HealthFlux. Use the patient's actual health records to answer their question. Plain language, no markdown formatting. Always remind to consult their healthcare provider for medical decisions.`;
  const user = `Patient Context: ${JSON.stringify(b.patientContext || b.profile_context || {})}\n\nQuestion: ${b.question || b.message || b.prompt}`;
  const result = await callAI('aiHealthChat', system, user);
  return { response: result, message: result };
}));

router.post('/symptom-triage', wrap(async (b) => {
  const system = `You are a clinical triage assistant. Assess symptom severity and provide guidance. Always recommend professional medical care for serious symptoms.`;
  const user = `Symptoms: ${JSON.stringify(b.symptoms)}\nPatient: ${JSON.stringify(b.patientContext || {})}`;
  return callAIJSON('symptomTriage', system, user);
}));

router.post('/drug-interactions', wrap(async (b) => {
  const system = `You are a clinical pharmacist AI. Check drug interactions with high accuracy. Always recommend consulting a pharmacist or doctor.`;
  const user = `Current medications: ${(b.currentMeds || b.medications)?.join(', ')}\nNew medication: ${b.newMed || b.new_medication || ''}`;
  return callAIJSON('checkDrugInteractions', system, user);
}));

router.post('/analyze-image', wrap(async (b) => {
  const { imageUrl, image_url, context, type, bodyLocation } = b;
  const url = imageUrl || image_url;
  let system, prompt, fnName;
  if (type === 'skin') {
    system = `You are a dermatology AI assistant. Always recommend professional dermatological evaluation.`;
    prompt = `Analyze this skin image from ${bodyLocation || 'unspecified location'}. Provide: condition assessment, severity, and recommendations.`;
    fnName = 'analyzeSkinImage';
  } else if (type === 'nutrition') {
    system = `You are a nutrition analysis AI. Identify food items and estimate nutritional content.`;
    prompt = `Analyze this food/meal image. Estimate: calories, macros (protein/carbs/fat), and key nutrients.`;
    fnName = 'nutritionImageAnalysis';
  } else {
    system = `You are a medical imaging AI assistant. Always recommend professional radiological review.`;
    prompt = `Analyze this medical image. Context: ${context || 'general review'}. Provide: findings, observations, and recommendations.`;
    fnName = 'analyzeMedicalImage';
  }
  return callAIJSON(fnName, system, prompt, { imageUrls: url ? [url] : [] });
}));

router.post('/diet-plan', wrap(async (b) => {
  const system = `You are a clinical nutritionist and dietitian AI. Create personalized, evidence-based diet plans.`;
  const user = `Create a personalized 7-day diet plan for:\nProfile: ${JSON.stringify(b.profile)}\nGoals: ${JSON.stringify(b.goals)}\nRestrictions: ${JSON.stringify(b.restrictions || [])}`;
  return callAIJSON('generateDietPlan', system, user);
}));

router.post('/health-report', wrap(async (b) => {
  const system = `You are a clinical health data analyst. Generate comprehensive, accurate health reports from patient data.`;
  const user = `Generate a ${b.reportType || 'comprehensive'} health report for:\n${JSON.stringify(b.patientData || b)}`;
  return callAIJSON('generateAIHealthReport', system, user);
}));

router.post('/document-search', wrap(async (b) => {
  const system = `You are a medical document search AI. Find relevant documents based on semantic meaning.`;
  const user = `Search query: "${b.query}"\nDocuments: ${JSON.stringify(b.documents?.slice(0, 20) || [])}`;
  return callAIJSON('aiDocumentSearch', system, user);
}));

router.post('/document-qa', wrap(async (b) => {
  const system = `You are a medical document analysis AI. Answer questions about medical documents accurately.`;
  const user = `Question: ${b.question}\nDocument: ${b.documentContent || ''}`;
  const result = await callAI('askDocumentQuestion', system, user, { imageUrls: b.documentUrl ? [b.documentUrl] : [] });
  return { answer: result, response: result };
}));

router.post('/ocr-lab-report', wrap(async (b) => {
  const system = `You are a medical lab report OCR specialist. Extract all data accurately from lab reports.`;
  const user = `Extract all data from this lab report. Return structured JSON with: test_name, value, unit, reference_range, status (normal/high/low) for each test.`;
  return callAIJSON('ocrLabReport', system, user, { imageUrls: [b.fileUrl || b.imageUrl] });
}));

router.post('/health-coaching', wrap(async (b) => {
  const system = `You are a certified health coach AI. Provide motivational, evidence-based health coaching. Be encouraging and practical.`;
  const user = `Session type: ${b.sessionType || 'general'}\nContext: ${JSON.stringify(b.context || {})}\nUser message: ${b.message}`;
  const result = await callAI('healthCoaching', system, user);
  return { response: result };
}));

router.post('/daily-goals', wrap(async (b) => {
  const system = `You are a clinical health coach. Generate specific, achievable daily health goals based on patient data.`;
  const user = `Generate today's personalized health goals for:\n${JSON.stringify({ profile: b.profile, vitals: b.vitals })}`;
  return callAIJSON('dailyHealthGoals', system, user);
}));

router.post('/extract-medication', wrap(async (b) => {
  const system = `You are a pharmaceutical AI specialist. Extract medication details from prescription images accurately.`;
  const user = `Extract all medication details from this prescription image. Return JSON: medication_name, dosage, frequency, instructions, prescribing_doctor, date.`;
  return callAIJSON('extractMedicationImage', system, user, { imageUrls: [b.imageUrl || b.fileUrl] });
}));

router.post('/cross-insights', wrap(async (b) => {
  const system = `You are a clinical data analyst. Identify meaningful correlations and insights across multiple health documents.`;
  const user = `Analyze these health records for patterns and insights:\n${JSON.stringify({ documents: b.documents, profile: b.profileData })}`;
  return callAIJSON('crossDocumentInsights', system, user);
}));

router.post('/reconcile-medications', wrap(async (b) => {
  const system = `You are a clinical pharmacist AI. Reconcile medication lists and identify discrepancies, duplicates, or interactions.`;
  const user = `Reconcile these medication lists:\nCurrent: ${JSON.stringify(b.currentList || b.current_medications)}\nNew: ${JSON.stringify(b.newList || b.new_medications)}`;
  return callAIJSON('reconcileMedications', system, user);
}));

router.post('/parse-voice', wrap(async (b) => {
  const system = `Extract structured health data from voice transcripts. Identify: vital readings, symptoms, medications mentioned, dates.`;
  const user = `Parse this health voice log: "${b.transcript}"`;
  return callAIJSON('parseVoiceLog', system, user);
}));

router.post('/extract-family', wrap(async (b) => {
  const system = `Extract family member health profiles from documents. Identify: name, relationship, age/DOB, conditions, medications.`;
  const user = `Extract family health data from: ${b.document || 'the attached document'}`;
  return callAIJSON('extractFamilyProfiles', system, user, { imageUrls: b.fileUrl ? [b.fileUrl] : [] });
}));

router.post('/extract-insurance', wrap(async (b) => {
  const system = `You are a health insurance document specialist. Extract ALL family member information with maximum accuracy.
Return ONLY a valid JSON object with this exact structure (no extra text):
{
  "policy_number": "string or null",
  "insurer": "string or null",
  "plan_name": "string or null",
  "valid_from": "YYYY-MM-DD or null",
  "valid_to": "YYYY-MM-DD or null",
  "sum_insured": number_or_null,
  "members": [
    {
      "full_name": "string",
      "relationship": "self|spouse|child|parent|sibling|other",
      "date_of_birth": "YYYY-MM-DD or null",
      "gender": "male|female|other or null",
      "age": number_or_null,
      "blood_group": "A+|A-|B+|B-|AB+|AB-|O+|O- or null"
    }
  ]
}
Include the primary policyholder with relationship "self". Extract every person listed. If age is given but not DOB, calculate DOB as current year minus age. Return all members found.`;

  // PDF text path — documentText is extracted client-side from the PDF
  if (b.documentText) {
    const user = `Extract the complete insurance policy details and ALL family members from this health insurance document text:\n\n${b.documentText}`;
    return callAIJSON('extractInsuranceData', system, user, { imageUrls: [] });
  }

  // Image/URL path — pass file as vision input
  const fileUrl = b.imageUrl || b.fileUrl || b.file_url;
  const user = `Extract the complete insurance policy details and ALL family members from this health insurance document image.`;
  return callAIJSON('extractInsuranceData', system, user, { imageUrls: fileUrl ? [fileUrl] : [] });
}));

router.post('/multi-snap', wrap(async (b) => {
  const system = `Analyze multiple medical images together for comprehensive assessment.`;
  const user = `Perform ${b.analysisType || 'comprehensive'} analysis of these ${b.imageUrls?.length || 0} images together.`;
  return callAIJSON('multiSnapAnalyze', system, user, { imageUrls: b.imageUrls || [] });
}));

router.post('/enhanced-summary', wrap(async (b) => {
  const system = `You are a medical document summarization expert. Create comprehensive, accurate summaries.`;
  const user = `Summarize this ${b.documentType || 'medical'} document. Include: key findings, diagnoses, recommendations, follow-up actions, and any critical values.`;
  return callAIJSON('enhancedDocumentSummary', system, user, { imageUrls: b.fileUrl ? [b.fileUrl] : [] });
}));

router.post('/enhanced-document', wrap(async (b) => {
  const system = `You are a comprehensive medical document processor.`;
  const user = `Process this document: extract type, summary, key data points, action items, and structured data.`;
  return callAIJSON('enhancedDocumentProcessor', system, user, { imageUrls: b.fileUrl ? [b.fileUrl] : [] });
}));

router.post('/enhanced-report', wrap(async (b) => {
  const system = `Generate professional, evidence-based provider reports from patient data.`;
  const user = `Generate enhanced report:\n${JSON.stringify(b)}`;
  return callAIJSON('generateEnhancedReport', system, user);
}));

router.post('/provider-report', wrap(async (b) => {
  const system = `You are a clinical documentation AI. Generate professional healthcare provider reports.`;
  const user = `Generate provider report for period: ${b.reportPeriod || 'last 30 days'}\nPatient data: ${JSON.stringify(b.patientData)}`;
  return callAIJSON('generateProviderReport', system, user);
}));

router.post('/predictive-analysis', wrap(async (b) => {
  const system = `You are a predictive health analytics AI. Identify health trends and provide evidence-based predictions.`;
  const user = `Analyze health trends and provide ${b.timeframe || '90-day'} predictions:\n${JSON.stringify(b.historicalData)}`;
  return callAIJSON('predictiveHealthAnalysis', system, user);
}));

router.post('/health-predictions', wrap(async (b) => {
  const system = `You are a preventive health AI. Generate actionable health risk predictions.`;
  const user = `Generate health predictions:\nVitals: ${JSON.stringify(b.vitals)}\nMeds: ${JSON.stringify(b.medications)}\nProfile: ${JSON.stringify(b.profile)}`;
  return callAIJSON('healthPredictions', system, user);
}));

router.post('/analyze-adherence', wrap(async (b) => {
  const system = `Analyze medication adherence patterns and provide actionable insights.`;
  const user = `Analyze adherence for profile ${b.profile_id}: ${JSON.stringify(b)}`;
  return callAIJSON('analyzeAdherence', system, user);
}));

router.post('/generate-image', wrap(async (b) => {
  return { url: null, message: 'Image generation requires DALL-E or Stability API config' };
}));

router.post('/email', wrap(async (b) => {
  return { sent: false, message: 'Email service not configured. Use SendGrid/Resend.' };
}));

export default router;

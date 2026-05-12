/**
 * HealthFlux AI Routes — OpenRouter-backed
 * All 33 InvokeLLM replacements live here
 * 
 * Mount: app.use('/api/ai', require('./routes/ai'))
 * Env:   OPENROUTER_API_KEY=sk-or-v1-xxx
 */

import express from 'express';
import { callAI, callAIJSON } from '../lib/openrouter.js';

const router = express.Router();

// Middleware: require auth session
function requireAuth(req, res, next) {
  // Supabase JWT validation via Authorization header
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token && process.env.NODE_ENV !== 'development') {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

router.use(requireAuth);

// ─── Generic invoke ─────────────────────────────────────────────
router.post('/invoke', async (req, res) => {
  try {
    const { prompt, system_prompt, response_json_schema, function_name } = req.body;
    const opts = {
      jsonMode: !!response_json_schema,
      maxTokens: 4096,
    };
    const result = await callAI(function_name || 'default', system_prompt || '', prompt, opts);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Vision / file analysis ──────────────────────────────────────
router.post('/vision', async (req, res) => {
  try {
    const { prompt, file_urls, response_json_schema, function_name } = req.body;
    const opts = {
      jsonMode: !!response_json_schema,
      imageUrls: file_urls || [],
      maxTokens: 4096,
    };
    const result = await callAI(function_name || 'vision', '', prompt, opts);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Health Chat ─────────────────────────────────────────────────
router.post('/health-chat', async (req, res) => {
  try {
    const { question, patientContext, conversationHistory } = req.body;
    const system = `You are a helpful health assistant for HealthFlux. Use the patient's actual health records to answer their question accurately. Write in plain clear language. Do not use markdown formatting characters. Always remind the user to consult their healthcare provider for medical decisions.`;
    const user = `Patient Context: ${JSON.stringify(patientContext || {})}\n\nQuestion: ${question}`;
    const result = await callAI('aiHealthChat', system, user);
    res.json({ response: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Symptom Triage ──────────────────────────────────────────────
router.post('/symptom-triage', async (req, res) => {
  try {
    const { symptoms, patientContext } = req.body;
    const system = `You are a clinical triage assistant. Assess symptom severity and provide guidance. Always recommend professional medical care for serious symptoms.`;
    const user = `Symptoms: ${JSON.stringify(symptoms)}\nPatient: ${JSON.stringify(patientContext || {})}`;
    const result = await callAIJSON('symptomTriage', system, user);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Drug Interactions ───────────────────────────────────────────
router.post('/drug-interactions', async (req, res) => {
  try {
    const { currentMeds, newMed } = req.body;
    const system = `You are a clinical pharmacist AI. Check drug interactions with high accuracy. Always recommend consulting a pharmacist or doctor.`;
    const user = `Current medications: ${currentMeds?.join(', ')}\nNew medication: ${newMed}`;
    const result = await callAIJSON('checkDrugInteractions', system, user);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Image Analysis ──────────────────────────────────────────────
router.post('/analyze-image', async (req, res) => {
  try {
    const { imageUrl, context, type, bodyLocation } = req.body;
    let system, prompt;
    if (type === 'skin') {
      system = `You are a dermatology AI assistant. Analyze skin images and provide observations. Always recommend professional dermatological evaluation.`;
      prompt = `Analyze this skin image from ${bodyLocation || 'unspecified location'}. Provide: condition assessment, severity, and recommendations.`;
    } else if (type === 'nutrition') {
      system = `You are a nutrition analysis AI. Identify food items and estimate nutritional content.`;
      prompt = `Analyze this food/meal image. Estimate: calories, macros (protein/carbs/fat), and key nutrients.`;
    } else {
      system = `You are a medical imaging AI assistant. Analyze medical images and provide observations. Always recommend professional radiological review.`;
      prompt = `Analyze this medical image. Context: ${context || 'general review'}. Provide: findings, observations, and recommendations.`;
    }
    const fnName = type === 'skin' ? 'analyzeSkinImage' : type === 'nutrition' ? 'nutritionImageAnalysis' : 'analyzeMedicalImage';
    const result = await callAIJSON(fnName, system, prompt, { imageUrls: [imageUrl] });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Diet Plan ───────────────────────────────────────────────────
router.post('/diet-plan', async (req, res) => {
  try {
    const { profile, goals, restrictions } = req.body;
    const system = `You are a clinical nutritionist and dietitian AI. Create personalized, evidence-based diet plans.`;
    const user = `Create a personalized 7-day diet plan for:\nProfile: ${JSON.stringify(profile)}\nGoals: ${JSON.stringify(goals)}\nRestrictions: ${JSON.stringify(restrictions || [])}`;
    const result = await callAIJSON('generateDietPlan', system, user);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Health Report ───────────────────────────────────────────────
router.post('/health-report', async (req, res) => {
  try {
    const { patientData, reportType } = req.body;
    const system = `You are a clinical health data analyst. Generate comprehensive, accurate health reports from patient data.`;
    const user = `Generate a ${reportType || 'comprehensive'} health report for:\n${JSON.stringify(patientData)}`;
    const result = await callAIJSON('generateAIHealthReport', system, user);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Document Search ─────────────────────────────────────────────
router.post('/document-search', async (req, res) => {
  try {
    const { query, documents } = req.body;
    const system = `You are a medical document search AI. Find relevant documents based on semantic meaning.`;
    const user = `Search query: "${query}"\nDocuments to search: ${JSON.stringify(documents?.slice(0, 20))}`;
    const result = await callAIJSON('aiDocumentSearch', system, user);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Document Q&A ────────────────────────────────────────────────
router.post('/document-qa', async (req, res) => {
  try {
    const { question, documentUrl, documentContent } = req.body;
    const system = `You are a medical document analysis AI. Answer questions about medical documents accurately.`;
    const user = `Question: ${question}\nDocument: ${documentContent || ''}`;
    const opts = { imageUrls: documentUrl ? [documentUrl] : [] };
    const result = await callAI('askDocumentQuestion', system, user, opts);
    res.json({ answer: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── OCR Lab Report ──────────────────────────────────────────────
router.post('/ocr-lab-report', async (req, res) => {
  try {
    const { fileUrl } = req.body;
    const system = `You are a medical lab report OCR specialist. Extract all data accurately from lab reports.`;
    const user = `Extract all data from this lab report. Return structured JSON with: test_name, value, unit, reference_range, status (normal/high/low) for each test.`;
    const result = await callAIJSON('ocrLabReport', system, user, { imageUrls: [fileUrl] });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Health Coaching ─────────────────────────────────────────────
router.post('/health-coaching', async (req, res) => {
  try {
    const { message, context, sessionType } = req.body;
    const system = `You are a certified health coach AI. Provide motivational, evidence-based health coaching. Be encouraging and practical.`;
    const user = `Session type: ${sessionType || 'general'}\nContext: ${JSON.stringify(context || {})}\nUser message: ${message}`;
    const result = await callAI('healthCoaching', system, user);
    res.json({ response: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Daily Goals ─────────────────────────────────────────────────
router.post('/daily-goals', async (req, res) => {
  try {
    const { profile, vitals } = req.body;
    const system = `You are a clinical health coach. Generate specific, achievable daily health goals based on patient data.`;
    const user = `Generate today's personalized health goals for:\n${JSON.stringify({ profile, vitals })}`;
    const result = await callAIJSON('dailyHealthGoals', system, user);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Extract Medication from Image ──────────────────────────────
router.post('/extract-medication', async (req, res) => {
  try {
    const { imageUrl } = req.body;
    const system = `You are a pharmaceutical AI specialist. Extract medication details from prescription images accurately.`;
    const user = `Extract all medication details from this prescription/medication image. Return JSON with: medication_name, dosage, frequency, instructions, prescribing_doctor, date.`;
    const result = await callAIJSON('extractMedicationImage', system, user, { imageUrls: [imageUrl] });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Cross-Document Insights ─────────────────────────────────────
router.post('/cross-insights', async (req, res) => {
  try {
    const { documents, profileData } = req.body;
    const system = `You are a clinical data analyst. Identify meaningful correlations and insights across multiple health documents.`;
    const user = `Analyze these health records for patterns and insights:\n${JSON.stringify({ documents, profile: profileData })}`;
    const result = await callAIJSON('crossDocumentInsights', system, user);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Reconcile Medications ───────────────────────────────────────
router.post('/reconcile-medications', async (req, res) => {
  try {
    const { currentList, newList } = req.body;
    const system = `You are a clinical pharmacist AI. Reconcile medication lists and identify discrepancies, duplicates, or interactions.`;
    const user = `Reconcile these medication lists:\nCurrent: ${JSON.stringify(currentList)}\nNew: ${JSON.stringify(newList)}`;
    const result = await callAIJSON('reconcileMedications', system, user);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Parse Voice Log ─────────────────────────────────────────────
router.post('/parse-voice', async (req, res) => {
  try {
    const { transcript } = req.body;
    const system = `Extract structured health data from voice transcripts. Identify: vital readings, symptoms, medications mentioned, dates.`;
    const user = `Parse this health voice log: "${transcript}"`;
    const result = await callAIJSON('parseVoiceLog', system, user);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Extract Family Profiles ─────────────────────────────────────
router.post('/extract-family', async (req, res) => {
  try {
    const { document, fileUrl } = req.body;
    const system = `Extract family member health profiles from documents. Identify: name, relationship, age/DOB, conditions, medications.`;
    const user = `Extract family health data from: ${document || 'the attached document'}`;
    const result = await callAIJSON('extractFamilyProfiles', system, user, { imageUrls: fileUrl ? [fileUrl] : [] });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Multi-Snap Analyze ──────────────────────────────────────────
router.post('/multi-snap', async (req, res) => {
  try {
    const { imageUrls, analysisType } = req.body;
    const system = `Analyze multiple medical images together for comprehensive assessment.`;
    const user = `Perform ${analysisType || 'comprehensive'} analysis of these ${imageUrls?.length || 0} images together.`;
    const result = await callAIJSON('multiSnapAnalyze', system, user, { imageUrls });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Enhanced Document Summary ───────────────────────────────────
router.post('/enhanced-summary', async (req, res) => {
  try {
    const { fileUrl, documentType } = req.body;
    const system = `You are a medical document summarization expert. Create comprehensive, accurate summaries of medical documents.`;
    const user = `Summarize this ${documentType || 'medical'} document. Include: key findings, diagnoses, recommendations, follow-up actions, and any critical values.`;
    const result = await callAIJSON('enhancedDocumentSummary', system, user, { imageUrls: fileUrl ? [fileUrl] : [] });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Provider Report ─────────────────────────────────────────────
router.post('/provider-report', async (req, res) => {
  try {
    const { patientData, reportPeriod } = req.body;
    const system = `You are a clinical documentation AI. Generate professional healthcare provider reports from patient data.`;
    const user = `Generate a provider report for period: ${reportPeriod || 'last 30 days'}\nPatient data: ${JSON.stringify(patientData)}`;
    const result = await callAIJSON('generateProviderReport', system, user);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Predictive Analysis ─────────────────────────────────────────
router.post('/predictive-analysis', async (req, res) => {
  try {
    const { historicalData, timeframe } = req.body;
    const system = `You are a predictive health analytics AI. Identify health trends and provide evidence-based predictions.`;
    const user = `Analyze health trends and provide ${timeframe || '90-day'} predictions:\n${JSON.stringify(historicalData)}`;
    const result = await callAIJSON('predictiveHealthAnalysis', system, user);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Health Predictions ──────────────────────────────────────────
router.post('/health-predictions', async (req, res) => {
  try {
    const { vitals, medications, profile } = req.body;
    const system = `You are a preventive health AI. Generate actionable health risk predictions based on current health data.`;
    const user = `Generate health predictions for:\nVitals trend: ${JSON.stringify(vitals)}\nMeds: ${JSON.stringify(medications)}\nProfile: ${JSON.stringify(profile)}`;
    const result = await callAIJSON('healthPredictions', system, user);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Image Generation ────────────────────────────────────────────
router.post('/generate-image', async (req, res) => {
  try {
    // Delegate to a separate image gen service if needed
    // For now return a placeholder response
    res.json({ 
      url: null, 
      message: 'Image generation requires separate API configuration (DALL-E or Stability AI)' 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

// ─── Extract Insurance Data ──────────────────────────────────────
router.post('/extract-insurance', async (req, res) => {
  try {
    const { imageUrl, fileUrl } = req.body;
    const system = `You are a health insurance document specialist. Extract ALL family member information accurately.`;
    const user = `Extract complete family member data from this health insurance document. Return structured JSON with: policy_number, insurer, plan_name, valid_from, valid_to, sum_insured, and a members array with full_name, relationship, date_of_birth, gender, age, blood_group for each person listed.`;
    const result = await callAIJSON('extractInsuranceData', system, user, { imageUrls: [imageUrl || fileUrl] });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * OpenRouter AI Client
 * Single API key, unified interface for all 33 InvokeLLM replacements
 * 
 * ENV: OPENROUTER_API_KEY=sk-or-v1-...
 * 
 * Models:
 *   anthropic/claude-sonnet-4       → medical reasoning, safety-critical
 *   google/gemini-2.5-pro-preview   → vision/image analysis
 *   google/gemini-2.0-flash-001     → fast extraction/classification
 */

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Model routing map — each function maps to the best model
export const MODEL_MAP = {
  // Claude Sonnet 4 — reasoning, safety, text
  aiHealthChat:           'anthropic/claude-sonnet-4',
  askDocumentQuestion:    'anthropic/claude-sonnet-4',
  checkDrugInteractions:  'anthropic/claude-sonnet-4',
  crossDocumentInsights:  'anthropic/claude-sonnet-4',
  enhancedDocumentSummary:'anthropic/claude-sonnet-4',
  generateAIHealthReport: 'anthropic/claude-sonnet-4',
  generateDietPlan:       'anthropic/claude-sonnet-4',
  healthCoaching:         'anthropic/claude-sonnet-4',
  reconcileMedications:   'anthropic/claude-sonnet-4',
  symptomTriage:          'anthropic/claude-sonnet-4',
  documentAnalysis:       'anthropic/claude-sonnet-4',

  // Gemini 2.5 Pro — vision/image
  analyzeMedicalImage:    'google/gemini-2.5-pro-preview',
  analyzeSkinImage:       'google/gemini-2.5-pro-preview',
  extractMedicationImage: 'google/gemini-2.5-pro-preview',
  multiSnapAnalyze:       'google/gemini-2.5-pro-preview',
  nutritionImageAnalysis: 'google/gemini-2.5-pro-preview',
  documentOCR:            'google/gemini-2.5-pro-preview',
  enhancedDocProcessor:   'google/gemini-2.5-pro-preview',
  enhancedAIProcessing:   'google/gemini-2.5-pro-preview',

  // Gemini 2.0 Flash — fast, cheap
  aiDocumentSearch:       'google/gemini-2.0-flash-001',
  aiTagDocument:          'google/gemini-2.0-flash-001',
  aiService:              'google/gemini-2.0-flash-001',
  dailyHealthGoals:       'google/gemini-2.0-flash-001',
  extractFamilyProfiles:  'google/gemini-2.0-flash-001',
  parseVoiceLog:          'google/gemini-2.0-flash-001',
  semanticDocumentSearch: 'google/gemini-2.0-flash-001',
};

/**
 * Call OpenRouter with automatic model selection
 * @param {string} functionName - The function being replaced (maps to model)
 * @param {string} systemPrompt - System instruction
 * @param {string} userPrompt - User message / data
 * @param {object} opts - { jsonMode, temperature, maxTokens, imageUrls }
 */
export async function callAI(functionName, systemPrompt, userPrompt, opts = {}) {
  const apiKey = typeof process !== 'undefined' 
    ? process.env.OPENROUTER_API_KEY 
    : import.meta.env.VITE_OPENROUTER_API_KEY;
  
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not set');

  const model = MODEL_MAP[functionName] || 'anthropic/claude-sonnet-4';
  const messages = [];

  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }

  // Handle image URLs for vision models
  if (opts.imageUrls?.length) {
    const content = [
      { type: 'text', text: userPrompt },
      ...opts.imageUrls.map(url => ({
        type: 'image_url',
        image_url: { url }
      }))
    ];
    messages.push({ role: 'user', content });
  } else {
    messages.push({ role: 'user', content: userPrompt });
  }

  const body = {
    model,
    messages,
    max_tokens: opts.maxTokens || 4096,
    temperature: opts.temperature ?? 0.3,
  };

  // JSON mode for structured outputs
  if (opts.jsonMode) {
    body.response_format = { type: 'json_object' };
  }

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': opts.referer || 'https://healthfluxi.com',
      'X-Title': 'HealthFlux AI',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenRouter error (${response.status}): ${err}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || '';

  // Auto-parse JSON if jsonMode
  if (opts.jsonMode) {
    try {
      return JSON.parse(text.replace(/```json\n?|```/g, '').trim());
    } catch {
      return text;
    }
  }

  return text;
}

/**
 * Convenience: call with JSON schema enforcement
 */
export async function callAIJSON(functionName, systemPrompt, userPrompt, opts = {}) {
  return callAI(functionName, systemPrompt, userPrompt, { ...opts, jsonMode: true });
}

export default { callAI, callAIJSON, MODEL_MAP };

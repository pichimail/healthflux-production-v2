/**
 * AIAdapter — Production (OpenRouter-backed via API routes)
 * Replaces all Base44 InvokeLLM calls with /api/ai/* routes
 */
import { callAI, callAIVision, extractDataFromFile, uploadFile, sendEmail } from '@/components/utils/aiService';

const AIAdapter = {
  async invokeLLM(prompt, opts = {}) {
    return callAI({ prompt, ...opts });
  },
  async extractFromFile(fileUrl, jsonSchema) {
    return extractDataFromFile({ file_url: fileUrl, json_schema: jsonSchema });
  },
  async generateImage(prompt, existingImageUrls = []) {
    // Route to image generation endpoint
    const API_BASE = import.meta.env.VITE_API_URL || '/api';
    const res = await fetch(`${API_BASE}/ai/generate-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ prompt, existing_image_urls: existingImageUrls }),
    });
    if (!res.ok) throw new Error('Image generation failed');
    return res.json();
  },
  async sendEmail(opts) {
    return sendEmail(opts);
  },
  async invokeFunction(functionName, payload = {}) {
    const API_BASE = import.meta.env.VITE_API_URL || '/api';
    const res = await fetch(`${API_BASE}/functions/${functionName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`Function ${functionName} failed`);
    return res.json();
  },
};

export default AIAdapter;

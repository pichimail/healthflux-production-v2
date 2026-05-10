/**
 * integrations.js — Production Shim
 * 
 * All integrations now route through API endpoints instead of Base44 SDK.
 * This file maintains backward compatibility for any direct imports.
 */
import { callAI, callAIVision, extractDataFromFile, uploadFile, sendEmail } from '@/components/utils/aiService';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export const InvokeLLM = async (params) => callAI(params);
export const SendEmail = async (params) => sendEmail(params);
export const SendSMS = async (params) => {
  console.warn('SMS not configured. Implement via Twilio API.');
  return null;
};
export const UploadFile = async ({ file }) => uploadFile(file);
export const GenerateImage = async (params) => {
  const res = await fetch(`${API_BASE}/ai/generate-image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return res.json();
};
export const ExtractDataFromUploadedFile = async (params) => extractDataFromFile(params);

export const Core = { InvokeLLM, SendEmail, SendSMS, UploadFile, GenerateImage, ExtractDataFromUploadedFile };

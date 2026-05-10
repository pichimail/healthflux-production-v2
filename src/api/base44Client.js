/**
 * base44Client.js — MIGRATION SHIM
 * 
 * This file replaces the old @base44/sdk-based client.
 * It re-exports the drop-in dbClient as `base44` so ALL existing
 * imports of `@/api/base44Client` continue to work without changes.
 * 
 * Old: import { createClient } from '@base44/sdk' → REMOVED
 * New: base44.entities.X   → Supabase tables via dbClient
 *      base44.auth.me()    → Supabase Auth via dbClient
 *      base44.functions.invoke() → /api/* routes via dbClient
 *      base44.integrations.Core.InvokeLLM → /api/ai/invoke via dbClient
 */

import { base44 as _base44 } from './dbClient';

// Re-export as named export (existing code: import { base44 } from '@/api/base44Client')
export const base44 = _base44;

// Also provide integrations shim for any direct InvokeLLM calls
// These route to /api/ai/* instead of the old Base44 SDK
export default base44;

/**
 * base44Client.js — Production Migration Shim (no Base44 SDK)
 *
 * Backward-compat surface for ~100 existing files:
 *   base44.auth.X         → Supabase Auth via dbClient
 *   base44.entities.X     → Supabase tables via dbClient
 *   base44.functions.X    → /api/ai/* routes via aiService.invokeFunction
 *   base44.integrations.X → /api/ai/* + Supabase Storage
 *
 * No external SDK. No InvokeLLM. No Base44 dependencies.
 */
import { base44 as dbBase44 } from './dbClient';
import { Core as IntegrationsCore } from './integrations';
import { invokeFunction as runAIFunction } from '@/components/utils/aiService';

// Functions proxy: base44.functions.invoke('functionName', params)
const functionsProxy = {
  invoke: async (name, params = {}) => {
    try {
      const result = await runAIFunction(name, params);
      // Base44 SDK returns { data: ... } shape; preserve that for legacy callers
      return result?.data !== undefined ? result : { data: result };
    } catch (err) {
      console.error(`functions.invoke(${name}) failed:`, err);
      throw err;
    }
  },
};

// Build a Proxy that catches any unknown functions.X() call too
const functionsProxyAll = new Proxy(functionsProxy, {
  get(target, prop) {
    if (prop in target) return target[prop];
    if (typeof prop !== 'string') return undefined;
    // base44.functions.aiHealthChat(params) → invoke('aiHealthChat', params)
    return (params = {}) => functionsProxy.invoke(prop, params);
  },
});

// Compose the final base44 surface
export const base44 = {
  ...dbBase44,
  functions: functionsProxyAll,
  integrations: {
    Core: IntegrationsCore,
  },
};

export default base44;

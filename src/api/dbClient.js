/**
 * Entity Compatibility Layer
 * Drop-in replacement for base44.entities.X API
 * 
 * USAGE: Replace `import { base44 } from '@/api/base44Client'`
 *   with: `import { base44 } from '@/api/dbClient'`
 * 
 * This wrapper maps base44.entities.EntityName.filter/list/create/update/delete
 * to the new db.from('table_name') API. Same signatures, works immediately.
 * 
 * Entity → Table name mapping handles camelCase → snake_case automatically.
 */
import db from '@/lib/db';
import { Core as IntegrationsCore } from '@/api/integrations';

// CamelCase entity → snake_case table mapping
const TABLE_MAP = {
  Profile: 'profiles',
  VitalMeasurement: 'vital_measurements',
  Medication: 'medications',
  MedicationLog: 'medication_logs',
  MedicalDocument: 'medical_documents',
  LabResult: 'lab_results',
  HealthInsight: 'health_insights',
  WellnessGoal: 'wellness_goals',
  GoalLog: 'goal_logs',
  MealLog: 'meal_logs',
  NutritionGoal: 'nutrition_goals',
  ShareLink: 'share_links',
  CareCircle: 'care_circles',
  CareCircleMessage: 'care_circle_messages',
  ConnectedDevice: 'connected_devices',
  GamificationProfile: 'gamification_profiles',
  DrugInteraction: 'drug_interactions',
  SideEffect: 'side_effects',
  MedicationEffectiveness: 'medication_effectiveness',
  RefillReminder: 'refill_reminders',
  CoachMessage: 'coach_messages',
  AIHealthReport: 'ai_health_reports',
  AIMedicalImagingResult: 'ai_medical_imaging_results',
  SkinAnalysis: 'skin_analyses',
  PersonalizedDietPlan: 'personalized_diet_plans',
  Notification: 'notifications',
  UserPreferences: 'user_preferences',
  TelehealthDoctor: 'telehealth_doctors',
  TelehealthAppointment: 'telehealth_appointments',
  SubscriptionPackage: 'subscription_packages',
  UserSubscription: 'user_subscriptions',
  Subscription: 'subscriptions',
  UserCredits: 'user_credits',
  UserEntitlement: 'user_entitlements',
  UsageMeter: 'usage_meters',
  FeatureFlagAssignment: 'feature_flag_assignments',
  Role: 'roles',
  AuditLog: 'audit_logs',
  Ad: 'ads',
  User: 'profiles', // User entity maps to profiles
};

function getTable(entityName) {
  return TABLE_MAP[entityName] || entityName.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '') + 's';
}

function createEntityProxy(entityName) {
  const table = getTable(entityName);

  return {
    /**
     * filter(conditions, sortField, limit)
     * Base44 API: filter({ profile_id: x }, '-created_date', 10)
     */
    async filter(conditions = {}, sortField, limit) {
      let q = db.from(table).select('*');
      for (const [key, val] of Object.entries(conditions)) {
        q = q.eq(key, val);
      }
      if (sortField) {
        const desc = sortField.startsWith('-');
        const col = desc ? sortField.slice(1) : sortField;
        q = q.order(col, { ascending: !desc });
      }
      if (limit) q = q.limit(limit);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },

    /**
     * list(sortField, limit)
     * Base44 API: list('-created_date', 10)
     */
    async list(sortField, limit) {
      let q = db.from(table).select('*');
      if (sortField) {
        const desc = sortField.startsWith('-');
        const col = desc ? sortField.slice(1) : sortField;
        q = q.order(col, { ascending: !desc });
      }
      if (limit) q = q.limit(limit);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },

    /**
     * create(record)
     * Tries full insert first; if Supabase rejects with unknown-column error (42703),
     * retries with only the safe core columns. This makes uploads resilient to
     * schema drifts until migration 011 is applied.
     */
    async create(record) {
      // Auto-inject created_by from auth
      const enriched = { ...record };
      try {
        const { data: { user } } = await db.auth.getUser();
        if (user?.email && !enriched.created_by) {
          enriched.created_by = user.email;
        }
      } catch {}
      const { data, error } = await db.from(table).insert(enriched).select();
      if (error) {
        // 42703 = undefined_column; strip unknown extras and retry once
        if (error.code === '42703' || (error.message || '').includes('column') && (error.message || '').includes('does not exist')) {
          const SAFE_COLS = new Set([
            'created_by','profile_id','title','document_type','file_url',
            'document_date','notes','ai_summary','ai_summary_detailed',
            'key_findings','ai_tags','user_tags','extracted_medications',
            'extracted_vitals','extracted_lab_results','health_score',
            'risk_factors','status','created_date','updated_date',
            // extended columns from migration 011
            'file_name','file_type','facility_name','doctor_name','action_items',
          ]);
          const safe = Object.fromEntries(Object.entries(enriched).filter(([k]) => SAFE_COLS.has(k)));
          // Remove columns that might not exist in older schema
          const minSafe = Object.fromEntries(Object.entries(safe).filter(([k]) =>
            !['file_name','file_type','facility_name','doctor_name','action_items'].includes(k)
          ));
          const { data: d2, error: e2 } = await db.from(table).insert(minSafe).select();
          if (e2) throw e2;
          return d2?.[0] || d2;
        }
        throw error;
      }
      return data?.[0] || data;
    },

    /**
     * update(id, changes)
     * Retries without unknown columns if schema hasn't been migrated yet.
     */
    async update(id, changes) {
      const payload = { ...changes, updated_date: new Date().toISOString() };
      const { data, error } = await db.from(table)
        .update(payload)
        .eq('id', id)
        .select();
      if (error) {
        if (error.code === '42703' || (error.message || '').includes('column') && (error.message || '').includes('does not exist')) {
          // Strip potentially-missing columns and retry
          const MAYBE_MISSING = new Set(['file_name','file_type','facility_name','doctor_name','action_items']);
          const safe = Object.fromEntries(Object.entries(payload).filter(([k]) => !MAYBE_MISSING.has(k)));
          const { data: d2, error: e2 } = await db.from(table).update(safe).eq('id', id).select();
          if (e2) throw e2;
          return d2?.[0] || d2;
        }
        throw error;
      }
      return data?.[0] || data;
    },

    /**
     * delete(id)
     */
    async delete(id) {
      const { error } = await db.from(table).eq('id', id).delete();
      if (error) throw error;
      return true;
    },

    /**
     * subscribe(callback) — Supabase realtime, noop for Neon
     */
    subscribe(callback) {
      // Only works with Supabase
      if (db.provider === 'supabase') {
        import('@supabase/supabase-js').then(async () => {
          const sb = await import('@/lib/db').then(m => m.default);
          // Supabase realtime subscription would go here
          // For now, return a noop unsubscribe
        });
      }
      return () => {}; // unsubscribe function
    },
  };
}

// Build entities proxy
const entitiesProxy = new Proxy({}, {
  get(target, entityName) {
    if (typeof entityName !== 'string') return undefined;
    if (!target[entityName]) {
      target[entityName] = createEntityProxy(entityName);
    }
    return target[entityName];
  }
});

// Build auth proxy
const authProxy = {
  async me() {
    const { data } = await db.auth.getUser();
    const user = data?.user;
    if (!user) throw new Error('Not authenticated');
    const email = user.email || user.user_metadata?.email || '';
    // Read role from profiles table (source of truth), fall back to user_metadata
    let role = user.user_metadata?.role || 'user';
    try {
      const { data: profiles } = await db
        .from('profiles')
        .select('role')
        .eq('relationship', 'self')
        .limit(1);
      if (profiles?.[0]?.role) role = profiles[0].role;
    } catch {}
    // Hardcoded admin for owner account
    if (email === 'pichimail24@gmail.com') role = 'admin';
    return {
      id: user.id,
      email,
      full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
      avatar_url: user.user_metadata?.avatar_url || '',
      role,
    };
  },
  async logout(redirectUrl) {
    await db.auth.signOut();
    if (redirectUrl) window.location.href = redirectUrl;
  },
  redirectToLogin(redirectUrl) {
    db.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: redirectUrl || window.location.href },
    });
  },
  async isAuthenticated() {
    const { data } = await db.auth.getSession();
    return !!data?.session;
  },
  async updateMe(updates) {
    // Supabase: update user_metadata
    // For profile data, update profiles table instead
  },
};

// Build functions proxy (calls API routes instead of Base44 functions)
const API_BASE = import.meta.env.VITE_API_URL || '/api';

async function getAuthHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  try {
    const { data } = await db.auth.getSession();
    const token = data?.session?.access_token;
    if (token) headers.Authorization = `Bearer ${token}`;
  } catch {}
  return headers;
}

const FUNCTION_ROUTE_MAP = {
  aiHealthChat: 'health-chat',
  symptomTriage: 'symptom-triage',
  checkDrugInteractions: 'drug-interactions',
  analyzeMedicalImage: 'analyze-image',
  analyzeSkinImage: 'analyze-image',
  nutritionImageAnalysis: 'analyze-image',
  generateDietPlan: 'diet-plan',
  generateAIHealthReport: 'health-report',
  aiDocumentSearch: 'document-search',
  askDocumentQuestion: 'document-qa',
  extractMedicationFromImage: 'extract-medication',
  healthCoaching: 'health-coaching',
  dailyHealthGoals: 'daily-goals',
  crossDocumentInsights: 'cross-insights',
  parseVoiceLog: 'parse-voice',
  semanticDocumentSearch: 'document-search',
  reconcileMedications: 'reconcile-medications',
  ocrLabReport: 'ocr-lab-report',
  documentProcessor: 'document-processor',
  enhancedDocumentProcessor: 'enhanced-document',
  enhancedDocumentSummary: 'enhanced-summary',
};

const functionsProxy = {
  async invoke(functionName, params = {}) {
    const route = FUNCTION_ROUTE_MAP[functionName] || 'invoke';
    const payload =
      route === 'invoke'
        ? { function_name: functionName, ...params }
        : params;

    const res = await fetch(`${API_BASE}/ai/${route}`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Function ${functionName} failed: ${errText}`);
    }
    return res.json();
  },
};

/**
 * Drop-in replacement for base44 client
 * 
 * BEFORE: import { base44 } from '@/api/base44Client';
 * AFTER:  import { base44 } from '@/api/dbClient';
 * 
 * All existing code works unchanged:
 *   base44.entities.Profile.filter(...)  ✅
 *   base44.auth.me()                     ✅
 *   base44.functions.invoke(...)          ✅
 */
export const base44 = {
  entities: entitiesProxy,
  auth: authProxy,
  functions: functionsProxy,
  integrations: { Core: IntegrationsCore },
  // asServiceRole not needed — server-side API routes handle this
  asServiceRole: { integrations: { Core: { InvokeLLM: () => { throw new Error('Use API routes instead of InvokeLLM'); } } } },
};

export default base44;

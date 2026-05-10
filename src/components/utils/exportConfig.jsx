/**
 * HealthFlux Export Configuration
 * ════════════════════════════════
 * Reference file for migrating from Base44 to Next.js + Vercel
 */

export const APP_CONFIG = {
  name: 'HealthFlux',
  description: 'AI-powered health management platform',
};

export const AI_PROVIDER_MAP = {
  ocr_document_extraction: { provider: 'gemini', model: 'gemini-2.0-flash' },
  health_analysis: { provider: 'claude', model: 'claude-sonnet-4-20250514' },
  health_chat: { provider: 'grok', model: 'grok-3' },
  drug_interactions: { provider: 'claude', model: 'claude-sonnet-4-20250514' },
  symptom_triage: { provider: 'claude', model: 'claude-sonnet-4-20250514' },
  health_coaching: { provider: 'grok', model: 'grok-3' },
  document_search: { provider: 'openai', model: 'gpt-4o' },
  medication_extraction: { provider: 'gemini', model: 'gemini-2.0-flash' },
  wellness_goals: { provider: 'grok', model: 'grok-3' },
  general_insights: { provider: 'claude', model: 'claude-sonnet-4-20250514' },
  family_extraction: { provider: 'openai', model: 'gpt-4o' },
  med_reconciliation: { provider: 'claude', model: 'claude-sonnet-4-20250514' },
  health_report: { provider: 'claude', model: 'claude-sonnet-4-20250514' },
  admin_assistant: { provider: 'claude', model: 'claude-sonnet-4-20250514' },
};

export const ENV_TEMPLATE = {
  GEMINI_API_KEY: '',
  OPENAI_API_KEY: '',
  ANTHROPIC_API_KEY: '',
  GROK_API_KEY: '',
  NEXT_PUBLIC_SUPABASE_URL: '',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: '',
  SUPABASE_SERVICE_ROLE_KEY: '',
  BLOB_READ_WRITE_TOKEN: '',
  UPSTASH_REDIS_REST_URL: '',
  UPSTASH_REDIS_REST_TOKEN: '',
  NEXTAUTH_SECRET: '',
  NEXTAUTH_URL: 'http://localhost:3000',
  RESEND_API_KEY: '',
};

export const FUNCTION_TO_API_ROUTE = {
  aiHealthChat: '/api/ai/chat',
  aiDocumentSearch: '/api/ai/document-search',
  askDocumentQuestion: '/api/ai/document-question',
  symptomTriage: '/api/ai/triage',
  healthCoaching: '/api/ai/coaching',
  generateAIHealthReport: '/api/ai/health-report',
  aiService: '/api/ai/summary',
  enhancedDocumentProcessor: '/api/documents/process',
  enhancedAIProcessing: '/api/documents/ai-process',
  extractMedicationFromImage: '/api/documents/extract-meds',
  extractFamilyProfiles: '/api/profiles/extract-family',
  checkDrugInteractions: '/api/medications/interactions',
  reconcileMedications: '/api/medications/reconcile',
  analyzeAdherence: '/api/health/adherence',
  predictiveHealthAnalysis: '/api/health/predictions',
  healthPredictions: '/api/health/predictions-legacy',
  exportInsightsReport: '/api/reports/export',
  generateEnhancedReport: '/api/reports/enhanced',
  generateProviderReport: '/api/reports/provider',
  awardPoints: '/api/gamification/award',
  featureGate: '/api/features/gate',
  sendNotification: '/api/notifications/send',
  makeAdmin: '/api/admin/make-admin',
};

export const DATABASE_ENTITIES = [
  'Profile', 'MedicalDocument', 'VitalMeasurement', 'LabResult',
  'Medication', 'MedicationLog', 'MedicationEffectiveness',
  'HealthInsight', 'ShareLink', 'WellnessGoal', 'GoalLog',
  'CoachMessage', 'CareCircle', 'SideEffect', 'DrugInteraction',
  'RefillReminder', 'Notification', 'UserPreferences',
  'AIHealthReport', 'GamificationProfile', 'UserCredits',
  'UserEntitlement', 'UsageMeter', 'SubscriptionPackage',
  'UserSubscription', 'TelehealthDoctor', 'TelehealthAppointment',
  'FeatureFlagAssignment', 'AuditLog', 'Role',
];

export const POST_EXPORT_STEPS = [
  '1. npx create-next-app@latest healthflux --typescript --tailwind --app',
  '2. Copy src/pages/ → app/(dashboard)/[page]/page.tsx',
  '3. Copy src/components/ → components/',
  '4. Copy src/lib/ → lib/',
  '5. Copy index.css → app/globals.css',
  '6. npm install @supabase/supabase-js @upstash/redis @vercel/blob next-auth recharts date-fns lucide-react framer-motion vaul @tanstack/react-query jspdf sonner',
  '7. Create .env.local with all keys from ENV_TEMPLATE',
  '8. In components/utils/aiService.js → delete InvokeLLM, paste real provider fetch calls',
  '9. In components/utils/dbService.js → delete base44.entities, use Supabase client',
  '10. In components/utils/authService.js → delete base44.auth, use Supabase Auth or NextAuth',
  '11. In components/utils/storageService.js → delete base44 upload, use Vercel Blob',
  '12. Convert each functions/*.ts → app/api/[route]/route.ts (see FUNCTION_TO_API_ROUTE map)',
  '13. Replace all base44.functions.invoke("name", params) → fetch("/api/route", { method:"POST", body: JSON.stringify(params) })',
  '14. npm run dev → test locally',
  '15. vercel deploy',
];
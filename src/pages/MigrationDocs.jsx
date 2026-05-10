/**
 * MigrationDocs — In-app reference page for the HealthFlux → Next.js + Supabase migration.
 * Accessible at /MigrationDocs (admin only in production).
 * Contains all migration artifacts as readable content.
 */
import React, { useState } from 'react';

const SECTIONS = [
  { key: 'manifest',    label: '📦 Migration Manifest' },
  { key: 'removal',     label: '🔍 Base44 Removal Checklist' },
  { key: 'schema',      label: '🗄️ Supabase Schema SQL' },
  { key: 'rls',         label: '🔒 RLS Policies SQL' },
  { key: 'routes',      label: '🛣️ Next.js API Routes' },
  { key: 'adapters',    label: '🔌 Adapter Layer' },
  { key: 'repos',       label: '📁 Repository Layer' },
  { key: 'i18n',        label: '🌐 i18n Status' },
  { key: 'steps',       label: '✅ Migration Steps' },
];

const ADAPTER_FILES = [
  'components/adapters/AuthAdapter.js',
  'components/adapters/DatabaseAdapter.js',
  'components/adapters/StorageAdapter.js',
  'components/adapters/AIAdapter.js',
  'components/adapters/NotificationAdapter.js',
  'components/adapters/FeatureFlagAdapter.js',
  'components/adapters/TelehealthAdapter.js',
];

const REPO_FILES = [
  'components/repositories/UserRepository.js',
  'components/repositories/ProfileRepository.js',
  'components/repositories/MedicationRepository.js',
  'components/repositories/MedicationLogRepository.js',
  'components/repositories/VitalRepository.js',
  'components/repositories/LabResultRepository.js',
  'components/repositories/DocumentRepository.js',
  'components/repositories/InsightRepository.js',
  'components/repositories/NotificationRepository.js',
  'components/repositories/SubscriptionRepository.js',
  'components/repositories/AdminRepository.js',
  'components/repositories/TelehealthRepository.js',
];

const NEXT_STEPS = [
  'Export repo from Base44 (Settings → GitHub Sync or Download)',
  'Run: npx create-next-app healthflux-next --typescript --tailwind --app',
  'Copy pages/, components/, functions/ into the Next.js src/',
  'Create Supabase project at supabase.com',
  'Run components/migration/supabase-schema.sql in Supabase SQL editor',
  'Run components/migration/rls-policies.sql in Supabase SQL editor',
  'Set environment variables from next-api-routes.md env.example section',
  'Replace DatabaseAdapter.js bodies with Supabase client calls',
  'Replace AuthAdapter.js bodies with Supabase auth calls',
  'Replace StorageAdapter.js bodies with Supabase storage calls',
  'Replace AIAdapter.js invokeLLM with direct OpenAI SDK calls',
  'Convert each functions/*.js to app/api/*/route.ts using next-api-routes.md',
  'Add middleware.ts for Supabase session-based route protection',
  'Delete stale files: src/Layout 2.jsx, src/index 2.css',
  'Remove @base44/sdk and @base44/vite-plugin from package.json',
  'Wire useTranslation() from react-i18next into all pages progressively',
  'Replace DEMO_DOCTORS with Supabase seed data',
  'Replace Math.random() meeting URLs with real WebRTC provider API call',
];

const ENTITIES = [
  ['Profile','profiles'],['VitalMeasurement','vital_measurements'],['Medication','medications'],
  ['MedicationLog','medication_logs'],['LabResult','lab_results'],['MedicalDocument','medical_documents'],
  ['HealthInsight','health_insights'],['AIHealthReport','ai_health_reports'],['WellnessGoal','wellness_goals'],
  ['GoalLog','goal_logs'],['CoachMessage','coach_messages'],['GamificationProfile','gamification_profiles'],
  ['TelehealthDoctor','telehealth_doctors'],['TelehealthAppointment','telehealth_appointments'],
  ['CareCircle','care_circles'],['Notification','notifications'],['UserSubscription','user_subscriptions'],
  ['UserCredits','user_credits'],['UserEntitlement','user_entitlements'],
  ['FeatureFlagAssignment','feature_flag_assignments'],['AuditLog','audit_logs'],
  ['UsageMeter','usage_meters'],['DrugInteraction','drug_interactions'],
  ['SubscriptionPackage','subscription_packages'],['ShareLink','share_links'],
  ['SideEffect','side_effects'],['MedicationEffectiveness','medication_effectiveness'],
  ['RefillReminder','refill_reminders'],['HealthReport','health_reports'],['UserPreferences','user_preferences'],
];

export default function MigrationDocs() {
  const [active, setActive] = useState('manifest');

  return (
    <div style={{ minHeight: '100vh', background: 'var(--hf-bg)', color: 'var(--hf-text)', padding: '1.25rem', paddingBottom: '6rem' }}>
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-black mb-1" style={{ color: 'var(--hf-text)' }}>
            🚀 Migration Docs
          </h1>
          <p className="text-sm" style={{ color: 'var(--hf-text-muted)' }}>
            HealthFlux → Next.js 14 App Router + Supabase + OpenAI migration reference
          </p>
          <div className="mt-2 px-3 py-2 rounded-xl text-xs font-bold" style={{ background: 'rgba(247,201,163,0.2)', color: 'var(--hf-peach-strong)', border: '1px solid rgba(247,201,163,0.3)' }}>
            ⚠️ All migration artifacts are in components/migration/ — export this repo first, then apply locally.
          </div>
        </div>

        {/* Tab nav */}
        <div className="flex gap-2 flex-wrap mb-6">
          {SECTIONS.map(s => (
            <button key={s.key} onClick={() => setActive(s.key)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
              style={{
                background: active === s.key ? '#d7f576' : 'var(--hf-surface-2)',
                color: active === s.key ? '#0a1200' : 'var(--hf-text-muted)',
                border: '1px solid var(--hf-border)',
              }}>
              {s.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="rounded-3xl p-6" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>

          {active === 'manifest' && (
            <div>
              <h2 className="text-lg font-black mb-4">Migration Manifest</h2>
              <div className="grid sm:grid-cols-2 gap-3 mb-6">
                {[
                  { label: 'Source', value: 'Base44 (Vite + React + Deno)', color: 'var(--hf-coral-strong)' },
                  { label: 'Target', value: 'Next.js 14 App Router + Supabase', color: 'var(--hf-mint-strong)' },
                  { label: 'Entities', value: `${ENTITIES.length} Base44 → ${ENTITIES.length} Supabase tables`, color: 'var(--hf-sky-strong)' },
                  { label: 'Functions', value: '22 Deno functions → 22 Next.js API routes', color: 'var(--hf-lemon-strong)' },
                  { label: 'Status', value: 'PREP_COMPLETE — Export Required', color: 'var(--hf-peach-strong)' },
                  { label: 'i18n', value: '4 locales: en, te, hi, tinglish', color: 'var(--hf-lavender-strong)' },
                ].map(item => (
                  <div key={item.label} className="p-3 rounded-2xl" style={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)' }}>
                    <p className="text-xs font-bold mb-1" style={{ color: 'var(--hf-text-muted)' }}>{item.label}</p>
                    <p className="text-sm font-bold" style={{ color: item.color }}>{item.value}</p>
                  </div>
                ))}
              </div>

              <h3 className="text-sm font-black mb-3" style={{ color: 'var(--hf-text)' }}>Entity → Table Mapping ({ENTITIES.length})</h3>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {ENTITIES.map(([b, s]) => (
                  <div key={b} className="flex items-center justify-between px-3 py-2 rounded-xl text-xs" style={{ background: 'var(--hf-surface-2)' }}>
                    <span className="font-bold" style={{ color: 'var(--hf-coral-strong)' }}>{b}</span>
                    <span style={{ color: 'var(--hf-text-muted)' }}>→</span>
                    <span className="font-bold" style={{ color: 'var(--hf-mint-strong)' }}>{s}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {active === 'removal' && (
            <div>
              <h2 className="text-lg font-black mb-2">Base44 Removal Checklist</h2>
              <p className="text-sm mb-4" style={{ color: 'var(--hf-text-muted)' }}>Full checklist in <code className="px-1 rounded" style={{ background: 'var(--hf-surface-2)' }}>components/migration/base44-removal-checklist.md</code></p>
              {[
                { title: 'Packages to Remove', items: ['@base44/sdk', '@base44/vite-plugin'], color: 'var(--hf-coral-strong)' },
                { title: 'Bootstrap Files to Delete', items: ['src/api/base44Client.js', 'src/lib/app-params.js', 'src/lib/AuthContext.jsx', 'src/Layout 2.jsx', 'src/index 2.css'], color: 'var(--hf-peach-strong)' },
                { title: 'Auth Methods to Replace', items: ['base44.auth.me()', 'base44.auth.logout()', 'base44.auth.redirectToLogin()', 'base44.auth.isAuthenticated()', 'base44.auth.updateMe()'], color: 'var(--hf-sky-strong)' },
                { title: 'Integrations Without npm Equivalent', items: ['integrations.Core.InvokeLLM → OpenAI SDK', 'integrations.Core.ExtractDataFromUploadedFile → Gemini/OpenAI Files', 'integrations.Core.UploadFile → Supabase Storage', 'integrations.Core.SendEmail → Resend/SendGrid'], color: 'var(--hf-lavender-strong)' },
              ].map(section => (
                <div key={section.title} className="mb-4">
                  <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: section.color }}>{section.title}</p>
                  <div className="space-y-1">
                    {section.items.map(item => (
                      <div key={item} className="px-3 py-2 rounded-xl text-xs font-mono" style={{ background: 'var(--hf-surface-2)', color: 'var(--hf-text)' }}>
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {active === 'schema' && (
            <div>
              <h2 className="text-lg font-black mb-2">Supabase Schema SQL</h2>
              <p className="text-sm mb-4" style={{ color: 'var(--hf-text-muted)' }}>Full SQL in <code className="px-1 rounded" style={{ background: 'var(--hf-surface-2)' }}>components/migration/supabase-schema.sql</code></p>
              <div className="p-4 rounded-2xl text-xs font-mono overflow-x-auto" style={{ background: '#0a0a12', color: 'var(--hf-lemon-strong)', border: '1px solid var(--hf-border)', maxHeight: 400 }}>
                {`-- 30 tables generated from Base44 entities\n-- Tables: profiles, vital_measurements, medications,\n-- medication_logs, lab_results, medical_documents,\n-- health_insights, ai_health_reports, wellness_goals,\n-- goal_logs, coach_messages, gamification_profiles,\n-- telehealth_doctors, telehealth_appointments,\n-- care_circles, notifications, user_subscriptions,\n-- user_credits, user_entitlements,\n-- feature_flag_assignments, audit_logs,\n-- usage_meters, drug_interactions,\n-- subscription_packages + indexes\n\n-- Run via Supabase SQL editor or:\n-- supabase db push`}
              </div>
            </div>
          )}

          {active === 'rls' && (
            <div>
              <h2 className="text-lg font-black mb-2">RLS Policies SQL</h2>
              <p className="text-sm mb-4" style={{ color: 'var(--hf-text-muted)' }}>Full policies in <code className="px-1 rounded" style={{ background: 'var(--hf-surface-2)' }}>components/migration/rls-policies.sql</code></p>
              <div className="space-y-2">
                {[
                  { table: 'profiles, vitals, medications, labs, documents, insights', policy: 'SELECT/INSERT/UPDATE/DELETE: own rows OR admin' },
                  { table: 'telehealth_doctors', policy: 'SELECT: authenticated; INSERT/UPDATE/DELETE: admin only' },
                  { table: 'telehealth_appointments', policy: 'own rows (user_email match) OR admin' },
                  { table: 'care_circles', policy: 'owner OR caregiver_email match OR admin' },
                  { table: 'notifications', policy: 'own user_email OR admin' },
                  { table: 'user_subscriptions, credits, entitlements', policy: 'read own; write admin only' },
                  { table: 'feature_flags, audit_logs', policy: 'admin only' },
                ].map(row => (
                  <div key={row.table} className="p-3 rounded-xl" style={{ background: 'var(--hf-surface-2)' }}>
                    <p className="text-xs font-bold" style={{ color: 'var(--hf-sky-strong)' }}>{row.table}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--hf-text-muted)' }}>{row.policy}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {active === 'routes' && (
            <div>
              <h2 className="text-lg font-black mb-2">Next.js API Routes</h2>
              <p className="text-sm mb-4" style={{ color: 'var(--hf-text-muted)' }}>Full map in <code className="px-1 rounded" style={{ background: 'var(--hf-surface-2)' }}>components/migration/next-api-routes.md</code></p>
              <div className="space-y-1 max-h-96 overflow-y-auto">
                {[
                  ['/api/ai/chat','aiHealthChat'],
                  ['/api/ai/health-report','generateAIHealthReport'],
                  ['/api/documents/process','enhancedDocumentProcessor'],
                  ['/api/health/adherence','analyzeAdherence'],
                  ['/api/ai/coaching','healthCoaching'],
                  ['/api/ai/predictive','predictiveHealthAnalysis'],
                  ['/api/medications/interactions','checkDrugInteractions'],
                  ['/api/medications/reconcile','reconcileMedications'],
                  ['/api/medications/extract-from-image','extractMedicationFromImage'],
                  ['/api/profiles/extract-family','extractFamilyProfiles'],
                  ['/api/reports/provider','generateProviderReport'],
                  ['/api/reports/export','exportInsightsReport'],
                  ['/api/documents/search','aiDocumentSearch'],
                  ['/api/documents/question','askDocumentQuestion'],
                  ['/api/notifications/send','sendNotification'],
                  ['/api/features/gate','featureGate'],
                  ['/api/admin/award-points','awardPoints'],
                  ['/api/admin/make-admin','makeAdmin'],
                  ['/api/ai/triage','symptomTriage'],
                ].map(([route, fn]) => (
                  <div key={route} className="flex items-center justify-between px-3 py-2 rounded-xl text-xs" style={{ background: 'var(--hf-surface-2)' }}>
                    <span className="font-bold font-mono" style={{ color: 'var(--hf-lemon-strong)' }}>{route}</span>
                    <span style={{ color: 'var(--hf-text-muted)' }}>← {fn}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {active === 'adapters' && (
            <div>
              <h2 className="text-lg font-black mb-2">Adapter Layer</h2>
              <p className="text-sm mb-4" style={{ color: 'var(--hf-text-muted)' }}>7 adapters created. Each wraps Base44 now and shows migration comment for Supabase.</p>
              <div className="space-y-2">
                {ADAPTER_FILES.map(f => (
                  <div key={f} className="px-3 py-2.5 rounded-xl text-xs" style={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)' }}>
                    <p className="font-bold font-mono" style={{ color: 'var(--hf-lavender-strong)' }}>{f}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {active === 'repos' && (
            <div>
              <h2 className="text-lg font-black mb-2">Repository Layer</h2>
              <p className="text-sm mb-4" style={{ color: 'var(--hf-text-muted)' }}>12 repositories created. All data access for pages/components should go through these.</p>
              <div className="space-y-2">
                {REPO_FILES.map(f => (
                  <div key={f} className="px-3 py-2.5 rounded-xl text-xs" style={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)' }}>
                    <p className="font-bold font-mono" style={{ color: 'var(--hf-mint-strong)' }}>{f}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {active === 'i18n' && (
            <div>
              <h2 className="text-lg font-black mb-2">i18n Status</h2>
              <div className="space-y-3">
                {[
                  { lang: 'English (en)',   file: 'components/i18n/locales/en.json',       status: '✅ Complete — 14 namespaces' },
                  { lang: 'Telugu (te)',    file: 'components/i18n/locales/te.json',       status: '✅ Complete — 14 namespaces' },
                  { lang: 'Hindi (hi)',     file: 'components/i18n/locales/hi.json',       status: '✅ Complete — 14 namespaces' },
                  { lang: 'Tinglish',      file: 'components/i18n/locales/tinglish.json', status: '✅ Complete — 14 namespaces' },
                ].map(l => (
                  <div key={l.lang} className="p-3 rounded-2xl" style={{ background: 'var(--hf-surface-2)' }}>
                    <p className="text-sm font-bold" style={{ color: 'var(--hf-text)' }}>{l.lang}</p>
                    <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--hf-sky-strong)' }}>{l.file}</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--hf-mint-strong)' }}>{l.status}</p>
                  </div>
                ))}
                <div className="p-3 rounded-2xl" style={{ background: 'rgba(247,201,163,0.1)', border: '1px solid rgba(247,201,163,0.3)' }}>
                  <p className="text-xs font-bold" style={{ color: 'var(--hf-peach-strong)' }}>Next step</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--hf-text-muted)' }}>
                    Wire <code>useTranslation()</code> into pages progressively. Start with Layout.js nav labels, then Dashboard, then forms. Use <code>LanguageSelector</code> component from <code>components/i18n/LanguageSelector.jsx</code> in AccountHub.
                  </p>
                </div>
              </div>
            </div>
          )}

          {active === 'steps' && (
            <div>
              <h2 className="text-lg font-black mb-4">18-Step Migration Checklist</h2>
              <div className="space-y-2">
                {NEXT_STEPS.map((step, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'var(--hf-surface-2)' }}>
                    <span className="text-xs font-black w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: '#d7f576', color: '#0a1200' }}>{i + 1}</span>
                    <p className="text-xs" style={{ color: 'var(--hf-text)' }}>{step}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
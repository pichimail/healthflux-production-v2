/**
 * FeatureFlagsContext
 * Loads all FeatureFlagAssignment records + user subscription once,
 * resolves per-feature state (user > plan > global > default),
 * and subscribes to real-time changes so admin toggles appear instantly.
 */
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { base44 } from '@/api/base44Client';

// ── Plan defaults ──────────────────────────────────────────────────────────
export const PLAN_DEFAULTS = {
  free: {
    universal_upload: true, ocr_processing: false, doc_auto_link_profiles: true,
    ai_insights_generate: false, ai_summary_generate: false, triage_mode: true,
    coach_mode: false, wellness_module: true, wellness_goals: true,
    wellness_goals_tracking: true, wellness_goals_streaks: true,
    wellness_goals_weekly_report: false, wellness_goals_ai_feedback: false,
    vitals_logging: true, labs_module: true, meds_module: true,
    drug_interaction_check: false, provider_reports_pdf: false,
    export_pdf: false, export_csv: false, share_links: false,
    care_circle: false, caregiver_portal: false, emergency_profile: true,
    abha_settings: true, wearable_integrations_google_fit: false,
    wearable_integrations_fitbit: false, apple_health_import: false,
    notifications_email: true, notifications_inapp: true, activity_feed: true,
    user_analytics: false, advanced_reporting_custom_reports: false,
    gamification_points: false, gamification_streaks: false,
    gamification_badges: false, gamification_dashboard: false,
    gamification_leaderboard: false, gamification_tiers: false,
    gamification_health_badges: false,
    ai_health_reports: false, ai_risk_predictions: false,
    ai_lifestyle_suggestions: false, ai_proactive_checkin: false,
    telehealth_browse: false, telehealth_booking: false,
    telehealth_video: false, telehealth_share_records: false,
    telehealth_add_doctor: false, telehealth_cancel_appointment: false,
    heart_rate_camera: false, ai_medical_imaging: false, skin_assessment: false,
    ocr_lab_reports: false, personalized_diet_plan: false, connected_devices: false,
  },
  pro: {
    universal_upload: true, ocr_processing: true, doc_auto_link_profiles: true,
    ai_insights_generate: true, ai_summary_generate: true, triage_mode: true,
    coach_mode: true, wellness_module: true, wellness_goals: true,
    wellness_goals_tracking: true, wellness_goals_streaks: true,
    wellness_goals_weekly_report: true, wellness_goals_ai_feedback: true,
    vitals_logging: true, labs_module: true, meds_module: true,
    drug_interaction_check: true, provider_reports_pdf: true,
    export_pdf: true, export_csv: true, share_links: true,
    care_circle: true, caregiver_portal: true, emergency_profile: true,
    abha_settings: true, wearable_integrations_google_fit: false,
    wearable_integrations_fitbit: false, apple_health_import: false,
    notifications_email: true, notifications_inapp: true, activity_feed: true,
    user_analytics: true, advanced_reporting_custom_reports: false,
    gamification_points: true, gamification_streaks: true,
    gamification_badges: true, gamification_dashboard: true,
    gamification_leaderboard: false, gamification_tiers: true,
    gamification_health_badges: true,
    ai_health_reports: true, ai_risk_predictions: true,
    ai_lifestyle_suggestions: true, ai_proactive_checkin: true,
    telehealth_browse: true, telehealth_booking: true,
    telehealth_video: true, telehealth_share_records: true,
    telehealth_add_doctor: false, telehealth_cancel_appointment: true,
    heart_rate_camera: true, ai_medical_imaging: true, skin_assessment: true,
    ocr_lab_reports: true, personalized_diet_plan: true, connected_devices: true,
  },
  enterprise: {
    universal_upload: true, ocr_processing: true, doc_auto_link_profiles: true,
    ai_insights_generate: true, ai_summary_generate: true, triage_mode: true,
    coach_mode: true, wellness_module: true, wellness_goals: true,
    wellness_goals_tracking: true, wellness_goals_streaks: true,
    wellness_goals_weekly_report: true, wellness_goals_ai_feedback: true,
    vitals_logging: true, labs_module: true, meds_module: true,
    drug_interaction_check: true, provider_reports_pdf: true,
    export_pdf: true, export_csv: true, share_links: true,
    care_circle: true, caregiver_portal: true, emergency_profile: true,
    abha_settings: true, wearable_integrations_google_fit: true,
    wearable_integrations_fitbit: true, apple_health_import: true,
    notifications_email: true, notifications_inapp: true, activity_feed: true,
    user_analytics: true, advanced_reporting_custom_reports: true,
    gamification_points: true, gamification_streaks: true,
    gamification_badges: true, gamification_dashboard: true,
    gamification_leaderboard: true, gamification_tiers: true,
    gamification_health_badges: true,
    ai_health_reports: true, ai_risk_predictions: true,
    ai_lifestyle_suggestions: true, ai_proactive_checkin: true,
    telehealth_browse: true, telehealth_booking: true,
    telehealth_video: true, telehealth_share_records: true,
    telehealth_add_doctor: true, telehealth_cancel_appointment: true,
    heart_rate_camera: true, ai_medical_imaging: true, skin_assessment: true,
    ocr_lab_reports: true, personalized_diet_plan: true, connected_devices: true,
  },
};

const GLOBAL_DEFAULTS = PLAN_DEFAULTS.free; // fallback when no subscription — fail closed, not open

export function resolveFeatureFlags(assignments = [], plan = 'free', userEmail = '') {
  const planDefaults = PLAN_DEFAULTS[plan] || PLAN_DEFAULTS.free;
  const resolved = { ...planDefaults };
  const global = assignments.filter(a => a.scope_type === 'global');
  const planOvr = assignments.filter(a => a.scope_type === 'plan' && a.scope_id === plan);
  const userOvr = assignments.filter(a => a.scope_type === 'user' && a.scope_id === userEmail);
  const ordered = [...global, ...planOvr, ...userOvr]
    .sort((a, b) => new Date(a.created_date || 0).getTime() - new Date(b.created_date || 0).getTime());
  ordered.forEach((a) => {
    resolved[a.flag_key] = a.state;
  });
  return resolved;
}

// ── Context ────────────────────────────────────────────────────────────────
const FeatureFlagsContext = createContext(null);

export function FeatureFlagsProvider({ children }) {
  const [flags, setFlags] = useState({});        // resolved map: key -> bool
  const [planKey, setPlanKey] = useState('free');
  const [loading, setLoading] = useState(true);
  const userEmailRef = useRef(null);

  const resolve = useCallback((assignments, plan, userEmail) => (
    resolveFeatureFlags(assignments, plan, userEmail)
  ), []);

  const load = useCallback(async () => {
    try {
      const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('ff-timeout')), ms))]);
      const user = await withTimeout(base44.auth.me(), 8000);
      userEmailRef.current = user.email;

      const [subs, assignments] = await Promise.all([
        withTimeout(base44.entities.UserSubscription.filter({ user_email: user.email }), 8000).catch(() => []),
        withTimeout(base44.entities.FeatureFlagAssignment.list('-created_date', 1000), 8000).catch(() => []),
      ]);

      const activeSub = (Array.isArray(subs) ? subs : []).find(s => s.status === 'active' || s.status === 'trialing');
      const plan = activeSub?.plan_key || 'free';
      setPlanKey(plan);
      setFlags(resolve(Array.isArray(assignments) ? assignments : [], plan, user.email));
    } catch {
      setFlags(GLOBAL_DEFAULTS);
    } finally {
      setLoading(false);
    }
  }, [resolve]);

  useEffect(() => {
    load();

    // Real-time: when admin changes a FeatureFlagAssignment, reload flags immediately
    const unsub = base44.entities.FeatureFlagAssignment.subscribe(() => {
      load();
    });
    return unsub;
  }, [load]);

  const hasFeature = useCallback((key) => {
    if (loading) return false; // fail-closed while loading — don't expose premium features prematurely
    return flags[key] ?? false;
  }, [flags, loading]);

  return (
    <FeatureFlagsContext.Provider value={{ flags, planKey, loading, hasFeature, reload: load }}>
      {children}
    </FeatureFlagsContext.Provider>
  );
}

export function useFeatureFlags() {
  const ctx = useContext(FeatureFlagsContext);
  if (!ctx) throw new Error('useFeatureFlags must be used within FeatureFlagsProvider');
  return ctx;
}

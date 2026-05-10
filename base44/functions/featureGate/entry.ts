/**
 * MIGRATION: POST-EXPORT
 * Route: /api/features/gate
 * InvokeLLM calls: 0
 * DB calls: 5 (UserSubscription, UserEntitlement, FeatureFlagAssignment, UsageMeter, UserCredits)
 * Note: Feature flag + quota checking, no AI calls
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Plan definitions - source of truth for entitlements
const PLANS = {
  free: {
    name: 'Free',
    max_profiles: 2,
    max_documents: 10,
    ai_insights: false,
    ocr_processing: false,
    share_links: false,
    care_circle: false,
    export_pdf: false,
    export_csv: false,
    provider_reports_pdf: false,
    drug_interaction_check: false,
    wellness_module: true,
    vitals_logging: true,
    labs_module: true,
    meds_module: true,
    universal_upload: true,
    caregiver_seats: 0,
  },
  pro: {
    name: 'Pro',
    max_profiles: 10,
    max_documents: 100,
    ai_insights: true,
    ocr_processing: true,
    share_links: true,
    care_circle: true,
    export_pdf: true,
    export_csv: true,
    provider_reports_pdf: true,
    drug_interaction_check: true,
    wellness_module: true,
    vitals_logging: true,
    labs_module: true,
    meds_module: true,
    universal_upload: true,
    caregiver_seats: 3,
  },
  enterprise: {
    name: 'Enterprise',
    max_profiles: -1,
    max_documents: -1,
    ai_insights: true,
    ocr_processing: true,
    share_links: true,
    care_circle: true,
    export_pdf: true,
    export_csv: true,
    provider_reports_pdf: true,
    drug_interaction_check: true,
    wellness_module: true,
    vitals_logging: true,
    labs_module: true,
    meds_module: true,
    universal_upload: true,
    caregiver_seats: -1,
  },
};

// Global flag defaults (all features - their default state when no assignment exists)
const GLOBAL_FLAG_DEFAULTS = {
  universal_upload: true,
  ocr_processing: true,
  doc_auto_link_profiles: true,
  ai_insights_generate: true,
  ai_summary_generate: true,
  triage_mode: true,
  coach_mode: true,
  wellness_module: true,
  wellness_goals: true,
  vitals_logging: true,
  labs_module: true,
  meds_module: true,
  drug_interaction_check: true,
  provider_reports_pdf: true,
  export_pdf: true,
  export_csv: true,
  share_links: true,
  care_circle: true,
  caregiver_portal: true,
  emergency_profile: true,
  abha_settings: true,
  wearable_integrations_google_fit: false,
  wearable_integrations_fitbit: false,
  apple_health_import: false,
  notifications_email: true,
  notifications_inapp: true,
  activity_feed: true,
  admin_assistant: true,
  admin_analytics: true,
  user_analytics: true,
  advanced_reporting_custom_reports: false,
  // Gamification
  gamification_points: false,
  gamification_streaks: false,
  gamification_badges: false,
  gamification_dashboard: false,
  gamification_leaderboard: false,
  gamification_tiers: false,
  gamification_health_badges: false,
  // Wellness Goals
  wellness_goals_tracking: true,
  wellness_goals_streaks: true,
  wellness_goals_weekly_report: false,
  wellness_goals_ai_feedback: false,
  // AI Health Reports & Predictions
  ai_health_reports: false,
  ai_risk_predictions: false,
  ai_lifestyle_suggestions: false,
  ai_proactive_checkin: false,
  // Telehealth
  telehealth_browse: false,
  telehealth_booking: false,
  telehealth_video: false,
  telehealth_share_records: false,
  telehealth_add_doctor: false,
  telehealth_cancel_appointment: false,
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { feature_key, check_quota, increment_usage } = body;

    if (!feature_key) return Response.json({ error: 'feature_key required' }, { status: 400 });

    // 1. Resolve plan entitlement
    const [subList, entitlementList, assignmentList, meterList, creditList] = await Promise.all([
      base44.asServiceRole.entities.UserSubscription.filter({ user_email: user.email }),
      base44.asServiceRole.entities.UserEntitlement.filter({ user_email: user.email }),
      base44.asServiceRole.entities.FeatureFlagAssignment.list('-created_date', 500),
      check_quota ? base44.asServiceRole.entities.UsageMeter.filter({ user_email: user.email, feature_key }) : Promise.resolve([]),
      base44.asServiceRole.entities.UserCredits.filter({ user_email: user.email }),
    ]);

    const activeSub = subList.find(s => s.status === 'active' || s.status === 'trialing') || null;
    const planKey = activeSub?.plan_key || 'free';
    const plan = PLANS[planKey] || PLANS.free;
    const entitlement = entitlementList[0]?.overrides_json || {};

    // 2. Resolve flag: user > plan > global
    const userOverride = assignmentList.find(a => a.scope_type === 'user' && a.scope_id === user.email && a.flag_key === feature_key);
    const planOverride = assignmentList.find(a => a.scope_type === 'plan' && a.scope_id === planKey && a.flag_key === feature_key);
    const globalOverride = assignmentList.find(a => a.scope_type === 'global' && a.flag_key === feature_key);

    let flagEnabled;
    if (userOverride !== undefined) {
      flagEnabled = userOverride.state;
    } else if (planOverride !== undefined) {
      flagEnabled = planOverride.state;
    } else if (globalOverride !== undefined) {
      flagEnabled = globalOverride.state;
    } else {
      // Check plan entitlement first, then global default
      const planVal = plan[feature_key];
      const entitlementVal = entitlement[feature_key];
      if (entitlementVal !== undefined) {
        flagEnabled = entitlementVal;
      } else if (planVal !== undefined) {
        flagEnabled = planVal;
      } else {
        flagEnabled = GLOBAL_FLAG_DEFAULTS[feature_key] ?? true;
      }
    }

    if (!flagEnabled) {
      return Response.json({
        allowed: false,
        reason: 'feature_disabled',
        message: `Feature '${feature_key}' is not enabled for your plan.`,
        plan: planKey,
      });
    }

    // 3. Quota check
    if (check_quota) {
      const now = new Date();
      const periodKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const meter = meterList.find(m => m.period_key === periodKey) || meterList.find(m => m.period_key === 'lifetime');

      if (meter && meter.limit_count !== -1 && meter.used_count >= meter.limit_count) {
        return Response.json({
          allowed: false,
          reason: 'quota_exceeded',
          message: `You've reached your usage limit for '${feature_key}'.`,
          used: meter.used_count,
          limit: meter.limit_count,
        });
      }

      if (increment_usage && meter) {
        await base44.asServiceRole.entities.UsageMeter.update(meter.id, {
          used_count: (meter.used_count || 0) + 1,
          updated_at: now.toISOString(),
        });
      }
    }

    // 4. Credits check (for credit-gated features)
    const creditGatedFeatures = ['ai_insights_generate', 'ai_summary_generate', 'triage_mode', 'ocr_processing'];
    if (creditGatedFeatures.includes(feature_key)) {
      const credits = creditList[0];
      if (credits && credits.credits_balance <= 0) {
        return Response.json({
          allowed: false,
          reason: 'insufficient_credits',
          message: 'Insufficient credits to use this feature.',
          balance: credits?.credits_balance || 0,
        });
      }
      if (increment_usage && credits) {
        await base44.asServiceRole.entities.UserCredits.update(credits.id, {
          credits_balance: Math.max(0, credits.credits_balance - 1),
          credits_used: (credits.credits_used || 0) + 1,
        });
      }
    }

    return Response.json({
      allowed: true,
      plan: planKey,
      flag_state: flagEnabled,
      entitlements: { ...plan, ...entitlement },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
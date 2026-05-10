/**
 * FeatureUnlockedBanner
 * Listens to FeatureFlagAssignment real-time changes.
 * When a flag is toggled ON for the current user, shows a toast notification.
 */
import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const FLAG_LABELS = {
  ai_health_reports: '📊 AI Health Reports',
  ai_risk_predictions: '🔮 AI Risk Predictions',
  ai_lifestyle_suggestions: '💡 AI Lifestyle Suggestions',
  ai_proactive_checkin: '🤖 Proactive AI Check-in',
  coach_mode: '🧠 AI Health Coach',
  ai_insights_generate: '✨ AI Insights',
  telehealth_browse: '🎥 Telehealth',
  telehealth_booking: '📅 Telehealth Booking',
  gamification_dashboard: '🏆 Rewards Dashboard',
  gamification_points: '⭐ Points System',
  care_circle: '🤝 Care Circle',
  export_pdf: '📄 PDF Export',
  export_csv: '📊 CSV Export',
  share_links: '🔗 Share Links',
  drug_interaction_check: '💊 Drug Interaction Check',
  provider_reports_pdf: '📋 Provider Reports',
  advanced_reporting_custom_reports: '📈 Custom Reports',
  wellness_goals_ai_feedback: '🌿 AI Wellness Feedback',
  wellness_goals_weekly_report: '📅 Weekly Wellness Report',
};

export default function FeatureUnlockedBanner() {
  const userEmailRef = useRef(null);
  const prevStatesRef = useRef({});

  useEffect(() => {
    base44.auth.me().then(u => {
      userEmailRef.current = u?.email;
    }).catch(() => {});

    const unsub = base44.entities.FeatureFlagAssignment.subscribe((event) => {
      if (!userEmailRef.current) return;
      if (event.type !== 'create' && event.type !== 'update') return;

      const a = event.data;
      if (!a) return;

      const isForMe = (
        (a.scope_type === 'global') ||
        (a.scope_type === 'user' && a.scope_id === userEmailRef.current)
      );

      if (!isForMe) return;

      const key = a.flag_key;
      const prevState = prevStatesRef.current[key];

      // Only notify when transitioning from off → on
      if (a.state === true && prevState !== true) {
        const label = FLAG_LABELS[key] || key;
        toast.success(`${label} unlocked!`, {
          description: 'This feature is now available in your account.',
          duration: 5000,
        });
      }

      prevStatesRef.current[key] = a.state;
    });

    return unsub;
  }, []);

  return null;
}
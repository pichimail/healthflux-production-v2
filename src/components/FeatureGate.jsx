/**
 * FeatureGate — instant, real-time feature visibility control.
 * Uses FeatureFlagsContext (resolved once + subscribed to live changes).
 * When admin toggles a flag, UI updates within ~1 second.
 */
import React from 'react';
import { useFeatureFlags } from '@/lib/FeatureFlagsContext';

/**
 * Inline gate — renders children if feature is enabled, fallback otherwise.
 * <FeatureGate feature="ai_health_reports" fallback={<UpgradePrompt />}>
 *   <AIReports />
 * </FeatureGate>
 */
/**
 * @param {{
 *   feature: string,
 *   fallback?: React.ReactNode,
 *   children?: React.ReactNode,
 * }} props
 */
export function FeatureGate({ feature, fallback = null, children }) {
  const { hasFeature, loading } = useFeatureFlags();
  if (loading) return null;
  if (!hasFeature(feature)) return fallback;
  return children;
}

/**
 * Hook for imperative checks: const { hasFeature } = useFeatureGate()
 */
export function useFeatureGate() {
  const { hasFeature } = useFeatureFlags();
  return { hasFeature };
}

/**
 * Locked/upgrade prompt for blocked features.
 */
/**
 * @param {{
 *   message?: string,
 *   feature?: string | null,
 * }} props
 */
export function UpgradePrompt({ message = 'Upgrade your plan to access this feature.', feature = null }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 rounded-[24px] text-center gap-3 mx-4 my-6"
      style={{ background: 'rgba(215,245,118,0.06)', border: '1px dashed rgba(215,245,118,0.25)' }}>
      <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
        style={{ background: 'rgba(215,245,118,0.15)' }}>
        🔒
      </div>
      <p className="text-base font-bold" style={{ color: 'var(--hf-text)' }}>Feature Locked</p>
      <p className="text-sm" style={{ color: 'var(--hf-text-muted)', maxWidth: 280 }}>{message}</p>
      {feature && (
        <code className="text-[10px] px-2 py-0.5 rounded-full"
          style={{ background: 'var(--hf-surface-2)', color: 'var(--hf-text-muted)' }}>
          {feature}
        </code>
      )}
    </div>
  );
}

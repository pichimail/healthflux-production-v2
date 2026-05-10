/**
 * WellnessHub — feature-flag-gated tabs: Goals, Rewards, Care Circle
 */
import React, { useEffect } from 'react';
import WellnessGoals from './WellnessGoals';
import GamificationDashboard from './GamificationDashboard';
import CareCircle from './CareCircle';
import DeviceSyncTab from '@/components/wellness/DeviceSyncTab';
import { useFeatureFlags } from '@/lib/FeatureFlagsContext';
import { UpgradePrompt } from '../components/FeatureGate';
import { useRoutedTab } from '@/hooks/use-routed-tab';

const ALL_TABS = [
  { key: 'goals',   label: '🎯 Goals',       flag: 'wellness_goals_tracking' },
  { key: 'sync',    label: '📱 Device Sync', flag: 'wellness_goals_tracking' },
  { key: 'rewards', label: '🏆 Rewards',     flag: 'gamification_dashboard' },
  { key: 'care',    label: '🤝 Care Circle', flag: 'care_circle' },
];

const STORAGE_KEY = 'wellnesshub_tab';

export default function WellnessHub() {
  const { hasFeature, loading } = useFeatureFlags();
  const visibleTabs = loading ? ALL_TABS : ALL_TABS.filter(t => hasFeature(t.flag));
  const tabKeys = visibleTabs.map(t => t.key);
  const [activeTab, setActiveTab] = useRoutedTab({
    storageKey: STORAGE_KEY,
    defaultTab: 'goals',
    validTabs: tabKeys.length ? tabKeys : ['goals'],
  });

  useEffect(() => {
    if (!loading && visibleTabs.length > 0 && !visibleTabs.find(t => t.key === activeTab)) {
      setActiveTab(visibleTabs[0].key);
    }
  }, [visibleTabs, activeTab, loading]);

  if (!loading && visibleTabs.length === 0) {
    return (
      <div className="p-6">
        <UpgradePrompt message="Wellness features are not enabled for your plan." />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--hf-bg)', paddingBottom: '6rem' }}>
      <div className="sticky top-0 z-30 px-4 pt-4 pb-2"
        style={{ background: 'var(--hf-bg)', borderBottom: '1px solid var(--hf-border)' }}>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {visibleTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold flex-shrink-0 transition-all active-press"
              style={{
                background: activeTab === tab.key ? '#a8e6cf' : 'var(--hf-surface-2)',
                color: activeTab === tab.key ? '#003d20' : 'var(--hf-text-muted)',
                border: activeTab === tab.key ? 'none' : '1px solid var(--hf-border)',
                boxShadow: activeTab === tab.key ? '0 2px 12px rgba(168,230,207,0.35)' : 'none',
              }}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        {activeTab === 'goals'   && <WellnessGoals />}
        {activeTab === 'sync'    && <DeviceSyncTab />}
        {activeTab === 'rewards' && <GamificationDashboard />}
        {activeTab === 'care'    && <CareCircle />}
      </div>
    </div>
  );
}

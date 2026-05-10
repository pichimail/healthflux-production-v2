/**
 * HealthHub — feature-flag-gated tabs: Vitals, Meds, Docs, Labs, Trends
 */
import React, { useEffect } from 'react';
import Documents from './Documents';
import Vitals from './Vitals';
import Medications from './Medications';
import LabResults from './LabResults';
import Trends from './Trends';
import Haptics from '../components/utils/haptics';
import { useFeatureFlags } from '@/lib/FeatureFlagsContext';
import { UpgradePrompt } from '../components/FeatureGate';
import { useRoutedTab } from '@/hooks/use-routed-tab';

const ALL_TABS = [
  { key: 'vitals',      label: '💓 Vitals',     flag: 'vitals_logging' },
  { key: 'medications', label: '💊 Meds',        flag: 'meds_module' },
  { key: 'documents',   label: '📄 Docs',        flag: 'universal_upload' },
  { key: 'labs',        label: '🔬 Labs',        flag: 'labs_module' },
  { key: 'trends',      label: '📈 Trends',      flag: 'user_analytics' },
];

const STORAGE_KEY = 'healthhub_tab';

export default function HealthHub() {
  const { hasFeature, loading } = useFeatureFlags();
  const visibleTabs = loading ? ALL_TABS : ALL_TABS.filter(t => hasFeature(t.flag));
  const tabKeys = visibleTabs.map(t => t.key);
  const [activeTab, setActiveTab] = useRoutedTab({
    storageKey: STORAGE_KEY,
    defaultTab: 'vitals',
    validTabs: tabKeys.length ? tabKeys : ['vitals'],
  });

  // If active tab gets hidden by a flag change, switch to first visible
  useEffect(() => {
    if (!loading && visibleTabs.length > 0 && !visibleTabs.find(t => t.key === activeTab)) {
      setActiveTab(visibleTabs[0].key);
    }
  }, [visibleTabs, activeTab, loading]);

  if (!loading && visibleTabs.length === 0) {
    return (
      <div className="p-6">
        <UpgradePrompt message="No health features are enabled for your plan. Contact your administrator." />
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
              onClick={() => { Haptics.light(); setActiveTab(tab.key); }}
              className="whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold flex-shrink-0 transition-all active-press"
              style={{
                background: activeTab === tab.key ? '#d7f576' : 'var(--hf-surface-2)',
                color: activeTab === tab.key ? '#0a1200' : 'var(--hf-text-muted)',
                border: activeTab === tab.key ? 'none' : '1px solid var(--hf-border)',
                boxShadow: activeTab === tab.key ? '0 2px 12px rgba(215,245,118,0.3)' : 'none',
              }}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        {activeTab === 'vitals'      && <Vitals />}
        {activeTab === 'medications' && <Medications />}
        {activeTab === 'documents'   && <Documents />}
        {activeTab === 'labs'        && <LabResults />}
        {activeTab === 'trends'      && <Trends />}
      </div>
    </div>
  );
}
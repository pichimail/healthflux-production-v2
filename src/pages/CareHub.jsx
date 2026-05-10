/**
 * CareHub — feature-flag-gated tabs: Telehealth, Emergency, Profiles, ABHA
 */
import React from 'react';
import Telehealth from './Telehealth';
import EmergencyProfile from './EmergencyProfile';
import Profiles from './Profiles';
import ABHASettings from './ABHASettings';
import { useFeatureFlags } from '@/lib/FeatureFlagsContext';
import { useRoutedTab } from '@/hooks/use-routed-tab';

const ALL_TABS = [
  { key: 'telehealth', label: '🎥 Telehealth', flag: 'telehealth_browse' },
  { key: 'emergency',  label: '🚨 Emergency',  flag: 'emergency_profile' },
  { key: 'profiles',   label: '👤 Profiles',   flag: null }, // always visible
  { key: 'abha',       label: '🏥 ABHA',       flag: 'abha_settings' },
];

export default function CareHub() {
  const { hasFeature, loading } = useFeatureFlags();
  const visibleTabs = loading ? ALL_TABS : ALL_TABS.filter(t => !t.flag || hasFeature(t.flag));
  const [activeTab, setActiveTab] = useRoutedTab({
    storageKey: 'carehub_tab',
    defaultTab: 'profiles',
    validTabs: visibleTabs.map((tab) => tab.key).length ? visibleTabs.map((tab) => tab.key) : ['profiles'],
  });

  // Fallback if active tab gets hidden
  const effectiveTab = visibleTabs.find(t => t.key === activeTab)
    ? activeTab
    : visibleTabs[0]?.key || 'profiles';

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
                background: effectiveTab === tab.key ? '#f7c9a3' : 'var(--hf-surface-2)',
                color: effectiveTab === tab.key ? '#3d1a00' : 'var(--hf-text-muted)',
                border: effectiveTab === tab.key ? 'none' : '1px solid var(--hf-border)',
                boxShadow: effectiveTab === tab.key ? '0 2px 12px rgba(247,201,163,0.35)' : 'none',
              }}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        {effectiveTab === 'telehealth' && <Telehealth />}
        {effectiveTab === 'emergency'  && <EmergencyProfile />}
        {effectiveTab === 'profiles'   && <Profiles />}
        {effectiveTab === 'abha'       && <ABHASettings />}
      </div>
    </div>
  );
}

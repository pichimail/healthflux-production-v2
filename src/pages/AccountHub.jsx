/**
 * AccountHub — merges: Settings, User Analytics, Export, Share/CareCircle (management side)
 */
import React, { useEffect } from 'react';
import Settings from './Settings';
import UserAnalytics from './UserAnalytics';
import ExportReports from './ExportReports';
import Subscription from './Subscription';
import { useFeatureFlags } from '@/lib/FeatureFlagsContext';
import { useRoutedTab } from '@/hooks/use-routed-tab';

const TABS = [
  { key: 'settings', label: '⚙️ Settings' },
  { key: 'subscription', label: '⭐ Subscription' },
  { key: 'analytics', label: '📊 My Analytics' },
  { key: 'export', label: '📤 Export', flag: 'export_pdf' },
];


export default function AccountHub() {
  const { hasFeature, loading } = useFeatureFlags();
  const visibleTabs = loading ? TABS.filter((tab) => !tab.flag) : TABS.filter((tab) => !tab.flag || hasFeature(tab.flag));
  const [activeTab, setActiveTab] = useRoutedTab({
    storageKey: 'accounthub_tab',
    defaultTab: 'settings',
    validTabs: visibleTabs.map((tab) => tab.key),
  });

  useEffect(() => {
    if (!visibleTabs.find((tab) => tab.key === activeTab)) {
      setActiveTab(visibleTabs[0]?.key || 'settings');
    }
  }, [activeTab, setActiveTab, visibleTabs]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--hf-bg)', paddingBottom: '6rem' }}>
      <div className="sticky z-30 px-4 pt-4 pb-2 md:top-14"
      style={{ background: 'var(--hf-bg)', borderBottom: '1px solid var(--hf-border)', top: 'calc(56px + env(safe-area-inset-top, 0px))' }}>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {visibleTabs.map((tab) =>
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold flex-shrink-0 transition-all active-press"
            style={{
              background: activeTab === tab.key ? '#9bb4ff' : 'var(--hf-surface-2)',
              color: activeTab === tab.key ? '#0a1240' : 'var(--hf-text-muted)',
              border: activeTab === tab.key ? 'none' : '1px solid var(--hf-border)',
              boxShadow: activeTab === tab.key ? '0 2px 12px rgba(155,180,255,0.35)' : 'none'
            }}>
              {tab.label}
            </button>
          )}
        </div>
      </div>

      <div>
        {activeTab === 'settings' && <Settings />}
        {activeTab === 'subscription' && <Subscription />}
        {activeTab === 'analytics' && <UserAnalytics />}
        {activeTab === 'export' && <ExportReports />}
      </div>
    </div>);

}
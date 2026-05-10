/**
 * AIHub — feature-flag-gated tabs: Insights, Assistant, Coach, AI Reports, Wellness
 */
import React, { useEffect, useRef } from 'react';
import AIAssistant from './AIAssistant';
import AIHealthCoach from './AIHealthCoach';
import AIHealthReports from './AIHealthReports';
import Insights from './Insights';
import WellnessInsights from './WellnessInsights';
import AIMedicalImaging from './AIMedicalImaging';
import SkinAssessment from './SkinAssessment';
import PersonalizedDiet from './PersonalizedDiet';
import Haptics from '../components/utils/haptics';
import { useFeatureFlags } from '@/lib/FeatureFlagsContext';
import { UpgradePrompt } from '../components/FeatureGate';
import { useRoutedTab } from '@/hooks/use-routed-tab';

const ALL_TABS = [
  { key: 'insights',  label: '✨ Insights',    flag: 'ai_insights_generate' },
  { key: 'assistant', label: '🤖 Assistant',   flag: 'triage_mode' },
  { key: 'coach',     label: '🧠 Coach',       flag: 'coach_mode' },
  { key: 'reports',   label: '📊 AI Reports',  flag: 'ai_health_reports' },
  { key: 'wellness',  label: '🌿 Wellness',    flag: 'wellness_goals_ai_feedback' },
  { key: 'imaging',   label: '🫁 Imaging',     flag: 'ai_medical_imaging' },
  { key: 'skin',      label: '🔬 Skin',        flag: 'skin_assessment' },
  { key: 'diet',      label: '🥗 Diet Plan',   flag: 'personalized_diet_plan' },
];

const STORAGE_KEY = 'aihub_tab';

export default function AIHub() {
  const { hasFeature, loading } = useFeatureFlags();
  const scrollRef = useRef(null);

  // Don't filter while loading — wait until flags are resolved to avoid flash
  const visibleTabs = loading ? [] : ALL_TABS.filter(t => hasFeature(t.flag));
  const tabKeys = visibleTabs.map(t => t.key);
  const [activeTab, setActiveTab] = useRoutedTab({
    storageKey: STORAGE_KEY,
    defaultTab: 'insights',
    validTabs: tabKeys.length ? tabKeys : ['insights'],
  });

  useEffect(() => {
    if (!loading && visibleTabs.length > 0 && !visibleTabs.find(t => t.key === activeTab)) {
      setActiveTab(visibleTabs[0].key);
    }
  }, [visibleTabs, activeTab, loading]);

  // Scroll to top whenever tab changes or page mounts
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0, behavior: 'instant' });
    }
    // Also scroll the window/parent to top for mobile nav
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [activeTab]);

  const handleTabChange = (key) => {
    Haptics.light();
    setActiveTab(key);
  };

  // Show loading skeleton while flags resolve
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--hf-bg)' }}>
        <div className="sticky top-0 z-30 px-4 pb-2"
          style={{ background: 'var(--hf-bg)', borderBottom: '1px solid var(--hf-border)', paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))' }}>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-8 w-24 rounded-full flex-shrink-0 animate-pulse"
                style={{ background: 'var(--hf-surface-2)' }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (visibleTabs.length === 0) {
    return (
      <div className="p-6">
        <UpgradePrompt message="AI features are not enabled for your plan. Upgrade to access AI-powered health tools." />
      </div>
    );
  }

  return (
    <div ref={scrollRef} style={{ minHeight: '100vh', background: 'var(--hf-bg)', paddingBottom: '6rem' }}>
      <div className="sticky top-0 z-30 px-4 pb-2"
        style={{ background: 'var(--hf-bg)', borderBottom: '1px solid var(--hf-border)', paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))' }}>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {visibleTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className="whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold flex-shrink-0 transition-all active-press"
              style={{
                background: activeTab === tab.key ? '#c9bbff' : 'var(--hf-surface-2)',
                color: activeTab === tab.key ? '#1a0a40' : 'var(--hf-text-muted)',
                border: activeTab === tab.key ? 'none' : '1px solid var(--hf-border)',
                boxShadow: activeTab === tab.key ? '0 2px 12px rgba(201,187,255,0.35)' : 'none',
              }}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        {activeTab === 'assistant' && <AIAssistant embedded />}
        {activeTab === 'insights'  && <Insights />}
        {activeTab === 'coach'     && <AIHealthCoach />}
        {activeTab === 'reports'   && <AIHealthReports />}
        {activeTab === 'wellness'  && <WellnessInsights />}
        {activeTab === 'imaging'   && <AIMedicalImaging />}
        {activeTab === 'skin'      && <SkinAssessment />}
        {activeTab === 'diet'      && <PersonalizedDiet />}
      </div>
    </div>
  );
}
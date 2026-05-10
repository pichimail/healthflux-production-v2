// @ts-nocheck
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '../components/admin/AdminLayout.jsx';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Zap, Globe, CreditCard, User, Radio } from 'lucide-react';
import { toast } from 'sonner';

const ALL_FLAGS = [
  { key: 'universal_upload', label: 'Universal Upload', description: 'Upload any file type to a profile', category: 'core' },
  { key: 'ocr_processing', label: 'OCR Processing', description: 'Extract text from scanned documents', category: 'ai' },
  { key: 'doc_auto_link_profiles', label: 'Doc Auto-Link Profiles', description: 'Auto-link documents to profiles', category: 'core' },
  { key: 'ai_insights_generate', label: 'AI Insights Generate', description: 'Generate AI health insights', category: 'ai' },
  { key: 'ai_summary_generate', label: 'AI Summary Generate', description: 'Generate AI summaries for documents', category: 'ai' },
  { key: 'triage_mode', label: 'Triage Mode', description: 'AI symptom triage assistant', category: 'ai' },
  { key: 'coach_mode', label: 'AI Health Coach', description: 'Personalized AI health coaching', category: 'ai' },
  { key: 'wellness_module', label: 'Wellness Module', description: 'Wellness insights and tracking', category: 'health' },
  { key: 'wellness_goals', label: 'Wellness Goals', description: 'Set and track wellness goals', category: 'health' },
  { key: 'vitals_logging', label: 'Vitals Logging', description: 'Log and track vital signs', category: 'health' },
  { key: 'labs_module', label: 'Labs Module', description: 'Lab results tracking', category: 'health' },
  { key: 'meds_module', label: 'Medications Module', description: 'Medication management', category: 'health' },
  { key: 'drug_interaction_check', label: 'Drug Interaction Check', description: 'Check for drug-drug interactions', category: 'ai' },
  { key: 'provider_reports_pdf', label: 'Provider Reports PDF', description: 'Export provider-ready PDF reports', category: 'reports' },
  { key: 'export_pdf', label: 'Export PDF', description: 'Export data as PDF', category: 'reports' },
  { key: 'export_csv', label: 'Export CSV', description: 'Export data as CSV', category: 'reports' },
  { key: 'share_links', label: 'Share Links', description: 'Create shareable health links', category: 'sharing' },
  { key: 'care_circle', label: 'Care Circle', description: 'Invite caregivers to access data', category: 'sharing' },
  { key: 'caregiver_portal', label: 'Caregiver Portal', description: 'Dedicated caregiver view', category: 'sharing' },
  { key: 'emergency_profile', label: 'Emergency Profile', description: 'Emergency access profile', category: 'core' },
  { key: 'abha_settings', label: 'ABHA Settings', description: 'Ayushman Bharat Health Account', category: 'integrations' },
  { key: 'wearable_integrations_google_fit', label: 'Google Fit Integration', description: 'Sync with Google Fit', category: 'integrations' },
  { key: 'wearable_integrations_fitbit', label: 'Fitbit Integration', description: 'Sync with Fitbit', category: 'integrations' },
  { key: 'apple_health_import', label: 'Apple Health Import', description: 'Import from Apple Health', category: 'integrations' },
  { key: 'notifications_email', label: 'Email Notifications', description: 'Send email notifications', category: 'notifications' },
  { key: 'notifications_inapp', label: 'In-App Notifications', description: 'Show in-app notifications', category: 'notifications' },
  { key: 'activity_feed', label: 'Activity Feed', description: 'User activity timeline', category: 'core' },
  { key: 'admin_assistant', label: 'Admin Assistant', description: 'AI assistant for admins', category: 'admin' },
  { key: 'admin_analytics', label: 'Admin Analytics', description: 'Advanced admin analytics', category: 'admin' },
  { key: 'user_analytics', label: 'User Analytics', description: 'Per-user health analytics page', category: 'health' },
  { key: 'advanced_reporting_custom_reports', label: 'Custom Reports', description: 'Custom report builder', category: 'reports' },
  // Gamification
  { key: 'gamification_points', label: 'Points System', description: 'Award points for health tracking activities', category: 'gamification' },
  { key: 'gamification_streaks', label: 'Streaks', description: 'Track consecutive days of health logging', category: 'gamification' },
  { key: 'gamification_badges', label: 'Badges & Achievements', description: 'Unlock badges for reaching milestones', category: 'gamification' },
  { key: 'gamification_dashboard', label: 'Rewards Dashboard', description: 'Gamification dashboard for users', category: 'gamification' },
  { key: 'gamification_leaderboard', label: 'Leaderboard', description: 'Global anonymized leaderboard for competition', category: 'gamification' },
  { key: 'gamification_tiers', label: 'Level Tiers', description: 'Progression tiers (Beginner → Legend)', category: 'gamification' },
  { key: 'gamification_health_badges', label: 'Health Achievement Badges', description: 'Special badges: Marathon Runner, Cholesterol Crusher, etc.', category: 'gamification' },
  // Wellness Goals
  { key: 'wellness_goals_tracking', label: 'Goal Tracking', description: 'Set and log daily wellness goals', category: 'wellness_goals' },
  { key: 'wellness_goals_streaks', label: 'Goal Streaks & Milestones', description: 'Track streaks and unlock milestone badges', category: 'wellness_goals' },
  { key: 'wellness_goals_weekly_report', label: 'Weekly Wellness Report', description: 'AI-generated weekly goal achievement summary', category: 'wellness_goals' },
  { key: 'wellness_goals_ai_feedback', label: 'AI Coach Feedback', description: 'Get personalized AI coaching on goal progress', category: 'wellness_goals' },
  // AI Health Reports
  { key: 'ai_health_reports', label: 'AI Health Reports', description: 'Weekly/monthly AI-generated health summaries', category: 'ai' },
  { key: 'ai_risk_predictions', label: 'AI Risk Predictions', description: 'Predict potential health risks from data', category: 'ai' },
  { key: 'ai_lifestyle_suggestions', label: 'AI Lifestyle Suggestions', description: 'Personalized lifestyle recommendations', category: 'ai' },
  { key: 'ai_proactive_checkin', label: 'Proactive AI Check-in', description: 'Daily AI check-in based on health trends', category: 'ai' },
  // Telehealth
  { key: 'telehealth_browse', label: 'Telehealth - Browse Doctors', description: 'Browse available telehealth providers', category: 'telehealth' },
  { key: 'telehealth_booking', label: 'Telehealth - Booking', description: 'Book video consultations with doctors', category: 'telehealth' },
  { key: 'telehealth_video', label: 'Telehealth - Video Call', description: 'Conduct in-app video consultations', category: 'telehealth' },
  { key: 'telehealth_share_records', label: 'Telehealth - Share Records', description: 'Share health records during consultation', category: 'telehealth' },
  { key: 'telehealth_add_doctor', label: 'Telehealth - Add Doctors', description: 'Allow adding custom doctors to the directory', category: 'telehealth' },
  { key: 'telehealth_cancel_appointment', label: 'Telehealth - Cancel Appointments', description: 'Allow users to cancel booked appointments', category: 'telehealth' },
  // Advanced AI Features
  { key: 'heart_rate_camera', label: 'Camera Heart Rate', description: 'Measure heart rate using mobile camera PPG', category: 'advanced_ai' },
  { key: 'ai_medical_imaging', label: 'AI Medical Imaging', description: 'AI analysis of X-rays, CT scans & MRIs', category: 'advanced_ai' },
  { key: 'skin_assessment', label: 'Skin Condition Assessment', description: 'AI-powered skin condition detection & tracking', category: 'advanced_ai' },
  { key: 'ocr_lab_reports', label: 'OCR Lab Report Extraction', description: 'Auto-extract lab values from uploaded PDFs/images', category: 'advanced_ai' },
  { key: 'personalized_diet_plan', label: 'AI Diet Plan Generator', description: 'Personalized weekly diet plans based on health data', category: 'advanced_ai' },
  { key: 'connected_devices', label: 'Connected Devices', description: 'Sync data from wearables (Google Fit, Fitbit, etc.)', category: 'advanced_ai' },
];

const CATEGORY_COLORS = {
  ai: { bg: '#c9bbff', color: '#1a0a40' },
  core: { bg: '#d7f576', color: '#0a1200' },
  health: { bg: '#a8e6cf', color: '#003d20' },
  reports: { bg: '#9bb4ff', color: '#0a1240' },
  sharing: { bg: '#f7c9a3', color: '#3d1a00' },
  integrations: { bg: '#f28c8c', color: '#3d0000' },
  notifications: { bg: '#d7f576', color: '#0a1200' },
  admin: { bg: '#c9bbff', color: '#1a0a40' },
  gamification: { bg: '#ffd6e7', color: '#3d0020' },
  telehealth: { bg: '#b3e0ff', color: '#003d5c' },
  wellness_goals: { bg: '#d7f576', color: '#0a1200' },
  advanced_ai: { bg: '#f28c8c', color: '#3d0000' },
};

const PLANS = ['free', 'pro', 'enterprise'];

export default function AdminFeatureFlags() {
  const [scope, setScope] = useState('global');
  const [scopeId, setScopeId] = useState('');
  const [search, setSearch] = useState('');
  const qc = useQueryClient();

  const { data: assignments = [] } = useQuery({
    queryKey: ['ff-assignments'],
    queryFn: () => base44.entities.FeatureFlagAssignment.list('-created_date', 1000),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['ff-users'],
    queryFn: () => base44.entities.User.list('-created_date', 200),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ flagKey, state }) => {
      const existing = assignments.find(a =>
        a.flag_key === flagKey && a.scope_type === scope && (scope === 'global' || a.scope_id === scopeId)
      );
      if (existing) {
        await base44.entities.FeatureFlagAssignment.update(existing.id, { state });
      } else {
        await base44.entities.FeatureFlagAssignment.create({
          flag_key: flagKey,
          scope_type: scope,
          scope_id: scope === 'global' ? '' : scopeId,
          state,
        });
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['ff-assignments'] });
      const label = ALL_FLAGS.find(f => f.key === vars.flagKey)?.label || vars.flagKey;
      const who = scope === 'global' ? 'all users' : scope === 'plan' ? `${scopeId} plan` : scopeId;
      toast.success(`"${label}" ${vars.state ? 'enabled' : 'disabled'} for ${who}`);
    },
  });

  const getFlagState = (key) => {
    const a = assignments.find(a =>
      a.flag_key === key && a.scope_type === scope && (scope === 'global' ? true : a.scope_id === scopeId)
    );
    if (a) return a.state;
    // default: true for most, false for some
    const defaultFalse = [
      'wearable_integrations_google_fit', 'wearable_integrations_fitbit', 'apple_health_import', 'advanced_reporting_custom_reports',
      'gamification_points', 'gamification_streaks', 'gamification_badges', 'gamification_dashboard',
      'gamification_leaderboard', 'gamification_tiers', 'gamification_health_badges',
      'wellness_goals_weekly_report', 'wellness_goals_ai_feedback',
      'ai_health_reports', 'ai_risk_predictions', 'ai_lifestyle_suggestions', 'ai_proactive_checkin',
      'telehealth_browse', 'telehealth_booking', 'telehealth_video', 'telehealth_share_records',
      'telehealth_add_doctor', 'telehealth_cancel_appointment',
      'heart_rate_camera', 'ai_medical_imaging', 'skin_assessment', 'ocr_lab_reports',
      'personalized_diet_plan', 'connected_devices',
    ];
    return !defaultFalse.includes(key);
  };

  const grouped = {};
  ALL_FLAGS.filter(f => !search || f.label.toLowerCase().includes(search.toLowerCase()) || f.key.includes(search.toLowerCase()))
    .forEach(f => { if (!grouped[f.category]) grouped[f.category] = []; grouped[f.category].push(f); });

  const enabledCount = ALL_FLAGS.filter(f => getFlagState(f.key)).length;

  return (
    <AdminLayout currentPageName="AdminFeatureFlags">
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row justify-between gap-3 items-start sm:items-center">
          <div>
            <h1 className="text-2xl font-black" style={{ color: 'var(--hf-text)' }}>Feature Flags</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-sm" style={{ color: 'var(--hf-text-muted)' }}>{enabledCount}/{ALL_FLAGS.length} enabled</p>
              <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(168,230,207,0.2)', color: 'var(--hf-mint-strong)' }}>
                <Radio size={9} className="animate-pulse" /> Live — changes apply instantly
              </span>
            </div>
          </div>
          <Input placeholder="Search flags…" value={search} onChange={e => setSearch(e.target.value)}
            className="w-full sm:w-52 rounded-2xl text-sm h-9"
            style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)', color: 'var(--hf-text)' }} />
        </div>

        {/* Scope Selector */}
        <div className="rounded-[20px] p-4 space-y-3" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
          <p className="text-xs font-bold uppercase" style={{ color: 'var(--hf-text-muted)' }}>Override Scope</p>
          <div className="flex gap-2 flex-wrap">
            {[
              { val: 'global', icon: Globe, label: 'Global' },
              { val: 'plan', icon: CreditCard, label: 'Plan' },
              { val: 'user', icon: User, label: 'User' },
            ].map(s => (
              <button key={s.val} onClick={() => { setScope(s.val); setScopeId(''); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                style={{
                  background: scope === s.val ? '#d7f576' : 'var(--hf-surface-2)',
                  color: scope === s.val ? '#0a1200' : 'var(--hf-text-muted)',
                }}>
                <s.icon size={11} />{s.label}
              </button>
            ))}
          </div>
          {scope === 'plan' && (
            <Select value={scopeId} onValueChange={setScopeId}>
              <SelectTrigger className="rounded-xl h-8 text-xs w-48" style={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)', color: 'var(--hf-text)' }}>
                <SelectValue placeholder="Select plan" />
              </SelectTrigger>
              <SelectContent>
                {PLANS.map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          {scope === 'user' && (
            <Select value={scopeId} onValueChange={setScopeId}>
              <SelectTrigger className="rounded-xl h-8 text-xs w-64" style={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)', color: 'var(--hf-text)' }}>
                <SelectValue placeholder="Select user" />
              </SelectTrigger>
              <SelectContent>
                {users.map(u => <SelectItem key={u.email} value={u.email}>{u.full_name || u.email}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          {scope !== 'global' && !scopeId && (
            <p className="text-xs" style={{ color: 'var(--hf-text-muted)' }}>Select a {scope} to manage its overrides.</p>
          )}
        </div>

        {/* Flag Groups */}
        {(scope === 'global' || scopeId) && Object.entries(grouped).map(([cat, items]) => {
          const cc = CATEGORY_COLORS[cat] || { bg: '#d7f576', color: '#0a1200' };
          return (
            <div key={cat}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full" style={{ background: cc.bg, color: cc.color }}>
                  {cat}
                </span>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                {items.map(flag => {
                  const on = getFlagState(flag.key);
                  const hasOverride = assignments.some(a =>
                    a.flag_key === flag.key && a.scope_type === scope && (scope === 'global' ? true : a.scope_id === scopeId)
                  );
                  return (
                    <div key={flag.key}
                      className="flex items-start justify-between gap-3 p-4 rounded-[18px] transition-all"
                      style={{
                        background: on ? 'var(--hf-surface)' : 'var(--hf-surface-2)',
                        border: `1px solid ${hasOverride ? cc.bg : 'var(--hf-border)'}`,
                      }}>
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                          style={{ background: on ? cc.bg : 'var(--hf-surface-2)' }}>
                          <Zap size={14} style={{ color: on ? cc.color : 'var(--hf-text-muted)' }} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold" style={{ color: 'var(--hf-text)' }}>{flag.label}</p>
                            {hasOverride && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: cc.bg, color: cc.color }}>override</span>
                            )}
                          </div>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--hf-text-muted)' }}>{flag.description}</p>
                          <code className="text-[9px] mt-1 block" style={{ color: 'var(--hf-text-muted)', opacity: 0.6 }}>{flag.key}</code>
                        </div>
                      </div>
                      <Switch checked={on} onCheckedChange={(v) => toggleMutation.mutate({ flagKey: flag.key, state: v })} className="flex-shrink-0 mt-1" />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </AdminLayout>
  );
}

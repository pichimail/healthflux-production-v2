// @ts-nocheck
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { X, Loader2, CreditCard, Flag, BarChart2, ScrollText, Shield, Plus, Minus } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const PLANS = {
  free: { name: 'Free', price: '$0/mo', color: 'var(--hf-mint-strong)', tc: '#003d20' },
  pro: { name: 'Pro', price: '$9/mo', color: 'var(--hf-lemon-strong)', tc: '#0a1200' },
  enterprise: { name: 'Enterprise', price: 'Custom', color: 'var(--hf-lavender-strong)', tc: '#1a0a40' },
};

const ALL_FLAGS = [
  { key: 'universal_upload', label: 'Universal Upload' },
  { key: 'ocr_processing', label: 'OCR Processing' },
  { key: 'ai_insights_generate', label: 'AI Insights Generate' },
  { key: 'ai_summary_generate', label: 'AI Summary Generate' },
  { key: 'triage_mode', label: 'Triage Mode' },
  { key: 'coach_mode', label: 'AI Coach' },
  { key: 'wellness_module', label: 'Wellness Module' },
  { key: 'wellness_goals', label: 'Wellness Goals' },
  { key: 'vitals_logging', label: 'Vitals Logging' },
  { key: 'labs_module', label: 'Labs Module' },
  { key: 'meds_module', label: 'Medications Module' },
  { key: 'drug_interaction_check', label: 'Drug Interaction Check' },
  { key: 'provider_reports_pdf', label: 'Provider Reports PDF' },
  { key: 'export_pdf', label: 'Export PDF' },
  { key: 'export_csv', label: 'Export CSV' },
  { key: 'share_links', label: 'Share Links' },
  { key: 'care_circle', label: 'Care Circle' },
  { key: 'emergency_profile', label: 'Emergency Profile' },
  { key: 'abha_settings', label: 'ABHA Settings' },
  { key: 'user_analytics', label: 'User Analytics' },
];

const QUOTA_KEYS = [
  { key: 'ai_insights', label: 'AI Insights' },
  { key: 'ocr_pages', label: 'OCR Pages' },
  { key: 'exports', label: 'Exports' },
  { key: 'documents', label: 'Documents' },
];

const cardStyle = { background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)', borderRadius: 16, padding: '1rem' };

export default function UserDetailDrawer({ user, onClose }) {
  const qc = useQueryClient();
  const [creditAmount, setCreditAmount] = useState('');
  const [creditOp, setCreditOp] = useState('grant');
  const email = user.email;

  const { data: subs = [] } = useQuery({ queryKey: ['ud-subs', email], queryFn: () => base44.entities.UserSubscription.filter({ user_email: email }) });
  const { data: entitlements = [] } = useQuery({ queryKey: ['ud-ent', email], queryFn: () => base44.entities.UserEntitlement.filter({ user_email: email }) });
  const { data: credits = [] } = useQuery({ queryKey: ['ud-credits', email], queryFn: () => base44.entities.UserCredits.filter({ user_email: email }) });
  const { data: flagAssignments = [] } = useQuery({ queryKey: ['ud-flags', email], queryFn: () => base44.entities.FeatureFlagAssignment.filter({ scope_type: 'user', scope_id: email }) });
  const { data: meters = [] } = useQuery({ queryKey: ['ud-meters', email], queryFn: () => base44.entities.UsageMeter.filter({ user_email: email }) });
  const { data: auditLogs = [] } = useQuery({ queryKey: ['ud-audit', email], queryFn: () => base44.entities.AuditLog.filter({ target_email: email }, '-created_date', 20) });
  const { data: profiles = [] } = useQuery({ queryKey: ['ud-profiles', email], queryFn: () => base44.entities.Profile.filter({ created_by: email }) });

  const activeSub = subs.find(s => s.status === 'active' || s.status === 'trialing');
  const creditRecord = credits[0];
  const entitlementRecord = entitlements[0];

  const logAudit = async (action, details) => {
    const actor = await base44.auth.me();
    await base44.entities.AuditLog.create({ actor_email: actor.email, target_email: email, action, details });
    qc.invalidateQueries({ queryKey: ['ud-audit', email] });
  };

  const assignPlanMutation = useMutation({
    mutationFn: async (planKey) => {
      if (activeSub) {
        await base44.entities.UserSubscription.update(activeSub.id, { plan_key: planKey, status: 'active', start_at: new Date().toISOString() });
      } else {
        await base44.entities.UserSubscription.create({ user_email: email, plan_key: planKey, status: 'active', start_at: new Date().toISOString() });
      }
    },
    onSuccess: async (_, planKey) => {
      await logAudit('assign_plan', { plan: planKey });
      qc.invalidateQueries({ queryKey: ['ud-subs', email] });
      toast.success('Plan assigned');
    },
  });

  const grantCreditsMutation = useMutation({
    mutationFn: async () => {
      const amount = parseInt(creditAmount);
      if (!amount) return;
      const delta = creditOp === 'grant' ? amount : -amount;
      if (creditRecord) {
        await base44.entities.UserCredits.update(creditRecord.id, {
          credits_balance: Math.max(0, (creditRecord.credits_balance || 0) + delta),
          credits_used: creditOp === 'deduct' ? (creditRecord.credits_used || 0) + amount : creditRecord.credits_used,
        });
      } else {
        await base44.entities.UserCredits.create({ user_email: email, credits_balance: Math.max(0, delta), credits_used: 0, reset_policy: 'none' });
      }
    },
    onSuccess: async () => {
      await logAudit('adjust_credits', { op: creditOp, amount: creditAmount });
      qc.invalidateQueries({ queryKey: ['ud-credits', email] });
      setCreditAmount('');
      toast.success('Credits updated');
    },
  });

  const setResetPolicyMutation = useMutation({
    mutationFn: async (policy) => {
      if (creditRecord) {
        await base44.entities.UserCredits.update(creditRecord.id, { reset_policy: policy });
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ud-credits', email] }); toast.success('Reset policy updated'); },
  });

  const toggleFlagMutation = useMutation({
    mutationFn: async ({ flagKey, state }) => {
      const existing = flagAssignments.find(a => a.flag_key === flagKey);
      if (existing) {
        await base44.entities.FeatureFlagAssignment.update(existing.id, { state });
      } else {
        await base44.entities.FeatureFlagAssignment.create({ flag_key: flagKey, scope_type: 'user', scope_id: email, state });
      }
    },
    onSuccess: async (_, { flagKey, state }) => {
      await logAudit('toggle_flag', { flag: flagKey, state });
      qc.invalidateQueries({ queryKey: ['ud-flags', email] });
      toast.success('Flag updated');
    },
  });

  const updateLimitMutation = useMutation({
    mutationFn: async ({ key, value }) => {
      const overrides = entitlementRecord?.overrides_json || {};
      const updated = { ...overrides, [key]: value };
      if (entitlementRecord) {
        await base44.entities.UserEntitlement.update(entitlementRecord.id, { overrides_json: updated });
      } else {
        await base44.entities.UserEntitlement.create({ user_email: email, overrides_json: updated, effective_from: new Date().toISOString() });
      }
    },
    onSuccess: async (_, { key, value }) => {
      await logAudit('update_limit', { key, value });
      qc.invalidateQueries({ queryKey: ['ud-ent', email] });
      toast.success('Limit updated');
    },
  });

  const getFlagState = (key) => {
    const a = flagAssignments.find(a => a.flag_key === key);
    return a ? a.state : null; // null = inherited
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/60" onClick={onClose} />
      <div className="w-full max-w-2xl flex flex-col overflow-hidden" style={{ background: 'var(--hf-bg)', borderLeft: '1px solid var(--hf-border)' }}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--hf-border)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center font-black" style={{ background: '#c9bbff', color: '#1a0a40' }}>
              {user.full_name?.[0] || user.email?.[0]}
            </div>
            <div>
              <p className="font-bold" style={{ color: 'var(--hf-text)' }}>{user.full_name || 'No name'}</p>
              <p className="text-xs" style={{ color: 'var(--hf-text-muted)' }}>{user.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5" style={{ color: 'var(--hf-text-muted)' }}>
            <X size={18} />
          </button>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-4 gap-2 p-4 border-b" style={{ borderColor: 'var(--hf-border)' }}>
          {[
            { label: 'Plan', value: PLANS[activeSub?.plan_key || 'free']?.name || 'Free' },
            { label: 'Profiles', value: profiles.length },
            { label: 'Credits', value: creditRecord?.credits_balance ?? 0 },
            { label: 'Role', value: user.role || 'user' },
          ].map(s => (
            <div key={s.label} className="text-center p-2 rounded-[14px]" style={{ background: 'var(--hf-surface)' }}>
              <p className="text-lg font-black" style={{ color: 'var(--hf-text)' }}>{s.value}</p>
              <p className="text-[9px] font-bold uppercase" style={{ color: 'var(--hf-text-muted)' }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex-1 overflow-y-auto">
          <Tabs defaultValue="plan" className="h-full">
            <TabsList className="mx-4 mt-3 mb-0 rounded-2xl grid grid-cols-5 gap-1 h-9"
              style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
              {[
                { value: 'plan', icon: CreditCard, label: 'Plan' },
                { value: 'flags', icon: Flag, label: 'Flags' },
                { value: 'limits', icon: BarChart2, label: 'Limits' },
                { value: 'credits', icon: Shield, label: 'Credits' },
                { value: 'audit', icon: ScrollText, label: 'Audit' },
              ].map(t => (
                <TabsTrigger key={t.value} value={t.value} className="rounded-xl text-[10px] font-bold flex items-center gap-1">
                  <t.icon size={11} />{t.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Plan Tab */}
            <TabsContent value="plan" className="p-4 space-y-4">
              <div style={cardStyle}>
                <p className="text-xs font-bold uppercase mb-3" style={{ color: 'var(--hf-text-muted)' }}>Current Plan</p>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(PLANS).map(([key, p]) => (
                    <button key={key} onClick={() => assignPlanMutation.mutate(key)}
                      className="p-3 rounded-[14px] text-center border-2 transition-all"
                      style={{
                        background: activeSub?.plan_key === key ? p.color : 'var(--hf-surface)',
                        borderColor: activeSub?.plan_key === key ? p.color : 'var(--hf-border)',
                        color: activeSub?.plan_key === key ? p.tc : 'var(--hf-text)',
                      }}>
                      <p className="font-black text-sm">{p.name}</p>
                      <p className="text-[10px] opacity-70">{p.price}</p>
                    </button>
                  ))}
                </div>
              </div>

              {activeSub && (
                <div style={cardStyle}>
                  <p className="text-xs font-bold uppercase mb-3" style={{ color: 'var(--hf-text-muted)' }}>Subscription Details</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span style={{ color: 'var(--hf-text-muted)' }}>Status</span>
                      <span className="font-bold" style={{ color: activeSub.status === 'active' ? '#d7f576' : '#f28c8c' }}>{activeSub.status}</span></div>
                    <div className="flex justify-between"><span style={{ color: 'var(--hf-text-muted)' }}>Started</span>
                      <span style={{ color: 'var(--hf-text)' }}>{activeSub.start_at ? format(new Date(activeSub.start_at), 'MMM d, yyyy') : '—'}</span></div>
                    <div className="flex justify-between"><span style={{ color: 'var(--hf-text-muted)' }}>Renews</span>
                      <span style={{ color: 'var(--hf-text)' }}>{activeSub.renew_at ? format(new Date(activeSub.renew_at), 'MMM d, yyyy') : '—'}</span></div>
                  </div>
                </div>
              )}

              {/* Entitlement overrides */}
              <div style={cardStyle}>
                <p className="text-xs font-bold uppercase mb-3" style={{ color: 'var(--hf-text-muted)' }}>Entitlement Overrides</p>
                <div className="space-y-3">
                  {[
                    { key: 'max_profiles', label: 'Max Profiles', type: 'number' },
                    { key: 'max_documents', label: 'Max Documents', type: 'number' },
                    { key: 'caregiver_seats', label: 'Caregiver Seats', type: 'number' },
                  ].map(f => (
                    <div key={f.key} className="flex items-center gap-3">
                      <Label className="text-xs flex-1" style={{ color: 'var(--hf-text)' }}>{f.label}</Label>
                      <Input type="number" className="w-24 h-7 text-xs rounded-xl"
                        style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)', color: 'var(--hf-text)' }}
                        defaultValue={entitlementRecord?.overrides_json?.[f.key] ?? ''}
                        placeholder="inherit"
                        onBlur={e => { if (e.target.value !== '') updateLimitMutation.mutate({ key: f.key, value: parseInt(e.target.value) }); }} />
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Feature Flags Tab */}
            <TabsContent value="flags" className="p-4">
              <p className="text-xs mb-3" style={{ color: 'var(--hf-text-muted)' }}>User-level overrides. "Inherit" means the plan/global default applies.</p>
              <div className="space-y-2">
                {ALL_FLAGS.map(flag => {
                  const state = getFlagState(flag.key);
                  return (
                    <div key={flag.key} className="flex items-center justify-between p-3 rounded-[14px]" style={{ background: 'var(--hf-surface)' }}>
                      <div>
                        <p className="text-sm font-medium" style={{ color: 'var(--hf-text)' }}>{flag.label}</p>
                        <code className="text-[9px]" style={{ color: 'var(--hf-text-muted)' }}>{flag.key}</code>
                      </div>
                      <div className="flex items-center gap-2">
                        {state === null && <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'var(--hf-border)', color: 'var(--hf-text-muted)' }}>inherit</span>}
                        <Switch
                          checked={state === null ? true : state}
                          onCheckedChange={(v) => toggleFlagMutation.mutate({ flagKey: flag.key, state: v })}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            {/* Limits Tab */}
            <TabsContent value="limits" className="p-4 space-y-4">
              <p className="text-xs mb-2" style={{ color: 'var(--hf-text-muted)' }}>Usage meters track feature consumption per period.</p>
              {QUOTA_KEYS.map(q => {
                const now = new Date();
                const periodKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                const meter = meters.find(m => m.feature_key === q.key && m.period_key === periodKey);
                const pct = meter?.limit_count && meter.limit_count !== -1 ? Math.min(100, Math.round((meter.used_count / meter.limit_count) * 100)) : 0;
                return (
                  <div key={q.key} style={cardStyle}>
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-sm font-bold" style={{ color: 'var(--hf-text)' }}>{q.label}</p>
                      <span className="text-xs" style={{ color: 'var(--hf-text-muted)' }}>
                        {meter ? `${meter.used_count} / ${meter.limit_count === -1 ? '∞' : meter.limit_count}` : 'No meter'}
                      </span>
                    </div>
                    {meter && meter.limit_count !== -1 && (
                      <div className="h-2 rounded-full mb-3 overflow-hidden" style={{ background: 'var(--hf-border)' }}>
                        <div className="h-full rounded-full transition-all" style={{
                          width: `${pct}%`,
                          background: pct > 80 ? '#f28c8c' : pct > 50 ? '#f7c9a3' : '#d7f576',
                        }} />
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Input type="number" placeholder="Set limit (-1=∞)"
                        className="flex-1 h-7 text-xs rounded-xl"
                        style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)', color: 'var(--hf-text)' }}
                        defaultValue={meter?.limit_count ?? ''}
                        onBlur={async (e) => {
                          if (e.target.value === '') return;
                          const limit = parseInt(e.target.value);
                          if (meter) {
                            await base44.entities.UsageMeter.update(meter.id, { limit_count: limit, updated_at: new Date().toISOString() });
                          } else {
                            await base44.entities.UsageMeter.create({ user_email: email, feature_key: q.key, period_key: periodKey, used_count: 0, limit_count: limit, updated_at: new Date().toISOString() });
                          }
                          qc.invalidateQueries({ queryKey: ['ud-meters', email] });
                          toast.success('Limit saved');
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </TabsContent>

            {/* Credits Tab */}
            <TabsContent value="credits" className="p-4 space-y-4">
              <div style={cardStyle}>
                <p className="text-xs font-bold uppercase mb-3" style={{ color: 'var(--hf-text-muted)' }}>Credits Balance</p>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center font-black text-2xl"
                    style={{ background: (creditRecord?.credits_balance ?? 0) > 0 ? '#d7f576' : '#f28c8c', color: '#0a1200' }}>
                    {creditRecord?.credits_balance ?? 0}
                  </div>
                  <div>
                    <p className="text-sm font-bold" style={{ color: 'var(--hf-text)' }}>{creditRecord?.credits_balance ?? 0} credits remaining</p>
                    <p className="text-xs" style={{ color: 'var(--hf-text-muted)' }}>{creditRecord?.credits_used ?? 0} used total</p>
                  </div>
                </div>

                <div className="flex gap-2 mb-3">
                  <button onClick={() => setCreditOp('grant')} className="flex-1 py-1.5 rounded-xl text-xs font-bold transition-all"
                    style={{ background: creditOp === 'grant' ? '#d7f576' : 'var(--hf-surface)', color: creditOp === 'grant' ? '#0a1200' : 'var(--hf-text-muted)' }}>
                    <Plus size={12} className="inline mr-1" />Grant
                  </button>
                  <button onClick={() => setCreditOp('deduct')} className="flex-1 py-1.5 rounded-xl text-xs font-bold transition-all"
                    style={{ background: creditOp === 'deduct' ? '#f28c8c' : 'var(--hf-surface)', color: creditOp === 'deduct' ? '#3d0000' : 'var(--hf-text-muted)' }}>
                    <Minus size={12} className="inline mr-1" />Deduct
                  </button>
                </div>
                <div className="flex gap-2">
                  <Input type="number" placeholder="Amount" value={creditAmount} onChange={e => setCreditAmount(e.target.value)}
                    className="flex-1 rounded-xl text-sm"
                    style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)', color: 'var(--hf-text)' }} />
                  <Button onClick={() => grantCreditsMutation.mutate()} disabled={!creditAmount || grantCreditsMutation.isPending}
                    className="rounded-xl font-bold px-4"
                    style={{ background: '#d7f576', color: '#0a1200' }}>
                    {grantCreditsMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : 'Apply'}
                  </Button>
                </div>
              </div>

              <div style={cardStyle}>
                <p className="text-xs font-bold uppercase mb-3" style={{ color: 'var(--hf-text-muted)' }}>Reset Policy</p>
                <Select value={creditRecord?.reset_policy || 'none'} onValueChange={v => setResetPolicyMutation.mutate(v)}>
                  <SelectTrigger className="rounded-xl" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)', color: 'var(--hf-text)' }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No reset</SelectItem>
                    <SelectItem value="monthly">Monthly reset</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            {/* Audit Log Tab */}
            <TabsContent value="audit" className="p-4">
              {auditLogs.length === 0 ? (
                <p className="text-sm text-center py-8" style={{ color: 'var(--hf-text-muted)' }}>No audit logs yet.</p>
              ) : (
                <div className="space-y-2">
                  {auditLogs.map((log, i) => (
                    <div key={i} className="p-3 rounded-[14px]" style={{ background: 'var(--hf-surface)' }}>
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <p className="text-xs font-bold" style={{ color: 'var(--hf-text)' }}>{log.action?.replace(/_/g, ' ')}</p>
                          <p className="text-[10px]" style={{ color: 'var(--hf-text-muted)' }}>by {log.actor_email}</p>
                          {log.details && (
                            <code className="text-[9px] block mt-1" style={{ color: 'var(--hf-text-muted)' }}>
                              {JSON.stringify(log.details)}
                            </code>
                          )}
                        </div>
                        <p className="text-[9px] flex-shrink-0" style={{ color: 'var(--hf-text-muted)' }}>
                          {log.created_date ? format(new Date(log.created_date), 'MMM d, HH:mm') : '—'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

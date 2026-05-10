import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { CheckCircle2, Clock, XCircle, Zap, Shield, Star, ChevronRight, RotateCcw, ArrowUpCircle, ArrowDownCircle, Loader2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

const PLAN_META = {
  free: {
    label: 'Free', color: '#a8e6cf', tc: '#003d20',
    price: '₹0', cycle: 'Forever',
    features: ['5 Health Profiles', 'Basic Vitals Tracking', 'Medication Reminders', '10 Documents/month', 'Basic AI Insights'],
  },
  pro: {
    label: 'Pro', color: '#d7f576', tc: '#0a1200',
    price: '₹499', cycle: '/month',
    features: ['Unlimited Profiles', 'Advanced Analytics', 'AI Health Coach', 'Unlimited Documents', 'Lab Result OCR', 'Care Circle', 'Priority Support'],
  },
  enterprise: {
    label: 'Enterprise', color: '#c9bbff', tc: '#1a0a40',
    price: '₹1,999', cycle: '/month',
    features: ['Everything in Pro', 'Multi-family Management', 'Custom Integrations', 'Dedicated Support', 'SLA 99.9%', 'Audit Logs', 'API Access'],
  },
};

function StatusBadge({ status }) {
  const cfg = {
    active:    { color: '#a8e6cf', bg: 'rgba(168,230,207,0.15)', icon: <CheckCircle2 size={11} /> },
    trialing:  { color: '#d7f576', bg: 'rgba(215,245,118,0.15)', icon: <Clock size={11} /> },
    cancelled: { color: '#f7c9a3', bg: 'rgba(247,201,163,0.15)', icon: <RotateCcw size={11} /> },
    expired:   { color: '#f28c8c', bg: 'rgba(242,140,140,0.15)', icon: <XCircle size={11} /> },
    past_due:  { color: '#f28c8c', bg: 'rgba(242,140,140,0.15)', icon: <XCircle size={11} /> },
  }[status] || { color: 'var(--hf-text-muted)', bg: 'var(--hf-surface-2)', icon: null };

  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase"
      style={{ color: cfg.color, background: cfg.bg }}>
      {cfg.icon} {status?.replace('_', ' ')}
    </span>
  );
}

function PlanCard({ planKey, sub, isActive, onUpgrade, onDowngrade }) {
  const meta = PLAN_META[planKey] || PLAN_META.free;
  const isCurrent = isActive;
  return (
    <div className="rounded-[22px] p-5 flex flex-col gap-3 transition-all"
      style={{
        background: isCurrent ? meta.color : 'var(--hf-surface)',
        border: isCurrent ? `2px solid ${meta.color}` : '1px solid var(--hf-border)',
        boxShadow: isCurrent ? `0 8px 32px ${meta.color}40` : 'none',
      }}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-widest" style={{ color: isCurrent ? meta.tc : 'var(--hf-text-muted)', opacity: 0.7 }}>Plan</p>
          <p className="text-xl font-black" style={{ color: isCurrent ? meta.tc : 'var(--hf-text)' }}>{meta.label}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black" style={{ color: isCurrent ? meta.tc : 'var(--hf-text)' }}>{meta.price}</p>
          <p className="text-[10px]" style={{ color: isCurrent ? meta.tc : 'var(--hf-text-muted)', opacity: 0.7 }}>{meta.cycle}</p>
        </div>
      </div>
      <ul className="space-y-1.5">
        {meta.features.map(f => (
          <li key={f} className="flex items-center gap-2 text-[11px] font-semibold"
            style={{ color: isCurrent ? meta.tc : 'var(--hf-text-muted)' }}>
            <CheckCircle2 size={11} style={{ flexShrink: 0 }} /> {f}
          </li>
        ))}
      </ul>
      {!isCurrent && (
        <button onClick={() => onUpgrade(planKey)}
          className="w-full h-10 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95"
          style={{ background: meta.color, color: meta.tc }}>
          <ArrowUpCircle size={13} /> Select {meta.label}
        </button>
      )}
    </div>
  );
}

export default function Subscription() {
  const queryClient = useQueryClient();
  const [cancelStep, setCancelStep] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');

  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me(), staleTime: 60000 });
  const { data: subs = [], isLoading } = useQuery({
    queryKey: ['subscriptions', user?.email],
    queryFn: () => base44.entities.Subscription.filter({ user_email: user.email }, '-start_date'),
    enabled: !!user,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Subscription.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries(['subscriptions']); toast.success('Updated!'); },
    onError: (e) => toast.error(e.message),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Subscription.create(data),
    onSuccess: () => { queryClient.invalidateQueries(['subscriptions']); toast.success('Subscription updated!'); },
  });

  const activeSub = subs.find(s => s.status === 'active' || s.status === 'trialing');
  const currentPlan = activeSub?.plan_key || 'free';

  const filteredSubs = activeFilter === 'all' ? subs
    : activeFilter === 'active' ? subs.filter(s => ['active','trialing'].includes(s.status))
    : subs.filter(s => ['cancelled','expired','past_due'].includes(s.status));

  const handleAutoRenewToggle = (sub) => {
    updateMutation.mutate({ id: sub.id, data: { auto_renew: !sub.auto_renew } });
  };

  const handleUpgrade = async (planKey) => {
    if (!user) return;
    if (activeSub) {
      updateMutation.mutate({ id: activeSub.id, data: { plan_key: planKey, status: 'active' } });
    } else {
      const now = new Date().toISOString();
      const end = new Date(Date.now() + 30 * 86400000).toISOString();
      createMutation.mutate({ user_email: user.email, plan_key: planKey, status: 'active', start_date: now, end_date: end, auto_renew: true });
    }
  };

  const handleCancel = () => {
    if (!activeSub) return;
    updateMutation.mutate({ id: activeSub.id, data: { status: 'cancelled', auto_renew: false } });
    setCancelStep(false);
    toast.success('Subscription cancelled.');
  };

  if (isLoading) return (
    <div className="bento-page flex items-center justify-center min-h-[40vh]">
      <Loader2 className="animate-spin" style={{ color: 'var(--hf-text-muted)' }} />
    </div>
  );

  return (
    <div className="bento-page">
      <div className="bento-header">
        <h1 className="bento-title flex items-center gap-2">
          <Star size={22} style={{ color: '#d7f576' }} /> Subscription
        </h1>
        <p className="bento-subtitle">Manage your plan & billing</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-5 overflow-x-auto scrollbar-hide">
        {[['all','All'], ['active','Active'], ['expired','Past']].map(([k, label]) => (
          <button key={k} onClick={() => setActiveFilter(k)}
            className="px-4 py-1.5 rounded-full text-xs font-bold flex-shrink-0 transition-all"
            style={{
              background: activeFilter === k ? '#d7f576' : 'var(--hf-surface-2)',
              color: activeFilter === k ? '#0a1200' : 'var(--hf-text-muted)',
              border: activeFilter === k ? 'none' : '1px solid var(--hf-border)',
            }}>
            {label}
          </button>
        ))}
      </div>

      {/* Active Subscription Card */}
      {activeSub ? (
        <div className="rounded-[24px] p-5 mb-5"
          style={{ background: 'linear-gradient(135deg, rgba(215,245,118,0.12), rgba(168,230,207,0.08))', border: '1.5px solid rgba(215,245,118,0.3)' }}>
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: 'var(--hf-text-muted)' }}>Current Plan</p>
              <p className="text-2xl font-black" style={{ color: 'var(--hf-text)' }}>{PLAN_META[activeSub.plan_key]?.label || activeSub.plan_key}</p>
              <p className="text-sm font-bold mt-0.5" style={{ color: 'var(--hf-text-muted)' }}>
                {PLAN_META[activeSub.plan_key]?.price}{PLAN_META[activeSub.plan_key]?.cycle}
              </p>
            </div>
            <StatusBadge status={activeSub.status} />
          </div>

          <div className="grid grid-cols-2 gap-2 mb-4">
            {activeSub.start_date && (
              <div className="p-3 rounded-2xl" style={{ background: 'var(--hf-surface-2)' }}>
                <p className="text-[9px] font-black uppercase tracking-widest mb-1" style={{ color: 'var(--hf-text-muted)' }}>Started</p>
                <p className="text-xs font-bold" style={{ color: 'var(--hf-text)' }}>{new Date(activeSub.start_date).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}</p>
              </div>
            )}
            {activeSub.end_date && (
              <div className="p-3 rounded-2xl" style={{ background: 'var(--hf-surface-2)' }}>
                <p className="text-[9px] font-black uppercase tracking-widest mb-1" style={{ color: 'var(--hf-text-muted)' }}>Renews</p>
                <p className="text-xs font-bold" style={{ color: 'var(--hf-text)' }}>{new Date(activeSub.end_date).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}</p>
              </div>
            )}
          </div>

          {/* Auto-renew toggle */}
          <div className="flex items-center justify-between p-3 rounded-2xl mb-4" style={{ background: 'var(--hf-surface-2)' }}>
            <div>
              <p className="text-xs font-bold" style={{ color: 'var(--hf-text)' }}>Auto-renew</p>
              <p className="text-[10px]" style={{ color: 'var(--hf-text-muted)' }}>Automatically renew when plan expires</p>
            </div>
            <Switch checked={!!activeSub.auto_renew} onCheckedChange={() => handleAutoRenewToggle(activeSub)}
              disabled={updateMutation.isPending} />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Link to="/payments" className="flex-1 h-11 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95"
              style={{ background: '#d7f576', color: '#0a1200' }}>
              <ArrowUpCircle size={14} /> Upgrade Plan
            </Link>
            <button onClick={() => setCancelStep(true)}
              className="flex-1 h-11 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95"
              style={{ background: 'rgba(242,140,140,0.1)', color: 'var(--hf-coral-strong)', border: '1px solid rgba(242,140,140,0.25)' }}>
              <XCircle size={14} /> Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-[24px] p-5 mb-5 text-center"
          style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
          <p className="text-3xl mb-2">✨</p>
          <p className="font-black" style={{ color: 'var(--hf-text)' }}>You're on the Free plan</p>
          <p className="text-xs mt-1 mb-4" style={{ color: 'var(--hf-text-muted)' }}>Upgrade to unlock all AI health features</p>
          <Link to="/payments" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold"
            style={{ background: '#d7f576', color: '#0a1200' }}>
            <Zap size={15} /> View Plans
          </Link>
        </div>
      )}

      {/* Plan Comparison */}
      <p className="text-[10px] font-black uppercase tracking-widest mb-3 px-1" style={{ color: 'var(--hf-text-muted)' }}>
        Compare Plans
      </p>
      <div className="grid md:grid-cols-3 gap-3 mb-5">
        {Object.keys(PLAN_META).map(planKey => (
          <PlanCard key={planKey}
            planKey={planKey}
            isActive={currentPlan === planKey}
            sub={activeSub}
            onUpgrade={handleUpgrade}
            onDowngrade={handleUpgrade}
          />
        ))}
      </div>

      {/* Subscription History */}
      {filteredSubs.length > 0 && (
        <>
          <p className="text-[10px] font-black uppercase tracking-widest mb-3 px-1" style={{ color: 'var(--hf-text-muted)' }}>History</p>
          <div className="space-y-2">
            {filteredSubs.map(sub => (
              <div key={sub.id} className="flex items-center justify-between p-4 rounded-2xl"
                style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
                <div>
                  <p className="text-sm font-black" style={{ color: 'var(--hf-text)' }}>
                    {PLAN_META[sub.plan_key]?.label || sub.plan_key}
                  </p>
                  {sub.start_date && (
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--hf-text-muted)' }}>
                      {new Date(sub.start_date).toLocaleDateString('en-IN', { month:'short', year:'numeric' })}
                      {sub.end_date && ` → ${new Date(sub.end_date).toLocaleDateString('en-IN', { month:'short', year:'numeric' })}`}
                    </p>
                  )}
                </div>
                <StatusBadge status={sub.status} />
              </div>
            ))}
          </div>
        </>
      )}

      {/* Cancel confirm dialog */}
      {cancelStep && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
          onClick={() => setCancelStep(false)}>
          <div className="rounded-[24px] p-5 w-full max-w-sm space-y-4"
            style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}
            onClick={e => e.stopPropagation()}>
            <div className="text-center">
              <p className="text-2xl mb-2">😔</p>
              <p className="font-black text-base" style={{ color: 'var(--hf-text)' }}>Cancel subscription?</p>
              <p className="text-xs mt-1" style={{ color: 'var(--hf-text-muted)' }}>
                You'll keep access until {activeSub?.end_date ? new Date(activeSub.end_date).toLocaleDateString('en-IN') : 'end of period'}.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setCancelStep(false)} className="flex-1 h-11 rounded-2xl text-sm font-bold"
                style={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)', color: 'var(--hf-text-muted)' }}>
                Keep Plan
              </button>
              <button onClick={handleCancel} disabled={updateMutation.isPending}
                className="flex-1 h-11 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ background: 'rgba(242,140,140,0.15)', color: 'var(--hf-coral-strong)', border: '1px solid rgba(242,140,140,0.35)' }}>
                {updateMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : null}
                Yes, Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
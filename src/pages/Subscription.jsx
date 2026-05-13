import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { CheckCircle2, Star, Zap, Loader2 } from 'lucide-react';

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

function PlanCard({ planKey, isActive }) {
  const meta = PLAN_META[planKey] || PLAN_META.free;
  return (
    <div className="rounded-[22px] p-5 flex flex-col gap-3 transition-all"
      style={{
        background: isActive ? meta.color : 'var(--hf-surface)',
        border: isActive ? `2px solid ${meta.color}` : '1px solid var(--hf-border)',
      }}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-widest" style={{ color: isActive ? meta.tc : 'var(--hf-text-muted)', opacity: 0.7 }}>Plan</p>
          <p className="text-xl font-black" style={{ color: isActive ? meta.tc : 'var(--hf-text)' }}>{meta.label}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black" style={{ color: isActive ? meta.tc : 'var(--hf-text)' }}>{meta.price}</p>
          <p className="text-[10px]" style={{ color: isActive ? meta.tc : 'var(--hf-text-muted)', opacity: 0.7 }}>{meta.cycle}</p>
        </div>
      </div>
      <ul className="space-y-1.5">
        {meta.features.map(f => (
          <li key={f} className="flex items-center gap-2 text-[11px] font-semibold" style={{ color: isActive ? meta.tc : 'var(--hf-text-muted)' }}>
            <CheckCircle2 size={11} style={{ flexShrink: 0 }} /> {f}
          </li>
        ))}
      </ul>
      {!isActive && (
        <Link to="/payments" className="w-full h-10 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5"
          style={{ background: meta.color, color: meta.tc }}>
          Select {meta.label}
        </Link>
      )}
    </div>
  );
}

export default function Subscription() {
  const [activeFilter, setActiveFilter] = useState('all');

  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me(), staleTime: 60000 });
  const { data: subs = [], isLoading } = useQuery({
    queryKey: ['user-subscriptions', user?.email],
    queryFn: () => base44.entities.UserSubscription.filter({ user_email: user.email }, '-start_at'),
    enabled: !!user,
  });

  const activeSub = useMemo(() => subs.find(s => s.status === 'active' || s.status === 'trialing'), [subs]);
  const currentPlan = activeSub?.plan_key || 'free';

  const filteredSubs = activeFilter === 'all' ? subs
    : activeFilter === 'active' ? subs.filter(s => ['active', 'trialing'].includes(s.status))
    : subs.filter(s => ['cancelled', 'expired', 'past_due'].includes(s.status));

  if (isLoading) {
    return <div className="bento-page flex items-center justify-center min-h-[40vh]"><Loader2 className="animate-spin" style={{ color: 'var(--hf-text-muted)' }} /></div>;
  }

  return (
    <div className="bento-page">
      <div className="bento-header">
        <h1 className="bento-title flex items-center gap-3">
          <span className="text-3xl leading-none" aria-hidden="true">🌟</span>
          Subscription
        </h1>
        <p className="bento-subtitle">Manage your plan & billing</p>
      </div>

      <div className="flex gap-2 mb-5 overflow-x-auto scrollbar-hide">
        {[['all', 'All'], ['active', 'Active'], ['expired', 'Past']].map(([k, label]) => (
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

      <div className="rounded-[24px] p-5 mb-5 text-center" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
        <p className="text-3xl mb-2">✨</p>
        <p className="font-black" style={{ color: 'var(--hf-text)' }}>
          {activeSub ? `You're on the ${PLAN_META[currentPlan]?.label || currentPlan} plan` : "You're on the Free plan"}
        </p>
        <p className="text-xs mt-1 mb-4" style={{ color: 'var(--hf-text-muted)' }}>Upgrade to unlock all AI health features</p>
        <Link to="/payments" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold" style={{ background: '#d7f576', color: '#0a1200' }}>
          <Zap size={15} /> View Plans
        </Link>
      </div>

      <p className="text-[10px] font-black uppercase tracking-widest mb-3 px-1" style={{ color: 'var(--hf-text-muted)' }}>Compare Plans</p>
      <div className="grid md:grid-cols-3 gap-3 mb-5">
        {Object.keys(PLAN_META).map((planKey) => <PlanCard key={planKey} planKey={planKey} isActive={currentPlan === planKey} />)}
      </div>

      {filteredSubs.length > 0 && (
        <>
          <p className="text-[10px] font-black uppercase tracking-widest mb-3 px-1" style={{ color: 'var(--hf-text-muted)' }}>History</p>
          <div className="space-y-2">
            {filteredSubs.map((sub) => (
              <div key={sub.id} className="flex items-center justify-between p-4 rounded-2xl" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
                <div>
                  <p className="text-sm font-black" style={{ color: 'var(--hf-text)' }}>{PLAN_META[sub.plan_key]?.label || sub.plan_key}</p>
                  {sub.start_at && <p className="text-[10px] mt-0.5" style={{ color: 'var(--hf-text-muted)' }}>{new Date(sub.start_at).toLocaleDateString('en-IN')}</p>}
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase"
                  style={{ color: 'var(--hf-text-muted)', background: 'var(--hf-surface-2)' }}>
                  <Star size={11} /> {sub.status?.replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

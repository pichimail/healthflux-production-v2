import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Loader2, CheckCircle2, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const PLAN_STYLES = {
  free: { bg: '#a8e6cf', tc: '#003d20' },
  pro: { bg: '#d7f576', tc: '#0a1200' },
  enterprise: { bg: '#c9bbff', tc: '#1a0a40' },
};

export default function Payments() {
  const qc = useQueryClient();

  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me(), staleTime: 60000 });
  const { data: plansData, isLoading: plansLoading } = useQuery({
    queryKey: ['payment-plans'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/payments/plans`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch plans');
      return res.json();
    },
  });

  const { data: subs = [] } = useQuery({
    queryKey: ['user-subscriptions', me?.email],
    queryFn: () => base44.entities.UserSubscription.filter({ user_email: me.email }, '-start_at'),
    enabled: !!me,
  });

  const activePlan = subs.find((s) => ['active', 'trialing'].includes(s.status))?.plan_key || 'free';

  const subscribeMutation = useMutation({
    mutationFn: async (planKey) => {
      const headers = { 'Content-Type': 'application/json' };
      try {
        const session = await base44.auth.me();
        if (session?.email) headers['x-user-email'] = session.email;
      } catch {}

      const res = await fetch(`${API_BASE}/payments/subscribe`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ user_email: me.email, plan_key: planKey }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Subscription failed');
      return json;
    },
    onSuccess: () => {
      toast.success('Subscription updated successfully');
      qc.invalidateQueries({ queryKey: ['user-subscriptions', me?.email] });
    },
    onError: (error) => toast.error(error.message),
  });

  const plans = plansData?.plans || [];

  return (
    <div className="bento-page">
      <div className="bento-header">
        <h1 className="bento-title flex items-center gap-2"><CreditCard size={22} /> Payments</h1>
        <p className="bento-subtitle">Choose a plan and activate instantly</p>
      </div>

      {plansLoading ? (
        <div className="flex items-center justify-center min-h-[30vh]"><Loader2 className="animate-spin" style={{ color: 'var(--hf-text-muted)' }} /></div>
      ) : (
        <div className="grid md:grid-cols-3 gap-3">
          {plans.map((plan) => {
            const s = PLAN_STYLES[plan.key] || { bg: 'var(--hf-surface-2)', tc: 'var(--hf-text)' };
            const isCurrent = activePlan === plan.key;
            return (
              <div key={plan.key} className="rounded-[22px] p-5" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
                <p className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--hf-text-muted)' }}>Plan</p>
                <p className="text-xl font-black mt-1" style={{ color: 'var(--hf-text)' }}>{plan.title}</p>
                <p className="text-2xl font-black mt-3" style={{ color: 'var(--hf-text)' }}>₹{plan.amount_inr}</p>
                <p className="text-xs" style={{ color: 'var(--hf-text-muted)' }}>/ {plan.interval}</p>

                <button
                  disabled={isCurrent || subscribeMutation.isPending}
                  onClick={() => subscribeMutation.mutate(plan.key)}
                  className="w-full h-11 rounded-2xl text-sm font-bold mt-4 disabled:opacity-60"
                  style={{ background: s.bg, color: s.tc }}>
                  {isCurrent ? <span className="inline-flex items-center gap-2"><CheckCircle2 size={14} /> Current Plan</span> : 'Select Plan'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

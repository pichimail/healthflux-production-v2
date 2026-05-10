import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useActiveProfile } from '@/components/ActiveProfileContext';
import { Salad, Loader2, Sparkles, ChevronDown, ChevronUp, Apple, AlertTriangle, Flame } from 'lucide-react';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_COLORS = ['#d7f576', '#9bb4ff', '#c9bbff', '#a8e6cf', '#f7c9a3', '#f28c8c', '#9bb4ff'];

function DayCard({ day, plan, color }) {
  const [open, setOpen] = useState(false);
  if (!plan) return null;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black" style={{ background: color, color: '#0a1200' }}>
            {day.slice(0, 2)}
          </div>
          <div className="text-left">
            <p className="text-sm font-bold" style={{ color: 'var(--hf-text)' }}>{day}</p>
            <p className="text-xs" style={{ color: 'var(--hf-text-muted)' }}>{plan.calories || '—'} kcal</p>
          </div>
        </div>
        {open ? <ChevronUp size={16} style={{ color: 'var(--hf-text-muted)' }} /> : <ChevronDown size={16} style={{ color: 'var(--hf-text-muted)' }} />}
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-2.5 border-t" style={{ borderColor: 'var(--hf-border)' }}>
          {[
            { emoji: '🌅', label: 'Breakfast', value: plan.breakfast },
            { emoji: '☀️', label: 'Lunch', value: plan.lunch },
            { emoji: '🌙', label: 'Dinner', value: plan.dinner },
            { emoji: '🍎', label: 'Snacks', value: plan.snacks },
          ].map(meal => meal.value && (
            <div key={meal.label} className="p-3 rounded-xl" style={{ background: 'var(--hf-surface-2)' }}>
              <p className="text-xs font-bold mb-1" style={{ color: 'var(--hf-text-muted)' }}>{meal.emoji} {meal.label}</p>
              <p className="text-sm" style={{ color: 'var(--hf-text)' }}>{meal.value}</p>
            </div>
          ))}
          {plan.notes && (
            <div className="p-3 rounded-xl" style={{ background: 'rgba(215,245,118,0.07)', border: '1px solid rgba(215,245,118,0.2)' }}>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--hf-lemon-strong)' }}>💡 {plan.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function PersonalizedDiet() {
  const { activeProfile } = useActiveProfile();
  const [generating, setGenerating] = useState(false);
  const qc = useQueryClient();

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['diet-plans', activeProfile?.id],
    queryFn: () => base44.entities.PersonalizedDietPlan.filter({ profile_id: activeProfile.id }, '-week_start', 5),
    enabled: !!activeProfile?.id,
  });

  const currentPlan = plans.find(p => p.status === 'ready');

  const generatePlan = async () => {
    if (!activeProfile?.id) { toast.error('Select a profile first'); return; }
    setGenerating(true);
    try {
      await base44.functions.invoke('generateDietPlan', { profile_id: activeProfile.id });
      qc.invalidateQueries({ queryKey: ['diet-plans'] });
      toast.success('Personalized diet plan generated!');
    } catch (err) {
      toast.error('Generation failed: ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  const macroData = currentPlan?.nutritional_goals ? [
    { name: 'Protein', value: currentPlan.nutritional_goals.protein_g || 0, color: 'var(--hf-sky-strong)' },
    { name: 'Carbs', value: currentPlan.nutritional_goals.carbs_g || 0, color: 'var(--hf-lemon-strong)' },
    { name: 'Fat', value: currentPlan.nutritional_goals.fat_g || 0, color: 'var(--hf-peach-strong)' },
    { name: 'Fiber', value: currentPlan.nutritional_goals.fiber_g || 0, color: 'var(--hf-mint-strong)' },
  ] : [];

  const dayPlans = DAYS.reduce((acc, day) => {
    const found = currentPlan?.daily_plans?.find(p => p.day === day);
    acc[day] = found;
    return acc;
  }, {});

  return (
    <div className="bento-page max-w-2xl mx-auto">
      <div className="bento-header">
        <h1 className="bento-title flex items-center gap-2">
          <Salad size={28} style={{ color: 'var(--hf-mint-strong)' }} /> AI Diet Plan
        </h1>
        <p className="bento-subtitle">Personalized weekly nutrition based on your health data</p>
      </div>

      {/* Generate Button */}
      <button
        onClick={generatePlan}
        disabled={generating}
        className="w-full p-4 rounded-3xl flex items-center justify-center gap-3 mb-4 transition-all active:scale-95 disabled:opacity-60"
        style={{ background: '#d7f576', color: '#0a1200' }}>
        {generating ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
        <span className="font-black text-sm">{generating ? 'Generating Your Plan…' : currentPlan ? 'Regenerate My Plan' : 'Generate My Personalized Plan'}</span>
        {generating && <span className="text-xs opacity-70">Analyzing your health data…</span>}
      </button>

      {isLoading && <div className="text-center py-8"><Loader2 size={24} className="animate-spin mx-auto" style={{ color: 'var(--hf-mint-strong)' }} /></div>}

      {currentPlan && (
        <>
          {/* AI Rationale */}
          {currentPlan.ai_rationale && (
            <div className="rounded-3xl p-4 mb-4" style={{ background: 'rgba(201,187,255,0.08)', border: '1px solid rgba(201,187,255,0.2)' }}>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={14} style={{ color: 'var(--hf-lavender-strong)' }} />
                <p className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--hf-lavender-strong)' }}>Why This Plan</p>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--hf-text)' }}>{currentPlan.ai_rationale}</p>
              {currentPlan.health_conditions_addressed?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {currentPlan.health_conditions_addressed.map((c, i) => (
                    <span key={i} className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: 'rgba(201,187,255,0.2)', color: 'var(--hf-lavender-strong)' }}>{c}</span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Macro Chart */}
          {macroData.length > 0 && (
            <div className="rounded-3xl p-4 mb-4" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Flame size={14} style={{ color: 'var(--hf-peach-strong)' }} />
                  <p className="text-sm font-bold" style={{ color: 'var(--hf-text)' }}>Daily Targets</p>
                </div>
                <span className="text-lg font-black" style={{ color: 'var(--hf-lemon-strong)' }}>{currentPlan.nutritional_goals?.calories} kcal</span>
              </div>
              <ResponsiveContainer width="100%" height={100}>
                <BarChart data={macroData}>
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--hf-text-muted)' }} />
                  <YAxis hide />
                  <Tooltip contentStyle={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)', borderRadius: 12, fontSize: 11 }} formatter={(v) => [`${v}g`]} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {macroData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Weekly Meal Plans */}
          <div className="space-y-2.5 mb-4">
            <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: 'var(--hf-text-muted)' }}>This Week's Meals</p>
            {DAYS.map((day, i) => <DayCard key={day} day={day} plan={dayPlans[day]} color={DAY_COLORS[i]} />)}
          </div>

          {/* Foods Grid */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {currentPlan.foods_to_include?.length > 0 && (
              <div className="rounded-3xl p-4" style={{ background: 'rgba(168,230,207,0.08)', border: '1px solid rgba(168,230,207,0.2)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <Apple size={14} style={{ color: 'var(--hf-mint-strong)' }} />
                  <p className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--hf-mint-strong)' }}>Eat More</p>
                </div>
                <div className="space-y-1">
                  {currentPlan.foods_to_include.slice(0, 6).map((f, i) => (
                    <p key={i} className="text-xs flex items-center gap-1.5" style={{ color: 'var(--hf-text)' }}>
                      <span style={{ color: 'var(--hf-mint-strong)' }}>✓</span> {f}
                    </p>
                  ))}
                </div>
              </div>
            )}
            {currentPlan.foods_to_avoid?.length > 0 && (
              <div className="rounded-3xl p-4" style={{ background: 'rgba(242,140,140,0.07)', border: '1px solid rgba(242,140,140,0.2)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle size={14} style={{ color: 'var(--hf-coral-strong)' }} />
                  <p className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--hf-coral-strong)' }}>Avoid</p>
                </div>
                <div className="space-y-1">
                  {currentPlan.foods_to_avoid.slice(0, 6).map((f, i) => (
                    <p key={i} className="text-xs flex items-center gap-1.5" style={{ color: 'var(--hf-text)' }}>
                      <span style={{ color: 'var(--hf-coral-strong)' }}>✕</span> {f}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Lifestyle Tips */}
          {currentPlan.lifestyle_tips?.length > 0 && (
            <div className="rounded-3xl p-4" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
              <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: 'var(--hf-sky-strong)' }}>Lifestyle Tips</p>
              <div className="space-y-2">
                {currentPlan.lifestyle_tips.map((tip, i) => (
                  <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-xl" style={{ background: 'rgba(155,180,255,0.07)', border: '1px solid rgba(155,180,255,0.15)' }}>
                    <span className="text-xs font-black w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: '#9bb4ff', color: '#0a1240' }}>{i + 1}</span>
                    <p className="text-sm" style={{ color: 'var(--hf-text)' }}>{tip}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {!isLoading && !currentPlan && !generating && (
        <div className="text-center py-12 rounded-3xl" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
          <Salad size={36} className="mx-auto mb-3" style={{ color: 'var(--hf-text-muted)', opacity: 0.4 }} />
          <p className="text-sm font-bold" style={{ color: 'var(--hf-text-muted)' }}>No diet plan yet</p>
          <p className="text-xs mt-1" style={{ color: 'var(--hf-text-muted)', opacity: 0.6 }}>Tap "Generate My Personalized Plan" to start</p>
        </div>
      )}
    </div>
  );
}

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Sparkles, Utensils, RefreshCw } from 'lucide-react';
import { MarkdownContent } from '@/components/ui/markdown-content';
import { callAI } from '../utils/aiService';
import { toast } from 'sonner';

export default function DietPlanTab({ activeProfile, vitals, meds }) {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [goal, setGoal] = useState('balanced');

  const GOALS = [
    { key: 'balanced', label: '⚖️ Balanced', desc: 'Overall health' },
    { key: 'weight_loss', label: '🔥 Weight Loss', desc: 'Caloric deficit' },
    { key: 'muscle_gain', label: '💪 Muscle Gain', desc: 'High protein' },
    { key: 'heart_health', label: '❤️ Heart Health', desc: 'Low sodium/fat' },
    { key: 'diabetes', label: '🩸 Diabetes', desc: 'Low glycemic' },
    { key: 'energy', label: '⚡ Energy', desc: 'Stamina boost' },
  ];

  const generate = async () => {
    setLoading(true);
    try {
      const vStr = vitals.slice(0, 6).map(v => `${v.vital_type}: ${v.value || `${v.systolic}/${v.diastolic}`} ${v.unit || ''}`).join(', ');
      const mStr = meds.map(m => `${m.medication_name} ${m.dosage}`).join(', ');
      const p = activeProfile;
      const age = p?.date_of_birth ? new Date().getFullYear() - new Date(p.date_of_birth).getFullYear() : '?';

      // AI_FEATURE: Personalized diet plan | PROVIDER: claude
      const result = await callAI({
        prompt: `You are a certified nutritionist. Create a personalized 7-day diet plan.

Patient: ${p?.full_name}, Age: ${age}, Gender: ${p?.gender || '?'}, Conditions: ${p?.chronic_conditions?.join(', ') || 'none'}, Allergies: ${p?.allergies?.join(', ') || 'none'}
Vitals: ${vStr || 'none'}
Medications: ${mStr || 'none'}
Goal: ${goal.replace(/_/g, ' ')}

Create a practical, culturally sensitive diet plan with:
## 🥗 Your Personalized Diet Plan (${goal.replace(/_/g, ' ')})
## 📋 Daily Nutrition Targets (calories, macros)
## 🌅 Sample Day Plan (Breakfast, Lunch, Dinner, Snacks)
## 📆 7-Day Meal Overview (brief per day)
## ✅ Foods to Include
## ❌ Foods to Avoid
## 💧 Hydration & Supplements
## ⚠️ Important Notes

Be specific, practical, and reference actual patient data. Keep meals realistic.`
      });
      setPlan(result);
    } catch {
      toast.error('Failed to generate diet plan');
    }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      {/* Goal selector */}
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest mb-2 px-1" style={{ color: 'var(--hf-text-muted)' }}>Diet Goal</p>
        <div className="grid grid-cols-3 gap-2">
          {GOALS.map(g => (
            <button key={g.key} onClick={() => setGoal(g.key)}
              className="p-2.5 rounded-2xl text-left transition-all"
              style={{
                background: goal === g.key ? 'rgba(215,245,118,0.15)' : 'var(--hf-surface-2)',
                border: goal === g.key ? '1.5px solid #d7f576' : '1px solid var(--hf-border)',
              }}>
              <p className="text-xs font-bold" style={{ color: goal === g.key ? '#d7f576' : 'var(--hf-text)' }}>{g.label}</p>
              <p className="text-[9px]" style={{ color: 'var(--hf-text-muted)' }}>{g.desc}</p>
            </button>
          ))}
        </div>
      </div>

      <Button onClick={generate} disabled={loading}
        className="w-full h-11 rounded-2xl font-bold" style={{ background: '#d7f576', color: '#0a1200' }}>
        {loading ? <><Loader2 size={14} className="animate-spin mr-2" />Generating plan…</> : <><Utensils size={14} className="mr-2" />Generate Diet Plan</>}
      </Button>

      {loading && (
        <div className="flex flex-col items-center py-12 gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(215,245,118,0.15)' }}>
            <Sparkles size={24} className="animate-pulse" style={{ color: 'var(--hf-lemon-strong)' }} />
          </div>
          <p className="text-sm font-bold" style={{ color: 'var(--hf-text)' }}>Crafting your personalized diet plan…</p>
        </div>
      )}

      {plan && !loading && (
        <Card className="border-0 card-shadow rounded-2xl">
          <CardHeader className="p-4 pb-2 border-b" style={{ borderColor: 'var(--hf-border)' }}>
            <CardTitle className="text-sm font-bold flex items-center justify-between" style={{ color: 'var(--hf-text)' }}>
              <span className="flex items-center gap-2"><Utensils size={14} style={{ color: 'var(--hf-lemon-strong)' }} /> Diet Plan</span>
              <button onClick={generate} className="p-1.5 rounded-xl" style={{ background: 'var(--hf-surface-2)' }}>
                <RefreshCw size={11} style={{ color: 'var(--hf-text-muted)' }} />
              </button>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <MarkdownContent content={plan} className="text-xs" />
            <p className="text-[9px] mt-3 p-2 rounded-xl" style={{ background: 'rgba(247,201,163,0.1)', color: 'var(--hf-text-muted)', border: '1px solid rgba(247,201,163,0.2)' }}>
              ⚠️ This is AI-generated guidance. Consult a registered dietitian for medical nutrition therapy.
            </p>
          </CardContent>
        </Card>
      )}

      {!plan && !loading && (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">🥗</div>
          <p className="text-sm font-bold" style={{ color: 'var(--hf-text)' }}>Personalized Diet Plan</p>
          <p className="text-xs mt-1 max-w-xs mx-auto" style={{ color: 'var(--hf-text-muted)' }}>
            Select your goal and generate a tailored 7-day meal plan based on your health profile.
          </p>
        </div>
      )}
    </div>
  );
}

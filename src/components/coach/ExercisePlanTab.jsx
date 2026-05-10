import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Sparkles, Dumbbell, RefreshCw } from 'lucide-react';
import { MarkdownContent } from '@/components/ui/markdown-content';
import { callAI } from '../utils/aiService';
import { toast } from 'sonner';

export default function ExercisePlanTab({ activeProfile, vitals, meds }) {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [level, setLevel] = useState('beginner');
  const [focus, setFocus] = useState('overall');

  const LEVELS = [
    { key: 'beginner', label: '🌱 Beginner' },
    { key: 'intermediate', label: '⚡ Intermediate' },
    { key: 'advanced', label: '🏆 Advanced' },
  ];

  const FOCUS_AREAS = [
    { key: 'overall', label: '🎯 Overall', desc: 'Full body' },
    { key: 'cardio', label: '🏃 Cardio', desc: 'Heart health' },
    { key: 'strength', label: '💪 Strength', desc: 'Muscle building' },
    { key: 'flexibility', label: '🧘 Flexibility', desc: 'Mobility' },
    { key: 'weight_loss', label: '🔥 Weight Loss', desc: 'Burn calories' },
    { key: 'rehabilitation', label: '🩺 Rehab', desc: 'Recovery' },
  ];

  const generate = async () => {
    setLoading(true);
    try {
      const vStr = vitals.slice(0, 6).map(v => `${v.vital_type}: ${v.value || `${v.systolic}/${v.diastolic}`} ${v.unit || ''}`).join(', ');
      const mStr = meds.map(m => m.medication_name).join(', ');
      const p = activeProfile;
      const age = p?.date_of_birth ? new Date().getFullYear() - new Date(p.date_of_birth).getFullYear() : '?';

      // AI_FEATURE: Personalized exercise routine | PROVIDER: claude
      const result = await callAI({
        prompt: `You are a certified personal trainer and sports medicine specialist. Create a personalized exercise program.

Patient: ${p?.full_name}, Age: ${age}, Gender: ${p?.gender || '?'}, Conditions: ${p?.chronic_conditions?.join(', ') || 'none'}
Vitals: ${vStr || 'none'}
Medications: ${mStr || 'none'}
Fitness Level: ${level}
Focus Area: ${focus.replace(/_/g, ' ')}

Create a safe, progressive exercise plan with:
## 🏋️ Your ${focus.replace(/_/g, ' ')} Exercise Program (${level})
## ⚠️ Safety Precautions (based on conditions/meds)
## 📅 Weekly Schedule (Mon–Sun)
## 🔥 Warm-Up Routine (5–10 min)
## 💪 Main Workout Details (sets, reps, rest)
## 🧊 Cool-Down & Stretching
## 📈 Progression Plan (4 weeks)
## 🎯 Target Heart Rate Zones

Reference actual vitals when relevant. Include modifications for any health conditions.`
      });
      setPlan(result);
    } catch {
      toast.error('Failed to generate exercise plan');
    }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      {/* Level selector */}
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest mb-2 px-1" style={{ color: 'var(--hf-text-muted)' }}>Fitness Level</p>
        <div className="flex gap-2">
          {LEVELS.map(l => (
            <button key={l.key} onClick={() => setLevel(l.key)}
              className="flex-1 py-2.5 rounded-2xl text-xs font-bold transition-all"
              style={{
                background: level === l.key ? '#a8e6cf' : 'var(--hf-surface-2)',
                color: level === l.key ? '#003d20' : 'var(--hf-text-muted)',
                border: level === l.key ? '1.5px solid #a8e6cf' : '1px solid var(--hf-border)',
              }}>
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {/* Focus area */}
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest mb-2 px-1" style={{ color: 'var(--hf-text-muted)' }}>Focus Area</p>
        <div className="grid grid-cols-3 gap-2">
          {FOCUS_AREAS.map(f => (
            <button key={f.key} onClick={() => setFocus(f.key)}
              className="p-2.5 rounded-2xl text-left transition-all"
              style={{
                background: focus === f.key ? 'rgba(168,230,207,0.15)' : 'var(--hf-surface-2)',
                border: focus === f.key ? '1.5px solid #a8e6cf' : '1px solid var(--hf-border)',
              }}>
              <p className="text-xs font-bold" style={{ color: focus === f.key ? '#a8e6cf' : 'var(--hf-text)' }}>{f.label}</p>
              <p className="text-[9px]" style={{ color: 'var(--hf-text-muted)' }}>{f.desc}</p>
            </button>
          ))}
        </div>
      </div>

      <Button onClick={generate} disabled={loading}
        className="w-full h-11 rounded-2xl font-bold" style={{ background: '#a8e6cf', color: '#003d20' }}>
        {loading ? <><Loader2 size={14} className="animate-spin mr-2" />Generating…</> : <><Dumbbell size={14} className="mr-2" />Generate Exercise Plan</>}
      </Button>

      {loading && (
        <div className="flex flex-col items-center py-12 gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(168,230,207,0.15)' }}>
            <Sparkles size={24} className="animate-pulse" style={{ color: 'var(--hf-mint-strong)' }} />
          </div>
          <p className="text-sm font-bold" style={{ color: 'var(--hf-text)' }}>Building your exercise program…</p>
        </div>
      )}

      {plan && !loading && (
        <Card className="border-0 card-shadow rounded-2xl">
          <CardHeader className="p-4 pb-2 border-b" style={{ borderColor: 'var(--hf-border)' }}>
            <CardTitle className="text-sm font-bold flex items-center justify-between" style={{ color: 'var(--hf-text)' }}>
              <span className="flex items-center gap-2"><Dumbbell size={14} style={{ color: 'var(--hf-mint-strong)' }} /> Exercise Plan</span>
              <button onClick={generate} className="p-1.5 rounded-xl" style={{ background: 'var(--hf-surface-2)' }}>
                <RefreshCw size={11} style={{ color: 'var(--hf-text-muted)' }} />
              </button>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <MarkdownContent content={plan} className="text-xs" />
            <p className="text-[9px] mt-3 p-2 rounded-xl" style={{ background: 'rgba(242,140,140,0.08)', color: 'var(--hf-text-muted)', border: '1px solid rgba(242,140,140,0.15)' }}>
              ⚠️ Consult your doctor before starting a new exercise program, especially with existing health conditions.
            </p>
          </CardContent>
        </Card>
      )}

      {!plan && !loading && (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">🏋️</div>
          <p className="text-sm font-bold" style={{ color: 'var(--hf-text)' }}>Personalized Exercise Program</p>
          <p className="text-xs mt-1 max-w-xs mx-auto" style={{ color: 'var(--hf-text-muted)' }}>
            Get a safe, tailored workout plan that considers your health conditions and fitness level.
          </p>
        </div>
      )}
    </div>
  );
}

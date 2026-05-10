import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Footprints, Moon, Heart, Flame, Loader2, Check } from 'lucide-react';

const QUICK_VITALS = [
  { key: 'steps', label: 'Steps', icon: Footprints, color: 'var(--hf-sky-strong)', unit: 'steps', placeholder: '8000', vitalType: null, goalCategory: 'steps' },
  { key: 'sleep', label: 'Sleep', icon: Moon, color: 'var(--hf-lavender-strong)', unit: 'hours', placeholder: '7.5', vitalType: null, goalCategory: 'sleep' },
  { key: 'heart_rate', label: 'Heart Rate', icon: Heart, color: 'var(--hf-coral-strong)', unit: 'bpm', placeholder: '72', vitalType: 'heart_rate', goalCategory: null },
  { key: 'calories', label: 'Calories', icon: Flame, color: 'var(--hf-peach-strong)', unit: 'kcal', placeholder: '2000', vitalType: null, goalCategory: 'calories' },
];

export default function QuickVitalEntry({ profileId }) {
  const [values, setValues] = useState({});
  const [saving, setSaving] = useState({});
  const [saved, setSaved] = useState({});
  const qc = useQueryClient();

  const handleSave = async (vital) => {
    const val = parseFloat(values[vital.key]);
    if (isNaN(val) || val <= 0) { toast.error('Enter a valid number'); return; }

    setSaving(s => ({ ...s, [vital.key]: true }));
    const now = new Date().toISOString();

    const promises = [];

    // Save as vital measurement if it maps to one
    if (vital.vitalType) {
      promises.push(
        base44.entities.VitalMeasurement.create({
          profile_id: profileId,
          vital_type: vital.vitalType,
          value: val,
          unit: vital.unit,
          measured_at: now,
          source: 'manual',
          notes: 'Quick entry',
        })
      );
    }

    // Update wellness goal if applicable
    if (vital.goalCategory) {
      promises.push(
        base44.entities.WellnessGoal.filter({ profile_id: profileId, category: vital.goalCategory })
          .then(goals => {
            if (goals.length > 0) {
              return base44.entities.WellnessGoal.update(goals[0].id, { current_value: val });
            }
          })
      );
    }

    await Promise.all(promises);
    qc.invalidateQueries({ queryKey: ['wellness-goals'] });
    qc.invalidateQueries({ queryKey: ['vitals'] });

    setSaving(s => ({ ...s, [vital.key]: false }));
    setSaved(s => ({ ...s, [vital.key]: true }));
    setValues(v => ({ ...v, [vital.key]: '' }));
    toast.success(`${vital.label} logged!`);

    setTimeout(() => setSaved(s => ({ ...s, [vital.key]: false })), 2000);
  };

  return (
    <div className="rounded-3xl overflow-hidden" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
      <div className="p-4 border-b" style={{ borderColor: 'var(--hf-border)' }}>
        <h3 className="text-sm font-black" style={{ color: 'var(--hf-text)' }}>⚡ Quick Log</h3>
        <p className="text-xs mt-0.5" style={{ color: 'var(--hf-text-muted)' }}>Tap, type, done — log vitals in seconds</p>
      </div>
      <div className="p-4 grid grid-cols-2 gap-3">
        {QUICK_VITALS.map(vital => {
          const Icon = vital.icon;
          const isSaving = saving[vital.key];
          const isSaved = saved[vital.key];
          return (
            <div key={vital.key} className="rounded-2xl p-3" style={{ background: `${vital.color}10`, border: `1px solid ${vital.color}25` }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${vital.color}20` }}>
                  <Icon size={14} style={{ color: vital.color }} />
                </div>
                <div>
                  <p className="text-xs font-bold" style={{ color: vital.color }}>{vital.label}</p>
                  <p className="text-[9px]" style={{ color: 'var(--hf-text-muted)' }}>{vital.unit}</p>
                </div>
              </div>
              <div className="flex gap-1.5">
                <Input
                  type="number"
                  inputMode="decimal"
                  placeholder={vital.placeholder}
                  value={values[vital.key] || ''}
                  onChange={e => setValues(v => ({ ...v, [vital.key]: e.target.value }))}
                  className="h-9 rounded-xl text-sm flex-1"
                  style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)', color: 'var(--hf-text)' }}
                />
                <button
                  onClick={() => handleSave(vital)}
                  disabled={isSaving || !values[vital.key]}
                  className="h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all active:scale-90 disabled:opacity-40"
                  style={{ background: isSaved ? '#a8e6cf' : vital.color, color: isSaved ? '#003d20' : '#0a1200' }}>
                  {isSaving ? <Loader2 size={14} className="animate-spin" /> : isSaved ? <Check size={14} /> : <Check size={14} />}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

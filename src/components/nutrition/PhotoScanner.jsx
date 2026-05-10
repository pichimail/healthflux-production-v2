/**
 * PhotoScanner — inline AI meal photo analysis.
 * Shows macros + personalized feedback (goal alignment, medication warnings, tips).
 */
import React, { useState, useRef } from 'react';
import { Camera, Upload, X, Loader2, CheckCircle2, AlertCircle, Sparkles, ShieldAlert, Target, Lightbulb, TrendingUp } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function PhotoScanner({ profileId, mealType, onConfirm }) {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const fileRef = useRef(null);
  const cameraRef = useRef(null);

  const analyzeFile = async (file) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    setResult(null);
    setError('');
    setLoading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const res = await base44.functions.invoke('nutritionImageAnalysis', {
        file_url,
        profile_id: profileId,
        meal_type: mealType || 'snack',
        save_to_log: false,
      });
      const analysis = res?.data?.analysis;
      if (!analysis) throw new Error('No analysis returned');
      setResult(analysis);
    } catch (e) {
      setError(e?.message || 'Could not analyze image. Please try again.');
    }
    setLoading(false);
  };

  const reset = () => { setPreview(null); setResult(null); setError(''); };

  const scoreColor = (score) => {
    if (score >= 75) return '#a8e6cf';
    if (score >= 50) return '#d7f576';
    if (score >= 30) return '#f7c9a3';
    return '#f28c8c';
  };

  return (
    <div className="space-y-3">
      {!preview && (
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => cameraRef.current?.click()}
            className="flex flex-col items-center justify-center gap-2 py-6 rounded-2xl font-bold text-xs active:scale-[0.97] transition-all"
            style={{ background: 'rgba(168,230,207,0.1)', color: 'var(--hf-mint-strong)', border: '1.5px dashed rgba(168,230,207,0.4)' }}>
            <Camera size={22} /> Take Photo
          </button>
          <button onClick={() => fileRef.current?.click()}
            className="flex flex-col items-center justify-center gap-2 py-6 rounded-2xl font-bold text-xs active:scale-[0.97] transition-all"
            style={{ background: 'rgba(215,245,118,0.1)', color: 'var(--hf-lemon-strong)', border: '1.5px dashed rgba(215,245,118,0.4)' }}>
            <Upload size={22} /> Upload Image
          </button>
        </div>
      )}

      {preview && (
        <div className="relative rounded-2xl overflow-hidden">
          <img src={preview} alt="Meal" className="w-full object-cover rounded-2xl" style={{ maxHeight: 220 }} />
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl"
              style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}>
              <Sparkles size={22} className="animate-pulse" style={{ color: 'var(--hf-lemon-strong)' }} />
              <p className="text-xs font-black" style={{ color: 'var(--hf-lemon-strong)' }}>AI Analyzing your meal…</p>
              <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.6)' }}>Checking health goals & medications</p>
              <Loader2 size={18} className="animate-spin mt-1" style={{ color: 'var(--hf-mint-strong)' }} />
            </div>
          )}
          {!loading && (
            <button onClick={reset}
              className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.6)' }} aria-label="Remove photo">
              <X size={13} style={{ color: '#fff' }} />
            </button>
          )}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
          style={{ background: 'rgba(242,140,140,0.1)', border: '1px solid rgba(242,140,140,0.2)' }}>
          <AlertCircle size={14} style={{ color: 'var(--hf-coral-strong)' }} />
          <p className="text-xs font-semibold" style={{ color: 'var(--hf-coral-strong)' }}>{error}</p>
        </div>
      )}

      {result && !loading && (
        <div className="space-y-3">
          {/* Food name + score */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2 flex-1 min-w-0">
              <CheckCircle2 size={15} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--hf-mint-strong)' }} />
              <div className="min-w-0">
                <p className="text-sm font-black" style={{ color: 'var(--hf-text)' }}>{result.food_name}</p>
                {result.description && (
                  <p className="text-[10px]" style={{ color: 'var(--hf-text-muted)' }}>{result.description}</p>
                )}
              </div>
            </div>
            {result.overall_score != null && (
              <div className="flex-shrink-0 w-11 h-11 rounded-2xl flex flex-col items-center justify-center"
                style={{ background: scoreColor(result.overall_score) + '22', border: `1.5px solid ${scoreColor(result.overall_score)}` }}>
                <span className="text-sm font-black leading-none" style={{ color: scoreColor(result.overall_score) }}>
                  {result.overall_score}
                </span>
                <span className="text-[8px] font-bold leading-none mt-0.5" style={{ color: scoreColor(result.overall_score) }}>score</span>
              </div>
            )}
          </div>

          {/* Macros grid */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Cal', value: result.calories, unit: 'kcal', color: 'var(--hf-lemon-strong)' },
              { label: 'Protein', value: result.protein_g, unit: 'g', color: 'var(--hf-sky-strong)' },
              { label: 'Carbs', value: result.carbs_g, unit: 'g', color: 'var(--hf-mint-strong)' },
              { label: 'Fat', value: result.fat_g, unit: 'g', color: 'var(--hf-peach-strong)' },
            ].map(m => (
              <div key={m.label} className="text-center py-2 rounded-xl" style={{ background: 'var(--hf-surface-2)' }}>
                <p className="text-sm font-black" style={{ color: m.color }}>{m.value ?? 0}</p>
                <p className="text-[9px]" style={{ color: 'var(--hf-text-muted)' }}>{m.unit}</p>
                <p className="text-[8px] font-bold uppercase" style={{ color: 'var(--hf-text-muted)' }}>{m.label}</p>
              </div>
            ))}
          </div>

          {/* ── Medication warnings (high priority) ── */}
          {result.medication_warnings?.length > 0 && (
            <div className="rounded-2xl p-3 space-y-1.5"
              style={{ background: 'rgba(242,140,140,0.08)', border: '1px solid rgba(242,140,140,0.3)' }}>
              <div className="flex items-center gap-1.5 mb-1">
                <ShieldAlert size={13} style={{ color: 'var(--hf-coral-strong)' }} />
                <p className="text-[10px] font-black uppercase tracking-wide" style={{ color: 'var(--hf-coral-strong)' }}>
                  Medication Interactions
                </p>
              </div>
              {result.medication_warnings.map((w, i) => (
                <p key={i} className="text-[11px] font-semibold" style={{ color: 'var(--hf-coral-strong)' }}>• {w}</p>
              ))}
            </div>
          )}

          {/* ── Overall feedback ── */}
          {result.overall_feedback && (
            <div className="px-3 py-2.5 rounded-2xl"
              style={{ background: 'rgba(168,230,207,0.08)', border: '1px solid rgba(168,230,207,0.2)' }}>
              <p className="text-[11px] font-semibold" style={{ color: 'var(--hf-text)' }}>
                ✨ {result.overall_feedback}
              </p>
            </div>
          )}

          {/* ── Goal alignment ── */}
          {result.goal_alignment && (
            <div className="flex gap-2 items-start">
              <Target size={13} className="flex-shrink-0 mt-0.5" style={{ color: '#9bb4ff' }} />
              <p className="text-[11px] font-semibold" style={{ color: 'var(--hf-text-muted)' }}>{result.goal_alignment}</p>
            </div>
          )}

          {/* ── Daily progress ── */}
          {result.daily_progress && (
            <div className="flex gap-2 items-start">
              <TrendingUp size={13} className="flex-shrink-0 mt-0.5" style={{ color: '#d7f576' }} />
              <p className="text-[11px] font-semibold" style={{ color: 'var(--hf-text-muted)' }}>{result.daily_progress}</p>
            </div>
          )}

          {/* ── Condition notes ── */}
          {result.condition_notes?.length > 0 && (
            <div className="rounded-2xl p-3 space-y-1.5"
              style={{ background: 'rgba(247,201,163,0.08)', border: '1px solid rgba(247,201,163,0.2)' }}>
              <p className="text-[10px] font-black uppercase tracking-wide mb-1" style={{ color: 'var(--hf-peach-strong)' }}>
                Health Condition Notes
              </p>
              {result.condition_notes.map((n, i) => (
                <p key={i} className="text-[11px] font-semibold" style={{ color: 'var(--hf-text-muted)' }}>• {n}</p>
              ))}
            </div>
          )}

          {/* ── Personalized tips ── */}
          {result.personalized_tips?.length > 0 && (
            <div className="rounded-2xl p-3 space-y-1.5"
              style={{ background: 'rgba(215,245,118,0.06)', border: '1px solid rgba(215,245,118,0.18)' }}>
              <div className="flex items-center gap-1.5 mb-1">
                <Lightbulb size={12} style={{ color: 'var(--hf-lemon-strong)' }} />
                <p className="text-[10px] font-black uppercase tracking-wide" style={{ color: 'var(--hf-lemon-strong)' }}>
                  Personalized Tips
                </p>
              </div>
              {result.personalized_tips.map((tip, i) => (
                <p key={i} className="text-[11px] font-semibold" style={{ color: 'var(--hf-text-muted)' }}>• {tip}</p>
              ))}
            </div>
          )}

          {result.confidence != null && (
            <p className="text-[10px]" style={{ color: 'var(--hf-text-muted)' }}>
              AI confidence: {Math.round(result.confidence * 100)}%
              {result.identified_items?.length > 0 && ` · Identified: ${result.identified_items.join(', ')}`}
            </p>
          )}

          <button onClick={() => onConfirm(result)}
            className="w-full py-3 rounded-2xl font-bold text-sm transition-all active:scale-[0.98]"
            style={{ background: '#a8e6cf', color: '#003d20' }}>
            Use These Values
          </button>
        </div>
      )}

      <input ref={cameraRef} type="file" accept="image/*" capture="environment"
        className="sr-only" tabIndex={-1} onChange={e => analyzeFile(e.target.files?.[0])} />
      <input ref={fileRef} type="file" accept="image/*"
        className="sr-only" tabIndex={-1} onChange={e => analyzeFile(e.target.files?.[0])} />
    </div>
  );
}
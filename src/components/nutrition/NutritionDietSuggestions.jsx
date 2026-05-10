/**
 * NutritionDietSuggestions — AI-generated diet tips based on today's intake vs goals.
 */
import React, { useState } from 'react';
import { Leaf, ChevronRight, Loader2, RefreshCw } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { callAI } from '@/components/utils/aiService';
import { toast } from 'sonner';

export default function NutritionDietSuggestions({ profileId, totals, dailyTargets }) {
  const [suggestions, setSuggestions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const generate = async () => {
    if (!profileId) return;
    setLoading(true);
    try {
      const res = await callAI({
        prompt: `You are a clinical dietitian. Based on this user's today's nutrition intake vs goals, give 3 specific, actionable diet suggestions for the rest of the day.

Today's Intake:
- Calories: ${totals.calories} kcal (Goal: ${dailyTargets?.calories ?? 'unknown'})
- Protein: ${totals.protein_g}g (Goal: ${dailyTargets?.protein_g ?? 'unknown'}g)
- Carbs: ${totals.carbs_g}g (Goal: ${dailyTargets?.carbs_g ?? 'unknown'}g)
- Fat: ${totals.fat_g}g (Goal: ${dailyTargets?.fat_g ?? 'unknown'}g)

${dailyTargets?.summary ? `Health context: ${dailyTargets.summary}` : ''}

Give 3 short, practical, culturally-inclusive suggestions (consider Indian diet options if applicable). Keep each under 20 words.`,
        response_json_schema: {
          type: 'object',
          properties: {
            suggestions: { type: 'array', items: { type: 'string' } },
            overall_note: { type: 'string' }
          }
        }
      });
      setSuggestions(res);
      setExpanded(true);
    } catch {
      toast.error('Could not generate suggestions');
    }
    setLoading(false);
  };

  const handleClick = () => {
    if (!suggestions) generate();
    else setExpanded(e => !e);
  };

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
      <button onClick={handleClick}
        className="w-full flex items-center justify-between px-4 py-3 transition-all active:opacity-80">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(168,230,207,0.2)' }}>
            <Leaf size={15} style={{ color: 'var(--hf-mint-strong)' }} />
          </div>
          <div className="text-left">
            <p className="text-sm font-black" style={{ color: 'var(--hf-text)' }}>AI Diet Suggestions</p>
            <p className="text-[10px]" style={{ color: 'var(--hf-text-muted)' }}>Based on today's intake & health data</p>
          </div>
        </div>
        {loading
          ? <Loader2 size={15} className="animate-spin" style={{ color: 'var(--hf-mint-strong)' }} />
          : <ChevronRight size={15} style={{ color: 'var(--hf-text-muted)', transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
        }
      </button>

      {expanded && suggestions && (
        <div className="px-4 pb-4 space-y-2 border-t" style={{ borderColor: 'var(--hf-border)' }}>
          {suggestions.overall_note && (
            <p className="text-xs pt-2 font-semibold" style={{ color: 'var(--hf-mint-strong)' }}>{suggestions.overall_note}</p>
          )}
          {suggestions.suggestions?.map((s, i) => (
            <div key={i} className="flex items-start gap-2.5 py-2 px-3 rounded-xl" style={{ background: 'var(--hf-surface-2)' }}>
              <span className="text-[10px] font-black mt-0.5 flex-shrink-0" style={{ color: 'var(--hf-lemon-strong)' }}>{i + 1}</span>
              <p className="text-xs font-semibold leading-relaxed" style={{ color: 'var(--hf-text)' }}>{s}</p>
            </div>
          ))}
          <button onClick={generate} disabled={loading}
            className="flex items-center gap-1.5 text-[10px] font-bold mt-1 transition-all active:opacity-70"
            style={{ color: 'var(--hf-text-muted)' }}>
            <RefreshCw size={11} /> Regenerate
          </button>
        </div>
      )}
    </div>
  );
}
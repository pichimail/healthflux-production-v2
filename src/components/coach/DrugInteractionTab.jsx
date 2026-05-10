import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, CheckCircle, Pill, RefreshCw, HelpCircle } from 'lucide-react';
import { callAI } from '../utils/aiService';
import { toast } from 'sonner';

const SEVERITY_CONFIG = {
  severe:   { color: 'var(--hf-coral-strong)', bg: 'rgba(242,140,140,0.12)', border: 'rgba(242,140,140,0.3)', icon: '🚨', label: 'Severe' },
  moderate: { color: 'var(--hf-peach-strong)', bg: 'rgba(247,201,163,0.12)', border: 'rgba(247,201,163,0.3)', icon: '⚠️', label: 'Moderate' },
  mild:     { color: 'var(--hf-lemon-strong)', bg: 'rgba(215,245,118,0.12)', border: 'rgba(215,245,118,0.3)', icon: '💡', label: 'Mild' },
  none:     { color: 'var(--hf-mint-strong)', bg: 'rgba(168,230,207,0.12)', border: 'rgba(168,230,207,0.3)', icon: '✅', label: 'None' },
};

export default function DrugInteractionTab({ meds }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [qaInput, setQaInput] = useState('');
  const [qaResult, setQaResult] = useState(null);
  const [qaLoading, setQaLoading] = useState(false);

  const checkInteractions = async () => {
    if (meds.length < 2) {
      toast.error('Add at least 2 medications to check interactions');
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const medList = meds.map(m => `${m.medication_name} ${m.dosage} (for: ${m.purpose || 'unknown'})`).join('\n');
      // AI_FEATURE: Drug interactions check | PROVIDER: claude
      const data = await callAI({
        prompt: `You are a clinical pharmacist. Analyze these medications for interactions:

${medList}

Check every possible pair combination for interactions.`,
        responseJsonSchema: {
          type: 'object',
          properties: {
            overall_risk: { type: 'string', enum: ['low', 'moderate', 'high'] },
            interactions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  drug1: { type: 'string' },
                  drug2: { type: 'string' },
                  severity: { type: 'string', enum: ['severe', 'moderate', 'mild', 'none'] },
                  description: { type: 'string' },
                  recommendation: { type: 'string' },
                }
              }
            },
            general_advice: { type: 'string' },
            see_doctor_urgently: { type: 'boolean' },
          }
        }
      });
      setResult(data);
    } catch (e) {
      toast.error('Interaction check failed');
    }
    setLoading(false);
  };

  const askMedicalQA = async () => {
    if (!qaInput.trim()) return;
    setQaLoading(true);
    try {
      const medList = meds.map(m => m.medication_name).join(', ');
      // AI_FEATURE: Medical Q&A | PROVIDER: claude
      const ans = await callAI({
        prompt: `You are a knowledgeable medical AI assistant. The patient takes: ${medList || 'no medications listed'}.

Medical question: ${qaInput}

Provide a clear, accurate, evidence-based answer. Always recommend consulting a healthcare provider for personal medical decisions. Use plain language.`
      });
      setQaResult(ans);
    } catch (e) {
      toast.error('Q&A failed');
    }
    setQaLoading(false);
  };

  const riskColor = { low: '#a8e6cf', moderate: '#f7c9a3', high: '#f28c8c' };

  return (
    <div className="space-y-5">
      {/* Drug Interaction Checker */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Pill size={14} style={{ color: 'var(--hf-peach-strong)' }} />
          <p className="text-sm font-black" style={{ color: 'var(--hf-text)' }}>Drug Interaction Checker</p>
        </div>

        {meds.length < 2 ? (
          <div className="p-4 rounded-2xl text-center" style={{ background: 'rgba(247,201,163,0.1)', border: '1px dashed rgba(247,201,163,0.3)' }}>
            <p className="text-xs" style={{ color: 'var(--hf-peach-strong)' }}>Add at least 2 active medications to check for interactions.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Current meds preview */}
            <div className="flex flex-wrap gap-1.5">
              {meds.slice(0, 8).map(m => (
                <span key={m.id} className="text-[9px] font-bold px-2 py-1 rounded-full"
                  style={{ background: 'rgba(247,201,163,0.15)', color: 'var(--hf-peach-strong)', border: '1px solid rgba(247,201,163,0.3)' }}>
                  💊 {m.medication_name}
                </span>
              ))}
            </div>

            <Button onClick={checkInteractions} disabled={loading}
              className="w-full h-11 rounded-2xl font-bold" style={{ background: '#f7c9a3', color: '#3d1a00' }}>
              {loading ? <><Loader2 size={14} className="animate-spin mr-2" />Checking…</> : <><AlertTriangle size={14} className="mr-2" />Check {meds.length} Medications</>}
            </Button>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center py-8 gap-3">
            <Loader2 size={24} className="animate-spin" style={{ color: 'var(--hf-peach-strong)' }} />
            <p className="text-xs font-bold" style={{ color: 'var(--hf-text)' }}>Analyzing interactions…</p>
          </div>
        )}

        {result && !loading && (
          <div className="space-y-3 mt-3">
            {/* Overall risk */}
            <div className="p-4 rounded-2xl flex items-center gap-3"
              style={{ background: `${riskColor[result.overall_risk]}22`, border: `1px solid ${riskColor[result.overall_risk]}44` }}>
              <div className="text-2xl">{result.overall_risk === 'low' ? '✅' : result.overall_risk === 'moderate' ? '⚠️' : '🚨'}</div>
              <div>
                <p className="text-xs font-black uppercase tracking-wider" style={{ color: riskColor[result.overall_risk] }}>Overall Risk: {result.overall_risk}</p>
                {result.see_doctor_urgently && <p className="text-xs mt-0.5 font-bold" style={{ color: 'var(--hf-coral-strong)' }}>⚡ Consult your doctor urgently</p>}
              </div>
            </div>

            {/* Interactions list */}
            {result.interactions?.filter(i => i.severity !== 'none').map((inter, idx) => {
              const cfg = SEVERITY_CONFIG[inter.severity] || SEVERITY_CONFIG.mild;
              return (
                <div key={idx} className="p-3 rounded-2xl" style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span>{cfg.icon}</span>
                    <p className="text-xs font-black" style={{ color: cfg.color }}>{inter.drug1} + {inter.drug2}</p>
                    <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: cfg.color + '33', color: cfg.color }}>{cfg.label}</span>
                  </div>
                  <p className="text-xs leading-relaxed mb-1" style={{ color: 'var(--hf-text-muted)' }}>{inter.description}</p>
                  {inter.recommendation && <p className="text-[10px] font-bold" style={{ color: cfg.color }}>→ {inter.recommendation}</p>}
                </div>
              );
            })}

            {result.interactions?.every(i => i.severity === 'none') && (
              <div className="p-4 rounded-2xl text-center" style={{ background: 'rgba(168,230,207,0.1)', border: '1px solid rgba(168,230,207,0.3)' }}>
                <CheckCircle size={24} className="mx-auto mb-2" style={{ color: 'var(--hf-mint-strong)' }} />
                <p className="text-sm font-bold" style={{ color: 'var(--hf-mint-strong)' }}>No significant interactions found</p>
              </div>
            )}

            {result.general_advice && (
              <p className="text-xs p-3 rounded-xl" style={{ background: 'var(--hf-surface-2)', color: 'var(--hf-text-muted)', border: '1px solid var(--hf-border)' }}>
                💬 {result.general_advice}
              </p>
            )}

            <button onClick={checkInteractions} className="flex items-center gap-1.5 text-xs mx-auto" style={{ color: 'var(--hf-text-muted)' }}>
              <RefreshCw size={11} /> Recheck
            </button>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="border-t" style={{ borderColor: 'var(--hf-border)' }} />

      {/* Medical Q&A */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <HelpCircle size={14} style={{ color: 'var(--hf-lavender-strong)' }} />
          <p className="text-sm font-black" style={{ color: 'var(--hf-text)' }}>Medical Q&A</p>
        </div>
        <div className="flex gap-2 mb-3">
          <input value={qaInput} onChange={e => setQaInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && askMedicalQA()}
            placeholder="Ask a medical question…"
            className="flex-1 h-11 px-4 rounded-2xl text-sm outline-none"
            style={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)', color: 'var(--hf-text)' }} />
          <Button onClick={askMedicalQA} disabled={!qaInput.trim() || qaLoading}
            className="rounded-2xl h-11 px-4 font-bold" style={{ background: '#c9bbff', color: '#1a0a40' }}>
            {qaLoading ? <Loader2 size={14} className="animate-spin" /> : 'Ask'}
          </Button>
        </div>

        {/* Quick questions */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {['What are the side effects of my medications?', 'Can I take ibuprofen with my current meds?', 'What foods should I avoid?'].map(q => (
            <button key={q} onClick={() => { setQaInput(q); }}
              className="text-[9px] px-2.5 py-1 rounded-full font-bold"
              style={{ background: 'rgba(201,187,255,0.1)', border: '1px solid rgba(201,187,255,0.3)', color: 'var(--hf-lavender-strong)' }}>
              {q}
            </button>
          ))}
        </div>

        {qaLoading && (
          <div className="flex items-center gap-2 p-3 rounded-2xl" style={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)' }}>
            <Loader2 size={14} className="animate-spin" style={{ color: 'var(--hf-lavender-strong)' }} />
            <p className="text-xs" style={{ color: 'var(--hf-text-muted)' }}>Searching medical knowledge…</p>
          </div>
        )}

        {qaResult && !qaLoading && (
          <div className="p-4 rounded-2xl" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
            <p className="text-[9px] font-black uppercase tracking-wider mb-2" style={{ color: 'var(--hf-lavender-strong)' }}>AI Medical Answer</p>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--hf-text)' }}>{qaResult}</p>
            <p className="text-[9px] mt-2" style={{ color: 'var(--hf-text-muted)' }}>⚠️ For informational purposes only. Consult your healthcare provider for medical advice.</p>
          </div>
        )}
      </div>
    </div>
  );
}
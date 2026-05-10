import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useActiveProfile } from '../components/ActiveProfileContext';
import { Progress } from '@/components/ui/progress';
import { Sparkles, CheckCircle, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { MarkdownContent } from '@/components/ui/markdown-content';
import { toast } from 'sonner';
import {
  generateAndPersistAIHealthReport,
  listAIHealthReports,
} from '@/services/reports';

const RISK_LEVELS = {
  low:    { bg: 'rgba(168,230,207,0.15)', color: 'var(--hf-mint-strong)', tc: '#003d20', icon: '🟢' },
  medium: { bg: 'rgba(247,201,163,0.15)', color: 'var(--hf-peach-strong)', tc: '#3d1a00', icon: '🟡' },
  high:   { bg: 'rgba(242,140,140,0.12)', color: 'var(--hf-coral-strong)', tc: '#3d0000', icon: '🔴' },
};

function ScoreRing({ score, size = 80 }) {
  const color = score >= 75 ? '#a8e6cf' : score >= 50 ? '#f7c9a3' : '#f28c8c';
  const r = size * 0.38, cx = size / 2, cy = size / 2;
  const c = 2 * Math.PI * r;
  const dash = (score / 100) * c;
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--hf-border)" strokeWidth={size * 0.08} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={size * 0.08}
          strokeDasharray={`${dash} ${c - dash}`} strokeLinecap="round" transform={`rotate(-90 ${cx} ${cy})`} />
        <text x={cx} y={cy + 4} textAnchor="middle" fontSize={size * 0.18} fontWeight="900" fill={color}>{score}</text>
      </svg>
      <p className="text-[9px] font-bold" style={{ color: 'var(--hf-text-muted)' }}>Health Score</p>
    </div>
  );
}

export default function AIHealthReports() {
  const { activeProfileId } = useActiveProfile();
  const [selectedId, setSelectedId] = useState(null);
  const [generating, setGenerating] = useState(null); // 'weekly' | 'monthly' | null
  const [activeSection, setActiveSection] = useState('overview');
  const { data: reports = [], refetch } = useQuery({
    queryKey: ['ai-health-reports', activeProfileId],
    queryFn: () => listAIHealthReports(activeProfileId),
    enabled: !!activeProfileId,
  });

  const selected = selectedId ? reports.find(r => r.id === selectedId) : reports[0];

  const generate = async (period) => {
    if (!activeProfileId) return;
    setGenerating(period);
    try {
      const report = await generateAndPersistAIHealthReport(activeProfileId, period);
      await refetch();
      if (report?.id) {
        setSelectedId(report.id);
      }
      toast.success('AI report saved');
    } catch (error) {
      toast.error(error?.message || 'Could not save AI report');
    } finally { setGenerating(null); }
  };

  const SECTIONS = [
    { key: 'overview',    label: '📊 Overview' },
    { key: 'vitals',      label: '💓 Vitals' },
    { key: 'risks',       label: '⚠️ Risks' },
    { key: 'lifestyle',   label: '🌿 Lifestyle' },
    { key: 'checks',      label: '🔬 Checks' },
  ];

  return (
    <div className="bento-page">
      <div className="bento-header">
        <h1 className="bento-title flex items-center gap-2"><Sparkles size={18} style={{ color: 'var(--hf-lemon-strong)' }} /> AI Health Reports</h1>
        <p className="bento-subtitle">AI-powered health summaries</p>
      </div>

      {/* Generate buttons */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {['weekly', 'monthly'].map(period => (
          <button key={period} onClick={() => generate(period)} disabled={!!generating}
            className="h-12 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all active-press"
            style={{ background: period === 'weekly' ? '#d7f576' : 'var(--hf-surface)', color: period === 'weekly' ? '#0a1200' : 'var(--hf-text)', border: period === 'weekly' ? 'none' : '1px solid var(--hf-border)' }}>
            {generating === period ? <><RefreshCw size={14} className="animate-spin" /> Generating…</> : <><span>{period === 'weekly' ? '📅' : '🗓'}</span> {period.charAt(0).toUpperCase() + period.slice(1)} Report</>}
          </button>
        ))}
      </div>

      {reports.length === 0 ? (
        <div className="flex flex-col items-center py-20 gap-4 text-center">
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl" style={{ background: 'rgba(201,187,255,0.1)', border: '1px dashed rgba(201,187,255,0.3)' }}>🧠</div>
          <p className="text-sm font-bold" style={{ color: 'var(--hf-text)' }}>No reports yet</p>
          <p className="text-xs max-w-xs" style={{ color: 'var(--hf-text-muted)' }}>Generate your first AI health report to get personalized insights, risk predictions, and lifestyle recommendations.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Report selector */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            {reports.map(r => (
              <button key={r.id} onClick={() => setSelectedId(r.id)}
                className="flex-shrink-0 px-4 py-2 rounded-2xl text-left transition-all"
                style={{ background: selected?.id === r.id ? 'rgba(215,245,118,0.15)' : 'var(--hf-surface-2)', border: selected?.id === r.id ? '1.5px solid rgba(215,245,118,0.4)' : '1px solid var(--hf-border)' }}>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold whitespace-nowrap" style={{ color: selected?.id === r.id ? '#d7f576' : 'var(--hf-text)' }}>{r.period_label}</span>
                  {r.status === 'ready' && r.overall_score != null && <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full" style={{ background: '#d7f576', color: '#0a1200' }}>{r.overall_score}</span>}
                  {r.status === 'generating' && <RefreshCw size={10} className="animate-spin" style={{ color: 'var(--hf-text-muted)' }} />}
                </div>
                <p className="text-[9px] capitalize mt-0.5" style={{ color: 'var(--hf-text-muted)' }}>{r.report_period}</p>
              </button>
            ))}
          </div>

          {selected?.status === 'generating' && (
            <div className="flex flex-col items-center py-16 gap-4">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(215,245,118,0.1)' }}>
                <Sparkles size={28} className="animate-pulse" style={{ color: 'var(--hf-lemon-strong)' }} />
              </div>
              <p className="text-sm font-bold" style={{ color: 'var(--hf-text)' }}>Generating your report…</p>
              <p className="text-xs" style={{ color: 'var(--hf-text-muted)' }}>AI is analyzing your health data</p>
              <div className="w-48"><Progress value={66} className="h-1.5 rounded-full" /></div>
            </div>
          )}

          {selected?.status === 'ready' && (
            <>
              {/* Score + header */}
              <div className="p-4 rounded-2xl flex items-center gap-4" style={{ background: 'linear-gradient(135deg, var(--hf-surface), var(--hf-surface-2))', border: '1px solid var(--hf-border)' }}>
                <ScoreRing score={selected.overall_score || 0} size={80} />
                <div className="flex-1">
                  <p className="font-black text-base" style={{ color: 'var(--hf-text)' }}>{selected.period_label}</p>
                  <p className="text-xs capitalize mb-2" style={{ color: 'var(--hf-text-muted)' }}>{selected.report_period} AI Report · {format(new Date(selected.created_date), 'MMM d, yyyy')}</p>
                  {selected.risk_predictions?.length > 0 && (
                    <div className="flex gap-1">
                      {['low','medium','high'].map(l => {
                        const cnt = selected.risk_predictions.filter(r => r.level === l).length;
                        if (!cnt) return null;
                        const rs = RISK_LEVELS[l];
                        return <span key={l} className="text-[9px] font-black px-2 py-0.5 rounded-full" style={{ background: rs.bg, color: rs.color }}>{rs.icon} {cnt} {l}</span>;
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Section tabs */}
              <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
                {SECTIONS.map(s => (
                  <button key={s.key} onClick={() => setActiveSection(s.key)}
                    className="whitespace-nowrap px-3 py-2 rounded-full text-[10px] font-bold flex-shrink-0 transition-all"
                    style={{ background: activeSection === s.key ? '#d7f576' : 'var(--hf-surface-2)', color: activeSection === s.key ? '#0a1200' : 'var(--hf-text-muted)', border: '1px solid var(--hf-border)' }}>
                    {s.label}
                  </button>
                ))}
              </div>

              {/* Overview */}
              {activeSection === 'overview' && (
                <div className="space-y-3">
                  {selected.vitals_summary && <div className="p-4 rounded-2xl" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
                    <p className="text-[10px] font-black uppercase tracking-wider mb-2" style={{ color: 'var(--hf-sky-strong)' }}>💓 Vitals Summary</p>
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--hf-text-muted)' }}>{selected.vitals_summary}</p>
                  </div>}
                  {selected.medication_adherence_summary && <div className="p-4 rounded-2xl" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
                    <p className="text-[10px] font-black uppercase tracking-wider mb-2" style={{ color: 'var(--hf-peach-strong)' }}>💊 Medication Adherence</p>
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--hf-text-muted)' }}>{selected.medication_adherence_summary}</p>
                  </div>}
                  {selected.trend_analysis && <div className="p-4 rounded-2xl" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
                    <p className="text-[10px] font-black uppercase tracking-wider mb-2" style={{ color: 'var(--hf-mint-strong)' }}>📈 Trend Analysis</p>
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--hf-text-muted)' }}>{selected.trend_analysis}</p>
                  </div>}
                </div>
              )}

              {/* Vitals */}
              {activeSection === 'vitals' && selected.vitals_summary && (
                <div className="p-4 rounded-2xl" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
                  <MarkdownContent content={selected.vitals_summary} className="text-xs" />
                </div>
              )}

              {/* Risks */}
              {activeSection === 'risks' && selected.risk_predictions?.length > 0 && (
                <div className="space-y-2">
                  {selected.risk_predictions.map((r, i) => {
                    const rs = RISK_LEVELS[r.level] || RISK_LEVELS.medium;
                    return (
                      <div key={i} className="p-4 rounded-2xl" style={{ background: rs.bg, border: `1px solid ${rs.color}33` }}>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-base">{rs.icon}</span>
                          <p className="text-sm font-black" style={{ color: rs.color }}>{r.risk}</p>
                          <span className="text-[9px] font-black px-2 py-0.5 rounded-full ml-auto" style={{ background: `${rs.color}22`, color: rs.color }}>{r.level}</span>
                        </div>
                        <p className="text-xs leading-relaxed" style={{ color: 'var(--hf-text-muted)' }}>{r.description}</p>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Lifestyle */}
              {activeSection === 'lifestyle' && selected.lifestyle_suggestions?.length > 0 && (
                <div className="space-y-2">
                  {selected.lifestyle_suggestions.map((s, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-2xl" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
                      <CheckCircle size={14} style={{ color: 'var(--hf-mint-strong)', flexShrink: 0, marginTop: 1 }} />
                      <p className="text-xs leading-relaxed" style={{ color: 'var(--hf-text-muted)' }}>{s}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Checks */}
              {activeSection === 'checks' && selected.recommended_checks?.length > 0 && (
                <div className="space-y-2">
                  {selected.recommended_checks.map((c, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-2xl" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
                      <div className="w-6 h-6 rounded-full flex items-center justify-center font-black text-[10px] flex-shrink-0" style={{ background: '#c9bbff', color: '#1a0a40' }}>{i + 1}</div>
                      <p className="text-xs leading-relaxed" style={{ color: 'var(--hf-text-muted)' }}>{c}</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, CheckCircle, Sparkles, Loader2, Download, RefreshCw, Utensils, Dumbbell, Moon, Heart, Activity } from 'lucide-react';
import { toast } from 'sonner';
import { useActiveProfile } from '../components/ActiveProfileContext';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';

function ScoreGauge({ score }) {
  const color = score >= 75 ? '#a8e6cf' : score >= 50 ? '#f7c9a3' : '#f28c8c';
  const label = score >= 75 ? 'Great' : score >= 50 ? 'Fair' : 'Poor';
  const size = 120;
  const r = size * 0.38, cx = size / 2, cy = size / 2;
  const c = 2 * Math.PI * r;
  const dash = (score / 100) * c;
  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background track */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--hf-border)" strokeWidth={size * 0.07} />
        {/* Score arc */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={size * 0.07}
          strokeDasharray={`${dash} ${c - dash}`} strokeLinecap="round" transform={`rotate(-90 ${cx} ${cy})`} />
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize={size * 0.2} fontWeight="900" fill={color}>{score}</text>
        <text x={cx} y={cy + 14} textAnchor="middle" fontSize={size * 0.1} fill="var(--hf-text-muted)">{label}</text>
      </svg>
      <div className="flex items-center gap-4 text-center">
        {[{ l: 'Poor', c: '#f28c8c', r: '0-49' }, { l: 'Fair', c: '#f7c9a3', r: '50-74' }, { l: 'Great', c: '#a8e6cf', r: '75-100' }].map(g => (
          <div key={g.l}>
            <div className="w-2 h-2 rounded-full mx-auto mb-0.5" style={{ background: g.c }} />
            <p className="text-[8px]" style={{ color: 'var(--hf-text-muted)' }}>{g.l} {g.r}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

const LIFESTYLE_ICONS = { diet: Utensils, exercise: Dumbbell, sleep: Moon, stress: Heart };
const LIFESTYLE_COLORS = { diet: '#a8e6cf', exercise: '#9bb4ff', sleep: '#c9bbff', stress: '#f7c9a3' };

export default function WellnessInsights() {
  const { activeProfileId, activeProfile } = useActiveProfile();
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [activeTab, setActiveTab] = useState('score');

  const generate = async () => {
    setLoading(true);
    try {
      const { data } = await base44.functions.invoke('predictiveHealthAnalysis', { profile_id: activeProfileId });
      setAnalysis(data.analysis);
      setActiveTab('score');
    } catch (e) {
      toast.error('Failed to analyze. Please log some health data first.');
    } finally { setLoading(false); }
  };

  const exportReport = async () => {
    if (!analysis) return;
    setExporting(true);
    try {
      const { data } = await base44.functions.invoke('exportInsightsReport', {
        profileId: activeProfileId,
        insightsData: {
          insights: [], summary: `Health Score: ${analysis.risk_score}/100`,
          metrics: { 'Risk Score': analysis.risk_score, 'Risk Factors': analysis.risk_factors?.length || 0 },
          recommendations: [...(analysis.lifestyle_recommendations?.diet || []), ...(analysis.lifestyle_recommendations?.exercise || [])],
          action_items: analysis.preventive_actions?.map(a => a.action) || []
        },
        reportType: 'self', format: 'pdf', pageType: 'wellness'
      });
      if (data.pdfBase64) {
        const blob = new Blob([Uint8Array.from(atob(data.pdfBase64), c => c.charCodeAt(0))], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `wellness-${new Date().toISOString().split('T')[0]}.pdf`; a.click(); URL.revokeObjectURL(url);
        toast.success('Wellness report downloaded!');
      }
    } catch (_) { toast.error('Export failed'); }
    setExporting(false);
  };

  const TABS = [
    { key: 'score',     label: '🎯 Score' },
    { key: 'risks',     label: '⚠️ Risks' },
    { key: 'predict',   label: '🔮 Predictions' },
    { key: 'lifestyle', label: '🌿 Lifestyle' },
    { key: 'actions',   label: '✅ Actions' },
  ];

  // Build radar data from analysis — use the AI-derived risk score for Vitals;
  // other dimensions derive from lifestyle recommendation counts as a proxy score.
  const radarData = useMemo(() => {
    if (!analysis) return [];
    const score = analysis.risk_score ?? 60;
    const dietCount   = analysis.lifestyle_recommendations?.diet?.length     ?? 0;
    const exCount     = analysis.lifestyle_recommendations?.exercise?.length  ?? 0;
    const sleepCount  = analysis.lifestyle_recommendations?.sleep?.length     ?? 0;
    const stressCount = analysis.lifestyle_recommendations?.stress?.length    ?? 0;
    // Fewer recommendations = closer to optimal (100), more = more room for improvement
    const fromCount = (count, base = 80) => Math.max(20, base - count * 8);
    return [
      { subject: 'Diet',     value: fromCount(dietCount) },
      { subject: 'Exercise', value: fromCount(exCount, 75) },
      { subject: 'Sleep',    value: fromCount(sleepCount, 80) },
      { subject: 'Stress',   value: fromCount(stressCount, 70) },
      { subject: 'Meds',     value: score },
      { subject: 'Vitals',   value: score },
    ];
  }, [analysis]);

  return (
    <div className="bento-page">
      <div className="bento-header flex justify-between items-start">
        <div>
          <h1 className="bento-title">Wellness Insights</h1>
          <p className="bento-subtitle">{activeProfile?.full_name || 'Your'} predictive health analysis</p>
        </div>
        {analysis && (
          <button onClick={exportReport} disabled={exporting}
            className="h-9 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5"
            style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)', color: 'var(--hf-text)' }}>
            {exporting ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />} Export
          </button>
        )}
      </div>

      {!analysis && !loading && (
        <div className="rounded-3xl overflow-hidden mb-4" style={{ background: 'linear-gradient(135deg, rgba(201,187,255,0.15), rgba(168,230,207,0.08))', border: '1px solid rgba(201,187,255,0.3)' }}>
          <div className="p-8 text-center">
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-5 text-4xl" style={{ background: 'rgba(201,187,255,0.15)' }}>🧠</div>
            <h2 className="text-lg font-black mb-2" style={{ color: 'var(--hf-text)' }}>Advanced Health Analytics</h2>
            <p className="text-xs max-w-xs mx-auto mb-6 leading-relaxed" style={{ color: 'var(--hf-text-muted)' }}>Our AI analyzes your vitals, labs, and medications to predict risks, identify patterns, and suggest personalized wellness improvements.</p>
            <div className="grid grid-cols-3 gap-2 mb-6 max-w-sm mx-auto">
              {[{ icon: '📊', l: 'Risk Analysis' }, { icon: '🔮', l: 'Predictions' }, { icon: '💡', l: 'Lifestyle Tips' }].map(f => (
                <div key={f.l} className="p-3 rounded-2xl" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(201,187,255,0.2)' }}>
                  <div className="text-2xl mb-1">{f.icon}</div>
                  <p className="text-[9px] font-bold" style={{ color: 'var(--hf-text-muted)' }}>{f.l}</p>
                </div>
              ))}
            </div>
            <Button onClick={generate} className="h-12 px-8 rounded-2xl font-bold" style={{ background: '#c9bbff', color: '#1a0a40' }}>
              <Sparkles size={16} className="mr-2" /> Generate Health Insights
            </Button>
          </div>
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center py-20 gap-5">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(201,187,255,0.15)' }}>
            <Sparkles size={28} className="animate-pulse" style={{ color: 'var(--hf-lavender-strong)' }} />
          </div>
          <div className="text-center">
            <p className="text-sm font-bold mb-1" style={{ color: 'var(--hf-text)' }}>Analyzing your health data…</p>
            <p className="text-xs" style={{ color: 'var(--hf-text-muted)' }}>Checking vitals, labs, medications and more</p>
          </div>
          <div className="w-64"><Progress value={66} className="h-2 rounded-full" /></div>
        </div>
      )}

      {analysis && !loading && (
        <>
          {/* Tabs */}
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1 mb-4">
            {TABS.map(t => (
              <button key={t.key} onClick={() => setActiveTab(t.key)}
                className="whitespace-nowrap px-3 py-2 rounded-full text-[10px] font-bold flex-shrink-0 transition-all"
                style={{ background: activeTab === t.key ? '#c9bbff' : 'var(--hf-surface-2)', color: activeTab === t.key ? '#1a0a40' : 'var(--hf-text-muted)', border: '1px solid var(--hf-border)' }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Score tab */}
          {activeTab === 'score' && (
            <div className="space-y-4">
              <div className="p-5 rounded-2xl" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
                <p className="text-[10px] font-black uppercase tracking-widest mb-4 text-center" style={{ color: 'var(--hf-text-muted)' }}>Overall Wellness Score</p>
                <div className="flex justify-center"><ScoreGauge score={analysis.risk_score || 72} /></div>
              </div>
              {/* Radar chart */}
              {radarData.length > 0 && (
                <div className="p-4 rounded-2xl" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
                  <p className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: 'var(--hf-text-muted)' }}>Health Dimensions</p>
                  <ResponsiveContainer width="100%" height={200}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="var(--hf-border)" />
                      <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: 'var(--hf-text-muted)' }} />
                      <Radar name="Score" dataKey="value" stroke="#c9bbff" fill="#c9bbff" fillOpacity={0.25} strokeWidth={2} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {/* Risks tab */}
          {activeTab === 'risks' && (
            <div className="space-y-3">
              {(analysis.risk_factors || []).length === 0 ? <div className="text-center py-12"><div className="text-4xl mb-2">✅</div><p className="text-sm font-bold" style={{ color: 'var(--hf-mint-strong)' }}>No significant risks found</p></div>
              : (analysis.risk_factors || []).map((r, i) => {
                const sev = r.severity || 'low';
                const cfg = { critical: { bg: 'rgba(242,140,140,0.12)', color: 'var(--hf-coral-strong)' }, high: { bg: 'rgba(247,201,163,0.12)', color: 'var(--hf-peach-strong)' }, medium: { bg: 'rgba(215,245,118,0.08)', color: 'var(--hf-lemon-strong)' }, low: { bg: 'rgba(168,230,207,0.1)', color: 'var(--hf-mint-strong)' } }[sev] || { bg: 'var(--hf-surface)', color: 'var(--hf-text)' };
                return (
                  <div key={i} className="p-4 rounded-2xl" style={{ background: cfg.bg, border: `1px solid ${cfg.color}33` }}>
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-sm font-black" style={{ color: cfg.color }}>{r.factor}</p>
                      <div className="flex gap-1.5">
                        <span className="text-[9px] font-black px-2 py-0.5 rounded-full capitalize" style={{ background: `${cfg.color}22`, color: cfg.color }}>{sev}</span>
                        {r.likelihood && <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'var(--hf-surface-2)', color: 'var(--hf-text-muted)' }}>{r.likelihood}</span>}
                      </div>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--hf-text-muted)' }}>{r.description}</p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Predictions tab */}
          {activeTab === 'predict' && (
            <div className="space-y-3">
              {(analysis.predictions || []).length === 0 ? <p className="text-xs text-center py-12" style={{ color: 'var(--hf-text-muted)' }}>No predictions available</p>
              : (analysis.predictions || []).map((p, i) => (
                <div key={i} className="p-4 rounded-2xl" style={{ background: 'var(--hf-surface)', border: '1px solid rgba(201,187,255,0.3)' }}>
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <p className="text-sm font-black" style={{ color: 'var(--hf-lavender-strong)' }}>{p.condition}</p>
                    {p.probability && <span className="text-[9px] font-black px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: 'rgba(201,187,255,0.2)', color: 'var(--hf-lavender-strong)' }}>{p.probability}</span>}
                  </div>
                  {p.timeframe && <p className="text-[10px] mb-1" style={{ color: 'var(--hf-text-muted)' }}>📅 {p.timeframe}</p>}
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--hf-text-muted)' }}>{p.rationale}</p>
                </div>
              ))}
            </div>
          )}

          {/* Lifestyle tab */}
          {activeTab === 'lifestyle' && analysis.lifestyle_recommendations && (
            <div className="space-y-4">
              {Object.entries(analysis.lifestyle_recommendations).map(([key, items]) => {
                if (!items?.length) return null;
                const Icon = LIFESTYLE_ICONS[key] || Activity;
                const color = LIFESTYLE_COLORS[key] || '#d7f576';
                return (
                  <div key={key} className="p-4 rounded-2xl" style={{ background: 'var(--hf-surface)', border: `1px solid ${color}33` }}>
                    <div className="flex items-center gap-2 mb-3">
                      <Icon size={14} style={{ color }} />
                      <p className="text-xs font-black capitalize" style={{ color }}>{key}</p>
                    </div>
                    <div className="space-y-2">
                      {items.map((item, i) => (
                        <div key={i} className="flex items-start gap-2.5">
                          <CheckCircle size={12} style={{ color, flexShrink: 0, marginTop: 1 }} />
                          <p className="text-xs leading-relaxed" style={{ color: 'var(--hf-text-muted)' }}>{item}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Actions tab */}
          {activeTab === 'actions' && (
            <div className="space-y-3">
              {(analysis.preventive_actions || []).map((a, i) => {
                const pri = a.priority || 'low';
                const cfg = { high: { color: 'var(--hf-coral-strong)', bg: 'rgba(242,140,140,0.1)' }, medium: { color: 'var(--hf-peach-strong)', bg: 'rgba(247,201,163,0.1)' }, low: { color: 'var(--hf-mint-strong)', bg: 'rgba(168,230,207,0.08)' } }[pri] || { color: 'var(--hf-lemon-strong)', bg: 'rgba(215,245,118,0.08)' };
                return (
                  <div key={i} className="p-4 rounded-2xl" style={{ background: cfg.bg, border: `1px solid ${cfg.color}33` }}>
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-sm font-black" style={{ color: cfg.color }}>{a.action}</p>
                      <span className="text-[9px] font-black px-2 py-0.5 rounded-full capitalize" style={{ background: `${cfg.color}22`, color: cfg.color }}>{pri}</span>
                    </div>
                    {a.impact && <p className="text-xs leading-relaxed" style={{ color: 'var(--hf-text-muted)' }}>{a.impact}</p>}
                  </div>
                );
              })}
              {analysis.early_warnings?.map((w, i) => (
                <div key={`warn_${i}`} className="p-4 rounded-2xl" style={{ background: 'rgba(247,201,163,0.08)', border: '1px solid rgba(247,201,163,0.3)' }}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2"><AlertTriangle size={13} style={{ color: 'var(--hf-peach-strong)' }} /><p className="text-xs font-black" style={{ color: 'var(--hf-peach-strong)' }}>{w.symptom}</p></div>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full capitalize" style={{ background: 'rgba(247,201,163,0.2)', color: 'var(--hf-peach-strong)' }}>{w.urgency}</span>
                  </div>
                  <p className="text-xs" style={{ color: 'var(--hf-text-muted)' }}>{w.action}</p>
                </div>
              ))}
            </div>
          )}

          {/* Refresh */}
          <button onClick={generate} disabled={loading}
            className="w-full h-10 rounded-2xl text-xs font-bold mt-3 flex items-center justify-center gap-2"
            style={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)', color: 'var(--hf-text-muted)' }}>
            <RefreshCw size={12} /> Refresh Analysis
          </button>
        </>
      )}
    </div>
  );
}
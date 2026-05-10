// @ts-nocheck
import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useActiveProfile } from '../components/ActiveProfileContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from
'recharts';
import {
  Sparkles, Brain, TrendingUp, TrendingDown, AlertTriangle, Pill, Minus, Loader2, RefreshCw } from
'lucide-react';
import { format, subDays } from 'date-fns';
import { MarkdownContent } from '@/components/ui/markdown-content';
import { getCrossDocumentInsights } from '@/services/insights';

// ── helpers ──────────────────────────────────────────────────────────────────

function trendDir(arr, key) {
  if (arr.length < 2) return 'stable';
  const half = Math.floor(arr.length / 2);
  const first = arr.slice(0, half).reduce((s, v) => s + (v[key] || 0), 0) / half;
  const second = arr.slice(half).reduce((s, v) => s + (v[key] || 0), 0) / (arr.length - half);
  const pct = (second - first) / (first || 1) * 100;
  if (pct > 3) return 'up';
  if (pct < -3) return 'down';
  return 'stable';
}

const FLAG_STYLE = {
  high: { bg: '#f28c8c', text: '#3d0000', label: 'High' },
  low: { bg: '#9bb4ff', text: '#0a1240', label: 'Low' },
  normal: { bg: '#a8e6cf', text: '#003d20', label: 'Normal' }
};

function VitalMiniChart({ data, color = '#d7f576' }) {
  return (
    <ResponsiveContainer width="100%" height={56}>
      <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`g${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="v" stroke={color} strokeWidth={2} fill={`url(#g${color.replace('#', '')})`} dot={false} />
      </AreaChart>
    </ResponsiveContainer>);

}

// ── Vital card ────────────────────────────────────────────────────────────────
function VitalCard({ type, measurements }) {
  const sorted = [...measurements].
  filter((m) => m.vital_type === type).
  sort((a, b) => new Date(a.measured_at) - new Date(b.measured_at));

  if (!sorted.length) return null;

  const latest = sorted[sorted.length - 1];
  const displayVal = type === 'blood_pressure' ?
  `${latest.systolic}/${latest.diastolic}` :
  latest.value;

  const chartData = sorted.slice(-14).map((m) => ({
    v: type === 'blood_pressure' ? m.systolic : m.value,
    t: format(new Date(m.measured_at), 'MMM d')
  }));

  const trend = trendDir(chartData, 'v');

  const COLORS = {
    blood_pressure: '#f28c8c',
    heart_rate: '#f7c9a3',
    blood_glucose: '#c9bbff',
    weight: '#d7f576',
    temperature: '#9bb4ff',
    oxygen_saturation: '#a8e6cf'
  };
  const color = COLORS[type] || '#d7f576';
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  return (
    <div className="rounded-2xl p-4 flex flex-col gap-2" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--hf-text-muted)' }}>
            {type.replace(/_/g, ' ')}
          </p>
          <p className="text-2xl font-black mt-0.5" style={{ color: 'var(--hf-text)' }}>{displayVal}</p>
          <p className="text-[10px]" style={{ color: 'var(--hf-text-muted)' }}>{latest.unit}</p>
        </div>
        <div className="flex items-center gap-1 px-2 py-1 rounded-xl" style={{ background: `${color}22` }}>
          <TrendIcon size={11} style={{ color }} />
          <span className="text-[10px] font-bold capitalize" style={{ color }}>{trend}</span>
        </div>
      </div>
      <VitalMiniChart data={chartData} color={color} />
      <p className="text-[10px]" style={{ color: 'var(--hf-text-muted)' }}>
        {sorted.length} readings · last {format(new Date(latest.measured_at), 'MMM d')}
      </p>
    </div>);

}

// ── Lab result row ────────────────────────────────────────────────────────────
function LabRow({ result }) {
  const fs = FLAG_STYLE[result.flag] || FLAG_STYLE.normal;
  const pct = result.reference_high && result.reference_low ?
  Math.min(100, Math.max(0, (result.value - result.reference_low) / (result.reference_high - result.reference_low) * 100)) :
  null;

  return (
    <div className="p-3 rounded-xl" style={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)' }}>
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-xs font-bold" style={{ color: 'var(--hf-text)' }}>{result.test_name}</p>
        <span className="text-[9px] font-black px-2 py-0.5 rounded-full" style={{ background: fs.bg, color: fs.text }}>
          {fs.label}
        </span>
      </div>
      <div className="flex items-center justify-between text-[10px]" style={{ color: 'var(--hf-text-muted)' }}>
        <span className="font-bold" style={{ color: 'var(--hf-text)' }}>{result.value} {result.unit}</span>
        {result.reference_low != null && result.reference_high != null &&
        <span>Ref: {result.reference_low}–{result.reference_high}</span>
        }
      </div>
      {pct !== null &&
      <div className="mt-2 relative">
          <div className="h-1.5 rounded-full" style={{ background: 'var(--hf-border)' }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: fs.bg }} />
          </div>
        </div>
      }
    </div>);

}

// ── Adherence ring ────────────────────────────────────────────────────────────
function AdherenceRing({ taken, total }) {
  const pct = total > 0 ? Math.round(taken / total * 100) : 0;
  const r = 28,c = 2 * Math.PI * r;
  const dash = pct / 100 * c;
  const color = pct >= 80 ? '#a8e6cf' : pct >= 50 ? '#f7c9a3' : '#f28c8c';
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="72" height="72" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r={r} fill="none" stroke="var(--hf-border)" strokeWidth="6" />
        <circle cx="36" cy="36" r={r} fill="none" stroke={color} strokeWidth="6"
        strokeDasharray={`${dash} ${c - dash}`} strokeLinecap="round"
        transform="rotate(-90 36 36)" />
        <text x="36" y="40" textAnchor="middle" fontSize="13" fontWeight="800" fill={color}>{pct}%</text>
      </svg>
      <p className="text-[10px] font-bold" style={{ color: 'var(--hf-text-muted)' }}>{taken}/{total} doses</p>
    </div>);

}

// ── AI Insight panel ──────────────────────────────────────────────────────────
function AIInsightPanel({ generating, insights, onGenerate }) {
  if (generating) return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(201,187,255,0.2)' }}>
        <Sparkles size={28} className="animate-pulse" style={{ color: 'var(--hf-lavender-strong)' }} />
      </div>
      <p className="text-sm font-bold" style={{ color: 'var(--hf-text)' }}>Analyzing your health data…</p>
      <p className="text-xs" style={{ color: 'var(--hf-text-muted)' }}>This takes a few seconds</p>
    </div>);


  if (!insights) return (
    <div className="flex flex-col items-center justify-center py-14 gap-4 text-center">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl" style={{ background: 'rgba(215,245,118,0.1)', border: '1px dashed rgba(215,245,118,0.3)' }}>🧠</div>
      <p className="text-sm font-bold" style={{ color: 'var(--hf-text)' }}>AI Health Analysis</p>
      <p className="text-xs max-w-xs" style={{ color: 'var(--hf-text-muted)' }}>
        Get a comprehensive AI-powered analysis of your vitals, labs, and medications.
      </p>
      <Button onClick={onGenerate}
      className="rounded-2xl h-10 px-6 font-bold"
      style={{ background: '#c9bbff', color: '#1a0a40' }}>
        <Sparkles size={14} className="mr-2" /> Generate Insights
      </Button>
    </div>);


  return (
    <div className="prose prose-sm max-w-none">
      <MarkdownContent content={insights} className="text-xs" />
      <div className="mt-4 p-3 rounded-xl flex items-start gap-2" style={{ background: 'rgba(215,245,118,0.1)', border: '1px solid rgba(215,245,118,0.2)' }}>
        <span className="text-sm">💡</span>
        <p className="text-[10px]" style={{ color: 'var(--hf-text-muted)' }}>
          AI insights are for informational purposes only. Always consult a qualified healthcare provider.
        </p>
      </div>
    </div>);

}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Insights() {
  const { activeProfileId, activeProfile } = useActiveProfile();
  const [generating, setGenerating] = useState(false);
  const [insights, setInsights] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  const { data: vitals = [] } = useQuery({
    queryKey: ['vitals-insights', activeProfileId],
    queryFn: () => base44.entities.VitalMeasurement.filter({ profile_id: activeProfileId }, '-measured_at', 60),
    enabled: !!activeProfileId
  });

  const { data: labResults = [] } = useQuery({
    queryKey: ['labs-insights', activeProfileId],
    queryFn: () => base44.entities.LabResult.filter({ profile_id: activeProfileId }, '-test_date', 30),
    enabled: !!activeProfileId
  });

  const { data: medications = [] } = useQuery({
    queryKey: ['meds-insights', activeProfileId],
    queryFn: () => base44.entities.Medication.filter({ profile_id: activeProfileId, is_active: true }),
    enabled: !!activeProfileId
  });

  const { data: medLogs = [] } = useQuery({
    queryKey: ['medlogs-insights', activeProfileId],
    queryFn: () => base44.entities.MedicationLog.filter({ profile_id: activeProfileId }, '-scheduled_time', 60),
    enabled: !!activeProfileId
  });

  const {
    data: crossDocumentData = null,
    refetch: refetchCrossDocumentInsights,
  } = useQuery({
    queryKey: ['cross-document-insights', activeProfileId],
    queryFn: () => getCrossDocumentInsights(activeProfileId),
    enabled: !!activeProfileId,
  });

  // Derived stats
  const abnormal = useMemo(() => labResults.filter((r) => r.flag !== 'normal'), [labResults]);
  const vitalTypes = useMemo(() => [...new Set(vitals.map((v) => v.vital_type))], [vitals]);

  const recentMedLogs = medLogs.filter((l) => new Date(l.scheduled_time) >= subDays(new Date(), 30));
  const takenLogs = recentMedLogs.filter((l) => l.status === 'taken');

  // Weekly adherence bar chart
  const adherenceChart = useMemo(() => {
    const weeks = [];
    for (let i = 3; i >= 0; i--) {
      const start = subDays(new Date(), (i + 1) * 7);
      const end = subDays(new Date(), i * 7);
      const weekLogs = medLogs.filter((l) => {
        const d = new Date(l.scheduled_time);
        return d >= start && d < end;
      });
      const taken = weekLogs.filter((l) => l.status === 'taken').length;
      const total = weekLogs.length;
      weeks.push({ week: `W${4 - i}`, pct: total > 0 ? Math.round(taken / total * 100) : 0 });
    }
    return weeks;
  }, [medLogs]);

  const generateInsights = async () => {
    setGenerating(true);
    try {
      const response = await refetchCrossDocumentInsights();
      const latest = response.data ?? crossDocumentData;
      const generatedSummary =
        latest?.summaryMarkdown ||
        [
          ...(latest?.cards ?? []).map((item) => `- ${item.title}: ${item.description}`),
          ...(latest?.correlations ?? []).map((item) => `- ${item.title}: ${item.description}`),
        ].filter(Boolean).join('\n');
      setInsights(generatedSummary || null);
      setActiveTab('ai');
    } finally {
      setGenerating(false);
    }
  };

  const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'vitals', label: 'Vitals' },
  { key: 'labs', label: 'Labs' },
  { key: 'medications', label: 'Meds' },
  { key: 'ai', label: '✨ AI' }];


  const hasData = vitals.length > 0 || labResults.length > 0 || medications.length > 0;

  return (
    <div className="bento-page">
      <div className="bento-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="bento-title">Insights</h1>
            <p className="bento-subtitle">{activeProfile?.full_name || 'Health'} · Deep health analysis</p>
          </div>
          <Button onClick={generateInsights} disabled={generating || !hasData}
          className="rounded-2xl h-9 px-4 text-xs font-bold flex-shrink-0"
          style={{ background: '#c9bbff', color: '#1a0a40' }}>
            {generating ? <Loader2 size={13} className="animate-spin mr-1" /> : <Sparkles size={13} className="mr-1" />}
            {generating ? 'Analyzing…' : 'AI Analysis'}
          </Button>
        </div>
      </div>

      {/* Summary stat bar */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-4 scrollbar-hide">
        {[
          { label: 'Vitals', value: vitals.length, color: 'var(--hf-coral-strong)' },
          { label: 'Labs', value: labResults.length, color: 'var(--hf-lavender-strong)' },
          { label: 'Meds', value: medications.length, color: 'var(--hf-lemon-strong)' },
          { label: 'Abnormal', value: abnormal.length, color: abnormal.length > 0 ? '#f7c9a3' : '#a8e6cf' },
        ].map(s => (
          <div key={s.label} className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5"
            style={{ background: s.color + '22', border: `1px solid ${s.color}44`, color: s.color }}>
            <span className="text-sm font-black">{s.value}</span>
            <span style={{ opacity: 0.7 }}>{s.label}</span>
          </div>
        ))}
      </div>










      {/* Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 mb-4 scrollbar-hide">
        {TABS.map((tab) =>
        <button key={tab.key} onClick={() => setActiveTab(tab.key)}
        className="whitespace-nowrap px-4 py-2 rounded-xl text-xs font-bold transition-all flex-shrink-0"
        style={{
          background: activeTab === tab.key ? '#d7f576' : 'var(--hf-surface-2)',
          color: activeTab === tab.key ? '#0a1200' : 'var(--hf-text-muted)',
          border: '1px solid var(--hf-border)'
        }}>
            {tab.label}
          </button>
        )}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {activeTab === 'overview' &&
      <div className="space-y-4">
          {crossDocumentData && (crossDocumentData.cards.length > 0 || crossDocumentData.correlations.length > 0) && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest mb-2 px-1" style={{ color: 'var(--hf-text-muted)' }}>Cross-document correlations</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[...crossDocumentData.cards, ...crossDocumentData.correlations].slice(0, 4).map((item) => (
                  <div key={item.id} className="rounded-2xl p-4" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
                    <p className="text-xs font-black mb-1" style={{ color: 'var(--hf-text)' }}>{item.title}</p>
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--hf-text-muted)' }}>{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* Alert banner */}
          {abnormal.length > 0 &&
        <div className="p-4 rounded-2xl flex items-start gap-3" style={{ background: 'rgba(242,140,140,0.12)', border: '1px solid rgba(242,140,140,0.3)' }}>
              <AlertTriangle size={16} style={{ color: 'var(--hf-coral-strong)', flexShrink: 0, marginTop: 1 }} />
              <div>
                <p className="text-sm font-bold" style={{ color: 'var(--hf-coral-strong)' }}>{abnormal.length} abnormal lab result{abnormal.length > 1 ? 's' : ''}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--hf-text-muted)' }}>
                  {abnormal.slice(0, 3).map((r) => r.test_name).join(', ')}{abnormal.length > 3 ? ` +${abnormal.length - 3} more` : ''}
                </p>
              </div>
            </div>
        }

          {/* Bento grid of key metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
          { label: 'Vitals Tracked', value: vitals.length, icon: '💓', color: 'var(--hf-coral-strong)', textColor: '#3d0000' },
          { label: 'Lab Results', value: labResults.length, icon: '🔬', color: 'var(--hf-lavender-strong)', textColor: '#1a0a40' },
          { label: 'Active Meds', value: medications.length, icon: '💊', color: 'var(--hf-lemon-strong)', textColor: '#0a1200' },
          { label: 'Adherence', value: recentMedLogs.length > 0 ? `${Math.round(takenLogs.length / recentMedLogs.length * 100)}%` : '–', icon: '✅', color: 'var(--hf-mint-strong)', textColor: '#003d20' }].
          map((s) =>
          <div key={s.label} className="rounded-2xl p-4" style={{ background: s.color }}>
                <span className="text-xl">{s.icon}</span>
                <p className="text-2xl font-black mt-1" style={{ color: s.textColor }}>{s.value}</p>
                <p className="text-[10px] font-bold uppercase opacity-70" style={{ color: s.textColor }}>{s.label}</p>
              </div>
          )}
          </div>

          {/* Latest vitals mini-grid */}
          {vitalTypes.length > 0 &&
        <div>
              <p className="text-[10px] font-black uppercase tracking-widest mb-2 px-1" style={{ color: 'var(--hf-text-muted)' }}>Latest Readings</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {vitalTypes.slice(0, 6).map((type) =>
            <VitalCard key={type} type={type} measurements={vitals} />
            )}
              </div>
            </div>
        }

          {/* Adherence summary */}
          {medications.length > 0 &&
        <Card className="border-0 card-shadow rounded-2xl">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--hf-text)' }}>
                  <Pill size={13} /> Medication Adherence (30d)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="flex items-center gap-6">
                  <AdherenceRing taken={takenLogs.length} total={recentMedLogs.length} />
                  <div className="flex-1">
                    <div className="space-y-2">
                      {medications.slice(0, 3).map((m) => {
                    const mLogs = recentMedLogs.filter((l) => l.medication_id === m.id);
                    const mTaken = mLogs.filter((l) => l.status === 'taken').length;
                    const pct = mLogs.length > 0 ? Math.round(mTaken / mLogs.length * 100) : 0;
                    return (
                      <div key={m.id}>
                            <div className="flex justify-between text-[10px] mb-1">
                              <span className="font-bold truncate" style={{ color: 'var(--hf-text)' }}>{m.medication_name}</span>
                              <span style={{ color: 'var(--hf-text-muted)' }}>{pct}%</span>
                            </div>
                            <Progress value={pct} className="h-1.5 rounded-full" />
                          </div>);

                  })}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
        }

          {!hasData &&
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
              <div className="text-4xl">📊</div>
              <p className="text-sm font-bold" style={{ color: 'var(--hf-text)' }}>No health data yet</p>
              <p className="text-xs" style={{ color: 'var(--hf-text-muted)' }}>Log vitals, labs, and medications to unlock insights.</p>
            </div>
        }
        </div>
      }

      {/* ── VITALS TAB ── */}
      {activeTab === 'vitals' &&
      <div className="space-y-4">
          {vitalTypes.length === 0 ?
        <div className="text-center py-20">
              <p className="text-sm font-bold" style={{ color: 'var(--hf-text)' }}>No vitals logged yet</p>
            </div> :

        <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {vitalTypes.map((type) => {
              const typeVitals = vitals.filter((v) => v.vital_type === type).
              sort((a, b) => new Date(a.measured_at) - new Date(b.measured_at));
              const chartData = typeVitals.slice(-20).map((v) => ({
                t: format(new Date(v.measured_at), 'MMM d'),
                v: type === 'blood_pressure' ? v.systolic : v.value,
                d: type === 'blood_pressure' ? v.diastolic : null
              }));
              const COLORS = { blood_pressure: '#f28c8c', heart_rate: '#f7c9a3', blood_glucose: '#c9bbff', weight: '#d7f576', oxygen_saturation: '#a8e6cf', temperature: '#9bb4ff' };
              const color = COLORS[type] || '#d7f576';
              const latest = typeVitals[typeVitals.length - 1];

              return (
                <Card key={type} className="border-0 card-shadow rounded-2xl">
                      <CardHeader className="p-4 pb-0">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-xs font-black uppercase tracking-wider" style={{ color: 'var(--hf-text-muted)' }}>
                            {type.replace(/_/g, ' ')}
                          </CardTitle>
                          <span className="text-lg font-black" style={{ color }}>
                            {type === 'blood_pressure' ? `${latest?.systolic}/${latest?.diastolic}` : latest?.value} {latest?.unit}
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 pt-2 h-[120px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={chartData}>
                            <XAxis dataKey="t" tick={{ fontSize: 9, fill: 'var(--hf-text-muted)' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                            <YAxis hide domain={['auto', 'auto']} />
                            <Tooltip contentStyle={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)', borderRadius: 10, fontSize: 10 }} />
                            <Line type="monotone" dataKey="v" stroke={color} strokeWidth={2} dot={false} />
                            {type === 'blood_pressure' && <Line type="monotone" dataKey="d" stroke={`${color}99`} strokeWidth={1.5} dot={false} strokeDasharray="4 2" />}
                          </LineChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>);

            })}
              </div>
            </>
        }
        </div>
      }

      {/* ── LABS TAB ── */}
      {activeTab === 'labs' &&
      <div className="space-y-3">
          {labResults.length === 0 ?
        <div className="text-center py-20">
              <p className="text-sm font-bold" style={{ color: 'var(--hf-text)' }}>No lab results yet</p>
            </div> :

        <>
              {abnormal.length > 0 &&
          <div>
                  <p className="text-[10px] font-black uppercase tracking-widest mb-2 px-1" style={{ color: 'var(--hf-coral-strong)' }}>Needs Attention</p>
                  <div className="space-y-2">
                    {abnormal.map((r) => <LabRow key={r.id} result={r} />)}
                  </div>
                </div>
          }
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest mb-2 px-1" style={{ color: 'var(--hf-text-muted)' }}>All Results</p>
                <div className="space-y-2">
                  {labResults.filter((r) => r.flag === 'normal' || !r.flag).map((r) => <LabRow key={r.id} result={r} />)}
                </div>
              </div>
            </>
        }
        </div>
      }

      {/* ── MEDICATIONS TAB ── */}
      {activeTab === 'medications' &&
      <div className="space-y-4">
          {medications.length === 0 ?
        <div className="text-center py-20">
              <p className="text-sm font-bold" style={{ color: 'var(--hf-text)' }}>No active medications</p>
            </div> :

        <>
              {/* Adherence over time */}
              <Card className="border-0 card-shadow rounded-2xl">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm font-bold" style={{ color: 'var(--hf-text)' }}>Weekly Adherence</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 h-[120px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={adherenceChart} barSize={28}>
                      <XAxis dataKey="week" tick={{ fontSize: 10, fill: 'var(--hf-text-muted)' }} axisLine={false} tickLine={false} />
                      <YAxis hide domain={[0, 100]} />
                      <Tooltip formatter={(v) => `${v}%`} contentStyle={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)', borderRadius: 10, fontSize: 10 }} />
                      <ReferenceLine y={80} stroke="#a8e6cf" strokeDasharray="4 2" strokeWidth={1} />
                      <Bar dataKey="pct" radius={[6, 6, 0, 0]}>
                        {adherenceChart.map((entry, i) =>
                    <Cell key={i} fill={entry.pct >= 80 ? '#a8e6cf' : entry.pct >= 50 ? '#f7c9a3' : '#f28c8c'} />
                    )}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Med cards */}
              <div className="space-y-3">
                {medications.map((m) => {
              const mLogs = recentMedLogs.filter((l) => l.medication_id === m.id);
              const taken = mLogs.filter((l) => l.status === 'taken').length;
              const pct = mLogs.length > 0 ? Math.round(taken / mLogs.length * 100) : 0;
              const adherColor = pct >= 80 ? '#a8e6cf' : pct >= 50 ? '#f7c9a3' : '#f28c8c';
              return (
                <div key={m.id} className="p-4 rounded-2xl" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex gap-3">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{ background: 'rgba(201,187,255,0.15)' }}>💊</div>
                          <div>
                            <p className="font-bold text-sm" style={{ color: 'var(--hf-text)' }}>{m.medication_name}</p>
                            <p className="text-xs" style={{ color: 'var(--hf-text-muted)' }}>{m.dosage} · {m.frequency?.replace(/_/g, ' ')}</p>
                            {m.purpose && <p className="text-[10px] mt-0.5" style={{ color: 'var(--hf-text-muted)' }}>{m.purpose}</p>}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-black" style={{ color: adherColor }}>{mLogs.length > 0 ? `${pct}%` : '–'}</p>
                          <p className="text-[9px]" style={{ color: 'var(--hf-text-muted)' }}>adherence</p>
                        </div>
                      </div>
                      {mLogs.length > 0 &&
                  <div className="mt-3">
                          <Progress value={pct} className="h-1.5 rounded-full" />
                        </div>
                  }
                    </div>);

            })}
              </div>
            </>
        }
        </div>
      }

      {/* ── AI TAB ── */}
      {activeTab === 'ai' &&
      <Card className="border-0 card-shadow rounded-2xl">
          <CardHeader className="p-4 pb-2 border-b" style={{ borderColor: 'var(--hf-border)' }}>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--hf-text)' }}>
                <Brain size={14} style={{ color: 'var(--hf-lavender-strong)' }} /> AI Health Analysis
              </CardTitle>
              {insights &&
            <button onClick={generateInsights} disabled={generating}
            className="text-[10px] font-bold flex items-center gap-1 px-3 py-1.5 rounded-xl"
            style={{ background: 'var(--hf-surface-2)', color: 'var(--hf-text-muted)', border: '1px solid var(--hf-border)' }}>
                  <RefreshCw size={10} className={generating ? 'animate-spin' : ''} /> Regenerate
                </button>
            }
            </div>
          </CardHeader>
          <CardContent className="p-4">
            {!crossDocumentData?.summaryMarkdown && crossDocumentData?.cards?.length === 0 && crossDocumentData?.correlations?.length === 0 && (
              <div className="mb-4 rounded-xl p-3" style={{ background: 'rgba(201,187,255,0.08)', border: '1px solid rgba(201,187,255,0.2)' }}>
                <p className="text-[11px]" style={{ color: 'var(--hf-text-muted)' }}>
                  Cross-document insights are shown only when the backend returns summary or correlation data for this profile.
                </p>
              </div>
            )}
            <AIInsightPanel generating={generating} insights={insights} onGenerate={generateInsights} />
          </CardContent>
        </Card>
      }
    </div>);

}

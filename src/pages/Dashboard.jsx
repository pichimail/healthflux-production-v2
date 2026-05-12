// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Activity, Pill, TrendingUp, Plus, X,
  Brain, TestTube,
  Leaf, BarChart3, AlertTriangle } from
'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format } from 'date-fns';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell } from
'recharts';
import { useActiveProfile } from '../components/ActiveProfileContext';
import VitalEntryForm from '../components/VitalEntryForm';
import UniversalUpload from '../components/UniversalUpload';
import AIHealthChat from '../components/AIHealthChat';
import AddMedicationForm from '../components/forms/AddMedicationForm';
import AddLabResultForm from '../components/forms/AddLabResultForm';
import Haptics from '../components/utils/haptics';
import PullToRefresh from '../components/PullToRefresh';
import { Drawer } from 'vaul';
import { motion, AnimatePresence } from 'framer-motion';
import { useBottomSheet } from '../lib/BottomSheetContext';
import { loadWidgets } from '../components/dashboard/WidgetCustomizer';
import DailyCalorieChart from '../components/nutrition/DailyCalorieChart';
import { useFABDispatch } from '../lib/FABContext';
import { getDailyHealthGoals } from '@/services/wellness';
import MultiSnapCamera from '../components/MultiSnapCamera';
import DocScanner from '../components/DocScanner';

// ── Pastel palette ──
const P = {
  lemon: { bg: '#d7f576', text: '#0a1200' },
  lavender: { bg: '#c9bbff', text: '#1a0a40' },
  peach: { bg: '#f7c9a3', text: '#3d1a00' },
  mint: { bg: '#a8e6cf', text: '#003d20' },
  sky: { bg: '#9bb4ff', text: '#0a1240' },
  rose: { bg: '#f28c8c', text: '#3d0000' },
  lilac: { bg: '#e8d5ff', text: '#2d0a4a' }
};



// ── Health Score ring ──
function HealthRing({ score, size = 100 }) {
  const sw = 8;
  const r = (size - sw * 2) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * ((score || 0) / 100);
  const color = score >= 80 ? '#d7f576' : score >= 60 ? '#f7c9a3' : '#f28c8c';
  return (
    <div className="hf-chip hf-chip flex flex-col items-center justify-center relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ position: 'absolute', transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={sw} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={sw}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 1s cubic-bezier(.4,0,.2,1)', filter: `drop-shadow(0 0 6px ${color}88)` }} />
      </svg>
      <div className="flex flex-col items-center justify-center z-10">
        <span className="font-black" style={{ color, fontSize: size * 0.26, lineHeight: 1 }}>{score}</span>
        <span className="font-black uppercase tracking-widest" style={{ color: 'var(--hf-text-muted)', fontSize: size * 0.1, marginTop: 2 }}>Health</span>
      </div>
    </div>);
}

// ── Tiny sparkline ──
function Spark({ data, color }) {
  if (!data || data.length < 2) return null;
  const vals = data.map((d) => d.v);
  const min = Math.min(...vals), max = Math.max(...vals);
  const range = max - min || 1;
  const w = 60, h = 24;
  const pts = vals.map((v, i) => `${i / (vals.length - 1) * w},${h - (v - min) / range * h}`).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>);
}

// ── Vital card ──
function VitalCard({ label, value, unit, color, textColor, spark, onClick }) {
  return (
    <button onClick={onClick}
    className="rounded-[14px] p-3 text-left flex flex-col gap-1 w-full transition-all active:scale-[0.97]"
    style={{ background: color, minHeight: 80 }}>
      <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: textColor, opacity: 0.6 }}>{label}</span>
      <span className="text-2xl font-black leading-none" style={{ color: textColor }}>
        {value ?? '—'}{value != null && unit ? <span className="text-xs font-bold ml-0.5" style={{ opacity: 0.55 }}>{unit}</span> : ''}
      </span>
      {spark && <div className="mt-auto"><Spark data={spark} color={textColor + '99'} /></div>}
    </button>);
}

// ── Trend chart card ──
function TrendCard({ title, data, dataKey, color, unit }) {
  const isEmpty = !data || data.length === 0;
  return (
    <div className="rounded-[14px] p-4 flex flex-col" style={{ background: 'var(--hf-panel)', border: '1px solid var(--hf-border)', minHeight: 130 }}>
      <span className="text-[9px] font-black uppercase tracking-widest mb-3" style={{ color: 'var(--hf-text-muted)' }}>{title}</span>
      {isEmpty ?
      <div className="flex-1 flex items-center justify-center">
          <span className="text-xs" style={{ color: 'var(--hf-text-muted)' }}>No data yet</span>
        </div> :
      <div className="flex-1" style={{ minHeight: 80 }}>
          <ResponsiveContainer width="100%" height={80}>
            <AreaChart data={data} margin={{ top: 2, right: 2, bottom: 0, left: -28 }}>
              <defs>
                <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize: 8, fill: 'var(--hf-text-muted)' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 8, fill: 'var(--hf-text-muted)' }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)', borderRadius: 10, fontSize: 10, color: 'var(--hf-text)' }}
            formatter={(v) => [`${v} ${unit || ''}`, '']} />
              <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} fill={`url(#grad-${dataKey})`} dot={{ fill: color, r: 3, strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      }
    </div>);
}

// ── Wellness Score widget ──
function WellnessScoreWidget({ vitalsCount, medsCount, labAlertsCount, healthScore }) {
  const score = healthScore;
  const label = score >= 80 ? 'Great' : score >= 65 ? 'Good' : score >= 50 ? 'Fair' : 'Poor';
  const pct = score;
  const barColor = score >= 80 ? '#d7f576' : score >= 65 ? '#a8e6cf' : score >= 50 ? '#f7c9a3' : '#f28c8c';

  return (
    <div className="rounded-[14px] p-4" style={{ background: 'var(--hf-panel)', border: '1px solid var(--hf-border)' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity size={14} style={{ color: 'var(--hf-lemon-strong)' }} />
          <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'var(--hf-text-muted)' }}>Wellness Score</span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-black" style={{ color: 'var(--hf-text)' }}>{score}</span>
          <span className="text-xs font-bold" style={{ color: 'var(--hf-text-muted)' }}>/100</span>
        </div>
      </div>
      <div className="relative mb-1">
        <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: 'linear-gradient(to right, #f28c8c 0%, #f7c9a3 33%, #a8e6cf 66%, #d7f576 100%)' }} />
        <div className="absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 border-white shadow-md"
        style={{ left: `calc(${pct}% - 10px)`, background: barColor, boxShadow: `0 0 8px ${barColor}aa` }} />
      </div>
      <div className="flex justify-between text-[8px] font-bold mb-3" style={{ color: 'var(--hf-text-muted)' }}>
        <span>Poor</span><span>Fair</span><span>Good</span><span>Great</span>
      </div>
      <div className="text-center mb-3">
        <span className="text-xs font-bold" style={{ color: barColor }}>{label}</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-[10px] p-3 flex flex-col items-center gap-1" style={{ background: '#c9bbff22' }}>
          <TrendingUp size={14} style={{ color: 'var(--hf-lavender-strong)' }} />
          <span className="text-lg font-black leading-none" style={{ color: 'var(--hf-lavender-strong)' }}>{vitalsCount}</span>
          <span className="text-[8px] font-bold uppercase" style={{ color: 'var(--hf-text-muted)' }}>Vitals</span>
        </div>
        <div className="rounded-[10px] p-3 flex flex-col items-center gap-1" style={{ background: '#f7c9a322' }}>
          <Pill size={14} style={{ color: 'var(--hf-peach-strong)' }} />
          <span className="text-lg font-black leading-none" style={{ color: 'var(--hf-peach-strong)' }}>{medsCount}</span>
          <span className="text-[8px] font-bold uppercase" style={{ color: 'var(--hf-text-muted)' }}>Meds</span>
        </div>
        <div className="rounded-[10px] p-3 flex flex-col items-center gap-1" style={{ background: '#f28c8c22' }}>
          <AlertTriangle size={14} style={{ color: 'var(--hf-coral-strong)' }} />
          <span className="text-lg font-black leading-none" style={{ color: 'var(--hf-coral-strong)' }}>{labAlertsCount}</span>
          <span className="text-[8px] font-bold uppercase" style={{ color: 'var(--hf-text-muted)' }}>Alerts</span>
        </div>
      </div>
    </div>);
}

// ── Medication Adherence widget ──
function MedAdherenceWidget({ profileId, medications }) {
  const { data: logs = [] } = useQuery({
    queryKey: ['med-logs-adh', profileId],
    queryFn: async () => { try { return await base44.entities.MedicationLog.filter({ profile_id: profileId }, '-scheduled_time', 30) || []; } catch { return []; } },
    enabled: !!profileId, retry: 1, staleTime: 30000
  });

  const taken = logs.filter((l) => l.status === 'taken').length;
  const missed = logs.filter((l) => l.status === 'skipped').length;
  const active = medications.length;
  const adherence = logs.length > 0 ? Math.round(taken / logs.length * 100) : 0;
  const adherenceColor = adherence >= 80 ? '#d7f576' : adherence >= 50 ? '#f7c9a3' : '#f28c8c';

  const days = useMemo(() => {
    const grouped = {};
    logs.forEach((l) => {
      if (!l.scheduled_time) return;
      const dt = new Date(l.scheduled_time);
      if (isNaN(dt.getTime())) return;
      const d = format(dt, 'EEE');
      if (!grouped[d]) grouped[d] = { taken: 0, total: 0 };
      grouped[d].total++;
      if (l.status === 'taken') grouped[d].taken++;
    });
    return Object.entries(grouped).slice(-3).map(([day, v]) => ({ day, pct: v.total ? Math.round(v.taken / v.total * 100) : 0 }));
  }, [logs]);

  return (
    <div className="rounded-[14px] p-4" style={{ background: 'var(--hf-panel)', border: '1px solid var(--hf-border)' }}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'var(--hf-text-muted)' }}>Medication</p>
          <p className="text-base font-black" style={{ color: 'var(--hf-text)' }}>Adherence</p>
        </div>
        <span className="text-3xl font-black" style={{ color: adherenceColor }}>{adherence}</span>
      </div>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
        { label: 'Taken', value: taken, color: 'var(--hf-lemon-strong)', bg: '#d7f57618' },
        { label: 'Missed', value: missed, color: 'var(--hf-coral-strong)', bg: '#f28c8c18' },
        { label: 'Active', value: active, color: 'var(--hf-sky-strong)', bg: '#9bb4ff18' }].
        map(({ label, value, color, bg }) =>
        <div key={label} className="rounded-[10px] p-2 text-center" style={{ background: bg }}>
            <span className="text-xl font-black block" style={{ color }}>{value}</span>
            <span className="text-[8px] font-bold uppercase tracking-wide" style={{ color: 'var(--hf-text-muted)' }}>{label}</span>
          </div>
        )}
      </div>
      {days.length > 0 &&
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${days.length}, 1fr)` }}>
          {days.map(({ day, pct }) =>
        <div key={day} className="flex flex-col items-center gap-1">
              <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--hf-surface-2)' }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: pct >= 80 ? '#d7f576' : pct >= 50 ? '#f7c9a3' : '#f28c8c' }} />
              </div>
              <span className="text-[8px] font-bold" style={{ color: 'var(--hf-text-muted)' }}>{day}</span>
            </div>
        )}
        </div>
      }
    </div>);
}

// ── Nutrition Widget ──
function NutritionWidget({ mealLogs, goalCalories }) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const todayLogs = mealLogs.filter(l => l.logged_date === today);
  const totalCal = todayLogs.reduce((s, l) => s + (l.calories || 0), 0);
  const hasGoal = Number.isFinite(goalCalories) && goalCalories > 0;
  const pct = hasGoal ? Math.min(100, Math.round((totalCal / goalCalories) * 100)) : 0;
  const barColor = pct >= 100 ? '#f28c8c' : pct >= 80 ? '#f7c9a3' : '#d7f576';
  return (
    <div className="rounded-[14px] p-4" style={{ background: 'var(--hf-panel)', border: '1px solid var(--hf-border)' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Leaf size={14} style={{ color: 'var(--hf-mint-strong)' }} />
          <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'var(--hf-text-muted)' }}>Today's Nutrition</span>
        </div>
        <Link to={createPageUrl('Nutrition')} className="text-[10px] font-bold" style={{ color: 'var(--hf-lemon-strong)' }}>Log food →</Link>
      </div>
      <div className="flex items-baseline gap-1 mb-2">
        <span className="text-2xl font-black" style={{ color: barColor }}>{totalCal}</span>
        <span className="text-xs" style={{ color: 'var(--hf-text-muted)' }}>
          / {hasGoal ? `${goalCalories} kcal` : 'Target unavailable'}
        </span>
      </div>
      <div className="w-full h-2 rounded-full overflow-hidden mb-2" style={{ background: 'var(--hf-surface-2)' }}>
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: barColor }} />
      </div>
      <DailyCalorieChart mealLogs={mealLogs} goalCalories={goalCalories || 0} />
    </div>
  );
}

// ── Overview Tab ──
function OverviewTab({ vitals, documents, upcomingMeds, labAlerts, insights, healthScore, bpData, hrData, docTypes, onLogVital, onChat, profileId, widgets, mealLogs, nutritionGoal }) {
  const isEnabled = (id) => widgets.find((w) => w.id === id)?.enabled !== false;

  const getLatest = (type) => vitals.find((v) => v.vital_type === type);
  const bp = getLatest('blood_pressure');
  const hr = getLatest('heart_rate');
  const wt = getLatest('weight');
  const o2 = getLatest('oxygen_saturation');
  const gl = getLatest('blood_glucose');

  const PIE_COLORS = ['#d7f576', '#c9bbff', '#f7c9a3', '#9bb4ff', '#a8e6cf', '#f28c8c'];

  return (
    <div className="space-y-4">
      {isEnabled('vitals') &&
      <div className="space-y-3">
          {/* Desktop: grid layout */}
          <div className="hidden md:grid md:grid-cols-4 gap-3">
            {isEnabled('health_score') &&
          <div className="rounded-[14px] p-3 flex flex-col items-center justify-center"
          style={{ background: 'var(--hf-panel)', border: '1px solid var(--hf-border)', minHeight: 110 }}>
                <HealthRing score={healthScore} size={80} />
              </div>
            }
            <div className="rounded-[14px] p-3 flex flex-col cursor-pointer active:scale-[0.97] transition-transform"
          style={{ background: P.lemon.bg, minHeight: 110 }} onClick={onLogVital}>
              <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: P.lemon.text, opacity: 0.55 }}>Blood Pressure</span>
              <span className="text-3xl font-black mt-1 leading-none" style={{ color: P.lemon.text }}>
                {bp ? `${bp.systolic}/${bp.diastolic}` : '—'}
              </span>
              <span className="text-[10px] mt-auto" style={{ color: P.lemon.text, opacity: 0.5 }}>
                {bp && bp.measured_at && !isNaN(new Date(bp.measured_at).getTime()) ? format(new Date(bp.measured_at), 'MMM d') : 'Tap to log'}
              </span>
            </div>
            <VitalCard label="Heart Rate" value={hr?.value} unit="bpm" color={P.lavender.bg} textColor={P.lavender.text}
          spark={hrData.slice(-6).map((d) => ({ v: d.hr }))} onClick={onLogVital} />
            <VitalCard label="Weight" value={wt?.value} unit={wt?.unit || 'kg'} color={P.peach.bg} textColor={P.peach.text} onClick={onLogVital} />
          </div>
          <div className="hidden md:grid grid-cols-2 gap-3">
            <VitalCard label="SpO2" value={o2?.value} unit="%" color={P.mint.bg} textColor={P.mint.text} onClick={onLogVital} />
            <VitalCard label="Glucose" value={gl?.value} unit={gl?.unit || 'mg/dL'} color={P.rose.bg} textColor={P.rose.text} onClick={onLogVital} />
          </div>
        </div>
      }

      {(isEnabled('bp_chart') || isEnabled('hr_chart')) &&
      <div className="grid md:grid-cols-2 gap-3">
          {isEnabled('bp_chart') && <TrendCard title="Blood Pressure Trend" data={bpData} dataKey="systolic" color="#d7f576" unit="mmHg" />}
          {isEnabled('hr_chart') && <TrendCard title="Heart Rate Trend" data={hrData} dataKey="hr" color="#c9bbff" unit="bpm" />}
        </div>
      }

      <div className="grid md:grid-cols-2 gap-3">
        {isEnabled('med_timeline') &&
        <div className="rounded-[14px] p-4" style={{ background: 'var(--hf-panel)', border: '1px solid var(--hf-border)' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Pill size={14} style={{ color: 'var(--hf-peach-strong)' }} />
                <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'var(--hf-text-muted)' }}>Today's Schedule</p>
              </div>
              <span className="text-xs font-bold" style={{ color: 'var(--hf-text-muted)' }}>
                {upcomingMeds.filter((m) => m.is_active).length}/{upcomingMeds.length}
              </span>
            </div>
            {upcomingMeds.length > 0 ? upcomingMeds.slice(0, 4).map((m) =>
          <div key={m.id} className="flex items-center gap-3 py-2 border-b last:border-0" style={{ borderColor: 'var(--hf-border)' }}>
                <div className="w-5 h-5 rounded-full border-2 flex-shrink-0" style={{ borderColor: 'var(--hf-border-strong)' }} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold truncate" style={{ color: 'var(--hf-text)' }}>{m.medication_name}</p>
                  <p className="text-[10px]" style={{ color: 'var(--hf-text-muted)' }}>{m.times?.[0] || '—'} · {m.dosage}</p>
                </div>
              </div>
          ) : <p className="text-xs" style={{ color: 'var(--hf-text-muted)' }}>No active medications</p>}
          </div>
        }
        {isEnabled('med_adherence') &&
        <WellnessScoreWidget vitalsCount={vitals.length} medsCount={upcomingMeds.length} labAlertsCount={labAlerts.length} healthScore={healthScore} />
        }
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        {isEnabled('medications') && <MedAdherenceWidget profileId={profileId} medications={upcomingMeds} />}
        {isEnabled('doc_breakdown') &&
        <div className="rounded-[14px] p-4" style={{ background: 'var(--hf-panel)', border: '1px solid var(--hf-border)' }}>
            <p className="text-[9px] font-black uppercase tracking-widest mb-0.5" style={{ color: 'var(--hf-text-muted)' }}>Documents</p>
            <p className="text-sm font-extrabold mb-3" style={{ color: 'var(--hf-text)' }}>By Type</p>
            {docTypes.length > 0 ?
          <div className="flex items-center gap-4">
                <div style={{ width: 90, height: 90, flexShrink: 0 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={docTypes} dataKey="value" cx="50%" cy="50%" innerRadius={25} outerRadius={40} paddingAngle={3}>
                        {docTypes.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-1.5">
                  {docTypes.slice(0, 4).map((d, i) =>
              <div key={d.name} className="flex items-center gap-2 text-[10px]">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="capitalize truncate flex-1" style={{ color: 'var(--hf-text)' }}>{d.name}</span>
                      <span className="font-bold" style={{ color: 'var(--hf-text-muted)' }}>{d.value}</span>
                    </div>
              )}
                </div>
              </div> :
          <p className="text-xs" style={{ color: 'var(--hf-text-muted)' }}>No documents yet</p>}
          </div>
        }
      </div>

      {isEnabled('lab_alerts') && labAlerts.length > 0 &&
      <div className="rounded-[14px] p-4" style={{ background: 'var(--hf-panel)', border: '1px solid var(--hf-border)' }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'var(--hf-text-muted)' }}>⚠ Lab Alerts</p>
            <Link to={createPageUrl('LabResults')} className="text-[10px] font-bold" style={{ color: 'var(--hf-lemon-strong)' }}>View all →</Link>
          </div>
          <div className="space-y-2">
            {labAlerts.slice(0, 3).map((r) =>
          <div key={r.id} className="flex items-center gap-3 py-1.5 border-b last:border-0" style={{ borderColor: 'var(--hf-border)' }}>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold truncate" style={{ color: 'var(--hf-text)' }}>{r.test_name}</p>
                  <p className="text-[10px]" style={{ color: 'var(--hf-text-muted)' }}>{r.value} {r.unit}</p>
                </div>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: r.flag === 'high' ? 'rgba(242,140,140,0.15)' : 'rgba(247,201,163,0.2)', color: r.flag === 'high' ? '#f28c8c' : '#f7c9a3' }}>
                  {r.flag?.toUpperCase()}
                </span>
              </div>
          )}
          </div>
        </div>
      }

      <NutritionWidget mealLogs={mealLogs} goalCalories={nutritionGoal.daily_calories} />

      {isEnabled('ai_predictions') && insights.length > 0 &&
      <div className="rounded-[14px] p-4" style={{ background: 'linear-gradient(135deg, rgba(201,187,255,0.15), rgba(215,245,118,0.08))', border: '1px solid var(--hf-border)' }}>
          <div className="flex items-center gap-2 mb-2">
            <Brain size={14} style={{ color: 'var(--hf-lavender-strong)' }} />
            <span className="text-xs font-bold" style={{ color: 'var(--hf-text)' }}>Flux Health Insight</span>
          </div>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--hf-text-muted)' }}>{insights[0]?.description || insights[0]?.title}</p>
        </div>
      }
    </div>);
}

// ── Vitals Tab ──
function VitalsTab({ vitals, onLogVital }) {
  const types = [
  { type: 'blood_pressure', label: 'Blood Pressure', color: 'var(--hf-lemon-strong)', unit: 'mmHg' },
  { type: 'heart_rate', label: 'Heart Rate', color: 'var(--hf-lavender-strong)', unit: 'bpm' },
  { type: 'oxygen_saturation', label: 'SpO2', color: 'var(--hf-mint-strong)', unit: '%' },
  { type: 'blood_glucose', label: 'Glucose', color: 'var(--hf-coral-strong)', unit: 'mg/dL' }];

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-3">
        {types.map(({ type, label, color, unit }) => {
          const data = vitals.filter((v) => v.vital_type === type && v.measured_at).slice(0, 14).reverse().
          map((v) => { const d = new Date(v.measured_at); return isNaN(d.getTime()) ? null : { date: format(d, 'MM/dd'), v: type === 'blood_pressure' ? v.systolic : v.value }; }).filter(Boolean);
          return <TrendCard key={type} title={label + ' Trend'} data={data} dataKey="v" color={color} unit={unit} />;
        })}
      </div>
      <button onClick={onLogVital}
      className="w-full py-3 rounded-[14px] font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
      style={{ background: P.lemon.bg, color: P.lemon.text }}>
        <Plus size={16} /> Log New Vital
      </button>
    </div>);
}

// ── Wellness Tab ──
function WellnessTab({ profileId }) {
  const { data: goals = [] } = useQuery({
    queryKey: ['goals-dash', profileId],
    queryFn: async () => { try { return await base44.entities.WellnessGoal.filter({ profile_id: profileId, is_active: true }, '-created_date', 8) || []; } catch { return []; } },
    enabled: !!profileId, retry: 1, staleTime: 30000
  });
  const { data: gamification = [] } = useQuery({
    queryKey: ['gamification-dash', profileId],
    queryFn: async () => { try { return await base44.entities.GamificationProfile.list('-created_date', 1) || []; } catch { return []; } },
    enabled: !!profileId, retry: 1, staleTime: 30000
  });
  const gp = gamification[0];
  const catColors = { steps: '#d7f576', water: '#9bb4ff', sleep: '#c9bbff', weight: '#f7c9a3', exercise: '#a8e6cf', medication: '#f28c8c', custom: '#e8d5ff' };
  return (
    <div className="space-y-4">
      {gp &&
      <div className="rounded-[14px] p-4 grid grid-cols-3 gap-3" style={{ background: 'var(--hf-panel)', border: '1px solid var(--hf-border)' }}>
          {[
        { label: 'Points', value: gp.total_points || 0, color: 'var(--hf-lemon-strong)' },
        { label: 'Streak', value: (gp.current_streak || 0) + 'd', color: 'var(--hf-mint-strong)' },
        { label: 'Badges', value: gp.badges?.length || 0, color: 'var(--hf-peach-strong)' }].
        map(({ label, value, color }) =>
        <div key={label} className="rounded-[14px] p-3 text-center" style={{ background: color + '22' }}>
              <span className="text-xl font-black block" style={{ color }}>{value}</span>
              <span className="text-[9px] font-bold uppercase tracking-wide" style={{ color: 'var(--hf-text-muted)' }}>{label}</span>
            </div>
        )}
        </div>
      }
      {goals.length > 0 ?
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {goals.slice(0, 6).map((g) => {
          const pct = Math.min(100, Math.round((g.current_value || 0) / (g.target_value || 1) * 100));
          const color = catColors[g.category] || '#d7f576';
          return (
            <div key={g.id} className="rounded-[14px] p-3" style={{ background: 'var(--hf-panel)', border: '1px solid var(--hf-border)' }}>
                <p className="text-xs font-bold truncate mb-2" style={{ color: 'var(--hf-text)' }}>{g.title}</p>
                <div className="w-full h-1.5 rounded-full mb-1" style={{ background: 'var(--hf-surface-2)' }}>
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                </div>
                <p className="text-[9px] flex justify-between">
                  <span style={{ color: 'var(--hf-text-muted)' }}>{g.current_value}/{g.target_value} {g.unit}</span>
                  <span style={{ color }}>{pct}%</span>
                </p>
              </div>);
        })}
        </div> :
      <div className="rounded-[14px] p-6 text-center" style={{ background: 'var(--hf-surface)', border: '1px dashed var(--hf-border)' }}>
          <p className="text-sm" style={{ color: 'var(--hf-text-muted)' }}>No active goals</p>
          <Link to={createPageUrl('WellnessGoals')} className="text-xs font-bold mt-1 block" style={{ color: 'var(--hf-lemon-strong)' }}>+ Add a goal</Link>
        </div>
      }
    </div>);
}

// ── Meds Tab ──
function MedsTab({ medications, profileId }) {
  return (
    <div className="space-y-4">
      <MedAdherenceWidget profileId={profileId} medications={medications} />
      <div className="space-y-2">
        {medications.slice(0, 6).map((m, i) => {
          const colors = [P.peach, P.lavender, P.mint, P.sky, P.lemon, P.rose];
          const c = colors[i % colors.length];
          return (
            <div key={m.id} className="flex items-center gap-3 p-3 rounded-[14px]" style={{ background: 'var(--hf-panel)', border: '1px solid var(--hf-border)' }}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: c.bg }}>
                <Pill size={14} style={{ color: c.text }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate" style={{ color: 'var(--hf-text)' }}>{m.medication_name}</p>
                <p className="text-[10px]" style={{ color: 'var(--hf-text-muted)' }}>{m.dosage} · {m.frequency?.replace(/_/g, ' ')}</p>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(215,245,118,0.15)', color: 'var(--hf-lemon-strong)' }}>Active</span>
            </div>);
        })}
        {medications.length === 0 && <p className="text-xs p-4 text-center" style={{ color: 'var(--hf-text-muted)' }}>No active medications</p>}
      </div>
    </div>);
}

// ══════════════════════════════════════
// ── Main Dashboard Component ──
// ══════════════════════════════════════
const TABS = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'vitals', label: 'Vitals', icon: Activity },
  { id: 'wellness', label: 'Wellness', icon: Leaf },
  { id: 'meds', label: 'Meds', icon: Pill },
];

const DASHBOARD_TAB_KEY = 'dashboard_active_tab';

export default function Dashboard() {
  const navigate = useNavigate();
  const { activeProfileId, setActiveProfileId, activeProfile, allProfiles, user, loading: profileLoading } = useActiveProfile();
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem(DASHBOARD_TAB_KEY) || 'overview');
  const [vitalDialogOpen, setVitalDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [medDialogOpen, setMedDialogOpen] = useState(false);
  const [labDialogOpen, setLabDialogOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [mobileVitalOpen, setMobileVitalOpen] = useState(false);
  const [mobileMedOpen, setMobileMedOpen] = useState(false);
  const [mobileLabOpen, setMobileLabOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [scanFile, setScanFile] = useState(null);
  const [multiSnapOpen, setMultiSnapOpen] = useState(false);
  const [docScannerOpen, setDocScannerOpen] = useState(false);
  const [chatPrefill, setChatPrefill] = useState('');
  const [widgets, setWidgets] = useState(() => loadWidgets());
  const { openSheet, closeSheet } = useBottomSheet();
  const queryClient = useQueryClient();
  const { registerHandler: registerFABHandler } = useFABDispatch();

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const fabHandlerRef = useRef(null);
  fabHandlerRef.current = (key, extra) => {
    if (key === 'upload') { setUploadDialogOpen(true); }
    if (key === 'scan') { setDocScannerOpen(true); }
    if (key === 'multisnap') { setMultiSnapOpen(true); }
    if (key === 'vital') { isMobile ? setMobileVitalOpen(true) : setVitalDialogOpen(true); }
    if (key === 'med') {
      if (isMobile) { setMobileMedOpen(true); openSheet(); } else setMedDialogOpen(true);
    }
    if (key === 'lab') {
      if (isMobile) { setMobileLabOpen(true); openSheet(); } else setLabDialogOpen(true);
    }
    if (key === 'chat') {
      setChatPrefill(extra?.prefill || '');
      if (isMobile) { setMobileChatOpen(true); openSheet(); } else setChatOpen(true);
    }
  };
  useEffect(() => registerFABHandler((k, e) => fabHandlerRef.current(k, e)), [registerFABHandler]);

  useEffect(() => {
    localStorage.setItem(DASHBOARD_TAB_KEY, activeTab);
  }, [activeTab]);

  // Removed: redirect-to-onboarding logic was causing infinite loop because
  // ActiveProfileContext now auto-creates a self profile for new users.
  // No redirect needed — dashboard handles empty state gracefully.

  const QUERY_OPTS = { retry: 1, staleTime: 30000 };

  const safeQuery = (fn) => async () => {
    try { return await fn() || []; } catch (e) { console.warn('Dashboard query failed:', e.message); return []; }
  };

  const { data: upcomingMeds = [] } = useQuery({
    queryKey: ['medications', activeProfileId],
    queryFn: safeQuery(() => base44.entities.Medication.filter({ profile_id: activeProfileId, is_active: true }, '-created_date', 10)),
    enabled: !!activeProfileId, ...QUERY_OPTS
  });
  const { data: documents = [] } = useQuery({
    queryKey: ['documents', activeProfileId],
    queryFn: safeQuery(() => base44.entities.MedicalDocument.filter({ profile_id: activeProfileId }, '-created_date', 5)),
    enabled: !!activeProfileId, ...QUERY_OPTS
  });
  const { data: vitals = [] } = useQuery({
    queryKey: ['vitals', activeProfileId],
    queryFn: safeQuery(() => base44.entities.VitalMeasurement.filter({ profile_id: activeProfileId }, '-measured_at', 30)),
    enabled: !!activeProfileId, ...QUERY_OPTS
  });
  const { data: labResults = [] } = useQuery({
    queryKey: ['labResults', activeProfileId],
    queryFn: safeQuery(() => base44.entities.LabResult.filter({ profile_id: activeProfileId }, '-test_date', 20)),
    enabled: !!activeProfileId, ...QUERY_OPTS
  });
  const { data: insights = [] } = useQuery({
    queryKey: ['insights', activeProfileId],
    queryFn: safeQuery(() => base44.entities.HealthInsight.filter({ profile_id: activeProfileId }, '-created_date', 5)),
    enabled: !!activeProfileId, ...QUERY_OPTS
  });
  const { data: mealLogs = [] } = useQuery({
    queryKey: ['meal-logs', activeProfileId],
    queryFn: safeQuery(() => base44.entities.MealLog.filter({ profile_id: activeProfileId }, '-logged_date', 50)),
    enabled: !!activeProfileId, ...QUERY_OPTS
  });
  const { data: dailyTargets = null } = useQuery({
    queryKey: ['daily-health-goals', activeProfileId],
    queryFn: () => getDailyHealthGoals(activeProfileId),
    enabled: !!activeProfileId, retry: 1, staleTime: 60000
  });
  const nutritionGoal = { daily_calories: dailyTargets?.calories || 0 };

  const bpData = useMemo(() =>
  vitals.filter((v) => v.vital_type === 'blood_pressure' && v.measured_at).slice(0, 10).reverse().
  map((v) => { const d = new Date(v.measured_at); return isNaN(d.getTime()) ? null : { date: format(d, 'MM/dd'), systolic: v.systolic, diastolic: v.diastolic }; }).filter(Boolean),
  [vitals]);
  const hrData = useMemo(() =>
  vitals.filter((v) => v.vital_type === 'heart_rate' && v.measured_at).slice(0, 10).reverse().
  map((v) => { const d = new Date(v.measured_at); return isNaN(d.getTime()) ? null : { date: format(d, 'MM/dd'), hr: v.value }; }).filter(Boolean),
  [vitals]);
  const labAlerts = useMemo(() => labResults.filter((r) => r.flag && r.flag !== 'normal'), [labResults]);
  const docTypes = useMemo(() => {
    const counts = {};
    documents.forEach((d) => { const t = d.document_type || 'other'; counts[t] = (counts[t] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name: name.replace(/_/g, ' '), value }));
  }, [documents]);
  const healthScore = useMemo(() => {
    let s = 70;
    if (vitals.length > 3) s += 5;
    if (documents.length > 2) s += 5;
    if (upcomingMeds.length > 0) s += 5;
    if (labAlerts.length > 0) s -= labAlerts.length * 3;
    return Math.max(0, Math.min(100, s));
  }, [vitals, documents, upcomingMeds, labAlerts]);

  const currentProfile = useMemo(() =>
  allProfiles.find((p) => p.id === activeProfileId) || allProfiles[0],
  [allProfiles, activeProfileId]);

  const handleRefresh = async () => {
    Haptics.medium();
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['medications', activeProfileId] }),
      queryClient.invalidateQueries({ queryKey: ['documents', activeProfileId] }),
      queryClient.invalidateQueries({ queryKey: ['vitals', activeProfileId] }),
      queryClient.invalidateQueries({ queryKey: ['labResults', activeProfileId] }),
      queryClient.invalidateQueries({ queryKey: ['insights', activeProfileId] }),
    ]);
  };

  const handleLogVital = () => isMobile ? setMobileVitalOpen(true) : setVitalDialogOpen(true);
  const handleOpenSheet = (setter) => { setter(true); openSheet(); };
  const handleCloseSheet = (setter) => { setter(false); closeSheet(); };

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: 'var(--hf-bg)' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-[#d7f576] border-t-transparent animate-spin" />
          <p className="text-xs font-bold" style={{ color: 'var(--hf-text-muted)' }}>Loading your health data…</p>
        </div>
      </div>
    );
  }

  // If no profile exists after loading completes, show an actionable empty state
  if (!profileLoading && !activeProfile && allProfiles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-6 text-center" style={{ background: 'var(--hf-bg)' }}>
        <div className="w-16 h-16 rounded-[20px] flex items-center justify-center" style={{ background: '#d7f576' }}>
          <Activity size={28} style={{ color: '#0a1200' }} />
        </div>
        <div>
          <p className="text-lg font-black" style={{ color: 'var(--hf-text)' }}>Welcome to HealthFlux</p>
          <p className="text-sm mt-1" style={{ color: 'var(--hf-text-muted)' }}>Let's set up your health profile to get started.</p>
        </div>
        <button
          onClick={() => navigate(createPageUrl('Onboarding'))}
          className="px-6 py-3 rounded-2xl font-bold text-sm"
          style={{ background: '#d7f576', color: '#0a1200' }}
        >
          Set Up Profile →
        </button>
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="w-full px-3 py-3 md:px-8 md:py-5 pb-28 md:pb-16" style={{ background: 'var(--hf-bg)', minHeight: '100dvh' }}>



        {/* ── Dashboard Tabs — click only, no swipe ── */}
        <div className="flex gap-1.5 mb-4 p-1 rounded-[14px]" style={{ background: 'var(--hf-panel)', border: '1px solid var(--hf-border)' }} role="tablist" aria-label="Dashboard sections">
          {TABS.map(({ id, label }) => {
            const tabColors = { overview: { bg: '#d7f576', tc: '#0a1200' }, vitals: { bg: '#c9bbff', tc: '#1a0a40' }, wellness: { bg: '#a8e6cf', tc: '#003d20' }, meds: { bg: '#f7c9a3', tc: '#3d1a00' } };
            const tc = tabColors[id];
            return (
              <button
                key={id}
                role="tab"
                aria-selected={activeTab === id}
                onClick={() => { Haptics.light(); setActiveTab(id); }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-[10px] text-[10px] font-bold transition-all active:scale-[0.97]"
                style={{ background: activeTab === id ? tc.bg : 'transparent', color: activeTab === id ? tc.tc : 'var(--hf-text-muted)' }}
              >
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        {/* ── Tab Content — fade animation only, no swipe ── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            role="tabpanel"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            {activeTab === 'overview' &&
              <OverviewTab
                vitals={vitals} documents={documents} upcomingMeds={upcomingMeds}
                labAlerts={labAlerts} insights={insights} healthScore={healthScore}
                bpData={bpData} hrData={hrData} docTypes={docTypes} profileId={activeProfileId}
                widgets={widgets} mealLogs={mealLogs} nutritionGoal={nutritionGoal}
                onLogVital={handleLogVital}
                onChat={() => isMobile ? handleOpenSheet(setMobileChatOpen) : setChatOpen(true)}
              />
            }
            {activeTab === 'vitals' && <VitalsTab vitals={vitals} onLogVital={handleLogVital} />}
            {activeTab === 'wellness' && <WellnessTab profileId={activeProfileId} />}
            {activeTab === 'meds' && <MedsTab medications={upcomingMeds} profileId={activeProfileId} />}
          </motion.div>
        </AnimatePresence>

        {/* ══ DOC SCANNER ══ */}
        {docScannerOpen && (
          <DocScanner
            profileId={activeProfileId}
            onClose={() => setDocScannerOpen(false)}
            onSaved={() => {
              queryClient.invalidateQueries({ queryKey: ['documents', activeProfileId] });
              setDocScannerOpen(false);
            }}
          />
        )}

        {/* ══ MULTI-SNAP CAMERA ══ */}
        {multiSnapOpen && (
          <div className="fixed inset-0 z-[150] flex flex-col" style={{ background: 'var(--hf-bg)' }}>
            <div className="flex items-center justify-between px-4 flex-shrink-0"
              style={{ background: 'var(--hf-surface)', borderBottom: '1px solid var(--hf-border)', paddingTop: 'calc(12px + env(safe-area-inset-top,0px))', paddingBottom: '12px' }}>
              <div>
                <p className="text-sm font-black" style={{ color: 'var(--hf-text)' }}>📸 Multi-Snap</p>
                <p className="text-[10px]" style={{ color: 'var(--hf-text-muted)' }}>Food · Skin · Document — Flux auto-detects</p>
              </div>
              <button onClick={() => setMultiSnapOpen(false)}
                className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)' }}
                aria-label="Close Multi-Snap">
                <X size={15} style={{ color: 'var(--hf-text-muted)' }} />
              </button>
            </div>
            <div className="flex-1 overflow-auto">
              <MultiSnapCamera
                profileId={activeProfileId}
                onResult={() => queryClient.invalidateQueries({ queryKey: ['documents', activeProfileId] })}
                onClose={() => setMultiSnapOpen(false)}
              />
            </div>
          </div>
        )}

        {/* ══ UPLOAD ══ */}
        <UniversalUpload open={uploadDialogOpen} onClose={() => { setUploadDialogOpen(false); setScanFile(null); }}
          profileId={activeProfileId} profiles={allProfiles}
          onSuccess={() => { setScanFile(null); queryClient.invalidateQueries({ queryKey: ['documents', activeProfileId] }); }}
          isMobile={isMobile} initialFile={scanFile} />

        {/* ══ VITALS — mobile bottom sheet ══ */}
        <Drawer.Root open={mobileVitalOpen} onOpenChange={(v) => v ? setMobileVitalOpen(true) : handleCloseSheet(setMobileVitalOpen)} shouldScaleBackground>
          <Drawer.Portal>
            <Drawer.Overlay className="fixed inset-0 bg-black/60 z-[80]" style={{ backdropFilter: 'blur(4px)' }} />
            <Drawer.Content className="fixed bottom-0 left-0 right-0 z-[90] rounded-t-[28px] overflow-hidden flex flex-col"
              style={{ backgroundColor: 'var(--hf-surface)', maxHeight: '92dvh', border: '1px solid var(--hf-border)', borderBottom: 'none' }}>
              <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
                <div className="w-10 h-1.5 rounded-full" style={{ background: 'var(--hf-border-strong)' }} />
              </div>
              <div className="flex items-center justify-between px-5 py-3 flex-shrink-0 border-b" style={{ borderColor: 'var(--hf-border)' }}>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-[10px] flex items-center justify-center" style={{ background: '#c9bbff' }}>
                    <Activity size={15} style={{ color: '#1a0a40' }} />
                  </div>
                  <div>
                    <h2 className="text-sm font-black" style={{ color: 'var(--hf-text)' }}>💓 Log Vital Sign</h2>
                    <p className="text-[10px]" style={{ color: 'var(--hf-text-muted)' }}>Track your health metrics</p>
                  </div>
                </div>
                <button onClick={() => handleCloseSheet(setMobileVitalOpen)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'var(--hf-surface-2)' }} aria-label="Close">
                  <X size={14} style={{ color: 'var(--hf-text-muted)' }} />
                </button>
              </div>
              <div className="overflow-y-auto flex-1 px-5 py-4 pb-10">
                <VitalEntryForm profileId={activeProfileId}
                  onSuccess={() => { handleCloseSheet(setMobileVitalOpen); queryClient.invalidateQueries({ queryKey: ['vitals', activeProfileId] }); }}
                  onCancel={() => handleCloseSheet(setMobileVitalOpen)} />
              </div>
            </Drawer.Content>
          </Drawer.Portal>
        </Drawer.Root>

        {/* ══ VITALS — desktop dialog ══ */}
        <Dialog open={vitalDialogOpen} onOpenChange={setVitalDialogOpen}>
          <DialogContent className="w-[95vw] max-w-md rounded-[28px] p-0 overflow-hidden" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)', color: 'var(--hf-text)' }}>
            <DialogHeader className="p-5 pb-4 border-b" style={{ borderColor: 'var(--hf-border)' }}>
              <DialogTitle className="flex items-center gap-2" style={{ color: 'var(--hf-text)' }}>
                <div className="w-8 h-8 rounded-[10px] flex items-center justify-center" style={{ background: '#c9bbff' }}>
                  <Activity size={15} style={{ color: '#1a0a40' }} />
                </div>
                💓 Log Vital Sign
              </DialogTitle>
            </DialogHeader>
            <div className="p-5">
              <VitalEntryForm profileId={activeProfileId}
                onSuccess={() => { setVitalDialogOpen(false); queryClient.invalidateQueries({ queryKey: ['vitals', activeProfileId] }); }}
                onCancel={() => setVitalDialogOpen(false)} />
            </div>
          </DialogContent>
        </Dialog>

        {/* ══ MEDICATION — mobile bottom sheet ══ */}
        <Drawer.Root open={mobileMedOpen} onOpenChange={(v) => v ? setMobileMedOpen(true) : handleCloseSheet(setMobileMedOpen)} shouldScaleBackground>
          <Drawer.Portal>
            <Drawer.Overlay className="fixed inset-0 bg-black/60 z-[80]" style={{ backdropFilter: 'blur(4px)' }} />
            <Drawer.Content className="fixed bottom-0 left-0 right-0 z-[90] rounded-t-[28px] overflow-hidden flex flex-col"
              style={{ backgroundColor: 'var(--hf-surface)', maxHeight: '92dvh', border: '1px solid var(--hf-border)', borderBottom: 'none' }}>
              <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
                <div className="w-10 h-1.5 rounded-full" style={{ background: 'var(--hf-border-strong)' }} />
              </div>
              <div className="flex items-center justify-between px-5 py-3 flex-shrink-0 border-b" style={{ borderColor: 'var(--hf-border)' }}>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-[10px] flex items-center justify-center" style={{ background: '#f7c9a3' }}>
                    <Pill size={15} style={{ color: '#3d1a00' }} />
                  </div>
                  <div>
                    <h2 className="text-sm font-black" style={{ color: 'var(--hf-text)' }}>💊 Add Medication</h2>
                    <p className="text-[10px]" style={{ color: 'var(--hf-text-muted)' }}>Track a new medicine</p>
                  </div>
                </div>
                <button onClick={() => handleCloseSheet(setMobileMedOpen)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'var(--hf-surface-2)' }} aria-label="Close">
                  <X size={14} style={{ color: 'var(--hf-text-muted)' }} />
                </button>
              </div>
              <div className="overflow-y-auto flex-1 px-5 py-4 pb-10">
                <AddMedicationForm profileId={activeProfileId}
                  onSuccess={() => { handleCloseSheet(setMobileMedOpen); queryClient.invalidateQueries({ queryKey: ['medications', activeProfileId] }); }}
                  onCancel={() => handleCloseSheet(setMobileMedOpen)} />
              </div>
            </Drawer.Content>
          </Drawer.Portal>
        </Drawer.Root>

        {/* ══ MEDICATION — desktop dialog ══ */}
        <Dialog open={medDialogOpen} onOpenChange={setMedDialogOpen}>
          <DialogContent className="w-[95vw] max-w-lg rounded-[28px] p-0 overflow-hidden" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)', color: 'var(--hf-text)' }}>
            <DialogHeader className="p-5 pb-4 border-b" style={{ borderColor: 'var(--hf-border)' }}>
              <DialogTitle className="flex items-center gap-2" style={{ color: 'var(--hf-text)' }}>
                <div className="w-8 h-8 rounded-[10px] flex items-center justify-center" style={{ background: '#f7c9a3' }}>
                  <Pill size={15} style={{ color: '#3d1a00' }} />
                </div>
                💊 Add Medication
              </DialogTitle>
            </DialogHeader>
            <div className="p-5 overflow-y-auto max-h-[80vh]">
              <AddMedicationForm profileId={activeProfileId}
                onSuccess={() => { setMedDialogOpen(false); queryClient.invalidateQueries({ queryKey: ['medications', activeProfileId] }); }}
                onCancel={() => setMedDialogOpen(false)} />
            </div>
          </DialogContent>
        </Dialog>

        {/* ══ LAB RESULT — mobile bottom sheet ══ */}
        <Drawer.Root open={mobileLabOpen} onOpenChange={(v) => v ? setMobileLabOpen(true) : handleCloseSheet(setMobileLabOpen)} shouldScaleBackground>
          <Drawer.Portal>
            <Drawer.Overlay className="fixed inset-0 bg-black/60 z-[80]" style={{ backdropFilter: 'blur(4px)' }} />
            <Drawer.Content className="fixed bottom-0 left-0 right-0 z-[90] rounded-t-[28px] overflow-hidden flex flex-col"
              style={{ backgroundColor: 'var(--hf-surface)', maxHeight: '92dvh', border: '1px solid var(--hf-border)', borderBottom: 'none' }}>
              <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
                <div className="w-10 h-1.5 rounded-full" style={{ background: 'var(--hf-border-strong)' }} />
              </div>
              <div className="flex items-center justify-between px-5 py-3 flex-shrink-0 border-b" style={{ borderColor: 'var(--hf-border)' }}>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-[10px] flex items-center justify-center" style={{ background: '#a8e6cf' }}>
                    <TestTube size={15} style={{ color: '#003d20' }} />
                  </div>
                  <div>
                    <h2 className="text-sm font-black" style={{ color: 'var(--hf-text)' }}>🧪 Add Lab Result</h2>
                    <p className="text-[10px]" style={{ color: 'var(--hf-text-muted)' }}>Blood test, urine, lipids…</p>
                  </div>
                </div>
                <button onClick={() => handleCloseSheet(setMobileLabOpen)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'var(--hf-surface-2)' }} aria-label="Close">
                  <X size={14} style={{ color: 'var(--hf-text-muted)' }} />
                </button>
              </div>
              <div className="overflow-y-auto flex-1 px-5 py-4 pb-10">
                <AddLabResultForm profileId={activeProfileId}
                  onSuccess={() => { handleCloseSheet(setMobileLabOpen); queryClient.invalidateQueries({ queryKey: ['labResults', activeProfileId] }); }}
                  onCancel={() => handleCloseSheet(setMobileLabOpen)} />
              </div>
            </Drawer.Content>
          </Drawer.Portal>
        </Drawer.Root>

        {/* ══ LAB RESULT — desktop dialog ══ */}
        <Dialog open={labDialogOpen} onOpenChange={setLabDialogOpen}>
          <DialogContent className="w-[95vw] max-w-lg rounded-[28px] p-0 overflow-hidden" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)', color: 'var(--hf-text)' }}>
            <DialogHeader className="p-5 pb-4 border-b" style={{ borderColor: 'var(--hf-border)' }}>
              <DialogTitle className="flex items-center gap-2" style={{ color: 'var(--hf-text)' }}>
                <div className="w-8 h-8 rounded-[10px] flex items-center justify-center" style={{ background: '#a8e6cf' }}>
                  <TestTube size={15} style={{ color: '#003d20' }} />
                </div>
                🧪 Add Lab Result
              </DialogTitle>
            </DialogHeader>
            <div className="p-5 overflow-y-auto max-h-[80vh]">
              <AddLabResultForm profileId={activeProfileId}
                onSuccess={() => { setLabDialogOpen(false); queryClient.invalidateQueries({ queryKey: ['labResults', activeProfileId] }); }}
                onCancel={() => setLabDialogOpen(false)} />
            </div>
          </DialogContent>
        </Dialog>

        {/* ══ FLUX CHAT — mobile bottom sheet ══ */}
        <Drawer.Root open={mobileChatOpen} onOpenChange={(v) => v ? setMobileChatOpen(true) : handleCloseSheet(setMobileChatOpen)} shouldScaleBackground>
          <Drawer.Portal>
            <Drawer.Overlay className="fixed inset-0 bg-black/60 z-[80]" style={{ backdropFilter: 'blur(4px)' }} />
            <Drawer.Content className="fixed bottom-0 left-0 right-0 z-[90] rounded-t-[28px] flex flex-col"
              style={{ backgroundColor: 'var(--hf-surface)', height: '90dvh', border: '1px solid var(--hf-border)', borderBottom: 'none' }}>
              <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
                <div className="w-10 h-1.5 rounded-full" style={{ background: 'var(--hf-border-strong)' }} />
              </div>
              <div className="flex items-center justify-between px-5 py-3 flex-shrink-0 border-b" style={{ borderColor: 'var(--hf-border)' }}>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-[10px] flex items-center justify-center" style={{ background: '#9bb4ff' }}>
                    <Brain size={15} style={{ color: '#0a1240' }} />
                  </div>
                  <div>
                    <h2 className="text-sm font-black" style={{ color: 'var(--hf-text)' }}>🤖 Flux Health Chat</h2>
                    <p className="text-[10px]" style={{ color: 'var(--hf-text-muted)' }}>Ask about your health data</p>
                  </div>
                </div>
                <button onClick={() => handleCloseSheet(setMobileChatOpen)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'var(--hf-surface-2)' }} aria-label="Close">
                  <X size={14} style={{ color: 'var(--hf-text-muted)' }} />
                </button>
              </div>
              <div className="flex-1 overflow-hidden"><AIHealthChat profileId={activeProfileId} initialMessage={chatPrefill} /></div>
            </Drawer.Content>
          </Drawer.Portal>
        </Drawer.Root>

        {/* ══ FLUX CHAT — desktop dialog ══ */}
        <Dialog open={chatOpen} onOpenChange={setChatOpen}>
          <DialogContent className="w-[95vw] max-w-3xl h-[85vh] sm:h-[700px] flex flex-col p-0 overflow-hidden rounded-[28px]"
            style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)', color: 'var(--hf-text)' }}>
            <DialogHeader className="p-5 pb-4 border-b flex-shrink-0" style={{ borderColor: 'var(--hf-border)' }}>
              <DialogTitle className="flex items-center gap-2" style={{ color: 'var(--hf-text)' }}>
                <div className="w-8 h-8 rounded-[10px] flex items-center justify-center" style={{ background: '#9bb4ff' }}>
                  <Brain size={15} style={{ color: '#0a1240' }} />
                </div>
                🤖 Flux Health Assistant
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-hidden"><AIHealthChat profileId={activeProfileId} initialMessage={chatPrefill} /></div>
          </DialogContent>
        </Dialog>

      </div>
    </PullToRefresh>
  );
}
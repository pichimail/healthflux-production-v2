// @ts-nocheck
import React, { useState, useMemo } from 'react';
import Haptics from '@/components/utils/haptics';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import ResponsiveOverlay from '@/components/ui/responsive-overlay';
import { AreaChart, Area, Tooltip, ResponsiveContainer } from 'recharts';
import { Plus, TrendingUp, TrendingDown, Minus, Heart } from 'lucide-react';
import HeartRateMonitor from '@/components/HeartRateMonitor';
import { format, subDays } from 'date-fns';
import { toast } from 'sonner';
import { useActiveProfile } from '../components/ActiveProfileContext';

const VITAL_CONFIG = {
  blood_pressure:    { label: 'Blood Pressure', unit: 'mmHg', color: 'var(--hf-coral-strong)', tc: '#3d0000', icon: '🫀', normalLow: 90, normalHigh: 140 },
  heart_rate:        { label: 'Heart Rate',     unit: 'bpm',  color: 'var(--hf-peach-strong)', tc: '#3d1a00', icon: '💓', normalLow: 60, normalHigh: 100 },
  blood_glucose:     { label: 'Blood Glucose',  unit: 'mg/dL',color: 'var(--hf-lavender-strong)', tc: '#1a0a40', icon: '🩸', normalLow: 70, normalHigh: 140 },
  weight:            { label: 'Weight',          unit: 'kg',   color: 'var(--hf-lemon-strong)', tc: '#0a1200', icon: '⚖️', normalLow: 0, normalHigh: 999 },
  oxygen_saturation: { label: 'SpO₂',           unit: '%',    color: 'var(--hf-mint-strong)', tc: '#003d20', icon: '🫁', normalLow: 95, normalHigh: 100 },
  temperature:       { label: 'Temperature',    unit: '°F',   color: 'var(--hf-sky-strong)', tc: '#0a1240', icon: '🌡️', normalLow: 97, normalHigh: 99 },
  respiratory_rate:  { label: 'Resp. Rate',     unit: '/min', color: 'var(--hf-peach-strong)', tc: '#3d2a00', icon: '💨', normalLow: 12, normalHigh: 20 },
};

function SVGGauge({ value, min, max, color, size = 80 }) {
  const safeMin = Number.isFinite(min) ? min : 0;
  const safeMax = Number.isFinite(max) && max > safeMin ? max : safeMin + 1;
  const safeValue = Number.isFinite(value) ? value : safeMin;
  const pct = Math.min(1, Math.max(0, (safeValue - safeMin) / (safeMax - safeMin)));
  const r = size * 0.38;
  const cx = size / 2, cy = size / 2;
  const startAngle = -210, totalArc = 240;
  const angle = startAngle + pct * totalArc;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const arc = (a, radius = r) => ({ x: cx + radius * Math.cos(toRad(a)), y: cy + radius * Math.sin(toRad(a)) });
  const describeArc = (start, end) => {
    const s = arc(start); const e = arc(end);
    const large = end - start > 180 ? 1 : 0;
    return `M${s.x},${s.y} A${r},${r},0,${large},1,${e.x},${e.y}`;
  };
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <path d={describeArc(-210, 30)} fill="none" stroke="var(--hf-border)" strokeWidth={size * 0.06} strokeLinecap="round" />
      <path d={describeArc(-210, angle)} fill="none" stroke={color} strokeWidth={size * 0.06} strokeLinecap="round" />
    </svg>
  );
}

function VitalCard({ type, vitals, onDelete }) {
  const cfg = VITAL_CONFIG[type] || { color: 'var(--hf-lemon-strong)', tc: '#0a1200', unit: '', label: type, icon: '📊' };
  const typeVitals = vitals.filter(v => v.vital_type === type).sort((a, b) => new Date(a.measured_at) - new Date(b.measured_at));
  if (!typeVitals.length) return null;
  const latest = typeVitals[typeVitals.length - 1];
  const displayVal = type === 'blood_pressure' ? `${latest.systolic}/${latest.diastolic}` : latest.value;
  const chartData = typeVitals.slice(-14).map(v => ({ t: format(new Date(v.measured_at), 'MMM d'), v: type === 'blood_pressure' ? v.systolic : v.value, d: type === 'blood_pressure' ? v.diastolic : null }));
  const trend = chartData.length > 1 ? chartData[chartData.length - 1].v - chartData[0].v : 0;
  const TrendIcon = trend > 2 ? TrendingUp : trend < -2 ? TrendingDown : Minus;
  const numVal = parseFloat(displayVal);
  const hasNormalRange = Number.isFinite(cfg.normalLow) && Number.isFinite(cfg.normalHigh) && cfg.normalHigh > cfg.normalLow;
  const baseValue = Number.isFinite(numVal) ? numVal : 0;
  const gaugeSpread = Math.max(Math.abs(baseValue) * 0.2, 1);
  const gaugeMin = hasNormalRange ? cfg.normalLow * 0.8 : Math.max(0, baseValue - gaugeSpread);
  const gaugeMax = hasNormalRange ? cfg.normalHigh * 1.2 : Math.max(gaugeMin + 1, baseValue + gaugeSpread);
  const isNormal = hasNormalRange ? numVal >= cfg.normalLow && numVal <= cfg.normalHigh : null;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--hf-surface)', border: `1px solid ${cfg.color}33` }}>
      <div className="h-1 w-full" style={{ background: cfg.color }} />
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg" style={{ background: `${cfg.color}22` }}>{cfg.icon}</div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--hf-text-muted)' }}>{cfg.label}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-xl font-black" style={{ color: 'var(--hf-text)' }}>{displayVal}</span>
                <span className="text-xs" style={{ color: 'var(--hf-text-muted)' }}>{cfg.unit}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ background: `${cfg.color}22` }}>
              <TrendIcon size={11} style={{ color: cfg.color }} />
              <span className="text-[9px] font-bold" style={{ color: cfg.color }}>{trend > 0 ? '+' : ''}{trend.toFixed(0)}</span>
            </div>
            {isNormal !== null && (
              <span className="text-[9px] font-black px-2 py-0.5 rounded-full" style={{ background: isNormal ? 'rgba(168,230,207,0.2)' : 'rgba(242,140,140,0.2)', color: isNormal ? '#a8e6cf' : '#f28c8c' }}>
                {isNormal ? '✓ Normal' : '! Check'}
              </span>
            )}
          </div>
        </div>

        {/* Gauge */}
        <div className="flex items-center gap-3 mb-3">
          <div className="relative">
            <SVGGauge value={numVal} min={gaugeMin} max={gaugeMax} color={cfg.color} size={64} />
          </div>
          <div className="flex-1">
            <p className="text-[9px]" style={{ color: 'var(--hf-text-muted)' }}>
              {hasNormalRange ? `Normal: ${cfg.normalLow}–${cfg.normalHigh} ${cfg.unit}` : 'Range unavailable for this vital type'}
            </p>
            <p className="text-[9px] mt-0.5" style={{ color: 'var(--hf-text-muted)' }}>Last: {format(new Date(latest.measured_at), 'MMM d, h:mm a')}</p>
            <p className="text-[9px]" style={{ color: 'var(--hf-text-muted)' }}>{typeVitals.length} readings</p>
          </div>
        </div>

        {/* Sparkline */}
        {chartData.length > 1 && (
          <div style={{ height: 48 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id={`g_${type}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={cfg.color} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={cfg.color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="v" stroke={cfg.color} strokeWidth={2} fill={`url(#g_${type})`} dot={false} />
                {type === 'blood_pressure' && <Area type="monotone" dataKey="d" stroke={`${cfg.color}88`} strokeWidth={1.5} fill="none" dot={false} strokeDasharray="4 2" />}
                <Tooltip contentStyle={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)', borderRadius: 10, fontSize: 10 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Latest log delete */}
        <div className="flex items-center justify-between mt-2 pt-2 border-t" style={{ borderColor: 'var(--hf-border)' }}>
          <span className="text-[9px]" style={{ color: 'var(--hf-text-muted)' }}>Latest reading</span>
          <button onClick={() => { if (confirm('Delete latest entry?')) onDelete(latest.id); }}
            className="text-[9px] px-2 py-0.5 rounded-lg" style={{ background: 'rgba(242,140,140,0.12)', color: 'var(--hf-coral-strong)' }}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Vitals() {
  const { activeProfileId, activeProfile } = useActiveProfile();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [showHRM, setShowHRM] = useState(false);
  const [form, setForm] = useState({ vital_type: 'blood_pressure', systolic: '', diastolic: '', value: '', unit: 'mmHg', measured_at: new Date().toISOString().slice(0, 16), notes: '' });

  const { data: vitals = [], isLoading } = useQuery({
    queryKey: ['vitals', activeProfileId],
    queryFn: () => base44.entities.VitalMeasurement.filter({ profile_id: activeProfileId }, '-measured_at', 200),
    enabled: !!activeProfileId,
  });

  const createMut = useMutation({
    mutationFn: (d) => base44.entities.VitalMeasurement.create(d),
    onMutate: async (newVital) => {
      await qc.cancelQueries(['vitals', activeProfileId]);
      const prev = qc.getQueryData(['vitals', activeProfileId]);
      qc.setQueryData(['vitals', activeProfileId], (old = []) => [
        { ...newVital, id: `optimistic-${Date.now()}` },
        ...old,
      ]);
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) qc.setQueryData(['vitals', activeProfileId], context.prev);
    },
    onSettled: () => { qc.invalidateQueries(['vitals', activeProfileId]); },
    onSuccess: () => { setOpen(false); toast.success('Vital logged!'); resetForm(); },
  });
  const deleteMut = useMutation({
    mutationFn: (id) => base44.entities.VitalMeasurement.delete(id),
    onMutate: async (id) => {
      await qc.cancelQueries(['vitals', activeProfileId]);
      const prev = qc.getQueryData(['vitals', activeProfileId]);
      qc.setQueryData(['vitals', activeProfileId], (old = []) => old.filter(v => v.id !== id));
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) qc.setQueryData(['vitals', activeProfileId], context.prev);
    },
    onSettled: () => { qc.invalidateQueries(['vitals', activeProfileId]); },
    onSuccess: () => { toast.success('Deleted'); },
  });

  const resetForm = () => setForm({ vital_type: 'blood_pressure', systolic: '', diastolic: '', value: '', unit: 'mmHg', measured_at: new Date().toISOString().slice(0, 16), notes: '' });

  const handleTypeChange = (t) => {
    const units = { heart_rate: 'bpm', temperature: '°F', weight: 'kg', blood_glucose: 'mg/dL', oxygen_saturation: '%', respiratory_rate: '/min', blood_pressure: 'mmHg' };
    setForm(f => ({ ...f, vital_type: t, unit: units[t] || '', value: '', systolic: '', diastolic: '' }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const d = { profile_id: activeProfileId, vital_type: form.vital_type, measured_at: form.measured_at, notes: form.notes, source: 'manual' };
    if (form.vital_type === 'blood_pressure') { d.systolic = parseFloat(form.systolic); d.diastolic = parseFloat(form.diastolic); d.unit = 'mmHg'; }
    else { d.value = parseFloat(form.value); d.unit = form.unit; }
    createMut.mutate(d);
  };

  const vitalTypes = useMemo(() => [...new Set(vitals.map(v => v.vital_type))], [vitals]);
  const weeklyCount = vitals.filter(v => new Date(v.measured_at) > subDays(new Date(), 7)).length;
  const abnormal = vitals.filter(v => {
    const cfg = VITAL_CONFIG[v.vital_type];
    if (!cfg || v.vital_type === 'blood_pressure') return false;
    return v.value < cfg.normalLow || v.value > cfg.normalHigh;
  }).length;

  const FormContent = (
    <form onSubmit={handleSubmit} className="space-y-4 mt-2">
      <div>
        <Label className="text-xs font-bold mb-2 block">Vital Type</Label>
        <div className="grid grid-cols-4 gap-1.5">
          {Object.entries(VITAL_CONFIG).map(([k, c]) => (
            <button key={k} type="button" onClick={() => handleTypeChange(k)}
              className="p-2 rounded-xl text-center transition-all"
              style={{ background: form.vital_type === k ? `${c.color}22` : 'var(--hf-surface-2)', border: form.vital_type === k ? `1.5px solid ${c.color}` : '1px solid var(--hf-border)' }}>
              <div className="text-lg">{c.icon}</div>
              <p className="text-[8px] font-bold mt-0.5" style={{ color: form.vital_type === k ? c.color : 'var(--hf-text-muted)' }}>{c.label.split(' ')[0]}</p>
            </button>
          ))}
        </div>
      </div>
      {form.vital_type === 'blood_pressure' ? (
        <div className="grid grid-cols-2 gap-3">
          <div><Label className="text-xs font-bold mb-1 block">Systolic</Label><Input type="number" value={form.systolic} onChange={e => setForm(f => ({ ...f, systolic: e.target.value }))} placeholder="120" className="h-12 rounded-2xl text-center text-xl font-black" required /></div>
          <div><Label className="text-xs font-bold mb-1 block">Diastolic</Label><Input type="number" value={form.diastolic} onChange={e => setForm(f => ({ ...f, diastolic: e.target.value }))} placeholder="80" className="h-12 rounded-2xl text-center text-xl font-black" required /></div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><Label className="text-xs font-bold mb-1 block">Value ({form.unit})</Label><Input type="number" step="0.1" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} placeholder="Enter value" className="h-14 rounded-2xl text-center text-2xl font-black" required autoFocus /></div>
        </div>
      )}
      <div><Label className="text-xs font-bold mb-1 block">Date & Time</Label><Input type="datetime-local" value={form.measured_at} onChange={e => setForm(f => ({ ...f, measured_at: e.target.value }))} className="h-11 rounded-2xl" required /></div>
      <div><Label className="text-xs font-bold mb-1 block">Notes (optional)</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="rounded-2xl" /></div>
      <div className="grid grid-cols-2 gap-3 pt-1">
        <Button type="button" variant="outline" onClick={() => setOpen(false)} className="h-11 rounded-2xl">Cancel</Button>
        <Button type="submit" onClick={() => Haptics.light()} disabled={createMut.isPending} className="h-11 rounded-2xl font-bold" style={{ background: '#9bb4ff', color: '#0a1240' }}>
          {createMut.isPending ? '…' : '+ Log Vital'}
        </Button>
      </div>
    </form>
  );

  return (
    <div className="bento-page">
      <div className="bento-header flex justify-between items-start">
        <div>
          <h1 className="bento-title">Vitals</h1>
          <p className="bento-subtitle">{activeProfile?.full_name || 'Your'} vitals tracker</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { Haptics.light(); setShowHRM(true); }} className="h-10 px-3 rounded-2xl font-bold flex items-center gap-1.5 text-xs" style={{ background: 'rgba(242,140,140,0.15)', border: '1px solid rgba(242,140,140,0.3)', color: 'var(--hf-coral-strong)' }}>
            <Heart size={14} /> HR
          </button>
          <Button onClick={() => { Haptics.light(); setOpen(true); }} className="h-10 px-5 rounded-2xl font-bold" style={{ background: '#9bb4ff', color: '#0a1240' }}>
            <Plus size={14} className="mr-1" /> Log
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2 mb-5">
        {[
          { v: vitals.length, label: 'Total',   color: 'var(--hf-sky-strong)', tc: '#0a1240', icon: '📊' },
          { v: vitalTypes.length, label: 'Types', color: 'var(--hf-lavender-strong)', tc: '#1a0a40', icon: '🔬' },
          { v: weeklyCount, label: 'This Week',  color: 'var(--hf-lemon-strong)', tc: '#0a1200', icon: '📅' },
          { v: abnormal,    label: 'Alerts',     color: abnormal > 0 ? '#f28c8c' : '#a8e6cf', tc: abnormal > 0 ? '#3d0000' : '#003d20', icon: abnormal > 0 ? '⚠️' : '✅' },
        ].map(s => (
          <div key={s.label} className="rounded-2xl p-3 text-center" style={{ background: s.color }}>
            <span className="text-base">{s.icon}</span>
            <p className="text-xl font-black leading-none mt-0.5" style={{ color: s.tc }}>{s.v}</p>
            <p className="text-[8px] font-black uppercase opacity-70 mt-0.5" style={{ color: s.tc }}>{s.label}</p>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 rounded-full border-2 border-[#9bb4ff] border-t-transparent animate-spin" /></div>
      ) : vitals.length === 0 ? (
        <div className="flex flex-col items-center py-20 gap-4 text-center">
          <div className="text-5xl">💓</div>
          <p className="text-sm font-bold" style={{ color: 'var(--hf-text)' }}>No vitals recorded yet</p>
          <p className="text-xs max-w-xs" style={{ color: 'var(--hf-text-muted)' }}>Start logging your vitals to see beautiful charts and trend analysis.</p>
          <Button onClick={() => { Haptics.light(); setOpen(true); }} className="rounded-2xl h-10 px-6 font-bold" style={{ background: '#9bb4ff', color: '#0a1240' }}><Plus size={14} className="mr-1" /> Log First Vital</Button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {vitalTypes.map(type => <VitalCard key={type} type={type} vitals={vitals} onDelete={id => deleteMut.mutate(id)} />)}
        </div>
      )}

      {/* Heart Rate Monitor Modal */}
      {showHRM && <HeartRateMonitor profileId={activeProfileId} onClose={() => setShowHRM(false)} onSave={() => qc.invalidateQueries(['vitals', activeProfileId])} />}

      <ResponsiveOverlay
        open={open}
        onOpenChange={setOpen}
        title="Log Vital Measurement"
        desktopClassName="max-w-lg"
      >
        {FormContent}
      </ResponsiveOverlay>
    </div>
  );
}

import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend
} from 'recharts';
import { TrendingUp, TrendingDown, Minus, Download, AlertTriangle } from 'lucide-react';
import { format, subDays, parseISO } from 'date-fns';
import { useActiveProfile } from '../components/ActiveProfileContext';

const VITAL_COLORS = {
  blood_pressure: '#f28c8c', heart_rate: '#f7c9a3', weight: '#d7f576',
  blood_glucose: '#c9bbff', oxygen_saturation: '#a8e6cf', temperature: '#9bb4ff',
  bmi: '#f7e6a3', respiratory_rate: '#e6c9ff',
};

const VITAL_REFS = {
  heart_rate: { low: 60, high: 100 },
  blood_glucose: { low: 70, high: 140 },
  oxygen_saturation: { low: 95, high: 100 },
  temperature: { low: 36.1, high: 37.2 },
};

function trendIcon(data, key = 'value') {
  if (data.length < 3) return null;
  const half = Math.floor(data.length / 2);
  const first = data.slice(0, half).reduce((s, v) => s + (v[key] || 0), 0) / half;
  const second = data.slice(half).reduce((s, v) => s + (v[key] || 0), 0) / (data.length - half);
  const pct = ((second - first) / (first || 1)) * 100;
  if (pct > 3) return { icon: TrendingUp, color: 'var(--hf-coral-strong)', label: `+${pct.toFixed(1)}%` };
  if (pct < -3) return { icon: TrendingDown, color: 'var(--hf-mint-strong)', label: `${pct.toFixed(1)}%` };
  return { icon: Minus, color: 'var(--hf-text-muted)', label: 'Stable' };
}

function CustomTooltip({ active = false, payload = [] }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="p-3 rounded-xl shadow-xl text-xs" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
      <p className="font-bold mb-1" style={{ color: 'var(--hf-text)' }}>{payload[0]?.payload?.fullDate || payload[0]?.payload?.date}</p>
      {payload.map((e, i) => (
        <p key={i} style={{ color: e.color }}>
          {e.name}: <span className="font-bold">{typeof e.value === 'number' ? e.value.toFixed(1) : e.value}</span>
        </p>
      ))}
    </div>
  );
}

export default function Trends() {
  const [dateRange, setDateRange] = useState('30');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [activeTab, setActiveTab] = useState('vitals');
  const [selectedVital, setSelectedVital] = useState('blood_pressure');
  const { activeProfileId, activeProfile } = useActiveProfile();

  const { start: startDate, end: endDate } = useMemo(() => {
    const now = new Date();
    if (dateRange === 'custom' && customStart && customEnd) return { start: parseISO(customStart), end: parseISO(customEnd) };
    const days = { '7': 7, '30': 30, '90': 90, '365': 365 }[dateRange] || 30;
    return { start: subDays(now, days), end: now };
  }, [dateRange, customStart, customEnd]);

  const { data: vitals = [], isLoading: vLoading } = useQuery({
    queryKey: ['vitals-trends', activeProfileId, dateRange, customStart, customEnd],
    queryFn: async () => {
      const all = await base44.entities.VitalMeasurement.filter({ profile_id: activeProfileId }, '-measured_at', 200);
      return all.filter(v => { const d = new Date(v.measured_at); return d >= startDate && d <= endDate; });
    },
    enabled: !!activeProfileId,
  });

  const { data: labs = [], isLoading: lLoading } = useQuery({
    queryKey: ['labs-trends', activeProfileId, dateRange, customStart, customEnd],
    queryFn: async () => {
      const all = await base44.entities.LabResult.filter({ profile_id: activeProfileId }, '-test_date', 100);
      return all.filter(l => { const d = new Date(l.test_date); return d >= startDate && d <= endDate; });
    },
    enabled: !!activeProfileId,
  });

  const vitalTypes = useMemo(() => [...new Set(vitals.map(v => v.vital_type))], [vitals]);
  const labsByTest = useMemo(() => {
    const map = {};
    labs.forEach(l => {
      if (!map[l.test_name]) map[l.test_name] = { unit: l.unit, category: l.test_category, data: [] };
      map[l.test_name].data.push({
        date: format(new Date(l.test_date), 'MMM d'), fullDate: format(new Date(l.test_date), 'MMM d yyyy'),
        value: l.value, flag: l.flag, ts: new Date(l.test_date).getTime()
      });
    });
    Object.values(map).forEach(t => t.data.sort((a, b) => a.ts - b.ts));
    return map;
  }, [labs]);

  const vitalData = useMemo(() => {
    const map = {};
    vitalTypes.forEach(type => {
      map[type] = vitals.filter(v => v.vital_type === type)
        .map(v => ({
          date: format(new Date(v.measured_at), 'MMM d'), fullDate: format(new Date(v.measured_at), 'MMM d yyyy HH:mm'),
          value: v.value, systolic: v.systolic, diastolic: v.diastolic, unit: v.unit,
          ts: new Date(v.measured_at).getTime()
        }))
        .sort((a, b) => a.ts - b.ts);
    });
    return map;
  }, [vitals, vitalTypes]);

  const selectedData = vitalData[selectedVital] || [];
  const color = VITAL_COLORS[selectedVital] || '#d7f576';
  const refs = VITAL_REFS[selectedVital];
  const trend = trendIcon(selectedData, selectedVital === 'blood_pressure' ? 'systolic' : 'value');
  const TIcon = trend?.icon;

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify({ profile: activeProfile?.full_name, vitals, labs }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `trends-${format(new Date(), 'yyyy-MM-dd')}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const TABS = [
    { key: 'vitals', label: '❤️ Vitals' },
    { key: 'labs', label: '🔬 Labs' },
    { key: 'overview', label: '📊 Overview' },
  ];

  return (
    <div className="bento-page">
      <div className="bento-header flex justify-between items-start">
        <div>
          <h1 className="bento-title">Trends</h1>
          <p className="bento-subtitle">{activeProfile?.full_name || 'Your'} health over time</p>
        </div>
        <Button variant="outline" size="sm" onClick={exportJSON}
          className="rounded-2xl h-10 px-4 text-xs font-bold" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)', color: 'var(--hf-text)' }}>
          <Download className="w-3.5 h-3.5 mr-1.5" /> Export
        </Button>
      </div>

      {/* Date range filter */}
      <div className="mb-4 space-y-2">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {[['7', '7d'], ['30', '30d'], ['90', '3mo'], ['365', '1yr'], ['custom', 'Custom']].map(([val, lbl]) => (
            <button key={val} onClick={() => setDateRange(val)}
              className="whitespace-nowrap px-4 py-2 rounded-xl text-xs font-bold transition-all flex-shrink-0"
              style={{
                background: dateRange === val ? '#d7f576' : 'var(--hf-surface-2)',
                color: dateRange === val ? '#0a1200' : 'var(--hf-text-muted)',
                border: '1px solid var(--hf-border)',
              }}>{lbl}</button>
          ))}
        </div>
        {dateRange === 'custom' && (
          <div className="grid grid-cols-2 gap-2">
            <Input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="h-10 rounded-xl text-xs" />
            <Input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="h-10 rounded-xl text-xs" />
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 mb-4">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className="px-4 py-2 rounded-xl text-xs font-bold transition-all"
            style={{
              background: activeTab === t.key ? '#d7f576' : 'var(--hf-surface-2)',
              color: activeTab === t.key ? '#0a1200' : 'var(--hf-text-muted)',
              border: '1px solid var(--hf-border)',
            }}>{t.label}</button>
        ))}
      </div>

      {/* ── VITALS TAB ── */}
      {activeTab === 'vitals' && (
        <div className="space-y-4">
          {vLoading ? (
            <div className="flex justify-center py-16"><div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#d7f576', borderTopColor: 'transparent' }} /></div>
          ) : vitalTypes.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-sm font-bold" style={{ color: 'var(--hf-text)' }}>No vitals in this period</p>
            </div>
          ) : (
            <>
              {/* Vital selector */}
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                {vitalTypes.map(type => (
                  <button key={type} onClick={() => setSelectedVital(type)}
                    className="whitespace-nowrap px-3 py-1.5 rounded-xl text-xs font-bold flex-shrink-0 capitalize"
                    style={{
                      background: selectedVital === type ? VITAL_COLORS[type] || '#d7f576' : 'var(--hf-surface-2)',
                      color: selectedVital === type ? '#0a1200' : 'var(--hf-text-muted)',
                      border: '1px solid var(--hf-border)',
                    }}>{type.replace(/_/g, ' ')}</button>
                ))}
              </div>

              {/* Main chart */}
              <Card className="border-0 card-shadow rounded-2xl">
                <CardHeader className="p-4 pb-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xs font-black uppercase tracking-wider capitalize" style={{ color: 'var(--hf-text-muted)' }}>
                        {selectedVital.replace(/_/g, ' ')}
                      </CardTitle>
                      {selectedData.length > 0 && (
                        <p className="text-2xl font-black mt-1" style={{ color }}>
                          {selectedVital === 'blood_pressure'
                            ? `${selectedData[selectedData.length - 1].systolic}/${selectedData[selectedData.length - 1].diastolic}`
                            : selectedData[selectedData.length - 1].value}
                          <span className="text-xs ml-1" style={{ color: 'var(--hf-text-muted)' }}>{selectedData[0]?.unit}</span>
                        </p>
                      )}
                    </div>
                    {trend && TIcon && (
                      <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl" style={{ background: `${trend.color}22` }}>
                        <TIcon size={14} style={{ color: trend.color }} />
                        <span className="text-xs font-bold" style={{ color: trend.color }}>{trend.label}</span>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-3 h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    {selectedVital === 'blood_pressure' ? (
                      <LineChart data={selectedData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--hf-border)" strokeOpacity={0.5} />
                        <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'var(--hf-text-muted)' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                        <YAxis tick={{ fontSize: 9, fill: 'var(--hf-text-muted)' }} axisLine={false} tickLine={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                        <Line type="monotone" dataKey="systolic" stroke="#f28c8c" strokeWidth={2.5} dot={false} name="Systolic" />
                        <Line type="monotone" dataKey="diastolic" stroke="#9bb4ff" strokeWidth={2} dot={false} strokeDasharray="4 2" name="Diastolic" />
                        <ReferenceLine y={120} stroke="#f28c8c" strokeDasharray="4 2" strokeOpacity={0.5} />
                        <ReferenceLine y={80} stroke="#9bb4ff" strokeDasharray="4 2" strokeOpacity={0.5} />
                      </LineChart>
                    ) : (
                      <AreaChart data={selectedData}>
                        <defs>
                          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={color} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--hf-border)" strokeOpacity={0.5} />
                        <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'var(--hf-text-muted)' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                        <YAxis tick={{ fontSize: 9, fill: 'var(--hf-text-muted)' }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                        <Tooltip content={<CustomTooltip />} />
                        {refs && <ReferenceLine y={refs.high} stroke={color} strokeDasharray="4 2" strokeOpacity={0.6} />}
                        {refs && <ReferenceLine y={refs.low} stroke={color} strokeDasharray="4 2" strokeOpacity={0.6} />}
                        <Area type="monotone" dataKey="value" stroke={color} fill="url(#areaGrad)" strokeWidth={2.5} dot={false} />
                      </AreaChart>
                    )}
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Stats */}
              {selectedData.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Average', value: selectedVital === 'blood_pressure'
                        ? `${Math.round(selectedData.reduce((s, v) => s + (v.systolic || 0), 0) / selectedData.length)}/${Math.round(selectedData.reduce((s, v) => s + (v.diastolic || 0), 0) / selectedData.length)}`
                        : (selectedData.reduce((s, v) => s + (v.value || 0), 0) / selectedData.length).toFixed(1) },
                    { label: 'Min', value: selectedVital === 'blood_pressure'
                        ? `${Math.min(...selectedData.map(v => v.systolic || 0))}/${Math.min(...selectedData.map(v => v.diastolic || 0))}`
                        : Math.min(...selectedData.map(v => v.value || 0)).toFixed(1) },
                    { label: 'Max', value: selectedVital === 'blood_pressure'
                        ? `${Math.max(...selectedData.map(v => v.systolic || 0))}/${Math.max(...selectedData.map(v => v.diastolic || 0))}`
                        : Math.max(...selectedData.map(v => v.value || 0)).toFixed(1) },
                  ].map(s => (
                    <div key={s.label} className="p-3 rounded-xl text-center" style={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)' }}>
                      <p className="text-[10px]" style={{ color: 'var(--hf-text-muted)' }}>{s.label}</p>
                      <p className="text-sm font-black mt-0.5" style={{ color }}>{s.value}</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── LABS TAB ── */}
      {activeTab === 'labs' && (
        <div className="space-y-4">
          {lLoading ? (
            <div className="flex justify-center py-16"><div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#a8e6cf', borderTopColor: 'transparent' }} /></div>
          ) : Object.keys(labsByTest).length === 0 ? (
            <div className="text-center py-20"><p className="text-sm font-bold" style={{ color: 'var(--hf-text)' }}>No lab results in this period</p></div>
          ) : (
            Object.entries(labsByTest).map(([testName, testData]) => {
              const tInfo = trendIcon(testData.data);
              const TI = tInfo?.icon;
              const latestFlag = testData.data[testData.data.length - 1]?.flag;
              const flagColor = latestFlag === 'high' ? '#f28c8c' : latestFlag === 'low' ? '#9bb4ff' : '#a8e6cf';
              return (
                <Card key={testName} className="border-0 card-shadow rounded-2xl">
                  <CardHeader className="p-4 pb-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-sm font-bold" style={{ color: 'var(--hf-text)' }}>{testName}</CardTitle>
                        <p className="text-[10px] capitalize" style={{ color: 'var(--hf-text-muted)' }}>{testData.category}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {tInfo && TI && (
                          <span className="text-xs font-bold flex items-center gap-1" style={{ color: tInfo.color }}>
                            <TI size={12} />{tInfo.label}
                          </span>
                        )}
                        <span className="text-[9px] font-black px-2 py-0.5 rounded-full capitalize" style={{ background: `${flagColor}22`, color: flagColor }}>{latestFlag}</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-3 h-[160px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={testData.data}>
                        <defs>
                          <linearGradient id={`lg${testName}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#c9bbff" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#c9bbff" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'var(--hf-text-muted)' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                        <YAxis hide domain={['auto', 'auto']} />
                        <Tooltip content={<CustomTooltip />} />
                        <Area type="monotone" dataKey="value" stroke="#c9bbff" fill={`url(#lg${testName})`} strokeWidth={2} dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* ── OVERVIEW TAB ── */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Vital Readings', value: vitals.length, color: 'var(--hf-coral-strong)', icon: '❤️' },
              { label: 'Lab Tests', value: labs.length, color: 'var(--hf-lavender-strong)', icon: '🔬' },
              { label: 'Abnormal Labs', value: labs.filter(l => l.flag !== 'normal').length, color: 'var(--hf-peach-strong)', icon: '⚠️' },
              { label: 'Vital Types', value: vitalTypes.length, color: 'var(--hf-mint-strong)', icon: '📊' },
            ].map(s => (
              <div key={s.label} className="p-4 rounded-2xl" style={{ background: `${s.color}22`, border: `1px solid ${s.color}44` }}>
                <span className="text-xl">{s.icon}</span>
                <p className="text-2xl font-black mt-1" style={{ color: s.color }}>{s.value}</p>
                <p className="text-[10px] font-bold uppercase opacity-70" style={{ color: s.color }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* Latest readings */}
          {vitalTypes.length > 0 && (
            <Card className="border-0 card-shadow rounded-2xl">
              <CardHeader className="p-4 pb-2"><CardTitle className="text-sm font-bold" style={{ color: 'var(--hf-text)' }}>Latest Readings</CardTitle></CardHeader>
              <CardContent className="p-4 pt-0 space-y-2">
                {vitalTypes.map(type => {
                  const data = vitalData[type];
                  if (!data?.length) return null;
                  const latest = data[data.length - 1];
                  const c = VITAL_COLORS[type] || '#d7f576';
                  return (
                    <div key={type} className="flex items-center justify-between p-2.5 rounded-xl" style={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)' }}>
                      <p className="text-xs font-bold capitalize" style={{ color: 'var(--hf-text)' }}>{type.replace(/_/g, ' ')}</p>
                      <span className="text-sm font-black" style={{ color: c }}>
                        {type === 'blood_pressure' ? `${latest.systolic}/${latest.diastolic}` : latest.value} {latest.unit || ''}
                      </span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Abnormal labs */}
          {labs.filter(l => l.flag !== 'normal').length > 0 && (
            <Card className="border-0 card-shadow rounded-2xl">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--hf-coral-strong)' }}>
                  <AlertTriangle size={14} /> Abnormal Results
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-2">
                {labs.filter(l => l.flag !== 'normal').slice(0, 5).map(l => (
                  <div key={l.id} className="flex items-center justify-between p-2.5 rounded-xl" style={{ background: 'rgba(242,140,140,0.08)', border: '1px solid rgba(242,140,140,0.2)' }}>
                    <p className="text-xs font-bold" style={{ color: 'var(--hf-text)' }}>{l.test_name}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold" style={{ color: 'var(--hf-text)' }}>{l.value} {l.unit}</span>
                      <span className="text-[9px] font-black px-2 py-0.5 rounded-full capitalize" style={{ background: 'rgba(242,140,140,0.2)', color: 'var(--hf-coral-strong)' }}>{l.flag}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {vitals.length === 0 && labs.length === 0 && (
            <div className="text-center py-20">
              <div className="text-4xl mb-4">📈</div>
              <p className="text-sm font-bold" style={{ color: 'var(--hf-text)' }}>No data in this period</p>
              <p className="text-xs mt-1" style={{ color: 'var(--hf-text-muted)' }}>Try a wider date range or start logging vitals & labs.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

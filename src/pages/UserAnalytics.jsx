// @ts-nocheck
import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useActiveProfile } from '../components/ActiveProfileContext';
import {
  format, subDays, subMonths, eachDayOfInterval, eachMonthOfInterval,
  startOfMonth, endOfMonth
} from 'date-fns';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend
} from 'recharts';
import { Activity, Pill, FileText, Download, AlertTriangle, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const PIE_COLORS = ['#d7f576', '#c9bbff', '#f7c9a3', '#9bb4ff', '#a8e6cf', '#f28c8c'];
const chartStyle = { background: 'var(--hf-surface)', border: '1px solid var(--hf-border)', borderRadius: 22, padding: '1.25rem' };
const tooltipStyle = { background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)', borderRadius: 12, fontSize: 11, color: 'var(--hf-text)' };

const VITAL_TYPES = [
  { value: 'heart_rate', label: 'Heart Rate', unit: 'bpm', color: 'var(--hf-coral-strong)' },
  { value: 'blood_pressure', label: 'Blood Pressure', unit: 'mmHg', color: 'var(--hf-lavender-strong)' },
  { value: 'blood_glucose', label: 'Blood Glucose', unit: 'mg/dL', color: 'var(--hf-peach-strong)' },
  { value: 'weight', label: 'Weight', unit: 'kg', color: 'var(--hf-sky-strong)' },
  { value: 'oxygen_saturation', label: 'O₂ Saturation', unit: '%', color: 'var(--hf-mint-strong)' },
  { value: 'temperature', label: 'Temperature', unit: '°F', color: 'var(--hf-lemon-strong)' },
];

const DOC_TYPE_COLORS = {
  lab_report: '#d7f576',
  prescription: '#c9bbff',
  imaging: '#f7c9a3',
  discharge_summary: '#9bb4ff',
  consultation: '#a8e6cf',
  vaccination: '#f28c8c',
  insurance: '#ffd6a5',
  other: '#b0b0b0',
};

function SectionCard({ title, icon: Icon, children, action = null }) {
  return (
    <div style={chartStyle}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {Icon && <Icon size={15} style={{ color: 'var(--hf-text-muted)' }} />}
          <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--hf-text-muted)' }}>{title}</p>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

export default function UserAnalytics() {
  const { activeProfileId, activeProfile } = useActiveProfile();
  const [vitalType, setVitalType] = useState('heart_rate');
  const [exporting, setExporting] = useState(false);

  const { data: vitals = [] } = useQuery({
    queryKey: ['ua-vitals', activeProfileId],
    queryFn: () => base44.entities.VitalMeasurement.filter({ profile_id: activeProfileId }, '-measured_at', 200),
    enabled: !!activeProfileId,
  });

  const { data: medications = [] } = useQuery({
    queryKey: ['ua-meds', activeProfileId],
    queryFn: () => base44.entities.Medication.filter({ profile_id: activeProfileId }, '-created_date', 100),
    enabled: !!activeProfileId,
  });

  const { data: medLogs = [] } = useQuery({
    queryKey: ['ua-medlogs', activeProfileId],
    queryFn: () => base44.entities.MedicationLog.filter({ profile_id: activeProfileId }, '-scheduled_time', 200),
    enabled: !!activeProfileId,
  });

  const { data: labResults = [] } = useQuery({
    queryKey: ['ua-labs', activeProfileId],
    queryFn: () => base44.entities.LabResult.filter({ profile_id: activeProfileId }, '-test_date', 200),
    enabled: !!activeProfileId,
  });

  const { data: documents = [] } = useQuery({
    queryKey: ['ua-docs', activeProfileId],
    queryFn: () => base44.entities.MedicalDocument.filter({ profile_id: activeProfileId }, '-document_date', 200),
    enabled: !!activeProfileId,
  });

  // Vital trend data
  const vitalChartData = useMemo(() => {
    const typeVitals = vitals
      .filter(v => v.vital_type === vitalType)
      .sort((a, b) => new Date(a.measured_at) - new Date(b.measured_at))
      .slice(-60);

    return typeVitals.map(v => ({
      date: format(new Date(v.measured_at), 'MMM d'),
      value: v.value,
      systolic: v.systolic,
      diastolic: v.diastolic,
    }));
  }, [vitals, vitalType]);

  // Medication adherence by medication
  const adherenceData = useMemo(() => {
    const taken = medLogs.filter(l => l.status === 'taken').length;
    const skipped = medLogs.filter(l => l.status === 'skipped').length;
    const total = taken + skipped;
    const pct = total ? Math.round((taken / total) * 100) : 0;

    const byMed = {};
    medications.forEach(m => {
      const mLogs = medLogs.filter(l => l.medication_id === m.id);
      const t = mLogs.filter(l => l.status === 'taken').length;
      const s = mLogs.filter(l => l.status === 'skipped').length;
      byMed[m.medication_name] = { taken: t, skipped: s, total: t + s, pct: (t + s) ? Math.round((t / (t + s)) * 100) : 0 };
    });

    const byMedArr = Object.entries(byMed).map(([name, d]) => ({ name, ...d }));

    // 30-day daily adherence
    const days30 = eachDayOfInterval({ start: subDays(new Date(), 29), end: new Date() });
    const daily = days30.map(d => {
      const ds = d.toDateString();
      const dayLogs = medLogs.filter(l => l.scheduled_time && new Date(l.scheduled_time).toDateString() === ds);
      const t = dayLogs.filter(l => l.status === 'taken').length;
      const total = dayLogs.length;
      return { date: format(d, 'MMM d'), adherence: total ? Math.round((t / total) * 100) : 0, taken: t, total };
    });

    return { taken, skipped, total, pct, byMedArr, daily };
  }, [medications, medLogs]);

  // Abnormal labs
  const abnormalLabs = useMemo(() => {
    return labResults.filter(l => l.flag && l.flag !== 'normal')
      .sort((a, b) => new Date(b.test_date) - new Date(a.test_date));
  }, [labResults]);

  // Documents timeline by month & type
  const docTimeline = useMemo(() => {
    const months = eachMonthOfInterval({ start: subMonths(new Date(), 11), end: new Date() });
    const types = [...new Set(documents.map(d => d.document_type || 'other'))];
    return months.map(m => {
      const start = startOfMonth(m);
      const end = endOfMonth(m);
      const row = { label: format(m, 'MMM yy') };
      types.forEach(t => {
        row[t] = documents.filter(d => {
          const dd = d.document_date ? new Date(d.document_date) : d.created_date ? new Date(d.created_date) : null;
          return dd && dd >= start && dd <= end && (d.document_type || 'other') === t;
        }).length;
      });
      return row;
    });
  }, [documents]);

  const docTypes = useMemo(() => [...new Set(documents.map(d => d.document_type || 'other'))], [documents]);

  const selectedVital = VITAL_TYPES.find(v => v.value === vitalType) || VITAL_TYPES[0];

  const exportPDF = async () => {
    setExporting(true);
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();

      doc.setFontSize(20);
      doc.setFont(undefined, 'bold');
      doc.text('Health Analytics Report', 20, 25);

      doc.setFontSize(11);
      doc.setFont(undefined, 'normal');
      doc.text(`Profile: ${activeProfile?.full_name || 'Unknown'}`, 20, 36);
      doc.text(`Generated: ${format(new Date(), 'PPP')}`, 20, 43);

      let y = 58;
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('Medication Adherence', 20, y); y += 8;
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text(`Overall: ${adherenceData.pct}% (${adherenceData.taken} taken / ${adherenceData.total} total)`, 20, y); y += 6;
      adherenceData.byMedArr.forEach(m => {
        doc.text(`  • ${m.name}: ${m.pct}% adherence`, 20, y); y += 5;
        if (y > 270) { doc.addPage(); y = 20; }
      });

      y += 6;
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('Abnormal Lab Results', 20, y); y += 8;
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      if (abnormalLabs.length === 0) {
        doc.text('No abnormal results found.', 20, y); y += 6;
      } else {
        abnormalLabs.slice(0, 15).forEach(l => {
          doc.text(`  • ${l.test_name}: ${l.value} ${l.unit} [${l.flag?.toUpperCase()}] — ${l.test_date}`, 20, y); y += 5;
          if (y > 270) { doc.addPage(); y = 20; }
        });
      }

      y += 6;
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('Recent Vitals', 20, y); y += 8;
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      vitals.slice(0, 10).forEach(v => {
        const val = v.vital_type === 'blood_pressure' ? `${v.systolic}/${v.diastolic}` : `${v.value}`;
        doc.text(`  • ${v.vital_type?.replace(/_/g, ' ')}: ${val} — ${format(new Date(v.measured_at), 'PPP')}`, 20, y); y += 5;
        if (y > 270) { doc.addPage(); y = 20; }
      });

      y += 6;
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('Documents Summary', 20, y); y += 8;
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text(`Total documents: ${documents.length}`, 20, y); y += 5;
      docTypes.forEach(t => {
        const cnt = documents.filter(d => (d.document_type || 'other') === t).length;
        doc.text(`  • ${t.replace(/_/g, ' ')}: ${cnt}`, 20, y); y += 5;
        if (y > 270) { doc.addPage(); y = 20; }
      });

      doc.save(`health-analytics-${activeProfile?.full_name?.replace(/\s+/g, '-') || 'report'}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    } catch (e) {
      console.error('PDF export error', e);
    } finally {
      setExporting(false);
    }
  };

  if (!activeProfileId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p style={{ color: 'var(--hf-text-muted)' }}>No profile selected.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6 space-y-6" style={{ background: 'var(--hf-bg)', color: 'var(--hf-text)', paddingBottom: '6rem' }}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--hf-text)' }}>My Analytics</h1>
          <p className="text-sm" style={{ color: 'var(--hf-text-muted)' }}>
            {activeProfile?.full_name} · Health data insights
          </p>
        </div>
        <Button onClick={exportPDF} disabled={exporting} size="sm"
          className="flex items-center gap-2 rounded-[14px]"
          style={{ background: '#d7f576', color: '#0a1200' }}>
          <Download size={14} />
          {exporting ? 'Exporting...' : 'Export PDF'}
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Vitals Logged', value: vitals.length, icon: Activity, bg: '#9bb4ff', tc: '#0a1240' },
          { label: 'Adherence', value: `${adherenceData.pct}%`, icon: Pill, bg: '#d7f576', tc: '#0a1200' },
          { label: 'Abnormal Labs', value: abnormalLabs.length, icon: AlertTriangle, bg: '#f28c8c', tc: '#3d0000' },
          { label: 'Documents', value: documents.length, icon: FileText, bg: '#c9bbff', tc: '#1a0a40' },
        ].map((s, i) => (
          <div key={i} className="rounded-[20px] p-4" style={{ background: s.bg }}>
            <s.icon size={16} style={{ color: s.tc, opacity: 0.6 }} />
            <p className="text-2xl font-black mt-2" style={{ color: s.tc }}>{s.value}</p>
            <p className="text-[10px] font-bold uppercase tracking-wide mt-0.5" style={{ color: s.tc, opacity: 0.7 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Vitals Trend */}
      <SectionCard title="Vitals Trend" icon={Activity}
        action={
          <Select value={vitalType} onValueChange={setVitalType}>
            <SelectTrigger className="h-7 text-xs rounded-[10px] w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VITAL_TYPES.map(v => <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
        }>
        {vitalChartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            {vitalType === 'blood_pressure' ? (
              <LineChart data={vitalChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--hf-border)" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'var(--hf-text-muted)' }} tickLine={false} axisLine={false}
                  interval={Math.max(0, Math.floor(vitalChartData.length / 6) - 1)} />
                <YAxis tick={{ fontSize: 9, fill: 'var(--hf-text-muted)' }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line type="monotone" dataKey="systolic" stroke="#f28c8c" strokeWidth={2} dot={false} name="Systolic" />
                <Line type="monotone" dataKey="diastolic" stroke="#c9bbff" strokeWidth={2} dot={false} name="Diastolic" />
              </LineChart>
            ) : (
              <AreaChart data={vitalChartData}>
                <defs>
                  <linearGradient id="vg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={selectedVital.color} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={selectedVital.color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--hf-border)" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'var(--hf-text-muted)' }} tickLine={false} axisLine={false}
                  interval={Math.max(0, Math.floor(vitalChartData.length / 6) - 1)} />
                <YAxis tick={{ fontSize: 9, fill: 'var(--hf-text-muted)' }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v} ${selectedVital.unit}`, selectedVital.label]} />
                <Area type="monotone" dataKey="value" stroke={selectedVital.color} fill="url(#vg)" strokeWidth={2} dot={false} name={selectedVital.label} />
              </AreaChart>
            )}
          </ResponsiveContainer>
        ) : (
          <div className="flex flex-col items-center justify-center h-32 gap-2">
            <Activity size={24} style={{ color: 'var(--hf-text-muted)' }} />
            <p className="text-sm" style={{ color: 'var(--hf-text-muted)' }}>No {selectedVital.label} data yet</p>
          </div>
        )}
      </SectionCard>

      {/* Medication Adherence */}
      <SectionCard title="Medication Adherence" icon={Pill}>
        {medications.length > 0 ? (
          <div className="space-y-4">
            {/* Overall */}
            <div className="flex items-center gap-4 p-4 rounded-[16px]" style={{ background: 'var(--hf-surface-2)' }}>
              <div className="w-14 h-14 rounded-full flex items-center justify-center font-black text-lg flex-shrink-0"
                style={{ background: adherenceData.pct > 70 ? '#d7f576' : adherenceData.pct > 40 ? '#f7c9a3' : '#f28c8c', color: '#0a1200' }}>
                {adherenceData.pct}%
              </div>
              <div>
                <p className="font-bold text-sm" style={{ color: 'var(--hf-text)' }}>Overall Adherence</p>
                <p className="text-xs" style={{ color: 'var(--hf-text-muted)' }}>{adherenceData.taken} taken · {adherenceData.skipped} skipped</p>
              </div>
            </div>

            {/* 30-day daily */}
            {adherenceData.daily.some(d => d.total > 0) && (
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={adherenceData.daily}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--hf-border)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 8, fill: 'var(--hf-text-muted)' }} tickLine={false} axisLine={false}
                    interval={Math.max(0, Math.floor(adherenceData.daily.length / 7) - 1)} />
                  <YAxis tick={{ fontSize: 8, fill: 'var(--hf-text-muted)' }} tickLine={false} axisLine={false} domain={[0, 100]} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v}%`, 'Adherence']} />
                  <Bar dataKey="adherence" fill="#d7f576" radius={[4, 4, 0, 0]} name="Adherence %" />
                </BarChart>
              </ResponsiveContainer>
            )}

            {/* Per-med */}
            {adherenceData.byMedArr.length > 0 && (
              <div className="space-y-2">
                {adherenceData.byMedArr.map((m, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <p className="text-xs truncate w-32 flex-shrink-0" style={{ color: 'var(--hf-text)' }}>{m.name}</p>
                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--hf-border)' }}>
                      <div className="h-full rounded-full transition-all" style={{
                        width: `${m.pct}%`,
                        background: m.pct > 70 ? '#d7f576' : m.pct > 40 ? '#f7c9a3' : '#f28c8c',
                      }} />
                    </div>
                    <p className="text-xs font-bold w-10 text-right" style={{ color: 'var(--hf-text-muted)' }}>{m.pct}%</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm" style={{ color: 'var(--hf-text-muted)' }}>No medications tracked yet.</p>
        )}
      </SectionCard>

      {/* Abnormal Lab Results */}
      <SectionCard title="Abnormal Lab Results" icon={AlertTriangle}>
        {abnormalLabs.length === 0 ? (
          <div className="flex items-center gap-3 p-4 rounded-[16px]" style={{ background: '#a8e6cf22' }}>
            <CheckCircle size={20} className="text-green-400 flex-shrink-0" />
            <p className="text-sm" style={{ color: 'var(--hf-text)' }}>All lab results are within normal range.</p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs mb-3" style={{ color: 'var(--hf-text-muted)' }}>{abnormalLabs.length} result(s) outside normal range</p>
            {abnormalLabs.map((lab, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-[14px]"
                style={{ background: lab.flag === 'high' ? '#f28c8c22' : '#f7c9a322' }}>
                <div>
                  <p className="text-sm font-bold" style={{ color: 'var(--hf-text)' }}>{lab.test_name}</p>
                  <p className="text-xs" style={{ color: 'var(--hf-text-muted)' }}>{lab.test_date} · {lab.facility || 'Unknown facility'}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black" style={{ color: lab.flag === 'high' ? '#f28c8c' : '#f7c9a3' }}>
                    {lab.value} {lab.unit}
                  </p>
                  <Badge className="text-[9px] uppercase" style={{
                    background: lab.flag === 'high' ? '#f28c8c' : '#f7c9a3',
                    color: lab.flag === 'high' ? '#3d0000' : '#3d1a00',
                  }}>
                    {lab.flag}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Documents Timeline */}
      <SectionCard title="Documents Timeline" icon={FileText}>
        {documents.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--hf-text-muted)' }}>No documents uploaded yet.</p>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={docTimeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--hf-border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'var(--hf-text-muted)' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 9, fill: 'var(--hf-text-muted)' }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 9 }} />
                {docTypes.map((t, i) => (
                  <Bar key={t} dataKey={t} stackId="a" fill={DOC_TYPE_COLORS[t] || PIE_COLORS[i % PIE_COLORS.length]}
                    radius={i === docTypes.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                    name={t.replace(/_/g, ' ')} />
                ))}
              </BarChart>
            </ResponsiveContainer>

            {/* Recent documents list */}
            <div className="mt-4 space-y-2">
              {documents.slice(0, 8).map((doc, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-[14px]" style={{ background: 'var(--hf-surface-2)' }}>
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: DOC_TYPE_COLORS[doc.document_type] || '#b0b0b0' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--hf-text)' }}>{doc.title}</p>
                    <p className="text-xs" style={{ color: 'var(--hf-text-muted)' }}>
                      {doc.document_type?.replace(/_/g, ' ')} · {doc.document_date || doc.created_date?.slice(0, 10)}
                    </p>
                  </div>
                  {doc.facility_name && (
                    <p className="text-[10px] flex-shrink-0" style={{ color: 'var(--hf-text-muted)' }}>{doc.facility_name}</p>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </SectionCard>
    </div>
  );
}

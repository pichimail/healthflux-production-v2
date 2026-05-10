// @ts-nocheck
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Download, Loader2, CheckCircle, FileText, FileJson, Database } from 'lucide-react';
import { toast } from 'sonner';
import { useActiveProfile } from '../components/ActiveProfileContext';
import { format } from 'date-fns';

const DATA_OPTIONS = [
  { key: 'profile',         emoji: '👤', label: 'Profile',          desc: 'Basic info & allergies',     color: 'var(--hf-lemon-strong)' },
  { key: 'medications',     emoji: '💊', label: 'Medications',       desc: 'Meds & doses',               color: 'var(--hf-peach-strong)' },
  { key: 'adherence',       emoji: '📊', label: 'Adherence',         desc: 'Med tracking stats',         color: 'var(--hf-lavender-strong)' },
  { key: 'vitals',          emoji: '❤️', label: 'Vital Signs',       desc: 'BP, HR, glucose…',           color: 'var(--hf-coral-strong)' },
  { key: 'labs',            emoji: '🧪', label: 'Lab Results',       desc: 'Test results & flags',       color: 'var(--hf-mint-strong)' },
  { key: 'documents',       emoji: '📄', label: 'Documents',         desc: 'Summaries & AI analysis',    color: 'var(--hf-sky-strong)' },
  { key: 'insights',        emoji: '💡', label: 'AI Insights',       desc: 'AI health insights',         color: 'var(--hf-peach-strong)' },
  { key: 'wellness',        emoji: '🌟', label: 'Wellness Goals',    desc: 'Goals & streaks',            color: 'var(--hf-mint-strong)' },
  { key: 'predictions',     emoji: '📈', label: 'Predictions',       desc: 'Predictive analytics',       color: 'var(--hf-lavender-strong)' },
  { key: 'sideEffects',     emoji: '⚠️', label: 'Side Effects',      desc: 'Reported side effects',      color: 'var(--hf-peach-strong)' },
  { key: 'effectiveness',   emoji: '⭐', label: 'Effectiveness',     desc: 'Med ratings & outcomes',     color: 'var(--hf-lemon-strong)' },
  { key: 'emergencyProfile',emoji: '🚨', label: 'Emergency Profile', desc: 'Emergency critical info',    color: 'var(--hf-coral-strong)' },
];

const FORMATS = [
  { v: 'pdf', icon: FileText, label: 'PDF Report', desc: 'Formatted for doctors', color: 'var(--hf-coral-strong)' },
  { v: 'json', icon: FileJson, label: 'JSON Data', desc: 'Machine-readable', color: 'var(--hf-lavender-strong)' },
  { v: 'txt', icon: Database, label: 'Plain Text', desc: 'Simple summary', color: 'var(--hf-lemon-strong)' },
];

const PERIODS = [
  { v: '30', l: 'Last 30 days' }, { v: '60', l: 'Last 60 days' }, { v: '90', l: 'Last 90 days' },
  { v: '180', l: 'Last 6 months' }, { v: '365', l: 'Last year' }, { v: '730', l: 'Last 2 years' },
];

const DEFAULT_SEL = { profile: true, medications: true, adherence: true, vitals: true, labs: true, documents: true, insights: true, wellness: true, predictions: false, sideEffects: false, effectiveness: false, emergencyProfile: false };

export default function ExportReports() {
  const { activeProfileId, activeProfile } = useActiveProfile();
  const [fmt, setFmt] = useState('pdf');
  const [style, setStyle] = useState('doctor');
  const [lang, setLang] = useState('english');
  const [period, setPeriod] = useState('90');
  const [sel, setSel] = useState(DEFAULT_SEL);

  const toggle = (k) => setSel(s => ({ ...s, [k]: !s[k] }));
  const selCount = Object.values(sel).filter(Boolean).length;

  const genMut = useMutation({
    mutationFn: (d) => base44.functions.invoke('generateEnhancedReport', d).then(r => r.data),
    onSuccess: (data) => {
      if (fmt === 'pdf' && data.pdfBase64) {
        const blob = new Blob([Uint8Array.from(atob(data.pdfBase64), c => c.charCodeAt(0))], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = data.fileName || `health-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`; a.click(); URL.revokeObjectURL(url);
        toast.success('📄 PDF report downloaded!');
      } else if (fmt === 'json') {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `health-data-${format(new Date(), 'yyyy-MM-dd')}.json`; a.click(); URL.revokeObjectURL(url);
        toast.success('💾 JSON exported!');
      } else {
        toast.success('Report generated!');
      }
    },
    onError: () => toast.error('Failed to generate report'),
  });

  const generate = () => {
    if (!activeProfileId) { toast.error('No profile selected'); return; }
    genMut.mutate({ profileId: activeProfileId, dateRange: period, reportType: style, language: lang, format: fmt, includeOptions: sel });
  };

  return (
    <div className="bento-page">
      <div className="bento-header">
        <h1 className="bento-title">Export Reports</h1>
        <p className="bento-subtitle">{activeProfile?.full_name || 'Your'} health data export</p>
      </div>

      {/* Format selector */}
      <div className="mb-5">
        <p className="text-[10px] font-black uppercase tracking-widest mb-2 px-1" style={{ color: 'var(--hf-text-muted)' }}>Export Format</p>
        <div className="grid grid-cols-3 gap-2">
          {FORMATS.map(({ v, icon: Icon, label, desc, color }) => (
            <button key={v} onClick={() => setFmt(v)}
              className="p-4 rounded-2xl text-left transition-all active-press flex flex-col gap-2"
              style={{ background: fmt === v ? `${color}18` : 'var(--hf-surface)', border: fmt === v ? `1.5px solid ${color}55` : '1px solid var(--hf-border)' }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: fmt === v ? `${color}22` : 'var(--hf-surface-2)' }}>
                <Icon size={16} style={{ color: fmt === v ? color : 'var(--hf-text-muted)' }} />
              </div>
              <div>
                <p className="text-xs font-bold" style={{ color: fmt === v ? color : 'var(--hf-text)' }}>{label}</p>
                <p className="text-[9px]" style={{ color: 'var(--hf-text-muted)' }}>{desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Options row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
        <div className="space-y-1.5">
          <Label className="text-[10px] font-black uppercase tracking-wider" style={{ color: 'var(--hf-text-muted)' }}>Time Period</Label>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="h-10 rounded-xl text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{PERIODS.map(o => <SelectItem key={o.v} value={o.v} className="text-xs">{o.l}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        {fmt === 'pdf' && (
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase tracking-wider" style={{ color: 'var(--hf-text-muted)' }}>Style</Label>
            <Select value={style} onValueChange={setStyle}>
              <SelectTrigger className="h-10 rounded-xl text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="doctor" className="text-xs">🩺 Healthcare Provider</SelectItem>
                <SelectItem value="family" className="text-xs">👨‍👩‍👧 Family & Friends</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        {fmt === 'pdf' && style === 'family' && (
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase tracking-wider" style={{ color: 'var(--hf-text-muted)' }}>Language</Label>
            <Select value={lang} onValueChange={setLang}>
              <SelectTrigger className="h-10 rounded-xl text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="english" className="text-xs">English</SelectItem>
                <SelectItem value="hindi" className="text-xs">हिन्दी</SelectItem>
                <SelectItem value="telugu" className="text-xs">తెలుగు</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Data selection */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2 px-1">
          <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--hf-text-muted)' }}>Include Data <span style={{ color: 'var(--hf-text)' }}>({selCount}/{DATA_OPTIONS.length})</span></p>
          <div className="flex gap-2">
            <button onClick={() => setSel(Object.keys(sel).reduce((a, k) => ({ ...a, [k]: true }), {}))} className="text-[9px] font-black px-2 py-0.5 rounded-lg" style={{ background: 'rgba(215,245,118,0.1)', color: 'var(--hf-lemon-strong)' }}>All</button>
            <button onClick={() => setSel({ ...DEFAULT_SEL, medications: false, adherence: false, vitals: false, labs: false, documents: false, insights: false, wellness: false })} className="text-[9px] font-black px-2 py-0.5 rounded-lg" style={{ background: 'var(--hf-surface-2)', color: 'var(--hf-text-muted)' }}>Clear</button>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {DATA_OPTIONS.map(opt => (
            <button key={opt.key} onClick={() => toggle(opt.key)}
              className="flex items-center gap-2.5 p-3 rounded-xl text-left transition-all active-press"
              style={{ background: sel[opt.key] ? `${opt.color}12` : 'var(--hf-surface)', border: sel[opt.key] ? `1.5px solid ${opt.color}44` : '1px solid var(--hf-border)' }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-base" style={{ background: sel[opt.key] ? `${opt.color}22` : 'var(--hf-surface-2)' }}>
                {sel[opt.key] ? <CheckCircle size={14} style={{ color: opt.color }} /> : <span>{opt.emoji}</span>}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold truncate" style={{ color: sel[opt.key] ? opt.color : 'var(--hf-text)' }}>{opt.label}</p>
                <p className="text-[8px] truncate" style={{ color: 'var(--hf-text-muted)' }}>{opt.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Generate */}
      <Button onClick={generate} disabled={genMut.isPending || !activeProfileId}
        className="w-full h-14 rounded-2xl font-bold text-base active-press" style={{ background: '#d7f576', color: '#0a1200' }}>
        {genMut.isPending
          ? <><Loader2 size={18} className="mr-2 animate-spin" />Generating Report…</>
          : <><Download size={18} className="mr-2" />Generate & Download {fmt.toUpperCase()}</>}
      </Button>
      <p className="text-[9px] text-center mt-2" style={{ color: 'var(--hf-text-muted)' }}>🔒 All data is encrypted and secure. Only you can access it.</p>
    </div>
  );
}

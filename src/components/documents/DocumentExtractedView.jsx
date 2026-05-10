// @ts-nocheck
/**
 * DocumentExtractedView — Tabbed viewer for extracted medical document data.
 * Tabs: Provider Details | AI Summary | Lab Results | Medications | Original File
 * Works as a fullscreen overlay on mobile (bottom sheet) and dialog on desktop.
 */
import React, { useState } from 'react';
import { format } from 'date-fns';
import {
  X, Download, Share2, FileText, FlaskConical, Pill, Image as ImageIcon,
  FileHeart, Stethoscope, Shield, FilePlus, Building2, User, Phone,
  MapPin, Mail, Globe, Calendar, CalendarCheck, Brain,
  ExternalLink, Activity, Maximize2, Minimize2, CheckCircle
} from 'lucide-react';
import jsPDF from 'jspdf';
import ResponsiveOverlay from '@/components/ui/responsive-overlay';
import { MarkdownContent } from '@/components/ui/markdown-content';
import { useSwipeTabs } from '@/components/utils/useSwipeTabs';

const DOC_TYPE_CONFIG = {
  lab_report:        { label: 'Lab Report',        icon: FlaskConical, color: 'var(--hf-lavender-strong)', tc: '#1a0a40' },
  prescription:      { label: 'Prescription',       icon: Pill,         color: 'var(--hf-peach-strong)', tc: '#3d1a00' },
  imaging:           { label: 'Imaging',             icon: ImageIcon,    color: 'var(--hf-sky-strong)', tc: '#0a1240' },
  discharge_summary: { label: 'Discharge Summary',  icon: FileHeart,    color: 'var(--hf-coral-strong)', tc: '#3d0000' },
  consultation:      { label: 'Consultation',        icon: Stethoscope,  color: 'var(--hf-mint-strong)', tc: '#003d20' },
  vaccination:       { label: 'Vaccination',         icon: Shield,       color: '#e8d5ff', tc: '#2d0a4a' },
  insurance:         { label: 'Insurance',           icon: Shield,       color: 'var(--hf-lemon-strong)', tc: '#0a1200' },
  other:             { label: 'Document',            icon: FilePlus,     color: 'var(--hf-peach-strong)', tc: '#3d1a00' },
};

function InfoRow({ icon: Icon, label, value, color = '#d7f576' }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2.5 border-b last:border-0" style={{ borderColor: 'var(--hf-border)' }}>
      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: color + '22' }}>
        <Icon size={13} style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--hf-text-muted)' }}>{label}</p>
        <p className="text-sm font-semibold mt-0.5 break-words" style={{ color: 'var(--hf-text)' }}>{value}</p>
      </div>
    </div>
  );
}

function LabResultRow({ lab }) {
  const flag = lab.flag || (lab.reference_low != null && lab.value < lab.reference_low ? 'low' : lab.reference_high != null && lab.value > lab.reference_high ? 'high' : 'normal');
  const flagColors = { low: '#9bb4ff', normal: '#a8e6cf', high: '#f28c8c' };
  const color = flagColors[flag] || '#a8e6cf';
  const pct = lab.reference_low != null && lab.reference_high != null
    ? Math.max(0, Math.min(100, ((lab.value - lab.reference_low) / (lab.reference_high - lab.reference_low)) * 100))
    : null;
  return (
    <div className="py-3 border-b last:border-0" style={{ borderColor: 'var(--hf-border)' }}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-bold" style={{ color: 'var(--hf-text)' }}>{lab.name}</span>
        <div className="flex items-center gap-2">
          <span className="text-sm font-black" style={{ color }}>{lab.value} <span className="text-[10px] font-normal" style={{ color: 'var(--hf-text-muted)' }}>{lab.unit}</span></span>
          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: color + '22', color }}>{flag.toUpperCase()}</span>
        </div>
      </div>
      {pct !== null && (
        <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--hf-surface-2)' }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
        </div>
      )}
      {lab.reference_low != null && lab.reference_high != null && (
        <p className="text-[9px] mt-0.5" style={{ color: 'var(--hf-text-muted)' }}>Normal: {lab.reference_low} – {lab.reference_high} {lab.unit}</p>
      )}
    </div>
  );
}

function MedRow({ med }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b last:border-0" style={{ borderColor: 'var(--hf-border)' }}>
      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(247,201,163,0.2)' }}>
        <Pill size={14} style={{ color: 'var(--hf-peach-strong)' }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold" style={{ color: 'var(--hf-text)' }}>{med.name}</p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--hf-text-muted)' }}>
          {[med.dosage, med.frequency?.replace(/_/g, ' '), med.duration].filter(Boolean).join(' · ')}
        </p>
        {med.purpose && <p className="text-[10px] mt-0.5" style={{ color: 'var(--hf-peach-strong)' }}>For: {med.purpose}</p>}
        {med.instructions && <p className="text-[10px] mt-0.5 italic" style={{ color: 'var(--hf-text-muted)' }}>{med.instructions}</p>}
      </div>
    </div>
  );
}

// Clean markdown text for PDF (strip markdown symbols)
function stripMarkdown(text) {
  if (!text) return '';
  return text
    .replace(/#{1,6}\s+/g, '')
    .replace(/\*{1,2}([^*]+)\*{1,2}/g, '$1')
    .replace(/_{1,2}([^_]+)_{1,2}/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^\s*[-*+]\s+/gm, '• ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[📍📞✉️🌐🎓🏥📋]/g, '')
    .trim();
}

function generatePDF(doc) {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = 210;
  const margin = 18;
  const contentW = pageW - margin * 2;
  let y = margin;

  const checkPage = (needed = 8) => {
    if (y + needed > 278) { pdf.addPage(); y = margin; }
  };

  const addText = (text, size, bold, color = [40, 40, 60]) => {
    pdf.setFontSize(size);
    pdf.setFont('helvetica', bold ? 'bold' : 'normal');
    pdf.setTextColor(...color);
    const lines = pdf.splitTextToSize(String(text || '').replace(/\n+/g, ' ').trim(), contentW);
    lines.forEach(line => {
      checkPage(size * 0.5 + 1);
      pdf.text(line, margin, y);
      y += size * 0.5 + 0.5;
    });
    y += 1;
  };

  const addSection = (title, color = [50, 80, 10]) => {
    checkPage(12);
    y += 2;
    pdf.setFillColor(230, 245, 200);
    pdf.roundedRect(margin, y - 2, contentW, 9, 2, 2, 'F');
    pdf.setFontSize(10); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(...color);
    pdf.text(title, margin + 2, y + 4);
    y += 12;
  };

  // Header bar
  pdf.setFillColor(13, 13, 20);
  pdf.rect(0, 0, 210, 36, 'F');
  pdf.setFontSize(18); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(215, 245, 118);
  pdf.text('HealthFlux', margin, 16);
  pdf.setFontSize(9); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(180, 180, 210);
  pdf.text('AI-Extracted Medical Document Report', margin, 24);
  pdf.setFontSize(8); pdf.setTextColor(120, 120, 150);
  pdf.text(`Generated: ${format(new Date(), 'dd MMM yyyy, hh:mm a')}`, margin, 31);
  y = 46;

  addText(doc.title || 'Medical Document', 15, true, [20, 20, 40]);
  const typeConf = DOC_TYPE_CONFIG[doc.document_type] || DOC_TYPE_CONFIG.other;
  addText(typeConf.label.toUpperCase(), 8, false, [120, 120, 150]);
  y += 2;

  addSection('Document Information');
  if (doc.document_date) addText(`Date: ${format(new Date(doc.document_date), 'dd MMMM yyyy')}`, 10, false);
  addText(`Uploaded: ${format(new Date(doc.created_date || new Date()), 'dd MMMM yyyy')}`, 10, false);
  if (doc.facility_name) addText(`Facility: ${doc.facility_name}`, 10, false);
  if (doc.doctor_name) addText(`Doctor: Dr. ${doc.doctor_name}`, 10, false);

  if (doc.ai_summary) {
    addSection('AI Summary');
    const clean = stripMarkdown(doc.ai_summary);
    clean.split('\n').filter(Boolean).forEach(line => addText(line, 9, false, [50, 50, 70]));
  }

  if (doc.key_findings?.length > 0) {
    addSection('Key Findings');
    doc.key_findings.forEach(f => addText(`• ${stripMarkdown(f)}`, 9, false, [50, 50, 80]));
  }

  if (doc.action_items?.length > 0) {
    addSection('Recommended Actions');
    doc.action_items.forEach(a => addText(`→ ${stripMarkdown(a)}`, 9, false, [30, 80, 30]));
  }

  if (doc.extracted_lab_results?.length > 0) {
    addSection('Lab Results');
    doc.extracted_lab_results.forEach(lab => {
      const flag = lab.flag || 'normal';
      const fc = flag === 'high' ? [180, 40, 40] : flag === 'low' ? [40, 80, 180] : [30, 120, 60];
      addText(`${lab.name}: ${lab.value} ${lab.unit || ''} [${flag.toUpperCase()}]${lab.reference_low != null ? ` (Ref: ${lab.reference_low}–${lab.reference_high})` : ''}`, 9, false, fc);
    });
  }

  if (doc.extracted_medications?.length > 0) {
    addSection('Medications');
    doc.extracted_medications.forEach(med => {
      addText(`${med.name} — ${med.dosage || ''} ${med.frequency?.replace(/_/g, ' ') || ''}${med.duration ? ` for ${med.duration}` : ''}`, 9, false);
      if (med.instructions) addText(`  ↳ ${med.instructions}`, 8, false, [120, 100, 60]);
    });
  }

  if (doc.extracted_vitals?.length > 0) {
    addSection('Vital Signs');
    doc.extracted_vitals.forEach(v => {
      const val = v.type === 'blood_pressure' ? `${v.systolic}/${v.diastolic} mmHg` : `${v.value} ${v.unit || ''}`;
      addText(`${(v.type || '').replace(/_/g, ' ')}: ${val}`, 9, false);
    });
  }

  // Footer
  const totalPages = pdf.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFontSize(7); pdf.setTextColor(150, 150, 170);
    pdf.text('This report is AI-generated for informational purposes only. Always consult a qualified healthcare professional.', margin, 290);
    pdf.text(`Page ${i} of ${totalPages}`, pageW - margin, 290, { align: 'right' });
  }
  pdf.save(`${(doc.title || 'medical-document').replace(/[^a-zA-Z0-9]/g, '-')}.pdf`);
}

// ── Styled markdown renderer (no ### or *** leaking through) ──────────
// ── File Preview with enlarge option ─────────────────────────────────
function FilePreview({ doc }) {
  const [enlarged, setEnlarged] = useState(false);

  if (!doc.file_url) return (
    <div className="flex items-center justify-center py-12 rounded-2xl" style={{ background: 'var(--hf-surface-2)', border: '1px dashed var(--hf-border)' }}>
      <p className="text-xs" style={{ color: 'var(--hf-text-muted)' }}>No file attached</p>
    </div>
  );

  const isImage = doc.file_type?.includes('image');
  const isPDF = doc.file_type?.includes('pdf') || doc.file_url?.endsWith('.pdf');

  return (
    <>
      <div className="relative rounded-2xl overflow-hidden" style={{ border: '1px solid var(--hf-border)' }}>
        {isImage ? (
          <img src={doc.file_url} alt={doc.title} className="w-full object-contain rounded-2xl" style={{ maxHeight: 300 }} />
        ) : isPDF ? (
          <div style={{ height: 320 }}>
            <iframe src={doc.file_url} className="w-full h-full border-0 rounded-2xl" title="Document preview" />
          </div>
        ) : (
          <button onClick={() => window.open(doc.file_url, '_blank')}
            className="w-full py-4 rounded-2xl text-xs font-bold flex items-center justify-center gap-2"
            style={{ background: 'rgba(215,245,118,0.1)', color: 'var(--hf-lemon-strong)', border: '1px dashed rgba(215,245,118,0.3)' }}>
            <ExternalLink size={13} /> Open File
          </button>
        )}
        {/* Enlarge button */}
        {(isImage || isPDF) && (
          <button onClick={() => setEnlarged(true)}
            aria-label="Enlarge document preview"
            className="absolute top-2 right-2 w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-90"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
            <Maximize2 size={14} style={{ color: '#fff' }} />
          </button>
        )}
      </div>

      {/* Enlarged overlay */}
      {enlarged && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(8px)' }}
          onClick={() => setEnlarged(false)}>
          <div className="relative w-full max-w-4xl max-h-[90dvh] flex flex-col" onClick={e => e.stopPropagation()}>
            <button onClick={() => setEnlarged(false)}
              aria-label="Close enlarged view"
              className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.2)' }}>
              <Minimize2 size={16} style={{ color: '#fff' }} />
            </button>
            {isImage ? (
              <img src={doc.file_url} alt={doc.title} className="w-full h-full object-contain rounded-2xl" style={{ maxHeight: '90dvh' }} />
            ) : (
              <iframe src={doc.file_url} className="w-full rounded-2xl border-0" style={{ height: '85dvh' }} title="Document enlarged" />
            )}
          </div>
        </div>
      )}
    </>
  );
}

// ── Tab definitions ───────────────────────────────────────────────────
function buildTabs(doc) {
  const tabs = [];
  tabs.push({ id: 'provider', label: 'Provider', icon: Building2 });
  tabs.push({ id: 'summary', label: 'AI Summary', icon: Brain });
  if (doc.extracted_lab_results?.length > 0) tabs.push({ id: 'labs', label: `Labs (${doc.extracted_lab_results.length})`, icon: FlaskConical });
  if (doc.extracted_medications?.length > 0) tabs.push({ id: 'meds', label: `Meds (${doc.extracted_medications.length})`, icon: Pill });
  if (doc.extracted_vitals?.length > 0) tabs.push({ id: 'vitals', label: 'Vitals', icon: Activity });
  tabs.push({ id: 'file', label: 'Original File', icon: FileText });
  return tabs;
}

// ── Main viewer content ───────────────────────────────────────────────
function ViewerContent({ doc, onClose }) {
  const typeConf = DOC_TYPE_CONFIG[doc.document_type] || DOC_TYPE_CONFIG.other;
  const TypeIcon = typeConf.icon;
  const tabs = buildTabs(doc);
  const [activeTab, setActiveTab] = useState(tabs[0]?.id || 'provider');
  const swipeHandlers = useSwipeTabs(
    tabs.map((tab) => tab.id),
    activeTab,
    setActiveTab,
    40
  );

  // Clean summary — strip provider block if appended
  const summaryParts = (doc.ai_summary || '').split('\n\n📋 Provider Details:\n');
  const mainSummary = summaryParts[0]?.trim();
  const providerBlock = summaryParts[1] || '';

  const handleShare = async () => {
    const text = `${doc.title}\n${doc.facility_name ? `Facility: ${doc.facility_name}\n` : ''}${doc.document_date ? `Date: ${format(new Date(doc.document_date), 'dd MMM yyyy')}\n` : ''}${mainSummary ? `\nSummary: ${stripMarkdown(mainSummary)}` : ''}`;
    if (navigator.share) {
      try { await navigator.share({ title: doc.title, text }); }
      catch { await navigator.clipboard.writeText(text); }
    } else {
      await navigator.clipboard.writeText(text);
    }
  };

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--hf-bg)' }}>
      {/* ── Header ── */}
      <div className="flex-shrink-0 px-4 pt-4 pb-0" style={{ background: 'var(--hf-surface)', borderBottom: '1px solid var(--hf-border)' }}>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: typeConf.color + '30' }}>
              <TypeIcon size={18} style={{ color: typeConf.color }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: typeConf.color }}>{typeConf.label}</p>
              <h2 className="text-sm font-black leading-tight mt-0.5 line-clamp-2" style={{ color: 'var(--hf-text)' }}>{doc.title}</h2>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close document viewer"
            className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--hf-surface-2)' }}>
            <X size={14} style={{ color: 'var(--hf-text-muted)' }} />
          </button>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 mb-3">
          <button onClick={() => generatePDF(doc)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-[10px] text-xs font-bold active:scale-95 transition-transform"
            style={{ background: 'rgba(215,245,118,0.12)', color: 'var(--hf-lemon-strong)', border: '1px solid rgba(215,245,118,0.25)' }}>
            <Download size={12} /> Export PDF
          </button>
          <button onClick={handleShare}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-[10px] text-xs font-bold active:scale-95 transition-transform"
            style={{ background: 'rgba(201,187,255,0.12)', color: 'var(--hf-lavender-strong)', border: '1px solid rgba(201,187,255,0.25)' }}>
            <Share2 size={12} /> Share
          </button>
          {doc.file_url && (
            <button onClick={() => window.open(doc.file_url, '_blank')} aria-label="Open original file"
              className="min-h-11 min-w-11 py-2 px-3 rounded-[10px] text-xs font-bold active:scale-95 transition-transform"
              style={{ background: 'var(--hf-surface-2)', color: 'var(--hf-text-muted)', border: '1px solid var(--hf-border)' }}>
              <ExternalLink size={12} />
            </button>
          )}
        </div>

        {/* Horizontal tab chips */}
        <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide" role="tablist" aria-label="Document sections">
          {tabs.map(tab => {
            const TabIcon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap flex-shrink-0 transition-all active:scale-95"
                style={{
                  background: isActive ? '#d7f576' : 'var(--hf-surface-2)',
                  color: isActive ? '#0a1200' : 'var(--hf-text-muted)',
                  border: isActive ? 'none' : '1px solid var(--hf-border)',
                }}>
                <TabIcon size={11} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Tab body ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3" role="tabpanel" {...swipeHandlers}>

        {/* Provider Details */}
        {activeTab === 'provider' && (
          <div className="space-y-0">
            {/* Dates in provider tab */}
            <div className="rounded-2xl p-4 mb-3" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
              <p className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: 'var(--hf-text-muted)' }}>Document Dates</p>
              {doc.document_date && (
                <InfoRow icon={Calendar} label="Document Date" value={format(new Date(doc.document_date), 'dd MMMM yyyy')} color="#d7f576" />
              )}
              <InfoRow
                icon={CalendarCheck}
                label="Uploaded"
                value={doc.created_date ? format(new Date(doc.created_date), 'dd MMM yyyy, h:mm a') : 'Pending backend timestamp'}
                color="#9bb4ff"
              />
              <InfoRow
                icon={CalendarCheck}
                label="Generated / Processed"
                value={doc.updated_date ? format(new Date(doc.updated_date), 'dd MMM yyyy, h:mm a') : 'Pending backend timestamp'}
                color="#c9bbff"
              />
            </div>

            <div className="rounded-2xl p-4" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
              <p className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: 'var(--hf-text-muted)' }}>Provider Information</p>
              <InfoRow icon={Building2} label="Facility / Hospital" value={doc.facility_name} color="#9bb4ff" />
              <InfoRow icon={User} label="Doctor / Physician" value={doc.doctor_name ? `Dr. ${doc.doctor_name}` : null} color="#c9bbff" />
              {providerBlock && providerBlock.split('\n').filter(Boolean).map((line, i) => {
                const clean = line.replace(/[📍📞✉️🌐🎓🏥]/g, '').trim();
                if (!clean || clean === doc.facility_name || clean.includes(doc.doctor_name || '___')) return null;
                const isAddr = clean.toLowerCase().includes('address') || (clean.includes(',') && !clean.includes(':'));
                const isPhone = clean.toLowerCase().includes('phone') || clean.toLowerCase().includes('tel');
                const isEmail = clean.includes('@');
                const isWeb = clean.includes('http') || clean.includes('www');
                const RowIcon = isAddr ? MapPin : isPhone ? Phone : isEmail ? Mail : isWeb ? Globe : Building2;
                const parts = clean.split(':');
                return <InfoRow key={i} icon={RowIcon} label={parts[0]?.trim() || 'Detail'} value={parts.slice(1).join(':').trim() || clean} color="#9bb4ff" />;
              })}
              {doc.notes && <InfoRow icon={FileText} label="Notes" value={doc.notes} color="#d7f576" />}
              {!doc.facility_name && !doc.doctor_name && !providerBlock && (
                <p className="text-xs py-3 text-center" style={{ color: 'var(--hf-text-muted)' }}>No provider details extracted</p>
              )}
            </div>

            {/* Tags */}
            {(doc.user_tags?.length > 0 || doc.ai_tags?.length > 0) && (
              <div className="rounded-2xl p-4 mt-3" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
                <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: 'var(--hf-text-muted)' }}>Tags</p>
                <div className="flex flex-wrap gap-1.5">
                  {doc.user_tags?.map((tag, i) => (
                    <span key={`u-${i}`} className="text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1"
                      style={{ background: 'rgba(215,245,118,0.15)', color: 'var(--hf-lemon-strong)' }}>
                      <CheckCircle size={9} /> {tag}
                    </span>
                  ))}
                  {doc.ai_tags?.filter(t => !doc.user_tags?.includes(t)).map((tag, i) => (
                    <span key={`a-${i}`} className="text-[10px] font-bold px-2.5 py-1 rounded-full opacity-70"
                      style={{ background: 'rgba(201,187,255,0.1)', color: 'var(--hf-lavender-strong)' }}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* AI Summary */}
        {activeTab === 'summary' && (
          <div className="space-y-3">
            {mainSummary ? (
              <div className="rounded-2xl p-4" style={{ background: 'rgba(201,187,255,0.07)', border: '1px solid rgba(201,187,255,0.15)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <Brain size={14} style={{ color: 'var(--hf-lavender-strong)' }} />
                  <p className="text-xs font-black" style={{ color: 'var(--hf-lavender-strong)' }}>AI Summary</p>
                </div>
                <MarkdownContent content={mainSummary} />
              </div>
            ) : (
              <div className="flex items-center justify-center py-12 rounded-2xl" style={{ background: 'var(--hf-surface)', border: '1px dashed var(--hf-border)' }}>
                <p className="text-xs" style={{ color: 'var(--hf-text-muted)' }}>No AI summary available yet</p>
              </div>
            )}
            {doc.key_findings?.length > 0 && (
              <div className="rounded-2xl p-4" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
                <p className="text-xs font-black mb-3" style={{ color: 'var(--hf-lavender-strong)' }}>🔍 Key Findings</p>
                <ul className="space-y-2">
                  {doc.key_findings.map((f, i) => (
                    <li key={i} className="flex gap-2 text-sm" style={{ color: 'var(--hf-text)' }}>
                      <span className="flex-shrink-0" style={{ color: 'var(--hf-lavender-strong)' }}>•</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {doc.action_items?.length > 0 && (
              <div className="rounded-2xl p-4" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
                <p className="text-xs font-black mb-3" style={{ color: 'var(--hf-lemon-strong)' }}>✓ Recommended Actions</p>
                <ul className="space-y-2">
                  {doc.action_items.map((item, i) => (
                    <li key={i} className="flex gap-2 text-sm" style={{ color: 'var(--hf-text)' }}>
                      <span className="flex-shrink-0" style={{ color: 'var(--hf-lemon-strong)' }}>→</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {doc.ai_summary_detailed && (
              <div className="rounded-2xl p-4" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
                <p className="text-xs font-black mb-3" style={{ color: 'var(--hf-lavender-strong)' }}>Detailed Analysis</p>
                <MarkdownContent content={doc.ai_summary_detailed} />
              </div>
            )}
          </div>
        )}

        {/* Lab Results */}
        {activeTab === 'labs' && (
          <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
            <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--hf-border)', background: 'rgba(201,187,255,0.05)' }}>
              <p className="text-xs font-black" style={{ color: 'var(--hf-lavender-strong)' }}>Lab Results ({doc.extracted_lab_results?.length})</p>
            </div>
            <div className="px-4">
              {doc.extracted_lab_results?.map((lab, i) => <LabResultRow key={i} lab={lab} />)}
            </div>
          </div>
        )}

        {/* Medications */}
        {activeTab === 'meds' && (
          <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
            <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--hf-border)', background: 'rgba(247,201,163,0.05)' }}>
              <p className="text-xs font-black" style={{ color: 'var(--hf-peach-strong)' }}>Medications ({doc.extracted_medications?.length})</p>
            </div>
            <div className="px-4">
              {doc.extracted_medications?.map((med, i) => <MedRow key={i} med={med} />)}
            </div>
          </div>
        )}

        {/* Vitals */}
        {activeTab === 'vitals' && (
          <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
            <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--hf-border)', background: 'rgba(168,230,207,0.05)' }}>
              <p className="text-xs font-black" style={{ color: 'var(--hf-mint-strong)' }}>Vital Signs ({doc.extracted_vitals?.length})</p>
            </div>
            <div className="px-4">
              {doc.extracted_vitals?.map((v, i) => {
                const val = v.type === 'blood_pressure' ? `${v.systolic}/${v.diastolic} mmHg` : `${v.value} ${v.unit || ''}`;
                return (
                  <div key={i} className="flex items-center justify-between py-3 border-b last:border-0" style={{ borderColor: 'var(--hf-border)' }}>
                    <span className="text-xs font-semibold capitalize" style={{ color: 'var(--hf-text)' }}>{(v.type || '').replace(/_/g, ' ')}</span>
                    <span className="text-sm font-black" style={{ color: 'var(--hf-mint-strong)' }}>{val}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Original File */}
        {activeTab === 'file' && <FilePreview doc={doc} />}

        <div className="h-4" />
      </div>
    </div>
  );
}

export default function DocumentExtractedView({ doc, open, onClose }) {
  if (!doc) return null;
  return (
    <ResponsiveOverlay
      open={open}
      onOpenChange={(value) => {
        if (!value) {
          onClose();
        }
      }}
      hideHeader
      desktopClassName="w-[95vw] max-w-3xl p-0"
      mobileClassName="inset-0 mt-[3dvh] max-h-none rounded-t-[28px] border-t border-[var(--hf-border)] bg-[var(--hf-bg)]"
    >
      <ViewerContent doc={doc} onClose={onClose} />
    </ResponsiveOverlay>
  );
}

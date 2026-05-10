// @ts-nocheck
import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useActiveProfile } from '@/components/ActiveProfileContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Brain, Loader2, AlertTriangle, CheckCircle, FileImage, ChevronDown, ChevronUp, Download, Salad, Stethoscope, TrendingUp, Eye } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';

const IMAGE_TYPES = [
  { value: 'xray', label: 'X-Ray' },
  { value: 'ct_scan', label: 'CT Scan' },
  { value: 'mri', label: 'MRI' },
  { value: 'ultrasound', label: 'Ultrasound' },
  { value: 'other', label: 'Other' },
];

const RISK_CONFIG = {
  low: { color: 'var(--hf-mint-strong)', bg: 'rgba(168,230,207,0.15)', label: 'Low Risk' },
  moderate: { color: 'var(--hf-peach-strong)', bg: 'rgba(247,201,163,0.15)', label: 'Moderate Risk' },
  high: { color: 'var(--hf-coral-strong)', bg: 'rgba(242,140,140,0.15)', label: 'High Risk' },
  critical: { color: '#ff4444', bg: 'rgba(255,68,68,0.15)', label: 'Critical' },
};

function ResultCard({ result }) {
  const [expanded, setExpanded] = useState(false);
  const risk = RISK_CONFIG[result.risk_level] || RISK_CONFIG.low;

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('AI Medical Imaging Report', 20, 20);
    doc.setFontSize(11);
    doc.text(`Image Type: ${result.image_type?.replace('_', ' ').toUpperCase()}`, 20, 35);
    doc.text(`Risk Level: ${result.risk_level?.toUpperCase()}`, 20, 45);
    doc.text(`Confidence: ${Math.round((result.ai_confidence || 0) * 100)}%`, 20, 55);
    doc.setFontSize(13);
    doc.text('Summary for Patient:', 20, 70);
    doc.setFontSize(10);
    const summaryLines = doc.splitTextToSize(result.plain_summary || '', 170);
    doc.text(summaryLines, 20, 80);
    let y = 80 + summaryLines.length * 6 + 10;
    doc.setFontSize(13);
    doc.text('Clinical Findings:', 20, y);
    doc.setFontSize(10);
    const clinicalLines = doc.splitTextToSize(result.clinical_findings || '', 170);
    doc.text(clinicalLines, 20, y + 10);
    y += clinicalLines.length * 6 + 20;
    if (result.anomalies?.length) {
      doc.setFontSize(13);
      doc.text('Anomalies Detected:', 20, y);
      doc.setFontSize(10);
      result.anomalies.forEach((a, i) => { doc.text(`• ${a}`, 25, y + 10 + i * 7); });
      y += result.anomalies.length * 7 + 20;
    }
    if (result.follow_up_actions?.length) {
      doc.setFontSize(13);
      doc.text('Recommended Actions:', 20, y);
      doc.setFontSize(10);
      result.follow_up_actions.forEach((a, i) => { doc.text(`• ${a}`, 25, y + 10 + i * 7); });
    }
    doc.setFontSize(8);
    doc.text('⚠️ This report is AI-generated and not a substitute for professional medical advice.', 20, 280);
    doc.save(`imaging-report-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="rounded-3xl overflow-hidden" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
      {/* Header */}
      <div className="p-4 flex items-center justify-between" style={{ background: risk.bg, borderBottom: '1px solid var(--hf-border)' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: risk.color + '33' }}>
            <Brain size={20} style={{ color: risk.color }} />
          </div>
          <div>
            <p className="font-bold text-sm" style={{ color: 'var(--hf-text)' }}>
              {result.image_type?.replace('_', ' ').toUpperCase()} Analysis
            </p>
            <p className="text-xs" style={{ color: 'var(--hf-text-muted)' }}>
              {result.scan_date || new Date(result.created_date).toLocaleDateString()} · {Math.round((result.ai_confidence || 0) * 100)}% confidence
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: risk.color, color: '#0a1200' }}>{risk.label}</span>
          <button onClick={exportPDF} className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:opacity-80" style={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)' }}>
            <Download size={14} style={{ color: 'var(--hf-text-muted)' }} />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Patient Summary */}
        <div className="p-4 rounded-2xl" style={{ background: 'rgba(155,180,255,0.08)', border: '1px solid rgba(155,180,255,0.2)' }}>
          <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: 'var(--hf-sky-strong)' }}>
            <Eye size={10} className="inline mr-1" />Plain Language Summary
          </p>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--hf-text)' }}>{result.plain_summary}</p>
        </div>

        {/* Anomalies */}
        {result.anomalies?.length > 0 && (
          <div>
            <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: 'var(--hf-text-muted)' }}>
              <AlertTriangle size={10} className="inline mr-1" />Findings
            </p>
            <div className="space-y-1.5">
              {result.anomalies.map((a, i) => (
                <div key={i} className="flex items-start gap-2 p-2.5 rounded-xl" style={{ background: 'var(--hf-surface-2)' }}>
                  <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: risk.color }} />
                  <p className="text-sm" style={{ color: 'var(--hf-text)' }}>{a}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Diet Suggestions */}
        {result.diet_suggestions?.length > 0 && (
          <div>
            <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: 'var(--hf-mint-strong)' }}>
              <Salad size={10} className="inline mr-1" />Diet Suggestions
            </p>
            <div className="grid grid-cols-1 gap-1.5">
              {result.diet_suggestions.map((d, i) => (
                <div key={i} className="flex items-start gap-2 p-2.5 rounded-xl" style={{ background: 'rgba(168,230,207,0.08)', border: '1px solid rgba(168,230,207,0.15)' }}>
                  <CheckCircle size={14} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--hf-mint-strong)' }} />
                  <p className="text-sm" style={{ color: 'var(--hf-text)' }}>{d}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Follow-up */}
        {result.follow_up_actions?.length > 0 && (
          <div>
            <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: 'var(--hf-peach-strong)' }}>
              <Stethoscope size={10} className="inline mr-1" />Recommended Actions
            </p>
            <div className="space-y-1.5">
              {result.follow_up_actions.map((a, i) => (
                <div key={i} className="flex items-center gap-2 p-2.5 rounded-xl" style={{ background: 'rgba(247,201,163,0.08)', border: '1px solid rgba(247,201,163,0.15)' }}>
                  <span className="text-xs font-black w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#f7c9a3', color: '#3d1a00' }}>{i + 1}</span>
                  <p className="text-sm" style={{ color: 'var(--hf-text)' }}>{a}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Clinical findings toggle */}
        <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-between p-3 rounded-2xl transition-all" style={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)' }}>
          <span className="text-xs font-bold" style={{ color: 'var(--hf-text-muted)' }}><Stethoscope size={10} className="inline mr-1" />Clinical Findings (Provider View)</span>
          {expanded ? <ChevronUp size={14} style={{ color: 'var(--hf-text-muted)' }} /> : <ChevronDown size={14} style={{ color: 'var(--hf-text-muted)' }} />}
        </button>
        {expanded && (
          <div className="p-3 rounded-2xl text-sm leading-relaxed" style={{ background: 'var(--hf-surface-2)', color: 'var(--hf-text-muted)', fontFamily: 'monospace', fontSize: '11px' }}>
            {result.clinical_findings}
          </div>
        )}
      </div>

      <div className="px-4 pb-4">
        <p className="text-[10px] text-center p-2 rounded-xl" style={{ background: 'rgba(255,200,0,0.07)', color: 'rgba(255,200,0,0.7)' }}>
          ⚠️ AI-generated analysis. Not a substitute for professional medical diagnosis.
        </p>
      </div>
    </div>
  );
}

export default function AIMedicalImaging() {
  const { activeProfile } = useActiveProfile();
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [imageType, setImageType] = useState('xray');
  const [bodyPart, setBodyPart] = useState('');
  const [previewUrl, setPreviewUrl] = useState(null);
  const fileRef = useRef();
  const qc = useQueryClient();

  const { data: results = [], isLoading } = useQuery({
    queryKey: ['imaging-results', activeProfile?.id],
    queryFn: () => base44.entities.AIMedicalImagingResult.filter({ profile_id: activeProfile.id }, '-created_date', 20),
    enabled: !!activeProfile?.id,
  });

  const handleFile = async (file) => {
    if (!activeProfile?.id) { toast.error('Select a profile first'); return; }
    if (!file) return;
    setUploading(true);
    setPreviewUrl(URL.createObjectURL(file));
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setUploading(false);
      setAnalyzing(true);
      await base44.functions.invoke('analyzeMedicalImage', {
        profile_id: activeProfile.id,
        image_url: file_url,
        image_type: imageType,
        body_part: bodyPart,
        scan_date: new Date().toISOString().split('T')[0]
      });
      qc.invalidateQueries({ queryKey: ['imaging-results'] });
      toast.success('Analysis complete!');
      setPreviewUrl(null);
    } catch (err) {
      toast.error('Analysis failed: ' + err.message);
    } finally {
      setUploading(false);
      setAnalyzing(false);
    }
  };

  const onDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const riskData = results.filter(r => r.status === 'completed').map((r, i) => ({
    name: `Scan ${i + 1}`,
    confidence: Math.round((r.ai_confidence || 0) * 100),
    risk: r.risk_level === 'critical' ? 90 : r.risk_level === 'high' ? 70 : r.risk_level === 'moderate' ? 40 : 15,
  }));

  return (
    <div className="bento-page max-w-2xl mx-auto">
      <div className="bento-header">
        <h1 className="bento-title flex items-center gap-2">
          <Brain size={28} style={{ color: 'var(--hf-lavender-strong)' }} /> AI Medical Imaging
        </h1>
        <p className="bento-subtitle">Upload X-rays, CT scans & MRIs for AI analysis</p>
      </div>

      {/* Upload Zone */}
      <div
        onDrop={onDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => !uploading && !analyzing && fileRef.current?.click()}
        className="rounded-3xl p-6 mb-4 text-center cursor-pointer transition-all"
        style={{
          border: `2px dashed ${dragOver ? '#c9bbff' : 'var(--hf-border)'}`,
          background: dragOver ? 'rgba(201,187,255,0.08)' : 'var(--hf-surface)',
          minHeight: '180px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
        }}>
        <input ref={fileRef} type="file" accept="image/*,.dcm,.pdf" className="hidden" onChange={e => handleFile(e.target.files[0])} />

        {uploading || analyzing ? (
          <div className="space-y-3">
            <Loader2 size={36} className="animate-spin mx-auto" style={{ color: 'var(--hf-lavender-strong)' }} />
            <p className="text-sm font-bold" style={{ color: 'var(--hf-lavender-strong)' }}>
              {uploading ? 'Uploading image…' : 'AI analyzing scan…'}
            </p>
            <p className="text-xs" style={{ color: 'var(--hf-text-muted)' }}>This may take 15–30 seconds</p>
          </div>
        ) : previewUrl ? null : (
          <>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3" style={{ background: 'rgba(201,187,255,0.15)' }}>
              <FileImage size={28} style={{ color: 'var(--hf-lavender-strong)' }} />
            </div>
            <p className="text-sm font-bold mb-1" style={{ color: 'var(--hf-text)' }}>Drop image or tap to upload</p>
            <p className="text-xs" style={{ color: 'var(--hf-text-muted)' }}>Supports DICOM, JPG, PNG</p>
          </>
        )}
      </div>

      {/* Options Row */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <p className="text-xs font-bold mb-1.5" style={{ color: 'var(--hf-text-muted)' }}>Image Type</p>
          <div className="flex flex-wrap gap-1.5">
            {IMAGE_TYPES.map(t => (
              <button key={t.value} onClick={() => setImageType(t.value)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                style={{
                  background: imageType === t.value ? '#c9bbff' : 'var(--hf-surface-2)',
                  color: imageType === t.value ? '#1a0a40' : 'var(--hf-text-muted)',
                  border: '1px solid var(--hf-border)'
                }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-bold mb-1.5" style={{ color: 'var(--hf-text-muted)' }}>Body Part (optional)</p>
          <input
            value={bodyPart}
            onChange={e => setBodyPart(e.target.value)}
            placeholder="e.g. chest, knee, brain"
            className="w-full h-9 px-3 rounded-xl text-sm outline-none"
            style={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)', color: 'var(--hf-text)' }}
          />
        </div>
      </div>

      {/* Trend Chart */}
      {riskData.length > 1 && (
        <div className="rounded-3xl p-4 mb-4" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={14} style={{ color: 'var(--hf-lavender-strong)' }} />
            <p className="text-sm font-bold" style={{ color: 'var(--hf-text)' }}>Scan History Overview</p>
          </div>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={riskData}>
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--hf-text-muted)' }} />
              <YAxis hide />
              <Tooltip contentStyle={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)', borderRadius: 12, color: 'var(--hf-text)', fontSize: 11 }} />
              <Bar dataKey="confidence" radius={[6, 6, 0, 0]}>
                {riskData.map((_, i) => <Cell key={i} fill="#c9bbff" />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Results */}
      <div className="space-y-4">
        {isLoading && <div className="text-center py-8"><Loader2 size={24} className="animate-spin mx-auto" style={{ color: 'var(--hf-lavender-strong)' }} /></div>}
        {!isLoading && results.length === 0 && (
          <div className="text-center py-12 rounded-3xl" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
            <Brain size={36} className="mx-auto mb-3" style={{ color: 'var(--hf-text-muted)', opacity: 0.4 }} />
            <p className="text-sm font-bold" style={{ color: 'var(--hf-text-muted)' }}>No scans analyzed yet</p>
            <p className="text-xs mt-1" style={{ color: 'var(--hf-text-muted)', opacity: 0.6 }}>Upload your first medical image above</p>
          </div>
        )}
        {results.filter(r => r.status === 'processing').map(r => (
          <div key={r.id} className="flex items-center gap-3 p-4 rounded-3xl" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
            <Loader2 size={20} className="animate-spin" style={{ color: 'var(--hf-lavender-strong)' }} />
            <p className="text-sm" style={{ color: 'var(--hf-text-muted)' }}>Analyzing {r.image_type?.replace('_', ' ')}…</p>
          </div>
        ))}
        {results.filter(r => r.status === 'completed').map(r => <ResultCard key={r.id} result={r} />)}
      </div>
    </div>
  );
}

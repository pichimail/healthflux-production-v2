// @ts-nocheck
import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useActiveProfile } from '@/components/ActiveProfileContext';
import { Camera, Loader2, AlertTriangle, Clock, TrendingUp, Microscope, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';

const SEVERITY_CONFIG = {
  clear: { color: 'var(--hf-mint-strong)', label: 'Clear Skin', bg: 'rgba(168,230,207,0.12)' },
  mild: { color: 'var(--hf-lemon-strong)', label: 'Mild', bg: 'rgba(215,245,118,0.12)' },
  moderate: { color: 'var(--hf-peach-strong)', label: 'Moderate', bg: 'rgba(247,201,163,0.12)' },
  severe: { color: 'var(--hf-coral-strong)', label: 'Severe', bg: 'rgba(242,140,140,0.12)' },
};

const URGENCY_CONFIG = {
  no: { color: 'var(--hf-mint-strong)', label: 'No Doctor Visit Needed' },
  within_month: { color: 'var(--hf-lemon-strong)', label: 'See Doctor Within a Month' },
  within_week: { color: 'var(--hf-peach-strong)', label: 'See Doctor This Week' },
  immediately: { color: 'var(--hf-coral-strong)', label: '🚨 See Doctor Immediately' },
};

const BODY_PARTS = ['Face', 'Neck', 'Chest', 'Back', 'Arms', 'Hands', 'Legs', 'Feet', 'Scalp', 'Other'];

function SkinResultCard({ result }) {
  const sev = SEVERITY_CONFIG[result.severity] || SEVERITY_CONFIG.mild;
  const urgency = URGENCY_CONFIG[result.see_doctor_urgency] || URGENCY_CONFIG.no;

  return (
    <div className="rounded-3xl overflow-hidden mb-4" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
      <div className="p-4" style={{ background: sev.bg, borderBottom: '1px solid var(--hf-border)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={result.image_url} alt="skin" className="w-14 h-14 rounded-2xl object-cover" style={{ border: '2px solid var(--hf-border)' }} />
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-black px-2.5 py-1 rounded-full" style={{ background: sev.color, color: '#0a1200' }}>{sev.label}</span>
                {result.body_location && <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'var(--hf-surface-2)', color: 'var(--hf-text-muted)' }}>{result.body_location}</span>}
              </div>
              <p className="text-xs" style={{ color: 'var(--hf-text-muted)' }}>
                {format(new Date(result.analysis_date), 'MMM d, yyyy')} · {Math.round((result.ai_confidence || 0) * 100)}% confidence
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black" style={{ color: sev.color }}>{result.severity_score || 0}</p>
            <p className="text-[9px] font-bold" style={{ color: 'var(--hf-text-muted)' }}>/ 100</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Conditions */}
        {result.conditions_detected?.length > 0 && (
          <div>
            <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: 'var(--hf-text-muted)' }}>Detected Conditions</p>
            <div className="flex flex-wrap gap-2">
              {result.conditions_detected.map((c, i) => (
                <span key={i} className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: 'var(--hf-surface-2)', color: 'var(--hf-text)', border: '1px solid var(--hf-border)' }}>
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Triage Advice */}
        <div className="p-3 rounded-2xl" style={{ background: 'rgba(201,187,255,0.08)', border: '1px solid rgba(201,187,255,0.2)' }}>
          <p className="text-xs font-black uppercase tracking-widest mb-1.5" style={{ color: 'var(--hf-lavender-strong)' }}>Advice</p>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--hf-text)' }}>{result.triage_advice}</p>
        </div>

        {/* Doctor Urgency */}
        <div className="flex items-center gap-2 p-3 rounded-2xl" style={{ background: `${urgency.color}15`, border: `1px solid ${urgency.color}40` }}>
          <ShieldAlert size={16} style={{ color: urgency.color, flexShrink: 0 }} />
          <p className="text-sm font-bold" style={{ color: urgency.color }}>{urgency.label}</p>
        </div>

        {/* Skincare Routine */}
        {result.skincare_routine?.length > 0 && (
          <div>
            <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: 'var(--hf-mint-strong)' }}>Recommended Routine</p>
            <div className="space-y-1.5">
              {result.skincare_routine.map((step, i) => (
                <div key={i} className="flex items-start gap-2 p-2.5 rounded-xl" style={{ background: 'rgba(168,230,207,0.07)', border: '1px solid rgba(168,230,207,0.15)' }}>
                  <span className="text-xs font-black w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: '#a8e6cf', color: '#003d20' }}>{i + 1}</span>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--hf-text)' }}>{step}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ingredients to Avoid */}
        {result.ingredients_to_avoid?.length > 0 && (
          <div>
            <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: 'var(--hf-coral-strong)' }}>
              <AlertTriangle size={10} className="inline mr-1" />Avoid These Ingredients
            </p>
            <div className="flex flex-wrap gap-1.5">
              {result.ingredients_to_avoid.map((ing, i) => (
                <span key={i} className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: 'rgba(242,140,140,0.1)', color: 'var(--hf-coral-strong)', border: '1px solid rgba(242,140,140,0.2)' }}>
                  ✕ {ing}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Tracking Notes */}
        {result.tracking_notes && (
          <div className="p-3 rounded-2xl" style={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)' }}>
            <p className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: 'var(--hf-text-muted)' }}>
              <Clock size={10} className="inline mr-1" />Long-Term Tracking
            </p>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--hf-text-muted)' }}>{result.tracking_notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SkinAssessment() {
  const { activeProfile } = useActiveProfile();
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [bodyLocation, setBodyLocation] = useState('Face');
  const fileRef = useRef();
  const cameraRef = useRef();
  const qc = useQueryClient();

  const { data: analyses = [], isLoading } = useQuery({
    queryKey: ['skin-analyses', activeProfile?.id],
    queryFn: () => base44.entities.SkinAnalysis.filter({ profile_id: activeProfile.id }, '-analysis_date', 20),
    enabled: !!activeProfile?.id,
  });

  const handleFile = async (file) => {
    if (!activeProfile?.id) { toast.error('Select a profile first'); return; }
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setUploading(false);
      setAnalyzing(true);
      await base44.functions.invoke('analyzeSkinImage', {
        profile_id: activeProfile.id,
        image_url: file_url,
        body_location: bodyLocation,
      });
      qc.invalidateQueries({ queryKey: ['skin-analyses'] });
      toast.success('Skin analysis complete!');
    } catch (err) {
      toast.error('Analysis failed: ' + err.message);
    } finally {
      setUploading(false);
      setAnalyzing(false);
    }
  };

  const completed = analyses.filter(a => a.status === 'completed');
  const trendData = completed.slice(0, 8).reverse().map((a) => ({
    date: format(new Date(a.analysis_date), 'MMM d'),
    score: a.severity_score || 0,
  }));

  return (
    <div className="bento-page max-w-2xl mx-auto">
      <div className="bento-header">
        <h1 className="bento-title flex items-center gap-2">
          <Microscope size={28} style={{ color: 'var(--hf-mint-strong)' }} /> Skin Assessment
        </h1>
        <p className="bento-subtitle">AI-powered skin condition analysis & tracking</p>
      </div>

      {/* Upload Area */}
      <div className="rounded-3xl p-5 mb-4" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
        <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: 'var(--hf-text-muted)' }}>Body Location</p>
        <div className="flex flex-wrap gap-1.5 mb-4">
          {BODY_PARTS.map(p => (
            <button key={p} onClick={() => setBodyLocation(p)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
              style={{ background: bodyLocation === p ? '#a8e6cf' : 'var(--hf-surface-2)', color: bodyLocation === p ? '#003d20' : 'var(--hf-text-muted)', border: '1px solid var(--hf-border)' }}>
              {p}
            </button>
          ))}
        </div>

        {uploading || analyzing ? (
          <div className="flex flex-col items-center py-8 gap-3">
            <Loader2 size={32} className="animate-spin" style={{ color: 'var(--hf-mint-strong)' }} />
            <p className="text-sm font-bold" style={{ color: 'var(--hf-mint-strong)' }}>{uploading ? 'Uploading…' : 'AI analyzing skin…'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => cameraRef.current?.click()}
              className="flex flex-col items-center gap-2 p-5 rounded-2xl transition-all active:scale-95"
              style={{ background: 'rgba(168,230,207,0.08)', border: '2px dashed rgba(168,230,207,0.3)' }}>
              <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handleFile(e.target.files[0])} />
              <Camera size={28} style={{ color: 'var(--hf-mint-strong)' }} />
              <span className="text-xs font-bold" style={{ color: 'var(--hf-mint-strong)' }}>Use Camera</span>
            </button>
            <button onClick={() => fileRef.current?.click()}
              className="flex flex-col items-center gap-2 p-5 rounded-2xl transition-all active:scale-95"
              style={{ background: 'var(--hf-surface-2)', border: '2px dashed var(--hf-border)' }}>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => handleFile(e.target.files[0])} />
              <Camera size={28} style={{ color: 'var(--hf-text-muted)' }} />
              <span className="text-xs font-bold" style={{ color: 'var(--hf-text-muted)' }}>Upload Image</span>
            </button>
          </div>
        )}
      </div>

      {/* Severity Trend */}
      {trendData.length > 1 && (
        <div className="rounded-3xl p-4 mb-4" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={14} style={{ color: 'var(--hf-mint-strong)' }} />
            <p className="text-sm font-bold" style={{ color: 'var(--hf-text)' }}>Severity Trend</p>
            <span className="text-xs ml-auto" style={{ color: 'var(--hf-text-muted)' }}>Lower = better</span>
          </div>
          <ResponsiveContainer width="100%" height={100}>
            <LineChart data={trendData}>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--hf-text-muted)' }} />
              <YAxis domain={[0, 100]} hide />
              <Tooltip contentStyle={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)', borderRadius: 12, fontSize: 11 }} />
              <Line type="monotone" dataKey="score" stroke="#a8e6cf" strokeWidth={2} dot={{ fill: 'var(--hf-mint-strong)', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Results */}
      {isLoading && <div className="text-center py-8"><Loader2 size={24} className="animate-spin mx-auto" style={{ color: 'var(--hf-mint-strong)' }} /></div>}
      {!isLoading && analyses.length === 0 && (
        <div className="text-center py-12 rounded-3xl" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
          <Microscope size={36} className="mx-auto mb-3" style={{ color: 'var(--hf-text-muted)', opacity: 0.4 }} />
          <p className="text-sm font-bold" style={{ color: 'var(--hf-text-muted)' }}>No skin analyses yet</p>
          <p className="text-xs mt-1" style={{ color: 'var(--hf-text-muted)', opacity: 0.6 }}>Take a photo or upload an image above</p>
        </div>
      )}
      {analyses.filter(a => a.status === 'processing').map(a => (
        <div key={a.id} className="flex items-center gap-3 p-4 rounded-3xl mb-3" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
          <Loader2 size={20} className="animate-spin" style={{ color: 'var(--hf-mint-strong)' }} />
          <p className="text-sm" style={{ color: 'var(--hf-text-muted)' }}>Analyzing skin image…</p>
        </div>
      ))}
      {completed.map(a => <SkinResultCard key={a.id} result={a} />)}

      <p className="text-[10px] text-center mt-4" style={{ color: 'var(--hf-text-muted)', opacity: 0.5 }}>
        ⚠️ AI analysis only. Not a substitute for professional dermatological diagnosis.
      </p>
    </div>
  );
}

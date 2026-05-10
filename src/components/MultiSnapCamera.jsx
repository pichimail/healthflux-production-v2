/**
 * MultiSnapCamera — AI auto-detect smart camera
 * Detects: Food (calories/macros) | Skin (conditions/severity) | Document (OCR/summary)
 * Auto-saves to Docs with IST timestamp
 */
import React, { useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { callAIVision } from '@/components/utils/aiService';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera, Upload, CheckCircle, AlertCircle, Loader2,
  Utensils, Microscope, FileText, X, Zap,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import Haptics from '@/components/utils/haptics';

const CATEGORIES = {
  food:     { emoji: '🥗', label: 'Food',     color: '#a8e6cf', tc: '#003d20', Icon: Utensils },
  skin:     { emoji: '🔬', label: 'Skin',     color: '#f7c9a3', tc: '#3d1a00', Icon: Microscope },
  document: { emoji: '📄', label: 'Document', color: '#9bb4ff', tc: '#0a1240', Icon: FileText },
  xray:     { emoji: '🩻', label: 'X-Ray/Scan', color: '#c9bbff', tc: '#1a0a40', Icon: FileText },
};

function getISTTimestamp() {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const ist = new Date(now.getTime() + istOffset);
  return ist.toISOString().replace('T', ' ').slice(0, 19) + ' IST';
}

function FoodResult({ result }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Calories', value: result.calories ? `${result.calories} kcal` : '—', color: '#a8e6cf' },
          { label: 'Protein', value: result.protein ? `${result.protein}g` : '—', color: '#9bb4ff' },
          { label: 'Carbs', value: result.carbs ? `${result.carbs}g` : '—', color: '#f7c9a3' },
        ].map(m => (
          <div key={m.label} className="rounded-2xl p-3 text-center"
            style={{ background: m.color + '22', border: `1px solid ${m.color}44` }}>
            <p className="text-base font-black" style={{ color: m.color }}>{m.value}</p>
            <p className="text-[9px] font-bold mt-0.5 uppercase" style={{ color: 'var(--hf-text-muted)' }}>{m.label}</p>
          </div>
        ))}
      </div>
      {result.health_score != null && (
        <div className="flex items-center gap-3 p-3 rounded-2xl"
          style={{ background: 'rgba(168,230,207,0.12)', border: '1px solid rgba(168,230,207,0.25)' }}>
          <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: '#a8e6cf', color: '#003d20', fontWeight: 900, fontSize: 14 }}>
            {result.health_score}
          </div>
          <div>
            <p className="text-xs font-black" style={{ color: 'var(--hf-text)' }}>Health Score</p>
            <p className="text-[10px]" style={{ color: 'var(--hf-text-muted)' }}>{result.summary}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function SkinResult({ result }) {
  const urgencyColor = {
    immediately: '#f28c8c', within_week: '#f7c9a3',
    within_month: '#d7f576', no: '#a8e6cf',
  }[result.see_doctor_urgency] || '#9bb4ff';

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        {(result.conditions_detected || []).map((c, i) => (
          <span key={i} className="px-2 py-1 rounded-full text-[10px] font-bold"
            style={{ background: 'rgba(247,201,163,0.2)', color: '#f7c9a3' }}>{c}</span>
        ))}
      </div>
      {result.severity && (
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase" style={{ color: 'var(--hf-text-muted)' }}>Severity:</span>
          <span className="text-[10px] font-black capitalize" style={{ color: '#f7c9a3' }}>{result.severity}</span>
        </div>
      )}
      {result.triage_advice && (
        <p className="text-xs leading-relaxed" style={{ color: 'var(--hf-text-muted)' }}>{result.triage_advice}</p>
      )}
      {result.see_doctor_urgency && result.see_doctor_urgency !== 'no' && (
        <div className="flex items-center gap-2 p-2.5 rounded-2xl"
          style={{ background: urgencyColor + '22', border: `1px solid ${urgencyColor}44` }}>
          <AlertCircle size={13} style={{ color: urgencyColor }} />
          <p className="text-[10px] font-bold" style={{ color: urgencyColor }}>
            See a doctor: {result.see_doctor_urgency.replace(/_/g, ' ')}
          </p>
        </div>
      )}
    </div>
  );
}

function DocResult({ result }) {
  return (
    <div className="space-y-2">
      {result.summary && (
        <p className="text-xs leading-relaxed" style={{ color: 'var(--hf-text-muted)' }}>{result.summary}</p>
      )}
      {result.key_findings?.length > 0 && (
        <ul className="space-y-1">
          {result.key_findings.slice(0, 4).map((f, i) => (
            <li key={i} className="text-xs flex items-start gap-1.5" style={{ color: 'var(--hf-text-muted)' }}>
              <span style={{ color: '#9bb4ff', flexShrink: 0 }}>•</span>{f}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function MultiSnapCamera({ profileId, onResult, onClose }) {
  const queryClient = useQueryClient();
  const cameraRef = useRef(null);
  const galleryRef = useRef(null);
  const [status, setStatus] = useState('idle'); // idle | uploading | analyzing | done | error
  const [result, setResult] = useState(null);
  const [detectedCategory, setDetectedCategory] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleFile = async (file) => {
    if (!file) return;
    setPreviewUrl(URL.createObjectURL(file));
    setStatus('uploading');
    setResult(null);
    setDetectedCategory(null);
    setErrorMsg('');
    Haptics.medium();

    try {
      // Upload file
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setStatus('analyzing');

      // AI auto-detect category + analyze
      const analysis = await callAIVision({
        prompt: `You are a medical AI. Analyze this image and determine its category and extract relevant health data.

First detect the category:
- "food": if it shows food/meal/drink → extract calories, protein, carbs, fat, fiber, health_score (0-100), summary
- "skin": if it shows skin condition/wound/rash → extract conditions_detected (array), severity (clear/mild/moderate/severe), triage_advice, skincare_routine (array), see_doctor_urgency (no/within_month/within_week/immediately), summary
- "document": if it shows medical document, lab report, prescription, discharge summary → extract summary, key_findings (array), action_items (array), document_type (lab_report/prescription/imaging/discharge_summary/consultation/other), ai_tags (array)
- "xray": if it shows X-ray, CT scan, or MRI → extract plain_summary, clinical_findings, anomalies (array), risk_level (low/moderate/high/critical), follow_up_actions (array)

Return ONLY valid JSON.`,
        file_urls: [file_url],
        response_json_schema: {
          type: 'object',
          properties: {
            category: { type: 'string' },
            calories: { type: 'number' },
            protein: { type: 'number' },
            carbs: { type: 'number' },
            fat: { type: 'number' },
            health_score: { type: 'number' },
            conditions_detected: { type: 'array', items: { type: 'string' } },
            severity: { type: 'string' },
            triage_advice: { type: 'string' },
            see_doctor_urgency: { type: 'string' },
            skincare_routine: { type: 'array', items: { type: 'string' } },
            summary: { type: 'string' },
            plain_summary: { type: 'string' },
            clinical_findings: { type: 'string' },
            anomalies: { type: 'array', items: { type: 'string' } },
            risk_level: { type: 'string' },
            follow_up_actions: { type: 'array', items: { type: 'string' } },
            key_findings: { type: 'array', items: { type: 'string' } },
            action_items: { type: 'array', items: { type: 'string' } },
            document_type: { type: 'string' },
            ai_tags: { type: 'array', items: { type: 'string' } },
          },
        },
      });

      const cat = analysis.category || 'document';
      const timestamp = getISTTimestamp();

      // Auto-save to docs
      if (cat === 'food') {
        // Save as nutrition note in MedicalDocument
        await base44.entities.MedicalDocument.create({
          profile_id: profileId,
          title: `Food Snap — ${timestamp}`,
          document_type: 'other',
          file_url,
          file_name: `food_snap_${Date.now()}.jpg`,
          file_type: 'image/jpeg',
          document_date: new Date().toISOString().slice(0, 10),
          ai_summary: analysis.summary || `Estimated ${analysis.calories || '?'} kcal`,
          key_findings: [
            analysis.calories ? `Calories: ${analysis.calories} kcal` : null,
            analysis.protein ? `Protein: ${analysis.protein}g` : null,
            analysis.carbs ? `Carbs: ${analysis.carbs}g` : null,
            analysis.fat ? `Fat: ${analysis.fat}g` : null,
          ].filter(Boolean),
          ai_tags: ['Food', 'Nutrition', 'Multi-Snap'],
          status: 'completed',
        });
      } else if (cat === 'skin') {
        await base44.entities.SkinAnalysis?.create?.({
          profile_id: profileId,
          image_url: file_url,
          analysis_date: new Date().toISOString(),
          conditions_detected: analysis.conditions_detected || [],
          severity: analysis.severity || 'mild',
          triage_advice: analysis.triage_advice || '',
          skincare_routine: analysis.skincare_routine || [],
          see_doctor_urgency: analysis.see_doctor_urgency || 'no',
          ai_confidence: 0.8,
          status: 'completed',
        });
        // Also save to docs
        await base44.entities.MedicalDocument.create({
          profile_id: profileId,
          title: `Skin Analysis — ${timestamp}`,
          document_type: 'other',
          file_url,
          file_name: `skin_snap_${Date.now()}.jpg`,
          file_type: 'image/jpeg',
          document_date: new Date().toISOString().slice(0, 10),
          ai_summary: analysis.triage_advice || analysis.summary || '',
          key_findings: analysis.conditions_detected || [],
          ai_tags: ['Skin', 'Dermatology', 'Multi-Snap'],
          status: 'completed',
        });
      } else if (cat === 'xray') {
        await base44.entities.AIMedicalImagingResult?.create?.({
          profile_id: profileId,
          image_url: file_url,
          image_type: 'other',
          plain_summary: analysis.plain_summary || analysis.summary || '',
          clinical_findings: analysis.clinical_findings || '',
          anomalies: analysis.anomalies || [],
          risk_level: analysis.risk_level || 'low',
          follow_up_actions: analysis.follow_up_actions || [],
          ai_confidence: 0.8,
          scan_date: new Date().toISOString().slice(0, 10),
          status: 'completed',
        });
        await base44.entities.MedicalDocument.create({
          profile_id: profileId,
          title: `Imaging Scan — ${timestamp}`,
          document_type: 'imaging',
          file_url,
          file_name: `scan_${Date.now()}.jpg`,
          file_type: 'image/jpeg',
          document_date: new Date().toISOString().slice(0, 10),
          ai_summary: analysis.plain_summary || '',
          key_findings: analysis.anomalies || [],
          ai_tags: ['Imaging', 'X-Ray', 'Multi-Snap'],
          status: 'completed',
        });
      } else {
        // document
        await base44.entities.MedicalDocument.create({
          profile_id: profileId,
          title: `Scanned Doc — ${timestamp}`,
          document_type: analysis.document_type || 'other',
          file_url,
          file_name: `doc_snap_${Date.now()}.jpg`,
          file_type: 'image/jpeg',
          document_date: new Date().toISOString().slice(0, 10),
          ai_summary: analysis.summary || '',
          key_findings: analysis.key_findings || [],
          action_items: analysis.action_items || [],
          ai_tags: [...(analysis.ai_tags || []), 'Multi-Snap'],
          status: 'completed',
        });
      }

      queryClient.invalidateQueries({ queryKey: ['documents', profileId] });
      setDetectedCategory(cat);
      setResult(analysis);
      setStatus('done');
      Haptics.success();
      if (onResult) onResult(analysis);
    } catch (err) {
      setStatus('error');
      setErrorMsg(err.message || 'Analysis failed');
      Haptics.error?.();
    }
  };

  const handleCapture = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  const cat = detectedCategory ? CATEGORIES[detectedCategory] : null;

  return (
    <div className="flex flex-col h-full px-4 py-4 gap-4" style={{ color: 'var(--hf-text)' }}>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#d7f576' }}>
            <Zap size={14} style={{ color: '#0a1200' }} />
          </div>
          <div>
            <p className="text-sm font-black" style={{ color: 'var(--hf-text)' }}>Multi-Snap AI</p>
            <p className="text-[9px]" style={{ color: 'var(--hf-text-muted)' }}>Food · Skin · Document · Imaging</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: 'var(--hf-surface-2)' }}>
            <X size={14} style={{ color: 'var(--hf-text-muted)' }} />
          </button>
        )}
      </div>

      {/* Preview area */}
      <div className="flex-1 rounded-[24px] overflow-hidden flex items-center justify-center relative"
        style={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)', minHeight: 200 }}>
        {previewUrl ? (
          <img src={previewUrl} alt="preview" className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-3 p-6 text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: 'var(--hf-surface)', border: '2px dashed rgba(215,245,118,0.3)' }}>
              <Camera size={28} style={{ color: '#d7f576' }} />
            </div>
            <p className="text-sm font-bold" style={{ color: 'var(--hf-text)' }}>Take or upload a photo</p>
            <p className="text-xs" style={{ color: 'var(--hf-text-muted)' }}>AI auto-detects: food · skin · document · X-ray</p>
            <div className="flex gap-2 mt-1 flex-wrap justify-center">
              {Object.values(CATEGORIES).map(c => (
                <span key={c.label} className="px-2.5 py-1 rounded-full text-[9px] font-bold"
                  style={{ background: c.color + '25', color: c.color }}>
                  {c.emoji} {c.label}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Status overlay */}
        {(status === 'uploading' || status === 'analyzing') && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}>
            <Loader2 size={36} className="animate-spin" style={{ color: '#d7f576' }} />
            <p className="text-sm font-black text-white">
              {status === 'uploading' ? 'Uploading…' : '✨ AI analyzing…'}
            </p>
            <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.6)' }}>
              Auto-detecting category and extracting data
            </p>
          </div>
        )}

        {/* Category badge */}
        {cat && status === 'done' && (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
            style={{ background: cat.color, color: cat.tc }}>
            <span>{cat.emoji}</span>
            <span>{cat.label} detected</span>
          </div>
        )}

        {/* Saved badge */}
        {status === 'done' && (
          <div className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
            style={{ background: 'rgba(215,245,118,0.9)', color: '#0a1200' }}>
            <CheckCircle size={11} />
            Saved to Docs
          </div>
        )}
      </div>

      {/* Result card */}
      <AnimatePresence>
        {status === 'done' && result && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[18px] p-4 space-y-3"
            style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle size={15} style={{ color: '#d7f576' }} />
              <p className="text-sm font-black" style={{ color: 'var(--hf-text)' }}>Analysis Complete</p>
            </div>

            {detectedCategory === 'food'     && <FoodResult result={result} />}
            {detectedCategory === 'skin'     && <SkinResult result={result} />}
            {(detectedCategory === 'document' || detectedCategory === 'xray') && <DocResult result={result} />}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
      {status === 'error' && (
        <div className="rounded-[18px] p-4 flex items-center gap-3"
          style={{ background: 'rgba(242,140,140,0.1)', border: '1px solid rgba(242,140,140,0.3)' }}>
          <AlertCircle size={16} style={{ color: '#f28c8c' }} />
          <p className="text-xs" style={{ color: '#f28c8c' }}>{errorMsg || 'Analysis failed. Please try again.'}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={handleCapture} />
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleCapture} />

        <button
          onClick={() => galleryRef.current?.click()}
          disabled={status === 'uploading' || status === 'analyzing'}
          className="flex-1 py-3 rounded-[14px] font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.97] transition-transform"
          style={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)', color: 'var(--hf-text)', opacity: (status === 'uploading' || status === 'analyzing') ? 0.5 : 1 }}>
          <Upload size={16} /> Gallery
        </button>
        <button
          onClick={() => cameraRef.current?.click()}
          disabled={status === 'uploading' || status === 'analyzing'}
          className="flex-1 py-3 rounded-[14px] font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.97] transition-transform"
          style={{ background: '#d7f576', color: '#0a1200', opacity: (status === 'uploading' || status === 'analyzing') ? 0.5 : 1 }}>
          <Camera size={16} /> Camera
        </button>
      </div>

      {status === 'done' && (
        <button onClick={onClose}
          className="w-full py-3 rounded-[14px] font-bold text-sm active:scale-[0.97] transition-transform"
          style={{ background: 'var(--hf-surface-2)', color: 'var(--hf-text-muted)', border: '1px solid var(--hf-border)' }}>
          Done
        </button>
      )}
    </div>
  );
}
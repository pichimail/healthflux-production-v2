// @ts-nocheck
/**
 * GlobalCameraCapture — unified camera for food, skin, medical imaging, document scan
 * Opens native camera, then routes the image to the correct AI analysis
 * Results are stored in MedicalDocument (Records) + domain-specific entity
 */
import React, { useRef, useState } from 'react';
import { Drawer } from 'vaul';
import { Camera, Utensils, Scan, Brain, FileText, Loader2, X, CheckCircle, ChevronRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import Haptics from '@/components/utils/haptics';

const CAPTURE_MODES = [
  { key: 'food',    label: 'Log Food',          sub: 'AI analyses calories & macros', emoji: '🍽️', color: '#a8e6cf', tc: '#003d20' },
  { key: 'skin',    label: 'Skin Assessment',   sub: 'AI checks skin condition',       emoji: '🔬', color: '#c9bbff', tc: '#1a0a40' },
  { key: 'imaging', label: 'Medical Imaging',   sub: 'X-ray, CT, MRI, Ultrasound',     emoji: '🩻', color: '#9bb4ff', tc: '#0a1240' },
  { key: 'doc',     label: 'Scan Document',     sub: 'Lab report, prescription…',      emoji: '📄', color: '#f7c9a3', tc: '#3d1a00' },
];

async function uploadImageFile(file) {
  const { file_url } = await base44.integrations.Core.UploadFile({ file });
  return file_url;
}

async function analyzeFood(fileUrl, profileId) {
  const result = await base44.functions.invoke('nutritionImageAnalysis', {
    image_url: fileUrl,
    profile_id: profileId,
  });
  return result.data;
}

async function analyzeSkin(fileUrl, profileId) {
  const result = await base44.functions.invoke('analyzeSkinImage', {
    image_url: fileUrl,
    profile_id: profileId,
    body_location: 'General',
  });
  return result.data;
}

async function analyzeMedicalImage(fileUrl, profileId) {
  const result = await base44.functions.invoke('analyzeMedicalImage', {
    image_url: fileUrl,
    profile_id: profileId,
    image_type: 'other',
  });
  return result.data;
}

async function processDocument(fileUrl, profileId) {
  const result = await base44.functions.invoke('enhancedDocumentProcessor', {
    file_url: fileUrl,
    profile_id: profileId,
    document_type: 'other',
    title: 'Scanned Document',
  });
  return result.data;
}

function ResultCard({ mode, result, onDone }) {
  if (!result) return null;

  return (
    <div className="space-y-4 px-5 pb-8">
      <div className="flex items-center gap-2">
        <CheckCircle size={18} style={{ color: '#a8e6cf' }} />
        <p className="text-sm font-black" style={{ color: 'var(--hf-text)' }}>Analysis Complete</p>
      </div>

      <div className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)' }}>
        {mode === 'food' && (
          <>
            <p className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--hf-text-muted)' }}>Nutrition Summary</p>
            <p className="text-sm font-bold" style={{ color: 'var(--hf-text)' }}>{result.food_name || result.meal_name || 'Food Logged'}</p>
            {result.calories && <p className="text-2xl font-black" style={{ color: '#a8e6cf' }}>{result.calories} <span className="text-xs font-bold" style={{ color: 'var(--hf-text-muted)' }}>kcal</span></p>}
            {(result.protein || result.carbs || result.fat) && (
              <div className="grid grid-cols-3 gap-2">
                {[['Protein', result.protein, 'g', '#c9bbff'], ['Carbs', result.carbs, 'g', '#f7c9a3'], ['Fat', result.fat, 'g', '#f28c8c']].map(([l, v, u, c]) => v ? (
                  <div key={l} className="rounded-xl p-2 text-center" style={{ background: c + '20' }}>
                    <p className="text-xs font-black" style={{ color: c }}>{v}{u}</p>
                    <p className="text-[9px] font-bold uppercase" style={{ color: 'var(--hf-text-muted)' }}>{l}</p>
                  </div>
                ) : null)}
              </div>
            )}
          </>
        )}

        {mode === 'skin' && (
          <>
            <p className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--hf-text-muted)' }}>Skin Assessment</p>
            {result.severity && <p className="text-sm font-bold" style={{ color: 'var(--hf-text)' }}>Severity: {result.severity}</p>}
            {result.triage_advice && <p className="text-xs leading-relaxed" style={{ color: 'var(--hf-text-muted)' }}>{result.triage_advice}</p>}
            {result.conditions_detected?.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {result.conditions_detected.map((c, i) => (
                  <span key={i} className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(201,187,255,0.2)', color: '#c9bbff' }}>{c}</span>
                ))}
              </div>
            )}
          </>
        )}

        {mode === 'imaging' && (
          <>
            <p className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--hf-text-muted)' }}>Medical Imaging</p>
            {result.plain_summary && <p className="text-xs leading-relaxed" style={{ color: 'var(--hf-text)' }}>{result.plain_summary}</p>}
            {result.risk_level && (
              <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: result.risk_level === 'low' ? 'rgba(168,230,207,0.2)' : 'rgba(247,201,163,0.2)', color: result.risk_level === 'low' ? '#a8e6cf' : '#f7c9a3' }}>
                Risk: {result.risk_level}
              </span>
            )}
          </>
        )}

        {mode === 'doc' && (
          <>
            <p className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--hf-text-muted)' }}>Document Processed</p>
            {result.ai_summary && <p className="text-xs leading-relaxed" style={{ color: 'var(--hf-text)' }}>{result.ai_summary?.slice(0, 200)}…</p>}
          </>
        )}

        <p className="text-[10px] font-bold" style={{ color: 'var(--hf-lemon-strong)' }}>✓ Saved to Records</p>
      </div>

      <button onClick={onDone}
        className="w-full h-12 rounded-2xl font-black text-sm active:scale-[0.97]"
        style={{ background: '#d7f576', color: '#0a1200' }}>
        Done
      </button>
    </div>
  );
}

export default function GlobalCameraCapture({ open, onOpenChange, profileId, defaultMode = null }) {
  const inputRef = useRef(null);
  const [mode, setMode] = useState(defaultMode);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const reset = () => { setMode(defaultMode); setResult(null); setLoading(false); };

  const handleClose = () => { reset(); onOpenChange(false); };

  const triggerCamera = (selectedMode) => {
    setMode(selectedMode);
    setTimeout(() => inputRef.current?.click(), 100);
  };

  const handleCapture = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !profileId) return;

    setLoading(true);
    Haptics.light();

    try {
      const fileUrl = await uploadImageFile(file);
      let analysisResult = null;

      switch (mode) {
        case 'food': {
          const data = await analyzeFood(fileUrl, profileId);
          analysisResult = data;
          // Also log to MealLog
          if (data?.calories) {
            await base44.entities.MealLog.create({
              profile_id: profileId,
              food_name: data.food_name || data.meal_name || 'AI-scanned meal',
              meal_name: data.food_name || data.meal_name || 'AI-scanned meal',
              meal_type: 'other',
              logged_date: new Date().toISOString().slice(0, 10),
              logged_at: new Date().toISOString(),
              calories: data.calories || 0,
              protein_g: data.protein || 0,
              carbs_g: data.carbs || 0,
              fat_g: data.fat || 0,
              image_url: fileUrl,
              source: 'camera_ai',
              ai_analysis: data,
              notes: 'Logged via camera capture',
            }).catch(() => {});
          }
          // Save to Records
          await base44.entities.MedicalDocument.create({
            profile_id: profileId,
            title: `Food Log — ${data.food_name || data.meal_name || 'Meal'}`,
            document_type: 'other',
            file_url: fileUrl,
            document_date: new Date().toISOString().slice(0, 10),
            ai_summary: `Calories: ${data.calories || '?'} kcal · Protein: ${data.protein || '?'}g · Carbs: ${data.carbs || '?'}g · Fat: ${data.fat || '?'}g`,
            ai_tags: ['Food Log', 'Nutrition', 'Camera Capture'],
            status: 'completed',
          }).catch(() => {});
          break;
        }
        case 'skin': {
          const data = await analyzeSkin(fileUrl, profileId);
          analysisResult = data;
          break;
        }
        case 'imaging': {
          const data = await analyzeMedicalImage(fileUrl, profileId);
          analysisResult = data;
          break;
        }
        case 'doc': {
          const data = await processDocument(fileUrl, profileId);
          analysisResult = data;
          break;
        }
      }

      setResult(analysisResult);
      Haptics.medium();
      toast.success('Analysis complete — saved to Records!');
    } catch (err) {
      toast.error('Analysis failed: ' + (err.message || 'Unknown error'));
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleCapture}
      />

      <Drawer.Root open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/70 z-[180]" />
          <Drawer.Content
            className="fixed bottom-0 left-0 right-0 z-[190] rounded-t-[32px] flex flex-col outline-none"
            style={{
              backgroundColor: 'var(--hf-surface)',
              border: '1px solid var(--hf-border)',
              borderBottom: 'none',
              maxHeight: '85dvh',
            }}>
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1.5 rounded-full" style={{ background: 'var(--hf-border-strong)' }} />
            </div>

            <div className="flex items-center justify-between px-5 pt-2 pb-3 flex-shrink-0 border-b" style={{ borderColor: 'var(--hf-border)' }}>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-[12px] flex items-center justify-center" style={{ background: '#d7f576' }}>
                  <Camera size={18} style={{ color: '#0a1200' }} />
                </div>
                <div>
                  <p className="text-sm font-black" style={{ color: 'var(--hf-text)' }}>
                    {result ? 'Analysis Result' : loading ? 'Analysing…' : mode ? CAPTURE_MODES.find(m => m.key === mode)?.label || 'Capture' : 'Take Photo'}
                  </p>
                  <p className="text-[10px]" style={{ color: 'var(--hf-text-muted)' }}>AI-powered · Saved to Records</p>
                </div>
              </div>
              <button onClick={handleClose} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'var(--hf-surface-2)' }}>
                <X size={15} style={{ color: 'var(--hf-text-muted)' }} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1" style={{ paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))' }}>
              {loading && (
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                  <Loader2 size={36} className="animate-spin" style={{ color: '#d7f576' }} />
                  <p className="text-sm font-bold" style={{ color: 'var(--hf-text)' }}>AI analysing your image…</p>
                  <p className="text-xs" style={{ color: 'var(--hf-text-muted)' }}>Results will be saved to Records</p>
                </div>
              )}

              {!loading && result && (
                <ResultCard mode={mode} result={result} onDone={handleClose} />
              )}

              {!loading && !result && (
                <div className="px-4 py-4 space-y-2">
                  {CAPTURE_MODES.map(({ key, label, sub, emoji, color, tc }) => (
                    <button
                      key={key}
                      onClick={() => { Haptics.light(); triggerCamera(key); }}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl text-left active:scale-[0.97] transition-transform"
                      style={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)' }}>
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 text-2xl" style={{ background: color }}>
                        {emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black" style={{ color: 'var(--hf-text)' }}>{label}</p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--hf-text-muted)' }}>{sub}</p>
                      </div>
                      <ChevronRight size={16} style={{ color: 'var(--hf-text-muted)', flexShrink: 0 }} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </>
  );
}
/**
 * ProcessingScreen — live AI processing progress shown inside UniversalUpload
 * Shows real-time step-by-step status, then auto-launches the extracted view.
 */
import React, { useEffect, useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { CheckCircle2, Loader2, Brain, FlaskConical, Pill, Activity, FileText, Sparkles, AlertCircle } from 'lucide-react';

const STEPS = [
  { id: 'upload',    label: 'File uploaded to secure storage',     icon: FileText,    delay: 0 },
  { id: 'ocr',       label: 'Reading document content with AI…',   icon: Brain,       delay: 800 },
  { id: 'extract',   label: 'Extracting facility & doctor info…',  icon: Sparkles,    delay: 2200 },
  { id: 'labs',      label: 'Identifying lab results & vitals…',   icon: FlaskConical,delay: 4000 },
  { id: 'meds',      label: 'Detecting medications & dosages…',    icon: Pill,        delay: 5500 },
  { id: 'summary',   label: 'Generating AI health summary…',       icon: Activity,    delay: 7000 },
  { id: 'done',      label: 'Analysis complete! Opening results…', icon: CheckCircle2,delay: 0 },
];

export default function ProcessingScreen({ documentId, profileId, onComplete, onError }) {
  const [stepsDone, setStepsDone] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [finalDoc, setFinalDoc] = useState(null);
  const [failed, setFailed] = useState(false);
  const pollRef = useRef(null);
  const stepsTimers = useRef([]);

  // Animate steps sequentially
  useEffect(() => {
    STEPS.slice(0, -1).forEach((step, i) => {
      const t = setTimeout(() => {
        setCurrentStep(i);
        setStepsDone(prev => [...prev, step.id]);
      }, step.delay);
      stepsTimers.current.push(t);
    });
    return () => stepsTimers.current.forEach(clearTimeout);
  }, []);

  // Poll document until completed or failed
  useEffect(() => {
    if (!documentId) return;
    let attempts = 0;
    pollRef.current = setInterval(async () => {
      attempts++;
      try {
        const docs = await base44.entities.MedicalDocument.filter({ id: documentId });
        const doc = docs?.[0];
        if (!doc) return;
        if (doc.status === 'completed') {
          clearInterval(pollRef.current);
          setStepsDone(STEPS.map(s => s.id));
          setCurrentStep(STEPS.length - 1);
          setFinalDoc(doc);
          setTimeout(() => onComplete(doc), 800);
        } else if (doc.status === 'failed') {
          clearInterval(pollRef.current);
          setFailed(true);
          onError?.('Processing failed. Please try again.');
        } else if (attempts > 60) {
          // 2 minute timeout
          clearInterval(pollRef.current);
          setFailed(true);
          onError?.('Processing timed out. Please check Documents later.');
        }
      } catch (e) {
        console.warn('Poll error:', e.message);
      }
    }, 2000);
    return () => clearInterval(pollRef.current);
  }, [documentId]);

  if (failed) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12 px-4 text-center">
        <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'rgba(242,140,140,0.15)' }}>
          <AlertCircle size={28} style={{ color: 'var(--hf-coral-strong)' }} />
        </div>
        <p className="font-bold text-sm" style={{ color: 'var(--hf-text)' }}>Processing failed</p>
        <p className="text-xs" style={{ color: 'var(--hf-text-muted)' }}>The document was saved. You can reprocess it from the Documents page.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 py-2 px-1">
      {/* Progress header */}
      <div className="rounded-2xl p-4 text-center" style={{ background: 'rgba(201,187,255,0.1)', border: '1px solid rgba(201,187,255,0.2)' }}>
        <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
          style={{ background: 'rgba(201,187,255,0.15)' }}>
          <Brain size={22} style={{ color: 'var(--hf-lavender-strong)' }} className="animate-pulse" />
        </div>
        <p className="text-sm font-black" style={{ color: 'var(--hf-text)' }}>AI is analyzing your document</p>
        <p className="text-xs mt-1" style={{ color: 'var(--hf-text-muted)' }}>This takes 20–40 seconds. Please wait…</p>
        {/* Progress bar */}
        <div className="w-full h-1.5 rounded-full mt-3 overflow-hidden" style={{ background: 'var(--hf-surface-2)' }}>
          <div className="h-full rounded-full transition-all duration-700"
            style={{ width: `${Math.round((stepsDone.length / (STEPS.length - 1)) * 100)}%`, background: 'linear-gradient(90deg, #c9bbff, #d7f576)' }} />
        </div>
      </div>

      {/* Step list */}
      <div className="space-y-1">
        {STEPS.slice(0, -1).map((step, i) => {
          const done = stepsDone.includes(step.id);
          const active = currentStep === i && !done;
          const Icon = step.icon;
          return (
            <div key={step.id}
              className="flex items-center gap-3 px-3 py-2.5 rounded-[12px] transition-all"
              style={{
                background: done ? 'rgba(168,230,207,0.08)' : active ? 'rgba(201,187,255,0.08)' : 'transparent',
                opacity: done || active ? 1 : 0.4
              }}>
              <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: done ? 'rgba(168,230,207,0.2)' : active ? 'rgba(201,187,255,0.2)' : 'var(--hf-surface-2)' }}>
                {done
                  ? <CheckCircle2 size={14} style={{ color: 'var(--hf-mint-strong)' }} />
                  : active
                  ? <Loader2 size={14} style={{ color: 'var(--hf-lavender-strong)' }} className="animate-spin" />
                  : <Icon size={13} style={{ color: 'var(--hf-text-muted)' }} />
                }
              </div>
              <p className="text-xs font-semibold" style={{ color: done ? '#a8e6cf' : active ? 'var(--hf-text)' : 'var(--hf-text-muted)' }}>
                {step.label}
              </p>
            </div>
          );
        })}
      </div>

      <p className="text-[10px] text-center px-4" style={{ color: 'var(--hf-text-muted)' }}>
        Results will automatically appear when processing is complete
      </p>
    </div>
  );
}
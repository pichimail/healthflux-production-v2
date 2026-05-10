// @ts-nocheck
import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Loader2, Pill, Camera, Upload, X,
  CheckCircle, AlertTriangle, ChevronDown, ChevronUp, Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const FREQUENCY_OPTIONS = [
  { value: 'once_daily', label: 'Once Daily' },
  { value: 'twice_daily', label: 'Twice Daily' },
  { value: 'three_times_daily', label: 'Three Times Daily' },
  { value: 'four_times_daily', label: 'Four Times Daily' },
  { value: 'as_needed', label: 'As Needed' },
  { value: 'custom', label: 'Custom' },
];

const EMPTY_FORM = {
  medication_name: '',
  dosage: '',
  frequency: 'once_daily',
  times: ['08:00'],
  start_date: new Date().toISOString().split('T')[0],
  end_date: '',
  purpose: '',
  prescriber: '',
  side_effects: '',
  is_active: true,
  reminders_enabled: true,
};

// ── OCR Processing Panel ─────────────────────────────────────────────────────
export function PrescriptionOCRPanel({ profileId, onMedsExtracted }) {
  const [mode, setMode] = useState(null); // 'upload' | 'camera' | null
  const [previewUrl, setPreviewUrl] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const [step, setStep] = useState('idle'); // idle | uploading | extracting | done | error
  const fileRef = useRef(null);
  const cameraRef = useRef(null);

  const resetPanel = () => {
    setMode(null);
    setPreviewUrl(null);
    setExtractedData(null);
    setStep('idle');
  };

  const processFile = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      toast.error('Please select an image or PDF file');
      return;
    }
    setPreviewUrl(file.type.startsWith('image/') ? URL.createObjectURL(file) : null);
    setStep('uploading');
    setExtractedData(null);

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setStep('extracting');
      const response = await base44.functions.invoke('extractMedicationFromImage', {
        file_url,
        profile_id: profileId,
      });
      const data = response.data;
      if (data?.success) {
        setExtractedData(data);
        setStep('done');
        toast.success(`Extracted ${data.extracted_count || data.medications?.length || 0} medication(s) from prescription`);
      } else {
        setStep('error');
        toast.error(data?.error || 'Could not extract medications from this image');
      }
    } catch {
      setStep('error');
      toast.error('OCR processing failed. Please try again.');
    }
  };

  return (
    <div className="rounded-[20px] p-4 space-y-3"
      style={{ background: 'rgba(215,245,118,0.06)', border: '1px dashed rgba(215,245,118,0.3)' }}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-[10px] flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(215,245,118,0.2)' }}>
          <Sparkles size={14} style={{ color: 'var(--hf-lemon-strong)' }} />
        </div>
        <div>
          <p className="text-sm font-bold" style={{ color: 'var(--hf-text)' }}>Smart Prescription Scanner</p>
          <p className="text-[10px]" style={{ color: 'var(--hf-text-muted)' }}>AI OCR reads handwritten & printed prescriptions</p>
        </div>
        {mode && (
          <button onClick={resetPanel} className="ml-auto w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: 'var(--hf-surface-2)' }} aria-label="Reset scanner">
            <X size={13} style={{ color: 'var(--hf-text-muted)' }} />
          </button>
        )}
      </div>

      {/* Mode selector */}
      {step === 'idle' && !mode && (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => { setMode('camera'); cameraRef.current?.click(); }}
            className="flex flex-col items-center gap-2 p-3 rounded-[14px] text-xs font-bold transition-all active:scale-95"
            style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)', color: 'var(--hf-text)' }}>
            <Camera size={18} style={{ color: 'var(--hf-lemon-strong)' }} />
            <span>Scan Camera</span>
            <span className="text-[9px] font-normal" style={{ color: 'var(--hf-text-muted)' }}>Take a photo</span>
          </button>
          <button
            type="button"
            onClick={() => { setMode('upload'); fileRef.current?.click(); }}
            className="flex flex-col items-center gap-2 p-3 rounded-[14px] text-xs font-bold transition-all active:scale-95"
            style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)', color: 'var(--hf-text)' }}>
            <Upload size={18} style={{ color: 'var(--hf-sky-strong)' }} />
            <span>Upload Image</span>
            <span className="text-[9px] font-normal" style={{ color: 'var(--hf-text-muted)' }}>JPG, PNG, PDF</span>
          </button>
        </div>
      )}

      {/* Hidden inputs */}
      <input ref={fileRef} type="file" accept="image/*,application/pdf" className="sr-only"
        aria-hidden="true" tabIndex={-1}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f); e.target.value = ''; }} />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="sr-only"
        aria-hidden="true" tabIndex={-1}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f); e.target.value = ''; }} />

      {/* Processing states */}
      {(step === 'uploading' || step === 'extracting') && (
        <div className="flex flex-col items-center gap-3 py-4">
          {previewUrl && (
            <img src={previewUrl} alt="Prescription preview" className="w-full max-h-32 object-contain rounded-xl" />
          )}
          <Loader2 size={28} className="animate-spin" style={{ color: 'var(--hf-lemon-strong)' }} />
          <p className="text-xs font-semibold" style={{ color: 'var(--hf-text-muted)' }}>
            {step === 'uploading' ? 'Uploading prescription…' : 'AI reading your prescription…'}
          </p>
          <p className="text-[10px]" style={{ color: 'var(--hf-text-muted)' }}>
            OCR is processing handwritten & printed text
          </p>
        </div>
      )}

      {step === 'error' && (
        <div className="flex flex-col items-center gap-2 py-3">
          <AlertTriangle size={22} style={{ color: 'var(--hf-coral-strong)' }} />
          <p className="text-xs font-semibold" style={{ color: 'var(--hf-coral-strong)' }}>Processing failed</p>
          <button type="button" onClick={resetPanel}
            className="text-xs px-4 py-1.5 rounded-xl font-bold"
            style={{ background: 'var(--hf-surface-2)', color: 'var(--hf-text)' }}>
            Try Again
          </button>
        </div>
      )}

      {/* Extracted Results */}
      {step === 'done' && extractedData && (
        <div className="space-y-3">
          {/* Confidence */}
          <div className="flex items-center justify-between p-3 rounded-[14px]"
            style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
            <span className="text-xs font-semibold" style={{ color: 'var(--hf-text)' }}>Extraction Confidence</span>
            <span className="text-sm font-black" style={{
              color: extractedData.confidence >= 80 ? '#a8e6cf' : extractedData.confidence >= 60 ? '#f7c9a3' : '#f28c8c'
            }}>
              {extractedData.confidence ?? '--'}%
            </span>
          </div>

          {/* Interaction warnings */}
          {extractedData.interaction_warnings?.length > 0 && (
            <div className="p-3 rounded-[14px]" style={{ background: 'rgba(242,140,140,0.1)', border: '1px solid rgba(242,140,140,0.3)' }}>
              <p className="text-xs font-bold flex items-center gap-1.5 mb-2" style={{ color: 'var(--hf-coral-strong)' }}>
                <AlertTriangle size={12} /> Drug Interaction Warnings
              </p>
              {extractedData.interaction_warnings.map((w, i) => (
                <div key={i} className="text-[10px] mb-1" style={{ color: 'var(--hf-text)' }}>
                  <strong>{w.new_medication}</strong> + {w.existing_medication}
                  <span className="ml-1 px-1.5 py-0.5 rounded-full text-[8px] font-bold"
                    style={{ background: w.severity === 'major' ? '#f28c8c' : '#f7c9a3', color: '#3d0000' }}>
                    {w.severity?.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Medications list */}
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--hf-text-muted)' }}>
              Found {extractedData.medications?.length || 0} Medication(s)
            </p>
            {extractedData.medications?.map((med, i) => (
              <div key={i} className="p-3 rounded-[14px] flex items-start justify-between gap-2"
                style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold" style={{ color: 'var(--hf-text)' }}>{med.medication_name}</p>
                  <p className="text-[10px]" style={{ color: 'var(--hf-text-muted)' }}>
                    {med.dosage} · {med.frequency?.replace(/_/g, ' ')}
                    {med.prescriber && ` · Dr. ${med.prescriber}`}
                  </p>
                  {med.instructions && (
                    <p className="text-[10px] mt-1" style={{ color: 'var(--hf-text-muted)' }}>📋 {med.instructions}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onMedsExtracted([med])}
                  className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95"
                  style={{ background: '#d7f576', color: '#0a1200' }}>
                  Use
                </button>
              </div>
            ))}
          </div>

          {/* Add all */}
          {extractedData.medications?.length > 1 && (
            <button
              type="button"
              onClick={() => onMedsExtracted(extractedData.medications)}
              className="w-full py-2.5 rounded-[14px] text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              style={{ background: '#d7f576', color: '#0a1200' }}>
              <CheckCircle size={14} /> Use All {extractedData.medications.length} Medications
            </button>
          )}

          <button type="button" onClick={resetPanel}
            className="w-full py-2 rounded-[14px] text-xs font-bold"
            style={{ background: 'var(--hf-surface-2)', color: 'var(--hf-text-muted)', border: '1px solid var(--hf-border)' }}>
            Scan Another
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main Form ─────────────────────────────────────────────────────────────────
export default function AddMedicationForm({ profileId, onSuccess, onCancel }) {
  const [formData, setFormData] = useState({ ...EMPTY_FORM, profile_id: profileId });
  const [showScanner, setShowScanner] = useState(false);
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Medication.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['medications']);
      toast.success('Medication added successfully');
      onSuccess?.();
    },
    onError: () => toast.error('Failed to add medication'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.medication_name?.trim() || !formData.dosage?.trim()) {
      toast.error('Medication name and dosage are required');
      return;
    }
    createMutation.mutate(formData);
  };

  // When OCR returns meds, fill the form with first one & bulk-create the rest
  const handleOCRResult = (meds) => {
    if (!meds?.length) return;
    const first = meds[0];
    setFormData(f => ({
      ...f,
      medication_name: first.medication_name || f.medication_name,
      dosage: first.dosage || f.dosage,
      frequency: first.frequency || f.frequency,
      purpose: first.instructions || f.purpose,
      prescriber: first.prescriber || f.prescriber,
      times: first.suggested_times || f.times,
      side_effects: first.warnings || f.side_effects,
      refills_remaining: first.refills_remaining ?? f.refills_remaining,
    }));
    // Bulk create the rest immediately
    if (meds.length > 1) {
      meds.slice(1).forEach(med => {
        base44.entities.Medication.create({
          profile_id: profileId,
          medication_name: med.medication_name,
          dosage: med.dosage,
          frequency: med.frequency || 'once_daily',
          purpose: med.instructions || '',
          prescriber: med.prescriber || '',
          times: med.suggested_times || [],
          side_effects: med.warnings || '',
          refills_remaining: med.refills_remaining || 0,
          is_active: true,
          start_date: new Date().toISOString().split('T')[0],
        });
      });
      queryClient.invalidateQueries(['medications']);
      toast.success(`${meds.length - 1} more medication(s) added from prescription`);
    }
    setShowScanner(false);
    toast.success('Form filled from prescription — review and save');
  };

  const set = (k, v) => setFormData(f => ({ ...f, [k]: v }));

  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      {/* Scanner toggle */}
      <button
        type="button"
        onClick={() => setShowScanner(s => !s)}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 rounded-[16px] text-sm font-bold transition-all active:scale-[0.98]"
        style={{ background: showScanner ? 'rgba(215,245,118,0.15)' : 'var(--hf-surface-2)', border: `1px solid ${showScanner ? 'rgba(215,245,118,0.4)' : 'var(--hf-border)'}`, color: showScanner ? '#d7f576' : 'var(--hf-text)' }}
        aria-expanded={showScanner}>
        <span className="flex items-center gap-2">
          <Camera size={15} />
          Scan or Upload Prescription (OCR)
        </span>
        {showScanner ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      <AnimatePresence>
        {showScanner && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22 }}>
            <PrescriptionOCRPanel profileId={profileId} onMedsExtracted={handleOCRResult} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px" style={{ background: 'var(--hf-border)' }} />
        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--hf-text-muted)' }}>or enter manually</span>
        <div className="flex-1 h-px" style={{ background: 'var(--hf-border)' }} />
      </div>

      {/* Medication Name */}
      <div className="space-y-1.5">
        <Label htmlFor="med_name" className="text-sm font-semibold" style={{ color: 'var(--hf-text)' }}>
          Medication Name <span style={{ color: 'var(--hf-coral-strong)' }}>*</span>
        </Label>
        <Input
          id="med_name"
          value={formData.medication_name}
          onChange={(e) => set('medication_name', e.target.value)}
          placeholder="e.g., Aspirin"
          className="h-11 rounded-2xl"
          required
        />
      </div>

      {/* Dosage + Frequency */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="dosage" className="text-sm font-semibold" style={{ color: 'var(--hf-text)' }}>
            Dosage <span style={{ color: 'var(--hf-coral-strong)' }}>*</span>
          </Label>
          <Input
            id="dosage"
            value={formData.dosage}
            onChange={(e) => set('dosage', e.target.value)}
            placeholder="e.g., 500mg"
            className="h-11 rounded-2xl"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="frequency" className="text-sm font-semibold" style={{ color: 'var(--hf-text)' }}>Frequency</Label>
          <Select value={formData.frequency} onValueChange={(v) => set('frequency', v)}>
            <SelectTrigger id="frequency" className="h-11 rounded-2xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FREQUENCY_OPTIONS.map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Start + End Date */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="start_date" className="text-sm font-semibold" style={{ color: 'var(--hf-text)' }}>Start Date</Label>
          <Input id="start_date" type="date" value={formData.start_date}
            onChange={(e) => set('start_date', e.target.value)} className="h-11 rounded-2xl" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="end_date" className="text-sm font-semibold" style={{ color: 'var(--hf-text)' }}>End Date</Label>
          <Input id="end_date" type="date" value={formData.end_date}
            onChange={(e) => set('end_date', e.target.value)} className="h-11 rounded-2xl" />
        </div>
      </div>

      {/* Purpose */}
      <div className="space-y-1.5">
        <Label htmlFor="purpose" className="text-sm font-semibold" style={{ color: 'var(--hf-text)' }}>Purpose / Condition</Label>
        <Input id="purpose" value={formData.purpose}
          onChange={(e) => set('purpose', e.target.value)}
          placeholder="e.g., Blood pressure control" className="h-11 rounded-2xl" />
      </div>

      {/* Prescriber */}
      <div className="space-y-1.5">
        <Label htmlFor="prescriber" className="text-sm font-semibold" style={{ color: 'var(--hf-text)' }}>Prescribing Doctor</Label>
        <Input id="prescriber" value={formData.prescriber}
          onChange={(e) => set('prescriber', e.target.value)}
          placeholder="Dr. Name" className="h-11 rounded-2xl" />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1 h-11 rounded-2xl font-bold">
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={createMutation.isPending}
          className="flex-1 h-11 rounded-2xl font-bold"
          style={{ background: '#d7f576', color: '#0a1200' }}>
          {createMutation.isPending ? (
            <span className="flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Adding…</span>
          ) : (
            <span className="flex items-center gap-2"><Pill size={14} /> Add Medication</span>
          )}
        </Button>
      </div>
    </form>
  );
}

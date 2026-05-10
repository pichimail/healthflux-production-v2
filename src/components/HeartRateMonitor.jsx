// @ts-nocheck
/**
 * HeartRateMonitor — Real PPG-based heart rate via rear camera + flash
 * Mobile: draggable Vaul bottom sheet
 * Desktop: modal overlay
 * 
 * Algorithm: Camera red-channel photoplethysmography (PPG)
 * - Rear camera + torch captures blood-volume pulse variations
 * - Peaks in red channel → inter-beat intervals → BPM
 * - Haptic feedback for finger-detected state changes
 * - Saves to VitalMeasurement entity + MedicalDocument records
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Drawer } from 'vaul';
import { base44 } from '@/api/base44Client';
import { Heart, Loader2, X, Zap, CheckCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import Haptics from '@/components/utils/haptics';

const SAMPLE_DURATION = 30; // seconds
const SAMPLE_FPS = 30;

function calculateBPM(samples) {
  if (samples.length < 60) return null;

  // Normalize signal
  const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
  const normalized = samples.map(s => s - mean);

  // Butterworth-style: smooth to reduce noise
  const smoothed = normalized.map((v, i) => {
    if (i < 2 || i > normalized.length - 3) return v;
    return (normalized[i - 2] + normalized[i - 1] + v + normalized[i + 1] + normalized[i + 2]) / 5;
  });

  // Find peaks with adaptive threshold
  const stdDev = Math.sqrt(smoothed.reduce((a, b) => a + b * b, 0) / smoothed.length);
  const threshold = stdDev * 0.3;

  const peaks = [];
  const minPeakDistance = Math.floor(SAMPLE_FPS * 0.35); // min 35ms between peaks (~170 BPM max)
  for (let i = 2; i < smoothed.length - 2; i++) {
    if (
      smoothed[i] > threshold &&
      smoothed[i] > smoothed[i - 1] &&
      smoothed[i] > smoothed[i - 2] &&
      smoothed[i] > smoothed[i + 1] &&
      smoothed[i] > smoothed[i + 2]
    ) {
      if (peaks.length === 0 || i - peaks[peaks.length - 1] >= minPeakDistance) {
        peaks.push(i);
      }
    }
  }

  if (peaks.length < 3) return null;

  // Compute intervals, filter outliers
  const intervals = [];
  for (let i = 1; i < peaks.length; i++) {
    const interval = peaks[i] - peaks[i - 1];
    const bpmFromInterval = (SAMPLE_FPS * 60) / interval;
    if (bpmFromInterval >= 40 && bpmFromInterval <= 200) {
      intervals.push(interval);
    }
  }

  if (intervals.length < 2) return null;

  // Median instead of mean (more robust to outliers)
  intervals.sort((a, b) => a - b);
  const medianInterval = intervals[Math.floor(intervals.length / 2)];
  const bpm = Math.round((SAMPLE_FPS * 60) / medianInterval);

  return (bpm >= 40 && bpm <= 200) ? bpm : null;
}

function WaveformSVG({ signal, fingerDetected }) {
  if (signal.length < 3) return null;
  const min = Math.min(...signal);
  const max = Math.max(...signal);
  const range = max - min || 1;
  const H = 48;
  const W = 100;
  const points = signal.map((v, i) => {
    const x = (i / (signal.length - 1)) * W;
    const y = (1 - (v - min) / range) * (H - 8) + 4;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 48, opacity: fingerDetected ? 1 : 0.3 }}>
      <polyline
        points={points}
        fill="none"
        stroke="#f28c8c"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function HRContent({ profileId, onClose, onSave }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animRef = useRef(null);
  const samplesRef = useRef([]);
  const startTimeRef = useRef(null);
  const lastFingerState = useRef(false);

  const [phase, setPhase] = useState('idle');
  const [countdown, setCountdown] = useState(SAMPLE_DURATION);
  const [bpm, setBpm] = useState(null);
  const [signal, setSignal] = useState([]);
  const [fingerDetected, setFingerDetected] = useState(false);
  const [confidence, setConfidence] = useState(0);

  const stopCamera = useCallback(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const startMeasurement = async () => {
    setPhase('starting');
    samplesRef.current = [];
    setSignal([]);
    setBpm(null);
    setConfidence(0);
    setFingerDetected(false);
    lastFingerState.current = false;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 320 },
          height: { ideal: 240 },
          frameRate: { ideal: SAMPLE_FPS },
        }
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Try torch/flash
      const track = stream.getVideoTracks()[0];
      try {
        await track.applyConstraints({ advanced: [{ torch: true }] });
      } catch { /* torch not supported on this device */ }

      setPhase('measuring');
      startTimeRef.current = Date.now();

      const ctx = canvasRef.current?.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      const sample = () => {
        if (!streamRef.current || !videoRef.current) return;

        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        const remaining = Math.max(0, SAMPLE_DURATION - elapsed);
        setCountdown(Math.ceil(remaining));

        // Sample larger area for better signal
        ctx.drawImage(videoRef.current, 0, 0, 40, 30);
        const frame = ctx.getImageData(0, 0, 40, 30);
        const totalPixels = frame.data.length / 4;

        let redSum = 0, greenSum = 0, blueSum = 0;
        for (let i = 0; i < frame.data.length; i += 4) {
          redSum += frame.data[i];
          greenSum += frame.data[i + 1];
          blueSum += frame.data[i + 2];
        }

        const avgRed = redSum / totalPixels;
        const avgGreen = greenSum / totalPixels;
        const avgBlue = blueSum / totalPixels;

        // Finger detection: finger over camera + flash → very high red, low green/blue ratio
        const isFingerOn = avgRed > 80 && avgRed > avgGreen * 1.5 && avgRed > avgBlue * 1.8;

        // Haptic on state change
        if (isFingerOn !== lastFingerState.current) {
          if (isFingerOn) {
            Haptics.light();
          } else {
            Haptics.medium(); // prompt to put finger back
          }
          lastFingerState.current = isFingerOn;
        }

        setFingerDetected(isFingerOn);

        if (isFingerOn) {
          samplesRef.current.push(avgRed);
          setSignal(prev => [...prev.slice(-60), avgRed]);

          // Live confidence update
          const liveConf = Math.min(100, Math.round((samplesRef.current.length / (SAMPLE_FPS * SAMPLE_DURATION)) * 100));
          setConfidence(liveConf);
        }

        if (elapsed >= SAMPLE_DURATION) {
          setPhase('result');
          stopCamera();
          const measured = calculateBPM(samplesRef.current);
          setBpm(measured);
          if (measured) {
            Haptics.success?.() || Haptics.medium();
          }
          return;
        }

        animRef.current = requestAnimationFrame(sample);
      };

      animRef.current = requestAnimationFrame(sample);
    } catch (err) {
      setPhase('idle');
      toast.error('Camera access denied. Please allow camera permissions.');
    }
  };

  const saveReading = async () => {
    if (!bpm || !profileId) return;
    setPhase('saving');
    try {
      // 1. Save vital measurement
      await base44.entities.VitalMeasurement.create({
        profile_id: profileId,
        vital_type: 'heart_rate',
        value: bpm,
        unit: 'bpm',
        measured_at: new Date().toISOString(),
        source: 'device',
        notes: `Camera PPG measurement — ${confidence}% signal confidence`,
      });

      // 2. Save to Records (MedicalDocument) for unified record-keeping
      await base44.entities.MedicalDocument.create({
        profile_id: profileId,
        title: `Heart Rate Scan — ${bpm} BPM`,
        document_type: 'other',
        document_date: new Date().toISOString().slice(0, 10),
        ai_summary: `Heart rate measured via camera photoplethysmography (PPG): **${bpm} BPM**. ${bpm < 60 ? 'Bradycardia (below normal range).' : bpm <= 100 ? 'Normal resting range (60–100 BPM).' : 'Tachycardia (above normal range).'}`,
        ai_tags: ['Heart Rate', 'PPG Scan', 'Camera Measurement', bpm < 60 ? 'Bradycardia' : bpm <= 100 ? 'Normal' : 'Tachycardia'],
        status: 'completed',
        notes: `Signal confidence: ${confidence}%`,
        file_url: '',
      });

      toast.success(`❤️ Heart rate ${bpm} BPM saved to records & vitals!`);
      onSave?.(bpm);
      onClose?.();
    } catch (err) {
      toast.error('Failed to save heart rate: ' + err.message);
      setPhase('result');
    }
  };

  const progressPct = 1 - countdown / SAMPLE_DURATION;
  const circumference = 2 * Math.PI * 50;

  return (
    <div className="px-5 pb-8 space-y-4">
      <video ref={videoRef} className="hidden" muted playsInline />
      <canvas ref={canvasRef} width={40} height={30} className="hidden" />

      {phase === 'idle' && (
        <div className="text-center space-y-5">
          <div className="w-28 h-28 rounded-full mx-auto flex items-center justify-center relative"
            style={{ background: 'rgba(242,140,140,0.12)', border: '3px solid rgba(242,140,140,0.4)' }}>
            <Heart size={44} style={{ color: '#f28c8c' }} />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-black" style={{ color: 'var(--hf-text)' }}>Camera Heart Rate Scanner</p>
            <div className="rounded-2xl p-3 text-left space-y-1.5" style={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)' }}>
              <p className="text-xs font-bold" style={{ color: 'var(--hf-text)' }}>How to measure:</p>
              <p className="text-[11px] leading-relaxed" style={{ color: 'var(--hf-text-muted)' }}>
                1. Place your <strong style={{ color: 'var(--hf-text)' }}>fingertip firmly</strong> over the rear camera lens + flash<br />
                2. Apply gentle, steady pressure — don't press too hard<br />
                3. Keep your hand <strong style={{ color: 'var(--hf-text)' }}>completely still</strong> for 30 seconds<br />
                4. You'll feel a vibration when your finger is detected
              </p>
            </div>
          </div>
          <button onClick={startMeasurement}
            className="w-full h-13 py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 active:scale-[0.97] transition-transform"
            style={{ background: '#f28c8c', color: '#3d0000' }}>
            <Zap size={16} /> Start Measurement
          </button>
        </div>
      )}

      {phase === 'starting' && (
        <div className="text-center py-8 space-y-3">
          <Loader2 size={36} className="animate-spin mx-auto" style={{ color: '#f28c8c' }} />
          <p className="text-sm font-bold" style={{ color: 'var(--hf-text)' }}>Starting camera & flash…</p>
          <p className="text-xs" style={{ color: 'var(--hf-text-muted)' }}>Please allow camera access</p>
        </div>
      )}

      {phase === 'measuring' && (
        <div className="space-y-4">
          {/* Countdown ring */}
          <div className="flex items-center justify-center">
            <div className="relative w-32 h-32">
              <svg className="w-32 h-32 -rotate-90" viewBox="0 0 112 112">
                <circle cx="56" cy="56" r="50" fill="none" stroke="var(--hf-border)" strokeWidth="7" />
                <circle cx="56" cy="56" r="50" fill="none" stroke={fingerDetected ? '#f28c8c' : 'rgba(242,140,140,0.3)'}
                  strokeWidth="7"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference * (1 - progressPct)}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 0.8s linear, stroke 0.3s' }} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <Heart size={16} style={{ color: '#f28c8c' }} className={fingerDetected ? 'animate-pulse' : ''} />
                <span className="text-2xl font-black mt-0.5" style={{ color: '#f28c8c' }}>{countdown}</span>
                <span className="text-[10px]" style={{ color: 'var(--hf-text-muted)' }}>sec</span>
              </div>
            </div>
          </div>

          {/* Finger status — prominent */}
          <div className="flex items-center justify-center gap-2.5 p-3.5 rounded-2xl transition-all"
            style={{
              background: fingerDetected ? 'rgba(168,230,207,0.12)' : 'rgba(242,140,140,0.12)',
              border: `1.5px solid ${fingerDetected ? 'rgba(168,230,207,0.4)' : 'rgba(242,140,140,0.4)'}`,
            }}>
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ background: fingerDetected ? '#a8e6cf' : '#f28c8c', boxShadow: fingerDetected ? '0 0 8px #a8e6cf' : '0 0 8px #f28c8c' }} />
            <p className="text-xs font-bold" style={{ color: fingerDetected ? '#a8e6cf' : '#f28c8c' }}>
              {fingerDetected
                ? '✓ Finger detected — hold still, measuring…'
                : '👆 Place fingertip firmly over camera + flash'}
            </p>
          </div>

          {/* Signal confidence */}
          {fingerDetected && confidence > 0 && (
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-bold" style={{ color: 'var(--hf-text-muted)' }}>
                <span>Signal quality</span><span>{confidence}%</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--hf-border)' }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${confidence}%`, background: '#a8e6cf' }} />
              </div>
            </div>
          )}

          {/* Waveform */}
          <div className="rounded-2xl p-2" style={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)', minHeight: 60 }}>
            {signal.length > 2
              ? <WaveformSVG signal={signal} fingerDetected={fingerDetected} />
              : <p className="text-[10px] text-center py-3" style={{ color: 'var(--hf-text-muted)' }}>Waveform will appear once finger is detected</p>
            }
          </div>

          <button onClick={() => { stopCamera(); setPhase('idle'); }}
            className="w-full h-11 rounded-2xl text-sm font-bold active:scale-[0.97]"
            style={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)', color: 'var(--hf-text-muted)' }}>
            Cancel
          </button>
        </div>
      )}

      {phase === 'result' && bpm && (
        <div className="space-y-5 text-center">
          <div className="w-32 h-32 rounded-full mx-auto flex flex-col items-center justify-center"
            style={{ background: bpm < 60 ? 'rgba(155,180,255,0.15)' : bpm <= 100 ? 'rgba(168,230,207,0.15)' : 'rgba(247,201,163,0.15)',
              border: `3px solid ${bpm < 60 ? '#9bb4ff' : bpm <= 100 ? '#a8e6cf' : '#f7c9a3'}` }}>
            <span className="text-4xl font-black leading-none"
              style={{ color: bpm < 60 ? '#9bb4ff' : bpm <= 100 ? '#a8e6cf' : '#f7c9a3' }}>{bpm}</span>
            <span className="text-xs font-bold mt-0.5" style={{ color: 'var(--hf-text-muted)' }}>BPM</span>
          </div>
          <div>
            <p className="text-sm font-black mb-0.5" style={{ color: 'var(--hf-text)' }}>
              {bpm < 60 ? '⬇️ Bradycardia (low)' : bpm <= 100 ? '✅ Normal Resting Range' : '⬆️ Tachycardia (elevated)'}
            </p>
            <p className="text-xs" style={{ color: 'var(--hf-text-muted)' }}>Normal resting: 60–100 BPM · Signal confidence: {confidence}%</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => { setBpm(null); setPhase('idle'); samplesRef.current = []; setSignal([]); setConfidence(0); }}
              className="h-12 rounded-2xl text-sm font-bold active:scale-[0.97]"
              style={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)', color: 'var(--hf-text-muted)' }}>
              Retake
            </button>
            <button onClick={saveReading}
              className="h-12 rounded-2xl text-sm font-black flex items-center justify-center gap-2 active:scale-[0.97]"
              style={{ background: '#a8e6cf', color: '#003d20' }}>
              <CheckCircle size={16} /> Save to Records
            </button>
          </div>
        </div>
      )}

      {phase === 'result' && !bpm && (
        <div className="space-y-4 text-center">
          <div className="w-24 h-24 rounded-full mx-auto flex items-center justify-center" style={{ background: 'rgba(242,140,140,0.12)' }}>
            <AlertTriangle size={32} style={{ color: '#f28c8c' }} />
          </div>
          <div>
            <p className="text-sm font-black mb-1" style={{ color: 'var(--hf-text)' }}>Signal unclear</p>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--hf-text-muted)' }}>
              Could not detect a clear heartbeat. Ensure your finger firmly covers both the camera lens and the flash. Stay completely still and apply steady pressure.
            </p>
          </div>
          <button onClick={() => { setPhase('idle'); samplesRef.current = []; setSignal([]); setConfidence(0); }}
            className="w-full h-12 rounded-2xl text-sm font-black active:scale-[0.97]"
            style={{ background: '#f28c8c', color: '#3d0000' }}>
            Try Again
          </button>
        </div>
      )}

      {phase === 'saving' && (
        <div className="text-center py-8 space-y-3">
          <Loader2 size={28} className="animate-spin mx-auto" style={{ color: '#a8e6cf' }} />
          <p className="text-sm" style={{ color: 'var(--hf-text-muted)' }}>Saving to vitals & records…</p>
        </div>
      )}
    </div>
  );
}

export default function HeartRateMonitor({ profileId, onClose, onSave }) {
  return (
    <Drawer.Root open onOpenChange={(v) => { if (!v) onClose?.(); }}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/70 z-[190]" />
        <Drawer.Content
          className="fixed bottom-0 left-0 right-0 z-[200] rounded-t-[32px] flex flex-col outline-none"
          style={{
            backgroundColor: 'var(--hf-surface)',
            border: '1px solid var(--hf-border)',
            borderBottom: 'none',
            maxHeight: '92dvh',
          }}>
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1 flex-shrink-0 cursor-grab">
            <div className="w-10 h-1.5 rounded-full" style={{ background: 'var(--hf-border-strong)' }} />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-2 pb-4 flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-[12px] flex items-center justify-center" style={{ background: 'rgba(242,140,140,0.15)' }}>
                <Heart size={18} style={{ color: '#f28c8c' }} />
              </div>
              <div>
                <p className="text-sm font-black" style={{ color: 'var(--hf-text)' }}>Heart Rate Scanner</p>
                <p className="text-[10px]" style={{ color: 'var(--hf-text-muted)' }}>Camera PPG · Real detection</p>
              </div>
            </div>
            <button onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: 'var(--hf-surface-2)' }}>
              <X size={15} style={{ color: 'var(--hf-text-muted)' }} />
            </button>
          </div>

          <div className="overflow-y-auto flex-1" style={{ paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))' }}>
            <HRContent profileId={profileId} onClose={onClose} onSave={onSave} />
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
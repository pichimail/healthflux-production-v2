/**
 * QuickAddFAB — Global FAB
 *
 * MOBILE  (<md): Single "+ Add Record" button → opens AddRecordSheet with 4 options:
 *               Take Photo | Scan Document | Choose Gallery | Upload Document
 * DESKTOP (md+): Full staggered action menu (unchanged)
 */
import React, { useState, useRef, useCallback, useEffect, useId } from 'react';
import {
  Plus, X, FileText, Activity, Pill, Brain,
  TestTube, Camera, Mic, MicOff, ScanLine, CheckCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useIsMobile } from '@/hooks/use-mobile';
import Haptics from '@/components/utils/haptics';
import AddRecordSheet from '@/components/dashboard/AddRecordSheet';
import GlobalCameraCapture from '@/components/GlobalCameraCapture';
import { base44 } from '@/api/base44Client';

function getSpeechRecognitionConstructor() {
  const w = window;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

// Desktop action catalogue (unchanged)
const DESKTOP_ACTIONS = [
  { key: 'scan',      label: 'Scan Document',   subtitle: 'Multi-page scanner — Flux auto-extracts', color: 'var(--hf-lemon-strong)', tc: '#0a1200', Icon: ScanLine },
  { key: 'multisnap', label: 'Multi-Snap',       subtitle: 'Food · Skin · Doc — AI auto-detects',    color: '#f7c9a3', tc: '#3d1a00', Icon: Camera },
  { key: 'voice',     label: 'Voice Input',      subtitle: 'Speak to log vitals, meds, or ask Flux', color: 'var(--hf-lavender-strong)', tc: '#1a0a40', Icon: Mic },
  { key: 'upload',    label: 'Upload Document',  subtitle: 'Lab report, prescription, imaging…',     color: 'var(--hf-mint-strong)', tc: '#003d20', Icon: FileText },
  { key: 'vital',     label: 'Log Vital Sign',   subtitle: 'BP, glucose, heart rate…',               color: 'var(--hf-sky-strong)', tc: '#0a1240', Icon: Activity },
  { key: 'med',       label: 'Add Medication',   subtitle: 'Track a new medicine',                   color: 'var(--hf-peach-strong)', tc: '#3d1a00', Icon: Pill },
  { key: 'lab',       label: 'Add Lab Result',   subtitle: 'Blood test, urine, lipids…',             color: 'var(--hf-coral-strong)', tc: '#3d0000', Icon: TestTube },
  { key: 'chat',      label: 'Flux Health Chat', subtitle: 'Ask Flux about your health data',        color: '#e8d5ff', tc: '#2d0a4a', Icon: Brain },
];

// ── Voice hook ────────────────────────────────────────────────────────
function useVoiceInput({ onResult, onError }) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recRef = useRef(null);

  const start = useCallback(() => {
    const SR = getSpeechRecognitionConstructor();
    if (!SR) { onError?.('Voice input not supported in this browser.'); return; }
    const rec = new SR();
    rec.lang = 'en-US'; rec.interimResults = true; rec.maxAlternatives = 1; rec.continuous = false;
    rec.onstart  = () => { setListening(true); setTranscript(''); };
    rec.onresult = (e) => {
      const t = Array.from(e.results).map(r => r[0].transcript).join('');
      setTranscript(t);
      if (e.results[e.results.length - 1].isFinal) { setListening(false); onResult?.(t); }
    };
    rec.onerror = (e) => {
      setListening(false);
      onError?.(e.error === 'not-allowed' ? 'Microphone permission denied.' : 'Voice input failed.');
    };
    rec.onend = () => setListening(false);
    recRef.current = rec;
    rec.start();
    Haptics.medium();
  }, [onResult, onError]);

  const stop = useCallback(() => { recRef.current?.stop(); setListening(false); }, []);
  return { listening, transcript, start, stop };
}

// ── Voice modal ───────────────────────────────────────────────────────
function VoiceModal({ open, onClose, onConfirm, profileId }) {
  const [voiceError, setVoiceError] = useState('');
  const [confirmed, setConfirmed] = useState('');
  const [logging, setLogging] = useState(false);
  const [logResult, setLogResult] = useState(null);
  const { listening, transcript, start, stop } = useVoiceInput({
    onResult: (t) => setConfirmed(t),
    onError: setVoiceError,
  });

  useEffect(() => {
    if (!open) { setConfirmed(''); setVoiceError(''); setLogResult(null); }
  }, [open]);

  const handleConfirm = () => {
    const text = confirmed || transcript;
    if (!text.trim()) return;
    onConfirm(text);
    onClose();
  };

  const handleLogDirectly = async () => {
    const text = confirmed || transcript;
    if (!text.trim()) return;
    setLogging(true);
    try {
      const res = await base44.functions.invoke('parseVoiceLog', { transcript: text, profile_id: profileId });
      const d = res.data;
      setLogResult(d.saved ? `✅ Logged as ${d.category}: ${d.summary}` : `Sent to Flux Chat`);
      if (!d.saved) { onConfirm(text); }
    } catch {
      setLogResult('Failed to auto-log, sending to Flux Chat');
      onConfirm(text);
    }
    setLogging(false);
  };

  if (!open) return null;
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-end md:items-center justify-center"
        style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
        onClick={(e) => e.target === e.currentTarget && onClose()}
        role="dialog" aria-modal="true" aria-label="Voice input">
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          className="w-full max-w-sm mx-4 mb-4 md:mb-0 rounded-[28px] p-6 flex flex-col gap-5"
          style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-[12px] flex items-center justify-center" style={{ background: '#c9bbff' }}>
                <Mic size={16} style={{ color: '#1a0a40' }} />
              </div>
              <div>
                <p className="text-sm font-black" style={{ color: 'var(--hf-text)' }}>Voice Input</p>
                <p className="text-[10px]" style={{ color: 'var(--hf-text-muted)' }}>Speak to log or chat with Flux</p>
              </div>
            </div>
            <button onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: 'var(--hf-surface-2)' }}>
              <X size={14} style={{ color: 'var(--hf-text-muted)' }} />
            </button>
          </div>

          <div className="flex flex-col items-center gap-4 py-4">
            <div className="relative">
              {listening && (
                <motion.div
                  className="absolute inset-0 rounded-full"
                  animate={{ scale: [1, 1.5, 1], opacity: [0.4, 0, 0.4] }}
                  transition={{ duration: 1.4, repeat: Infinity }}
                  style={{ background: '#c9bbff' }} />
              )}
              <button
                onClick={listening ? stop : start}
                aria-label={listening ? 'Stop recording' : 'Start recording'}
                aria-pressed={listening}
                className="relative w-16 h-16 rounded-full flex items-center justify-center transition-all active:scale-90"
                style={{
                  background: listening ? '#c9bbff' : 'var(--hf-surface-2)',
                  border: `2px solid ${listening ? '#c9bbff' : 'var(--hf-border-strong)'}`,
                  boxShadow: listening ? '0 0 24px rgba(201,187,255,0.4)' : 'none',
                }}>
                {listening
                  ? <MicOff size={22} style={{ color: '#1a0a40' }} />
                  : <Mic size={22} style={{ color: 'var(--hf-text)' }} />}
              </button>
            </div>
            <p className="text-xs font-semibold text-center" style={{ color: 'var(--hf-text-muted)' }}>
              {listening ? '🎙 Listening… tap to stop' : 'Tap mic to start speaking'}
            </p>
          </div>

          {(transcript || confirmed) && (
            <div className="rounded-2xl p-4" style={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)' }}>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--hf-text-muted)' }}>
                {listening ? 'Hearing…' : 'Transcript'}
              </p>
              <p className="text-sm" style={{ color: 'var(--hf-text)' }}>{confirmed || transcript}</p>
            </div>
          )}

          {voiceError && (
            <p className="text-xs text-center font-semibold" style={{ color: 'var(--hf-coral-strong)' }} role="alert">
              {voiceError}
            </p>
          )}

          {logResult && (
            <div className="rounded-2xl p-3 text-center" style={{ background: 'rgba(215,245,118,0.12)', border: '1px solid rgba(215,245,118,0.25)' }}>
              <p className="text-xs font-bold" style={{ color: '#d7f576' }}>{logResult}</p>
            </div>
          )}

          {(confirmed || transcript) && !listening && !logResult && (
            <div className="flex gap-2">
              <button onClick={handleLogDirectly} disabled={logging}
                className="flex-1 h-11 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98]"
                style={{ background: '#d7f576', color: '#0a1200', opacity: logging ? 0.7 : 1 }}>
                {logging ? '…' : <><CheckCircle size={14} /> Auto Log</>}
              </button>
              <button onClick={handleConfirm}
                className="flex-1 h-11 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98]"
                style={{ background: '#c9bbff', color: '#1a0a40' }}>
                <Brain size={14} /> Flux Chat
              </button>
            </div>
          )}

          <p className="text-[10px] text-center" style={{ color: 'var(--hf-text-muted)' }}>
            e.g. "Log BP 120/80", "I had a headache", "I ate oatmeal for breakfast"
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ── Main FAB ──────────────────────────────────────────────────────────
export default function QuickAddFAB({ onAction, hidden = false, profileId = null }) {
  const uid          = useId();
  const menuId       = `fab-menu-${uid}`;
  const isMobile     = useIsMobile();
  const [open, setOpen]             = useState(false);
  const [voiceOpen, setVoiceOpen]   = useState(false);
  const [sheetOpen, setSheetOpen]   = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const fabRef       = useRef(null);
  const firstItemRef = useRef(null);

  // Escape closes desktop menu
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') { e.preventDefault(); setOpen(false); } };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  // Focus management (desktop)
  useEffect(() => {
    if (open) {
      const raf = requestAnimationFrame(() => { firstItemRef.current?.focus(); });
      return () => cancelAnimationFrame(raf);
    } else {
      if (!voiceOpen) fabRef.current?.focus();
    }
  }, [open, voiceOpen]);

  // Prevent body scroll while desktop menu open
  useEffect(() => {
    if (open && !isMobile) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [open, isMobile]);

  const close = useCallback(() => setOpen(false), []);

  const handleDesktopAction = useCallback((key) => {
    setOpen(false);
    if (key === 'voice') { setVoiceOpen(true); return; }
    if (key === 'multisnap') { setCameraOpen(true); return; }
    onAction?.(key);
  }, [onAction]);

  const handleVoiceConfirm = useCallback((text) => {
    onAction?.('chat', { prefill: text });
  }, [onAction]);

  // Mobile AddRecord sheet option handler
  const handleSheetOption = useCallback((key, files) => {
    if (key === 'camera') { setCameraOpen(true); return; }
    if (key === 'scan')   { onAction?.('scan');      return; }
    if (key === 'gallery' || key === 'file') {
      onAction?.('upload', { files });
      return;
    }
    onAction?.(key);
  }, [onAction]);

  const FAB_SIZE = 56;
  const FAB_GAP  = 12;

  const fabStyle = isMobile
    ? { bottom: `calc(56px + env(safe-area-inset-bottom, 0px) + ${FAB_GAP}px)`, right: '1rem' }
    : { bottom: '1.5rem', right: '1.5rem' };

  const menuStyle = isMobile
    ? { bottom: `calc(56px + env(safe-area-inset-bottom, 0px) + ${FAB_GAP + FAB_SIZE + FAB_GAP}px)`, right: '1rem', maxHeight: 'calc(100dvh - 180px)' }
    : { bottom: `calc(1.5rem + ${FAB_SIZE + FAB_GAP}px)`, right: '1.5rem', maxHeight: 'calc(100dvh - 120px)' };

  // ── Mobile FAB: single "+ Add Record" button ──
  if (isMobile) {
    return (
      <>
        {/* AddRecord bottom sheet */}
        <AddRecordSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          onOption={handleSheetOption}
        />

        {/* Global camera capture sheet */}
        <GlobalCameraCapture
          open={cameraOpen}
          onOpenChange={setCameraOpen}
          profileId={profileId}
        />

        {/* Mobile FAB */}
        <motion.button
          ref={fabRef}
          aria-label="Add health record"
          animate={hidden
            ? { opacity: 0, y: 16, scale: 0.85, pointerEvents: 'none' }
            : { opacity: 1, y: 0, scale: 1, pointerEvents: 'auto' }}
          whileTap={hidden ? {} : { scale: 0.88 }}
          transition={{ type: 'spring', stiffness: 380, damping: 28 }}
          onClick={() => { if (!hidden) { Haptics.medium(); setSheetOpen(true); } }}
          className="fixed z-[100] flex items-center gap-2 px-4 rounded-full
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#d7f576]"
          style={{
            height: FAB_SIZE,
            ...fabStyle,
            background: '#d7f576',
            border: '2px solid rgba(215,245,118,0.35)',
            boxShadow: '0 8px 32px rgba(215,245,118,0.4), 0 2px 8px rgba(0,0,0,0.28)',
          }}>
          <Plus size={20} style={{ color: '#0a1200' }} strokeWidth={2.8} />
          <span className="text-sm font-black" style={{ color: '#0a1200' }}>Add Record</span>
        </motion.button>

        {/* Voice modal (reachable from desktop only normally, but kept for completeness) */}
        <VoiceModal open={voiceOpen} onClose={() => setVoiceOpen(false)} onConfirm={handleVoiceConfirm} />
      </>
    );
  }

  // ── Desktop FAB: full staggered menu (unchanged) ──
  return (
    <>
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {open ? 'Quick actions menu opened' : ''}
      </div>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="fab-backdrop"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-[98]"
              style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)' }}
              onClick={close}
              aria-hidden="true"
            />

            <motion.div
              key="fab-menu"
              id={menuId}
              role="menu"
              aria-label="Quick add actions"
              initial={{ opacity: 0, scale: 0.92, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 8 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="fixed z-[99] flex flex-col gap-2"
              style={{ ...menuStyle, overflowY: 'auto', scrollbarWidth: 'thin' }}>
              {DESKTOP_ACTIONS.map(({ key, label, subtitle, color, tc, Icon }, i) => {
                const isFirst = i === 0;
                const descId = `fab-item-desc-${uid}-${key}`;
                return (
                  <motion.button
                    key={key}
                    ref={isFirst ? firstItemRef : undefined}
                    role="menuitem"
                    aria-label={label}
                    aria-describedby={descId}
                    initial={{ opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0, transition: { delay: i * 0.04, type: 'spring', stiffness: 420, damping: 30 } }}
                    exit={{ opacity: 0, x: 24, transition: { delay: (DESKTOP_ACTIONS.length - 1 - i) * 0.02, duration: 0.12 } }}
                    onClick={() => { Haptics.light(); handleDesktopAction(key); }}
                    className="flex items-center gap-3 pl-3 pr-5 py-3 rounded-2xl text-left
                               transition-transform hover:scale-[1.02] active:scale-[0.97]
                               focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d7f576]"
                    style={{
                      background: 'var(--hf-surface)',
                      border: '1px solid var(--hf-border)',
                      minWidth: '248px',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.32)',
                    }}>
                    <div className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ background: color }}>
                      <Icon size={16} style={{ color: tc }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold leading-tight" style={{ color: 'var(--hf-text)' }}>{label}</p>
                      <p id={descId} className="text-[9px] mt-0.5 leading-tight" style={{ color: 'var(--hf-text-muted)' }}>{subtitle}</p>
                    </div>
                  </motion.button>
                );
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Desktop FAB button */}
      <motion.button
        ref={fabRef}
        aria-label={open ? 'Close quick actions' : 'Open quick actions'}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={open ? menuId : undefined}
        animate={hidden
          ? { opacity: 0, y: 16, scale: 0.85, pointerEvents: 'none' }
          : { opacity: 1, y: 0, scale: 1, pointerEvents: 'auto' }}
        whileTap={hidden ? {} : { scale: 0.88 }}
        transition={{ type: 'spring', stiffness: 380, damping: 28 }}
        onClick={() => { if (!hidden) { Haptics.medium(); setOpen((v) => !v); } }}
        className="fixed z-[100] flex items-center justify-center rounded-full
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#d7f576]"
        style={{
          width: FAB_SIZE,
          height: FAB_SIZE,
          ...fabStyle,
          background: open ? 'var(--hf-surface)' : '#d7f576',
          border: open ? '1.5px solid var(--hf-border-strong)' : '2px solid rgba(215,245,118,0.35)',
          boxShadow: open ? '0 4px 24px rgba(0,0,0,0.45)' : '0 8px 32px rgba(215,245,118,0.4), 0 2px 8px rgba(0,0,0,0.28)',
        }}>
        <motion.span
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {open
            ? <X size={20} style={{ color: 'var(--hf-text)' }} strokeWidth={2.5} />
            : <Plus size={22} style={{ color: '#0a1200' }} strokeWidth={2.8} />}
        </motion.span>
      </motion.button>

      <VoiceModal open={voiceOpen} onClose={() => setVoiceOpen(false)} onConfirm={handleVoiceConfirm} />
    </>
  );
}
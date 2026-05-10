/**
 * FluxAssistant — Full-screen AI chat overlay
 * Features: voice input, file attach (+), approval workflow to save to Docs
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { callAIVision, uploadFile } from '@/components/utils/aiService';
import {
  X, Mic, MicOff, Plus, Send, FileText, Camera, Image,
  CheckCircle, XCircle, Loader2, Bot, User, Paperclip
} from 'lucide-react';
import Haptics from '@/components/utils/haptics';
import { useActiveProfile } from '@/components/ActiveProfileContext';
import { useQueryClient } from '@tanstack/react-query';

// ── Speech hook ──
function useSpeech({ onResult }) {
  const [listening, setListening] = useState(false);
  const recRef = useRef(null);
  const supported = typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  const start = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.lang = 'en-IN'; rec.interimResults = false; rec.maxAlternatives = 1;
    rec.onstart = () => setListening(true);
    rec.onresult = (e) => { onResult(e.results[0][0].transcript); };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    rec.start();
    Haptics.medium();
  }, [onResult]);

  const stop = useCallback(() => { recRef.current?.stop(); setListening(false); }, []);
  return { listening, supported, start, stop };
}

// ── Approval card ──
function ApprovalCard({ file, onApprove, onReject }) {
  return (
    <div className="rounded-2xl p-3 mt-2" style={{ background: 'rgba(215,245,118,0.08)', border: '1px solid rgba(215,245,118,0.25)' }}>
      <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: '#d7f576' }}>Save to Health Docs?</p>
      <p className="text-xs mb-3" style={{ color: 'var(--hf-text-muted)' }}>
        Add <span className="font-bold" style={{ color: 'var(--hf-text)' }}>{file.name}</span> to your medical documents? It will be auto-analyzed and summarized.
      </p>
      <div className="flex gap-2">
        <button onClick={onApprove}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold active:scale-95 transition-transform"
          style={{ background: '#d7f576', color: '#0a1200' }}>
          <CheckCircle size={13} /> Yes, Save to Docs
        </button>
        <button onClick={onReject}
          className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold active:scale-95 transition-transform"
          style={{ background: 'var(--hf-surface-2)', color: 'var(--hf-text-muted)', border: '1px solid var(--hf-border)' }}>
          <XCircle size={13} /> No
        </button>
      </div>
    </div>
  );
}

// ── Message bubble ──
function MessageBubble({ msg, onApprove, onReject }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'} mb-3`}>
      <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: isUser ? '#d7f576' : 'rgba(201,187,255,0.2)' }}>
        {isUser ? <User size={13} style={{ color: '#0a1200' }} /> : <Bot size={13} style={{ color: '#c9bbff' }} />}
      </div>
      <div className={`max-w-[78%] ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
        <div className="rounded-2xl px-3.5 py-2.5"
          style={{
            background: isUser ? '#d7f576' : 'var(--hf-surface)',
            border: isUser ? 'none' : '1px solid var(--hf-border)',
            color: isUser ? '#0a1200' : 'var(--hf-text)',
          }}>
          {msg.imageUrl && (
            <img src={msg.imageUrl} alt="attached" className="w-full max-w-[180px] rounded-xl mb-2 object-cover" style={{ maxHeight: 140 }} />
          )}
          <p className="text-xs leading-relaxed whitespace-pre-wrap">{msg.content}</p>
        </div>
        {msg.pendingApproval && (
          <ApprovalCard file={msg.pendingApproval} onApprove={() => onApprove(msg.id)} onReject={() => onReject(msg.id)} />
        )}
        {msg.saving && (
          <div className="flex items-center gap-1.5 mt-1.5 px-2">
            <Loader2 size={11} className="animate-spin" style={{ color: '#d7f576' }} />
            <span className="text-[10px]" style={{ color: 'var(--hf-text-muted)' }}>Saving & analyzing…</span>
          </div>
        )}
        {msg.saved && (
          <div className="flex items-center gap-1.5 mt-1.5 px-2">
            <CheckCircle size={11} style={{ color: '#d7f576' }} />
            <span className="text-[10px]" style={{ color: '#d7f576' }}>Saved to Docs ✓</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function FluxAssistant({ open, onClose }) {
  const { activeProfileId } = useActiveProfile();
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState([
    { id: 'welcome', role: 'assistant', content: "Hi! I'm Flux, your AI health assistant. Ask me anything about your health, upload documents, or share food/skin photos for instant analysis." }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const fileRef = useRef(null);
  const cameraRef = useRef(null);

  const { listening, supported: speechSupported, start: startSpeech, stop: stopSpeech } = useSpeech({
    onResult: (t) => setInput(prev => prev ? prev + ' ' + t : t),
  });

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 300);
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addMsg = (msg) => {
    const id = Date.now() + Math.random();
    setMessages(prev => [...prev, { id, ...msg }]);
    return id;
  };

  const updateMsg = (id, patch) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, ...patch } : m));
  };

  const sendMessage = async (text) => {
    if (!text.trim() || loading) return;
    setInput('');
    setLoading(true);
    addMsg({ role: 'user', content: text });

    const res = await base44.functions.invoke('aiHealthChat', {
      message: text,
      profile_id: activeProfileId,
      chat_history: messages.slice(-8).map(m => ({ role: m.role, content: m.content })),
    });

    addMsg({ role: 'assistant', content: res.data?.reply || res.data?.message || 'I had trouble responding. Please try again.' });
    setLoading(false);
  };

  const handleFileAttach = async (file, source) => {
    if (!file) return;
    setAttachMenuOpen(false);
    const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : null;

    // Show user message with file
    const userMsgId = addMsg({
      role: 'user',
      content: `📎 ${file.name}`,
      imageUrl: previewUrl,
    });

    setLoading(true);
    // Upload file
    const { url: file_url } = await uploadFile(file);

    // Analyze with multiSnapAnalyze or document processor
    let analysisResult = {};
    if (file.type.startsWith('image/')) {
      const res = await base44.functions.invoke('multiSnapAnalyze', {
        file_url,
        profile_id: activeProfileId,
      });
      analysisResult = res.data || {};
    } else {
      const res = await callAIVision({
        prompt: `Summarize this document briefly in 2-3 sentences. Key findings and any action items.`,
        file_urls: [file_url],
        functionName: 'documentAnalysis',
      });
      analysisResult = { summary: res, category: 'document', key_findings: [] };
    }

    const summary = analysisResult.summary || 'File analyzed.';
    const findings = (analysisResult.key_findings || []).slice(0, 3);

    const replyContent = `I've analyzed your ${analysisResult.category || 'file'}:\n\n${summary}${findings.length ? '\n\n' + findings.map(f => `• ${f}`).join('\n') : ''}`;

    // Show AI reply with approval prompt
    addMsg({
      role: 'assistant',
      content: replyContent,
      pendingApproval: { name: file.name, file_url, analysisResult },
    });

    setLoading(false);
  };

  const handleApprove = async (msgId) => {
    const msg = messages.find(m => m.id === msgId);
    if (!msg?.pendingApproval) return;
    const { name, file_url, analysisResult } = msg.pendingApproval;

    updateMsg(msgId, { pendingApproval: null, saving: true });

    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(now.getTime() + istOffset);
    const timestamp = istNow.toISOString().replace('T', ' ').slice(0, 19) + ' IST';

    await base44.entities.MedicalDocument.create({
      profile_id: activeProfileId,
      title: `Flux Chat — ${name} — ${timestamp}`,
      document_type: analysisResult.document_type || 'other',
      file_url,
      file_name: name,
      document_date: now.toISOString().slice(0, 10),
      ai_summary: analysisResult.summary || '',
      key_findings: analysisResult.key_findings || [],
      action_items: analysisResult.action_items || [],
      ai_tags: [...(analysisResult.ai_tags || []), 'Flux Chat'],
      status: 'completed',
    });

    queryClient.invalidateQueries({ queryKey: ['documents', activeProfileId] });
    updateMsg(msgId, { saving: false, saved: true });
    addMsg({ role: 'assistant', content: '✅ Saved to your Docs! It\'s now auto-analyzed and available in your Health Documents.' });
  };

  const handleReject = (msgId) => {
    updateMsg(msgId, { pendingApproval: null });
    addMsg({ role: 'assistant', content: 'No problem! The file stays in our chat but won\'t be added to your Docs.' });
  };

  const handleCameraFile = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFileAttach(file, 'camera');
    e.target.value = '';
  };

  const handleGalleryFile = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFileAttach(file, 'gallery');
    e.target.value = '';
  };

  if (!open) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: '100%' }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: '100%' }}
      transition={{ type: 'spring', stiffness: 320, damping: 32 }}
      className="fixed inset-0 z-[200] flex flex-col"
      style={{ background: 'var(--hf-bg)' }}>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 flex-shrink-0"
        style={{
          paddingTop: 'calc(14px + env(safe-area-inset-top,0px))',
          paddingBottom: '14px',
          background: 'var(--hf-surface)',
          borderBottom: '1px solid var(--hf-border)',
        }}>
        <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: '#d7f576' }}>
          <Bot size={17} style={{ color: '#0a1200' }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black" style={{ color: 'var(--hf-text)' }}>Flux Assistant</p>
          <p className="text-[10px]" style={{ color: 'var(--hf-text-muted)' }}>Your AI health companion</p>
        </div>
        <button onClick={onClose}
          className="w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-transform"
          style={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)' }}>
          <X size={16} style={{ color: 'var(--hf-text-muted)' }} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4" style={{ scrollbarWidth: 'none' }}>
        {messages.map(msg => (
          <MessageBubble
            key={msg.id}
            msg={msg}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        ))}
        {loading && (
          <div className="flex gap-2 mb-3">
            <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(201,187,255,0.2)' }}>
              <Bot size={13} style={{ color: '#c9bbff' }} />
            </div>
            <div className="rounded-2xl px-4 py-3 flex items-center gap-2"
              style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full"
                    style={{ background: '#c9bbff', animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Attach menu */}
      <AnimatePresence>
        {attachMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="px-4 pb-2 flex flex-col gap-2">
            {[
              { label: 'Take a Photo', icon: Camera, action: () => cameraRef.current?.click(), color: '#d7f576', tc: '#0a1200' },
              { label: 'Choose from Gallery', icon: Image, action: () => fileRef.current?.click(), color: '#9bb4ff', tc: '#0a1240' },
              { label: 'Upload Document (PDF)', icon: FileText, action: () => { fileRef.current.accept = 'application/pdf,image/*'; fileRef.current?.click(); }, color: '#a8e6cf', tc: '#003d20' },
            ].map(({ label, icon: Icon, action, color, tc }) => (
              <button key={label} onClick={action}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl text-left active:scale-98 transition-transform"
                style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: color }}>
                  <Icon size={15} style={{ color: tc }} />
                </div>
                <span className="text-sm font-semibold" style={{ color: 'var(--hf-text)' }}>{label}</span>
              </button>
            ))}
            <button onClick={() => setAttachMenuOpen(false)}
              className="py-2 text-xs font-bold text-center" style={{ color: 'var(--hf-text-muted)' }}>
              Cancel
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input bar */}
      <div className="flex items-end gap-2 px-4 py-3 flex-shrink-0"
        style={{
          background: 'var(--hf-surface)',
          borderTop: '1px solid var(--hf-border)',
          paddingBottom: 'calc(12px + env(safe-area-inset-bottom,0px))',
        }}>
        {/* Attach button */}
        <button onClick={() => setAttachMenuOpen(v => !v)}
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 active:scale-90 transition-transform"
          style={{
            background: attachMenuOpen ? '#d7f576' : 'var(--hf-surface-2)',
            border: '1px solid var(--hf-border)',
          }}>
          <Plus size={18} style={{ color: attachMenuOpen ? '#0a1200' : 'var(--hf-text-muted)' }} />
        </button>

        {/* Text input */}
        <div className="flex-1 flex items-center rounded-2xl px-3 py-2 min-h-[40px]"
          style={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)' }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
            placeholder="Ask Flux anything…"
            rows={1}
            className="flex-1 bg-transparent outline-none resize-none text-sm"
            style={{
              color: 'var(--hf-text)',
              maxHeight: 80,
              overflowY: 'auto',
            }}
          />
        </div>

        {/* Mic button */}
        {speechSupported && (
          <button onClick={listening ? stopSpeech : startSpeech}
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 active:scale-90 transition-transform"
            style={{
              background: listening ? '#c9bbff' : 'var(--hf-surface-2)',
              border: `1px solid ${listening ? '#c9bbff' : 'var(--hf-border)'}`,
            }}>
            {listening ? <MicOff size={16} style={{ color: '#1a0a40' }} /> : <Mic size={16} style={{ color: 'var(--hf-text-muted)' }} />}
          </button>
        )}

        {/* Send button */}
        <button onClick={() => sendMessage(input)}
          disabled={!input.trim() || loading}
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 active:scale-90 transition-transform"
          style={{
            background: input.trim() ? '#d7f576' : 'var(--hf-surface-2)',
            border: '1px solid var(--hf-border)',
            opacity: !input.trim() || loading ? 0.5 : 1,
          }}>
          <Send size={16} style={{ color: input.trim() ? '#0a1200' : 'var(--hf-text-muted)' }} />
        </button>
      </div>

      {/* Hidden file inputs */}
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleCameraFile} />
      <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleGalleryFile} />
    </motion.div>
  );
}
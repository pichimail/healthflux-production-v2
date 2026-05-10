/**
 * AIHealthChat — chat UI with:
 *   • Voice input via Web Speech API (mic button)
 *   • Health-context-aware AI responses
 *   • Accepts optional `initialMessage` prop to pre-fill from voice FAB
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Send, Bot, User, Loader2, Mic, MicOff } from 'lucide-react';
import Haptics from '@/components/utils/haptics';

function getSpeechRecognitionConstructor() {
  const speechWindow = /** @type {Window & {
   *   SpeechRecognition?: any,
   *   webkitSpeechRecognition?: any,
   * }} */ (window);

  return speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition || null;
}

// ── Web Speech hook ──────────────────────────────────────────────────
function useSpeech({ onResult, onError }) {
  const [listening, setListening] = useState(false);
  const recRef = useRef(null);

  const toggle = useCallback(() => {
    const SR = getSpeechRecognitionConstructor();
    if (!SR) { onError?.('Voice input not supported in this browser.'); return; }

    if (listening) { recRef.current?.stop(); return; }

    const rec = new SR();
    rec.lang = 'en-US';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onstart = () => { setListening(true); Haptics.medium(); };
    rec.onresult = (e) => { onResult?.(e.results[0][0].transcript); };
    rec.onerror = (e) => {
      onError?.(e.error === 'not-allowed' ? 'Microphone permission denied.' : 'Voice input failed.');
    };
    rec.onend = () => setListening(false);
    recRef.current = rec;
    rec.start();
  }, [listening, onResult, onError]);

  return { listening, toggle };
}

// ── Suggested prompts ────────────────────────────────────────────────
const SUGGESTIONS = [
  'What\'s my average BP this month?',
  'Am I taking all my medications?',
  'Any abnormal lab results?',
  'Summarise my health this week',
];

export default function AIHealthChat({ profileId, initialMessage }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [speechError, setSpeechError] = useState('');
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // Pre-fill from voice FAB
  useEffect(() => {
    if (initialMessage) {
      setInput(initialMessage);
      inputRef.current?.focus();
    }
  }, [initialMessage]);

  // Scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const { listening, toggle: toggleMic } = useSpeech({
    onResult: (t) => setInput((prev) => prev ? `${prev} ${t}` : t),
    onError: setSpeechError,
  });

  const handleSend = async (text) => {
    const content = (text || input).trim();
    if (!content || loading) return;
    setSpeechError('');
    const userMsg = { role: 'user', content };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    Haptics.light();

    try {
      const { data } = await base44.functions.invoke('aiHealthChat', {
        question: content,
        profile_id: profileId,
      });
      setMessages((prev) => [...prev, { role: 'assistant', content: data.answer }]);
    } catch {
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full" role="log" aria-label="AI Health Chat" aria-live="polite">

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="w-14 h-14 rounded-[18px] flex items-center justify-center" style={{ background: '#9bb4ff' }}>
              <Bot className="w-7 h-7" style={{ color: '#0a1240' }} />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold" style={{ color: 'var(--hf-text)' }}>Your AI Health Assistant</p>
              <p className="text-xs mt-1" style={{ color: 'var(--hf-text-muted)' }}>
                Ask about vitals, medications, lab results, or get personalised health insights.
              </p>
            </div>
            {/* Suggestion chips */}
            <div className="flex flex-wrap gap-2 justify-center">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSend(s)}
                  aria-label={`Suggested: ${s}`}
                  className="px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all active:scale-95"
                  style={{
                    background: 'rgba(155,180,255,0.12)',
                    border: '1px solid rgba(155,180,255,0.3)',
                    color: 'var(--hf-sky-strong)',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            role="article"
            aria-label={msg.role === 'user' ? 'Your message' : 'AI response'}
          >
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-1"
                style={{ background: '#9bb4ff' }} aria-hidden="true">
                <Bot size={14} style={{ color: '#0a1240' }} />
              </div>
            )}
            <div
              className="rounded-[16px] px-4 py-2.5 max-w-[82%] text-sm leading-relaxed"
              style={msg.role === 'user'
                ? { background: '#d7f576', color: '#0a1200' }
                : { background: 'var(--hf-surface-2)', color: 'var(--hf-text)', border: '1px solid var(--hf-border)' }
              }
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
            {msg.role === 'user' && (
              <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-1"
                style={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)' }} aria-hidden="true">
                <User size={12} style={{ color: 'var(--hf-text-muted)' }} />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-2.5" role="status" aria-label="AI is typing">
            <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: '#9bb4ff' }}>
              <Bot size={14} style={{ color: '#0a1240' }} />
            </div>
            <div className="rounded-[16px] px-4 py-3 flex gap-1.5 items-center"
              style={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)' }}>
              {[0, 0.15, 0.3].map((d, i) => (
                <MotionDot key={i} delay={d} />
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="flex-shrink-0 px-4 py-3 border-t" style={{ borderColor: 'var(--hf-border)' }}>
        {speechError && (
          <p className="text-[10px] font-semibold mb-1.5" style={{ color: 'var(--hf-coral-strong)' }} role="alert">
            {speechError}
          </p>
        )}
        <div className="flex items-center gap-2">
          {/* Mic button */}
          <button
            onClick={() => { Haptics.light(); toggleMic(); }}
            aria-label={listening ? 'Stop voice input' : 'Start voice input'}
            aria-pressed={listening}
            className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-90"
            style={{
              background: listening ? '#c9bbff' : 'var(--hf-surface-2)',
              border: `1.5px solid ${listening ? '#c9bbff' : 'var(--hf-border)'}`,
              boxShadow: listening ? '0 0 12px rgba(201,187,255,0.5)' : 'none',
            }}
          >
            {listening
              ? <MicOff size={16} style={{ color: '#1a0a40' }} />
              : <Mic size={16} style={{ color: 'var(--hf-text-muted)' }} />}
          </button>

          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder={listening ? '🎙 Listening…' : 'Ask about your health data…'}
            aria-label="Message input"
            className="flex-1 h-10 rounded-2xl text-sm"
            style={{
              background: 'var(--hf-surface-2)',
              border: `1px solid ${listening ? '#c9bbff' : 'var(--hf-border)'}`,
              color: 'var(--hf-text)',
              transition: 'border-color 0.2s',
            }}
            disabled={loading}
          />

          <button
            onClick={() => handleSend()}
            disabled={loading || !input.trim()}
            aria-label="Send message"
            className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-90 disabled:opacity-40"
            style={{ background: '#d7f576' }}
          >
            {loading
              ? <Loader2 size={16} className="animate-spin" style={{ color: '#0a1200' }} />
              : <Send size={16} style={{ color: '#0a1200' }} />}
          </button>
        </div>

        {listening && (
          <p className="text-[10px] text-center mt-1.5 font-semibold animate-pulse" style={{ color: 'var(--hf-lavender-strong)' }}>
            🎙 Listening… speak now
          </p>
        )}
      </div>
    </div>
  );
}

// ── Animated typing dot ──────────────────────────────────────────────
function MotionDot({ delay }) {
  return (
    <span
      className="w-1.5 h-1.5 rounded-full"
      style={{
        background: 'var(--hf-text-muted)',
        animation: `bounce 1.2s ${delay}s infinite`,
      }}
    />
  );
}

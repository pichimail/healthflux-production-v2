import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Textarea } from '@/components/ui/textarea';
import {
  Brain, Send, Stethoscope, Sparkles, Loader2, RefreshCw, ChevronRight
} from 'lucide-react';
import { callAI } from '../components/utils/aiService';
import { useActiveProfile } from '../components/ActiveProfileContext';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { MarkdownContent } from '@/components/ui/markdown-content';

const QUICK_PROMPTS = [
  { icon: '💊', text: 'Review my medications' },
  { icon: '🩸', text: 'Explain my lab results' },
  { icon: '❤️', text: 'How are my vitals trending?' },
  { icon: '🏃', text: 'Lifestyle recommendations' },
  { icon: '⚠️', text: 'Any health risks I should know?' },
];

const URGENCY_COLORS = {
  emergency:    { bg: 'rgba(242,140,140,0.12)', border: '#f28c8c55', text: '#f28c8c', emoji: '🚨' },
  urgent:       { bg: 'rgba(247,201,163,0.12)', border: '#f7c9a355', text: '#f7c9a3', emoji: '⚡' },
  consult_soon: { bg: 'rgba(201,187,255,0.12)', border: '#c9bbff55', text: '#c9bbff', emoji: '🩺' },
  self_care:    { bg: 'rgba(168,230,207,0.12)', border: '#a8e6cf55', text: '#a8e6cf', emoji: '💚' },
};

function ChatBubble({ msg, isNew }) {
  const isUser = msg.role === 'user';
  return (
    <motion.div
      initial={isNew ? { opacity: 0, y: 10 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}
    >
      {!isUser && (
        <div className="w-8 h-8 rounded-2xl flex items-center justify-center mr-2.5 flex-shrink-0 mt-0.5"
          style={{ background: 'rgba(201,187,255,0.2)', border: '1px solid rgba(201,187,255,0.3)' }}>
          <Brain size={14} style={{ color: 'var(--hf-lavender-strong)' }} />
        </div>
      )}
      <div
        className="max-w-[82%] rounded-2xl px-4 py-3 text-sm"
        style={isUser
          ? { background: '#d7f576', color: '#0a1200', borderRadius: '18px 18px 4px 18px' }
          : { background: 'var(--hf-surface)', border: '1px solid var(--hf-border)', color: 'var(--hf-text)', borderRadius: '4px 18px 18px 18px' }
        }
      >
        {isUser ? (
          <p className="text-sm font-medium leading-relaxed">{msg.content}</p>
        ) : (
          <MarkdownContent content={msg.content} className="text-[13px]" />
        )}
      </div>
    </motion.div>
  );
}

export default function AIAssistant({ embedded = false }) {
  const { activeProfileId, activeProfile } = useActiveProfile();
  const [mode, setMode] = useState('chat');
  const [messages, setMessages] = useState([
    { role: 'assistant', content: `Hi! I'm your AI health assistant. I have access to your health records and can help you understand your vitals, medications, lab results, and more. What would you like to know?` }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [newMsgIdx, setNewMsgIdx] = useState(null);

  // Triage state
  const [symptoms, setSymptoms] = useState('');
  const [triageResult, setTriageResult] = useState(null);
  const [triageLoading, setTriageLoading] = useState(false);

  // Summary state
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  const { data: vitals = [] } = useQuery({
    queryKey: ['vitals-assist', activeProfileId],
    queryFn: () => base44.entities.VitalMeasurement.filter({ profile_id: activeProfileId }, '-measured_at', 20),
    enabled: !!activeProfileId,
  });
  const { data: meds = [] } = useQuery({
    queryKey: ['meds-assist', activeProfileId],
    queryFn: () => base44.entities.Medication.filter({ profile_id: activeProfileId, is_active: true }),
    enabled: !!activeProfileId,
  });
  const { data: labs = [] } = useQuery({
    queryKey: ['labs-assist', activeProfileId],
    queryFn: () => base44.entities.LabResult.filter({ profile_id: activeProfileId }, '-test_date', 15),
    enabled: !!activeProfileId,
  });

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const buildContext = () => {
    const p = activeProfile;
    const age = p?.date_of_birth ? new Date().getFullYear() - new Date(p.date_of_birth).getFullYear() : '?';
    const vStr = vitals.slice(0, 10).map(v => `${v.vital_type}: ${v.value || `${v.systolic}/${v.diastolic}`} ${v.unit || ''}`).join(', ');
    const mStr = meds.map(m => `${m.medication_name} ${m.dosage}`).join(', ');
    const lStr = labs.slice(0, 10).map(l => `${l.test_name}: ${l.value} ${l.unit} [${l.flag}]`).join(', ');
    return `Patient: ${p?.full_name || 'Unknown'}, Age: ${age}, Gender: ${p?.gender || '?'}, Blood Group: ${p?.blood_group || '?'}, Allergies: ${p?.allergies?.join(', ') || 'none'}, Conditions: ${p?.chronic_conditions?.join(', ') || 'none'}\nVitals: ${vStr || 'none'}\nMedications: ${mStr || 'none'}\nLabs: ${lStr || 'none'}`;
  };

  const sendMessage = async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput('');
    const newIdx = messages.length + 1;
    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    setLoading(true);
    try {
      const history = messages.slice(-6).map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n');
      const response = await callAI({
        prompt: `You are a warm, knowledgeable AI health assistant for HealthFlux. Use the patient's health context to give specific, personalized answers. Be concise (3-5 sentences), empathetic, and always recommend consulting a doctor for serious concerns.

Patient Context:
${buildContext()}

Conversation:
${history}
User: ${msg}

Respond as a caring health assistant. Use markdown for structure if needed.`,
      });
      setNewMsgIdx(newIdx);
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: "I'm having trouble right now. Please try again in a moment." }]);
    }
    setLoading(false);
  };

  const runTriage = async () => {
    if (!symptoms.trim()) return;
    setTriageLoading(true);
    setTriageResult(null);
    try {
      const { data } = await base44.functions.invoke('symptomTriage', { profileId: activeProfileId, symptoms });
      setTriageResult(data?.triage);
    } catch {
      toast.error('Triage failed. Please try again.');
    }
    setTriageLoading(false);
  };

  const generateSummary = async () => {
    setSummaryLoading(true);
    setSummary(null);
    try {
      const response = await callAI({
        prompt: `Generate a comprehensive, easy-to-read health summary for this patient. Use markdown with ## headers.

${buildContext()}

Include: ## Overall Health Status, ## Key Observations, ## Medication Review, ## Recommendations, ## Next Steps

Be specific, reference actual values, and keep language accessible.`,
      });
      setSummary(response);
    } catch {
      toast.error('Failed to generate summary');
    }
    setSummaryLoading(false);
  };

  const abnormalLabs = labs.filter(l => l.flag !== 'normal');

  const statsBar = [
    { v: vitals.length, label: 'Vitals', color: 'var(--hf-coral-strong)', tc: '#3d0000', icon: '❤️' },
    { v: meds.length, label: 'Meds', color: 'var(--hf-peach-strong)', tc: '#3d1a00', icon: '💊' },
    { v: labs.length, label: 'Labs', color: 'var(--hf-lavender-strong)', tc: '#1a0a40', icon: '🧪' },
    { v: abnormalLabs.length, label: 'Alerts', color: 'var(--hf-coral-strong)', tc: '#3d0000', icon: '⚠️' },
  ];

  return (
    <div className="flex flex-col" style={{ minHeight: embedded ? 'auto' : '100vh', background: 'var(--hf-bg)' }}>

      {/* ── Header ── */}
      <div className="px-5 pt-5 pb-4 flex-shrink-0">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(201,187,255,0.2)', border: '1px solid rgba(201,187,255,0.3)' }}>
            <Brain size={20} style={{ color: 'var(--hf-lavender-strong)' }} />
          </div>
          <div>
            <h1 className="text-lg font-black" style={{ color: 'var(--hf-text)' }}>AI Health Assistant</h1>
            <p className="text-xs" style={{ color: 'var(--hf-text-muted)' }}>
              {activeProfile?.full_name || 'Your'} personal health advisor
            </p>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {statsBar.map(s => (
            <div key={s.label} className="rounded-2xl p-2.5 text-center"
              style={{ background: s.color }}>
              <span className="text-sm">{s.icon}</span>
              <p className="text-base font-black" style={{ color: s.tc }}>{s.v}</p>
              <p className="text-[9px] font-bold uppercase tracking-wide mt-0.5" style={{ color: s.tc, opacity: 0.72 }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Mode tabs */}
        <div className="flex gap-2 p-1 rounded-2xl" style={{ background: 'var(--hf-surface-2)' }}>
          {[
            { key: 'chat', icon: '💬', label: 'Chat' },
            { key: 'triage', icon: '🩺', label: 'Triage' },
            { key: 'summary', icon: '📋', label: 'Summary' },
          ].map(m => (
            <button
              key={m.key}
              onClick={() => setMode(m.key)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all"
              style={mode === m.key
                ? { background: '#c9bbff', color: '#1a0a40', boxShadow: '0 2px 8px rgba(201,187,255,0.3)' }
                : { color: 'var(--hf-text-muted)' }
              }
            >
              <span>{m.icon}</span> {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto pb-28">

        {/* ── CHAT ── */}
        {mode === 'chat' && (
          <div className="flex flex-col h-full">
            {/* Messages */}
            <div className="flex-1 px-4 py-2">
              {messages.map((msg, i) => (
                <ChatBubble key={i} msg={msg} isNew={i === newMsgIdx} />
              ))}
              {loading && (
                <div className="flex justify-start mb-3">
                  <div className="w-8 h-8 rounded-2xl flex items-center justify-center mr-2.5 flex-shrink-0"
                    style={{ background: 'rgba(201,187,255,0.2)', border: '1px solid rgba(201,187,255,0.3)' }}>
                    <Brain size={14} style={{ color: 'var(--hf-lavender-strong)' }} />
                  </div>
                  <div className="px-4 py-3 rounded-2xl flex items-center gap-1.5"
                    style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
                    {[0, 1, 2].map(i => (
                      <motion.div key={i}
                        animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 0.8, delay: i * 0.15, repeat: Infinity }}
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: '#c9bbff' }}
                      />
                    ))}
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Quick prompts */}
            <div className="px-4 mb-3">
              <div className="flex gap-2 overflow-x-auto scrollbar-hide py-1">
                {QUICK_PROMPTS.map(p => (
                  <button key={p.text} onClick={() => sendMessage(p.text)}
                    disabled={loading}
                    className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[11px] font-bold whitespace-nowrap transition-all active:scale-95"
                    style={{ background: 'rgba(201,187,255,0.1)', border: '1px solid rgba(201,187,255,0.25)', color: 'var(--hf-lavender-strong)' }}>
                    <span>{p.icon}</span> {p.text}
                  </button>
                ))}
              </div>
            </div>

            {/* Input bar */}
            <div className="px-4 pb-2">
              <div className="flex gap-2 p-2 rounded-2xl" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  placeholder="Ask about your health…"
                  style={{ background: 'transparent', color: 'var(--hf-text)' }}
                  className="flex-1 text-sm outline-none px-2 min-h-[36px]"
                />
                <button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || loading}
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all active:scale-90 disabled:opacity-40"
                  style={{ background: '#d7f576', color: '#0a1200' }}>
                  {loading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── TRIAGE ── */}
        {mode === 'triage' && (
          <div className="px-4 space-y-4">
            <div className="rounded-2xl p-4" style={{ background: 'rgba(247,201,163,0.1)', border: '1px solid rgba(247,201,163,0.3)' }}>
              <p className="text-sm font-black mb-1" style={{ color: 'var(--hf-peach-strong)' }}>⚕️ AI Symptom Triage</p>
              <p className="text-[11px] leading-relaxed" style={{ color: 'var(--hf-text-muted)' }}>
                Describe your symptoms for an urgency assessment. For emergencies, call <strong>108</strong> immediately.
              </p>
            </div>

            <AnimatePresence mode="wait">
              {!triageResult ? (
                <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
                    <Textarea
                      value={symptoms}
                      onChange={e => setSymptoms(e.target.value)}
                      placeholder="Describe your symptoms in detail…&#10;e.g. I've had chest pain and shortness of breath since morning…"
                      rows={5}
                      className="rounded-xl text-sm resize-none"
                      style={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)', color: 'var(--hf-text)' }}
                    />
                    <button
                      onClick={runTriage}
                      disabled={triageLoading || !symptoms.trim()}
                      className="w-full h-12 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-98 disabled:opacity-50"
                      style={{ background: '#f7c9a3', color: '#3d1a00' }}
                    >
                      {triageLoading
                        ? <><Loader2 size={15} className="animate-spin" /> Analyzing…</>
                        : <><Stethoscope size={15} /> Analyze Symptoms</>}
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div key="result" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                  {(() => {
                    const urg = triageResult.urgency || 'self_care';
                    const s = URGENCY_COLORS[urg] || URGENCY_COLORS.self_care;
                    return (
                      <>
                        <div className="rounded-2xl p-4" style={{ background: s.bg, border: `1px solid ${s.border}` }}>
                          <p className="text-[10px] font-black uppercase tracking-widest mb-1.5" style={{ color: s.text }}>Urgency</p>
                          <p className="text-2xl font-black" style={{ color: s.text }}>
                            {s.emoji} {urg.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                          </p>
                        </div>
                        <div className="rounded-2xl p-4" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
                          <p className="text-xs font-black mb-2" style={{ color: 'var(--hf-text)' }}>Assessment</p>
                          <p className="text-[13px] leading-relaxed" style={{ color: 'var(--hf-text-muted)' }}>{triageResult.assessment}</p>
                        </div>
                        {triageResult.recommendations?.immediate_action && (
                          <div className="rounded-2xl p-4" style={{ background: 'rgba(168,230,207,0.1)', border: '1px solid rgba(168,230,207,0.3)' }}>
                            <p className="text-xs font-black mb-1.5" style={{ color: 'var(--hf-mint-strong)' }}>Immediate Action</p>
                            <p className="text-[13px] leading-relaxed" style={{ color: 'var(--hf-text-muted)' }}>{triageResult.recommendations.immediate_action}</p>
                          </div>
                        )}
                        {triageResult.recommendations?.self_care_tips?.length > 0 && (
                          <div className="rounded-2xl p-4" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
                            <p className="text-xs font-black mb-2" style={{ color: 'var(--hf-text)' }}>Self-Care Tips</p>
                            <ul className="space-y-1.5">
                              {triageResult.recommendations.self_care_tips.map((tip, i) => (
                                <li key={i} className="flex items-start gap-2 text-[13px]" style={{ color: 'var(--hf-text-muted)' }}>
                                  <span style={{ color: 'var(--hf-lemon-strong)' }} className="mt-0.5 flex-shrink-0">•</span>{tip}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {(urg === 'urgent' || urg === 'consult_soon') && (
                          <Link to={createPageUrl('Telehealth')}>
                            <div className="rounded-2xl p-4 flex items-center justify-between active-press"
                              style={{ background: 'rgba(215,245,118,0.08)', border: '1px solid rgba(215,245,118,0.25)' }}>
                              <div>
                                <p className="text-sm font-bold" style={{ color: 'var(--hf-lemon-strong)' }}>Book Telehealth</p>
                                <p className="text-xs" style={{ color: 'var(--hf-text-muted)' }}>Connect with a doctor today</p>
                              </div>
                              <ChevronRight size={18} style={{ color: 'var(--hf-lemon-strong)' }} />
                            </div>
                          </Link>
                        )}
                        <button onClick={() => { setTriageResult(null); setSymptoms(''); }}
                          className="w-full h-11 rounded-2xl text-xs font-bold transition-all active:scale-95"
                          style={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)', color: 'var(--hf-text-muted)' }}>
                          New Assessment
                        </button>
                      </>
                    );
                  })()}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* ── SUMMARY ── */}
        {mode === 'summary' && (
          <div className="px-4 space-y-4">
            <button
              onClick={generateSummary}
              disabled={summaryLoading}
              className="w-full h-12 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-60"
              style={{ background: 'rgba(201,187,255,0.2)', border: '1.5px solid rgba(201,187,255,0.4)', color: 'var(--hf-lavender-strong)' }}>
              {summaryLoading
                ? <><Loader2 size={15} className="animate-spin" /> Generating…</>
                : <><Sparkles size={15} /> Generate Health Summary</>}
            </button>

            {summaryLoading && (
              <div className="flex flex-col items-center py-16 gap-4">
                <motion.div
                  animate={{ scale: [1, 1.1, 1], opacity: [0.6, 1, 0.6] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="w-16 h-16 rounded-3xl flex items-center justify-center"
                  style={{ background: 'rgba(201,187,255,0.15)' }}>
                  <Brain size={28} style={{ color: 'var(--hf-lavender-strong)' }} />
                </motion.div>
                <p className="text-sm font-bold" style={{ color: 'var(--hf-text)' }}>Analyzing your health data…</p>
                <p className="text-xs text-center max-w-xs" style={{ color: 'var(--hf-text-muted)' }}>Reviewing vitals, medications, and lab results</p>
              </div>
            )}

            {!summary && !summaryLoading && (
              <div className="flex flex-col items-center py-16 gap-4 text-center">
                <div className="w-16 h-16 rounded-3xl flex items-center justify-center text-3xl"
                  style={{ background: 'rgba(201,187,255,0.1)', border: '1px solid rgba(201,187,255,0.2)' }}>🧠</div>
                <p className="text-sm font-bold" style={{ color: 'var(--hf-text)' }}>Your personalized health summary</p>
                <p className="text-xs max-w-xs" style={{ color: 'var(--hf-text-muted)' }}>
                  Tap Generate for a comprehensive AI analysis of your vitals, labs, and medications.
                </p>
              </div>
            )}

            {summary && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
                  <div className="px-4 py-3 flex items-center gap-2 border-b" style={{ borderColor: 'var(--hf-border)' }}>
                    <Brain size={14} style={{ color: 'var(--hf-lavender-strong)' }} />
                    <p className="text-xs font-black" style={{ color: 'var(--hf-text)' }}>AI Health Summary</p>
                  </div>
                  <div className="p-4">
                    <MarkdownContent content={summary} className="text-[13px]" />
                    <div className="mt-4 p-3 rounded-xl text-xs flex items-start gap-2"
                      style={{ background: 'rgba(215,245,118,0.08)', border: '1px solid rgba(215,245,118,0.2)' }}>
                      <span>💡</span>
                      <span style={{ color: 'var(--hf-text-muted)' }}>For informational purposes only. Always consult your healthcare provider.</span>
                    </div>
                  </div>
                  <div className="px-4 pb-4">
                    <button onClick={generateSummary} disabled={summaryLoading}
                      className="w-full h-10 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
                      style={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)', color: 'var(--hf-text-muted)' }}>
                      <RefreshCw size={12} /> Regenerate
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
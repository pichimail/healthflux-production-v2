import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import AdminLayout from '../components/admin/AdminLayout';
import { Send, Bot, User, Loader2, Sparkles } from 'lucide-react';
import { callAI } from '../components/utils/aiService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const SUGGESTED_PROMPTS = [
  'Show me app health overview: total users, documents, vitals, AI insights',
  'List all feature flags and their current states',
  'Which users have the most activity this week?',
  'Show OCR failure rate for documents',
  'What are the top 5 most prescribed medications?',
  'Generate a growth summary for this month',
];

export default function AdminAssistant() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hello! I\'m your HealthFlux Admin Assistant. I can help you query app data, check system health, manage feature flags, and generate reports. What would you like to know?'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      if (u?.role !== 'admin') window.location.href = '/';
    });
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (content) => {
    const userMsg = content || input.trim();
    if (!userMsg) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      // Fetch relevant data to provide context
      const [users, documents, vitals, insights, medications, profiles] = await Promise.all([
        base44.entities.User.list('-created_date', 100).catch(() => []),
        base44.entities.MedicalDocument.list('-created_date', 200).catch(() => []),
        base44.entities.VitalMeasurement.list('-measured_at', 200).catch(() => []),
        base44.entities.HealthInsight.list('-created_date', 200).catch(() => []),
        base44.entities.Medication.list('-created_date', 200).catch(() => []),
        base44.entities.Profile.list('-created_date', 200).catch(() => []),
      ]);

      const today = new Date().toDateString();
      const systemContext = `
You are an admin assistant for HealthFlux, a health tracking platform.

CURRENT APP DATA SUMMARY:
- Total Users: ${users.length}
- Total Profiles: ${profiles.length}
- Total Documents: ${documents.length} (${documents.filter(d => new Date(d.created_date).toDateString() === today).length} today)
- OCR Completed: ${documents.filter(d => d.status === 'completed').length}, Failed: ${documents.filter(d => d.status === 'failed').length}
- Total Vitals Logged: ${vitals.length} (${vitals.filter(v => new Date(v.measured_at).toDateString() === today).length} today)
- Total AI Insights: ${insights.length}
- Total Medications: ${medications.length} (${medications.filter(m => m.is_active).length} active)
- Active Users (with profiles): ${new Set(profiles.map(p => p.created_by)).size}

DOCUMENT TYPES: ${JSON.stringify(documents.reduce((acc, d) => { acc[d.document_type || 'other'] = (acc[d.document_type || 'other'] || 0) + 1; return acc; }, {}))}
VITAL TYPES: ${JSON.stringify(vitals.reduce((acc, v) => { acc[v.vital_type] = (acc[v.vital_type] || 0) + 1; return acc; }, {}))}
INSIGHT SEVERITY: ${JSON.stringify(insights.reduce((acc, i) => { acc[i.severity] = (acc[i.severity] || 0) + 1; return acc; }, {}))}

Answer the admin's question concisely and helpfully. You can provide actionable insights, flag issues, and suggest improvements. 
If the admin asks to change data or settings, acknowledge it and describe what action would be taken (you cannot execute writes directly, but describe the action).
`;

      // AI_FEATURE: Admin analytics assistant | PROVIDER: claude
      const response = await callAI({
        prompt: `${systemContext}\n\nAdmin Question: ${userMsg}`,
        add_context_from_internet: false,
      });

      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout currentPageName="AdminAssistant">
      <div className="flex flex-col h-[calc(100vh-8rem)] max-h-[800px]">
        <div className="mb-4">
          <h1 className="text-2xl font-black" style={{ color: 'var(--hf-text)' }}>Admin Assistant</h1>
          <p className="text-sm" style={{ color: 'var(--hf-text-muted)' }}>AI-powered admin insights and data queries</p>
        </div>

        {/* Suggested prompts */}
        {messages.length <= 1 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
            {SUGGESTED_PROMPTS.map((prompt, i) => (
              <button key={i} onClick={() => sendMessage(prompt)}
                className="text-left p-3 rounded-2xl text-xs transition-all active:scale-[0.98]"
                style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)', color: 'var(--hf-text)' }}>
                <Sparkles size={12} className="inline mr-1.5 opacity-60" />
                {prompt}
              </button>
            ))}
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-[#d7f576]' : 'bg-[#c9bbff]'}`}>
                {msg.role === 'user' ? <User size={14} className="text-[#0a1200]" /> : <Bot size={14} className="text-[#1a0a40]" />}
              </div>
              <div className={`max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed ${msg.role === 'user' ? 'text-right' : 'text-left'}`}
                style={{
                  background: msg.role === 'user' ? '#d7f576' : 'var(--hf-surface)',
                  border: '1px solid var(--hf-border)',
                  color: msg.role === 'user' ? '#0a1200' : 'var(--hf-text)',
                }}>
                <div className="whitespace-pre-wrap">{msg.content}</div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-[#c9bbff]">
                <Bot size={14} className="text-[#1a0a40]" />
              </div>
              <div className="p-3 rounded-2xl" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
                <Loader2 size={16} className="animate-spin" style={{ color: 'var(--hf-text-muted)' }} />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="Ask about app data, users, metrics..."
            className="flex-1 h-12 rounded-2xl"
            style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)', color: 'var(--hf-text)' }}
            disabled={loading}
          />
          <Button onClick={() => sendMessage()} disabled={loading || !input.trim()}
            className="h-12 w-12 rounded-2xl flex-shrink-0" style={{ background: '#d7f576', color: '#0a1200' }}>
            <Send size={16} />
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}
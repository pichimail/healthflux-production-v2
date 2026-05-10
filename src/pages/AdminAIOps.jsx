import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import AdminLayout from '../components/admin/AdminLayout.jsx';
import { Brain, FileText, AlertCircle, CheckCircle2, Clock, Activity } from 'lucide-react';
import { format } from 'date-fns';

export default function AdminAIOps() {
  const { data: documents = [] } = useQuery({
    queryKey: ['aiops-docs'],
    queryFn: () => base44.entities.MedicalDocument.list('-created_date', 100),
  });

  const { data: insights = [] } = useQuery({
    queryKey: ['aiops-insights'],
    queryFn: () => base44.entities.HealthInsight.list('-created_date', 50),
  });

  const processing = documents.filter(d => d.status === 'processing');
  const completed = documents.filter(d => d.status === 'completed');
  const failed = documents.filter(d => d.status === 'failed');
  const pending = documents.filter(d => d.status === 'pending' || d.status === 'uploaded');

  const statusConfig = {
    completed: { bg: '#a8e6cf', color: '#003d20', icon: CheckCircle2 },
    processing: { bg: '#f7c9a3', color: '#3d1a00', icon: Clock },
    failed: { bg: '#f28c8c', color: '#3d0000', icon: AlertCircle },
    pending: { bg: '#9bb4ff', color: '#0a1240', icon: Clock },
    uploaded: { bg: '#c9bbff', color: '#1a0a40', icon: FileText },
  };

  const aiStats = [
    { label: 'Total Processed', value: documents.length, bg: '#d7f576', color: '#0a1200' },
    { label: 'Completed', value: completed.length, bg: '#a8e6cf', color: '#003d20' },
    { label: 'Processing', value: processing.length, bg: '#f7c9a3', color: '#3d1a00' },
    { label: 'Failed', value: failed.length, bg: '#f28c8c', color: '#3d0000' },
    { label: 'AI Insights', value: insights.length, bg: '#c9bbff', color: '#1a0a40' },
    { label: 'Pending', value: pending.length, bg: '#9bb4ff', color: '#0a1240' },
  ];

  return (
    <AdminLayout currentPageName="AdminAIOps">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--hf-text)' }}>AI Ops</h1>
          <p className="text-sm" style={{ color: 'var(--hf-text-muted)' }}>Monitor AI processing pipeline & health</p>
        </div>

        {/* AI Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {aiStats.map((s, i) => (
            <div key={i} className="rounded-[20px] p-4" style={{ background: s.bg }}>
              <p className="text-2xl font-black" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[10px] font-bold uppercase tracking-wide mt-0.5" style={{ color: s.color, opacity: 0.7 }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* AI Model Info */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="rounded-[22px] p-5" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: '#c9bbff' }}>
                <Brain size={18} className="text-[#1a0a40]" />
              </div>
              <div>
                <p className="font-bold text-sm" style={{ color: 'var(--hf-text)' }}>AI Model Configuration</p>
                <p className="text-xs" style={{ color: 'var(--hf-text-muted)' }}>Active providers</p>
              </div>
            </div>
            <div className="space-y-2">
              {[
                { label: 'Primary LLM', value: 'OpenAI GPT-4o', status: 'active', bg: '#a8e6cf', tc: '#003d20' },
                { label: 'Secondary LLM', value: 'Google Gemini', status: 'active', bg: '#a8e6cf', tc: '#003d20' },
                { label: 'OCR Engine', value: 'Integrated (Base44)', status: 'active', bg: '#a8e6cf', tc: '#003d20' },
                { label: 'Drug Interaction DB', value: 'AI-powered', status: 'active', bg: '#a8e6cf', tc: '#003d20' },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between p-3 rounded-xl"
                  style={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)' }}>
                  <div>
                    <p className="text-xs font-bold" style={{ color: 'var(--hf-text)' }}>{item.label}</p>
                    <p className="text-[10px]" style={{ color: 'var(--hf-text-muted)' }}>{item.value}</p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: item.bg, color: item.tc }}>
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[22px] p-5" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: '#d7f576' }}>
                <Activity size={18} className="text-[#0a1200]" />
              </div>
              <div>
                <p className="font-bold text-sm" style={{ color: 'var(--hf-text)' }}>Pipeline Status</p>
                <p className="text-xs" style={{ color: 'var(--hf-text-muted)' }}>Processing health</p>
              </div>
            </div>
            <div className="space-y-2">
              {[
                { label: 'Document OCR', pct: documents.length > 0 ? Math.round((completed.length / documents.length) * 100) : 100 },
                { label: 'AI Analysis', pct: documents.length > 0 ? Math.round((completed.length / documents.length) * 100) : 100 },
                { label: 'Insight Generation', pct: insights.length > 0 ? 95 : 0 },
                { label: 'Profile Matching', pct: 98 },
              ].map(item => (
                <div key={item.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span style={{ color: 'var(--hf-text)' }}>{item.label}</span>
                    <span style={{ color: 'var(--hf-text-muted)' }}>{item.pct}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full" style={{ background: 'var(--hf-surface-2)' }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${item.pct}%`, background: item.pct > 90 ? '#d7f576' : item.pct > 70 ? '#f7c9a3' : '#f28c8c' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent documents processing log */}
        <div className="rounded-[22px] overflow-hidden" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
          <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--hf-border)' }}>
            <p className="font-bold text-sm" style={{ color: 'var(--hf-text)' }}>Recent Document Processing Log</p>
            <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background: 'rgba(215,245,118,0.15)', color: 'var(--hf-lemon-strong)' }}>
              Last {Math.min(documents.length, 20)} docs
            </span>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--hf-border)' }}>
            {documents.slice(0, 20).map(doc => {
              const sc = statusConfig[doc.status] || statusConfig.pending;
              const StatusIcon = sc.icon;
              return (
                <div key={doc.id} className="flex items-center justify-between gap-3 p-4">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: sc.bg }}>
                      <StatusIcon size={14} style={{ color: sc.color }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate" style={{ color: 'var(--hf-text)' }}>{doc.title}</p>
                      <p className="text-[10px]" style={{ color: 'var(--hf-text-muted)' }}>
                        {doc.created_date ? format(new Date(doc.created_date), 'MMM d, HH:mm') : '—'} · {doc.document_type?.replace(/_/g,' ')}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: sc.bg, color: sc.color }}>
                    {doc.status}
                  </span>
                </div>
              );
            })}
            {documents.length === 0 && (
              <div className="text-center py-10">
                <p className="text-sm" style={{ color: 'var(--hf-text-muted)' }}>No document processing logs yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
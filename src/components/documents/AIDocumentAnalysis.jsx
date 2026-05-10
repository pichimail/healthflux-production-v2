import React, { useState } from 'react';
import { Loader2, Brain, FileText, Users, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { callAI, callAIVision } from '../utils/aiService';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

function Section({ title, color, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)' }}>
      <button className="w-full flex items-center justify-between p-3" onClick={() => setOpen(o => !o)}>
        <p className="text-xs font-black" style={{ color }}>{title}</p>
        {open ? <ChevronUp size={13} style={{ color: 'var(--hf-text-muted)' }} /> : <ChevronDown size={13} style={{ color: 'var(--hf-text-muted)' }} />}
      </button>
      {open && <div className="px-3 pb-3 border-t" style={{ borderColor: 'var(--hf-border)' }}>{children}</div>}
    </div>
  );
}

export default function AIDocumentAnalysis({ document, profileId, onUpdate }) {
  const [loading, setLoading] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [familyLoading, setFamilyLoading] = useState(false);
  const [ocrText, setOcrText] = useState(null);
  const [familyHistory, setFamilyHistory] = useState(null);
  const [summary, setSummary] = useState(document?.ai_summary || null);

  const generateSummary = async () => {
    setLoading(true);
    try {
      // AI_FEATURE: Document structured summary | PROVIDER: claude
      const result = await callAI({
        prompt: `Analyze this medical document and generate a structured summary.

Document Title: ${document.title}
Type: ${document.document_type}
Date: ${document.document_date || 'unknown'}
Facility: ${document.facility_name || 'unknown'}
Doctor: ${document.doctor_name || 'unknown'}
${document.notes ? `Notes: ${document.notes}` : ''}
${ocrText ? `\nExtracted Content:\n${ocrText}` : ''}

Generate a clear structured medical summary with:
## 📋 Document Summary
## 🔑 Key Findings
## 💊 Medications Mentioned
## 🔬 Lab Values / Test Results
## ⚠️ Red Flags or Concerns
## 📅 Follow-up Required

Be concise and clinically accurate.`,
      });
      setSummary(result);
      await base44.entities.MedicalDocument.update(document.id, { ai_summary: result });
      if (onUpdate) onUpdate();
      toast.success('Summary generated');
    } catch (e) {
      toast.error('Summary generation failed');
    }
    setLoading(false);
  };

  const runOCR = async () => {
    if (!document.file_url) { toast.error('No file attached'); return; }
    setOcrLoading(true);
    try {
      // AI_FEATURE: OCR extraction from medical document | PROVIDER: gemini (vision)
      const text = await callAIVision({
        prompt: `Extract ALL text from this medical document accurately. Preserve structure, tables, lab values, medication names, dosages, dates, and any numbers. Return the complete extracted text with formatting preserved.`,
        fileUrls: [document.file_url],
      });
      setOcrText(text);
      toast.success('Text extracted');
    } catch (e) {
      toast.error('OCR failed');
    }
    setOcrLoading(false);
  };

  const extractFamilyHistory = async () => {
    setFamilyLoading(true);
    try {
      const sourceText = ocrText || document.notes || document.ai_summary || document.title;
      if (!sourceText) { toast.error('No document content to analyze'); setFamilyLoading(false); return; }

      // AI_FEATURE: Family history extraction | PROVIDER: openai (structured)
      const result = await callAI({
        prompt: `Extract family medical history from this document content. Look for mentions of parents, siblings, grandparents, or relatives with health conditions.

Document content: ${sourceText}`,
        responseJsonSchema: {
          type: 'object',
          properties: {
            has_family_history: { type: 'boolean' },
            family_members: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  relation: { type: 'string' },
                  conditions: { type: 'array', items: { type: 'string' } },
                  notes: { type: 'string' },
                }
              }
            },
            hereditary_risks: { type: 'array', items: { type: 'string' } },
            summary: { type: 'string' },
          }
        }
      });
      setFamilyHistory(result);
      toast.success('Family history extracted');
    } catch (e) {
      toast.error('Extraction failed');
    }
    setFamilyLoading(false);
  };

  return (
    <div className="space-y-3">
      {/* Action buttons */}
      <div className="grid grid-cols-3 gap-2">
        <button onClick={runOCR} disabled={ocrLoading}
          className="flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all active:scale-95"
          style={{ background: 'rgba(155,180,255,0.12)', border: '1px solid rgba(155,180,255,0.3)' }}>
          {ocrLoading ? <Loader2 size={16} className="animate-spin" style={{ color: 'var(--hf-sky-strong)' }} /> : <FileText size={16} style={{ color: 'var(--hf-sky-strong)' }} />}
          <span className="text-[9px] font-black uppercase tracking-wide" style={{ color: 'var(--hf-sky-strong)' }}>OCR Extract</span>
        </button>

        <button onClick={generateSummary} disabled={loading}
          className="flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all active:scale-95"
          style={{ background: 'rgba(201,187,255,0.12)', border: '1px solid rgba(201,187,255,0.3)' }}>
          {loading ? <Loader2 size={16} className="animate-spin" style={{ color: 'var(--hf-lavender-strong)' }} /> : <Brain size={16} style={{ color: 'var(--hf-lavender-strong)' }} />}
          <span className="text-[9px] font-black uppercase tracking-wide" style={{ color: 'var(--hf-lavender-strong)' }}>AI Summary</span>
        </button>

        <button onClick={extractFamilyHistory} disabled={familyLoading}
          className="flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all active:scale-95"
          style={{ background: 'rgba(168,230,207,0.12)', border: '1px solid rgba(168,230,207,0.3)' }}>
          {familyLoading ? <Loader2 size={16} className="animate-spin" style={{ color: 'var(--hf-mint-strong)' }} /> : <Users size={16} style={{ color: 'var(--hf-mint-strong)' }} />}
          <span className="text-[9px] font-black uppercase tracking-wide" style={{ color: 'var(--hf-mint-strong)' }}>Family Hx</span>
        </button>
      </div>

      {/* OCR Result */}
      {ocrText && (
        <Section title="📄 Extracted Text (OCR)" color="#9bb4ff" defaultOpen>
          <div className="mt-3 max-h-48 overflow-y-auto">
            <pre className="text-[9px] leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--hf-text-muted)', fontFamily: 'monospace' }}>
              {ocrText}
            </pre>
          </div>
        </Section>
      )}

      {/* AI Summary */}
      {summary && (
        <Section title="🧠 AI Medical Summary" color="#c9bbff" defaultOpen>
          <div className="mt-3">
            <ReactMarkdown components={{
              h2: ({ children }) => <h2 className="text-[10px] font-black mt-3 mb-1 first:mt-0 uppercase tracking-wider" style={{ color: 'var(--hf-lavender-strong)' }}>{children}</h2>,
              p: ({ children }) => <p className="text-xs leading-relaxed mb-1.5" style={{ color: 'var(--hf-text-muted)' }}>{children}</p>,
              li: ({ children }) => <li className="text-xs mb-0.5 list-disc ml-3" style={{ color: 'var(--hf-text-muted)' }}>{children}</li>,
              ul: ({ children }) => <ul className="mb-2">{children}</ul>,
              strong: ({ children }) => <strong style={{ color: 'var(--hf-text)' }}>{children}</strong>,
            }}>
              {summary}
            </ReactMarkdown>
          </div>
        </Section>
      )}

      {/* Family History */}
      {familyHistory && (
        <Section title="👨‍👩‍👧 Family History" color="#a8e6cf" defaultOpen>
          <div className="mt-3 space-y-2">
            {!familyHistory.has_family_history ? (
              <p className="text-xs" style={{ color: 'var(--hf-text-muted)' }}>No family history found in this document.</p>
            ) : (
              <>
                {familyHistory.family_members?.map((fm, i) => (
                  <div key={i} className="p-2.5 rounded-xl" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
                    <p className="text-xs font-bold capitalize mb-1" style={{ color: 'var(--hf-text)' }}>👤 {fm.relation}</p>
                    <div className="flex flex-wrap gap-1">
                      {fm.conditions?.map((c, j) => (
                        <span key={j} className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
                          style={{ background: 'rgba(168,230,207,0.15)', color: 'var(--hf-mint-strong)' }}>{c}</span>
                      ))}
                    </div>
                    {fm.notes && <p className="text-[9px] mt-1" style={{ color: 'var(--hf-text-muted)' }}>{fm.notes}</p>}
                  </div>
                ))}
                {familyHistory.hereditary_risks?.length > 0 && (
                  <div className="p-2.5 rounded-xl" style={{ background: 'rgba(247,201,163,0.1)', border: '1px solid rgba(247,201,163,0.2)' }}>
                    <p className="text-[9px] font-black uppercase tracking-wide mb-1" style={{ color: 'var(--hf-peach-strong)' }}>⚠️ Hereditary Risks</p>
                    <div className="flex flex-wrap gap-1">
                      {familyHistory.hereditary_risks.map((r, i) => (
                        <span key={i} className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(247,201,163,0.2)', color: 'var(--hf-peach-strong)' }}>{r}</span>
                      ))}
                    </div>
                  </div>
                )}
                {familyHistory.summary && (
                  <p className="text-xs" style={{ color: 'var(--hf-text-muted)' }}>{familyHistory.summary}</p>
                )}
              </>
            )}
          </div>
        </Section>
      )}

      {!ocrText && !summary && !familyHistory && (
        <div className="text-center py-6">
          <Sparkles size={20} className="mx-auto mb-2" style={{ color: 'var(--hf-text-muted)' }} />
          <p className="text-xs" style={{ color: 'var(--hf-text-muted)' }}>
            Use the buttons above to extract text, generate an AI summary, or extract family history from this document.
          </p>
        </div>
      )}
    </div>
  );
}
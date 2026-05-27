// @ts-nocheck
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Upload, Search, FileText, X,
  Calendar, Loader2, CheckCircle, Clock,
  AlertCircle, RefreshCw, Eye, Trash2, Plus,
  FlaskConical, Pill, Image, FileHeart, Shield, Stethoscope, FilePlus, Microscope } from
'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useActiveProfile } from '../components/ActiveProfileContext';
import { useFeatureFlags } from '@/lib/FeatureFlagsContext';
import UniversalUpload from '../components/UniversalUpload';
import DocumentExtractedView from '../components/documents/DocumentExtractedView';
import { MarkdownPreview } from '@/components/ui/markdown-content';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  deleteDocument,
  listDocuments,
  reprocessDocument,
  semanticDocumentSearch,
} from '@/services/documents';

const DOC_TYPES = [
{ value: 'all', label: 'All Types', icon: FileText, color: 'var(--hf-lemon-strong)', tc: '#0a1200' },
{ value: 'lab_report', label: 'Lab Reports', icon: FlaskConical, color: 'var(--hf-lavender-strong)', tc: '#1a0a40' },
{ value: 'prescription', label: 'Prescriptions', icon: Pill, color: 'var(--hf-peach-strong)', tc: '#3d1a00' },
{ value: 'imaging', label: 'Imaging', icon: Image, color: 'var(--hf-sky-strong)', tc: '#0a1240' },
{ value: 'discharge_summary', label: 'Discharge', icon: FileHeart, color: 'var(--hf-coral-strong)', tc: '#3d0000' },
{ value: 'consultation', label: 'Consultation', icon: Stethoscope, color: 'var(--hf-mint-strong)', tc: '#003d20' },
{ value: 'vaccination', label: 'Vaccination', icon: Shield, color: '#e8d5ff', tc: '#2d0a4a' },
{ value: 'insurance', label: 'Insurance', icon: Shield, color: 'var(--hf-lemon-strong)', tc: '#0a1200' },
{ value: 'other', label: 'Other', icon: FilePlus, color: 'var(--hf-peach-strong)', tc: '#3d1a00' }];


const STATUS_CONFIG = {
  completed: { label: 'Done', color: 'var(--hf-mint-strong)', bg: 'rgba(168,230,207,0.15)', icon: CheckCircle },
  processing: { label: 'Processing', color: 'var(--hf-peach-strong)', bg: 'rgba(247,201,163,0.15)', icon: Loader2 },
  pending: { label: 'Pending', color: 'var(--hf-sky-strong)', bg: 'rgba(155,180,255,0.15)', icon: Clock },
  failed: { label: 'Failed', color: 'var(--hf-coral-strong)', bg: 'rgba(242,140,140,0.15)', icon: AlertCircle },
  uploaded: { label: 'Uploaded', color: 'var(--hf-lemon-strong)', bg: 'rgba(215,245,118,0.15)', icon: CheckCircle }
};

function DocTypeIcon({ type, size = 16 }) {
  const config = DOC_TYPES.find((d) => d.value === type) || DOC_TYPES[DOC_TYPES.length - 1];
  const Icon = config.icon;
  return (
    <div className="rounded-xl flex items-center justify-center flex-shrink-0" style={{ width: size + 16, height: size + 16, background: config.color + '30' }}>
      <Icon size={size} style={{ color: config.color }} />
    </div>);

}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  return (
    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold"
    style={{ background: cfg.bg, color: cfg.color }}>
      <Icon size={9} className={status === 'processing' ? 'animate-spin' : ''} />
      {cfg.label}
    </span>);

}

function DocumentCard({ doc, onView, onDelete, onReprocess, onOCR, viewMode }) {
  const typeConfig = DOC_TYPES.find((d) => d.value === doc.document_type) || DOC_TYPES[DOC_TYPES.length - 1];

  if (viewMode === 'list') {
    return (
      <div className="flex items-center gap-3 p-3 rounded-[14px] transition-all active:scale-[0.98]"
      style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
        <DocTypeIcon type={doc.document_type} size={18} />
        <button
          type="button"
          onClick={() => onView(doc)}
          className="flex-1 min-w-0 text-left rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d7f576]"
          aria-label={`Open ${doc.title || 'document'}`}>
          <p className="text-sm font-bold truncate" style={{ color: 'var(--hf-text)' }}>{doc.title || 'Untitled'}</p>
          <div className="flex items-center gap-2 mt-0.5">
            {doc.document_date &&
            <span className="text-[10px]" style={{ color: 'var(--hf-text-muted)' }}>
                {format(new Date(doc.document_date), 'MMM d, yyyy')}
              </span>
            }
            {doc.facility_name &&
            <span className="text-[10px]" style={{ color: 'var(--hf-text-muted)' }}>· {doc.facility_name}</span>
            }
          </div>
        </button>
        <StatusBadge status={doc.status} />
        <div className="flex items-center gap-1">
          <button
          type="button"
          onClick={() => onView(doc)}
          aria-label={`View ${doc.title || 'document'}`}
          className="h-11 w-11 flex items-center justify-center rounded-lg transition-all active:scale-90"
          style={{ background: 'var(--hf-surface-2)' }}>
            <Eye size={13} style={{ color: 'var(--hf-text-muted)' }} />
          </button>
          {doc.status === 'failed' &&
          <button
          type="button"
          onClick={() => onReprocess(doc)}
          aria-label={`Retry processing ${doc.title || 'document'}`}
          className="h-11 w-11 flex items-center justify-center rounded-lg"
          style={{ background: 'rgba(247,201,163,0.15)' }}>
              <RefreshCw size={13} style={{ color: 'var(--hf-peach-strong)' }} />
            </button>
          }
          <button
          type="button"
          onClick={() => onDelete(doc)}
          aria-label={`Delete ${doc.title || 'document'}`}
          className="h-11 w-11 flex items-center justify-center rounded-lg"
          style={{ background: 'rgba(242,140,140,0.1)' }}>
            <Trash2 size={13} style={{ color: 'var(--hf-coral-strong)' }} />
          </button>
        </div>
      </div>);

  }

  // Grid card
  return (
    <div className="rounded-[18px] overflow-hidden transition-all active:scale-[0.97]"
    style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
      {/* Color header */}
      <div className="h-16 flex items-center justify-center"
      style={{ background: `linear-gradient(135deg, ${typeConfig.color}30, ${typeConfig.color}10)` }}>
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: typeConfig.color + '40' }}>
          <typeConfig.icon size={18} style={{ color: typeConfig.color }} />
        </div>
      </div>
      <div className="p-3">
        <div className="flex items-start justify-between gap-1 mb-1">
          <button
          type="button"
          onClick={() => onView(doc)}
          className="text-xs font-bold leading-tight flex-1 text-left rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d7f576]"
          style={{ color: 'var(--hf-text)' }}
          aria-label={`Open ${doc.title || 'document'}`}>
            {doc.title || 'Untitled'}
          </button>
          <StatusBadge status={doc.status} />
        </div>
        <p className="text-[9px] mb-2" style={{ color: 'var(--hf-text-muted)' }}>
          {doc.document_date ? format(new Date(doc.document_date), 'MMM d, yyyy') : 'No date'}
        </p>
        {doc.ai_summary && (
          <MarkdownPreview content={doc.ai_summary} maxLength={96} className="mb-2 text-[9px] leading-relaxed" />
        )}
        {(doc.ai_tags || doc.user_tags)?.length > 0 &&
        <div className="flex flex-wrap gap-1 mb-2">
            {(doc.user_tags || doc.ai_tags || []).slice(0, 3).map((tag, i) =>
          <span key={i} className="text-[8px] font-bold px-1.5 py-0.5 rounded-full"
          style={{ background: 'rgba(215,245,118,0.15)', color: 'var(--hf-lemon-strong)' }}>
                {tag}
              </span>
          )}
            {(doc.ai_tags || doc.user_tags || []).length > 3 &&
          <span className="text-[8px] font-bold px-1.5 py-0.5" style={{ color: 'var(--hf-text-muted)' }}>
                +{(doc.ai_tags || doc.user_tags || []).length - 3}
              </span>
          }
          </div>
        }
        <div className="flex gap-1.5">
          <button onClick={() => onView(doc)}
          className="flex-1 min-h-11 py-1.5 rounded-lg text-[10px] font-bold text-center"
          style={{ background: 'rgba(215,245,118,0.15)', color: 'var(--hf-lemon-strong)' }}>
            View
          </button>
          {(doc.document_type === 'lab_report' || doc.document_type === 'imaging') && (
            <button
              type="button"
              onClick={() => onOCR?.(doc)}
              title="Extract lab values with OCR"
              className="min-h-11 min-w-11 py-1.5 px-2 rounded-lg text-[10px]"
              style={{ background: 'rgba(201,187,255,0.15)', color: 'var(--hf-lavender-strong)' }}>
              <Microscope size={10} />
            </button>
          )}
          {doc.status === 'failed' &&
          <button
          type="button"
          onClick={() => onReprocess(doc)}
          aria-label={`Retry processing ${doc.title || 'document'}`}
          className="min-h-11 min-w-11 py-1.5 px-2 rounded-lg text-[10px]"
          style={{ background: 'rgba(247,201,163,0.15)', color: 'var(--hf-peach-strong)' }}>
              <RefreshCw size={10} />
            </button>
          }
          <button
          type="button"
          onClick={() => onDelete(doc)}
          aria-label={`Delete ${doc.title || 'document'}`}
          className="min-h-11 min-w-11 py-1.5 px-2 rounded-lg"
          style={{ background: 'rgba(242,140,140,0.1)' }}>
            <Trash2 size={10} style={{ color: 'var(--hf-coral-strong)' }} />
          </button>
        </div>
      </div>
    </div>);

}

export default function Documents() {
  const { activeProfileId, allProfiles } = useActiveProfile();
  const { hasFeature, loading: flagsLoading } = useFeatureFlags();
  const [showUpload, setShowUpload] = useState(false);
  const [ocrDoc, setOcrDoc] = useState(null);
  const [ocrLoading, setOcrLoading] = useState(false);

  const runOCR = async (doc) => {
    if (flagsLoading || !hasFeature('ocr_lab_reports')) {
      toast.error('OCR lab extraction is currently disabled');
      return;
    }
    if (!doc?.file_url || !activeProfileId) return;
    setOcrDoc(doc.id);
    setOcrLoading(true);
    try {
      const res = await base44.functions.invoke('ocrLabReport', { profile_id: activeProfileId, file_url: doc.file_url });
      const { extracted } = res.data;
      toast.success(`Extracted ${extracted.lab_count} lab results, ${extracted.flagged_count} flagged abnormal`);
    } catch (err) {
      toast.error('OCR failed: ' + err.message);
    } finally {
      setOcrDoc(null);
      setOcrLoading(false);
    }
  };
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [pendingDeleteDoc, setPendingDeleteDoc] = useState(null);
  const [viewMode] = useState('list');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [searchAvailability, setSearchAvailability] = useState(null);
  const queryClient = useQueryClient();

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['documents', activeProfileId],
    queryFn: () => listDocuments(activeProfileId),
    enabled: !!activeProfileId
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDocument,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['documents', activeProfileId] })
  });

  const processDocumentWithAI = async (doc) => {
    await reprocessDocument(doc);
    queryClient.invalidateQueries({ queryKey: ['documents', activeProfileId] });
  };

  const [isSemanticSearching, setIsSemanticSearching] = useState(false);
  const [semanticResults, setSemanticResults] = useState(null);
  const ocrLabReportsEnabled = !flagsLoading && hasFeature('ocr_lab_reports');
  const docAutoLinkProfilesEnabled = !flagsLoading && hasFeature('doc_auto_link_profiles');

  const performSemanticSearch = async (query) => {
    if (!query.trim() || query.length < 3) {
      setSemanticResults(null);
      setSearchAvailability(null);
      return;
    }
    setIsSemanticSearching(true);
    try {
      const { results, availability } = await semanticDocumentSearch({
        profileId: activeProfileId,
        searchQuery: query,
        documents,
      });
      setSemanticResults(results || []);
      setSearchAvailability(availability || null);
    } catch {
      setSemanticResults(null);
      setSearchAvailability(null);
    }
    setIsSemanticSearching(false);
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const docs = semanticResults || documents;

    return docs.filter((doc) => {
      const matchType = filterType === 'all' || doc.document_type === filterType;
      // If semantic search, don't re-filter by text (already scored)
      const matchSearch = semanticResults ? true : !q || doc.title?.toLowerCase().includes(q) || doc.facility_name?.toLowerCase().includes(q) || doc.ai_tags?.some((t) => t.toLowerCase().includes(q));
      return matchSearch && matchType;
    });
  }, [documents, search, filterType, semanticResults]);

  const stats = useMemo(() => ({
    total: documents.length,
    labs: documents.filter((d) => d.document_type === 'lab_report').length,
    prescriptions: documents.filter((d) => d.document_type === 'prescription').length,
    processing: documents.filter((d) => d.status === 'processing').length
  }), [documents]);

  const grouped = useMemo(() => filtered.reduce((acc, doc) => {
    const key = doc.document_date ? format(new Date(doc.document_date), 'MMMM yyyy') : 'Undated';
    if (!acc[key]) acc[key] = [];
    acc[key].push(doc);
    return acc;
  }, {}), [filtered]);

  if (!activeProfileId) return (
    <div className="flex items-center justify-center min-h-screen" style={{ background: 'var(--hf-bg)' }}>
      <div className="w-8 h-8 rounded-full border-2 border-[#d7f576] border-t-transparent animate-spin" />
    </div>);


  return (
    <div className="min-h-screen w-full px-3 py-4 md:px-8 md:py-6 pb-24 md:pb-8" style={{ background: 'var(--hf-bg)' }}>

      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--hf-text)' }}>Records</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--hf-text-muted)' }}>{documents.length} health records</p>
        </div>
          <button onClick={() => setShowUpload(true)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-[12px] font-bold text-sm active:scale-95 transition-transform"
        style={{ background: '#d7f576', color: '#0a1200' }}>
          <Plus size={15} /> Add Record
        </button>
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-4 gap-2 mb-5">
        {[
        { label: 'Total', value: stats.total, color: 'var(--hf-lemon-strong)', tc: '#0a1200', icon: '📄' },
        { label: 'Labs', value: stats.labs, color: 'var(--hf-lavender-strong)', tc: '#1a0a40', icon: '🧪' },
        { label: 'Scripts', value: stats.prescriptions, color: 'var(--hf-peach-strong)', tc: '#3d1a00', icon: '💊' },
        { label: 'Processing', value: stats.processing, color: 'var(--hf-sky-strong)', tc: '#0a1240', icon: '⏳' }].
        map((s) =>
        <div key={s.label} className="rounded-[14px] p-3 text-center" style={{ background: s.color }}>
            <span className="text-base">{s.icon}</span>
            <p className="text-xl font-black leading-none" style={{ color: s.tc }}>{s.value}</p>
            <p className="text-[9px] font-bold uppercase mt-1" style={{ color: s.tc, opacity: 0.72 }}>{s.label}</p>
          </div>
        )}
      </div>

      {/* ── Search ── */}
      <div className="relative mb-3">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--hf-text-muted)' }} />
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            performSemanticSearch(e.target.value);
          }}
          placeholder="Search document title, facility, tags, or type…"
          className="w-full h-11 pl-9 pr-10 rounded-[12px] text-sm outline-none"
          style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)', color: 'var(--hf-text)' }} />
        {search &&
        <button onClick={() => {setSearch('');setSemanticResults(null);}} className="absolute right-3 top-1/2 -translate-y-1/2">
            <X size={13} style={{ color: 'var(--hf-text-muted)' }} />
          </button>
        }
        {isSemanticSearching &&
        <Loader2 size={14} className="absolute right-12 top-1/2 -translate-y-1/2 animate-spin" style={{ color: 'var(--hf-lemon-strong)' }} />
        }
      </div>

      {searchAvailability?.state === 'read_only' && search.trim().length >= 3 && (
        <div
          className="mb-3 rounded-[12px] px-3 py-2 text-xs"
          style={{ background: 'rgba(201,187,255,0.08)', border: '1px solid rgba(201,187,255,0.2)', color: 'var(--hf-text-muted)' }}>
          {searchAvailability.reason} Showing metadata matches instead.
        </div>
      )}

      {/* ── Type filters (pill row) ── */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-3" style={{ scrollbarWidth: 'none' }}>
        {DOC_TYPES.slice(0, 6).map((t) =>
        <button key={t.value} onClick={() => setFilterType(t.value)}
        className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all"
        style={{
          background: filterType === t.value ? t.color : 'var(--hf-surface-2)',
          color: filterType === t.value ? t.tc : 'var(--hf-text-muted)',
          border: `1px solid ${filterType === t.value ? t.color : 'var(--hf-border)'}`
        }}>
            <t.icon size={10} />
            {t.label}
          </button>
        )}
      </div>

      {/* Toolbar — view toggle removed, list is default */}
      <div className="mb-3" />

      {/* ── Content (list view only) ── */}
      {isLoading ?
      <div className="grid gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) =>
        <div key={i} className="rounded-[18px] animate-pulse" style={{ background: 'var(--hf-surface)', height: 64 }} />
        )}
        </div> :
      filtered.length === 0 ?
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(215,245,118,0.1)' }}>
            <span className="text-3xl leading-none" aria-hidden="true">📄</span>
          </div>
          <p className="text-sm font-bold" style={{ color: 'var(--hf-text)' }}>No records found</p>
          <p className="text-xs max-w-xs" style={{ color: 'var(--hf-text-muted)' }}>
            {search || filterType !== 'all' ? 'Try adjusting your filters' : 'Upload your first health record to get started'}
          </p>
          <button onClick={() => setShowUpload(true)}
        className="px-6 py-2.5 rounded-[12px] font-bold text-sm"
        style={{ background: '#d7f576', color: '#0a1200' }}>
            <Upload size={14} className="inline mr-2" /> Add Record
          </button>
        </div> :

      <div className="space-y-6">
          {Object.entries(grouped).map(([month, docs]) =>
        <div key={month}>
              <div className="flex items-center gap-2 mb-3">
                <Calendar size={12} style={{ color: 'var(--hf-text-muted)' }} />
                <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--hf-text-muted)' }}>{month}</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: 'var(--hf-surface-2)', color: 'var(--hf-text-muted)' }}>{docs.length}</span>
              </div>
              <div className="space-y-2">
                {docs.map((doc) =>
            <DocumentCard
              key={doc.id}
              doc={doc}
              viewMode={viewMode}
              onView={setSelectedDoc}
              onDelete={setPendingDeleteDoc}
              onReprocess={processDocumentWithAI}
              onOCR={ocrLabReportsEnabled ? runOCR : null} />

            )}
              </div>
            </div>
        )}
        </div>
      }

      {/* ── Upload modal ── */}
      <UniversalUpload
        open={showUpload}
        onClose={() => setShowUpload(false)}
        profileId={activeProfileId}
        profiles={allProfiles}
        autoLinkProfilesEnabled={docAutoLinkProfilesEnabled}
        onSuccess={() => {
          // Just refresh list — modal closes itself after showing the extracted view
          queryClient.invalidateQueries({ queryKey: ['documents', activeProfileId] });
        }} />
      

      {/* ── Document extracted view ── */}
      <DocumentExtractedView
        doc={selectedDoc}
        open={!!selectedDoc}
        onClose={() => setSelectedDoc(null)} />

      <AlertDialog open={!!pendingDeleteDoc} onOpenChange={(open) => !open && setPendingDeleteDoc(null)}>
        <AlertDialogContent
          className="max-w-md rounded-[22px]"
          style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)', color: 'var(--hf-text)' }}>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: 'var(--hf-text)' }}>Delete document?</AlertDialogTitle>
            <AlertDialogDescription style={{ color: 'var(--hf-text-muted)' }}>
              {pendingDeleteDoc?.title || 'This record'} will be permanently deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingDeleteDoc(null)} className="rounded-xl">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingDeleteDoc) {
                  deleteMutation.mutate(pendingDeleteDoc.id);
                }
                setPendingDeleteDoc(null);
              }}
              className="rounded-xl bg-red-500 text-white hover:bg-red-600">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
    </div>);

}

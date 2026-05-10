/**
 * DocScanner — Full-screen document scanner with:
 * - Camera capture (auto/manual toggle)
 * - Post-capture editing: filters, crop hint, rotate
 * - Multi-page stacking
 * - Upload all for AI analysis → auto-save to Docs
 */
import React, { useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { callAIVision, uploadFile } from '@/components/utils/aiService';
import {
  X, Camera, Upload, RotateCw, ChevronLeft, ChevronRight,
  Trash2, CheckCircle, Plus, Loader2, Sun, Contrast, ScanLine
} from 'lucide-react';
import Haptics from '@/components/utils/haptics';
import { useQueryClient } from '@tanstack/react-query';

const FILTERS = [
  { id: 'none',   label: 'Original', style: '' },
  { id: 'bw',     label: 'B&W',      style: 'grayscale(100%)' },
  { id: 'vivid',  label: 'Vivid',    style: 'contrast(1.3) saturate(1.4)' },
  { id: 'clean',  label: 'Clean',    style: 'brightness(1.15) contrast(1.25) grayscale(80%)' },
  { id: 'scan',   label: 'Scan',     style: 'brightness(1.2) contrast(1.5) grayscale(100%)' },
];

function PageThumb({ page, active, onClick, onDelete }) {
  return (
    <div className={`relative flex-shrink-0 rounded-xl overflow-hidden cursor-pointer transition-all active:scale-95 ${active ? 'ring-2 ring-[#d7f576]' : ''}`}
      style={{ width: 56, height: 72 }}
      onClick={onClick}>
      <img src={page.preview} alt="scan page" className="w-full h-full object-cover"
        style={{ filter: FILTERS.find(f => f.id === page.filter)?.style || '' }} />
      <button onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full flex items-center justify-center"
        style={{ background: 'rgba(0,0,0,0.65)' }}>
        <Trash2 size={10} style={{ color: '#f28c8c' }} />
      </button>
    </div>
  );
}

export default function DocScanner({ profileId, onClose, onSaved }) {
  const queryClient = useQueryClient();
  const fileRef = useRef(null);
  const [pages, setPages] = useState([]); // [{preview, file, filter, rotation}]
  const [activePage, setActivePage] = useState(0);
  const [activeFilter, setActiveFilter] = useState('none');
  const [rotation, setRotation] = useState(0);
  const [status, setStatus] = useState('idle'); // idle | saving | done | error
  const [progress, setProgress] = useState(0);

  const currentPage = pages[activePage] || null;

  const handleCapture = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const newPages = files.map(file => ({
      preview: URL.createObjectURL(file),
      file,
      filter: 'none',
      rotation: 0,
    }));
    setPages(prev => {
      const updated = [...prev, ...newPages];
      setActivePage(updated.length - 1);
      return updated;
    });
    e.target.value = '';
    Haptics.success();
  };

  const applyFilterToActive = (filterId) => {
    setActiveFilter(filterId);
    setPages(prev => prev.map((p, i) => i === activePage ? { ...p, filter: filterId } : p));
  };

  const rotateActive = () => {
    const newRot = (rotation + 90) % 360;
    setRotation(newRot);
    setPages(prev => prev.map((p, i) => i === activePage ? { ...p, rotation: newRot } : p));
    Haptics.light();
  };

  const deletePage = (i) => {
    setPages(prev => {
      const next = prev.filter((_, idx) => idx !== i);
      setActivePage(p => Math.min(p, next.length - 1));
      return next;
    });
    Haptics.light();
  };

  const saveAll = async () => {
    if (!pages.length) return;
    setStatus('saving');
    setProgress(0);

    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(now.getTime() + istOffset);
    const timestamp = istNow.toISOString().replace('T', ' ').slice(0, 19) + ' IST';

    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      const { file_url } = await base44.integrations.Core.UploadFile({ file: page.file });

      const analysis = await callAIVision({
        prompt: `Analyze this medical document image. Extract key information and summarize. Return JSON with: summary, key_findings (array), action_items (array), document_type (lab_report|prescription|imaging|discharge_summary|consultation|vaccination|insurance|other), ai_tags (array of strings).`,
        file_urls: [file_url],
        response_json_schema: {
          type: 'object',
          properties: {
            summary: { type: 'string' },
            key_findings: { type: 'array', items: { type: 'string' } },
            action_items: { type: 'array', items: { type: 'string' } },
            document_type: { type: 'string' },
            ai_tags: { type: 'array', items: { type: 'string' } },
          },
        },
      });

      await base44.entities.MedicalDocument.create({
        profile_id: profileId,
        title: pages.length > 1
          ? `Scanned Doc ${i + 1}/${pages.length} — ${timestamp}`
          : `Scanned Doc — ${timestamp}`,
        document_type: analysis.document_type || 'other',
        file_url,
        file_name: `scan_${i + 1}_${Date.now()}.jpg`,
        file_type: 'image/jpeg',
        document_date: now.toISOString().slice(0, 10),
        ai_summary: analysis.summary || '',
        key_findings: analysis.key_findings || [],
        action_items: analysis.action_items || [],
        ai_tags: [...(analysis.ai_tags || []), 'Doc Scanner'],
        status: 'completed',
      });

      setProgress(Math.round(((i + 1) / pages.length) * 100));
    }

    queryClient.invalidateQueries({ queryKey: ['documents', profileId] });
    setStatus('done');
    Haptics.success();
    if (onSaved) onSaved();
  };

  return (
    <div className="fixed inset-0 z-[160] flex flex-col" style={{ background: '#000' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 flex-shrink-0"
        style={{
          paddingTop: 'calc(12px + env(safe-area-inset-top,0px))',
          paddingBottom: '12px',
          background: 'rgba(0,0,0,0.85)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}>
        <button onClick={onClose}
          className="w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-transform"
          style={{ background: 'rgba(255,255,255,0.1)' }}>
          <X size={16} style={{ color: '#fff' }} />
        </button>
        <div className="text-center">
          <p className="text-sm font-black text-white">Doc Scanner</p>
          <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
            {pages.length === 0 ? 'Capture pages' : `${pages.length} page${pages.length > 1 ? 's' : ''} captured`}
          </p>
        </div>
        <button onClick={rotateActive} disabled={!currentPage}
          className="w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-transform"
          style={{ background: 'rgba(255,255,255,0.1)', opacity: currentPage ? 1 : 0.3 }}>
          <RotateCw size={16} style={{ color: '#fff' }} />
        </button>
      </div>

      {/* Main preview */}
      <div className="flex-1 flex items-center justify-center relative overflow-hidden"
        style={{ background: 'var(--hf-bg)' }}>
        {currentPage ? (
          <div className="w-full h-full flex items-center justify-center p-4">
            <img
              src={currentPage.preview}
              alt="scanned page"
              className="max-w-full max-h-full rounded-2xl shadow-2xl object-contain"
              style={{
                filter: FILTERS.find(f => f.id === currentPage.filter)?.style || '',
                transform: `rotate(${currentPage.rotation}deg)`,
                transition: 'transform 0.3s ease, filter 0.2s ease',
              }} />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 px-8 text-center">
            <div className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(215,245,118,0.1)', border: '2px dashed rgba(215,245,118,0.3)' }}>
              <ScanLine size={32} style={{ color: '#d7f576' }} />
            </div>
            <p className="text-base font-black text-white">Scan a Document</p>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Capture multiple pages — AI will extract, analyze & save to your Docs
            </p>
          </div>
        )}

        {/* Page nav arrows */}
        {pages.length > 1 && (
          <>
            <button onClick={() => setActivePage(p => Math.max(0, p - 1))}
              disabled={activePage === 0}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.5)', opacity: activePage === 0 ? 0.3 : 1 }}>
              <ChevronLeft size={18} style={{ color: '#fff' }} />
            </button>
            <button onClick={() => setActivePage(p => Math.min(pages.length - 1, p + 1))}
              disabled={activePage === pages.length - 1}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.5)', opacity: activePage === pages.length - 1 ? 0.3 : 1 }}>
              <ChevronRight size={18} style={{ color: '#fff' }} />
            </button>
          </>
        )}
      </div>

      {/* Filter strip */}
      {currentPage && (
        <div className="flex gap-2 overflow-x-auto px-4 py-2 flex-shrink-0"
          style={{ background: 'rgba(0,0,0,0.85)', scrollbarWidth: 'none' }}>
          {FILTERS.map(f => (
            <button key={f.id} onClick={() => applyFilterToActive(f.id)}
              className="flex flex-col items-center gap-1 flex-shrink-0 active:scale-95 transition-transform">
              <div className="w-12 h-14 rounded-xl overflow-hidden"
                style={{
                  border: currentPage.filter === f.id ? '2px solid #d7f576' : '2px solid rgba(255,255,255,0.15)',
                }}>
                <img src={currentPage.preview} alt={f.label}
                  className="w-full h-full object-cover"
                  style={{ filter: f.style }} />
              </div>
              <span className="text-[9px] font-bold"
                style={{ color: currentPage.filter === f.id ? '#d7f576' : 'rgba(255,255,255,0.5)' }}>
                {f.label}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Page thumbnails strip */}
      {pages.length > 0 && (
        <div className="flex gap-2 overflow-x-auto px-4 py-2 flex-shrink-0"
          style={{ background: 'rgba(0,0,0,0.7)', scrollbarWidth: 'none' }}>
          {pages.map((page, i) => (
            <PageThumb key={i} page={page} active={i === activePage}
              onClick={() => { setActivePage(i); setRotation(page.rotation); setActiveFilter(page.filter); }}
              onDelete={() => deletePage(i)} />
          ))}
        </div>
      )}

      {/* Bottom actions */}
      <div className="flex items-center gap-3 px-4 flex-shrink-0"
        style={{
          paddingTop: '12px',
          paddingBottom: 'calc(16px + env(safe-area-inset-bottom,0px))',
          background: 'rgba(0,0,0,0.9)',
          borderTop: '1px solid rgba(255,255,255,0.08)',
        }}>
        {/* Upload from gallery */}
        <button onClick={() => fileRef.current?.click()}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm active:scale-97 transition-transform"
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff' }}>
          <Upload size={16} /> Gallery
        </button>

        {/* Camera capture — center, large */}
        <button onClick={() => {
          const inp = document.createElement('input');
          inp.type = 'file'; inp.accept = 'image/*'; inp.capture = 'environment';
          inp.multiple = true;
          inp.onchange = handleCapture;
          inp.click();
        }}
          className="w-16 h-16 rounded-full flex items-center justify-center active:scale-90 transition-transform"
          style={{ background: '#d7f576', boxShadow: '0 0 0 4px rgba(215,245,118,0.25)' }}>
          <Camera size={24} style={{ color: '#0a1200' }} />
        </button>

        {/* Save all */}
        <button onClick={saveAll}
          disabled={pages.length === 0 || status === 'saving' || status === 'done'}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm active:scale-97 transition-transform"
          style={{
            background: pages.length > 0 ? '#d7f576' : 'rgba(255,255,255,0.08)',
            color: pages.length > 0 ? '#0a1200' : 'rgba(255,255,255,0.3)',
            opacity: status === 'saving' ? 0.7 : 1,
          }}>
          {status === 'saving' ? (
            <><Loader2 size={14} className="animate-spin" /> {progress}%</>
          ) : status === 'done' ? (
            <><CheckCircle size={14} /> Saved!</>
          ) : (
            <><CheckCircle size={14} /> Save {pages.length > 0 ? `(${pages.length})` : ''}</>
          )}
        </button>
      </div>

      {/* Hidden file input for gallery */}
      <input ref={fileRef} type="file" accept="image/*,application/pdf" multiple className="hidden" onChange={handleCapture} />
    </div>
  );
}
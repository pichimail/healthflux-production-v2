/**
 * AddRecordSheet — Mobile draggable bottom sheet with 4 add-record options:
 * 1. Take Photo      → MultiSnapCamera
 * 2. Scan Document   → DocScanner
 * 3. Choose Gallery  → gallery file picker
 * 4. Upload Document → file manager picker (pdf / images)
 */
import React, { useRef } from 'react';
import { Drawer } from 'vaul';
import { Camera, ScanLine, Image, FileUp } from 'lucide-react';
import Haptics from '@/components/utils/haptics';

const OPTIONS = [
  {
    key: 'camera',
    Icon: Camera,
    label: 'Take Photo',
    sub: 'Food · Skin · Medical imaging · Auto-detect',
    color: '#d7f576',
    tc: '#0a1200',
  },
  {
    key: 'scan',
    Icon: ScanLine,
    label: 'Scan Document',
    sub: 'Multi-page scanner with filters & crop',
    color: '#c9bbff',
    tc: '#1a0a40',
  },
  {
    key: 'gallery',
    Icon: Image,
    label: 'Choose from Gallery',
    sub: 'Pick photos from your device',
    color: '#a8e6cf',
    tc: '#003d20',
  },
  {
    key: 'file',
    Icon: FileUp,
    label: 'Upload Document',
    sub: 'PDF, X-ray, CT, MRI, prescriptions…',
    color: '#9bb4ff',
    tc: '#0a1240',
  },
];

export default function AddRecordSheet({ open, onOpenChange, onOption }) {
  const galleryRef = useRef(null);
  const fileRef = useRef(null);

  const handleOption = (key) => {
    Haptics.medium();
    if (key === 'gallery') {
      onOpenChange(false);
      setTimeout(() => galleryRef.current?.click(), 200);
      return;
    }
    if (key === 'file') {
      onOpenChange(false);
      setTimeout(() => fileRef.current?.click(), 200);
      return;
    }
    onOpenChange(false);
    setTimeout(() => onOption(key), 150);
  };

  const handleGalleryFile = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length) onOption('gallery', files);
    e.target.value = '';
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length) onOption('file', files);
    e.target.value = '';
  };

  return (
    <>
      {/* Hidden inputs */}
      <input ref={galleryRef} type="file" accept="image/*" multiple className="hidden" onChange={handleGalleryFile} />
      <input ref={fileRef} type="file" accept="image/*,application/pdf,.pdf,.jpg,.jpeg,.png,.heic,.tiff,.dcm" multiple className="hidden" onChange={handleFileUpload} />

      <Drawer.Root open={open} onOpenChange={onOpenChange}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/60 z-[150]" />
          <Drawer.Content
            className="fixed bottom-0 left-0 right-0 z-[160] rounded-t-3xl flex flex-col outline-none"
            style={{
              backgroundColor: 'var(--hf-surface)',
              border: '1px solid var(--hf-border)',
              borderBottom: 'none',
              maxHeight: '80dvh',
            }}>
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1.5 rounded-full" style={{ background: 'var(--hf-border-strong)' }} />
            </div>

            {/* Title */}
            <div className="px-5 py-3 flex-shrink-0 border-b" style={{ borderColor: 'var(--hf-border)' }}>
              <p className="text-base font-black" style={{ color: 'var(--hf-text)' }}>Add to Records</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--hf-text-muted)' }}>
                Photo, scan or upload — AI analyses & saves to Records
              </p>
            </div>

            {/* Options */}
            <div className="flex flex-col gap-2 px-4 py-4 pb-safe overflow-y-auto"
              style={{ paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))' }}>
              {OPTIONS.map(({ key, Icon, label, sub, color, tc }) => (
                <button
                  key={key}
                  onClick={() => handleOption(key)}
                  className="flex items-center gap-4 p-4 rounded-2xl text-left transition-all active:scale-[0.97]"
                  style={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)' }}>
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{ background: color }}>
                    <Icon size={20} style={{ color: tc }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-black" style={{ color: 'var(--hf-text)' }}>{label}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--hf-text-muted)' }}>{sub}</p>
                  </div>
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                </button>
              ))}
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </>
  );
}
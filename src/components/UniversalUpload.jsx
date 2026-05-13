/**
 * UniversalUpload — Upload → Live Processing Screen → Auto-launch Extracted View
 * Base44 InvokeLLM first, OpenAI/Gemini only as fallback.
 */
import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Upload, Loader2, Sparkles, Image as ImageIcon, FileArchive, Brain, Camera } from 'lucide-react';
import ProcessingScreen from './documents/ProcessingScreen';
import DocumentExtractedView from './documents/DocumentExtractedView';
import ResponsiveOverlay from '@/components/ui/responsive-overlay';
import { createUploadedDocument, processUploadedDocument } from '@/services/documents';
import { useTheme } from '@/lib/ThemeContext';

const ACCEPTED = 'image/*,application/pdf,.pdf,.doc,.docx,.heic,.heif';
const MAX_MB = 25;

function fileIcon(file) {
  if (!file) return <Upload className="w-5 h-5" />;
  if (file.type.startsWith('image/')) return <ImageIcon className="w-5 h-5" />;
  return <FileArchive className="w-5 h-5" />;
}

// Phase: 'pick' | 'processing'
function UploadInner({ profileId, profiles = [], onProcessingDone, initialFile }) {
  const [profileSel, setProfileSel] = useState(profileId || (profiles[0]?.id ?? ''));
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState(initialFile || null);
  const [phase, setPhase] = useState('pick'); // pick → processing → done
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [documentId, setDocumentId] = useState(null);
  const fileRef = useRef(null);
  const cameraRef = useRef(null);
  const { isLight } = useTheme();

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > MAX_MB * 1024 * 1024) { setError(`File too large (max ${MAX_MB} MB)`); return; }
    setError('');
    setFile(f);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) { setError('Please select a file'); return; }
    setError('');
    setUploading(true);

    try {
      const document = await createUploadedDocument({
        file,
        profileId: profileSel,
        notes,
        documentType: 'other',
      });

      setDocumentId(document.id);
      setUploading(false);
      setPhase('processing');

      processUploadedDocument(document, {
        notes,
        source: file.type.startsWith('image/') ? 'scan' : 'upload',
      }).catch((invokeError) => console.warn('Document processing invoke error:', invokeError));
    } catch {
      setUploading(false);
      setError('Upload failed — please try again.');
    }
  };

  // Called by ProcessingScreen when doc is fully done
  const handleProcessingComplete = (doc) => {
    onProcessingDone?.(doc);
  };

  if (phase === 'processing') {
    return (
      <ProcessingScreen
        documentId={documentId}
        profileId={profileSel}
        onComplete={handleProcessingComplete}
        onError={(msg) => { setError(msg); setPhase('pick'); }}
      />
    );
  }

  // Phase: pick
  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* AI notice */}
      <div className="rounded-2xl p-3.5 flex items-start gap-3"
        style={{ background: 'rgba(201,187,255,0.1)', border: '1px solid rgba(201,187,255,0.25)' }}>
        <Brain size={16} style={{ color: 'var(--hf-lavender-strong)' }} className="flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-bold" style={{ color: 'var(--hf-lavender-strong)' }}>AI Auto-Extraction</p>
          <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color: 'var(--hf-text-muted)' }}>
            AI reads and extracts every detail — facility name, doctor, address, lab results, medicines, dates — automatically.
          </p>
        </div>
      </div>

      {/* File zone */}
      <div className="flex flex-col gap-2">
        <button type="button" onClick={() => fileRef.current?.click()}
          className="w-full rounded-2xl border-2 border-dashed py-6 flex flex-col items-center gap-3 transition-colors active:scale-[0.99]"
          style={{ borderColor: file ? '#d7f576' : 'var(--hf-border-strong)', backgroundColor: file ? 'rgba(215,245,118,0.05)' : 'var(--hf-surface-2)' }}>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{
              background: file ? '#d7f576' : 'rgba(215,245,118,0.15)',
              color: file ? '#0a1200' : (isLight ? '#000000' : '#d7f576')
            }}>
            {fileIcon(file)}
          </div>
          {file ? (
            <div className="text-center">
              <p className="text-sm font-bold max-w-[240px] truncate" style={{ color: 'var(--hf-text)' }}>{file.name}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--hf-text-muted)' }}>{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-sm font-bold" style={{ color: 'var(--hf-text)' }}>Tap to select document</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--hf-text-muted)' }}>Photo, PDF, or file — up to {MAX_MB} MB</p>
            </div>
          )}
          <input ref={fileRef} type="file" accept={ACCEPTED} onChange={handleFileChange} className="hidden" />
        </button>

        <button type="button" onClick={() => cameraRef.current?.click()}
          className="w-full rounded-2xl py-3.5 flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] font-bold text-sm"
          style={{
            background: 'rgba(215,245,118,0.08)',
            border: '1.5px solid rgba(215,245,118,0.3)',
            color: isLight ? '#000000' : 'var(--hf-lemon-strong)'
          }}>
          <Camera size={16} /> Scan with Camera
        </button>
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" />
      </div>

      {/* Profile selector */}
      {profiles.length > 1 && (
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--hf-text-muted)' }}>For Profile</p>
          <div className="flex flex-wrap gap-2">
            {profiles.map(p => (
              <button key={p.id} type="button" onClick={() => setProfileSel(p.id)}
                className="px-4 py-2 rounded-full text-xs font-bold transition-all"
                style={profileSel === p.id
                  ? { background: '#c9bbff', color: '#1a0a40' }
                  : { background: 'var(--hf-surface-2)', color: 'var(--hf-text-muted)', border: '1px solid var(--hf-border)' }}>
                {p.full_name || `Profile ${p.id.slice(0, 4)}`}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--hf-text-muted)' }}>Notes <span className="normal-case font-normal">(optional)</span></p>
        <Textarea value={notes} onChange={e => setNotes(e.target.value)}
          placeholder="Any additional context for AI analysis…"
          rows={2} className="rounded-xl text-sm resize-none"
          style={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)', color: 'var(--hf-text)' }} />
      </div>

      {error && <p className="text-xs font-semibold" style={{ color: 'var(--hf-coral-strong)' }}>{error}</p>}

      <Button type="submit" disabled={!file || uploading}
        className="w-full h-12 rounded-2xl font-bold text-[#0a1200] flex items-center justify-center gap-2"
        style={{ background: '#d7f576', opacity: (!file || uploading) ? 0.6 : 1 }}>
        {uploading
          ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading…</>
          : <><Sparkles className="w-4 h-4" /> Upload & AI Analyze</>
        }
      </Button>
    </form>
  );
}

export default function UniversalUpload({ open, onClose, profileId, profiles = [], onSuccess, initialFile }) {
  const [extractedDoc, setExtractedDoc] = useState(null);
  const [showExtracted, setShowExtracted] = useState(false);

  const handleClose = () => {
    onClose?.();
  };

  // Called by UploadInner when processing is done — close upload, show extracted view
  const handleProcessingDone = (doc) => {
    onSuccess?.(); // refresh lists
    onClose?.(); // close the upload dialog
    setExtractedDoc(doc);
    setShowExtracted(true);
  };

  const inner = (
    <UploadInner
      profileId={profileId}
      profiles={profiles}
      onProcessingDone={handleProcessingDone}
      initialFile={initialFile}
    />
  );

  return (
    <>
      <ResponsiveOverlay
        open={open}
        onOpenChange={(value) => {
          if (!value) {
            handleClose();
          }
        }}
        title="Upload Document"
        description="Upload a file and let AI extract what is supported."
        desktopClassName="max-w-md"
      >
        {inner}
      </ResponsiveOverlay>

      {/* Extracted view opens after upload closes */}
      {showExtracted && extractedDoc && (
        <DocumentExtractedView
          doc={extractedDoc}
          open={showExtracted}
          onClose={() => { setShowExtracted(false); setExtractedDoc(null); }}
        />
      )}
    </>
  );
}

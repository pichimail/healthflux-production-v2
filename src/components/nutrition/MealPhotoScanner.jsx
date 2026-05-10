/**
 * MealPhotoScanner — Upload or capture a meal photo.
 * Uses the backend nutrition image analysis contract to estimate calories & macros.
 */
import React, { useState, useRef } from 'react';
import { Camera, Upload, X, Loader2, CheckCircle } from 'lucide-react';
import {
  analyzeNutritionImage,
  getNutritionImageAnalysisAvailability,
} from '@/services/nutrition';

export default function MealPhotoScanner({ onFoodDetected, onClose, profileId }) {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const fileRef = useRef(null);
  const cameraRef = useRef(null);
  const availability = getNutritionImageAnalysisAvailability();

  const analyzeImage = async (file) => {
    if (availability.state !== 'ready') {
      setError(availability.reason);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await analyzeNutritionImage({
        file,
        profileId,
      });
      setResult(res);
    } catch (e) {
      setError(e?.message || 'Could not analyze image. Please try again or enter manually.');
    }
    setLoading(false);
  };

  const handleFile = (file) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    setResult(null);
    analyzeImage(file);
  };

  const handleConfirm = () => {
    if (result) onFoodDetected(result);
  };

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--hf-border)' }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: 'rgba(168,230,207,0.2)' }}>
            <Camera size={13} style={{ color: 'var(--hf-mint-strong)' }} />
          </div>
          <div>
            <p className="text-xs font-black" style={{ color: 'var(--hf-text)' }}>Scan Meal Photo</p>
            <p className="text-[9px]" style={{ color: 'var(--hf-text-muted)' }}>AI detects food & estimates calories</p>
          </div>
        </div>
        <button onClick={onClose} aria-label="Close scanner"
          className="w-7 h-7 rounded-full flex items-center justify-center"
          style={{ background: 'var(--hf-surface-2)' }}>
          <X size={13} style={{ color: 'var(--hf-text-muted)' }} />
        </button>
      </div>

      <div className="p-4 space-y-3">
        {/* Upload buttons */}
        {!preview && (
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => cameraRef.current?.click()}
              disabled={availability.state !== 'ready'}
              className="flex flex-col items-center justify-center gap-2 py-5 rounded-2xl font-bold text-xs transition-all active:scale-[0.97]"
              style={{ background: 'rgba(168,230,207,0.1)', color: 'var(--hf-mint-strong)', border: '1.5px dashed rgba(168,230,207,0.4)', opacity: availability.state === 'ready' ? 1 : 0.5 }}>
              <Camera size={20} />
              Take Photo
            </button>
            <button onClick={() => fileRef.current?.click()}
              disabled={availability.state !== 'ready'}
              className="flex flex-col items-center justify-center gap-2 py-5 rounded-2xl font-bold text-xs transition-all active:scale-[0.97]"
              style={{ background: 'rgba(215,245,118,0.1)', color: 'var(--hf-lemon-strong)', border: '1.5px dashed rgba(215,245,118,0.4)', opacity: availability.state === 'ready' ? 1 : 0.5 }}>
              <Upload size={20} />
              Upload Image
            </button>
          </div>
        )}

        {availability.state !== 'ready' && !preview && (
          <p className="text-[11px] text-center font-semibold" style={{ color: 'var(--hf-text-muted)' }}>
            {availability.reason}
          </p>
        )}

        {/* Preview */}
        {preview && (
          <div className="relative rounded-2xl overflow-hidden">
            <img src={preview} alt="Meal preview" className="w-full object-cover rounded-2xl" style={{ maxHeight: 200 }} />
            {loading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl"
                style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
                <Loader2 size={24} className="animate-spin" style={{ color: 'var(--hf-mint-strong)' }} />
                <p className="text-xs font-bold" style={{ color: 'var(--hf-mint-strong)' }}>Analyzing meal…</p>
              </div>
            )}
            {!loading && (
              <button onClick={() => { setPreview(null); setResult(null); }}
                className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(0,0,0,0.6)' }}>
                <X size={13} style={{ color: '#fff' }} />
              </button>
            )}
          </div>
        )}

        {/* Result */}
        {result && !loading && (
          <div className="rounded-2xl p-3 space-y-2" style={{ background: 'rgba(168,230,207,0.08)', border: '1px solid rgba(168,230,207,0.2)' }}>
            <div className="flex items-center gap-2">
              <CheckCircle size={14} style={{ color: 'var(--hf-mint-strong)' }} />
              <p className="text-xs font-black" style={{ color: 'var(--hf-text)' }}>{result.food_name}</p>
            </div>
            {result.description && (
              <p className="text-[10px]" style={{ color: 'var(--hf-text-muted)' }}>{result.description}</p>
            )}
            <div className="grid grid-cols-4 gap-2 mt-2">
              {[
                { label: 'Calories', value: result.calories, unit: 'kcal', color: 'var(--hf-lemon-strong)' },
                { label: 'Protein', value: result.protein_g, unit: 'g', color: 'var(--hf-sky-strong)' },
                { label: 'Carbs', value: result.carbs_g, unit: 'g', color: 'var(--hf-mint-strong)' },
                { label: 'Fat', value: result.fat_g, unit: 'g', color: 'var(--hf-peach-strong)' },
              ].map(m => (
                <div key={m.label} className="text-center py-2 rounded-xl" style={{ background: 'var(--hf-surface-2)' }}>
                  <p className="text-sm font-black" style={{ color: m.color }}>{m.value}</p>
                  <p className="text-[9px]" style={{ color: 'var(--hf-text-muted)' }}>{m.unit}</p>
                  <p className="text-[8px] font-bold" style={{ color: 'var(--hf-text-muted)' }}>{m.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {error && <p className="text-xs text-center font-semibold" style={{ color: 'var(--hf-coral-strong)' }}>{error}</p>}

        {/* Confirm button */}
        {result && !loading && (
          <button onClick={handleConfirm}
            className="w-full py-3 rounded-2xl font-bold text-sm transition-all active:scale-[0.98]"
            style={{ background: '#a8e6cf', color: '#003d20' }}>
            Log This Meal
          </button>
        )}
      </div>

      {/* Hidden inputs */}
      <input ref={cameraRef} type="file" accept="image/*" capture="environment"
        className="sr-only" aria-hidden="true" tabIndex={-1}
        onChange={e => handleFile(e.target.files?.[0])} />
      <input ref={fileRef} type="file" accept="image/*"
        className="sr-only" aria-hidden="true" tabIndex={-1}
        onChange={e => handleFile(e.target.files?.[0])} />
    </div>
  );
}

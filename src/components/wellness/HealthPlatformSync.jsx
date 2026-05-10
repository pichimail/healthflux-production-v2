/**
 * HealthPlatformSync — FIXED: No fake Math.random() data
 * Reads REAL data from native health APIs only
 */
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useActiveProfile } from '../ActiveProfileContext';
import { toast } from 'sonner';
import { RefreshCw, Loader2, Smartphone, CheckCircle2, XCircle } from 'lucide-react';
import { isHealthSyncAvailable, requestHealthPermissions, readVitals } from '@/lib/healthBridge';

const PLATFORMS = [
  { key: 'apple_health', name: 'Apple Health', icon: '🍎', color: '#ff3b30', vitals: ['heart_rate', 'weight', 'spo2', 'steps'] },
  { key: 'google_fit', name: 'Google Fit', icon: '🟢', color: '#4285F4', vitals: ['heart_rate', 'weight', 'steps', 'calories'] },
];

export default function HealthPlatformSync() {
  const { activeProfileId } = useActiveProfile();
  const [syncing, setSyncing] = useState(null);
  const [results, setResults] = useState({});
  const nativeAvailable = isHealthSyncAvailable();

  const handleSync = async (platform) => {
    if (!activeProfileId) {
      toast.error('Select a profile first');
      return;
    }
    if (!nativeAvailable) {
      toast.info(`${platform.name} sync requires the native HealthFlux app.`);
      return;
    }

    setSyncing(platform.key);
    try {
      const granted = await requestHealthPermissions();
      if (!granted) {
        toast.error(`${platform.name} access denied`);
        return;
      }

      let count = 0;
      for (const vitalType of platform.vitals) {
        const data = await readVitals(vitalType, 1);
        for (const v of data) {
          await base44.entities.VitalMeasurement.create({
            profile_id: activeProfileId,
            vital_type: v.vital_type,
            value: v.value,
            unit: v.unit,
            measured_at: v.measured_at,
            source: platform.key,
            notes: `Real sync from ${platform.name}`,
          });
          count++;
        }
      }

      setResults(r => ({ ...r, [platform.key]: { count, time: new Date().toLocaleTimeString() } }));
      toast.success(count > 0 ? `${count} real readings synced from ${platform.name}` : `No new data on ${platform.name}`);
    } catch (err) {
      toast.error(`Sync failed: ${err.message}`);
    } finally {
      setSyncing(null);
    }
  };

  return (
    <div className="space-y-3">
      {!nativeAvailable && (
        <div className="rounded-xl p-3 flex items-center gap-2"
          style={{ background: 'rgba(155,180,255,0.08)', border: '1px dashed rgba(155,180,255,0.3)' }}>
          <Smartphone size={14} style={{ color: 'var(--hf-sky-strong)' }} />
          <p className="text-[10px]" style={{ color: 'var(--hf-text-muted)' }}>
            Health platform sync requires the native app. Install HealthFlux on your phone for real-time data.
          </p>
        </div>
      )}

      {PLATFORMS.map(p => (
        <div key={p.key} className="rounded-xl p-3 flex items-center gap-3"
          style={{ background: 'var(--hf-panel)', border: '1px solid var(--hf-border)' }}>
          <span className="text-lg">{p.icon}</span>
          <div className="flex-1">
            <p className="text-xs font-bold" style={{ color: 'var(--hf-text)' }}>{p.name}</p>
            {results[p.key] ? (
              <p className="text-[10px] flex items-center gap-1" style={{ color: 'var(--hf-text-muted)' }}>
                <CheckCircle2 size={9} style={{ color: '#a8e6cf' }} />
                {results[p.key].count} readings at {results[p.key].time}
              </p>
            ) : (
              <p className="text-[10px]" style={{ color: 'var(--hf-text-muted)' }}>Tap sync for real data</p>
            )}
          </div>
          <button onClick={() => handleSync(p)} disabled={syncing === p.key || !nativeAvailable}
            className="px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all active:scale-95"
            style={{ background: `${p.color}15`, color: p.color, opacity: nativeAvailable ? 1 : 0.4 }}>
            {syncing === p.key ? <Loader2 size={10} className="animate-spin" /> : <RefreshCw size={10} />}
            Sync
          </button>
        </div>
      ))}
    </div>
  );
}

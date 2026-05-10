/**
 * WearableSync — FIXED: No fake/mock data generation
 * Uses native health bridge for real Apple Health / Google Fit / Fitbit sync
 * Web PWA shows clear "native app required" messaging
 */
import React, { useState } from 'react';
import { useActiveProfile } from './ActiveProfileContext';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Loader2, RefreshCw, Link2, Unlink, Smartphone, AlertCircle } from 'lucide-react';
import { isHealthSyncAvailable, requestHealthPermissions, readVitals } from '@/lib/healthBridge';

const PROVIDERS = [
  {
    key: 'google_fit', name: 'Google Fit', icon: '🟢', color: '#4285F4',
    bg: 'rgba(66,133,244,0.1)', border: 'rgba(66,133,244,0.25)',
    description: 'Steps, heart rate, calories & sleep',
    vitals: ['heart_rate', 'weight', 'steps', 'calories'],
  },
  {
    key: 'fitbit', name: 'Fitbit', icon: '🔵', color: '#00B0B9',
    bg: 'rgba(0,176,185,0.1)', border: 'rgba(0,176,185,0.25)',
    description: 'Activity, sleep stages, SpO2',
    vitals: ['heart_rate', 'spo2', 'steps'],
  },
  {
    key: 'apple_health', name: 'Apple Health', icon: '🍎', color: '#ff3b30',
    bg: 'rgba(255,59,48,0.1)', border: 'rgba(255,59,48,0.25)',
    description: 'Import health data from iPhone',
    vitals: ['heart_rate', 'weight', 'spo2', 'steps', 'glucose'],
  },
];

export default function WearableSync() {
  const { activeProfileId } = useActiveProfile();
  const [connected, setConnected] = useState(() => {
    try { return JSON.parse(localStorage.getItem('wearable_connected') || '{}'); } catch { return {}; }
  });
  const [syncing, setSyncing] = useState({});
  const [lastSync, setLastSync] = useState(() => {
    try { return JSON.parse(localStorage.getItem('wearable_last_sync') || '{}'); } catch { return {}; }
  });

  const nativeAvailable = isHealthSyncAvailable();

  const toggleConnect = async (key) => {
    if (!connected[key] && nativeAvailable) {
      const granted = await requestHealthPermissions();
      if (!granted) {
        toast.error('Health data access denied. Please allow in device Settings.');
        return;
      }
    }
    const next = { ...connected, [key]: !connected[key] };
    setConnected(next);
    localStorage.setItem('wearable_connected', JSON.stringify(next));
    toast(next[key] ? `Connected to ${PROVIDERS.find(p => p.key === key)?.name}` : `Disconnected`);
  };

  const syncProvider = async (providerKey) => {
    if (!activeProfileId) {
      toast.error('Select a profile first');
      return;
    }
    if (!nativeAvailable) {
      toast.info('Real health data sync requires the native iOS/Android app.', {
        description: 'Download HealthFlux from the App Store or Google Play.',
        duration: 5000,
      });
      return;
    }

    setSyncing(s => ({ ...s, [providerKey]: true }));
    try {
      const provider = PROVIDERS.find(p => p.key === providerKey);
      let totalSynced = 0;

      // Read REAL data from device for each vital type this provider supports
      for (const vitalType of (provider?.vitals || [])) {
        const vitals = await readVitals(vitalType, 1); // Last 24 hours
        for (const v of vitals) {
          await base44.entities.VitalMeasurement.create({
            profile_id: activeProfileId,
            vital_type: v.vital_type,
            value: v.value,
            systolic: v.systolic,
            diastolic: v.diastolic,
            unit: v.unit,
            measured_at: v.measured_at,
            source: v.source || providerKey,
            notes: `Synced from ${provider?.name}`,
          });
          totalSynced++;
        }
      }

      const ts = new Date().toLocaleTimeString();
      const next = { ...lastSync, [providerKey]: ts };
      setLastSync(next);
      localStorage.setItem('wearable_last_sync', JSON.stringify(next));

      if (totalSynced > 0) {
        toast.success(`Synced ${totalSynced} real readings from ${provider?.name}`);
      } else {
        toast.info(`No new data found on ${provider?.name}`);
      }
    } catch (err) {
      toast.error('Sync failed: ' + err.message);
    } finally {
      setSyncing(s => ({ ...s, [providerKey]: false }));
    }
  };

  return (
    <div className="p-4 space-y-3">
      <div className="mb-4">
        <h2 className="text-base font-black" style={{ color: 'var(--hf-text)' }}>Wearable Integrations</h2>
        <p className="text-xs mt-0.5" style={{ color: 'var(--hf-text-muted)' }}>
          Connect your devices to sync real health data
        </p>
      </div>

      {!nativeAvailable && (
        <div className="rounded-2xl p-3 flex items-start gap-2"
          style={{ background: 'rgba(242,140,140,0.08)', border: '1px solid rgba(242,140,140,0.2)' }}>
          <Smartphone size={14} className="flex-shrink-0 mt-0.5" style={{ color: '#f28c8c' }} />
          <div>
            <p className="text-xs font-bold" style={{ color: '#f28c8c' }}>Native App Required</p>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--hf-text-muted)' }}>
              Real health data sync requires the HealthFlux iOS or Android app. Connection status is saved and will sync when you open the native app.
            </p>
          </div>
        </div>
      )}

      {PROVIDERS.map(p => {
        const isConnected = !!connected[p.key];
        const isSyncing = !!syncing[p.key];
        return (
          <div key={p.key}
            className="rounded-2xl p-4 flex items-center gap-4"
            style={{ background: isConnected ? p.bg : 'var(--hf-surface)', border: `1px solid ${isConnected ? p.border : 'var(--hf-border)'}` }}>
            <div className="text-2xl flex-shrink-0">{p.icon}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold" style={{ color: 'var(--hf-text)' }}>{p.name}</p>
              <p className="text-xs" style={{ color: 'var(--hf-text-muted)' }}>{p.description}</p>
              {isConnected && lastSync[p.key] && (
                <p className="text-[10px] mt-0.5" style={{ color: p.color }}>Last synced: {lastSync[p.key]}</p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {isConnected && (
                <button onClick={() => syncProvider(p.key)} disabled={isSyncing}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95"
                  style={{ background: p.bg, color: p.color, border: `1px solid ${p.border}` }}>
                  {isSyncing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                  {isSyncing ? 'Syncing…' : 'Sync'}
                </button>
              )}
              <button onClick={() => toggleConnect(p.key)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95"
                style={isConnected
                  ? { background: 'var(--hf-surface-2)', color: 'var(--hf-text-muted)', border: '1px solid var(--hf-border)' }
                  : { background: p.color, color: '#fff', border: 'none' }}>
                {isConnected ? <><Unlink size={11} /> Disconnect</> : <><Link2 size={11} /> Connect</>}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

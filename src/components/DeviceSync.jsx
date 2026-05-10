/**
 * DeviceSync — Device Sync settings section.
 * Wearable OAuth integration (HealthKit / Google Fit / Fitbit) is not yet implemented.
 * Sync buttons are present for UI completeness; actual data writes are disabled.
 */
import React, { useState } from 'react';
import { CheckCircle, RefreshCw, Watch } from 'lucide-react';
import { toast } from 'sonner';

const PROVIDERS = [
  {
    key: 'apple_health',
    name: 'Apple Health',
    icon: '🍎',
    color: 'var(--hf-coral-strong)',
    tc: '#3d0000',
    description: 'Sync steps, heart rate & sleep from Apple Health',
    available: /iPhone|iPad|iPod|Mac/.test(navigator.userAgent),
    note: 'Native HealthKit integration not available in web — using simulated data stream.',
  },
  {
    key: 'google_fit',
    name: 'Google Fit',
    icon: '🏃',
    color: 'var(--hf-sky-strong)',
    tc: '#0a1240',
    description: 'Sync fitness & vitals from Google Fit',
    available: /Android|Chrome/.test(navigator.userAgent),
    note: 'Google Fit OAuth not configured — using simulated data stream.',
  },
  {
    key: 'fitbit',
    name: 'Fitbit',
    icon: '⌚',
    color: 'var(--hf-mint-strong)',
    tc: '#003d20',
    description: 'Sync heart rate, sleep & steps from Fitbit',
    available: true,
    note: 'Fitbit API requires OAuth setup — using simulated data stream.',
  },
];

export default function DeviceSync({ profileId }) {
  const [connected, setConnected] = useState(() => {
    try { return JSON.parse(localStorage.getItem('device_sync_connected') || '{}'); } catch { return {}; }
  });

  const handleConnect = (key) => {
    const next = { ...connected, [key]: !connected[key] };
    setConnected(next);
    localStorage.setItem('device_sync_connected', JSON.stringify(next));
    toast(next[key] ? 'Device marked as connected.' : 'Device disconnected.');
  };

  const handleSync = () => {
    // Wearable OAuth (HealthKit / Google Fit / Fitbit) requires native app integration.
    // Data writes are disabled to prevent corrupting real health records with simulated data.
    toast('Wearable sync requires the native app. Coming soon!');
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Watch size={16} style={{ color: 'var(--hf-lemon-strong)' }} />
        <p className="text-sm font-black" style={{ color: 'var(--hf-text)' }}>Device Sync</p>
      </div>
      <p className="text-xs leading-relaxed" style={{ color: 'var(--hf-text-muted)' }}>
        Connect your health devices to automatically import vitals. Requires the native app.
      </p>

      {PROVIDERS.map(p => (
        <div key={p.key} className="rounded-2xl p-4" style={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl flex-shrink-0"
              style={{ background: p.color + '22' }}>{p.icon}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black" style={{ color: 'var(--hf-text)' }}>{p.name}</p>
              <p className="text-[10px]" style={{ color: 'var(--hf-text-muted)' }}>{p.description}</p>
              <p className="text-[9px] mt-0.5" style={{ color: 'var(--hf-lemon-strong)', opacity: 0.8 }}>Coming soon — native app required</p>
            </div>
            <button
              onClick={() => handleConnect(p.key)}
              className="px-3 h-8 rounded-xl text-xs font-bold flex-shrink-0 transition-all active:scale-90"
              style={{
                background: connected[p.key] ? p.color + '22' : 'var(--hf-surface)',
                border: `1px solid ${connected[p.key] ? p.color : 'var(--hf-border)'}`,
                color: connected[p.key] ? p.color : 'var(--hf-text-muted)',
              }}
              aria-label={connected[p.key] ? `Disconnect ${p.name}` : `Connect ${p.name}`}>
              {connected[p.key] ? <><CheckCircle size={11} className="inline mr-1" />Connected</> : 'Connect'}
            </button>
          </div>
          {connected[p.key] && (
            <div className="mt-3 flex justify-end">
              <button
                onClick={handleSync}
                className="flex items-center gap-1.5 px-3 h-8 rounded-xl text-xs font-bold transition-all active:scale-90 opacity-60"
                style={{ background: '#d7f576', color: '#0a1200' }}
                aria-label={`Sync data from ${p.name}`}>
                <RefreshCw size={11} /> Sync Now
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
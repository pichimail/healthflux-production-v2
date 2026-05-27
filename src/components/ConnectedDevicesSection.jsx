/**
 * ConnectedDevicesSection — FIXED: No fake/mock data
 * Uses native health bridge for real device sync
 * Falls back to "Use native app" message on web
 */
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client'; // Will be swapped to dbClient
import { useQuery } from '@tanstack/react-query';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, RefreshCw, Link2, Unlink, Smartphone } from 'lucide-react';
import { isHealthSyncAvailable, requestHealthPermissions, syncAllVitals } from '@/lib/healthBridge';
import { useFeatureFlags } from '@/lib/FeatureFlagsContext';

const DEVICE_CATALOG = [
  {
    key: 'apple_health',
    label: 'Apple Health',
    icon: '🍎',
    color: '#ff3b30',
    bg: 'rgba(255,59,48,0.08)',
    border: 'rgba(255,59,48,0.25)',
  },
  {
    key: 'google_fit',
    label: 'Google Fit',
    icon: '🟢',
    color: '#4285F4',
    bg: 'rgba(66,133,244,0.08)',
    border: 'rgba(66,133,244,0.25)',
  },
  {
    key: 'fitbit',
    label: 'Fitbit',
    icon: '⌚',
    color: '#00B0B9',
    bg: 'rgba(0,176,185,0.08)',
    border: 'rgba(0,176,185,0.25)',
  },
  {
    key: 'samsung_health',
    label: 'Samsung Health',
    icon: '📱',
    color: '#0ea5e9',
    bg: 'rgba(14,165,233,0.08)',
    border: 'rgba(14,165,233,0.25)',
  },
];

function DeviceCard({ device, connectedDevice, profileId, onSync }) {
  const [syncing, setSyncing] = useState(false);
  const qc = useQueryClient();
  const nativeAvailable = isHealthSyncAvailable();

  const connect = async () => {
    if (nativeAvailable) {
      const granted = await requestHealthPermissions();
      if (!granted) {
        toast.error('Health data permission denied. Please allow in Settings.');
        return;
      }
    }
    try {
      await base44.entities.ConnectedDevice.create({
        profile_id: profileId,
        device_type: device.key,
        device_name: device.label,
        is_connected: true,
        last_sync: null,
      });
      qc.invalidateQueries({ queryKey: ['connected-devices', profileId] });
      toast.success(`${device.label} connected.`);
    } catch (err) {
      toast.error('Connection failed: ' + err.message);
    }
  };

  const disconnect = async () => {
    if (!connectedDevice) return;
    await base44.entities.ConnectedDevice.update(connectedDevice.id, { is_connected: false });
    qc.invalidateQueries({ queryKey: ['connected-devices', profileId] });
    toast.info(`${device.label} disconnected.`);
  };

  const syncData = async () => {
    if (!connectedDevice) return;
    setSyncing(true);
    try {
      if (!nativeAvailable) {
        toast.info('Real-time health sync requires the native iOS/Android app. Download from the App Store or Google Play.');
        return;
      }

      // REAL DATA: Read from actual device health store
      const vitals = await syncAllVitals(1); // Last 24 hours

      if (vitals.length === 0) {
        toast.info('No new health data found on device.');
        await base44.entities.ConnectedDevice.update(connectedDevice.id, {
          last_sync: new Date().toISOString(),
        });
        return;
      }

      // Write REAL vitals to database
      for (const v of vitals) {
        await base44.entities.VitalMeasurement.create({
          profile_id: profileId,
          vital_type: v.vital_type,
          value: v.value,
          systolic: v.systolic,
          diastolic: v.diastolic,
          unit: v.unit,
          measured_at: v.measured_at,
          source: v.source,
          notes: `Synced from ${device.label}`,
        });
      }

      // Update device last_sync with real counts
      await base44.entities.ConnectedDevice.update(connectedDevice.id, {
        last_sync: new Date().toISOString(),
        avg_heart_rate: vitals.find(v => v.vital_type === 'heart_rate')?.value || null,
        daily_steps: vitals.find(v => v.vital_type === 'steps')?.value || null,
      });

      qc.invalidateQueries({ queryKey: ['connected-devices', profileId] });
      qc.invalidateQueries({ queryKey: ['vitals'] });
      toast.success(`Synced ${vitals.length} real health readings from ${device.label}`);
      onSync?.();
    } catch (err) {
      toast.error('Sync failed: ' + err.message);
    } finally {
      setSyncing(false);
    }
  };

  const isConn = connectedDevice?.is_connected;

  return (
    <div className="rounded-2xl p-4 flex items-center gap-3"
      style={{ background: isConn ? device.bg : 'var(--hf-surface)', border: `1px solid ${isConn ? device.border : 'var(--hf-border)'}` }}>
      <div className="text-xl flex-shrink-0">{device?.icon || '📱'}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold" style={{ color: 'var(--hf-text)' }}>{device.label}</p>
        <p className="text-[10px]" style={{ color: 'var(--hf-text-muted)' }}>
          {isConn
            ? connectedDevice?.last_sync
              ? `Last synced: ${new Date(connectedDevice.last_sync).toLocaleString()}`
              : 'Connected — tap Sync'
            : 'Not connected'
          }
        </p>
        {!nativeAvailable && isConn && (
          <p className="text-[9px] mt-0.5 flex items-center gap-1" style={{ color: 'var(--hf-text-muted)' }}>
            <Smartphone size={9} /> Native app required for real sync
          </p>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {isConn && (
          <button onClick={syncData} disabled={syncing}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95"
            style={{ background: device.bg, color: device.color, border: `1px solid ${device.border}` }}>
            {syncing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            {syncing ? 'Syncing…' : 'Sync'}
          </button>
        )}
        <button onClick={isConn ? disconnect : connect}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95"
          style={isConn
            ? { background: 'var(--hf-surface-2)', color: 'var(--hf-text-muted)', border: '1px solid var(--hf-border)' }
            : { background: device.color, color: '#fff', border: 'none' }}>
          {isConn ? <><Unlink size={11} /> Disconnect</> : <><Link2 size={11} /> Connect</>}
        </button>
      </div>
    </div>
  );
}

export default function ConnectedDevicesSection({ profileId }) {
  const { hasFeature, loading: flagsLoading } = useFeatureFlags();
  const { data: connectedDevices = [], isLoading } = useQuery({
    queryKey: ['connected-devices', profileId],
    queryFn: () => base44.entities.ConnectedDevice.filter({ profile_id: profileId }, '-updated_date', 20),
    enabled: !!profileId,
  });

  if (!profileId) return null;

  const enabledCatalog = DEVICE_CATALOG.filter((device) => {
    if (device.key === 'apple_health') return !flagsLoading && hasFeature('apple_health_import');
    if (device.key === 'google_fit') return !flagsLoading && hasFeature('wearable_integrations_google_fit');
    if (device.key === 'fitbit') return !flagsLoading && hasFeature('wearable_integrations_fitbit');
    return true;
  });

  if (!enabledCatalog.length) return null;

  return (
    <div className="rounded-2xl p-4" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
      <div className="mb-3">
        <p className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--hf-text-muted)' }}>Connected Devices</p>
        <p className="text-[11px] mt-1" style={{ color: 'var(--hf-text-muted)' }}>
          Connect once, then sync health readings into your profile.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 py-4" style={{ color: 'var(--hf-text-muted)' }}>
          <Loader2 size={14} className="animate-spin" />
          <span className="text-xs">Loading devices...</span>
        </div>
      ) : (
        <div className="space-y-2.5">
          {enabledCatalog.map((device) => {
            const connectedDevice = connectedDevices.find((d) => d.device_type === device.key && d.is_connected);
            return (
              <DeviceCard
                key={device.key}
                device={device}
                connectedDevice={connectedDevice}
                profileId={profileId}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

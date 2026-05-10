/**
 * ConnectedDevicesSection — FIXED: No fake/mock data
 * Uses native health bridge for real device sync
 * Falls back to "Use native app" message on web
 */
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client'; // Will be swapped to dbClient
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, RefreshCw, Link2, Unlink, Smartphone } from 'lucide-react';
import { isHealthSyncAvailable, requestHealthPermissions, syncAllVitals } from '@/lib/healthBridge';

export default function DeviceCard({ device, connectedDevice, profileId, onSync }) {
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
        user_email: '', // Will be auto-filled by RLS/created_by
        device_type: device.key,
        device_name: device.label,
        is_connected: true,
        last_sync: null,
      });
      qc.invalidateQueries({ queryKey: ['connected-devices'] });
      toast.success(`${device.label} connected.`);
    } catch (err) {
      toast.error('Connection failed: ' + err.message);
    }
  };

  const disconnect = async () => {
    if (!connectedDevice) return;
    await base44.entities.ConnectedDevice.update(connectedDevice.id, { is_connected: false });
    qc.invalidateQueries({ queryKey: ['connected-devices'] });
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

      qc.invalidateQueries({ queryKey: ['connected-devices'] });
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
      <div className="text-xl flex-shrink-0">{device.icon}</div>
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

/**
 * Native Health Data Bridge
 * Reads REAL health data from Apple Health (iOS) and Google Fit (Android)
 * via Capacitor native plugins. ZERO fake/mock data.
 * 
 * REQUIRES:
 *   npm install @capacitor/core @capacitor/cli
 *   npm install @perfood/capacitor-healthkit   (iOS - Apple Health)
 *   npm install @perfood/capacitor-google-fit  (Android - Google Fit)
 *   npx cap sync
 * 
 * Falls back gracefully in web browser (shows "Use native app" message)
 */

import { Capacitor } from '@capacitor/core';

const isNative = Capacitor.isNativePlatform();
const platform = Capacitor.getPlatform(); // 'ios' | 'android' | 'web'

let HealthKit = null;
let GoogleFit = null;

// Lazy-load native plugins only when on device
async function loadPlugins() {
  if (platform === 'ios') {
    try {
      const healthkitPkg = '@perfood/capacitor-healthkit';
      const mod = await import(/* @vite-ignore */ healthkitPkg);
      HealthKit = mod.CapacitorHealthkit;
    } catch (e) {
      console.warn('HealthKit plugin not available:', e.message);
    }
  } else if (platform === 'android') {
    try {
      const googleFitPkg = '@perfood/capacitor-google-fit';
      const mod = await import(/* @vite-ignore */ googleFitPkg);
      GoogleFit = mod.GoogleFit;
    } catch (e) {
      console.warn('GoogleFit plugin not available:', e.message);
    }
  }
}

/**
 * Check if native health sync is available
 */
export function isHealthSyncAvailable() {
  return isNative && (platform === 'ios' || platform === 'android');
}

/**
 * Request health data permissions
 * @returns {Promise<boolean>} authorized
 */
export async function requestHealthPermissions() {
  await loadPlugins();

  if (platform === 'ios' && HealthKit) {
    try {
      await HealthKit.requestAuthorization({
        all: [],
        read: [
          'HKQuantityTypeIdentifierHeartRate',
          'HKQuantityTypeIdentifierBloodPressureSystolic',
          'HKQuantityTypeIdentifierBloodPressureDiastolic',
          'HKQuantityTypeIdentifierOxygenSaturation',
          'HKQuantityTypeIdentifierBodyMass',
          'HKQuantityTypeIdentifierStepCount',
          'HKQuantityTypeIdentifierActiveEnergyBurned',
          'HKCategoryTypeIdentifierSleepAnalysis',
          'HKQuantityTypeIdentifierBloodGlucose',
        ],
        write: [],
      });
      return true;
    } catch (e) {
      console.error('HealthKit auth failed:', e);
      return false;
    }
  }

  if (platform === 'android' && GoogleFit) {
    try {
      const result = await GoogleFit.connectToGoogleFit();
      return result.connected === true;
    } catch (e) {
      console.error('Google Fit auth failed:', e);
      return false;
    }
  }

  return false;
}

/**
 * Read real vitals from device health store
 * @param {string} vitalType - heart_rate|blood_pressure|weight|spo2|steps|calories|sleep|glucose
 * @param {number} daysBack - How many days of data to fetch
 * @returns {Promise<Array<{vital_type, value, systolic?, diastolic?, unit, measured_at, source}>>}
 */
export async function readVitals(vitalType, daysBack = 7) {
  await loadPlugins();
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);
  const endDate = new Date();

  if (platform === 'ios' && HealthKit) {
    return readFromHealthKit(vitalType, startDate, endDate);
  }
  if (platform === 'android' && GoogleFit) {
    return readFromGoogleFit(vitalType, startDate, endDate);
  }

  throw new Error('Health sync not available on this platform. Use the native app.');
}

// ── Apple Health (iOS) ──
async function readFromHealthKit(vitalType, startDate, endDate) {
  const typeMap = {
    heart_rate: 'HKQuantityTypeIdentifierHeartRate',
    weight: 'HKQuantityTypeIdentifierBodyMass',
    spo2: 'HKQuantityTypeIdentifierOxygenSaturation',
    steps: 'HKQuantityTypeIdentifierStepCount',
    calories: 'HKQuantityTypeIdentifierActiveEnergyBurned',
    glucose: 'HKQuantityTypeIdentifierBloodGlucose',
  };

  const hkType = typeMap[vitalType];
  if (!hkType) return [];

  try {
    const result = await HealthKit.queryHKitSampleType({
      sampleName: hkType,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      limit: 100,
    });

    return (result.resultData || []).map(sample => ({
      vital_type: vitalType,
      value: parseFloat(sample.value),
      unit: sample.unit || unitForType(vitalType),
      measured_at: sample.startDate || sample.date,
      source: 'apple_health',
    }));
  } catch (e) {
    console.error(`HealthKit read ${vitalType} failed:`, e);
    return [];
  }
}

// ── Google Fit (Android) ──
async function readFromGoogleFit(vitalType, startDate, endDate) {
  const typeMap = {
    heart_rate: 'com.google.heart_rate.bpm',
    weight: 'com.google.weight',
    steps: 'com.google.step_count.delta',
    calories: 'com.google.calories.expended',
  };

  const fitType = typeMap[vitalType];
  if (!fitType) return [];

  try {
    const result = await GoogleFit.getHistory({
      dataType: fitType,
      startTime: startDate.getTime(),
      endTime: endDate.getTime(),
    });

    return (result.data || []).map(point => ({
      vital_type: vitalType,
      value: parseFloat(point.value),
      unit: unitForType(vitalType),
      measured_at: new Date(point.startTime).toISOString(),
      source: 'google_fit',
    }));
  } catch (e) {
    console.error(`Google Fit read ${vitalType} failed:`, e);
    return [];
  }
}

/**
 * Sync ALL available vitals from device → returns array of vital records
 * Does NOT write to DB — caller handles that
 */
export async function syncAllVitals(daysBack = 1) {
  const types = ['heart_rate', 'weight', 'spo2', 'steps', 'calories', 'glucose'];
  const results = [];

  for (const type of types) {
    try {
      const data = await readVitals(type, daysBack);
      results.push(...data);
    } catch {}
  }

  return results;
}

function unitForType(type) {
  const units = {
    heart_rate: 'bpm',
    weight: 'kg',
    spo2: '%',
    steps: 'steps',
    calories: 'kcal',
    glucose: 'mg/dL',
    blood_pressure: 'mmHg',
    temperature: '°C',
  };
  return units[type] || '';
}

export default {
  isHealthSyncAvailable,
  requestHealthPermissions,
  readVitals,
  syncAllVitals,
};

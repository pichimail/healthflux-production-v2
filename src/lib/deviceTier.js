/**
 * deviceTier — detects if the current device is low-end based on
 * hardware concurrency, memory, and user agent hints.
 * Returns 'low' | 'mid' | 'high'
 */

let _cachedTier = null;

export function getDeviceTier() {
  if (_cachedTier) return _cachedTier;

  const cores = navigator.hardwareConcurrency || 4;
  const memory = navigator.deviceMemory || 4; // GB, not available on all browsers
  const ua = navigator.userAgent;

  // Low-end signals
  const isLowCores = cores <= 2;
  const isLowMemory = memory <= 2;
  const isOldAndroid = /Android [1-7]\./.test(ua);

  // Connection hint
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const isSlowConnection = connection && (connection.effectiveType === '2g' || connection.effectiveType === 'slow-2g');

  const lowSignals = [isLowCores, isLowMemory, isOldAndroid, isSlowConnection].filter(Boolean).length;

  if (lowSignals >= 2) {
    _cachedTier = 'low';
  } else if (lowSignals === 1) {
    _cachedTier = 'mid';
  } else {
    _cachedTier = 'high';
  }

  return _cachedTier;
}

/**
 * Returns true if backdrop-filter (glass effects) should be enabled.
 * Disabled on low-end devices to prevent jank.
 */
export function shouldUseGlass() {
  return getDeviceTier() !== 'low';
}

/**
 * Returns CSS backdropFilter value based on device tier.
 */
export function getBackdropFilter(defaultFilter = 'blur(20px) saturate(140%)') {
  return shouldUseGlass() ? defaultFilter : 'none';
}
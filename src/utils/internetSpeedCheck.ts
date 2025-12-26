/**
 * Utility to check internet connection speed
 * Uses Network Information API with timeout-based fallback
 * Returns estimated upload speed in Mbps
 */

// Cache the speed result to avoid repeated checks
let cachedSpeed: number | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Timeout-based detection cache
let probeResult: 'fast' | 'slow' | 'unknown' = 'unknown';
let probeTimestamp: number = 0;
const PROBE_CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

// Manual slow mode flag (user can force slow mode)
let manualSlowMode: boolean = false;

/**
 * Set manual slow mode - forces offline-first behavior
 */
export const setManualSlowMode = (enabled: boolean): void => {
  manualSlowMode = enabled;
  console.log(`📶 Manual slow mode: ${enabled ? 'ON' : 'OFF'}`);
};

/**
 * Get manual slow mode status
 */
export const getManualSlowMode = (): boolean => manualSlowMode;

/**
 * Perform a quick timeout-based probe to detect slow connections
 * This is used as a fallback when Network Information API is unavailable
 */
export const probeConnectionSpeed = async (): Promise<'fast' | 'slow'> => {
  // Return cached probe result if still valid
  if (probeResult !== 'unknown' && Date.now() - probeTimestamp < PROBE_CACHE_DURATION) {
    return probeResult;
  }

  // If manual slow mode is on, return slow
  if (manualSlowMode) {
    return 'slow';
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
    
    const startTime = Date.now();
    await fetch('/ping.txt', { 
      method: 'HEAD', 
      cache: 'no-store',
      signal: controller.signal 
    });
    clearTimeout(timeoutId);
    
    const responseTime = Date.now() - startTime;
    
    // If response took more than 2 seconds, consider it slow
    probeResult = responseTime > 2000 ? 'slow' : 'fast';
    probeTimestamp = Date.now();
    
    console.log(`📶 Connection probe: ${responseTime}ms -> ${probeResult}`);
    return probeResult;
  } catch (error) {
    // Timeout or network error = slow connection
    probeResult = 'slow';
    probeTimestamp = Date.now();
    console.log('📶 Connection probe: timeout/error -> slow');
    return 'slow';
  }
};

/**
 * Get connection speed from Network Information API
 * Falls back to timeout-based detection for unsupported browsers
 */
export const getConnectionSpeed = (): { 
  downlink: number; 
  effectiveType: string; 
  estimatedUpload: number;
  isSlowConnection: boolean;
} => {
  // Manual slow mode overrides everything
  if (manualSlowMode) {
    return {
      downlink: 0.1,
      effectiveType: 'slow-2g',
      estimatedUpload: 0.04,
      isSlowConnection: true,
    };
  }

  if ('connection' in navigator && (navigator as any).connection) {
    const connection = (navigator as any).connection;
    const downlink = connection.downlink || 10; // Default 10 Mbps
    const effectiveType = connection.effectiveType || '4g';
    const estimatedUpload = downlink * 0.4; // Conservative estimate
    
    return {
      downlink,
      effectiveType,
      estimatedUpload,
      isSlowConnection: effectiveType === '2g' || effectiveType === 'slow-2g' || effectiveType === '3g' || downlink < 1,
    };
  }
  
  // Fallback: use probe result if available
  if (probeResult !== 'unknown') {
    const isSlow = probeResult === 'slow';
    return {
      downlink: isSlow ? 0.5 : 10,
      effectiveType: isSlow ? '2g' : '4g',
      estimatedUpload: isSlow ? 0.2 : 4,
      isSlowConnection: isSlow,
    };
  }
  
  // No probe yet - assume medium connection, trigger probe in background
  probeConnectionSpeed().catch(() => {});
  
  return {
    downlink: 5,
    effectiveType: 'unknown',
    estimatedUpload: 2,
    isSlowConnection: false, // Optimistic default, probe will update
  };
};

/**
 * Check upload speed - uses cached value if available
 * Non-blocking, returns immediately from Network Information API
 */
export const checkUploadSpeed = async (): Promise<number> => {
  // Return cached value if still valid
  if (cachedSpeed !== null && Date.now() - cacheTimestamp < CACHE_DURATION) {
    return cachedSpeed;
  }
  
  const { estimatedUpload } = getConnectionSpeed();
  
  // Cache the result
  cachedSpeed = estimatedUpload;
  cacheTimestamp = Date.now();
  
  console.log(`📶 Connection speed: ${estimatedUpload.toFixed(2)} Mbps (estimated upload)`);
  return estimatedUpload;
};

/**
 * Quick check if connection is slow
 * Instant, non-blocking
 */
export const isSlowConnection = (): boolean => {
  const { isSlowConnection } = getConnectionSpeed();
  return isSlowConnection;
};

/**
 * Get connection quality label
 */
export const getConnectionQuality = (): 'fast' | 'medium' | 'slow' | 'offline' => {
  if (!navigator.onLine) return 'offline';
  
  const { effectiveType, downlink } = getConnectionSpeed();
  
  if (effectiveType === '4g' && downlink >= 5) return 'fast';
  if (effectiveType === '4g' || effectiveType === '3g') return 'medium';
  return 'slow';
};

/**
 * Clear cached speed (useful after connection changes)
 */
export const clearSpeedCache = (): void => {
  cachedSpeed = null;
  cacheTimestamp = 0;
};

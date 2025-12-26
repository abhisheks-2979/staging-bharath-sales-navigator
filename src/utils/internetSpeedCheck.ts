/**
 * Utility to check internet connection speed
 * Uses Network Information API (no external requests)
 * Returns estimated upload speed in Mbps
 */

// Cache the speed result to avoid repeated checks
let cachedSpeed: number | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get connection speed from Network Information API
 * This is instant and non-blocking
 */
export const getConnectionSpeed = (): { 
  downlink: number; 
  effectiveType: string; 
  estimatedUpload: number;
  isSlowConnection: boolean;
} => {
  if ('connection' in navigator && (navigator as any).connection) {
    const connection = (navigator as any).connection;
    const downlink = connection.downlink || 10; // Default 10 Mbps
    const effectiveType = connection.effectiveType || '4g';
    const estimatedUpload = downlink * 0.4; // Conservative estimate
    
    return {
      downlink,
      effectiveType,
      estimatedUpload,
      isSlowConnection: effectiveType === '2g' || effectiveType === 'slow-2g' || downlink < 1,
    };
  }
  
  // Fallback for browsers without Network Information API
  return {
    downlink: 10,
    effectiveType: 'unknown',
    estimatedUpload: 4,
    isSlowConnection: false,
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

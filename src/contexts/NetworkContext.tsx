import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { getManualSlowMode, probeConnectionSpeed } from '@/utils/internetSpeedCheck';

type ConnectionQuality = 'fast' | 'slow' | 'offline';
type EffectiveType = '4g' | '3g' | '2g' | 'slow-2g' | 'unknown';

interface NetworkState {
  isOnline: boolean;
  isSlow: boolean;
  connectionQuality: ConnectionQuality;
  effectiveType: EffectiveType;
  shouldReduceData: boolean;
  lastChecked: Date | null;
  lastSyncTime: Date | null;
}

interface NetworkContextValue extends NetworkState {
  checkConnection: () => void;
  setManualOfflineMode: (offline: boolean) => void;
  manualOfflineMode: boolean;
  updateLastSyncTime: () => void;
}

const NetworkContext = createContext<NetworkContextValue | null>(null);

// Get connection info from Network Information API
function getConnectionInfo(): { effectiveType: EffectiveType; downlink: number } {
  if ('connection' in navigator && (navigator as any).connection) {
    const connection = (navigator as any).connection;
    return {
      effectiveType: connection.effectiveType || 'unknown',
      downlink: connection.downlink || 10, // Default to 10 Mbps if unknown
    };
  }
  return { effectiveType: 'unknown', downlink: 10 };
}

// Determine connection quality based on effective type and online status
function determineQuality(isOnline: boolean, effectiveType: EffectiveType, hasSlowModeEnabled: boolean): ConnectionQuality {
  if (!isOnline) return 'offline';
  if (hasSlowModeEnabled) return 'slow';
  
  switch (effectiveType) {
    case 'slow-2g':
    case '2g':
      return 'slow';
    case '3g':
      return 'slow'; // 3G can be slow for data-heavy apps
    case '4g':
    case 'unknown':
    default:
      return 'fast';
  }
}

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const [manualOfflineMode, setManualOfflineMode] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(() => {
    // Try to restore from localStorage
    const saved = localStorage.getItem('lastSyncTime');
    return saved ? new Date(saved) : null;
  });
  
  const [state, setState] = useState<NetworkState>(() => {
    const isOnline = navigator.onLine;
    const { effectiveType } = getConnectionInfo();
    const slowModeEnabled = getManualSlowMode();
    const quality = determineQuality(isOnline, effectiveType, slowModeEnabled);
    
    return {
      isOnline,
      isSlow: quality === 'slow' || slowModeEnabled,
      connectionQuality: quality,
      effectiveType,
      shouldReduceData: quality !== 'fast',
      lastChecked: new Date(),
      lastSyncTime: null,
    };
  });

  const mountedRef = useRef(true);

  const updateLastSyncTime = useCallback(() => {
    const now = new Date();
    setLastSyncTime(now);
    localStorage.setItem('lastSyncTime', now.toISOString());
  }, []);

  const updateConnectionState = useCallback(async () => {
    if (!mountedRef.current) return;
    
    const isOnline = navigator.onLine && !manualOfflineMode;
    const { effectiveType } = getConnectionInfo();
    const slowModeEnabled = getManualSlowMode();
    
    // If Network API is unavailable, use probe result
    let finalEffectiveType = effectiveType;
    if (effectiveType === 'unknown' && isOnline) {
      const probeResult = await probeConnectionSpeed();
      finalEffectiveType = probeResult === 'slow' ? '2g' : '4g';
    }
    
    const quality = manualOfflineMode ? 'offline' : determineQuality(isOnline, finalEffectiveType, slowModeEnabled);
    
    setState(prev => ({
      isOnline: isOnline && !manualOfflineMode,
      isSlow: quality === 'slow' || slowModeEnabled,
      connectionQuality: quality,
      effectiveType: finalEffectiveType,
      shouldReduceData: quality !== 'fast',
      lastChecked: new Date(),
      lastSyncTime: prev.lastSyncTime,
    }));
  }, [manualOfflineMode]);

  const checkConnection = useCallback(() => {
    updateConnectionState();
    
    // Also do a soft network probe if online
    if (navigator.onLine && !manualOfflineMode) {
      probeConnectionSpeed()
        .then((result) => {
          if (mountedRef.current) {
            updateConnectionState();
          }
        })
        .catch(() => {
          console.log('⚠️ Network probe failed');
        });
    }
  }, [manualOfflineMode, updateConnectionState]);

  useEffect(() => {
    mountedRef.current = true;

    const handleOnline = () => {
      console.log('🌐 Network: Online event');
      updateConnectionState();
    };

    const handleOffline = () => {
      console.log('📴 Network: Offline event');
      updateConnectionState();
    };

    const handleConnectionChange = () => {
      console.log('📶 Network: Connection changed');
      updateConnectionState();
    };

    // Listen for online/offline events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for connection changes (Network Information API)
    if ('connection' in navigator && (navigator as any).connection) {
      (navigator as any).connection.addEventListener('change', handleConnectionChange);
    }

    // Periodic check - every 30 seconds when online, every 10 seconds when offline
    const intervalId = setInterval(() => {
      if (mountedRef.current) {
        updateConnectionState();
      }
    }, navigator.onLine ? 30000 : 10000);

    return () => {
      mountedRef.current = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if ('connection' in navigator && (navigator as any).connection) {
        (navigator as any).connection.removeEventListener('change', handleConnectionChange);
      }
      clearInterval(intervalId);
    };
  }, [updateConnectionState]);

  // Update when manual mode changes
  useEffect(() => {
    updateConnectionState();
  }, [manualOfflineMode, updateConnectionState]);

  const value: NetworkContextValue = {
    ...state,
    lastSyncTime,
    checkConnection,
    setManualOfflineMode,
    manualOfflineMode,
    updateLastSyncTime,
  };

  return (
    <NetworkContext.Provider value={value}>
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork(): NetworkContextValue {
  const context = useContext(NetworkContext);
  if (!context) {
    // Return default values if outside provider (for safety)
    return {
      isOnline: navigator.onLine,
      isSlow: false,
      connectionQuality: navigator.onLine ? 'fast' : 'offline',
      effectiveType: 'unknown',
      shouldReduceData: false,
      lastChecked: null,
      lastSyncTime: null,
      checkConnection: () => {},
      setManualOfflineMode: () => {},
      manualOfflineMode: false,
      updateLastSyncTime: () => {},
    };
  }
  return context;
}

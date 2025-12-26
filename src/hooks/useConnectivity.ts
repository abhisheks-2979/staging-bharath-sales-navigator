import { useEffect, useRef, useState } from 'react';
import { 
  getNetworkStatus, 
  addNetworkListener, 
  isNativePlatform,
  NetworkStatus 
} from '@/utils/nativeNetworkService';

type Status = 'unknown' | 'online' | 'offline';

/**
 * Lightweight connectivity hook that works on both web and native (Capacitor)
 * 
 * On native: Uses Capacitor Network plugin for reliable status
 * On web: Uses browser events + optional probe for verification
 */
export function useConnectivity(pollMs = 30000, startupDelayMs = 2000) {
  const [status, setStatus] = useState<Status>(() => {
    // Start with browser's connectivity state for instant feedback
    return navigator.onLine ? 'online' : 'offline';
  });
  
  const timer = useRef<number | null>(null);
  const poller = useRef<number | null>(null);
  const mountedRef = useRef(true);

  // Update status from network service
  const updateStatus = async () => {
    if (!mountedRef.current) return;
    
    try {
      const networkStatus = await getNetworkStatus();
      if (mountedRef.current) {
        setStatus(networkStatus.connected ? 'online' : 'offline');
      }
    } catch (error) {
      // Fallback to browser state
      if (mountedRef.current) {
        setStatus(navigator.onLine ? 'online' : 'offline');
      }
    }
  };

  // Web-only probe (skip on native since we have Capacitor plugin)
  const probe = async () => {
    if (!mountedRef.current) return;
    
    // On native, just use the network service
    if (isNativePlatform()) {
      await updateStatus();
      return;
    }
    
    // Trust browser's navigator.onLine as primary source
    if (!navigator.onLine) {
      setStatus('offline');
      return;
    }

    // If browser says online, we trust it immediately
    setStatus('online');
    
    // Soft verification in background
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const res = await fetch('/ping.txt', { 
        method: 'HEAD', 
        cache: 'no-store',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!res.ok && mountedRef.current) {
        console.log('⚠️ Connectivity verification failed');
      }
    } catch (error) {
      if (!navigator.onLine && mountedRef.current) {
        setStatus('offline');
      }
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    
    // Add network status listener (works on both native and web)
    const removeListener = addNetworkListener((networkStatus: NetworkStatus) => {
      if (!mountedRef.current) return;
      console.log('📶 useConnectivity: status changed', networkStatus);
      setStatus(networkStatus.connected ? 'online' : 'offline');
    });
    
    // Browser events as backup (especially for web)
    const onOnline = () => {
      console.log('🌐 Browser online event');
      setStatus('online');
      setTimeout(() => probe(), 500);
    };
    
    const onOffline = () => {
      console.log('📴 Browser offline event');
      setStatus('offline');
    };

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    // Initial status check
    updateStatus();

    // Delayed probe (mainly for web)
    timer.current = window.setTimeout(() => {
      if (mountedRef.current) {
        probe();
      }
      
      // Polling - less frequent on native since we have listeners
      const pollInterval = isNativePlatform() ? pollMs * 2 : pollMs;
      poller.current = window.setInterval(() => {
        if (mountedRef.current) {
          updateStatus();
        }
      }, pollInterval);
    }, startupDelayMs);

    return () => {
      mountedRef.current = false;
      removeListener();
      if (timer.current) clearTimeout(timer.current);
      if (poller.current) clearInterval(poller.current);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [pollMs, startupDelayMs]);

  return status;
}
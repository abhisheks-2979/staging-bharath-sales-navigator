import {useEffect, useRef, useState} from 'react';

type Status = 'unknown' | 'online' | 'offline';

/**
 * Lightweight connectivity hook that primarily relies on browser events
 * and navigator.onLine for instant status updates.
 * 
 * Network probing is used sparingly and only when online to confirm connectivity.
 * This ensures pages load instantly from cache without waiting for network checks.
 */
export function useConnectivity(pollMs = 30000, startupDelayMs = 2000) {
  // Start with browser's connectivity state for INSTANT feedback
  // This is the key - we trust navigator.onLine immediately so pages can load
  const [status, setStatus] = useState<Status>(navigator.onLine ? 'online' : 'offline');
  const timer = useRef<number | null>(null);
  const poller = useRef<number | null>(null);
  const mountedRef = useRef(true);

  // Soft probe - only confirms connectivity, doesn't aggressively check
  const probe = async () => {
    if (!mountedRef.current) return;
    
    // Trust browser's navigator.onLine as primary source
    if (!navigator.onLine) {
      setStatus('offline');
      return;
    }

    // If browser says online, we trust it immediately
    // Only do a soft verification in background
    setStatus('online');
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout
      
      const res = await fetch('/ping.txt', { 
        method: 'HEAD', 
        cache: 'no-store',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!res.ok && mountedRef.current) {
        // Only mark offline if the fetch explicitly fails
        console.log('⚠️ Connectivity verification failed, but staying online based on navigator.onLine');
      }
    } catch (error) {
      // Don't immediately mark as offline on probe failure
      // Trust navigator.onLine instead
      if (!navigator.onLine && mountedRef.current) {
        setStatus('offline');
      }
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    
    // Browser connectivity events - respond IMMEDIATELY
    const onOnline = () => {
      console.log('🌐 Browser online event');
      setStatus('online');
      // Soft probe to confirm, but don't block on it
      setTimeout(() => probe(), 500);
    };
    
    const onOffline = () => {
      console.log('📴 Browser offline event');
      setStatus('offline');
    };

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    // Delayed initial probe - don't block page loading
    timer.current = window.setTimeout(() => {
      if (mountedRef.current && navigator.onLine) {
        probe();
      }
      // Start infrequent polling (30 seconds) only when online
      poller.current = window.setInterval(() => {
        if (mountedRef.current && navigator.onLine) {
          probe();
        }
      }, pollMs);
    }, startupDelayMs);

    return () => {
      mountedRef.current = false;
      if (timer.current) clearTimeout(timer.current);
      if (poller.current) clearInterval(poller.current);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  return status;
}
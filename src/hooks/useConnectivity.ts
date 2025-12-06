import {useEffect, useRef, useState} from 'react';

type Status = 'unknown' | 'online' | 'offline';

export function useConnectivity(pollMs = 10000, startupDelayMs = 1000) {
  // Start with browser's connectivity state for instant feedback
  const [status, setStatus] = useState<Status>(navigator.onLine ? 'online' : 'offline');
  const timer = useRef<number | null>(null);
  const poller = useRef<number | null>(null);
  const isFirstCheck = useRef(true);

  const probe = async () => {
    try {
      // Also check browser's navigator.onLine as a quick indicator
      if (!navigator.onLine) {
        console.log('❌ Browser reports offline (navigator.onLine = false)');
        setStatus('offline');
        return;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout (faster)
      
      const res = await fetch('/ping.txt', { 
        method: 'HEAD', 
        cache: 'no-store',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (res.ok) {
        console.log('✅ Connectivity check: ONLINE');
        setStatus('online');
      } else {
        console.log('⚠️ Connectivity check: OFFLINE (fetch failed)');
        setStatus('offline');
      }
    } catch (error) {
      console.log('❌ Connectivity check: OFFLINE (error)', error);
      // Set offline immediately on error
      setStatus('offline');
    }
    
    isFirstCheck.current = false;
  };

  useEffect(() => {
    // Shorter delay for faster startup - 1 second instead of 5
    timer.current = window.setTimeout(() => {
      probe();
      // Start regular polling after first check - 10 seconds instead of 30
      poller.current = window.setInterval(probe, pollMs);
    }, startupDelayMs);

    // Browser connectivity events - respond IMMEDIATELY
    const onOnline = () => {
      console.log('🌐 Browser online event - checking immediately');
      // Set online immediately, then verify
      setStatus('online');
      probe();
    };
    
    const onOffline = () => {
      console.log('📴 Browser offline event - setting offline');
      setStatus('offline');
    };

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    return () => {
      if (timer.current) clearTimeout(timer.current);
      if (poller.current) clearInterval(poller.current);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []); // Remove dependencies to prevent re-initialization

  return status;
}
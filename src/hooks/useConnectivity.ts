import {useEffect, useRef, useState} from 'react';

type Status = 'unknown' | 'online' | 'offline';

export function useConnectivity(pollMs = 30000, startupDelayMs = 5000) {
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
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout
      
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
    // Delay initial probe to let app load from cache first
    timer.current = window.setTimeout(() => {
      probe();
      // Start regular polling after first check
      poller.current = window.setInterval(probe, pollMs);
    }, startupDelayMs);

    // Browser connectivity events
    const onOnline = () => {
      console.log('Browser online event');
      // Verify with actual network request
      probe();
    };
    
    const onOffline = () => {
      console.log('Browser offline event');
      // Don't immediately set offline - browser events can be unreliable
      // Let the next probe determine actual status
      probe();
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
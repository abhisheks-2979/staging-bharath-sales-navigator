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
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout
      
      const res = await fetch('/ping.txt', { 
        method: 'HEAD', 
        cache: 'no-store',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (res.ok) {
        setStatus('online');
      } else {
        setStatus('offline');
      }
    } catch (error) {
      // Only set offline if this is NOT the first check or if we've had a successful check before
      if (!isFirstCheck.current || status === 'online') {
        setStatus('offline');
      }
      // On first check failure, keep status as 'unknown' to let app work from cache
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
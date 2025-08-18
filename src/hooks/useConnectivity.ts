import {useEffect, useRef, useState} from 'react';

type Status = 'unknown' | 'online' | 'offline';

export function useConnectivity(pollMs = 15000, startupDelayMs = 2500) {
  const [status, setStatus] = useState<Status>('unknown');
  const timer = useRef<number | null>(null);
  const poller = useRef<number | null>(null);

  const probe = async () => {
    try {
      const res = await fetch('/ping.txt', { method: 'HEAD', cache: 'no-store' });
      setStatus(res.ok ? 'online' : 'offline');
    } catch {
      // Don't force offline at startup if cached shell can load
      setStatus('offline');
    }
  };

  useEffect(() => {
    // Delay initial probe
    timer.current = window.setTimeout(probe, startupDelayMs);

    // Re-check when browser reports connectivity change
    const onOnline = () => probe();
    const onOffline = () => setStatus('offline');

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    // Keep polling in background
    poller.current = window.setInterval(probe, pollMs);

    return () => {
      if (timer.current) clearTimeout(timer.current);
      if (poller.current) clearInterval(poller.current);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  return status;
}
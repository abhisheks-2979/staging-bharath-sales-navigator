import {useEffect, useRef, useState} from 'react';

type Status = 'checking' | 'online' | 'offline';

export function useConnectivity(pollMs = 15000, startupDelayMs = 2500) {
  const [status, setStatus] = useState<Status>('checking');
  const timer = useRef<number | null>(null);
  const poller = useRef<number | null>(null);

  const probe = async () => {
    try {
      const res = await fetch('/ping.txt', { method: 'HEAD', cache: 'no-store' });
      setStatus(res.ok ? 'online' : 'offline');
    } catch {
      setStatus('offline');
    }
  };

  useEffect(() => {
    // Delay initial decision so we don't flash "offline" at app start.
    timer.current = window.setTimeout(probe, startupDelayMs);

    const onOnline = () => probe();
    const onOffline = () => {
      // Don't immediately set offline - probe to verify
      probe();
    };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    // Periodic verification
    poller.current = window.setInterval(probe, pollMs) as unknown as number;

    return () => {
      if (timer.current) window.clearTimeout(timer.current);
      if (poller.current) window.clearInterval(poller.current);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [pollMs, startupDelayMs]);

  return status;
}
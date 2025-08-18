import { useConnectivity } from '@/hooks/useConnectivity';

export function NetworkBadge() {
  const status = useConnectivity();
  if (status === 'unknown') return null; // Hide on startup
  if (status === 'offline') return <div className="px-2 py-1 text-xs rounded bg-amber-500/20 text-amber-700">Offline</div>;
  return null;
}
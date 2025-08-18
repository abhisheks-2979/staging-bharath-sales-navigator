import { useConnectivity } from '@/hooks/useConnectivity';

export function NetworkBadge() {
  const status = useConnectivity();
  
  // Only show offline badge when we're certain the app is offline AND needs network
  // Don't show anything during 'unknown' state to let app work from cache
  if (status === 'offline') {
    return (
      <div className="px-2 py-1 text-xs rounded bg-amber-500/20 text-amber-700 dark:bg-amber-500/30 dark:text-amber-300">
        Working Offline
      </div>
    );
  }
  
  return null;
}
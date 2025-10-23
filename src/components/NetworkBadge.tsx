import { useConnectivity } from '@/hooks/useConnectivity';
import { Wifi, WifiOff } from 'lucide-react';

export function NetworkBadge() {
  const status = useConnectivity();
  
  // Show status for both online and offline
  if (status === 'online') {
    return (
      <div className="px-2 py-1 text-xs rounded bg-green-500/20 text-green-700 dark:bg-green-500/30 dark:text-green-300 flex items-center gap-1">
        <Wifi className="h-3 w-3" />
        Online
      </div>
    );
  }
  
  if (status === 'offline') {
    return (
      <div className="px-2 py-1 text-xs rounded bg-amber-500/20 text-amber-700 dark:bg-amber-500/30 dark:text-amber-300 flex items-center gap-1">
        <WifiOff className="h-3 w-3" />
        Offline
      </div>
    );
  }
  
  return null;
}
import { useConnectivity } from '@/hooks/useConnectivity';
import { Wifi, WifiOff } from 'lucide-react';

export function NetworkBadge() {
  const status = useConnectivity();
  
  // Show status for both online and offline
  if (status === 'online') {
    return (
      <span className="text-xs text-primary-foreground/90 flex items-center gap-1">
        <Wifi className="h-3 w-3" />
        Online
      </span>
    );
  }
  
  if (status === 'offline') {
    return (
      <span className="text-xs text-primary-foreground/90 flex items-center gap-1">
        <WifiOff className="h-3 w-3" />
        Offline
      </span>
    );
  }
  
  return null;
}
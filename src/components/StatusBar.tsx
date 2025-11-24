import { useEffect, useState } from "react";
import { useConnectivity } from "@/hooks/useConnectivity";
import { offlineStorage } from "@/lib/offlineStorage";
import { WifiOff } from "lucide-react";

export const StatusBar = () => {
  const connectivityStatus = useConnectivity();
  const [syncQueueCount, setSyncQueueCount] = useState(0);
  const isOnline = connectivityStatus === 'online';

  // Check sync queue periodically
  useEffect(() => {
    const checkQueue = async () => {
      try {
        const queue = await offlineStorage.getSyncQueue();
        setSyncQueueCount(queue.length);
      } catch (error) {
        console.error('Error checking sync queue:', error);
      }
    };

    checkQueue();
    const interval = setInterval(checkQueue, 2000);
    return () => clearInterval(interval);
  }, []);

  // Only show when offline
  if (isOnline) {
    return null;
  }

  return (
    <div className="fixed bottom-16 left-0 right-0 z-40 py-2 px-4 bg-orange-600 text-white text-sm font-medium transition-all duration-300">
      <div className="max-w-7xl mx-auto flex items-center justify-center sm:justify-between gap-2">
        <div className="flex items-center gap-2">
          <WifiOff className="h-4 w-4" />
          <span>Offline Mode</span>
          {syncQueueCount > 0 && (
            <>
              <span className="mx-2">•</span>
              <span>{syncQueueCount} {syncQueueCount === 1 ? 'item' : 'items'} queued</span>
            </>
          )}
        </div>
        
        <span className="hidden sm:inline text-xs opacity-80">Data stored locally</span>
      </div>
    </div>
  );
};

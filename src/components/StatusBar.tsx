import { useEffect, useState } from "react";
import { useConnectivity } from "@/hooks/useConnectivity";
import { offlineStorage } from "@/lib/offlineStorage";
import { Wifi, WifiOff, CloudUpload, CheckCircle2 } from "lucide-react";

export const StatusBar = () => {
  const connectivityStatus = useConnectivity();
  const [syncQueueCount, setSyncQueueCount] = useState(0);
  const [showSyncSuccess, setShowSyncSuccess] = useState(false);
  const isOnline = connectivityStatus === 'online';

  // Check sync queue periodically
  useEffect(() => {
    const checkQueue = async () => {
      try {
        const queue = await offlineStorage.getSyncQueue();
        const prevCount = syncQueueCount;
        const newCount = queue.length;
        
        setSyncQueueCount(newCount);
        
        // Show success animation when queue is cleared while online
        if (isOnline && prevCount > 0 && newCount === 0) {
          setShowSyncSuccess(true);
          setTimeout(() => setShowSyncSuccess(false), 3000);
        }
      } catch (error) {
        console.error('Error checking sync queue:', error);
      }
    };

    checkQueue();
    const interval = setInterval(checkQueue, 2000);
    return () => clearInterval(interval);
  }, [isOnline, syncQueueCount]);

  // Hide the bar if online and no pending items (after success animation)
  if (isOnline && syncQueueCount === 0 && !showSyncSuccess) {
    return null;
  }

  return (
    <div 
      className={`fixed bottom-0 left-0 right-0 z-40 py-2 px-4 text-white text-sm font-medium transition-all duration-300 ${
        showSyncSuccess 
          ? 'bg-green-600' 
          : isOnline 
            ? 'bg-blue-600' 
            : 'bg-gray-600'
      }`}
    >
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          {showSyncSuccess ? (
            <>
              <CheckCircle2 className="h-4 w-4" />
              <span>All data synced successfully ✅</span>
            </>
          ) : isOnline ? (
            <>
              <Wifi className="h-4 w-4" />
              <span>Online</span>
              {syncQueueCount > 0 && (
                <>
                  <span className="mx-2">•</span>
                  <CloudUpload className="h-4 w-4 animate-pulse" />
                  <span>Uploading {syncQueueCount} {syncQueueCount === 1 ? 'item' : 'items'}...</span>
                </>
              )}
            </>
          ) : (
            <>
              <WifiOff className="h-4 w-4" />
              <span>Offline Mode</span>
              {syncQueueCount > 0 && (
                <>
                  <span className="mx-2">•</span>
                  <span>{syncQueueCount} {syncQueueCount === 1 ? 'item' : 'items'} queued</span>
                </>
              )}
            </>
          )}
        </div>
        
        {!isOnline && (
          <span className="text-xs opacity-80">Data stored locally</span>
        )}
      </div>
    </div>
  );
};

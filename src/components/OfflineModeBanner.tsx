import { useEffect, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';
import { offlineStorage } from '@/lib/offlineStorage';

export function OfflineModeBanner() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncQueueCount, setSyncQueueCount] = useState(0);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check sync queue periodically
    const checkSyncQueue = async () => {
      try {
        const queue = await offlineStorage.getSyncQueue();
        setSyncQueueCount(queue.length);
      } catch (error) {
        console.error('Error checking sync queue:', error);
      }
    };

    checkSyncQueue();
    const interval = setInterval(checkSyncQueue, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  // Don't show if online and no pending syncs
  if (isOnline && syncQueueCount === 0) {
    return null;
  }

  return (
    <Alert 
      className={`mb-4 ${
        isOnline 
          ? 'bg-blue-50 border-blue-200 dark:bg-blue-950/30' 
          : 'bg-orange-50 border-orange-200 dark:bg-orange-950/30'
      }`}
    >
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-3">
          {isOnline ? (
            <Wifi className="h-5 w-5 text-blue-600" />
          ) : (
            <WifiOff className="h-5 w-5 text-orange-600" />
          )}
          
          <AlertDescription className="text-sm font-medium">
            {isOnline ? (
              <span className="text-blue-700 dark:text-blue-300">Online</span>
            ) : (
              <span className="text-orange-700 dark:text-orange-300">Working Offline</span>
            )}
          </AlertDescription>
        </div>

        {syncQueueCount > 0 && (
          <Badge variant="secondary" className="gap-2">
            <RefreshCw className="h-3 w-3" />
            {syncQueueCount} pending sync
          </Badge>
        )}
      </div>
    </Alert>
  );
}

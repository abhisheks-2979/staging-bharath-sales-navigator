import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Cloud, CloudOff, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { useConnectivity } from "@/hooks/useConnectivity";
import { offlineStorage } from "@/lib/offlineStorage";
import { toast } from "@/hooks/use-toast";
export const SyncStatusIndicator = () => {
  const isOnline = useConnectivity() === 'online';
  const [syncQueueCount, setSyncQueueCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncStatus, setLastSyncStatus] = useState<'success' | 'error' | null>(null);

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
    const interval = setInterval(checkQueue, 2000); // Check every 2 seconds

    return () => clearInterval(interval);
  }, []);

  // Monitor syncing status when coming online
  useEffect(() => {
    const handleSync = async () => {
      if (isOnline && syncQueueCount > 0) {
        setIsSyncing(true);
        setLastSyncStatus(null);
        toast({
          title: "Syncing...",
          description: `Uploading ${syncQueueCount} pending ${syncQueueCount === 1 ? 'item' : 'items'}`
        });

        // Wait for sync to complete (check queue again after delay)
        setTimeout(async () => {
          const queue = await offlineStorage.getSyncQueue();
          setIsSyncing(false);
          if (queue.length === 0) {
            setLastSyncStatus('success');
            toast({
              title: "Sync Complete",
              description: "All changes uploaded successfully"
            });

            // Clear success status after 3 seconds
            setTimeout(() => setLastSyncStatus(null), 3000);
          } else {
            setLastSyncStatus('error');
            toast({
              title: "Sync Error",
              description: `${queue.length} items failed to sync`,
              variant: "destructive"
            });
          }
        }, 3000);
      }
    };
    handleSync();
  }, [isOnline, syncQueueCount]);

  // Don't show anything if online and no pending items
  if (isOnline && syncQueueCount === 0 && !isSyncing && !lastSyncStatus) {
    return null;
  }
  return;
};
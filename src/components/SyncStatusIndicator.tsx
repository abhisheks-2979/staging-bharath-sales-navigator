import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Cloud, CloudOff, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { useConnectivity } from "@/hooks/useConnectivity";
import { offlineStorage } from "@/lib/offlineStorage";
import { toast } from "@/hooks/use-toast";
import { SyncProgressModal } from "./SyncProgressModal";
import { useOfflineSync } from "@/hooks/useOfflineSync";

export const SyncStatusIndicator = () => {
  const isOnline = useConnectivity() === 'online';
  const { processSyncQueue } = useOfflineSync();
  const [syncQueueCount, setSyncQueueCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncStatus, setLastSyncStatus] = useState<'success' | 'error' | null>(null);
  const [showModal, setShowModal] = useState(false);

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
      if (isOnline && syncQueueCount > 0 && !isSyncing) {
        setIsSyncing(true);
        setLastSyncStatus(null);
        
        console.log(`🔄 Starting sync of ${syncQueueCount} items...`);
        
        toast({
          title: "Syncing Data",
          description: `Uploading ${syncQueueCount} pending ${syncQueueCount === 1 ? 'item' : 'items'}...`
        });

        // Check queue status every second for up to 30 seconds
        let checkCount = 0;
        const maxChecks = 30;
        
        const checkInterval = setInterval(async () => {
          checkCount++;
          const queue = await offlineStorage.getSyncQueue();
          
          console.log(`📊 Sync check ${checkCount}/${maxChecks}: ${queue.length} items remaining`);
          
          // If queue is empty, sync is complete
          if (queue.length === 0) {
            clearInterval(checkInterval);
            setIsSyncing(false);
            setLastSyncStatus('success');
            setSyncQueueCount(0);
            
            toast({
              title: "✅ Sync Complete",
              description: "All changes uploaded successfully"
            });

            // Clear success status after 3 seconds
            setTimeout(() => setLastSyncStatus(null), 3000);
          } 
          // If we've checked 30 times and still have items, show error
          else if (checkCount >= maxChecks) {
            clearInterval(checkInterval);
            setIsSyncing(false);
            setLastSyncStatus('error');
            
            toast({
              title: "⚠️ Sync Incomplete",
              description: `${queue.length} ${queue.length === 1 ? 'item' : 'items'} still pending. Will retry automatically.`,
              variant: "destructive"
            });
          }
        }, 1000);
      }
    };
    
    // Trigger sync immediately when online and have items
    if (isOnline && syncQueueCount > 0) {
      handleSync();
    }
  }, [isOnline, syncQueueCount, isSyncing]);

  // Only show when syncing or have pending items
  if (isSyncing || syncQueueCount > 0) {
    return (
      <>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          title="Click to view sync progress"
        >
          <RefreshCw className="h-4 w-4 animate-spin text-primary-foreground/70" />
          {syncQueueCount > 0 && (
            <span className="text-xs text-primary-foreground/70">
              {syncQueueCount}
            </span>
          )}
        </button>
        <SyncProgressModal open={showModal} onOpenChange={setShowModal} />
      </>
    );
  }
  
  return null;
};
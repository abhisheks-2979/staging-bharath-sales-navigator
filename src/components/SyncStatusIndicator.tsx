import { useEffect, useState, memo, useCallback, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Cloud, CloudOff, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { useConnectivity } from "@/hooks/useConnectivity";
import { offlineStorage } from "@/lib/offlineStorage";
import { toast } from "@/hooks/use-toast";
import { SyncProgressModal } from "./SyncProgressModal";
import { useOfflineSync } from "@/hooks/useOfflineSync";

export const SyncStatusIndicator = memo(() => {
  const isOnline = useConnectivity() === 'online';
  const { processSyncQueue } = useOfflineSync();
  const [syncQueueCount, setSyncQueueCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncStatus, setLastSyncStatus] = useState<'success' | 'error' | null>(null);
  const [showModal, setShowModal] = useState(false);
  const mountedRef = useRef(true);

  // Check sync queue periodically - less frequently when nothing to sync
  useEffect(() => {
    mountedRef.current = true;
    
    const checkQueue = async () => {
      if (!mountedRef.current) return;
      try {
        const queue = await offlineStorage.getSyncQueue();
        if (mountedRef.current) {
          setSyncQueueCount(queue.length);
        }
      } catch (error) {
        console.error('Error checking sync queue:', error);
      }
    };
    
    checkQueue();
    // Check every 5 seconds instead of 2 - reduces CPU usage
    const interval = setInterval(checkQueue, 5000);

    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, []);

  // Monitor syncing status when coming online - SILENT mode
  useEffect(() => {
    const handleSync = async () => {
      if (isOnline && syncQueueCount > 0 && !isSyncing) {
        setIsSyncing(true);
        setLastSyncStatus(null);
        
        console.log(`🔄 SyncStatusIndicator: Starting silent sync of ${syncQueueCount} items...`);

        try {
          // Trigger sync process silently
          await processSyncQueue();
          
          // Wait for queue to update
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Check final queue status
          const queue = await offlineStorage.getSyncQueue();
          
          if (queue.length === 0) {
            console.log(`✅ SyncStatusIndicator: All items synced successfully (silent)`);
            setLastSyncStatus('success');
            setSyncQueueCount(0);
            
            // Clear success status after 3 seconds
            setTimeout(() => setLastSyncStatus(null), 3000);
          } else {
            console.log(`⚠️ SyncStatusIndicator: ${queue.length} items still pending (silent)`);
            setSyncQueueCount(queue.length);
            setLastSyncStatus('error');
          }
        } catch (error) {
          console.error(`❌ SyncStatusIndicator: Sync failed (silent):`, error);
          setLastSyncStatus('error');
        } finally {
          setIsSyncing(false);
        }
      }
    };
    
    // Trigger sync immediately when online and have items
    if (isOnline && syncQueueCount > 0 && !isSyncing) {
      handleSync();
    }
  }, [isOnline, syncQueueCount, isSyncing, processSyncQueue]);

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
});

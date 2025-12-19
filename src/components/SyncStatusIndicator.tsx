import { useEffect, useState, memo, useCallback, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Cloud, CloudOff, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { useConnectivity } from "@/hooks/useConnectivity";
import { offlineStorage, STORES } from "@/lib/offlineStorage";
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

  // ONE-TIME CLEANUP: Remove old stuck items from sync queue on app open
  useEffect(() => {
    const cleanupOldStuckItems = async () => {
      try {
        const queue = await offlineStorage.getSyncQueue();
        const oneHourAgo = Date.now() - 60 * 60 * 1000;
        
        // Find items to remove (stuck/old)
        const itemsToRemove = queue.filter((item: any) => {
          // Remove items that have failed 5+ times
          if (item.retryCount >= 5) return true;
          // Remove items older than 1 hour
          if (item.timestamp && item.timestamp < oneHourAgo) return true;
          return false;
        });
        
        // Delete stuck items
        for (const item of itemsToRemove) {
          await offlineStorage.delete(STORES.SYNC_QUEUE, item.id);
        }
        
        if (itemsToRemove.length > 0) {
          console.log(`🧹 [SyncStatusIndicator] Cleaned up ${itemsToRemove.length} old/stuck sync items`);
        }
      } catch (error) {
        console.error('Error cleaning up old sync items:', error);
      }
    };
    
    cleanupOldStuckItems();
  }, []); // Run only once on mount

  // Check sync queue periodically - only count ACTUAL pending items (not old/stuck ones)
  useEffect(() => {
    mountedRef.current = true;
    
    const checkQueue = async () => {
      if (!mountedRef.current) return;
      try {
        const queue = await offlineStorage.getSyncQueue();
        
        // Filter out old items (older than 1 hour) and items that failed 5+ times
        // These are stuck items that shouldn't show the sync indicator
        const oneHourAgo = Date.now() - 60 * 60 * 1000;
        const actualPendingItems = queue.filter((item: any) => {
          // Skip items that have failed 5+ times
          if (item.retryCount >= 5) return false;
          // Skip items older than 1 hour that haven't been synced
          if (item.timestamp && item.timestamp < oneHourAgo && !item._syncing) return false;
          return true;
        });
        
        if (mountedRef.current) {
          setSyncQueueCount(actualPendingItems.length);
        }
      } catch (error) {
        console.error('Error checking sync queue:', error);
      }
    };
    
    checkQueue();
    // Check every 3 seconds for faster response
    const interval = setInterval(checkQueue, 3000);

    // Listen for online event to trigger immediate sync check
    const handleOnline = () => {
      console.log('🌐 SyncStatusIndicator: Online detected, checking queue...');
      checkQueue();
    };
    
    window.addEventListener('online', handleOnline);

    return () => {
      mountedRef.current = false;
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  // Monitor syncing status when coming online - SILENT mode with aggressive retry
  useEffect(() => {
    let syncTimeout: NodeJS.Timeout | null = null;
    
    const handleSync = async () => {
      if (!mountedRef.current) return;
      if (isOnline && syncQueueCount > 0 && !isSyncing) {
        setIsSyncing(true);
        setLastSyncStatus(null);
        
        console.log(`🔄 SyncStatusIndicator: Starting sync of ${syncQueueCount} items...`);

        try {
          // Trigger sync process
          await processSyncQueue();
          
          // Wait for queue to update
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          if (!mountedRef.current) return;
          
          // Check final queue status
          const queue = await offlineStorage.getSyncQueue();
          const actualPending = queue.filter((item: any) => {
            if (item.retryCount >= 5) return false;
            return true;
          });
          
          if (actualPending.length === 0) {
            console.log(`✅ SyncStatusIndicator: All items synced successfully`);
            setLastSyncStatus('success');
            setSyncQueueCount(0);
            
            // Clear success status after 3 seconds
            setTimeout(() => {
              if (mountedRef.current) setLastSyncStatus(null);
            }, 3000);
          } else {
            console.log(`⚠️ SyncStatusIndicator: ${actualPending.length} items still pending`);
            setSyncQueueCount(actualPending.length);
            setLastSyncStatus('error');
            
            // Retry sync after 5 seconds for pending items
            syncTimeout = setTimeout(() => {
              if (mountedRef.current && isOnline) {
                console.log('🔄 Retrying sync for pending items...');
                processSyncQueue();
              }
            }, 5000);
          }
        } catch (error) {
          console.error(`❌ SyncStatusIndicator: Sync failed:`, error);
          if (mountedRef.current) setLastSyncStatus('error');
        } finally {
          if (mountedRef.current) setIsSyncing(false);
        }
      }
    };
    
    // Trigger sync immediately when online and have items
    if (isOnline && syncQueueCount > 0 && !isSyncing) {
      handleSync();
    }
    
    return () => {
      if (syncTimeout) clearTimeout(syncTimeout);
    };
  }, [isOnline, syncQueueCount, isSyncing, processSyncQueue]);

  // Only show when ACTIVELY syncing or have ACTUAL pending items (not stuck/old ones)
  // Don't show just because we checked the queue - only when there's real work to do
  if (isSyncing) {
    return (
      <>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          title="Syncing data..."
        >
          <RefreshCw className="h-4 w-4 animate-spin text-primary-foreground/70" />
          {syncQueueCount > 0 && (
            <span className="text-xs text-primary-foreground/70">{syncQueueCount}</span>
          )}
        </button>
        <SyncProgressModal open={showModal} onOpenChange={setShowModal} />
      </>
    );
  }
  
  // Show static indicator when there are actual pending items (both online and offline)
  if (syncQueueCount > 0) {
    return (
      <>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          title={isOnline ? `${syncQueueCount} items pending sync` : `${syncQueueCount} items waiting to sync when online`}
        >
          {isOnline ? (
            <Cloud className="h-4 w-4 text-primary-foreground/70" />
          ) : (
            <CloudOff className="h-4 w-4 text-yellow-400" />
          )}
          <span className="text-xs text-primary-foreground/70">{syncQueueCount}</span>
        </button>
        <SyncProgressModal open={showModal} onOpenChange={setShowModal} />
      </>
    );
  }
  
  // Don't show anything when queue is empty
  return null;
});

SyncStatusIndicator.displayName = 'SyncStatusIndicator';

import { useEffect, useState, memo, useCallback, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Cloud, CloudOff, RefreshCw, CheckCircle2, AlertCircle, Database } from "lucide-react";
import { useConnectivity } from "@/hooks/useConnectivity";
import { offlineStorage, STORES } from "@/lib/offlineStorage";
import { toast } from "@/hooks/use-toast";
import { SyncProgressModal } from "./SyncProgressModal";
import { CacheWarmingProgress, useCacheWarming } from "./CacheWarmingProgress";
import { useMasterDataCache } from "@/hooks/useMasterDataCache";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { useManagedInterval } from "@/utils/intervalManager";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export const SyncStatusIndicator = memo(() => {
  const isOnline = useConnectivity() === 'online';
  const { processSyncQueue } = useOfflineSync();
  const { warmCacheWithProgress } = useMasterDataCache();
  const [syncQueueCount, setSyncQueueCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncStatus, setLastSyncStatus] = useState<'success' | 'error' | null>(null);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const mountedRef = useRef(true);

  // Cache warming state
  const {
    isWarming,
    steps,
    currentStep,
    startWarming,
    updateStep,
    completeWarming,
    dismissWarming,
  } = useCacheWarming();

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

  // Check sync queue with managed interval (pauses when app is hidden)
  const checkQueue = useCallback(async () => {
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
  }, []);

  // Initial check and online listener
  useEffect(() => {
    mountedRef.current = true;
    checkQueue();

    // Listen for online event to trigger immediate sync check
    const handleOnline = () => {
      console.log('🌐 SyncStatusIndicator: Online detected, checking queue...');
      checkQueue();
    };

    // Listen for queue updates to trigger immediate sync check (when items are added while already online)
    const handleQueueUpdated = () => {
      console.log('📥 SyncStatusIndicator: Queue updated, checking queue...');
      checkQueue();
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('syncQueueUpdated', handleQueueUpdated);

    return () => {
      mountedRef.current = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('syncQueueUpdated', handleQueueUpdated);
    };
  }, [checkQueue]);

  // Use managed interval - reduced frequency from 3s to 5s
  useManagedInterval(
    'sync-status-check',
    checkQueue,
    5000, // Increased from 3s to 5s
    { runWhenHidden: false }
  );

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

  // Handle prepare offline data click
  const handlePrepareOfflineData = useCallback(() => {
    if (!isOnline) {
      toast({
        title: "You're offline",
        description: "Please connect to the internet to prepare offline data.",
        variant: "destructive"
      });
      return;
    }
    
    startWarming();
    warmCacheWithProgress((stepId, status) => {
      updateStep(stepId, status);
    });
  }, [isOnline, startWarming, warmCacheWithProgress, updateStep]);

  // Handle view sync queue click
  const handleViewSyncQueue = useCallback(() => {
    setShowSyncModal(true);
  }, []);

  // Render the dropdown menu trigger
  const renderTrigger = () => {
    if (isSyncing) {
      return (
        <button
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          title="Syncing data..."
        >
          <RefreshCw className="h-4 w-4 animate-spin text-primary-foreground/70" />
          {syncQueueCount > 0 && (
            <span className="text-xs text-primary-foreground/70">{syncQueueCount}</span>
          )}
        </button>
      );
    }
    
    if (syncQueueCount > 0) {
      return (
        <button
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
      );
    }
    
    // Always show sync icon for access to Prepare Offline Data
    return (
      <button
        className="flex items-center gap-1 hover:opacity-80 transition-opacity"
        title="Sync options"
      >
        <Database className="h-4 w-4 text-primary-foreground/70" />
      </button>
    );
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {renderTrigger()}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[200px]">
          <DropdownMenuItem onClick={handlePrepareOfflineData} disabled={!isOnline}>
            <Database className="h-4 w-4 mr-2 text-blue-500" />
            <span>Prepare Offline Data</span>
          </DropdownMenuItem>
          {syncQueueCount > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleViewSyncQueue}>
                <RefreshCw className="h-4 w-4 mr-2 text-green-500" />
                <span>View Sync Queue ({syncQueueCount})</span>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Sync Queue Modal */}
      <SyncProgressModal 
        open={showSyncModal} 
        onOpenChange={setShowSyncModal}
        onTriggerSync={processSyncQueue}
      />

      {/* Cache Warming Progress Modal */}
      <CacheWarmingProgress
        isOpen={isWarming}
        onComplete={completeWarming}
        onDismiss={dismissWarming}
        steps={steps}
        currentStep={currentStep}
        isOnline={isOnline}
      />
    </>
  );
});

SyncStatusIndicator.displayName = 'SyncStatusIndicator';

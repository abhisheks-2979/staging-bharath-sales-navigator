import { useEffect, useCallback } from 'react';
import { useConnectivity } from './useConnectivity';
import { offlineStorage, STORES } from '@/lib/offlineStorage';
import { toast } from '@/hooks/use-toast';

export function useOfflineSync() {
  const connectivityStatus = useConnectivity();

  // Process sync queue when coming back online
  const processSyncQueue = useCallback(async () => {
    if (connectivityStatus !== 'online') return;

    try {
      const syncQueue = await offlineStorage.getSyncQueue();
      
      if (syncQueue.length === 0) return;
      
      console.log(`Processing ${syncQueue.length} queued sync items`);

      let successCount = 0;
      let failCount = 0;

      for (const item of syncQueue) {
        try {
          // Process each sync item based on action type
          await processSyncItem(item);
          // Remove from queue after successful sync
          await offlineStorage.delete(STORES.SYNC_QUEUE, item.id);
          successCount++;
        } catch (error) {
          console.error('Failed to sync item:', item, error);
          failCount++;
          // Optionally implement retry logic here
        }
      }

      // Show summary toast
      if (successCount > 0) {
        toast({
          title: "Sync Complete",
          description: `${successCount} ${successCount === 1 ? 'item' : 'items'} synced successfully${failCount > 0 ? `, ${failCount} failed` : ''}`,
        });
      }
      
      if (failCount > 0 && successCount === 0) {
        toast({
          title: "Sync Failed",
          description: `${failCount} ${failCount === 1 ? 'item' : 'items'} failed to sync`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error processing sync queue:', error);
    }
  }, [connectivityStatus]);

  // Process individual sync items
  const processSyncItem = async (item: any) => {
    const { action, data } = item;
    
    switch (action) {
      case 'CREATE_ORDER':
        // Implement order creation API call
        console.log('Syncing order creation:', data);
        // await createOrderAPI(data);
        break;
        
      case 'UPDATE_ORDER':
        // Implement order update API call
        console.log('Syncing order update:', data);
        // await updateOrderAPI(data);
        break;
        
      case 'CREATE_VISIT':
        // Implement visit creation API call
        console.log('Syncing visit creation:', data);
        // await createVisitAPI(data);
        break;
        
      default:
        console.warn('Unknown sync action:', action);
    }
  };

  // Save data with offline support
  const saveWithOfflineSupport = useCallback(async (
    storeName: string, 
    data: any, 
    syncAction?: string
  ) => {
    try {
      // Always save to IndexedDB first
      await offlineStorage.save(storeName, data);
      
      // If online, try to sync to server
      if (connectivityStatus === 'online' && syncAction) {
        try {
          await processSyncItem({ action: syncAction, data });
        } catch (error) {
          // If server sync fails, add to sync queue
          await offlineStorage.addToSyncQueue(syncAction, data);
          toast({
            title: "Saved Offline",
            description: "Changes will sync when online",
          });
        }
      } else if (syncAction) {
        // If offline, add to sync queue
        await offlineStorage.addToSyncQueue(syncAction, data);
        toast({
          title: "Saved Offline",
          description: "Changes queued for sync",
        });
      }
    } catch (error) {
      console.error('Error saving with offline support:', error);
      throw error;
    }
  }, [connectivityStatus]);

  // Auto-sync when connectivity is restored
  useEffect(() => {
    if (connectivityStatus === 'online') {
      processSyncQueue();
    }
  }, [connectivityStatus, processSyncQueue]);

  return {
    connectivityStatus,
    saveWithOfflineSupport,
    processSyncQueue,
    isOnline: connectivityStatus === 'online',
    isOffline: connectivityStatus === 'offline',
    isUnknown: connectivityStatus === 'unknown'
  };
}
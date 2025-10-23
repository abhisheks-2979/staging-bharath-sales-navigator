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
    
    // Import supabase client dynamically to avoid circular dependencies
    const { supabase } = await import('@/integrations/supabase/client');
    
    switch (action) {
      case 'CREATE_ORDER':
        console.log('Syncing order creation:', data);
        const { error: orderError } = await supabase
          .from('orders')
          .insert(data);
        if (orderError) throw orderError;
        break;
        
      case 'UPDATE_ORDER':
        console.log('Syncing order update:', data);
        const { error: updateOrderError } = await supabase
          .from('orders')
          .update(data.updates)
          .eq('id', data.id);
        if (updateOrderError) throw updateOrderError;
        break;
        
      case 'CREATE_VISIT':
      case 'CHECK_IN':
        console.log('Syncing visit/check-in:', data);
        const { error: visitError } = await supabase
          .from('visits')
          .insert(data);
        if (visitError) throw visitError;
        break;
        
      case 'CHECK_OUT':
        console.log('Syncing check-out:', data);
        const { error: checkoutError } = await supabase
          .from('visits')
          .update({
            check_out_time: data.check_out_time,
            check_out_location: data.check_out_location,
            check_out_photo_url: data.check_out_photo_url,
            check_out_address: data.check_out_address,
            location_match_out: data.location_match_out,
            status: 'completed'
          })
          .eq('id', data.visit_id);
        if (checkoutError) throw checkoutError;
        break;
        
      case 'CREATE_STOCK':
        console.log('Syncing stock creation:', data);
        const { error: stockError } = await supabase
          .from('stock')
          .insert(data);
        if (stockError) throw stockError;
        break;
        
      case 'UPDATE_STOCK':
        console.log('Syncing stock update:', data);
        const { error: updateStockError } = await supabase
          .from('stock')
          .update(data.updates)
          .eq('id', data.id);
        if (updateStockError) throw updateStockError;
        break;
        
      case 'CREATE_RETAILER':
        console.log('Syncing retailer creation:', data);
        const { error: retailerError } = await supabase
          .from('retailers')
          .insert(data);
        if (retailerError) throw retailerError;
        break;
        
      case 'UPDATE_RETAILER':
        console.log('Syncing retailer update:', data);
        const { error: updateRetailerError } = await supabase
          .from('retailers')
          .update(data.updates)
          .eq('id', data.id);
        if (updateRetailerError) throw updateRetailerError;
        break;
        
      case 'CREATE_ATTENDANCE':
        console.log('Syncing attendance check-in:', data);
        const { error: attendanceError } = await supabase
          .from('attendance')
          .insert(data);
        if (attendanceError) throw attendanceError;
        break;
        
      case 'UPDATE_ATTENDANCE':
        console.log('Syncing attendance check-out:', data);
        const { error: updateAttendanceError } = await supabase
          .from('attendance')
          .update(data.updates)
          .eq('id', data.id);
        if (updateAttendanceError) throw updateAttendanceError;
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
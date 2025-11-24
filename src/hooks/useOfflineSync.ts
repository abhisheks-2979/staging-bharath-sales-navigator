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
        } catch (error: any) {
          const errorMsg = error?.message || error?.toString() || 'Unknown error';
          const errorCode = error?.code || '';
          console.error(`Failed to sync ${item.action}:`, {
            action: item.action,
            error: errorMsg,
            code: errorCode,
            details: error,
            item: item
          });
          failCount++;
          
          // Keep item in queue for retry but log the error
          // Don't remove failed items so they can be retried
        }
      }

      // Show summary toast
      if (successCount > 0 && failCount === 0) {
        toast({
          title: "Sync Complete",
          description: `${successCount} ${successCount === 1 ? 'item' : 'items'} synced successfully`,
        });
      } else if (failCount > 0) {
        toast({
          title: "Sync Issues",
          description: `${successCount} succeeded, ${failCount} failed. Will retry automatically.`,
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
        // Handle both old format (single data) and new format (order + items)
        if (data.order && data.items) {
          // New format with separate order and items
          const { error: orderError } = await supabase
            .from('orders')
            .insert(data.order);
          if (orderError) throw orderError;
          
          const { error: itemsError } = await supabase
            .from('order_items')
            .insert(data.items);
          if (itemsError) throw itemsError;
        } else {
          // Old format - just the order data
          const { error: orderError } = await supabase
            .from('orders')
            .insert(data);
          if (orderError) throw orderError;
        }
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
        
      case 'CREATE_BEAT':
        console.log('Syncing beat creation:', data);
        const { error: beatError } = await supabase
          .from('beats')
          .insert(data);
        if (beatError) throw beatError;
        break;
        
      case 'UPDATE_BEAT':
        console.log('Syncing beat update:', data);
        const { error: updateBeatError } = await supabase
          .from('beats')
          .update(data.updates)
          .eq('id', data.id);
        if (updateBeatError) throw updateBeatError;
        break;
        
      case 'CREATE_BEAT_PLAN':
        console.log('Syncing beat plan creation:', data);
        const { error: beatPlanError } = await supabase
          .from('beat_plans')
          .insert(data);
        if (beatPlanError) throw beatPlanError;
        break;
        
      case 'DELETE_RETAILER':
        console.log('Syncing retailer deletion:', data);
        const { error: deleteRetailerError } = await supabase
          .from('retailers')
          .delete()
          .eq('id', data.id);
        if (deleteRetailerError) throw deleteRetailerError;
        break;
        
      case 'DELETE_BEAT':
        console.log('Syncing beat deletion:', data);
        const { error: deleteBeatError } = await supabase
          .from('beats')
          .delete()
          .eq('id', data.id);
        if (deleteBeatError) throw deleteBeatError;
        break;
        
      case 'UPDATE_BEAT_PLAN':
        console.log('Syncing beat plan update:', data);
        const { error: updateBeatPlanError } = await supabase
          .from('beat_plans')
          .update(data.updates)
          .eq('id', data.id);
        if (updateBeatPlanError) throw updateBeatPlanError;
        break;
        
      case 'NO_ORDER':
        console.log('Syncing no order visit:', data);
        const { error: noOrderError } = await supabase
          .from('visits')
          .update({
            status: 'no_order',
            no_order_reason: data.reason,
            notes: data.notes,
            visit_date: data.visit_date
          })
          .eq('id', data.visit_id);
        if (noOrderError) throw noOrderError;
        break;
        
      case 'CREATE_COMPETITION_DATA':
        console.log('Syncing competition data:', data);
        const { error: competitionError } = await supabase
          .from('competition_data')
          .insert(data);
        if (competitionError) throw competitionError;
        break;
        
      case 'CREATE_RETURN_STOCK':
        console.log('Syncing return stock:', data);
        // Return stock is typically part of orders table or a separate returns table
        // Update this based on your schema
        const { error: returnStockError } = await supabase
          .from('orders')
          .insert({
            ...data,
            order_type: 'return'
          });
        if (returnStockError) throw returnStockError;
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

  // Auto-sync when connectivity is restored and cleanup old data
  useEffect(() => {
    if (connectivityStatus === 'online') {
      processSyncQueue();
      
      // Clean up old synced items (older than 3 days) after successful sync
      const cleanupOldData = async () => {
        try {
          await offlineStorage.deleteOldSyncedItems();
          console.log('Old synced data cleaned up successfully');
        } catch (error) {
          console.error('Error cleaning up old data:', error);
        }
      };
      
      // Run cleanup after a short delay to let sync complete
      setTimeout(cleanupOldData, 5000);
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
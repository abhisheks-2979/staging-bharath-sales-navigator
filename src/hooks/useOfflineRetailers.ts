import { useState, useCallback } from 'react';
import { offlineStorage, STORES } from '@/lib/offlineStorage';
import { supabase } from '@/integrations/supabase/client';
import { useConnectivity } from './useConnectivity';
import { toast } from './use-toast';

/**
 * Hook for managing retailers with offline support
 */
export function useOfflineRetailers() {
  const connectivityStatus = useConnectivity();
  const isOnline = connectivityStatus === 'online';
  const [loading, setLoading] = useState(false);

  /**
   * Create retailer with offline support
   */
  const createRetailer = useCallback(async (retailerData: any) => {
    try {
      setLoading(true);

      if (isOnline) {
        // Online: Submit directly
        const { data, error } = await supabase
          .from('retailers')
          .insert(retailerData)
          .select()
          .single();

        if (error) throw error;

        // Cache the new retailer
        await offlineStorage.save(STORES.RETAILERS, data);

        toast({
          title: "Retailer Created",
          description: "Retailer has been created successfully.",
        });

        return { success: true, offline: false, data };
      } else {
        // Offline: Queue for sync
        const offlineRetailer = {
          ...retailerData,
          id: crypto.randomUUID(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        await offlineStorage.save(STORES.RETAILERS, offlineRetailer);
        await offlineStorage.addToSyncQueue('CREATE_RETAILER', offlineRetailer);

        toast({
          title: "Retailer Saved Offline",
          description: "Retailer will be created when you're back online.",
        });

        return { success: true, offline: true, data: offlineRetailer };
      }
    } catch (error: any) {
      console.error('Error creating retailer:', error);
      toast({
        title: "Failed to Create Retailer",
        description: error.message || "Failed to create retailer",
        variant: "destructive",
      });
      return { success: false, offline: false, data: null };
    } finally {
      setLoading(false);
    }
  }, [isOnline]);

  /**
   * Update retailer with offline support
   */
  const updateRetailer = useCallback(async (retailerId: string, updates: any) => {
    try {
      setLoading(true);

      if (isOnline) {
        // Online: Update directly
        const { data, error } = await supabase
          .from('retailers')
          .update(updates)
          .eq('id', retailerId)
          .select()
          .single();

        if (error) throw error;

        // Update cache
        await offlineStorage.save(STORES.RETAILERS, data);

        toast({
          title: "Retailer Updated",
          description: "Retailer has been updated successfully.",
        });

        return { success: true, offline: false, data };
      } else {
        // Offline: Queue for sync
        const cachedRetailer = await offlineStorage.getById(STORES.RETAILERS, retailerId);
        
        if (!cachedRetailer) {
          throw new Error('Retailer not found in offline storage');
        }
        
        const updatedRetailer = {
          ...(cachedRetailer as any),
          ...updates,
          updated_at: new Date().toISOString()
        };

        await offlineStorage.save(STORES.RETAILERS, updatedRetailer);
        await offlineStorage.addToSyncQueue('UPDATE_RETAILER', {
          id: retailerId,
          updates: {
            ...updates,
            updated_at: new Date().toISOString()
          }
        });

        toast({
          title: "Retailer Updated Offline",
          description: "Changes will sync when you're back online.",
        });

        return { success: true, offline: true, data: updatedRetailer };
      }
    } catch (error: any) {
      console.error('Error updating retailer:', error);
      toast({
        title: "Failed to Update Retailer",
        description: error.message || "Failed to update retailer",
        variant: "destructive",
      });
      return { success: false, offline: false, data: null };
    } finally {
      setLoading(false);
    }
  }, [isOnline]);

  /**
   * Get all retailers (from cache or server)
   */
  const getAllRetailers = useCallback(async () => {
    try {
      setLoading(true);

      if (isOnline) {
        // Online: Fetch from server and cache
        const { data, error } = await supabase
          .from('retailers')
          .select('*')
          .order('name');

        if (error) throw error;

        // Update cache
        if (data) {
          for (const retailer of data) {
            await offlineStorage.save(STORES.RETAILERS, retailer);
          }
        }

        return { success: true, data: data || [] };
      } else {
        // Offline: Load from cache
        const cachedRetailers = await offlineStorage.getAll(STORES.RETAILERS);
        return { success: true, data: cachedRetailers || [] };
      }
    } catch (error: any) {
      console.error('Error fetching retailers:', error);
      
      // Try cache on error
      const cachedRetailers = await offlineStorage.getAll(STORES.RETAILERS);
      return { success: true, data: cachedRetailers || [] };
    } finally {
      setLoading(false);
    }
  }, [isOnline]);

  /**
   * Get retailer by ID (from cache or server)
   */
  const getRetailerById = useCallback(async (retailerId: string) => {
    try {
      if (isOnline) {
        // Online: Fetch from server
        const { data, error } = await supabase
          .from('retailers')
          .select('*')
          .eq('id', retailerId)
          .single();

        if (error) throw error;

        // Update cache
        if (data) {
          await offlineStorage.save(STORES.RETAILERS, data);
        }

        return { success: true, data };
      } else {
        // Offline: Load from cache
        const cachedRetailer = await offlineStorage.getById(STORES.RETAILERS, retailerId);
        return { success: true, data: cachedRetailer };
      }
    } catch (error: any) {
      console.error('Error fetching retailer:', error);
      
      // Try cache on error
      const cachedRetailer = await offlineStorage.getById(STORES.RETAILERS, retailerId);
      return { success: true, data: cachedRetailer };
    }
  }, [isOnline]);

  return {
    createRetailer,
    updateRetailer,
    getAllRetailers,
    getRetailerById,
    loading,
    isOnline
  };
}

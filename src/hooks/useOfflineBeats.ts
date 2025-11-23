import { useState, useCallback } from 'react';
import { offlineStorage, STORES } from '@/lib/offlineStorage';
import { supabase } from '@/integrations/supabase/client';
import { useConnectivity } from './useConnectivity';
import { toast } from './use-toast';

/**
 * Hook for managing beats with offline support
 */
export function useOfflineBeats() {
  const connectivityStatus = useConnectivity();
  const isOnline = connectivityStatus === 'online';
  const [loading, setLoading] = useState(false);

  /**
   * Create beat with offline support
   */
  const createBeat = useCallback(async (beatData: any) => {
    try {
      setLoading(true);

      if (isOnline) {
        // Online: Submit directly
        const { data, error } = await supabase
          .from('beats')
          .insert(beatData)
          .select()
          .single();

        if (error) throw error;

        // Cache the new beat
        await offlineStorage.save(STORES.BEATS, data);

        toast({
          title: "Beat Created",
          description: "Beat has been created successfully.",
        });

        return { success: true, offline: false, data };
      } else {
        // Offline: Queue for sync
        const offlineBeat = {
          ...beatData,
          id: crypto.randomUUID(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        await offlineStorage.save(STORES.BEATS, offlineBeat);
        await offlineStorage.addToSyncQueue('CREATE_BEAT', offlineBeat);

        toast({
          title: "Beat Saved Offline",
          description: "Beat will be created when you're back online.",
        });

        return { success: true, offline: true, data: offlineBeat };
      }
    } catch (error: any) {
      console.error('Error creating beat:', error);
      toast({
        title: "Failed to Create Beat",
        description: error.message || "Failed to create beat",
        variant: "destructive",
      });
      return { success: false, offline: false, data: null };
    } finally {
      setLoading(false);
    }
  }, [isOnline]);

  /**
   * Update beat with offline support
   */
  const updateBeat = useCallback(async (beatId: string, updates: any) => {
    try {
      setLoading(true);

      if (isOnline) {
        // Online: Update directly
        const { data, error } = await supabase
          .from('beats')
          .update(updates)
          .eq('id', beatId)
          .select()
          .single();

        if (error) throw error;

        // Update cache
        await offlineStorage.save(STORES.BEATS, data);

        toast({
          title: "Beat Updated",
          description: "Beat has been updated successfully.",
        });

        return { success: true, offline: false, data };
      } else {
        // Offline: Queue for sync
        const cachedBeat = await offlineStorage.getById(STORES.BEATS, beatId);
        
        if (!cachedBeat) {
          throw new Error('Beat not found in offline storage');
        }
        
        const updatedBeat = {
          ...(cachedBeat as any),
          ...updates,
          updated_at: new Date().toISOString()
        };

        await offlineStorage.save(STORES.BEATS, updatedBeat);
        await offlineStorage.addToSyncQueue('UPDATE_BEAT', {
          id: beatId,
          updates: {
            ...updates,
            updated_at: new Date().toISOString()
          }
        });

        toast({
          title: "Beat Updated Offline",
          description: "Changes will sync when you're back online.",
        });

        return { success: true, offline: true, data: updatedBeat };
      }
    } catch (error: any) {
      console.error('Error updating beat:', error);
      toast({
        title: "Failed to Update Beat",
        description: error.message || "Failed to update beat",
        variant: "destructive",
      });
      return { success: false, offline: false, data: null };
    } finally {
      setLoading(false);
    }
  }, [isOnline]);

  /**
   * Get all beats (from cache or server)
   */
  const getAllBeats = useCallback(async () => {
    try {
      setLoading(true);

      if (isOnline) {
        // Online: Fetch from server and cache
        const { data, error } = await supabase
          .from('beats')
          .select('*')
          .eq('is_active', true)
          .order('beat_name');

        if (error) throw error;

        // Update cache
        if (data) {
          for (const beat of data) {
            await offlineStorage.save(STORES.BEATS, beat);
          }
        }

        return { success: true, data: data || [] };
      } else {
        // Offline: Load from cache
        const cachedBeats = await offlineStorage.getAll(STORES.BEATS);
        return { success: true, data: cachedBeats || [] };
      }
    } catch (error: any) {
      console.error('Error fetching beats:', error);
      
      // Try cache on error
      const cachedBeats = await offlineStorage.getAll(STORES.BEATS);
      return { success: true, data: cachedBeats || [] };
    } finally {
      setLoading(false);
    }
  }, [isOnline]);

  return {
    createBeat,
    updateBeat,
    getAllBeats,
    loading,
    isOnline
  };
}

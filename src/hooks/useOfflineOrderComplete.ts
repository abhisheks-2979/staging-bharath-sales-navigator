import { useState, useEffect, useCallback } from 'react';
import { offlineStorage, STORES } from '@/lib/offlineStorage';
import { supabase } from '@/integrations/supabase/client';
import { useConnectivity } from './useConnectivity';
import { toast } from './use-toast';

/**
 * Comprehensive offline order entry hook
 * Handles products, retailers, beats, competition data, and order submission offline
 */
export function useOfflineOrderComplete() {
  const connectivityStatus = useConnectivity();
  const isOnline = connectivityStatus === 'online';
  
  const [products, setProducts] = useState<any[]>([]);
  const [retailers, setRetailers] = useState<any[]>([]);
  const [beats, setBeats] = useState<any[]>([]);
  const [competitors, setCompetitors] = useState<any[]>([]);
  const [competitionSkus, setCompetitionSkus] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  /**
   * Load all cached data on mount
   */
  const loadCachedData = useCallback(async () => {
    try {
      console.log('📦 Loading cached data for offline use...');
      
      const [
        cachedProducts,
        cachedVariants,
        cachedSchemes,
        cachedCategories,
        cachedRetailers,
        cachedBeats,
        cachedCompetitors,
        cachedCompetitionSkus
      ] = await Promise.all([
        offlineStorage.getAll(STORES.PRODUCTS),
        offlineStorage.getAll(STORES.VARIANTS),
        offlineStorage.getAll(STORES.SCHEMES),
        offlineStorage.getAll(STORES.CATEGORIES),
        offlineStorage.getAll(STORES.RETAILERS),
        offlineStorage.getAll(STORES.BEATS),
        offlineStorage.getAll(STORES.COMPETITION_MASTER),
        offlineStorage.getAll(STORES.COMPETITION_SKUS)
      ]);

      // Enrich products with their variants and schemes
      const enrichedProducts = (cachedProducts || []).map((product: any) => ({
        ...product,
        variants: (cachedVariants || []).filter((v: any) => v.product_id === product.id),
        schemes: (cachedSchemes || []).filter((s: any) => s.product_id === product.id),
        category: (cachedCategories || []).find((c: any) => c.id === product.category_id)
      }));

      setProducts(enrichedProducts);
      setRetailers(cachedRetailers || []);
      setBeats(cachedBeats || []);
      setCompetitors(cachedCompetitors || []);
      setCompetitionSkus(cachedCompetitionSkus || []);

      console.log('✅ Cached data loaded:', {
        products: enrichedProducts.length,
        retailers: (cachedRetailers || []).length,
        beats: (cachedBeats || []).length,
        competitors: (cachedCompetitors || []).length,
        competitionSkus: (cachedCompetitionSkus || []).length
      });

      setLoading(false);
    } catch (error) {
      console.error('Error loading cached data:', error);
      setLoading(false);
    }
  }, []);

  /**
   * Sync data from server when online
   */
  const syncFromServer = useCallback(async () => {
    if (!isOnline) return;

    try {
      console.log('🔄 Syncing data from server...');

      // Fetch products with related data
      const { data: productsData } = await supabase
        .from('products')
        .select(`
          *,
          category:product_categories(*)
        `)
        .eq('is_active', true);

      const { data: variantsData } = await supabase
        .from('product_variants')
        .select('*')
        .eq('is_active', true);

      const { data: schemesData } = await supabase
        .from('product_schemes')
        .select('*')
        .eq('is_active', true);

      const { data: categoriesData } = await supabase
        .from('product_categories')
        .select('*');

      const { data: retailersData } = await supabase
        .from('retailers')
        .select('*');

      const { data: beatsData } = await supabase
        .from('beats')
        .select('*')
        .eq('is_active', true);

      const { data: competitorsData } = await supabase
        .from('competition_master')
        .select('*');

      const { data: competitionSkusData } = await supabase
        .from('competition_skus')
        .select('*')
        .eq('is_active', true);

      // Cache everything to IndexedDB
      if (productsData) {
        for (const product of productsData) {
          await offlineStorage.save(STORES.PRODUCTS, product);
        }
      }

      if (variantsData) {
        for (const variant of variantsData) {
          await offlineStorage.save(STORES.VARIANTS, variant);
        }
      }

      if (schemesData) {
        for (const scheme of schemesData) {
          await offlineStorage.save(STORES.SCHEMES, scheme);
        }
      }

      if (categoriesData) {
        for (const category of categoriesData) {
          await offlineStorage.save(STORES.CATEGORIES, category);
        }
      }

      if (retailersData) {
        for (const retailer of retailersData) {
          await offlineStorage.save(STORES.RETAILERS, retailer);
        }
      }

      if (beatsData) {
        for (const beat of beatsData) {
          await offlineStorage.save(STORES.BEATS, beat);
        }
      }

      if (competitorsData) {
        for (const competitor of competitorsData) {
          await offlineStorage.save(STORES.COMPETITION_MASTER, competitor);
        }
      }

      if (competitionSkusData) {
        for (const sku of competitionSkusData) {
          await offlineStorage.save(STORES.COMPETITION_SKUS, sku);
        }
      }

      // Reload cached data to update UI
      await loadCachedData();

      console.log('✅ Data synced successfully');
    } catch (error) {
      console.error('Error syncing from server:', error);
    }
  }, [isOnline, loadCachedData]);

  /**
   * Submit order with offline support
   */
  const submitOrder = useCallback(async (orderData: any, orderItems: any[]) => {
    try {
      if (isOnline) {
        // Online: Submit directly to Supabase
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .insert(orderData)
          .select()
          .single();

        if (orderError) throw orderError;

        const itemsWithOrderId = orderItems.map(item => ({
          ...item,
          order_id: order.id
        }));

        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(itemsWithOrderId);

        if (itemsError) throw itemsError;

        // Update visit status to 'productive' if visit_id exists
        if (orderData.visit_id) {
          const { error: visitError } = await supabase
            .from('visits')
            .update({ status: 'productive' })
            .eq('id', orderData.visit_id);
          
          if (visitError) {
            console.error('Error updating visit status:', visitError);
          } else {
            console.log('✅ Visit status updated to productive for visit:', orderData.visit_id);
          }
        }

        toast({
          title: "Order Submitted",
          description: "Your order has been submitted successfully.",
        });

        // Trigger visit status refresh
        window.dispatchEvent(new CustomEvent('visitStatusChanged', {
          detail: { visitId: orderData.visit_id, status: 'productive', retailerId: orderData.retailer_id }
        }));
        // Also trigger data refresh for progress updates
        window.dispatchEvent(new Event('visitDataChanged'));

        return { success: true, offline: false, order };
      } else {
        // Offline: Queue for sync
        const orderId = crypto.randomUUID();
        const offlineOrder = {
          ...orderData,
          id: orderId,
          created_at: new Date().toISOString(),
          order_date: new Date().toISOString().split('T')[0]
        };

        const offlineItems = orderItems.map(item => ({
          ...item,
          id: crypto.randomUUID(),
          order_id: orderId
        }));

        // Save to offline storage
        await offlineStorage.save(STORES.ORDERS, { 
          ...offlineOrder, 
          items: offlineItems 
        });

        // Update visit status in offline cache to 'productive'
        if (orderData.visit_id) {
          const cachedVisits = await offlineStorage.getAll<any>(STORES.VISITS);
          const visitToUpdate = cachedVisits.find((v: any) => v.id === orderData.visit_id);
          
          if (visitToUpdate) {
            const updatedVisit = { ...visitToUpdate, status: 'productive' };
            await offlineStorage.save(STORES.VISITS, updatedVisit);
            console.log('✅ Visit status updated to productive in offline cache:', orderData.visit_id);
          }
        }

        // Queue for sync
        await offlineStorage.addToSyncQueue('CREATE_ORDER', {
          order: offlineOrder,
          items: offlineItems,
          visitId: orderData.visit_id // Include visitId for visit status update during sync
        });

        toast({
          title: "Order Saved Offline",
          description: "Your order will be submitted when you're back online.",
          variant: "default",
        });

        // Trigger visit status refresh
        window.dispatchEvent(new CustomEvent('visitStatusChanged', {
          detail: { visitId: orderData.visit_id, status: 'productive', retailerId: orderData.retailer_id }
        }));
        // Also trigger data refresh for progress updates
        window.dispatchEvent(new Event('visitDataChanged'));

        return { success: true, offline: true, order: offlineOrder };
      }
    } catch (error: any) {
      console.error('Error submitting order:', error);
      toast({
        title: "Order Submission Failed",
        description: error.message || "Failed to submit order",
        variant: "destructive",
      });
      return { success: false, offline: false, order: null };
    }
  }, [isOnline]);

  /**
   * Save competition data with offline support
   */
  const saveCompetitionData = useCallback(async (competitionData: any) => {
    try {
      if (isOnline) {
        // Online: Submit directly
        const { data, error } = await supabase
          .from('competition_data')
          .insert(competitionData)
          .select()
          .single();

        if (error) throw error;

        toast({
          title: "Competition Data Saved",
          description: "Competition data has been saved successfully.",
        });

        return { success: true, offline: false, data };
      } else {
        // Offline: Queue for sync
        const offlineData = {
          ...competitionData,
          id: crypto.randomUUID(),
          created_at: new Date().toISOString()
        };

        await offlineStorage.save(STORES.COMPETITION_DATA, offlineData);
        await offlineStorage.addToSyncQueue('CREATE_COMPETITION_DATA', offlineData);

        toast({
          title: "Competition Data Saved Offline",
          description: "Data will be synced when you're back online.",
        });

        return { success: true, offline: true, data: offlineData };
      }
    } catch (error: any) {
      console.error('Error saving competition data:', error);
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save competition data",
        variant: "destructive",
      });
      return { success: false, offline: false, data: null };
    }
  }, [isOnline]);

  // Load cached data on mount
  useEffect(() => {
    loadCachedData();
  }, [loadCachedData]);

  // Sync from server when coming online
  useEffect(() => {
    if (isOnline) {
      syncFromServer();
    }
  }, [isOnline, syncFromServer]);

  return {
    products,
    retailers,
    beats,
    competitors,
    competitionSkus,
    loading,
    isOnline,
    submitOrder,
    saveCompetitionData,
    syncFromServer,
    loadCachedData
  };
}

import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { offlineStorage, STORES } from '@/lib/offlineStorage';
import { useConnectivity } from './useConnectivity';
import { useAuth } from './useAuth';

/**
 * Hook to cache master data (products, beats, retailers, categories, schemes)
 * for offline access. Automatically syncs when online.
 */
export function useMasterDataCache() {
  const connectivityStatus = useConnectivity();
  const isOnline = connectivityStatus === 'online';
  const { user } = useAuth();

  // Cache products and related data
  const cacheProducts = useCallback(async () => {
    try {
      console.log('Caching products...');
      
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true);

      if (productsError) throw productsError;

      // Save each product to IndexedDB
      if (products) {
        for (const product of products) {
          await offlineStorage.save(STORES.PRODUCTS, product);
        }
        console.log(`Cached ${products.length} products`);
      }

      // Cache variants
      const { data: variants } = await supabase
        .from('product_variants')
        .select('*');

      if (variants) {
        for (const variant of variants) {
          await offlineStorage.save(STORES.VARIANTS, variant);
        }
        console.log(`Cached ${variants.length} variants`);
      }

      // Cache schemes
      const { data: schemes } = await supabase
        .from('product_schemes')
        .select('*');

      if (schemes) {
        for (const scheme of schemes) {
          await offlineStorage.save(STORES.SCHEMES, scheme);
        }
        console.log(`Cached ${schemes.length} schemes`);
      }

      // Cache categories
      const { data: categories } = await supabase
        .from('product_categories')
        .select('*');

      if (categories) {
        for (const category of categories) {
          await offlineStorage.save(STORES.CATEGORIES, category);
        }
        console.log(`Cached ${categories.length} categories`);
      }

      // Store last cache timestamp
      localStorage.setItem('master_data_cached_at', Date.now().toString());
    } catch (error) {
      console.error('Error caching products:', error);
    }
  }, []);

  // Cache beats
  const cacheBeats = useCallback(async () => {
    try {
      console.log('Caching beats...');
      
      const { data: beats, error } = await supabase
        .from('beats')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;

      if (beats) {
        for (const beat of beats) {
          await offlineStorage.save(STORES.BEATS, beat);
        }
        console.log(`Cached ${beats.length} beats`);
      }
    } catch (error) {
      console.error('Error caching beats:', error);
    }
  }, []);

  // Cache retailers
  const cacheRetailers = useCallback(async () => {
    try {
      console.log('Caching retailers...');
      
      const { data: retailers, error } = await supabase
        .from('retailers')
        .select('*');

      if (error) throw error;

      if (retailers) {
        for (const retailer of retailers) {
          await offlineStorage.save(STORES.RETAILERS, retailer);
        }
        console.log(`Cached ${retailers.length} retailers`);
      }
    } catch (error) {
      console.error('Error caching retailers:', error);
    }
  }, []);

  // Cache beat plans for the current week
  const cacheBeatPlans = useCallback(async () => {
    if (!user) return;
    
    try {
      console.log('Caching beat plans...');
      
      // Get current week's beat plans
      const today = new Date();
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - 7); // Last 7 days
      const weekEnd = new Date(today);
      weekEnd.setDate(today.getDate() + 7); // Next 7 days
      
      const { data: beatPlans, error } = await supabase
        .from('beat_plans')
        .select('*')
        .eq('user_id', user.id)
        .gte('plan_date', weekStart.toISOString().split('T')[0])
        .lte('plan_date', weekEnd.toISOString().split('T')[0]);

      if (error) throw error;

      if (beatPlans) {
        for (const plan of beatPlans) {
          await offlineStorage.save(STORES.BEAT_PLANS, plan);
        }
        console.log(`Cached ${beatPlans.length} beat plans`);
      }
    } catch (error) {
      console.error('Error caching beat plans:', error);
    }
  }, [user]);

  // Cache all master data
  const cacheAllMasterData = useCallback(async () => {
    if (!isOnline) {
      console.log('Offline - skipping master data cache update');
      return;
    }

    try {
      await Promise.all([
        cacheProducts(),
        cacheBeats(),
        cacheRetailers(),
        cacheBeatPlans()
      ]);
      console.log('✅ All master data cached successfully');
    } catch (error) {
      console.error('Error caching master data:', error);
    }
  }, [isOnline, cacheProducts, cacheBeats, cacheRetailers, cacheBeatPlans]);

  // Load cached data (used when offline)
  const loadCachedData = useCallback(async (storeName: string) => {
    try {
      const data = await offlineStorage.getAll(storeName);
      return data;
    } catch (error) {
      console.error(`Error loading cached data from ${storeName}:`, error);
      return [];
    }
  }, []);

  // Auto-cache when coming online OR on first mount
  useEffect(() => {
    // Check if we need to refresh cache (every 6 hours) or if never cached
    const lastCached = localStorage.getItem('master_data_cached_at');
    const sixHoursAgo = Date.now() - (6 * 60 * 60 * 1000);
    
    if (isOnline) {
      if (!lastCached || parseInt(lastCached) < sixHoursAgo) {
        console.log('Master data cache expired or missing, refreshing...');
        cacheAllMasterData();
      }
    } else if (!lastCached) {
      // If offline and never cached, show a warning
      console.warn('⚠️ App is offline and no cached data available. Please connect online first.');
    }
  }, [isOnline, cacheAllMasterData]);

  return {
    cacheProducts,
    cacheBeats,
    cacheRetailers,
    cacheBeatPlans,
    cacheAllMasterData,
    loadCachedData,
    isOnline
  };
}

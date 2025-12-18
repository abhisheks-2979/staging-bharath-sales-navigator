import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { offlineStorage, STORES } from '@/lib/offlineStorage';
import { useConnectivity } from './useConnectivity';
import { useAuth } from './useAuth';

// Progress callback type for cache warming UI
export type CacheProgressCallback = (stepId: string, status: 'loading' | 'done' | 'error') => void;

/**
 * Hook to cache ONLY essential offline data (products, beats, retailers)
 * Does NOT cache historical data, visits, or orders - only what's needed for offline operations
 */
export function useMasterDataCache() {
  const connectivityStatus = useConnectivity();
  const isOnline = connectivityStatus === 'online';
  const { user } = useAuth();

  // Cache ONLY active products and related data needed for order entry
  const cacheProducts = useCallback(async (onProgress?: CacheProgressCallback) => {
    try {
      onProgress?.('products', 'loading');
      console.log('[Cache] Syncing active products for offline order entry...');
      
      // Fetch data FIRST, only clear cache if fetch succeeds
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true);

      if (productsError) throw productsError;

      // Cache only active variants
      const { data: variants } = await supabase
        .from('product_variants')
        .select('*')
        .eq('is_active', true);

      // Only clear and update cache if all fetches succeeded
      if (products) {
        await offlineStorage.clear(STORES.PRODUCTS);
        for (const product of products) {
          await offlineStorage.save(STORES.PRODUCTS, product);
        }
        console.log(`[Cache] ✅ ${products.length} active products cached`);
      }

      if (variants) {
        await offlineStorage.clear(STORES.VARIANTS);
        for (const variant of variants) {
          await offlineStorage.save(STORES.VARIANTS, variant);
        }
        console.log(`[Cache] ✅ ${variants.length} variants cached`);
      }

      onProgress?.('products', 'done');
    } catch (error) {
      console.error('[Cache] Error caching products, keeping existing cache:', error);
      onProgress?.('products', 'error');
    }
  }, []);

  // Cache schemes separately for progress tracking
  const cacheSchemes = useCallback(async (onProgress?: CacheProgressCallback) => {
    try {
      onProgress?.('schemes', 'loading');
      console.log('[Cache] Syncing schemes...');

      // Cache only active schemes
      const { data: schemes } = await supabase
        .from('product_schemes')
        .select('*')
        .eq('is_active', true);

      // Cache categories
      const { data: categories } = await supabase
        .from('product_categories')
        .select('*');

      if (schemes) {
        await offlineStorage.clear(STORES.SCHEMES);
        for (const scheme of schemes) {
          await offlineStorage.save(STORES.SCHEMES, scheme);
        }
        console.log(`[Cache] ✅ ${schemes.length} schemes cached`);
      }

      if (categories) {
        await offlineStorage.clear(STORES.CATEGORIES);
        for (const category of categories) {
          await offlineStorage.save(STORES.CATEGORIES, category);
        }
        console.log(`[Cache] ✅ ${categories.length} categories cached`);
      }

      localStorage.setItem('master_data_cached_at', Date.now().toString());
      onProgress?.('schemes', 'done');
    } catch (error) {
      console.error('[Cache] Error caching schemes, keeping existing cache:', error);
      onProgress?.('schemes', 'error');
    }
  }, []);

  // Cache ONLY active beats for current user
  const cacheBeats = useCallback(async (onProgress?: CacheProgressCallback) => {
    if (!user) return;
    
    try {
      onProgress?.('beats', 'loading');
      console.log('[Cache] Syncing active beats...');
      
      const { data: beats, error } = await supabase
        .from('beats')
        .select('*')
        .eq('is_active', true)
        .eq('created_by', user.id);

      if (error) throw error;

      // Only clear and update cache if fetch succeeded
      if (beats) {
        await offlineStorage.clear(STORES.BEATS);
        for (const beat of beats) {
          await offlineStorage.save(STORES.BEATS, beat);
        }
        console.log(`[Cache] ✅ ${beats.length} active beats cached`);
      }
      onProgress?.('beats', 'done');
    } catch (error) {
      console.error('[Cache] Error caching beats, keeping existing cache:', error);
      onProgress?.('beats', 'error');
    }
  }, [user]);

  // Cache competition data (competitors and SKUs)
  const cacheCompetitionData = useCallback(async (onProgress?: CacheProgressCallback) => {
    try {
      onProgress?.('competition', 'loading');
      console.log('Caching competition data...');
      
      // Cache competition master (competitors)
      const { data: competitors, error: competitorsError } = await supabase
        .from('competition_master')
        .select('*');

      if (competitorsError) throw competitorsError;

      if (competitors) {
        for (const competitor of competitors) {
          await offlineStorage.save(STORES.COMPETITION_MASTER, competitor);
        }
        console.log(`Cached ${competitors.length} competitors`);
      }

      // Cache competition SKUs
      const { data: skus, error: skusError } = await supabase
        .from('competition_skus')
        .select('*')
        .eq('is_active', true);

      if (skusError) throw skusError;

      if (skus) {
        for (const sku of skus) {
          await offlineStorage.save(STORES.COMPETITION_SKUS, sku);
        }
        console.log(`Cached ${skus.length} competition SKUs`);
      }
      onProgress?.('competition', 'done');
    } catch (error) {
      console.error('Error caching competition data:', error);
      onProgress?.('competition', 'error');
    }
  }, []);

  // Cache ONLY retailers for current user
  const cacheRetailers = useCallback(async (onProgress?: CacheProgressCallback) => {
    if (!user) return;
    
    try {
      onProgress?.('retailers', 'loading');
      console.log('[Cache] Syncing retailers...');
      
      const { data: retailers, error } = await supabase
        .from('retailers')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;

      // Only clear and update cache if fetch succeeded
      if (retailers) {
        await offlineStorage.clear(STORES.RETAILERS);
        for (const retailer of retailers) {
          await offlineStorage.save(STORES.RETAILERS, retailer);
        }
        console.log(`[Cache] ✅ ${retailers.length} retailers cached`);
      }
      onProgress?.('retailers', 'done');
    } catch (error) {
      console.error('[Cache] Error caching retailers, keeping existing cache:', error);
      onProgress?.('retailers', 'error');
    }
  }, [user]);

  // Cache ONLY today's and next 3 days beat plans (not historical)
  const cacheBeatPlans = useCallback(async (onProgress?: CacheProgressCallback) => {
    if (!user) return;
    
    try {
      onProgress?.('beatPlans', 'loading');
      console.log('[Cache] Syncing upcoming beat plans...');
      
      // Get only today and next 3 days
      const today = new Date();
      const threeDaysLater = new Date(today);
      threeDaysLater.setDate(today.getDate() + 3);
      
      const { data: beatPlans, error } = await supabase
        .from('beat_plans')
        .select('*')
        .eq('user_id', user.id)
        .gte('plan_date', today.toISOString().split('T')[0])
        .lte('plan_date', threeDaysLater.toISOString().split('T')[0]);

      if (error) throw error;

      // Only clear and update cache if fetch succeeded
      if (beatPlans) {
        await offlineStorage.clear(STORES.BEAT_PLANS);
        for (const plan of beatPlans) {
          await offlineStorage.save(STORES.BEAT_PLANS, plan);
        }
        console.log(`[Cache] ✅ ${beatPlans.length} beat plans cached (today + 3 days)`);
      }
      onProgress?.('beatPlans', 'done');
    } catch (error) {
      console.error('[Cache] Error caching beat plans, keeping existing cache:', error);
      onProgress?.('beatPlans', 'error');
    }
  }, [user]);

  // Sequential cache warming with progress callback for UI
  const warmCacheWithProgress = useCallback(async (onProgress: CacheProgressCallback) => {
    if (!navigator.onLine || !user) {
      console.log('[Cache] Cannot warm cache - offline or no user');
      return false;
    }

    console.log('[Cache] 🔥 Starting cache warming with progress...');
    try {
      // Run sequentially so progress updates are visible
      await cacheProducts(onProgress);
      await cacheSchemes(onProgress);
      await cacheBeats(onProgress);
      await cacheRetailers(onProgress);
      await cacheBeatPlans(onProgress);
      await cacheCompetitionData(onProgress);
      
      localStorage.setItem('master_data_cached_at', Date.now().toString());
      localStorage.setItem('cache_warmed_at', Date.now().toString());
      
      // Dispatch event so My Visits and other components can reload from updated storage
      window.dispatchEvent(new CustomEvent('masterDataRefreshed'));
      
      console.log('[Cache] ✅ Cache warming complete');
      return true;
    } catch (error) {
      console.error('[Cache] Cache warming failed:', error);
      return false;
    }
  }, [user, cacheProducts, cacheSchemes, cacheBeats, cacheRetailers, cacheBeatPlans, cacheCompetitionData]);

  // Cache essential master data (NOT historical data)
  const cacheAllMasterData = useCallback(async () => {
    if (!isOnline || !user) {
      console.log('[Cache] Offline or no user - skipping cache update');
      return;
    }

    console.log('[Cache] 🔄 Syncing essential offline data...');
    try {
      await Promise.all([
        cacheProducts(),
        cacheSchemes(),
        cacheBeats(),
        cacheRetailers(),
        cacheBeatPlans(),
        cacheCompetitionData()
      ]);
      console.log('[Cache] ✅ Essential offline data synced successfully');
    } catch (error) {
      console.error('[Cache] Error syncing offline data:', error);
    }
  }, [isOnline, user, cacheProducts, cacheSchemes, cacheBeats, cacheRetailers, cacheBeatPlans, cacheCompetitionData]);

  // Force refresh master data AND notify UI to reload from storage
  const forceRefreshMasterData = useCallback(async () => {
    if (!navigator.onLine || !user) {
      console.log('[Cache] Cannot force refresh - offline or no user');
      return false;
    }

    console.log('[Cache] 🔄 Force refreshing all master data...');
    try {
      await Promise.all([
        cacheProducts(),
        cacheSchemes(),
        cacheBeats(),
        cacheRetailers(),
        cacheBeatPlans(),
        cacheCompetitionData()
      ]);
      
      localStorage.setItem('master_data_cached_at', Date.now().toString());
      
      // Dispatch event so My Visits and other components can reload from updated storage
      window.dispatchEvent(new CustomEvent('masterDataRefreshed'));
      
      console.log('[Cache] ✅ Force refresh complete, UI notified');
      return true;
    } catch (error) {
      console.error('[Cache] Force refresh failed:', error);
      return false;
    }
  }, [user, cacheProducts, cacheSchemes, cacheBeats, cacheRetailers, cacheBeatPlans, cacheCompetitionData]);

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

  // Auto-sync when online (not too frequently to save storage)
  useEffect(() => {
    if (!user) return;
    
    // Check if we need to refresh cache (every 4 hours) or if never cached
    const lastCached = localStorage.getItem('master_data_cached_at');
    const fourHoursAgo = Date.now() - (4 * 60 * 60 * 1000);
    
    if (isOnline) {
      if (!lastCached || parseInt(lastCached) < fourHoursAgo) {
        console.log('[Cache] Cache expired or missing, syncing offline data...');
        // Use forceRefreshMasterData to also notify UI
        forceRefreshMasterData();
      } else {
        console.log('[Cache] Using recent cache, no sync needed');
      }
    } else if (!lastCached) {
      console.warn('[Cache] ⚠️ Offline with no cached data. Connect online to enable offline mode.');
    }
  }, [isOnline, user, forceRefreshMasterData]);

  // Background sync every 30 minutes when online to pick up admin changes silently
  useEffect(() => {
    if (!isOnline || !user) return;
    
    const intervalId = setInterval(() => {
      console.log('[Cache] Background sync triggered (30-min interval)');
      forceRefreshMasterData();
    }, 30 * 60 * 1000); // 30 minutes (reduced from 15 to minimize UI disruption)
    
    return () => clearInterval(intervalId);
  }, [isOnline, user, forceRefreshMasterData]);

  return {
    cacheProducts,
    cacheSchemes,
    cacheBeats,
    cacheRetailers,
    cacheBeatPlans,
    cacheCompetitionData,
    cacheAllMasterData,
    forceRefreshMasterData,
    warmCacheWithProgress,
    loadCachedData,
    isOnline
  };
}

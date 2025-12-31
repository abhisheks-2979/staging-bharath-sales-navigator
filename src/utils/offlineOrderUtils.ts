import { offlineStorage, STORES } from '@/lib/offlineStorage';
import { supabase } from '@/integrations/supabase/client';
import { visitStatusCache } from '@/lib/visitStatusCache';
import { addOrderToSnapshot } from '@/lib/myVisitsSnapshot';
import { isSlowConnection } from '@/utils/internetSpeedCheck';
import { getLocalTodayDate } from '@/utils/dateUtils';

/**
 * Submit an order with offline support
 * Automatically falls back to offline mode on slow connections or timeouts
 * @param orderData - The order data to insert
 * @param orderItems - The order items to insert
 * @param options - Additional options
 * @returns Result with success status and order data
 */
export async function submitOrderWithOfflineSupport(
  orderData: any,
  orderItems: any[],
  options: { 
    onOffline?: () => void;
    onOnline?: () => void;
    connectivityStatus?: 'online' | 'offline' | 'unknown';
  } = {}
) {
  // Check if connection is slow - go straight to local-first for instant response
  const slowConnection = isSlowConnection();
  const isOnline = navigator.onLine && options.connectivityStatus !== 'offline' && !slowConnection;
  
  // STEP 1: Generate order ID and prepare data FIRST
  const orderId = crypto.randomUUID();
  const orderDate = orderData.order_date || getLocalTodayDate();
  const orderValue = Math.round(Number(orderData.total_amount) || orderItems.reduce((sum, item) => sum + (Number(item.total) || 0), 0));
  
  const normalizedOrder = {
    ...orderData,
    id: orderId,
    total_amount: orderValue,
    order_date: orderDate,
    status: orderData.status || 'confirmed',
    created_at: new Date().toISOString(),
  };

  const normalizedItems = orderItems.map(item => ({
    ...item,
    order_id: orderId
  }));

  console.log('⚡ [ORDER] LOCAL-FIRST: Immediate local update', {
    orderId,
    retailerId: orderData.retailer_id,
    orderValue,
    isOnline,
    slowConnection
  });

  // STEP 2: Update ALL local caches IMMEDIATELY for instant UI feedback
  if (orderData.retailer_id && orderData.user_id) {
    await Promise.allSettled([
      visitStatusCache.set(
        orderData.visit_id || orderId,
        orderData.retailer_id,
        orderData.user_id,
        orderDate,
        'productive',
        orderValue
      ),
      offlineStorage.save(STORES.ORDERS, { ...normalizedOrder, items: normalizedItems }),
      addOrderToSnapshot(orderData.user_id, orderDate, {
        id: orderId,
        retailer_id: orderData.retailer_id,
        user_id: orderData.user_id,
        total_amount: orderValue,
        order_date: orderDate,
        status: normalizedOrder.status,
        visit_id: orderData.visit_id,
      })
    ]);
    
    // STEP 3: Dispatch events IMMEDIATELY for instant UI update
    window.dispatchEvent(new CustomEvent('visitStatusChanged', {
      detail: {
        visitId: orderData.visit_id || orderId,
        status: 'productive',
        retailerId: orderData.retailer_id,
        orderValue,
        order: { ...normalizedOrder, items: normalizedItems }
      }
    }));
    window.dispatchEvent(new Event('visitDataChanged'));
  }

  // STEP 4: If offline/slow, queue for sync and return immediately
  if (!isOnline) {
    await offlineStorage.addToSyncQueue('CREATE_ORDER', {
      order: normalizedOrder,
      items: normalizedItems,
      visitId: orderData.visit_id
    });
    
    console.log('📴 [ORDER] Queued for sync (offline/slow)');
    options.onOffline?.();
    
    return { 
      success: true, 
      offline: true, 
      order: normalizedOrder 
    };
  }

  // STEP 5: Online - sync in BACKGROUND (non-blocking), return immediately
  // Use setTimeout to make this truly non-blocking
  setTimeout(async () => {
    try {
      const TIMEOUT_MS = 8000;
      
      const submitPromise = (async () => {
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .insert({ ...normalizedOrder, id: orderId })
          .select()
          .single();

        if (orderError) {
          // If duplicate key error, it's already synced
          if (orderError.code === '23505') {
            console.log('✅ [ORDER] Already synced (duplicate key)');
            return;
          }
          throw orderError;
        }

        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(normalizedItems);

        if (itemsError) throw itemsError;
        
        console.log('✅ [ORDER] Background sync successful:', orderId);
      })();
      
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Sync timeout')), TIMEOUT_MS)
      );
      
      await Promise.race([submitPromise, timeoutPromise]);
    } catch (error: any) {
      console.warn('⚠️ [ORDER] Background sync failed, queuing:', error.message);
      await offlineStorage.addToSyncQueue('CREATE_ORDER', {
        order: normalizedOrder,
        items: normalizedItems,
        visitId: orderData.visit_id
      });
    }
  }, 0);

  options.onOnline?.();
  console.log('✅ [ORDER] Returning immediately (sync in background)');
  
  return { 
    success: true, 
    offline: false, 
    order: normalizedOrder 
  };
}

/**
 * Fetch products with offline caching support
 * Uses timeout to fall back to cache on slow connections
 * @returns Products data from online or cache
 */
export async function fetchProductsWithOfflineSupport() {
  const isOnline = navigator.onLine;
  const slowConnection = isSlowConnection();
  
  // On slow connections or offline, use cache directly for instant response
  if (!isOnline || slowConnection) {
    console.log(slowConnection ? '📶 Slow connection - using cached products' : '📴 Offline - using cached products');
    return loadProductsFromCache();
  }
  
  // Online with good connection: try to fetch with timeout
  try {
    const timeoutMs = 8000; // 8 second timeout for product fetch
    
    const fetchPromise = (async () => {
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select(`
          *,
          category:product_categories(name)
        `)
        .eq('is_active', true)
        .order('name');

      if (productsError) throw productsError;

      // Fetch schemes and variants in parallel for speed
      const [schemesResult, variantsResult] = await Promise.all([
        supabase.from('product_schemes').select('*').eq('is_active', true),
        supabase.from('product_variants').select('*').eq('is_active', true)
      ]);

      const schemesData = schemesResult.data;
      const variantsData = variantsResult.data;

      // Enrich products
      const enrichedProducts = (productsData || []).map((product: any) => ({
        ...product,
        schemes: (schemesData || []).filter((s: any) => s.product_id === product.id),
        variants: (variantsData || []).filter((v: any) => v.product_id === product.id)
      }));

      // Cache for offline use (fire and forget - don't block return)
      cacheProductsInBackground(enrichedProducts, variantsData || [], schemesData || []);

      return {
        products: enrichedProducts,
        fromCache: false
      };
    })();
    
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Product fetch timeout')), timeoutMs)
    );
    
    return await Promise.race([fetchPromise, timeoutPromise]);
  } catch (error: any) {
    console.warn('⚠️ Product fetch failed/timeout, using cache:', error.message);
    return loadProductsFromCache();
  }
}

/**
 * Load products from offline cache
 */
async function loadProductsFromCache() {
  const cachedProducts = await offlineStorage.getAll(STORES.PRODUCTS);
  const cachedVariants = await offlineStorage.getAll(STORES.VARIANTS);
  const cachedSchemes = await offlineStorage.getAll(STORES.SCHEMES);

  // Filter only active products and their active variants/schemes
  const activeProducts = (cachedProducts || []).filter((p: any) => p.is_active === true);
  const activeVariants = (cachedVariants || []).filter((v: any) => v.is_active === true);
  const activeSchemes = (cachedSchemes || []).filter((s: any) => s.is_active === true);

  const enrichedProducts = activeProducts.map((product: any) => ({
    ...product,
    variants: activeVariants.filter((v: any) => v.product_id === product.id),
    schemes: activeSchemes.filter((s: any) => s.product_id === product.id)
  }));

  return {
    products: enrichedProducts,
    fromCache: true
  };
}

/**
 * Cache products in background (non-blocking)
 */
function cacheProductsInBackground(products: any[], variants: any[], schemes: any[]) {
  // Use setTimeout to not block the main thread
  setTimeout(async () => {
    try {
      for (const product of products) {
        await offlineStorage.save(STORES.PRODUCTS, product);
      }
      for (const variant of variants) {
        await offlineStorage.save(STORES.VARIANTS, variant);
      }
      for (const scheme of schemes) {
        await offlineStorage.save(STORES.SCHEMES, scheme);
      }
      console.log('✅ Products cached for offline use');
    } catch (error) {
      console.warn('⚠️ Failed to cache products:', error);
    }
  }, 100);
}

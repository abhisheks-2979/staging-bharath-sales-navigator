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
  // Check if connection is slow - use shorter timeout or go straight to offline
  const slowConnection = isSlowConnection();
  const timeoutMs = slowConnection ? 5000 : 10000; // 5s for slow, 10s for normal
  // CRITICAL: Update visit status cache IMMEDIATELY for instant UI feedback
  // This ensures the VisitCard shows "Productive" right away, even on slow internet
  const orderDate = orderData.order_date || getLocalTodayDate();
  const orderValue = Number(orderData.total_amount) || orderItems.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
  
  if (orderData.retailer_id && orderData.user_id) {
    console.log('⚡ [ORDER] Immediate cache update for instant UI feedback:', {
      retailerId: orderData.retailer_id,
      date: orderDate,
      orderValue
    });
    
    await visitStatusCache.set(
      orderData.visit_id || crypto.randomUUID(),
      orderData.retailer_id,
      orderData.user_id,
      orderDate,
      'productive',
      orderValue
    );
    
    // Dispatch event immediately for instant UI update - include order for orders state update
    window.dispatchEvent(new CustomEvent('visitStatusChanged', {
      detail: {
        visitId: orderData.visit_id,
        status: 'productive',
        retailerId: orderData.retailer_id,
        orderValue,
        order: { ...orderData, items: orderItems, total_amount: orderValue }
      }
    }));
  }

  // Double-check connectivity: use both provided status and navigator.onLine
  const connectivityCheck = options.connectivityStatus !== 'offline' && navigator.onLine;
  
  // Try online submission first if we think we're online
  // On very slow connections, skip network and go straight to offline for instant response
  if (connectivityCheck && !slowConnection) {
    try {
      // Add timeout for slow networks
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Network timeout - submitting offline')), timeoutMs)
      );
      
      // Online submission with timeout
      const submitPromise = (async () => {
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
        
        return order;
      })();
      
      const order = await Promise.race([submitPromise, timeoutPromise]) as any;

      options.onOnline?.();

      // Persist locally for instant "Today's Progress" + app restarts
      const normalizedOrderDate = orderData.order_date || getLocalTodayDate();
      const normalizedOrder = {
        id: order.id,
        retailer_id: orderData.retailer_id,
        user_id: orderData.user_id,
        total_amount: Number(order.total_amount ?? orderData.total_amount ?? orderValue ?? 0),
        order_date: normalizedOrderDate,
        status: order.status || orderData.status || 'confirmed',
        visit_id: orderData.visit_id || order.visit_id,
        created_at: order.created_at || new Date().toISOString(),
        items: orderItems,
      };

      try {
        await offlineStorage.save(STORES.ORDERS, normalizedOrder);
      } catch (e) {
        console.warn('[ORDER] Could not save online order to offline store (non-fatal):', e);
      }

      if (orderData.user_id) {
        try {
          await addOrderToSnapshot(orderData.user_id, normalizedOrderDate, normalizedOrder);
        } catch (e) {
          console.warn('[ORDER] Could not update snapshot with online order (non-fatal):', e);
        }
      }

      // Trigger data refresh for Today's Progress
      console.log('✅ [ORDER] Online submission successful, triggering data refresh');
      window.dispatchEvent(new Event('visitDataChanged'));

      return { 
        success: true, 
        offline: false, 
        order 
      };
    } catch (error: any) {
      // If online submission fails or times out, fall back to offline mode
      console.warn('Online submission failed/timeout, queuing for offline sync:', error.message);
      
      // Fall through to offline logic below
    }
  }
  
  // Offline mode or failed online attempt: Queue for sync
  const orderId = crypto.randomUUID();
  const offlineOrderDate = orderData.order_date || getLocalTodayDate();
  const offlineOrder = {
    ...orderData,
    id: orderId,
    created_at: new Date().toISOString(),
    order_date: offlineOrderDate,
    status: orderData.status || 'confirmed',
    total_amount: Number(orderData.total_amount ?? orderValue ?? 0),
  };

  const offlineItems = orderItems.map(item => ({
    ...item,
    order_id: orderId
  }));

  // Save to offline storage
  await offlineStorage.save(STORES.ORDERS, { ...offlineOrder, items: offlineItems });
  
  // Queue for sync with visitId for proper status updates
  await offlineStorage.addToSyncQueue('CREATE_ORDER', {
    order: offlineOrder,
    items: offlineItems,
    visitId: orderData.visit_id  // Include visitId for sync event dispatch
  });

  // CRITICAL: Update visit status cache to 'productive' immediately for offline orders
  // This ensures the VisitCard shows "Productive" right away without waiting for sync
  if (orderData.retailer_id && orderData.user_id) {
    const orderDate = offlineOrder.order_date || new Date().toISOString().split('T')[0];
    const orderValue = orderItems.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
    
    console.log('💾 [ORDER] Caching productive status for offline order:', {
      retailerId: orderData.retailer_id,
      userId: orderData.user_id,
      date: orderDate,
      orderValue
    });
    
    await visitStatusCache.set(
      orderData.visit_id || orderId,
      orderData.retailer_id,
      orderData.user_id,
      orderDate,
      'productive',
      orderValue
    );
    
    // Dispatch visitStatusChanged event for immediate UI update - include order for orders state update
    window.dispatchEvent(new CustomEvent('visitStatusChanged', {
      detail: {
        visitId: orderData.visit_id || orderId,
        status: 'productive',
        retailerId: orderData.retailer_id,
        orderValue,
        order: { ...offlineOrder, items: offlineItems, total_amount: orderValue }
      }
    }));
  }

  options.onOffline?.();

  // Ensure snapshot is created/updated so My Visits can show today's order instantly
  if (orderData.user_id) {
    try {
      await addOrderToSnapshot(orderData.user_id, offlineOrderDate, {
        id: offlineOrder.id,
        retailer_id: offlineOrder.retailer_id,
        user_id: offlineOrder.user_id,
        total_amount: Number(offlineOrder.total_amount ?? 0),
        order_date: offlineOrderDate,
        status: offlineOrder.status || 'confirmed',
        visit_id: offlineOrder.visit_id,
        created_at: offlineOrder.created_at,
        items: offlineItems,
      });
      console.log('📸 [ORDER] Updated My Visits snapshot with offline order');
    } catch (snapshotError) {
      console.warn('[ORDER] Could not update snapshot (offline):', snapshotError);
    }
  }

  // Trigger data refresh for Today's Progress
  console.log('✅ [ORDER] Offline order queued, triggering data refresh');
  window.dispatchEvent(new Event('visitDataChanged'));

  return { 
    success: true, 
    offline: true, 
    order: offlineOrder 
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

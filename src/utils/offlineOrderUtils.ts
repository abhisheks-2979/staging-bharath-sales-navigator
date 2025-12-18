import { offlineStorage, STORES } from '@/lib/offlineStorage';
import { supabase } from '@/integrations/supabase/client';
import { visitStatusCache } from '@/lib/visitStatusCache';
import { saveMyVisitsSnapshot, loadMyVisitsSnapshot } from '@/lib/myVisitsSnapshot';
/**
 * Submit an order with offline support
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
  // CRITICAL: Update visit status cache IMMEDIATELY for instant UI feedback
  // This ensures the VisitCard shows "Productive" right away, even on slow internet
  const orderDate = orderData.order_date || new Date().toISOString().split('T')[0];
  const orderValue = orderData.total_amount || orderItems.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
  
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
  if (connectivityCheck) {
    try {
      // Add timeout for slow networks - 10 seconds
      const timeoutMs = 10000;
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
      
      // Update My Visits snapshot with the new online order so it shows when app reopens
      const orderDate = orderData.order_date || new Date().toISOString().split('T')[0];
      if (orderData.user_id) {
        try {
          const existingSnapshot = await loadMyVisitsSnapshot(orderData.user_id, orderDate);
          if (existingSnapshot) {
            // Add the new order to snapshot
            const updatedOrders = [...existingSnapshot.orders, { ...order, items: orderItems }];
            
            // Update retailer status in snapshot
            const updatedRetailers = existingSnapshot.retailers.map((r: any) => {
              if (r.retailer_id === orderData.retailer_id || r.id === orderData.retailer_id) {
                return { ...r, visitStatus: 'productive', orderValue: order.total_amount };
              }
              return r;
            });
            
            // Update visits array in snapshot
            const existingVisitIndex = existingSnapshot.visits.findIndex(
              (v: any) => v.retailer_id === orderData.retailer_id
            );
            let updatedVisits = [...existingSnapshot.visits];
            if (existingVisitIndex >= 0) {
              updatedVisits[existingVisitIndex] = {
                ...updatedVisits[existingVisitIndex],
                status: 'productive',
                updated_at: new Date().toISOString()
              };
            } else {
              updatedVisits.push({
                id: orderData.visit_id || crypto.randomUUID(),
                retailer_id: orderData.retailer_id,
                user_id: orderData.user_id,
                status: 'productive',
                planned_date: orderDate,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });
            }
            
            // Recalculate progress stats
            const productiveCount = updatedRetailers.filter((r: any) => r.visitStatus === 'productive').length;
            const unproductiveCount = updatedRetailers.filter((r: any) => r.visitStatus === 'unproductive').length;
            
            await saveMyVisitsSnapshot(orderData.user_id, orderDate, {
              ...existingSnapshot,
              orders: updatedOrders,
              retailers: updatedRetailers,
              visits: updatedVisits,
              progressStats: {
                ...existingSnapshot.progressStats,
                productive: productiveCount,
                unproductive: unproductiveCount,
                totalOrders: updatedOrders.length,
                totalOrderValue: updatedOrders.reduce((sum: number, o: any) => sum + (Number(o.total_amount) || 0), 0)
              }
            });
            console.log('📸 [ORDER] Updated My Visits snapshot with online order');
          }
        } catch (snapshotError) {
          console.warn('[ORDER] Could not update snapshot:', snapshotError);
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
  const offlineOrder = {
    ...orderData,
    id: orderId,
    created_at: new Date().toISOString(),
    order_date: new Date().toISOString().split('T')[0]
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
  
  // Update My Visits snapshot with the new offline order so it shows when app reopens
  // Note: orderDate already defined at top of function
  if (orderData.user_id) {
    try {
      const existingSnapshot = await loadMyVisitsSnapshot(orderData.user_id, orderDate);
      if (existingSnapshot) {
        // Add the new order to snapshot
        const updatedOrders = [...existingSnapshot.orders, { ...offlineOrder, items: offlineItems }];
        
        // Update retailer status in snapshot
        const updatedRetailers = existingSnapshot.retailers.map((r: any) => {
          if (r.retailer_id === orderData.retailer_id || r.id === orderData.retailer_id) {
            return { ...r, visitStatus: 'productive', orderValue: offlineOrder.total_amount };
          }
          return r;
        });
        
        // Update visits array in snapshot
        const existingVisitIndex = existingSnapshot.visits.findIndex(
          (v: any) => v.retailer_id === orderData.retailer_id
        );
        let updatedVisits = [...existingSnapshot.visits];
        if (existingVisitIndex >= 0) {
          updatedVisits[existingVisitIndex] = {
            ...updatedVisits[existingVisitIndex],
            status: 'productive',
            updated_at: new Date().toISOString()
          };
        } else {
          updatedVisits.push({
            id: orderData.visit_id || orderId,
            retailer_id: orderData.retailer_id,
            user_id: orderData.user_id,
            status: 'productive',
            planned_date: orderDate,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }
        
        // Recalculate progress stats
        const productiveCount = updatedRetailers.filter((r: any) => r.visitStatus === 'productive').length;
        const unproductiveCount = updatedRetailers.filter((r: any) => r.visitStatus === 'unproductive').length;
        
        await saveMyVisitsSnapshot(orderData.user_id, orderDate, {
          ...existingSnapshot,
          orders: updatedOrders,
          retailers: updatedRetailers,
          visits: updatedVisits,
          progressStats: {
            ...existingSnapshot.progressStats,
            productive: productiveCount,
            unproductive: unproductiveCount,
            totalOrders: updatedOrders.length,
            totalOrderValue: updatedOrders.reduce((sum: number, o: any) => sum + (Number(o.total_amount) || 0), 0)
          }
        });
        console.log('📸 [ORDER] Updated My Visits snapshot with offline order');
      }
    } catch (snapshotError) {
      console.warn('[ORDER] Could not update snapshot:', snapshotError);
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
 * @returns Products data from online or cache
 */
export async function fetchProductsWithOfflineSupport() {
  const isOnline = navigator.onLine;
  
  if (isOnline) {
    // Online: Fetch from Supabase and cache
    const { data: productsData, error: productsError } = await supabase
      .from('products')
      .select(`
        *,
        category:product_categories(name)
      `)
      .eq('is_active', true)
      .order('name');

    if (productsError) throw productsError;

    // Fetch schemes
    const { data: schemesData } = await supabase
      .from('product_schemes')
      .select('*')
      .eq('is_active', true);

    // Fetch variants
    const { data: variantsData } = await supabase
      .from('product_variants')
      .select('*')
      .eq('is_active', true);

    // Enrich products
    const enrichedProducts = (productsData || []).map((product: any) => ({
      ...product,
      schemes: (schemesData || []).filter((s: any) => s.product_id === product.id),
      variants: (variantsData || []).filter((v: any) => v.product_id === product.id)
    }));

    // Cache for offline use
    for (const product of enrichedProducts) {
      await offlineStorage.save(STORES.PRODUCTS, product);
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

    return {
      products: enrichedProducts,
      fromCache: false
    };
  } else {
    // Offline: Load from cache
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
}

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { offlineStorage, STORES } from '@/lib/offlineStorage';
import { toast } from '@/hooks/use-toast';

interface Product {
  id: string;
  sku: string;
  name: string;
  category: { name: string } | null;
  rate: number;
  unit: string;
  base_unit?: string;
  closing_stock: number;
  schemes?: any[];
  variants?: any[];
}

export function useOfflineOrderEntry() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const hasFetchedRef = useRef(false);
  const isFetchingRef = useRef(false);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Background sync function - defined before fetchProducts
  const syncProductsInBackground = async () => {
    try {
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select(`
          *,
          category:product_categories(name)
        `)
        .eq('is_active', true)
        .order('name');

      if (productsError) throw productsError;

      const { data: schemesData } = await supabase
        .from('product_schemes')
        .select('*')
        .eq('is_active', true);

      const { data: variantsData } = await supabase
        .from('product_variants')
        .select('*')
        .eq('is_active', true);

      const enrichedProducts = (productsData || []).map((product: any) => ({
        ...product,
        schemes: (schemesData || []).filter((s: any) => s.product_id === product.id),
        variants: (variantsData || []).filter((v: any) => v.product_id === product.id)
      }));

      setProducts(enrichedProducts);
      setLoading(false);

      // Cache for offline use - do this in background
      offlineStorage.clear(STORES.PRODUCTS).then(() => {
        enrichedProducts.forEach(product => offlineStorage.save(STORES.PRODUCTS, product));
      });
      offlineStorage.clear(STORES.VARIANTS).then(() => {
        variantsData?.forEach(variant => offlineStorage.save(STORES.VARIANTS, variant));
      });
      offlineStorage.clear(STORES.SCHEMES).then(() => {
        schemesData?.forEach(scheme => offlineStorage.save(STORES.SCHEMES, scheme));
      });

      console.log(`✅ Synced ${enrichedProducts.length} products from network (background)`);
    } catch (error) {
      console.error('Background sync error:', error);
    }
  };

  // Fetch products with offline support - instant cache load
  const fetchProducts = useCallback(async () => {
    // Prevent multiple simultaneous fetches
    if (isFetchingRef.current) {
      console.log('⏸️ Fetch already in progress, skipping...');
      return;
    }

    // Don't refetch if we already have products loaded
    if (hasFetchedRef.current) {
      console.log('✅ Products already loaded, skipping refetch');
      return;
    }

    isFetchingRef.current = true;

    try {
      // 1. Load from cache INSTANTLY - no loading state
      const cachedProducts = await offlineStorage.getAll(STORES.PRODUCTS);
      const cachedVariants = await offlineStorage.getAll(STORES.VARIANTS);
      const cachedSchemes = await offlineStorage.getAll(STORES.SCHEMES);

      if (cachedProducts.length > 0) {
        const enrichedProducts = (cachedProducts || []).map((product: any) => ({
          ...product,
          variants: (cachedVariants || []).filter((v: any) => v.product_id === product.id),
          schemes: (cachedSchemes || []).filter((s: any) => s.product_id === product.id)
        }));
        setProducts(enrichedProducts);
        setLoading(false);
        hasFetchedRef.current = true;
        console.log(`✅ Loaded ${enrichedProducts.length} products from cache instantly`);
        
        // Background sync if online (no delay, no await)
        if (isOnline) {
          syncProductsInBackground().catch(err => 
            console.error('Background sync failed:', err)
          );
        }
      } else {
        // No cache, fetch from network immediately
        console.log('📦 No cached products, fetching from network...');
        setLoading(true);
        await syncProductsInBackground();
        hasFetchedRef.current = true;
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      
      // Fallback to cache on error
      const cachedProducts = await offlineStorage.getAll(STORES.PRODUCTS);
      const cachedVariants = await offlineStorage.getAll(STORES.VARIANTS);
      const cachedSchemes = await offlineStorage.getAll(STORES.SCHEMES);

      if (cachedProducts.length > 0) {
        const enrichedProducts = (cachedProducts || []).map((product: any) => ({
          ...product,
          variants: (cachedVariants || []).filter((v: any) => v.product_id === product.id),
          schemes: (cachedSchemes || []).filter((s: any) => s.product_id === product.id)
        }));
        setProducts(enrichedProducts);
        hasFetchedRef.current = true;
      }
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [isOnline]);

  // Submit order with offline support - optimized
  const submitOrder = async (orderData: any, orderItems: any[]) => {
    if (!isOnline) {
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
        order_id: orderId
      }));

      // Save to offline storage in parallel
      await Promise.all([
        offlineStorage.save(STORES.ORDERS, { ...offlineOrder, items: offlineItems }),
        offlineStorage.addToSyncQueue('CREATE_ORDER', {
          order: offlineOrder,
          items: offlineItems
        })
      ]);

      toast({
        title: "Order Saved Offline",
        description: "Your order will be synced when you're back online",
      });

      return { success: true, offline: true, order: offlineOrder };
    } else {
      // Online: Submit with optimized single transaction
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert(orderData)
        .select()
        .single();

      if (orderError) throw orderError;

      // Batch insert all items at once
      const itemsWithOrderId = orderItems.map(item => ({
        ...item,
        order_id: order.id
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(itemsWithOrderId);

      if (itemsError) throw itemsError;

      return { success: true, offline: false, order };
    }
  };

  return {
    products,
    loading,
    isOnline,
    fetchProducts,
    submitOrder
  };
}

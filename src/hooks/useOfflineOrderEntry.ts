import { useState, useEffect } from 'react';
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

  // Fetch products with offline support
  const fetchProducts = async () => {
    try {
      setLoading(true);

      // 1. Load from cache immediately for instant display
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
      }

      // 2. If online, fetch fresh data in background
      if (isOnline) {
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

        // Cache for offline use
        await offlineStorage.clear(STORES.PRODUCTS);
        await offlineStorage.clear(STORES.VARIANTS);
        await offlineStorage.clear(STORES.SCHEMES);
        
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

        console.log(`Cached ${enrichedProducts.length} products for offline use`);
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
      }
    } finally {
      setLoading(false);
    }
  };

  // Submit order with offline support
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

      // Save to offline storage
      await offlineStorage.save(STORES.ORDERS, { ...offlineOrder, items: offlineItems });
      
      // Queue for sync
      await offlineStorage.addToSyncQueue('CREATE_ORDER', {
        order: offlineOrder,
        items: offlineItems
      });

      toast({
        title: "Order Saved Offline",
        description: "Your order will be synced when you're back online",
      });

      return { success: true, offline: true, order: offlineOrder };
    } else {
      // Online: Submit directly
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

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

        setProducts(enrichedProducts);

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

        console.log(`Cached ${enrichedProducts.length} products for offline use`);
      } else {
        // Offline: Load from cache
        console.log('Loading products from offline cache');
        const cachedProducts = await offlineStorage.getAll(STORES.PRODUCTS);
        const cachedVariants = await offlineStorage.getAll(STORES.VARIANTS);
        const cachedSchemes = await offlineStorage.getAll(STORES.SCHEMES);

        const enrichedProducts = (cachedProducts || []).map((product: any) => ({
          ...product,
          variants: (cachedVariants || []).filter((v: any) => v.product_id === product.id),
          schemes: (cachedSchemes || []).filter((s: any) => s.product_id === product.id)
        }));

        setProducts(enrichedProducts);

        if (enrichedProducts.length === 0) {
          toast({
            title: "Working Offline",
            description: "No cached products. Please go online to load products first.",
            variant: "default"
          });
        } else {
          toast({
            title: "Working Offline",
            description: `Loaded ${enrichedProducts.length} products from cache`,
          });
        }
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      toast({
        title: "Error",
        description: "Failed to load products",
        variant: "destructive"
      });
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

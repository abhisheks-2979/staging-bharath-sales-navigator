import { supabase } from '@/integrations/supabase/client';

/**
 * Extract base product ID from a potentially variant product ID
 * Variant IDs are in format: "baseProductId_variant_variantId"
 */
function extractBaseProductId(productId: string): string {
  if (!productId) return productId;
  
  // Check if it's a variant product ID
  if (productId.includes('_variant_')) {
    return productId.split('_variant_')[0];
  }
  
  return productId;
}

/**
 * Calculate and update van stock ordered quantities based on orders placed
 * This syncs order quantities to van_stock_items for the given date
 */
export async function syncOrdersToVanStock(stockDate: string, userId?: string): Promise<boolean> {
  try {
    // Get current user if not provided
    let currentUserId = userId;
    if (!currentUserId) {
      const { data: session } = await supabase.auth.getSession();
      currentUserId = session.session?.user?.id;
    }
    
    if (!currentUserId) {
      console.log('No user ID available for van stock sync');
      return false;
    }

    console.log(`🔄 Syncing orders to van stock for date: ${stockDate}, user: ${currentUserId}`);

    // Get van stock for the date
    const { data: vanStock, error: stockError } = await supabase
      .from('van_stock')
      .select('id, van_id, van_stock_items(*)')
      .eq('stock_date', stockDate)
      .eq('user_id', currentUserId)
      .maybeSingle();

    if (stockError) {
      console.error('Error fetching van stock:', stockError);
      return false;
    }

    if (!vanStock || !vanStock.van_stock_items || vanStock.van_stock_items.length === 0) {
      console.log('No van stock found for this date');
      return false;
    }

    // Get all orders for today by this user
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, status')
      .eq('user_id', currentUserId)
      .gte('created_at', `${stockDate}T00:00:00`)
      .lte('created_at', `${stockDate}T23:59:59`)
      .in('status', ['confirmed', 'pending', 'delivered']);

    if (ordersError) {
      console.error('Error fetching orders:', ordersError);
      return false;
    }

    const orderIds = orders?.map(o => o.id) || [];
    
    // Get all order items for these orders
    let orderQuantities: { [productId: string]: number } = {};
    
    if (orderIds.length > 0) {
      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select('product_id, quantity, unit')
        .in('order_id', orderIds);

      if (itemsError) {
        console.error('Error fetching order items:', itemsError);
        return false;
      }

      // Sum quantities by BASE product ID, converting to common unit (grams)
      orderItems?.forEach(item => {
        // Extract base product ID (handles variant IDs like "baseId_variant_variantId")
        const baseProductId = extractBaseProductId(item.product_id);
        const qtyInGrams = convertToGrams(item.quantity, item.unit || 'piece');
        orderQuantities[baseProductId] = (orderQuantities[baseProductId] || 0) + qtyInGrams;
      });
    }

    console.log('📦 Order quantities by base product (in grams):', orderQuantities);

    // Update each van stock item with calculated ordered quantity
    let updateCount = 0;
    for (const stockItem of vanStock.van_stock_items as any[]) {
      // Van stock stores quantities in the product's unit, typically grams for weight-based products
      const orderedQtyGrams = orderQuantities[stockItem.product_id] || 0;
      
      // Calculate left quantity: start - ordered + returned (all in grams)
      const leftQty = Math.max(0, (stockItem.start_qty || 0) - orderedQtyGrams + (stockItem.returned_qty || 0));

      // Only update if values changed
      if (stockItem.ordered_qty !== orderedQtyGrams || stockItem.left_qty !== leftQty) {
        const { error: updateError } = await supabase
          .from('van_stock_items')
          .update({
            ordered_qty: orderedQtyGrams,
            left_qty: leftQty
          })
          .eq('id', stockItem.id);

        if (updateError) {
          console.error('Error updating van stock item:', updateError);
        } else {
          updateCount++;
          console.log(`✅ Updated stock item ${stockItem.product_id}: ordered=${orderedQtyGrams}g, left=${leftQty}g`);
        }
      }
    }

    console.log(`✅ Updated ${updateCount} van stock items with order quantities`);
    
    // Dispatch event to notify UI components
    window.dispatchEvent(new CustomEvent('vanStockUpdated', { 
      detail: { stockDate, updateCount } 
    }));
    
    return true;
  } catch (error) {
    console.error('Error syncing orders to van stock:', error);
    return false;
  }
}

/**
 * Convert quantity to grams for consistent calculation
 * Van stock typically stores everything in grams for weight-based products
 */
function convertToGrams(quantity: number, unit: string): number {
  const lowerUnit = (unit || '').toLowerCase();
  
  // KG to Grams
  if (lowerUnit === 'kg' || lowerUnit === 'kilogram' || lowerUnit === 'kilograms') {
    return quantity * 1000;
  }
  
  // Liters to ML (treat as grams equivalent)
  if (lowerUnit === 'l' || lowerUnit === 'liter' || lowerUnit === 'liters' || lowerUnit === 'litre' || lowerUnit === 'litres') {
    return quantity * 1000;
  }
  
  // Already in grams/ml or piece
  // Grams, ML, piece stay as-is
  if (lowerUnit === 'g' || lowerUnit === 'gram' || lowerUnit === 'grams' || 
      lowerUnit === 'ml' || lowerUnit === 'milliliter' || lowerUnit === 'milliliters') {
    return quantity;
  }
  
  // Default: treat as base unit (grams or pieces)
  return quantity;
}

/**
 * Get today's date in YYYY-MM-DD format
 */
export function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

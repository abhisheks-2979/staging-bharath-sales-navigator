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
 * Convert quantity from one unit to a target unit
 * Returns quantity in the target unit
 */
function convertQuantity(quantity: number, fromUnit: string, toUnit: string): number {
  const from = (fromUnit || '').toLowerCase().trim();
  const to = (toUnit || '').toLowerCase().trim();
  
  // Same unit, no conversion needed
  if (from === to) return quantity;
  
  // Convert to grams first (base unit for weight)
  let inGrams = quantity;
  
  if (from === 'kg' || from === 'kilogram' || from === 'kilograms') {
    inGrams = quantity * 1000;
  } else if (from === 'g' || from === 'gram' || from === 'grams') {
    inGrams = quantity;
  } else if (from === 'l' || from === 'liter' || from === 'liters' || from === 'litre' || from === 'litres') {
    inGrams = quantity * 1000; // Treat liters as equivalent to KG for beverages
  } else if (from === 'ml' || from === 'milliliter' || from === 'milliliters') {
    inGrams = quantity;
  } else {
    // pieces or unknown - no conversion
    return quantity;
  }
  
  // Now convert from grams to target unit
  if (to === 'kg' || to === 'kilogram' || to === 'kilograms') {
    return inGrams / 1000;
  } else if (to === 'g' || to === 'gram' || to === 'grams') {
    return inGrams;
  } else if (to === 'l' || to === 'liter' || to === 'liters' || to === 'litre' || to === 'litres') {
    return inGrams / 1000;
  } else if (to === 'ml' || to === 'milliliter' || to === 'milliliters') {
    return inGrams;
  }
  
  // Default - return as is
  return quantity;
}

/**
 * Calculate and update van stock ordered quantities based on orders placed
 * This syncs order quantities to van_stock_items for the given date
 * IMPORTANT: Quantities are stored in the van stock item's native unit, not always in grams
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
    
    // Get all order items for these orders with their units
    let orderQuantitiesInGrams: { [productId: string]: number } = {};
    
    if (orderIds.length > 0) {
      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select('product_id, quantity, unit')
        .in('order_id', orderIds);

      if (itemsError) {
        console.error('Error fetching order items:', itemsError);
        return false;
      }

      // Sum quantities by BASE product ID, converting everything to grams first
      orderItems?.forEach(item => {
        // Extract base product ID (handles variant IDs like "baseId_variant_variantId")
        const baseProductId = extractBaseProductId(item.product_id);
        const orderUnit = item.unit || 'piece';
        
        // Convert to grams as intermediate unit for consistency
        const qtyInGrams = convertQuantity(item.quantity, orderUnit, 'g');
        orderQuantitiesInGrams[baseProductId] = (orderQuantitiesInGrams[baseProductId] || 0) + qtyInGrams;
      });
    }

    console.log('📦 Order quantities by base product (in grams):', orderQuantitiesInGrams);

    // Update each van stock item with calculated ordered quantity
    // CRITICAL: Convert the order quantity to match the van stock item's unit
    let updateCount = 0;
    for (const stockItem of vanStock.van_stock_items as any[]) {
      const stockItemUnit = stockItem.unit || 'g'; // Van stock item's unit
      const orderedGrams = orderQuantitiesInGrams[stockItem.product_id] || 0;
      
      // Convert ordered quantity from grams to the van stock item's native unit
      const orderedQtyInStockUnit = convertQuantity(orderedGrams, 'g', stockItemUnit);
      
      // Calculate left quantity in the stock item's native unit
      // Formula: left = start - ordered + returned (all in same unit)
      const startQty = stockItem.start_qty || 0;
      const returnedQty = stockItem.returned_qty || 0;
      const leftQty = Math.max(0, startQty - orderedQtyInStockUnit + returnedQty);

      console.log(`📊 Product ${stockItem.product_name}: unit=${stockItemUnit}, orderedGrams=${orderedGrams}, orderedInUnit=${orderedQtyInStockUnit}, start=${startQty}, returned=${returnedQty}, left=${leftQty}`);

      // Only update if values changed (with small tolerance for floating point)
      const orderedChanged = Math.abs((stockItem.ordered_qty || 0) - orderedQtyInStockUnit) > 0.001;
      const leftChanged = Math.abs((stockItem.left_qty || 0) - leftQty) > 0.001;
      
      if (orderedChanged || leftChanged) {
        const { error: updateError } = await supabase
          .from('van_stock_items')
          .update({
            ordered_qty: orderedQtyInStockUnit,
            left_qty: leftQty
          })
          .eq('id', stockItem.id);

        if (updateError) {
          console.error('Error updating van stock item:', updateError);
        } else {
          updateCount++;
          console.log(`✅ Updated stock item ${stockItem.product_name}: ordered=${orderedQtyInStockUnit} ${stockItemUnit}, left=${leftQty} ${stockItemUnit}`);
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
 * Get today's date in YYYY-MM-DD format
 */
export function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

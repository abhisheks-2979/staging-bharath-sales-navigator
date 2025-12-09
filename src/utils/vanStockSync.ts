import { supabase } from '@/integrations/supabase/client';

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

    console.log(`🔄 Syncing orders to van stock for date: ${stockDate}`);

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

      // Sum quantities by product, converting to base unit (KG)
      orderItems?.forEach(item => {
        const qty = convertToBaseUnit(item.quantity, item.unit || 'piece');
        orderQuantities[item.product_id] = (orderQuantities[item.product_id] || 0) + qty;
      });
    }

    console.log('📦 Order quantities by product:', orderQuantities);

    // Update each van stock item with calculated ordered quantity
    let updateCount = 0;
    for (const stockItem of vanStock.van_stock_items as any[]) {
      const orderedQty = orderQuantities[stockItem.product_id] || 0;
      const leftQty = (stockItem.start_qty || 0) - orderedQty + (stockItem.returned_qty || 0);

      // Only update if values changed
      if (stockItem.ordered_qty !== orderedQty || stockItem.left_qty !== leftQty) {
        const { error: updateError } = await supabase
          .from('van_stock_items')
          .update({
            ordered_qty: orderedQty,
            left_qty: leftQty
          })
          .eq('id', stockItem.id);

        if (updateError) {
          console.error('Error updating van stock item:', updateError);
        } else {
          updateCount++;
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
 * Convert quantity to base unit (KG) for consistent calculation
 */
function convertToBaseUnit(quantity: number, unit: string): number {
  const lowerUnit = (unit || '').toLowerCase();
  
  // Gram to KG
  if (lowerUnit === 'g' || lowerUnit === 'gram' || lowerUnit === 'grams') {
    return quantity / 1000;
  }
  
  // ML to L (treat as KG equivalent)
  if (lowerUnit === 'ml' || lowerUnit === 'milliliter' || lowerUnit === 'milliliters') {
    return quantity / 1000;
  }
  
  // Already in base unit (KG, L, piece, etc.)
  return quantity;
}

/**
 * Get today's date in YYYY-MM-DD format
 */
export function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

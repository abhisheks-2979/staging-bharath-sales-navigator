import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Truck, Package, ShoppingCart, TrendingDown, Plus, Eye, Trash2, Check, ChevronsUpDown, Download, Edit, FileText, FileSpreadsheet, Printer, ChevronDown, History, RefreshCw, ClipboardCheck } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from '@/components/ui/badge';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from "@/lib/utils";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { syncOrdersToVanStock, recalculateVanStock } from '@/utils/vanStockSync';
import { downloadExcel, downloadPDF } from '@/utils/fileDownloader';

interface Van {
  id: string;
  registration_number: string;
  make_model: string;
}

interface Product {
  id: string;
  name: string;
  unit: string;
  rate: number;
}

interface StockItem {
  id?: string;
  product_id: string;
  product_name: string;
  unit: string;
  start_qty: number;
  ordered_qty: number;
  returned_qty: number;
  left_qty: number;
}

interface Beat {
  id: string;
  beat_name: string;
}

interface VanStockManagementProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: string;
}

export function VanStockManagement({ open, onOpenChange, selectedDate }: VanStockManagementProps) {
  const [vans, setVans] = useState<Van[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [openProductPopovers, setOpenProductPopovers] = useState<{ [key: number]: boolean }>({});
  const [beats, setBeats] = useState<Beat[]>([]);
  const [selectedVan, setSelectedVan] = useState<string>('');
  const [selectedBeat, setSelectedBeat] = useState<string>('');
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [todayStock, setTodayStock] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [loadingPreviousStock, setLoadingPreviousStock] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState<'start' | 'ordered' | 'returned' | 'left' | 'inventory' | null>(null);
  const [isMorning, setIsMorning] = useState(true);
  const [startKm, setStartKm] = useState(0);
  const [endKm, setEndKm] = useState(0);
  const [showLoadPreviousConfirm, setShowLoadPreviousConfirm] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  
  // Morning/Closing GRN states
  const [showClosingGRNModal, setShowClosingGRNModal] = useState(false);
  const [closingEndKm, setClosingEndKm] = useState(0);
  const [closingStockVerified, setClosingStockVerified] = useState(false);
  const [savingClosingGRN, setSavingClosingGRN] = useState(false);
  
  // Check if Morning GRN is saved (status contains 'morning_saved' or items exist)
  const isMorningGRNSaved = todayStock?.status === 'morning_saved' || todayStock?.status === 'closing_verified' || (todayStock?.van_stock_items && todayStock.van_stock_items.length > 0);
  
  // Check if Closing GRN is verified
  const isClosingGRNVerified = todayStock?.status === 'closing_verified';

  useEffect(() => {
    if (open) {
      loadVans();
      loadProducts();
      loadBeatForDate();
      checkTime();
      
      // Auto-recalculate van stock when dialog opens to fix any corrupted data
      recalculateVanStock(selectedDate).catch(err => {
        console.error('Error recalculating van stock on open:', err);
      });
    }
  }, [open, selectedDate]);

  // Manual recalculate function
  const handleRecalculateStock = async () => {
    setIsRecalculating(true);
    try {
      const success = await recalculateVanStock(selectedDate);
      if (success) {
        toast.success('Stock quantities recalculated successfully');
        // Reload the stock data to show updated values
        if (selectedVan) {
          loadTodayStock(false);
        }
      } else {
        toast.info('No stock data to recalculate');
      }
    } catch (error) {
      console.error('Error recalculating stock:', error);
      toast.error('Failed to recalculate stock');
    } finally {
      setIsRecalculating(false);
    }
  };

  useEffect(() => {
    if (selectedVan && selectedDate) {
      loadTodayStock(false);
    }
  }, [selectedVan, selectedDate, selectedBeat]);

  // Real-time subscription for order updates
  useEffect(() => {
    if (!selectedDate) return;

    const channel = supabase
      .channel('order-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        () => {
          // Reload stock when orders change - keep entry form as is
          if (selectedVan) {
            loadTodayStock(false);
          }
        }
      )
      .subscribe();

    // Listen for vanStockUpdated events (triggered after order sync)
    const handleVanStockUpdated = (event: CustomEvent) => {
      const { stockDate } = event.detail || {};
      if (stockDate === selectedDate && selectedVan) {
        console.log('🔄 Van stock updated event received, reloading...');
        loadTodayStock(false);
      }
    };
    
    window.addEventListener('vanStockUpdated', handleVanStockUpdated as EventListener);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('vanStockUpdated', handleVanStockUpdated as EventListener);
    };
  }, [selectedVan, selectedBeat, selectedDate]);

  const checkTime = () => {
    const hour = new Date().getHours();
    setIsMorning(hour < 12);
  };

  const loadVans = async () => {
    const { data, error } = await supabase
      .from('vans')
      .select('id, registration_number, make_model')
      .eq('is_active', true);
    
    if (error) {
      console.error('Error loading vans:', error);
    } else {
      setVans(data || []);
      if (data && data.length > 0) {
        setSelectedVan(data[0].id);
      }
    }
  };

  const loadProducts = async () => {
    try {
      // Try loading from IndexedDB first (offline-first)
      const { offlineStorage, STORES } = await import('@/lib/offlineStorage');
      let cachedProducts = await offlineStorage.getAll(STORES.PRODUCTS);
      let cachedVariants = await offlineStorage.getAll(STORES.VARIANTS);
      
      if (cachedProducts && cachedProducts.length > 0) {
        console.log('Loaded products from cache:', cachedProducts.length);
        
        // Enrich products with their variants (only active ones: is_active !== false)
        const enrichedProducts = cachedProducts.map((p: any) => ({
          id: p.id,
          name: p.name,
          unit: p.unit,
          rate: p.rate || 0,
          variants: (cachedVariants || []).filter((v: any) => v.product_id === p.id && v.is_active !== false)
        }));
        
        // Flatten to include both base products and active variants
        const allProducts: Product[] = [];
        enrichedProducts.forEach((p: any) => {
          // Add base product
          allProducts.push(p);
          // Add active variants as separate entries
          if (p.variants && p.variants.length > 0) {
            p.variants.forEach((v: any) => {
              allProducts.push({
                id: v.id,
                name: v.variant_name,
                unit: p.unit,
                rate: v.price || p.rate
              });
            });
          }
        });
        
        setProducts(allProducts);
      }
      
      // Try online fetch to update cache
      try {
        // Fetch all products where is_active is true OR null (treat null as active)
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('id, name, unit, rate')
          .or('is_active.eq.true,is_active.is.null')
          .order('name');
        
        if (productsError) {
          console.error('Error fetching products:', productsError);
        } else if (productsData) {
          // Fetch all active variants (is_active true or null)
          const { data: variantsData } = await supabase
            .from('product_variants')
            .select('*')
            .or('is_active.eq.true,is_active.is.null');
          
          console.log('Loaded products from database:', productsData.length);
          console.log('Loaded variants from database:', variantsData?.length || 0);
          
          // Enrich products with their variants
          const enrichedProducts = productsData.map((p: any) => ({
            ...p,
            variants: (variantsData || []).filter((v: any) => v.product_id === p.id)
          }));
          
          // Flatten to include both base products and active variants
          const allProducts: Product[] = [];
          enrichedProducts.forEach((p: any) => {
            // Add base product
            allProducts.push({
              id: p.id,
              name: p.name,
              unit: p.unit,
              rate: p.rate
            });
            // Add active variants as separate entries
            if (p.variants && p.variants.length > 0) {
              p.variants.forEach((v: any) => {
                allProducts.push({
                  id: v.id,
                  name: v.variant_name,
                  unit: p.unit,
                  rate: v.price || p.rate
                });
              });
            }
          });
          
          setProducts(allProducts);
          
          // Update cache
          const { offlineStorage, STORES } = await import('@/lib/offlineStorage');
          for (const product of productsData) {
            await offlineStorage.save(STORES.PRODUCTS, product);
          }
          if (variantsData) {
            for (const variant of variantsData) {
              await offlineStorage.save(STORES.VARIANTS, variant);
            }
          }
        }
      } catch (onlineError) {
        console.log('Online fetch failed, using cached products:', onlineError);
      }
    } catch (error) {
      console.error('Error loading products:', error);
      toast.error('Failed to load products');
    }
  };

  const loadBeatForDate = async () => {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session?.user) return;

    // Fetch all beat plans for the date (user may have multiple beats)
    const { data, error } = await supabase
      .from('beat_plans')
      .select('beat_id, beat_name')
      .eq('user_id', session.session.user.id)
      .eq('plan_date', selectedDate);

    if (error) {
      console.log('Error loading beat plans:', error);
      setBeats([]);
      setSelectedBeat('');
      return;
    }
    
    if (data && data.length > 0) {
      // Map all beats and auto-select the first one
      const beatsList = data.map(b => ({ id: b.beat_id, beat_name: b.beat_name }));
      setBeats(beatsList);
      setSelectedBeat(beatsList[0].id);
    } else {
      console.log('No beat plan found for this date - van stock can still be managed');
      setBeats([]);
      setSelectedBeat('');
    }
  };

  const loadTodayStock = async (clearEntryForm = false) => {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session?.user) return;

    const { data, error } = await supabase
      .from('van_stock')
      .select('*, van_stock_items(*)')
      .eq('van_id', selectedVan)
      .eq('stock_date', selectedDate)
      .eq('user_id', session.session.user.id)
      .maybeSingle();
    
    if (error) {
      console.error('Error loading stock:', error);
      setTodayStock(null);
      setStockItems([]);
    } else {
      // Always set todayStock with database data - this is used by modals
      setTodayStock(data);
      
      // Set KM values from database
      setStartKm(data?.start_km || 0);
      setEndKm(data?.end_km || 0);
      
      // Only clear entry form items if requested (after save)
      if (clearEntryForm) {
        setStockItems([]);
      } else if (!data?.van_stock_items || data.van_stock_items.length === 0) {
        setStockItems([]);
      }
      // If not clearEntryForm and there are saved items, don't touch stockItems (keeps entry form as-is)
    }
  };

  const calculateOrderedQuantities = async () => {
    if (!selectedBeat) return {};

    try {
      // Get all retailers in the selected beat
      const { data: retailers, error: retailerError } = await supabase
        .from('retailers')
        .select('id')
        .eq('beat_id', selectedBeat);

      if (retailerError) throw retailerError;
      
      const retailerIds = retailers?.map(r => r.id) || [];
      if (retailerIds.length === 0) return {};

      // Get all orders for today from retailers in this beat
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id')
        .in('retailer_id', retailerIds)
        .gte('created_at', `${selectedDate}T00:00:00`)
        .lte('created_at', `${selectedDate}T23:59:59`);

      if (ordersError) throw ordersError;

      const orderIds = orders?.map(o => o.id) || [];
      if (orderIds.length === 0) return {};

      // Get all order items for these orders
      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select('product_id, quantity')
        .in('order_id', orderIds);

      if (itemsError) throw itemsError;

      // Sum quantities by product
      const quantities: { [key: string]: number } = {};
      orderItems?.forEach(item => {
        quantities[item.product_id] = (quantities[item.product_id] || 0) + item.quantity;
      });

      return quantities;
    } catch (error) {
      console.error('Error calculating ordered quantities:', error);
      return {};
    }
  };

  const handleLoadPreviousStockConfirm = async () => {
    setShowLoadPreviousConfirm(false);
    
    if (!selectedVan) {
      toast.error('Please select a van first');
      return;
    }

    setLoadingPreviousStock(true);

    try {
      const vanInfo = vans.find(v => v.id === selectedVan);
      console.log('🔄 Loading previous closing stock for van:', vanInfo?.registration_number, 'before date:', selectedDate);
      
      // PRIORITY 1: Load from van_stock_items (left_qty) - this is the primary source
      // Query van_stock for the selected van, most recent date before selectedDate
      const { data: previousStocks, error: stockError } = await supabase
        .from('van_stock')
        .select('*, van_stock_items(*)')
        .eq('van_id', selectedVan)
        .lt('stock_date', selectedDate)
        .order('stock_date', { ascending: false });

      if (stockError) throw stockError;

      // Find the most recent stock with items that have left_qty > 0
      let loadedFromStock = false;
      if (previousStocks && previousStocks.length > 0) {
        for (const stock of previousStocks) {
          const itemsWithStock = (stock.van_stock_items || []).filter((item: any) => (item.left_qty || 0) > 0);
          
          if (itemsWithStock.length > 0) {
            console.log('📦 Found van_stock from date:', stock.stock_date, 'items with left_qty:', itemsWithStock.length);
            
            const newStockItems: StockItem[] = itemsWithStock.map((item: any) => ({
              product_id: item.product_id,
              product_name: item.product_name,
              unit: item.unit || '',
              start_qty: item.left_qty || 0, // Previous left becomes current start
              ordered_qty: 0,
              returned_qty: 0,
              left_qty: item.left_qty || 0, // Initially same as start
            }));

            console.log('✅ Loaded from van_stock_items:', newStockItems.length, 'items from:', stock.stock_date);
            setStockItems(newStockItems);
            
            // Also load end_km or start_km as reference for current start_km
            if (stock.end_km && stock.end_km > 0) {
              setStartKm(stock.end_km);
            } else if (stock.start_km && stock.start_km > 0) {
              // If end_km not filled, use start_km + some estimate
              setStartKm(stock.start_km);
            }
            
            toast.success(`Loaded ${newStockItems.length} items from ${new Date(stock.stock_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} (Left in Van)`);
            loadedFromStock = true;
            break; // Found valid stock, stop searching
          }
        }
      }

      if (loadedFromStock) {
        setLoadingPreviousStock(false);
        return;
      }

      // PRIORITY 2: Fallback to van_live_inventory (if no van_stock found)
      console.log('📋 No van_stock found, checking van_live_inventory...');
      
      const { data: liveInventory, error: liveError } = await supabase
        .from('van_live_inventory')
        .select(`
          *,
          products(name, unit)
        `)
        .eq('van_id', selectedVan)
        .lt('date', selectedDate)
        .gt('current_stock', 0)
        .order('date', { ascending: false });

      if (liveError) throw liveError;

      if (liveInventory && liveInventory.length > 0) {
        const mostRecentDate = liveInventory[0].date;
        const latestInventory = liveInventory.filter(item => item.date === mostRecentDate);
        
        const newStockItems: StockItem[] = latestInventory
          .filter((item: any) => (item.current_stock || 0) > 0)
          .map((item: any) => ({
            product_id: item.product_id,
            product_name: (item.products as any)?.name || 'Unknown Product',
            unit: (item.products as any)?.unit || '',
            start_qty: item.current_stock || 0,
            ordered_qty: 0,
            returned_qty: 0,
            left_qty: item.current_stock || 0,
          }));

        if (newStockItems.length > 0) {
          console.log('✅ Loaded from live inventory:', newStockItems.length, 'items from:', mostRecentDate);
          setStockItems(newStockItems);
          toast.success(`Loaded ${newStockItems.length} items from ${new Date(mostRecentDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`);
          setLoadingPreviousStock(false);
          return;
        }
      }

      toast.info('No previous closing stock found for this van');
    } catch (error) {
      console.error('Error loading previous stock:', error);
      toast.error('Failed to load previous van stock');
    } finally {
      setLoadingPreviousStock(false);
    }
  };
  
  const handleLoadPreviousStock = () => {
    if (!selectedVan) {
      toast.error('Please select a van first');
      return;
    }
    setShowLoadPreviousConfirm(true);
  };

  const handleAddProduct = () => {
    setStockItems([...stockItems, {
      product_id: '',
      product_name: '',
      unit: '',
      start_qty: 0,
      ordered_qty: 0,
      returned_qty: 0,
      left_qty: 0,
    }]);
  };

  const handleRemoveProduct = (index: number) => {
    setStockItems(stockItems.filter((_, i) => i !== index));
  };

  const handleProductChange = (index: number, field: keyof StockItem, value: any) => {
    const updated = [...stockItems];
    updated[index] = { ...updated[index], [field]: value };
    
    if (field === 'product_id') {
      const product = products.find(p => p.id === value);
      if (product) {
        updated[index].product_name = product.name;
        updated[index].unit = product.unit;
      }
    }

    // Only auto-calculate left_qty when start_qty or returned_qty changes
    // ordered_qty is now auto-calculated from orders
    if (field === 'start_qty' || field === 'returned_qty') {
      updated[index].left_qty = updated[index].start_qty - updated[index].ordered_qty + updated[index].returned_qty;
    }
    
    setStockItems(updated);
  };

  const handleSaveStock = async () => {
    if (!selectedVan) {
      toast.error('Please select a van');
      return;
    }

    if (!startKm || startKm === 0) {
      toast.error('Please enter the Start KM.');
      return;
    }

    if (stockItems.length === 0 || stockItems.some(item => !item.product_id)) {
      toast.error('Please add at least one product with valid details');
      return;
    }

    setLoading(true);
    const { data: session } = await supabase.auth.getSession();
    if (!session.session?.user) return;

    try {
      // Upsert van_stock - set status to 'morning_saved' when saving morning GRN
      const { data: vanStock, error: stockError } = await supabase
        .from('van_stock')
        .upsert({
          id: todayStock?.id,
          van_id: selectedVan,
          user_id: session.session.user.id,
          stock_date: selectedDate,
          status: 'morning_saved',
          start_km: startKm,
          end_km: endKm,
        }, {
          onConflict: 'van_id,stock_date,user_id',
        })
        .select()
        .single();

      if (stockError) throw stockError;

      // Get existing items from database
      const existingItems = todayStock?.van_stock_items || [];
      
      // Process each stock item - update existing or insert new
      for (const item of stockItems) {
        // Check if this product already exists in saved items
        const existingItem = existingItems.find((e: any) => e.product_id === item.product_id);
        
        if (existingItem) {
          // Update existing item
          const { error: updateError } = await supabase
            .from('van_stock_items')
            .update({
              product_name: item.product_name,
              start_qty: item.start_qty,
              ordered_qty: item.ordered_qty,
              returned_qty: item.returned_qty,
              left_qty: item.left_qty,
              unit: item.unit,
            })
            .eq('id', existingItem.id);
          
          if (updateError) throw updateError;
        } else {
          // Insert new item
          const { error: insertError } = await supabase
            .from('van_stock_items')
            .insert({
              van_stock_id: vanStock.id,
              product_id: item.product_id,
              product_name: item.product_name,
              start_qty: item.start_qty,
              ordered_qty: item.ordered_qty,
              returned_qty: item.returned_qty,
              left_qty: item.left_qty,
              unit: item.unit,
            });
          
          if (insertError) throw insertError;
        }
      }

      toast.success('Morning GRN saved successfully');
      // Clear the entry form after save - items are now in Product Stock in Van
      await loadTodayStock(true);
    } catch (error) {
      console.error('Error saving stock:', error);
      toast.error('Failed to save Morning GRN');
    } finally {
      setLoading(false);
    }
  };

  // Handle Save Closing GRN
  const handleSaveClosingGRN = async () => {
    if (!closingEndKm || closingEndKm <= 0) {
      toast.error('Please enter the End KM');
      return;
    }

    if (closingEndKm <= startKm) {
      toast.error('End KM must be greater than Start KM');
      return;
    }

    if (!closingStockVerified) {
      toast.error('Please verify the Left in Van stock by checking the checkbox');
      return;
    }

    setSavingClosingGRN(true);
    const { data: session } = await supabase.auth.getSession();
    if (!session.session?.user) return;

    try {
      // Update van_stock with end_km and status = 'closing_verified'
      // Note: total_km is a generated column, so we only update end_km
      const { error: updateError } = await supabase
        .from('van_stock')
        .update({
          end_km: closingEndKm,
          status: 'closing_verified',
        })
        .eq('id', todayStock.id);

      if (updateError) throw updateError;

      toast.success('Closing GRN saved successfully');
      setShowClosingGRNModal(false);
      setClosingStockVerified(false);
      await loadTodayStock(false);
      
      // Dispatch event for End Day functionality
      window.dispatchEvent(new CustomEvent('closingGRNVerified', { detail: { date: selectedDate } }));
    } catch (error) {
      console.error('Error saving closing GRN:', error);
      toast.error('Failed to save Closing GRN');
    } finally {
      setSavingClosingGRN(false);
    }
  };

  // Convert quantity to KG based on unit
  const convertToKg = (quantity: number, unit: string): number => {
    const lowerUnit = (unit || '').toLowerCase();
    if (lowerUnit === 'kg' || lowerUnit === 'kilogram' || lowerUnit === 'kilograms') {
      return quantity;
    } else if (lowerUnit === 'g' || lowerUnit === 'gram' || lowerUnit === 'grams') {
      return quantity / 1000;
    } else if (lowerUnit === 'l' || lowerUnit === 'liter' || lowerUnit === 'liters' || lowerUnit === 'litre' || lowerUnit === 'litres') {
      return quantity; // Treat liters as KG for beverages
    } else if (lowerUnit === 'ml' || lowerUnit === 'milliliter' || lowerUnit === 'milliliters') {
      return quantity / 1000;
    }
    return quantity; // Default: treat as is for pieces etc.
  };

  // Format KG value to "X KG Y g" format
  const formatKgDisplay = (totalKg: number): string => {
    const kg = Math.floor(totalKg);
    const grams = Math.round((totalKg - kg) * 1000);
    if (kg === 0 && grams === 0) {
      return '0 KG';
    }
    if (grams === 0) {
      return `${kg} KG`;
    }
    if (kg === 0) {
      return `${grams} g`;
    }
    return `${kg} KG ${grams} g`;
  };

  const calculateTotals = () => {
    // Combine saved items from database AND unsaved items from entry form
    const savedItems = todayStock?.van_stock_items || [];
    
    // Create a map to avoid double-counting products that exist in both
    const productTotals: { [productId: string]: { start: number; ordered: number; returned: number; left: number; unit: string } } = {};
    
    // First, add saved items
    savedItems.forEach((item: any) => {
      const unit = item.unit || 'piece';
      productTotals[item.product_id] = {
        start: item.start_qty || 0,
        ordered: item.ordered_qty || 0,
        returned: item.returned_qty || 0,
        left: (item.start_qty || 0) - (item.ordered_qty || 0) + (item.returned_qty || 0),
        unit
      };
    });
    
    // Then, add/override with unsaved entry form items (stockItems)
    stockItems.forEach((item) => {
      if (item.product_id) {
        const unit = item.unit || 'piece';
        productTotals[item.product_id] = {
          start: item.start_qty || 0,
          ordered: item.ordered_qty || 0,
          returned: item.returned_qty || 0,
          left: item.left_qty || 0,
          unit
        };
      }
    });
    
    // Calculate totals in KG
    let totalStartKg = 0;
    let totalOrderedKg = 0;
    let totalReturnedKg = 0;
    let totalLeftKg = 0;
    
    Object.values(productTotals).forEach((item) => {
      totalStartKg += convertToKg(item.start, item.unit);
      totalOrderedKg += convertToKg(item.ordered, item.unit);
      totalReturnedKg += convertToKg(item.returned, item.unit);
      totalLeftKg += convertToKg(item.left, item.unit);
    });
    
    return {
      totalStart: formatKgDisplay(totalStartKg),
      totalOrdered: formatKgDisplay(totalOrderedKg),
      totalReturned: formatKgDisplay(totalReturnedKg),
      totalLeft: formatKgDisplay(totalLeftKg),
    };
  };

  const handleExportToExcel = async () => {
    const savedItems = todayStock?.van_stock_items || [];
    if (savedItems.length === 0) {
      toast.error('No stock items to export');
      return;
    }

    // Fetch company details
    const { data: companyData } = await supabase.from('companies').select('*').limit(1).single();
    const company = companyData as any || {};
    
    const printDateTime = new Date().toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    });

    // Calculate totals
    let totalTaxable = 0;
    const itemsData = savedItems.map((item: any) => {
      const product = products.find(p => p.id === item.product_id);
      const priceWithGST = product?.rate || 0;
      const priceWithoutGST = priceWithGST / 1.05;
      const unit = (item.unit || '').toLowerCase();
      const qty = item.start_qty || 0;
      
      let qtyInKG = qty;
      let qtyDisplay = qty.toString();
      if (unit === 'grams' || unit === 'gram' || unit === 'g') {
        qtyInKG = qty / 1000;
        qtyDisplay = `${qty} (${qtyInKG.toFixed(3)} KG)`;
      }
      
      const totalValue = priceWithoutGST * qtyInKG;
      totalTaxable += totalValue;
      
      return {
        'Product': item.product_name,
        'Rate (Excl. GST)': `₹${priceWithoutGST.toFixed(2)}`,
        'Unit': item.unit,
        'Quantity': qtyDisplay,
        'Amount': `₹${totalValue.toFixed(2)}`
      };
    });

    const cgst = totalTaxable * 0.025;
    const sgst = totalTaxable * 0.025;
    const grandTotal = totalTaxable + cgst + sgst;

    // Create worksheet with header info
    const headerData = [
      ['DELIVERY CHALLAN'],
      [''],
      ['Company:', company.name || ''],
      ['Address:', company.address || ''],
      ['GSTIN:', company.gstin || ''],
      ['Phone:', company.contact_phone || ''],
      ['Email:', company.email || ''],
      ['State:', company.state || ''],
      [''],
      ['Date & Time:', printDateTime],
      ['Van:', vans.find(v => v.id === selectedVan)?.registration_number || ''],
      ['']
    ];

    const ws = XLSX.utils.aoa_to_sheet(headerData);
    XLSX.utils.sheet_add_json(ws, itemsData, { origin: 'A13' });
    
    // Add totals at the end
    const lastRow = 13 + itemsData.length + 1;
    XLSX.utils.sheet_add_aoa(ws, [
      [''],
      ['', '', '', 'Taxable Amount:', `₹${totalTaxable.toFixed(2)}`],
      ['', '', '', 'CGST (2.5%):', `₹${cgst.toFixed(2)}`],
      ['', '', '', 'SGST (2.5%):', `₹${sgst.toFixed(2)}`],
      ['', '', '', 'Grand Total:', `₹${grandTotal.toFixed(2)}`],
      [''],
      ['Bank Details:'],
      ['Bank:', company.bank_name || ''],
      ['Account:', company.bank_account || ''],
      ['IFSC:', company.ifsc || ''],
      ['A/c Holder:', company.account_holder_name || ''],
      ['UPI ID:', company.qr_upi || ''],
      [''],
      ['Terms & Conditions:'],
      [company.terms_conditions || '']
    ], { origin: `A${lastRow}` });
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Delivery Challan');
    
    const fileName = `Delivery_Challan_${selectedDate}.xlsx`;
    await downloadExcel(wb, fileName, XLSX);
  };

  const handleExportToPDF = async () => {
    try {
      toast.info('Generating PDF...');
      
      const savedItems = todayStock?.van_stock_items || [];
      if (savedItems.length === 0) {
        toast.error('No stock items to export');
        return;
      }

      // Fetch company details
      const { data: companyData } = await supabase.from('companies').select('*').limit(1).single();
      const company = companyData as any || {};

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      const printDateTime = new Date().toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true
      });

      let yPos = 10;

      // Company Logo
      if (company.logo_url) {
        try {
          const logoResponse = await fetch(company.logo_url);
          const logoBlob = await logoResponse.blob();
          const logoBase64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(logoBlob);
          });
          doc.addImage(logoBase64, 'PNG', 14, yPos, 30, 20);
          yPos = 12;
        } catch (e) {
          console.log('Could not load logo:', e);
        }
      }

      // Company Name & Header
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(company.name || 'Company Name', company.logo_url ? 50 : 14, yPos + 4);
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(company.address || '', company.logo_url ? 50 : 14, yPos + 10, { maxWidth: 100 });
      
      // Right side - GSTIN, Phone, Email, State
      doc.setFontSize(8);
      const rightX = pageWidth - 14;
      doc.text(`GSTIN: ${company.gstin || ''}`, rightX, yPos + 4, { align: 'right' });
      doc.text(`Phone: ${company.contact_phone || ''}`, rightX, yPos + 9, { align: 'right' });
      doc.text(`Email: ${company.email || ''}`, rightX, yPos + 14, { align: 'right' });
      doc.text(`State: ${company.state || ''}`, rightX, yPos + 19, { align: 'right' });

      yPos = 36;
      
      // Horizontal line
      doc.setDrawColor(34, 139, 34);
      doc.setLineWidth(1);
      doc.line(14, yPos, pageWidth - 14, yPos);
      yPos += 6;

      // DELIVERY CHALLAN heading
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(34, 139, 34);
      doc.text('DELIVERY CHALLAN', pageWidth / 2, yPos, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      yPos += 8;

      // Date/Time and Van info
      const selectedVanData = vans.find(v => v.id === selectedVan);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Date & Time: ${printDateTime}`, 14, yPos);
      doc.text(`Van: ${selectedVanData?.registration_number || ''} - ${selectedVanData?.make_model || ''}`, rightX, yPos, { align: 'right' });
      yPos += 6;

      // Calculate totals
      let totalKGs = 0;
      let totalTaxable = 0;
      const tableData = savedItems.map((item: any) => {
        const product = products.find(p => p.id === item.product_id);
        const priceWithGST = product?.rate || 0;
        const priceWithoutGST = priceWithGST / 1.05;
        const qty = item.start_qty || 0;
        const unit = (item.unit || '').toLowerCase();
        
        let qtyDisplay = qty.toString();
        let qtyInKG = qty;
        if (unit === 'grams' || unit === 'gram' || unit === 'g') {
          qtyInKG = qty / 1000;
          totalKGs += qtyInKG;
          qtyDisplay = `${qty}`;
        } else if (unit === 'kg' || unit === 'kgs') {
          totalKGs += qty;
        }
        
        const totalVal = priceWithoutGST * qtyInKG;
        totalTaxable += totalVal;
        
        return [
          item.product_name,
          `₹${priceWithoutGST.toFixed(2)}`,
          item.unit || '',
          qtyDisplay,
          `₹${totalVal.toFixed(2)}`
        ];
      });

      // Products table with reduced spacing
      autoTable(doc, {
        startY: yPos,
        head: [['Product', 'Rate', 'Unit', 'Qty', 'Amount']],
        body: tableData,
        styles: { 
          fontSize: 8, 
          cellPadding: 1.5,
          lineColor: [200, 200, 200],
          lineWidth: 0.3
        },
        headStyles: { 
          fillColor: [34, 139, 34], 
          textColor: 255, 
          fontStyle: 'bold',
          halign: 'center',
          cellPadding: 2
        },
        alternateRowStyles: { fillColor: [245, 250, 245] },
        columnStyles: {
          0: { cellWidth: 55 },
          1: { cellWidth: 28, halign: 'right' },
          2: { cellWidth: 22, halign: 'center' },
          3: { cellWidth: 25, halign: 'center' },
          4: { cellWidth: 32, halign: 'right' }
        },
        margin: { left: 14, right: 14 }
      });

      let finalY = (doc as any).lastAutoTable.finalY + 3;
      
      // Check if we need new page for totals
      if (finalY > 240) {
        doc.addPage();
        finalY = 20;
      }

      // Tax breakdown box
      const cgst = totalTaxable * 0.025;
      const sgst = totalTaxable * 0.025;
      const grandTotal = totalTaxable + cgst + sgst;
      
      const boxX = pageWidth - 80;
      doc.setFillColor(250, 250, 250);
      doc.rect(boxX, finalY, 66, 28, 'F');
      doc.setDrawColor(34, 139, 34);
      doc.rect(boxX, finalY, 66, 28, 'S');
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('Taxable Amount:', boxX + 3, finalY + 5);
      doc.text(`₹${totalTaxable.toFixed(2)}`, boxX + 63, finalY + 5, { align: 'right' });
      doc.text('CGST (2.5%):', boxX + 3, finalY + 10);
      doc.text(`₹${cgst.toFixed(2)}`, boxX + 63, finalY + 10, { align: 'right' });
      doc.text('SGST (2.5%):', boxX + 3, finalY + 15);
      doc.text(`₹${sgst.toFixed(2)}`, boxX + 63, finalY + 15, { align: 'right' });
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('Grand Total:', boxX + 3, finalY + 22);
      doc.text(`₹${grandTotal.toFixed(2)}`, boxX + 63, finalY + 22, { align: 'right' });

      // Total KGs display
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(`Total Weight: ${totalKGs.toFixed(2)} KG`, 14, finalY + 8);
      doc.text(`Total Items: ${savedItems.length}`, 14, finalY + 14);

      finalY += 34;

      // Check if we need new page for bank details
      if (finalY > 230) {
        doc.addPage();
        finalY = 20;
      }

      // Bank Details section
      doc.setFillColor(245, 245, 245);
      doc.rect(14, finalY, 85, 30, 'F');
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('Bank Details', 16, finalY + 5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.text(`Bank: ${company.bank_name || ''}`, 16, finalY + 10);
      doc.text(`A/C No: ${company.bank_account || ''}`, 16, finalY + 14);
      doc.text(`IFSC: ${company.ifsc || ''}`, 16, finalY + 18);
      doc.text(`A/C Holder: ${company.account_holder_name || ''}`, 16, finalY + 22);
      doc.text(`UPI ID: ${company.qr_upi || ''}`, 16, finalY + 26);

      // QR Code
      if (company.qr_code_url) {
        try {
          const qrResponse = await fetch(company.qr_code_url);
          const qrBlob = await qrResponse.blob();
          const qrBase64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(qrBlob);
          });
          doc.addImage(qrBase64, 'PNG', pageWidth - 50, finalY, 36, 36);
        } catch (e) {
          console.log('Could not load QR code:', e);
        }
      }

      finalY += 38;

      // Terms & Conditions
      if (company.terms_conditions) {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('Terms & Conditions:', 14, finalY);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        const terms = doc.splitTextToSize(company.terms_conditions, pageWidth - 28);
        doc.text(terms, 14, finalY + 4);
      }

      toast.info('Saving PDF...');
      const pdfBlob = doc.output('blob');
      const success = await downloadPDF(pdfBlob, `Delivery_Challan_${selectedDate}.pdf`);
      
      if (!success) {
        toast.error('PDF save failed - check app permissions');
      }
    } catch (error: any) {
      console.error('PDF export error:', error);
      toast.error(`PDF Error: ${error.message || 'Unknown error'}`);
    }
  };

  const handlePrint = () => {
    const savedItems = todayStock?.van_stock_items || [];
    if (savedItems.length === 0) {
      toast.error('No stock items to print');
      return;
    }

    const doc = new jsPDF();
    const dateStr = new Date(selectedDate).toLocaleDateString('en-IN', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Product Stock in Van', 14, 20);
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    const selectedVanData = vans.find(v => v.id === selectedVan);
    doc.text(`Date: ${dateStr}`, 14, 28);
    if (selectedVanData) {
      doc.text(`Van: ${selectedVanData.registration_number} - ${selectedVanData.make_model}`, 14, 35);
    }

    // Calculate totals with proper gram to KG conversion
    // Price is per KG, so we need to convert grams to KG for value calculation
    let totalKGs = 0;
    const totalValue = savedItems.reduce((sum: number, item: any) => {
      const product = products.find(p => p.id === item.product_id);
      const priceWithoutGST = (product?.rate || 0) / 1.05; // Price per KG
      const unit = (item.unit || '').toLowerCase();
      const qty = item.start_qty || 0;
      
      // Convert grams to KG for both weight and value calculation
      let qtyInKG = qty;
      if (unit === 'grams' || unit === 'gram' || unit === 'g') {
        qtyInKG = qty / 1000;
        totalKGs += qtyInKG;
      } else if (unit === 'kg' || unit === 'kgs') {
        totalKGs += qty;
      }
      
      // Calculate value using quantity in KG since price is per KG
      return sum + (priceWithoutGST * qtyInKG);
    }, 0);
    
    doc.setFontSize(10);
    doc.text(`Total Items: ${savedItems.length}`, 14, 42);
    doc.text(`Total KGs in Van: ${totalKGs.toFixed(2)} KG`, 14, 48);
    doc.text(`Total Value (Excl. GST): Rs. ${totalValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 14, 54);

    const tableData = savedItems.map((item: any) => {
      const product = products.find(p => p.id === item.product_id);
      const priceWithGST = product?.rate || 0;
      const priceWithoutGST = priceWithGST / 1.05;
      const qty = item.start_qty || 0;
      const unit = (item.unit || '').toLowerCase();
      
      let qtyDisplay = qty.toString();
      let unitDisplay = item.unit || '';
      
      // For grams, show both grams and KG equivalent
      let qtyInKG = qty;
      if (unit === 'grams' || unit === 'gram' || unit === 'g') {
        qtyInKG = qty / 1000;
        qtyDisplay = `${qty} (${qtyInKG.toFixed(3)} KG)`;
      }
      
      // Price is per KG, so calculate total using quantity in KG
      const totalVal = priceWithoutGST * qtyInKG;
      
      return [
        item.product_name,
        `Rs. ${priceWithoutGST.toFixed(2)}`,
        unitDisplay,
        qtyDisplay,
        `Rs. ${totalVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      ];
    });

    autoTable(doc, {
      startY: 60,
      head: [['Product', 'Price (Excl. GST)', 'Unit', 'Quantity', 'Total Value']],
      body: tableData,
      styles: { 
        fontSize: 9, 
        cellPadding: 4,
        lineColor: [200, 200, 200],
        lineWidth: 0.5
      },
      headStyles: { 
        fillColor: [59, 130, 246], 
        textColor: 255, 
        fontStyle: 'bold',
        halign: 'center'
      },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      columnStyles: {
        0: { cellWidth: 45 },
        1: { cellWidth: 35, halign: 'right' },
        2: { cellWidth: 20, halign: 'center' },
        3: { cellWidth: 45, halign: 'center' },
        4: { cellWidth: 40, halign: 'right' }
      },
      tableLineColor: [100, 100, 100],
      tableLineWidth: 0.1
    });

    // Add footer with total
    const finalY = (doc as any).lastAutoTable.finalY || 60;
    doc.setFillColor(240, 240, 240);
    doc.rect(14, finalY + 2, 181, 10, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`Grand Total: Rs. ${totalValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${totalKGs.toFixed(2)} KG)`, 14, finalY + 9);

    // Open print dialog
    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    const printWindow = window.open(pdfUrl);
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };

  const totals = calculateTotals();
  const totalKm = endKm - startKm;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto w-[95vw]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm sm:text-base">
              <Truck className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
              <span className="truncate">Van Stock - {new Date(selectedDate).toLocaleDateString('en-IN', { 
                day: 'numeric', 
                month: 'short',
                year: 'numeric' 
              })}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Select Van</Label>
                <Select value={selectedVan} onValueChange={setSelectedVan}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a van" />
                  </SelectTrigger>
                  <SelectContent>
                    {vans.map(van => (
                      <SelectItem key={van.id} value={van.id}>
                        {van.registration_number} - {van.make_model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Beat (Auto-selected from plan)</Label>
                <Select value={selectedBeat} disabled>
                  <SelectTrigger>
                    <SelectValue placeholder={selectedBeat ? undefined : "No beat planned for this date"} />
                  </SelectTrigger>
                  <SelectContent>
                    {beats.length > 0 ? (
                      beats.map(beat => (
                        <SelectItem key={beat.id} value={beat.id}>
                          {beat.beat_name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>No beat planned</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                
                {/* Load Previous Van Stock Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLoadPreviousStock}
                  disabled={!selectedVan || loadingPreviousStock}
                  className="w-full gap-2 text-xs border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950 hover:bg-amber-100 dark:hover:bg-amber-900 text-amber-700 dark:text-amber-300"
                >
                  <History className="h-3.5 w-3.5" />
                  {loadingPreviousStock ? 'Loading...' : 'Load Previous Van Stock'}
                </Button>
              </div>
            </div>

            {selectedVan && selectedBeat && (
              <>
                {/* Summary Cards with Recalculate Button */}
                <div className="bg-blue-50 dark:bg-blue-950 p-2 rounded-lg border border-blue-200 dark:border-blue-800 mb-3 flex items-center justify-between">
                  <p className="text-xs text-blue-800 dark:text-blue-200">
                    <strong>Note:</strong> Orders from today's beat are auto-counted here.
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRecalculateStock}
                    disabled={isRecalculating}
                    className="text-xs h-7 gap-1 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900"
                  >
                    <RefreshCw className={cn("h-3 w-3", isRecalculating && "animate-spin")} />
                    {isRecalculating ? 'Recalculating...' : 'Recalculate'}
                  </Button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <Card 
                    className="p-2.5 cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => setShowDetailModal('start')}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <Package className="h-4 w-4 text-primary" />
                      <Eye className="h-3 w-3 text-muted-foreground" />
                    </div>
                    <p className="text-[10px] text-muted-foreground mb-0.5">Product Stock in Van</p>
                    <p className="text-base sm:text-lg font-bold leading-tight">{totals.totalStart}</p>
                  </Card>

                  <Card 
                    className="p-2.5 cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => setShowDetailModal('ordered')}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <ShoppingCart className="h-4 w-4 text-amber-500" />
                      <Eye className="h-3 w-3 text-muted-foreground" />
                    </div>
                    <p className="text-[10px] text-muted-foreground mb-0.5">Retailer Ordered Qty</p>
                    <p className="text-base sm:text-lg font-bold leading-tight">{totals.totalOrdered}</p>
                    <Badge variant="secondary" className="mt-1 text-[9px] px-1 py-0">Auto-calculated</Badge>
                  </Card>

                  <Card 
                    className="p-2.5 cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => setShowDetailModal('returned')}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <Package className="h-4 w-4 text-blue-600" />
                      <Eye className="h-3 w-3 text-muted-foreground" />
                    </div>
                    <p className="text-[10px] text-muted-foreground mb-0.5">Returned Qty</p>
                    <p className="text-base sm:text-lg font-bold leading-tight">{totals.totalReturned}</p>
                  </Card>

                  <Card 
                    className="p-2.5 cursor-pointer hover:bg-accent transition-colors bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800"
                    onClick={() => setShowDetailModal('left')}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <TrendingDown className="h-4 w-4 text-green-600" />
                      <Eye className="h-3 w-3 text-muted-foreground" />
                    </div>
                    <p className="text-[10px] text-green-700 dark:text-green-300 font-medium mb-0.5">Left in the Van</p>
                    <p className="text-base sm:text-lg font-bold leading-tight text-green-700 dark:text-green-300">{totals.totalLeft}</p>
                  </Card>
                </div>

                {/* KM Tracking */}
                <Card className="p-2.5 bg-blue-50 dark:bg-blue-950">
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label className="text-[10px] font-semibold">Start KM</Label>
                      <Input
                        type="number"
                        value={startKm || ''}
                        onChange={(e) => setStartKm(parseFloat(e.target.value) || 0)}
                        onFocus={(e) => e.target.select()}
                        placeholder="Start"
                        className="mt-0.5 h-8 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] font-semibold">End KM</Label>
                      <Input
                        type="number"
                        value={endKm || ''}
                        onChange={(e) => setEndKm(parseFloat(e.target.value) || 0)}
                        onFocus={(e) => e.target.select()}
                        placeholder="End"
                        className="mt-0.5 h-8 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] font-semibold">Total KM</Label>
                      <div className="mt-0.5 h-8 px-2 py-1 bg-primary/10 rounded-md border border-primary/20 flex items-center justify-center">
                        <span className="text-xs font-bold text-primary">
                          {endKm > 0 ? totalKm.toFixed(2) : '-'}
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Stock Items Management */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <Label className="text-sm sm:text-lg font-semibold">Add Stock Items</Label>
                    <Button size="sm" onClick={handleAddProduct} className="h-8 text-xs">
                      <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1" /> Add Product
                    </Button>
                  </div>

                  {stockItems.length > 0 && (
                    <div className="space-y-1.5">
                      {stockItems.map((item, index) => {
                        const selectedProduct = products.find(p => p.id === item.product_id);
                        const pricePerUnit = selectedProduct?.rate || 0;
                        
                        return (
                          <Card key={index} className="p-1.5">
                            <div className="flex items-end gap-1">
                              <div className="flex-1 min-w-0">
                                <Label className="text-[9px] text-muted-foreground mb-0.5 block">Product</Label>
                                <Popover 
                                  open={openProductPopovers[index]} 
                                  onOpenChange={(open) => setOpenProductPopovers(prev => ({ ...prev, [index]: open }))}
                                >
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="outline"
                                      role="combobox"
                                      aria-expanded={openProductPopovers[index]}
                                      className="w-full justify-between h-auto py-1.5 px-2 font-normal"
                                    >
                                      {selectedProduct ? (
                                        <div className="flex flex-col items-start text-left flex-1 min-w-0">
                                          <span className="truncate text-[11px] leading-tight w-full">{selectedProduct.name}</span>
                                          <span className="text-[9px] text-muted-foreground leading-tight">₹{pricePerUnit.toFixed(2)} per {selectedProduct.unit}</span>
                                        </div>
                                      ) : (
                                        <span className="text-muted-foreground text-[11px]">Select...</span>
                                      )}
                                      <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-[280px] p-0 bg-background z-[100]" align="start">
                                    <Command className="bg-background">
                                      <CommandInput placeholder="Search products..." className="h-9 text-xs" />
                                      <CommandList className="bg-background max-h-[250px] overflow-y-auto overscroll-contain">
                                        <CommandEmpty>No product found.</CommandEmpty>
                                        <CommandGroup className="bg-background">
                                          {products.map((product) => (
                                            <CommandItem
                                              key={product.id}
                                              value={`${product.name} ${product.rate}`}
                                              onSelect={() => {
                                                handleProductChange(index, 'product_id', product.id);
                                                setOpenProductPopovers(prev => ({ ...prev, [index]: false }));
                                              }}
                                              className="text-xs bg-background hover:bg-accent py-1"
                                            >
                                              <Check
                                                className={cn(
                                                  "mr-2 h-3 w-3",
                                                  item.product_id === product.id ? "opacity-100" : "opacity-0"
                                                )}
                                              />
                                              <div className="flex-1 leading-tight">
                                                <div className="font-medium leading-tight">{product.name}</div>
                                                <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                                                  ₹{product.rate.toFixed(2)} per {product.unit}
                                                </div>
                                              </div>
                                            </CommandItem>
                                          ))}
                                        </CommandGroup>
                                      </CommandList>
                                    </Command>
                                  </PopoverContent>
                                </Popover>
                              </div>
                              
                              <div className="w-12">
                                <Label className="text-[9px] text-muted-foreground mb-0.5 block">Unit</Label>
                                <Select
                                  value={item.unit}
                                  onValueChange={(value) => handleProductChange(index, 'unit', value)}
                                >
                                  <SelectTrigger className="h-8 text-[11px] px-1.5">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="z-[100]">
                                    <SelectItem value="kg" className="text-[11px]">KG</SelectItem>
                                    <SelectItem value="grams" className="text-[11px]">g</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              
                              <div className="w-14">
                                <Label className="text-[9px] text-muted-foreground mb-0.5 block">Qty</Label>
                                <Input
                                  type="number"
                                  value={item.start_qty || ''}
                                  onChange={(e) => handleProductChange(index, 'start_qty', parseInt(e.target.value) || 0)}
                                  onFocus={(e) => e.target.select()}
                                  placeholder="0"
                                  className="h-8 text-[11px] px-1.5 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  min="0"
                                />
                              </div>
                              
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                onClick={() => handleRemoveProduct(index)}
                                className="h-7 w-7 p-0 shrink-0"
                                title="Remove product"
                              >
                                <Trash2 className="h-3 w-3 text-destructive" />
                              </Button>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Action Buttons - Morning GRN / Closing GRN */}
                <div className="space-y-2 pt-3 border-t">
                  <div className="flex gap-2">
                    {/* Save Morning GRN */}
                    <Button 
                      onClick={handleSaveStock} 
                      disabled={loading || isClosingGRNVerified} 
                      className="flex-1 h-9 text-sm bg-amber-600 hover:bg-amber-700"
                    >
                      {loading ? 'Saving...' : isMorningGRNSaved ? '✓ Morning GRN Saved' : 'Save Morning GRN'}
                    </Button>
                  </div>
                  
                  <div className="flex gap-2">
                    {/* Save Closing GRN - only enabled after Morning GRN is saved */}
                    <Button 
                      onClick={() => {
                        setClosingEndKm(endKm || 0);
                        setShowClosingGRNModal(true);
                      }}
                      disabled={!isMorningGRNSaved || isClosingGRNVerified}
                      variant={isClosingGRNVerified ? "default" : "outline"}
                      className={cn(
                        "flex-1 h-9 text-sm",
                        !isMorningGRNSaved && "opacity-50 cursor-not-allowed",
                        isClosingGRNVerified && "bg-green-600 hover:bg-green-700"
                      )}
                    >
                      {isClosingGRNVerified ? '✓ Closing GRN Verified' : 'Save Closing GRN'}
                    </Button>
                    <Button variant="outline" onClick={() => onOpenChange(false)} className="h-9 text-sm">
                      Close
                    </Button>
                  </div>
                  
                  {!isMorningGRNSaved && (
                    <p className="text-[10px] text-muted-foreground text-center">
                      Save Morning GRN first to enable Closing GRN option
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Modal */}
      <Dialog open={!!showDetailModal} onOpenChange={() => setShowDetailModal(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 w-full">
              {showDetailModal === 'start' && (
                <div className="flex flex-col gap-2 w-full">
                  <div className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-primary" />
                    <span>Product Stock in Van</span>
                  </div>
                  <div className="flex gap-1">
                    <Button 
                      size="sm" 
                      onClick={() => {
                        const savedItems = todayStock?.van_stock_items || [];
                        if (savedItems.length === 0) {
                          toast.info('No stock items to edit');
                          return;
                        }
                        const itemsToEdit = savedItems.map((item: any) => ({
                          id: item.id,
                          product_id: item.product_id,
                          product_name: item.product_name,
                          unit: item.unit,
                          start_qty: item.start_qty,
                          ordered_qty: item.ordered_qty || 0,
                          returned_qty: item.returned_qty || 0,
                          left_qty: item.start_qty - (item.ordered_qty || 0) + (item.returned_qty || 0),
                        }));
                        setStockItems(itemsToEdit);
                        setShowDetailModal(null);
                        toast.info('All items loaded for editing. Modify and click Save Stock.');
                      }}
                      variant="outline" 
                      className="h-6 w-6 p-0"
                      title="Edit All"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="outline" className="h-6 w-6 p-0" title="Download">
                          <Download className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-background border shadow-lg z-50">
                        <DropdownMenuItem onClick={handleExportToPDF} className="cursor-pointer text-xs">
                          <FileText className="h-3 w-3 mr-2 text-red-500" /> PDF
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleExportToExcel} className="cursor-pointer text-xs">
                          <FileSpreadsheet className="h-3 w-3 mr-2 text-green-600" /> Excel
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button size="sm" onClick={handlePrint} variant="outline" className="h-6 w-6 p-0" title="Print">
                      <Printer className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
              {showDetailModal === 'ordered' && (
                <div className="flex items-center gap-2 w-full">
                  <ShoppingCart className="h-5 w-5 text-amber-500" />
                  <span>Retailer Ordered Qty (Beat: {beats.find(b => b.id === selectedBeat)?.beat_name})</span>
                  <Badge variant="secondary" className="ml-auto">Auto-calculated</Badge>
                </div>
              )}
              {showDetailModal === 'returned' && <><Package className="h-5 w-5 text-blue-600" /> Returned Qty</>}
              {showDetailModal === 'left' && <><TrendingDown className="h-5 w-5 text-green-600" /> Left in the Van</>}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {(() => {
              // Combine saved items from database AND unsaved loaded items from stockItems
              const savedItems = todayStock?.van_stock_items || [];
              
              // Create a map of all items to display (prioritize saved, add unsaved)
              const displayItems: any[] = [];
              const seenProductIds = new Set<string>();
              
              // First add all saved items
              savedItems.forEach((item: any) => {
                displayItems.push({ ...item, isSaved: true });
                seenProductIds.add(item.product_id);
              });
              
              // Then add unsaved items that aren't in saved (loaded from previous stock)
              stockItems.forEach((item) => {
                if (item.product_id && !seenProductIds.has(item.product_id)) {
                  displayItems.push({ ...item, isSaved: false });
                  seenProductIds.add(item.product_id);
                }
              });
              
              if (displayItems.length === 0) {
                return (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No stock items saved yet</p>
                  </div>
                );
              }
              
              return displayItems.map((item: any, index: number) => {
                const product = products.find(p => p.id === item.product_id);
                const priceWithGST = product?.rate || 0;
                const priceWithoutGST = priceWithGST / 1.05;
                
                return (
                  <Card key={index} className={cn("p-3 hover:bg-accent transition-colors", !item.isSaved && "border-amber-300 bg-amber-50/50 dark:bg-amber-950/20")}>
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{item.product_name}</p>
                          {!item.isSaved && (
                            <Badge variant="outline" className="text-[9px] text-amber-600 border-amber-400">Unsaved</Badge>
                          )}
                        </div>
                        {showDetailModal === 'start' && (
                          <p className="text-xs text-muted-foreground">
                            ₹{priceWithoutGST.toFixed(2)} (excl. GST) • {item.unit}
                          </p>
                        )}
                        {showDetailModal !== 'start' && (
                          <p className="text-xs text-muted-foreground">{item.unit}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-base md:text-2xl font-bold">
                            {(() => {
                              let qty = 0;
                              if (showDetailModal === 'start') qty = item.start_qty || 0;
                              else if (showDetailModal === 'ordered') qty = item.ordered_qty || 0;
                              else if (showDetailModal === 'returned') qty = item.returned_qty || 0;
                              else if (showDetailModal === 'left') qty = (item.start_qty || 0) - (item.ordered_qty || 0) + (item.returned_qty || 0);
                              
                              // Convert to KG and format as "X KG Y g"
                              const qtyInKg = convertToKg(qty, item.unit || 'kg');
                              return formatKgDisplay(qtyInKg);
                            })()}
                          </p>
                        </div>
                        {showDetailModal === 'start' && item.isSaved && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            onClick={async () => {
                              if (!confirm('Delete this item from stock?')) return;
                              // Delete from database
                              if (item.id && todayStock?.id) {
                                await supabase
                                  .from('van_stock_items')
                                  .delete()
                                  .eq('id', item.id);
                                toast.success('Item deleted');
                                await loadTodayStock(false);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              });
            })()}
            
            {(() => {
              // Calculate totals from both saved and unsaved items
              const savedItems = todayStock?.van_stock_items || [];
              const seenProductIds = new Set<string>();
              const allItems: any[] = [];
              
              savedItems.forEach((item: any) => {
                allItems.push(item);
                seenProductIds.add(item.product_id);
              });
              
              stockItems.forEach((item) => {
                if (item.product_id && !seenProductIds.has(item.product_id)) {
                  allItems.push(item);
                  seenProductIds.add(item.product_id);
                }
              });
              
              if (allItems.length === 0) return null;
              
              let totalGrams = 0;
              
              allItems.forEach((item: any) => {
                const unit = (item.unit || '').toLowerCase();
                let qty = 0;
                
                if (showDetailModal === 'start') qty = item.start_qty || 0;
                else if (showDetailModal === 'ordered') qty = item.ordered_qty || 0;
                else if (showDetailModal === 'returned') qty = item.returned_qty || 0;
                else if (showDetailModal === 'left') qty = (item.start_qty || 0) - (item.ordered_qty || 0) + (item.returned_qty || 0);
                
                // Convert everything to grams for accurate calculation
                if (unit === 'kg' || unit === 'kgs') {
                  totalGrams += qty * 1000;
                } else if (unit === 'grams' || unit === 'gram' || unit === 'g') {
                  totalGrams += qty;
                } else {
                  // Default treat as KG
                  totalGrams += qty * 1000;
                }
              });
              
              // Convert to KG and Grams display
              const fullKg = Math.floor(totalGrams / 1000);
              const remainingGrams = Math.round(totalGrams % 1000);
              
              let displayTotal = '';
              if (remainingGrams === 0) {
                displayTotal = `${fullKg} KG`;
              } else if (fullKg === 0) {
                displayTotal = `${remainingGrams} Grams`;
              } else {
                displayTotal = `${fullKg} KG ${remainingGrams} Grams`;
              }
              
              return (
                <Card className="p-4 bg-primary/5 border-primary">
                  <div className="flex justify-between items-center">
                    <p className="font-bold text-sm md:text-lg">Total</p>
                    <p className="text-base md:text-2xl font-bold text-primary">{displayTotal}</p>
                  </div>
                </Card>
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Confirmation Dialog for Loading Previous Stock */}
      <AlertDialog open={showLoadPreviousConfirm} onOpenChange={setShowLoadPreviousConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Load Previous Van Stock?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to load the data from Previous Left Stock in Van to Product Stock in Van? This will replace your current unsaved stock entries.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleLoadPreviousStockConfirm}>
              Yes, Load Previous Stock
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Closing GRN Modal */}
      <Dialog open={showClosingGRNModal} onOpenChange={setShowClosingGRNModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-green-600" />
              Save Closing GRN
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Summary of Left in Van */}
            <Card className="p-3 bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-700 dark:text-green-300">Left in Van</span>
                </div>
                <span className="text-lg font-bold text-green-700 dark:text-green-300">{totals.totalLeft}</span>
              </div>
            </Card>
            
            {/* KM Input Section */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold">Start KM</Label>
                  <Input
                    type="number"
                    value={startKm || ''}
                    disabled
                    className="mt-1 h-9 text-sm bg-muted"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">End KM *</Label>
                  <Input
                    type="number"
                    value={closingEndKm || ''}
                    onChange={(e) => setClosingEndKm(parseFloat(e.target.value) || 0)}
                    onFocus={(e) => e.target.select()}
                    placeholder="Enter End KM"
                    className="mt-1 h-9 text-sm"
                  />
                </div>
              </div>
              
              {closingEndKm > startKm && (
                <div className="flex items-center justify-center p-2 bg-primary/10 rounded-md">
                  <span className="text-sm font-medium">Total Distance: <strong className="text-primary">{(closingEndKm - startKm).toFixed(1)} KM</strong></span>
                </div>
              )}
            </div>
            
            {/* Stock Verification Checkbox */}
            <Card className="p-3 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="verify-stock"
                  checked={closingStockVerified}
                  onCheckedChange={(checked) => setClosingStockVerified(checked === true)}
                  className="mt-0.5"
                />
                <div>
                  <Label htmlFor="verify-stock" className="text-sm font-medium cursor-pointer">
                    I verify that the Left in Van stock quantity is correct
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Please verify the physical stock matches the displayed quantity before saving.
                  </p>
                </div>
              </div>
            </Card>
            
            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <Button 
                onClick={handleSaveClosingGRN}
                disabled={savingClosingGRN || !closingStockVerified || !closingEndKm || closingEndKm <= startKm}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {savingClosingGRN ? 'Saving...' : 'Confirm & Save Closing GRN'}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowClosingGRNModal(false);
                  setClosingStockVerified(false);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

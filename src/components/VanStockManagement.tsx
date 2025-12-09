import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Truck, Package, ShoppingCart, TrendingDown, Plus, Eye, Trash2, Check, ChevronsUpDown, Download, Edit, FileText, FileSpreadsheet, Printer, ChevronDown } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from '@/components/ui/badge';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  const [showDetailModal, setShowDetailModal] = useState<'start' | 'ordered' | 'returned' | 'left' | 'inventory' | null>(null);
  const [isMorning, setIsMorning] = useState(true);
  const [startKm, setStartKm] = useState(0);
  const [endKm, setEndKm] = useState(0);

  useEffect(() => {
    if (open) {
      loadVans();
      loadProducts();
      loadBeatForDate();
      checkTime();
    }
  }, [open, selectedDate]);

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

    return () => {
      supabase.removeChannel(channel);
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
      // Upsert van_stock
      const { data: vanStock, error: stockError } = await supabase
        .from('van_stock')
        .upsert({
          id: todayStock?.id,
          van_id: selectedVan,
          user_id: session.session.user.id,
          stock_date: selectedDate,
          status: 'open',
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

      toast.success('Van stock saved successfully');
      // Clear the entry form after save - items are now in Product Stock in Van
      await loadTodayStock(true);
    } catch (error) {
      console.error('Error saving stock:', error);
      toast.error('Failed to save van stock');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotals = () => {
    // Use saved items from database for summary display
    const savedItems = todayStock?.van_stock_items || [];
    return savedItems.reduce((acc: any, item: any) => ({
      totalStart: acc.totalStart + (item.start_qty || 0),
      totalOrdered: acc.totalOrdered + (item.ordered_qty || 0),
      totalReturned: acc.totalReturned + (item.returned_qty || 0),
      totalLeft: acc.totalLeft + ((item.start_qty || 0) - (item.ordered_qty || 0) + (item.returned_qty || 0)),
    }), { totalStart: 0, totalOrdered: 0, totalReturned: 0, totalLeft: 0 });
  };

  const handleExportToExcel = () => {
    const savedItems = todayStock?.van_stock_items || [];
    if (savedItems.length === 0) {
      toast.error('No stock items to export');
      return;
    }

    // Prepare data for export from saved items
    const exportData = savedItems.map((item: any) => {
      const product = products.find(p => p.id === item.product_id);
      const priceWithGST = product?.rate || 0;
      // Calculate price without GST (5% GST = 2.5% CGST + 2.5% SGST)
      const priceWithoutGST = priceWithGST / 1.05;
      const totalValue = priceWithoutGST * item.start_qty;
      
      return {
        'Product': item.product_name,
        'Price (without GST)': `₹${priceWithoutGST.toFixed(2)}`,
        'Unit': item.unit,
        'Quantity': item.start_qty,
        'Total Value': `₹${totalValue.toFixed(2)}`
      };
    });

    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(exportData);
    
    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Van Stock');
    
    // Generate filename with date
    const fileName = `Van_Stock_${selectedDate}.xlsx`;
    
    // Save file
    XLSX.writeFile(wb, fileName);
    
    toast.success('Stock items exported successfully');
  };

  const handleExportToPDF = () => {
    const savedItems = todayStock?.van_stock_items || [];
    if (savedItems.length === 0) {
      toast.error('No stock items to export');
      return;
    }

    const doc = new jsPDF();
    const dateStr = new Date(selectedDate).toLocaleDateString('en-IN', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });

    // Title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Product Stock in Van', 14, 20);
    
    // Date and Van info
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    const selectedVanData = vans.find(v => v.id === selectedVan);
    doc.text(`Date: ${dateStr}`, 14, 28);
    if (selectedVanData) {
      doc.text(`Van: ${selectedVanData.registration_number} - ${selectedVanData.make_model}`, 14, 35);
    }

    // Calculate totals with proper gram to KG conversion
    let totalKGs = 0;
    const totalValue = savedItems.reduce((sum: number, item: any) => {
      const product = products.find(p => p.id === item.product_id);
      const priceWithoutGST = (product?.rate || 0) / 1.05;
      const unit = (item.unit || '').toLowerCase();
      const qty = item.start_qty || 0;
      
      // Convert grams to KG for total calculation
      if (unit === 'grams' || unit === 'gram' || unit === 'g') {
        totalKGs += qty / 1000;
      } else if (unit === 'kg' || unit === 'kgs') {
        totalKGs += qty;
      }
      
      return sum + (priceWithoutGST * qty);
    }, 0);
    
    // Summary with Total KGs and Total Value
    doc.setFontSize(10);
    doc.text(`Total Items: ${savedItems.length}`, 14, 42);
    doc.text(`Total KGs in Van: ${totalKGs.toFixed(2)} KG`, 14, 48);
    doc.text(`Total Value (Excl. GST): Rs. ${totalValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 14, 54);

    // Table with proper formatting
    const tableData = savedItems.map((item: any) => {
      const product = products.find(p => p.id === item.product_id);
      const priceWithGST = product?.rate || 0;
      const priceWithoutGST = priceWithGST / 1.05;
      const qty = item.start_qty || 0;
      const unit = (item.unit || '').toLowerCase();
      
      // Calculate quantity in KGs for display
      let qtyDisplay = qty.toString();
      let unitDisplay = item.unit || '';
      
      // For grams, show both grams and KG equivalent
      if (unit === 'grams' || unit === 'gram' || unit === 'g') {
        const kgEquivalent = qty / 1000;
        qtyDisplay = `${qty} (${kgEquivalent.toFixed(3)} KG)`;
      }
      
      const totalVal = priceWithoutGST * qty;
      
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

    doc.save(`Product_Stock_Van_${selectedDate}.pdf`);
    toast.success('PDF downloaded successfully');
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
    let totalKGs = 0;
    const totalValue = savedItems.reduce((sum: number, item: any) => {
      const product = products.find(p => p.id === item.product_id);
      const priceWithoutGST = (product?.rate || 0) / 1.05;
      const unit = (item.unit || '').toLowerCase();
      const qty = item.start_qty || 0;
      
      if (unit === 'grams' || unit === 'gram' || unit === 'g') {
        totalKGs += qty / 1000;
      } else if (unit === 'kg' || unit === 'kgs') {
        totalKGs += qty;
      }
      
      return sum + (priceWithoutGST * qty);
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
      
      if (unit === 'grams' || unit === 'gram' || unit === 'g') {
        const kgEquivalent = qty / 1000;
        qtyDisplay = `${qty} (${kgEquivalent.toFixed(3)} KG)`;
      }
      
      const totalVal = priceWithoutGST * qty;
      
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

              <div>
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
              </div>
            </div>

            {selectedVan && selectedBeat && (
              <>
                {/* Summary Cards */}
                <div className="bg-blue-50 dark:bg-blue-950 p-2 rounded-lg border border-blue-200 dark:border-blue-800 mb-3">
                  <p className="text-xs text-blue-800 dark:text-blue-200">
                    <strong>Note:</strong> Orders from today's beat are auto-counted here.
                  </p>
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
                    <p className="text-xl font-bold">{totals.totalStart}</p>
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
                    <p className="text-xl font-bold">{totals.totalOrdered}</p>
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
                    <p className="text-xl font-bold">{totals.totalReturned}</p>
                  </Card>

                  <Card 
                    className="p-2.5 cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => setShowDetailModal('left')}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <TrendingDown className="h-4 w-4 text-green-600" />
                      <Eye className="h-3 w-3 text-muted-foreground" />
                    </div>
                    <p className="text-[10px] text-muted-foreground mb-0.5">Left in the Van</p>
                    <p className="text-xl font-bold">{totals.totalLeft}</p>
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

                {/* Action Buttons */}
                <div className="flex gap-2 pt-3 border-t">
                  <Button onClick={handleSaveStock} disabled={loading} className="flex-1 h-9 text-sm">
                    {loading ? 'Saving...' : 'Save Stock'}
                  </Button>
                  <Button variant="outline" onClick={() => onOpenChange(false)} className="h-9 text-sm">
                    Close
                  </Button>
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
              // Use saved items from database for the modal display
              const savedItems = todayStock?.van_stock_items || [];
              
              if (savedItems.length === 0) {
                return (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No stock items saved yet</p>
                  </div>
                );
              }
              
              return savedItems.map((item: any, index: number) => {
                const product = products.find(p => p.id === item.product_id);
                const priceWithGST = product?.rate || 0;
                const priceWithoutGST = priceWithGST / 1.05;
                
                return (
                  <Card key={index} className="p-3 hover:bg-accent transition-colors">
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <p className="font-medium">{item.product_name}</p>
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
                          <p className="text-2xl font-bold">
                            {showDetailModal === 'start' && item.start_qty}
                            {showDetailModal === 'ordered' && (item.ordered_qty || 0)}
                            {showDetailModal === 'returned' && (item.returned_qty || 0)}
                            {showDetailModal === 'left' && (item.start_qty - (item.ordered_qty || 0) + (item.returned_qty || 0))}
                          </p>
                          <p className="text-xs text-muted-foreground">{item.unit}</p>
                        </div>
                        {showDetailModal === 'start' && (
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
            
            {(todayStock?.van_stock_items || []).length > 0 && (
              <Card className="p-4 bg-primary/5 border-primary">
                <div className="flex justify-between items-center">
                  <p className="font-bold text-lg">Total</p>
                  <p className="text-3xl font-bold text-primary">
                    {showDetailModal === 'start' && (todayStock?.van_stock_items || []).reduce((acc: number, i: any) => acc + (i.start_qty || 0), 0)}
                    {showDetailModal === 'ordered' && (todayStock?.van_stock_items || []).reduce((acc: number, i: any) => acc + (i.ordered_qty || 0), 0)}
                    {showDetailModal === 'returned' && (todayStock?.van_stock_items || []).reduce((acc: number, i: any) => acc + (i.returned_qty || 0), 0)}
                    {showDetailModal === 'left' && (todayStock?.van_stock_items || []).reduce((acc: number, i: any) => acc + (i.start_qty - (i.ordered_qty || 0) + (i.returned_qty || 0)), 0)}
                  </p>
                </div>
              </Card>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Input } from './ui/input';
import { toast } from 'sonner';
import { Edit, Package, Search } from 'lucide-react';
import { VanMorningInventory } from './VanMorningInventory';

interface VanStockItem {
  id: string;
  grn_id: string;
  product_id: string;
  variant_id?: string;
  quantity: number;
  product_name: string;
  variant_name?: string;
  sku: string;
  grn_number: string;
  grn_date: string;
  van_registration: string;
}

interface VanStockViewProps {
  selectedDate: Date;
}

export function VanStockView({ selectedDate }: VanStockViewProps) {
  const [stockItems, setStockItems] = useState<VanStockItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    loadVanStock();
  }, [selectedDate]);

  const loadVanStock = async () => {
    setLoading(true);
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];

      // Get all GRN items for the selected date with product details
      const { data: grnData, error: grnError } = await supabase
        .from('van_inward_grn')
        .select(`
          id,
          grn_number,
          grn_date,
          van_id,
          vans (
            registration_number
          )
        `)
        .eq('grn_date', dateStr)
        .order('created_at', { ascending: false });

      if (grnError) throw grnError;

      if (!grnData || grnData.length === 0) {
        setStockItems([]);
        setLoading(false);
        return;
      }

      // Get all items for these GRNs
      const grnIds = grnData.map(g => g.id);
      const { data: itemsData, error: itemsError } = await supabase
        .from('van_inward_grn_items')
        .select(`
          id,
          grn_id,
          product_id,
          variant_id,
          quantity,
          products (
            name,
            sku
          ),
          product_variants (
            variant_name,
            sku
          )
        `)
        .in('grn_id', grnIds);

      if (itemsError) throw itemsError;

      // Combine data
      const items: VanStockItem[] = (itemsData || []).map(item => {
        const grn = grnData.find(g => g.id === item.grn_id);
        return {
          id: item.id,
          grn_id: item.grn_id,
          product_id: item.product_id,
          variant_id: item.variant_id || undefined,
          quantity: item.quantity,
          product_name: (item.products as any)?.name || 'Unknown',
          variant_name: (item.product_variants as any)?.variant_name,
          sku: item.variant_id 
            ? ((item.product_variants as any)?.sku || '')
            : ((item.products as any)?.sku || ''),
          grn_number: grn?.grn_number || '',
          grn_date: grn?.grn_date || '',
          van_registration: (grn?.vans as any)?.registration_number || ''
        };
      });

      setStockItems(items);
    } catch (error: any) {
      console.error('Error loading van stock:', error);
      toast.error('Failed to load van stock');
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = stockItems.filter(item => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      item.product_name.toLowerCase().includes(query) ||
      item.sku.toLowerCase().includes(query) ||
      item.variant_name?.toLowerCase().includes(query) ||
      item.van_registration.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Product Stock in Van
              </CardTitle>
              <CardDescription className="mt-1">
                View all saved inventory items for {selectedDate.toLocaleDateString()}
              </CardDescription>
            </div>
            <Button onClick={() => setEditMode(true)} variant="outline">
              <Edit className="mr-2 h-4 w-4" />
              Edit / Add Stock
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products, SKU, van..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : stockItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No stock items found for this date</p>
              <p className="text-sm mt-1">Add morning inventory to see products here</p>
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product Name</TableHead>
                    <TableHead>Variant</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead>Van</TableHead>
                    <TableHead>GRN Number</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.product_name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.variant_name || '-'}
                      </TableCell>
                      <TableCell className="text-sm">{item.sku}</TableCell>
                      <TableCell className="text-right font-semibold">{item.quantity}</TableCell>
                      <TableCell className="text-sm">{item.van_registration}</TableCell>
                      <TableCell className="text-sm font-mono">{item.grn_number}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {filteredItems.length > 0 && (
            <div className="mt-4 text-sm text-muted-foreground">
              Total items: {filteredItems.length} | Total quantity: {filteredItems.reduce((sum, item) => sum + item.quantity, 0)}
            </div>
          )}
        </CardContent>
      </Card>

      <VanMorningInventory 
        open={editMode} 
        onOpenChange={(open) => {
          setEditMode(open);
          if (!open) loadVanStock(); // Reload after closing
        }}
        selectedDate={selectedDate} 
      />
    </div>
  );
}

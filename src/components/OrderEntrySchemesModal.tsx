import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Gift, 
  Calendar, 
  Percent, 
  TrendingUp, 
  ShoppingCart, 
  Package, 
  Search,
  Loader2,
  Check,
  Plus,
  WifiOff
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { ProductScheme } from "@/hooks/useOfflineSchemes";

interface Product {
  id: string;
  name: string;
  sku: string;
  rate: number;
  unit: string;
}

interface OrderRow {
  id: string;
  product?: Product;
  quantity: number;
}

interface OrderEntrySchemesModalProps {
  isOpen: boolean;
  onClose: () => void;
  schemes: ProductScheme[];
  loading: boolean;
  isOnline: boolean;
  orderRows: OrderRow[];
  products: Product[];
  onApplyScheme: (scheme: ProductScheme, product?: Product, quantity?: number) => void;
}

const getSchemeTypeIcon = (type: string) => {
  switch (type) {
    case 'percentage_discount':
      return <Percent className="w-3.5 h-3.5" />;
    case 'flat_discount':
      return <TrendingUp className="w-3.5 h-3.5" />;
    case 'buy_x_get_y_free':
      return <Gift className="w-3.5 h-3.5" />;
    case 'bundle_combo':
      return <ShoppingCart className="w-3.5 h-3.5" />;
    default:
      return <Package className="w-3.5 h-3.5" />;
  }
};

const getSchemeTypeLabel = (type: string) => {
  switch (type) {
    case 'percentage_discount':
      return 'Discount %';
    case 'flat_discount':
      return 'Flat Off';
    case 'buy_x_get_y_free':
      return 'Buy & Get';
    case 'bundle_combo':
      return 'Bundle';
    case 'tiered_discount':
      return 'Tiered';
    case 'time_based_offer':
      return 'Time Offer';
    case 'first_order_discount':
      return 'First Order';
    case 'category_wide_discount':
      return 'Category';
    default:
      return type;
  }
};

const formatDate = (date: string | null) => {
  if (!date) return 'No limit';
  return new Date(date).toLocaleDateString('en-IN', { 
    day: 'numeric', 
    month: 'short'
  });
};

const getConditionText = (scheme: ProductScheme) => {
  if (scheme.condition_quantity && scheme.quantity_condition_type) {
    return `Buy ${scheme.quantity_condition_type === 'more_than' ? '>' : '≥'} ${scheme.condition_quantity}`;
  }
  if (scheme.buy_quantity) {
    return `Buy ${scheme.buy_quantity}`;
  }
  if (scheme.min_order_value) {
    return `Min ₹${scheme.min_order_value}`;
  }
  return 'No minimum';
};

const getBenefitText = (scheme: ProductScheme) => {
  if (scheme.discount_percentage) {
    return `${scheme.discount_percentage}% off`;
  }
  if (scheme.discount_amount) {
    return `₹${scheme.discount_amount} off`;
  }
  if (scheme.free_quantity) {
    return `Get ${scheme.free_quantity} free`;
  }
  return 'Special offer';
};

const isSchemeActive = (scheme: ProductScheme) => {
  if (!scheme.is_active) return false;
  const now = new Date();
  const startDate = scheme.start_date ? new Date(scheme.start_date) : null;
  const endDate = scheme.end_date ? new Date(scheme.end_date) : null;
  
  if (startDate && now < startDate) return false;
  if (endDate && now > endDate) return false;
  return true;
};

export const OrderEntrySchemesModal: React.FC<OrderEntrySchemesModalProps> = ({
  isOpen,
  onClose,
  schemes,
  loading,
  isOnline,
  orderRows,
  products,
  onApplyScheme
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [appliedSchemes, setAppliedSchemes] = useState<Set<string>>(new Set());

  const activeSchemes = useMemo(() => 
    schemes.filter(s => isSchemeActive(s)), [schemes]);

  // Find applicable schemes based on current order items
  const applicableSchemes = useMemo(() => {
    if (orderRows.length === 0 || !orderRows.some(r => r.product)) return [];
    
    const orderProductIds = orderRows
      .filter(row => row.product)
      .map(row => row.product!.id);
    
    const orderProductNames = orderRows
      .filter(row => row.product)
      .map(row => row.product!.name.toLowerCase());
    
    return activeSchemes.filter(scheme => {
      // If scheme is for all products
      if (!scheme.product_id || scheme.product_name === 'All Products') return true;
      
      // Check if scheme product is in order
      if (scheme.product_id && orderProductIds.includes(scheme.product_id)) return true;
      
      // Fuzzy match by name
      return orderProductNames.some(name => 
        name.includes(scheme.product_name?.toLowerCase() || '') ||
        (scheme.product_name?.toLowerCase() || '').includes(name.split(' - ')[0])
      );
    });
  }, [activeSchemes, orderRows]);

  const filteredSchemes = useMemo(() => {
    return activeSchemes.filter(scheme => {
      const matchesSearch = scheme.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (scheme.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
                           (scheme.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
      return matchesSearch;
    });
  }, [activeSchemes, searchTerm]);

  // Handle apply scheme
  const handleApply = (scheme: ProductScheme) => {
    // Find the product for this scheme
    let targetProduct: Product | undefined;
    let minQuantity = 1;

    if (scheme.product_id) {
      targetProduct = products.find(p => p.id === scheme.product_id);
    }

    // Calculate minimum quantity to qualify
    if (scheme.condition_quantity) {
      minQuantity = scheme.condition_quantity;
    } else if (scheme.buy_quantity) {
      minQuantity = scheme.buy_quantity;
    }

    // Check if product is already in order
    const existingRow = orderRows.find(row => row.product?.id === scheme.product_id);
    
    if (existingRow && existingRow.quantity >= minQuantity) {
      // Already meets condition
      toast({
        title: "Offer Applied!",
        description: `${scheme.name} is now active on your order`,
      });
    } else if (targetProduct) {
      // Add or update product with minimum quantity
      onApplyScheme(scheme, targetProduct, minQuantity);
      toast({
        title: "Product Added",
        description: `Added ${targetProduct.name} (${minQuantity} qty) for ${scheme.name}`,
      });
    } else {
      // Generic scheme (all products)
      toast({
        title: "Offer Applied!",
        description: scheme.description || `${scheme.name} will be applied at checkout`,
      });
    }

    setAppliedSchemes(prev => new Set(prev).add(scheme.id));
  };

  const SchemeCard = ({ scheme, showApplicable = false }: { scheme: ProductScheme; showApplicable?: boolean }) => {
    const isApplicable = applicableSchemes.some(s => s.id === scheme.id);
    const isApplied = appliedSchemes.has(scheme.id);
    
    return (
      <Card className={`border ${isApplicable ? 'border-primary/50 bg-primary/5' : 'border-border/50'}`}>
        <CardContent className="p-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm truncate">{scheme.name}</h3>
              <p className="text-xs text-muted-foreground truncate">{scheme.product_name}</p>
            </div>
            <Badge variant="outline" className="shrink-0 text-[10px] px-1.5 py-0.5 flex items-center gap-1">
              {getSchemeTypeIcon(scheme.scheme_type)}
              {getSchemeTypeLabel(scheme.scheme_type)}
            </Badge>
          </div>

          <div className="bg-muted/50 rounded p-2 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Condition:</span>
              <span className="font-medium">{getConditionText(scheme)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Benefit:</span>
              <span className="font-medium text-primary">{getBenefitText(scheme)}</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Calendar className="w-3 h-3" />
              <span>{formatDate(scheme.start_date)} - {formatDate(scheme.end_date)}</span>
            </div>
            
            <Button
              size="sm"
              variant={isApplied ? "secondary" : "default"}
              className="h-7 text-xs px-2.5"
              onClick={() => handleApply(scheme)}
              disabled={isApplied}
            >
              {isApplied ? (
                <>
                  <Check className="w-3 h-3 mr-1" />
                  Applied
                </>
              ) : (
                <>
                  <Plus className="w-3 h-3 mr-1" />
                  Apply
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-primary" />
            Schemes & Offers
            {!isOnline && (
              <Badge variant="outline" className="ml-2 text-[10px]">
                <WifiOff className="w-3 h-3 mr-1" />
                Offline
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search schemes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs defaultValue={applicableSchemes.length > 0 ? "applicable" : "all"} className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="applicable" className="text-xs">
                For Your Order ({applicableSchemes.length})
              </TabsTrigger>
              <TabsTrigger value="all" className="text-xs">
                All Offers ({filteredSchemes.length})
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto mt-3">
              <TabsContent value="applicable" className="m-0 space-y-2">
                {applicableSchemes.length > 0 ? (
                  applicableSchemes.map(scheme => (
                    <SchemeCard key={scheme.id} scheme={scheme} showApplicable />
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Gift className="w-10 h-10 mx-auto text-muted-foreground mb-2 opacity-50" />
                    <p className="text-sm text-muted-foreground">No schemes for your items</p>
                    <p className="text-xs text-muted-foreground mt-1">Add products or check "All Offers"</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="all" className="m-0 space-y-2">
                {filteredSchemes.length > 0 ? (
                  filteredSchemes.map(scheme => (
                    <SchemeCard key={scheme.id} scheme={scheme} />
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Package className="w-10 h-10 mx-auto text-muted-foreground mb-2 opacity-50" />
                    <p className="text-sm text-muted-foreground">
                      {schemes.length === 0 
                        ? (isOnline ? 'No active schemes found' : 'No cached schemes available')
                        : 'No matching schemes'
                      }
                    </p>
                  </div>
                )}
              </TabsContent>
            </div>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};

import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
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
  Loader2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ProductScheme {
  id: string;
  name: string;
  description: string | null;
  scheme_type: string;
  product_id: string | null;
  variant_id: string | null;
  discount_percentage: number | null;
  discount_amount: number | null;
  buy_quantity: number | null;
  free_quantity: number | null;
  condition_quantity: number | null;
  quantity_condition_type: string | null;
  min_order_value: number | null;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean | null;
  is_first_order_only: boolean | null;
  product_name?: string;
  free_product_name?: string;
}

interface CartSchemesModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems?: Array<{ id: string; name: string }>;
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

export const CartSchemesModal: React.FC<CartSchemesModalProps> = ({
  isOpen,
  onClose,
  cartItems = []
}) => {
  const [schemes, setSchemes] = useState<ProductScheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (isOpen) {
      fetchSchemes();
    }
  }, [isOpen]);

  const fetchSchemes = async () => {
    setLoading(true);
    try {
      const { data: schemesData, error } = await supabase
        .from('product_schemes')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch product names
      const productIds = [...new Set((schemesData || [])
        .map(s => s.product_id)
        .filter(Boolean))] as string[];
      
      const freeProductIds = [...new Set((schemesData || [])
        .map(s => s.free_product_id)
        .filter(Boolean))] as string[];

      let productsMap: Record<string, string> = {};

      if (productIds.length > 0 || freeProductIds.length > 0) {
        const allProductIds = [...new Set([...productIds, ...freeProductIds])];
        const { data: productsData } = await supabase
          .from('products')
          .select('id, name')
          .in('id', allProductIds);
        
        productsMap = (productsData || []).reduce((acc, p) => {
          acc[p.id] = p.name;
          return acc;
        }, {} as Record<string, string>);
      }

      const formattedSchemes: ProductScheme[] = (schemesData || []).map(scheme => ({
        ...scheme,
        product_name: scheme.product_id ? productsMap[scheme.product_id] || 'Product' : 'All Products',
        free_product_name: scheme.free_product_id ? productsMap[scheme.free_product_id] || null : null,
      }));

      setSchemes(formattedSchemes);
    } catch (error) {
      console.error('Error fetching schemes:', error);
    } finally {
      setLoading(false);
    }
  };

  const activeSchemes = useMemo(() => 
    schemes.filter(s => isSchemeActive(s)), [schemes]);

  const applicableSchemes = useMemo(() => {
    if (cartItems.length === 0) return [];
    const cartProductNames = cartItems.map(item => item.name.toLowerCase());
    return activeSchemes.filter(scheme => {
      if (!scheme.product_name || scheme.product_name === 'All Products') return true;
      return cartProductNames.some(name => 
        name.includes(scheme.product_name?.toLowerCase() || '') ||
        (scheme.product_name?.toLowerCase() || '').includes(name.split(' - ')[0])
      );
    });
  }, [activeSchemes, cartItems]);

  const filteredSchemes = useMemo(() => {
    return activeSchemes.filter(scheme => {
      const matchesSearch = scheme.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (scheme.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
                           (scheme.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
      return matchesSearch;
    });
  }, [activeSchemes, searchTerm]);

  const SchemeCard = ({ scheme }: { scheme: ProductScheme }) => {
    const isApplicable = applicableSchemes.some(s => s.id === scheme.id);
    
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

          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>{formatDate(scheme.start_date)} - {formatDate(scheme.end_date)}</span>
            </div>
            {isApplicable && (
              <Badge className="bg-primary/20 text-primary text-[9px] px-1.5">
                Applicable
              </Badge>
            )}
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
                For Your Cart ({applicableSchemes.length})
              </TabsTrigger>
              <TabsTrigger value="all" className="text-xs">
                All Offers ({filteredSchemes.length})
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto mt-3">
              <TabsContent value="applicable" className="m-0 space-y-2">
                {applicableSchemes.length > 0 ? (
                  applicableSchemes.map(scheme => (
                    <SchemeCard key={scheme.id} scheme={scheme} />
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Gift className="w-10 h-10 mx-auto text-muted-foreground mb-2 opacity-50" />
                    <p className="text-sm text-muted-foreground">No schemes for cart items</p>
                    <p className="text-xs text-muted-foreground mt-1">Check "All Offers" tab</p>
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
                    <p className="text-sm text-muted-foreground">No active schemes found</p>
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

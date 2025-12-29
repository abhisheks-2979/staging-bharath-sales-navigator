import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Plus, Target, Package, Store, Trash2, ChevronDown, ChevronRight, X, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BusinessPlan {
  id: string;
  year: number;
  revenue_target: number;
  coverage_target: string | null;
  territory_target: string | null;
  notes: string | null;
}

interface Product {
  id: string;
  name: string;
  category_id: string | null;
  category_name: string | null;
  rate: number;
}

interface ProductCategory {
  id: string;
  name: string;
  products: Product[];
}

interface Retailer {
  id: string;
  name: string;
  category: string | null;
}

interface RetailerCategory {
  category: string;
  retailers: Retailer[];
}

interface CategoryTarget {
  categoryId: string;
  categoryName: string;
  target: number;
  equalDivide: boolean;
  products: ProductTarget[];
}

interface ProductTarget {
  productId: string;
  productName: string;
  percentage: number;
  target: number;
}

interface RetailerCategoryTarget {
  category: string;
  target: number;
  equalDivide: boolean;
  retailers: RetailerTargetItem[];
}

interface RetailerTargetItem {
  retailerId: string;
  retailerName: string;
  percentage: number;
  target: number;
}

interface MonthTarget {
  monthNumber: number;
  monthName: string;
  percentage: number;
  target: number;
}

const FY_MONTHS = [
  { number: 1, name: 'April' },
  { number: 2, name: 'May' },
  { number: 3, name: 'June' },
  { number: 4, name: 'July' },
  { number: 5, name: 'August' },
  { number: 6, name: 'September' },
  { number: 7, name: 'October' },
  { number: 8, name: 'November' },
  { number: 9, name: 'December' },
  { number: 10, name: 'January' },
  { number: 11, name: 'February' },
  { number: 12, name: 'March' },
];

interface Props {
  distributorId: string;
}

export function DistributorFYPlan({ distributorId }: Props) {
  const [plans, setPlans] = useState<BusinessPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<BusinessPlan | null>(null);
  const [productCategories, setProductCategories] = useState<ProductCategory[]>([]);
  const [retailerCategories, setRetailerCategories] = useState<RetailerCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // Product targets state
  const [categoryTargets, setCategoryTargets] = useState<CategoryTarget[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  
  // Retailer targets state
  const [retailerCategoryTargets, setRetailerCategoryTargets] = useState<RetailerCategoryTarget[]>([]);
  const [expandedRetailerCategories, setExpandedRetailerCategories] = useState<Set<string>>(new Set());

  // Monthly targets state
  const [monthTargets, setMonthTargets] = useState<MonthTarget[]>([]);
  const [monthEqualDivide, setMonthEqualDivide] = useState(true);
  const [monthTotalTarget, setMonthTotalTarget] = useState(0);

  const [planForm, setPlanForm] = useState({
    year: new Date().getFullYear() + 1,
    revenue_target: "",
    coverage_target: "",
    territory_target: "",
    notes: "",
  });

  useEffect(() => {
    loadPlans();
    loadProductsWithCategories();
    loadRetailersWithCategories();
  }, [distributorId]);

  useEffect(() => {
    if (selectedPlan) {
      loadExistingTargets();
    }
  }, [selectedPlan]);

  const loadPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('distributor_business_plans')
        .select('*')
        .eq('distributor_id', distributorId)
        .order('year', { ascending: false });

      if (error) throw error;
      setPlans(data || []);
      if (data && data.length > 0) {
        setSelectedPlan(data[0]);
      }
    } catch (error: any) {
      toast.error("Failed to load FY plans: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadProductsWithCategories = async () => {
    const { data: products } = await supabase
      .from('products')
      .select(`
        id, 
        name, 
        rate,
        category_id,
        product_categories(id, name)
      `)
      .eq('is_active', true)
      .order('name');

    if (products) {
      const categoryMap = new Map<string, ProductCategory>();
      
      products.forEach((p: any) => {
        const catId = p.category_id || 'uncategorized';
        const catName = p.product_categories?.name || 'Uncategorized';
        
        if (!categoryMap.has(catId)) {
          categoryMap.set(catId, {
            id: catId,
            name: catName,
            products: []
          });
        }
        
        categoryMap.get(catId)!.products.push({
          id: p.id,
          name: p.name,
          category_id: p.category_id,
          category_name: catName,
          rate: p.rate || 0
        });
      });
      
      setProductCategories(Array.from(categoryMap.values()).sort((a, b) => a.name.localeCompare(b.name)));
    }
  };

  const loadRetailersWithCategories = async () => {
    const { data: retailers } = await supabase
      .from('retailers')
      .select('id, name, category')
      .eq('distributor_id', distributorId)
      .order('name');

    if (retailers) {
      const categoryMap = new Map<string, RetailerCategory>();
      
      retailers.forEach((r: any) => {
        const cat = r.category || 'Uncategorized';
        
        if (!categoryMap.has(cat)) {
          categoryMap.set(cat, {
            category: cat,
            retailers: []
          });
        }
        
        categoryMap.get(cat)!.retailers.push({
          id: r.id,
          name: r.name,
          category: r.category
        });
      });
      
      setRetailerCategories(Array.from(categoryMap.values()).sort((a, b) => a.category.localeCompare(b.category)));
    }
  };

  const loadExistingTargets = async () => {
    if (!selectedPlan) return;
    
    // Load product targets
    const { data: productData } = await supabase
      .from('distributor_business_plan_products')
      .select('*')
      .eq('business_plan_id', selectedPlan.id);

    // Load retailer targets
    const { data: retailerData } = await supabase
      .from('distributor_business_plan_retailers')
      .select('*')
      .eq('business_plan_id', selectedPlan.id);

    // Load monthly targets
    const { data: monthData } = await supabase
      .from('distributor_business_plan_months')
      .select('*')
      .eq('business_plan_id', selectedPlan.id);

    // Initialize category targets from product categories
    const newCategoryTargets: CategoryTarget[] = productCategories.map(cat => ({
      categoryId: cat.id,
      categoryName: cat.name,
      target: 0,
      equalDivide: true,
      products: cat.products.map(p => {
        const existing = productData?.find(pd => pd.product_id === p.id);
        return {
          productId: p.id,
          productName: p.name,
          percentage: 100 / cat.products.length,
          target: existing?.revenue_target || 0
        };
      })
    }));

    // Calculate category totals from existing data
    newCategoryTargets.forEach(cat => {
      const categoryTotal = cat.products.reduce((sum, p) => sum + p.target, 0);
      cat.target = categoryTotal;
      if (categoryTotal > 0) {
        cat.products.forEach(p => {
          p.percentage = categoryTotal > 0 ? (p.target / categoryTotal) * 100 : 100 / cat.products.length;
        });
      }
    });

    setCategoryTargets(newCategoryTargets);

    // Initialize retailer category targets
    const newRetailerCategoryTargets: RetailerCategoryTarget[] = retailerCategories.map(cat => ({
      category: cat.category,
      target: 0,
      equalDivide: true,
      retailers: cat.retailers.map(r => {
        const existing = retailerData?.find(rd => rd.retailer_id === r.id);
        return {
          retailerId: r.id,
          retailerName: r.name,
          percentage: 100 / cat.retailers.length,
          target: existing?.target_revenue || 0
        };
      })
    }));

    // Calculate category totals from existing retailer data
    newRetailerCategoryTargets.forEach(cat => {
      const categoryTotal = cat.retailers.reduce((sum, r) => sum + r.target, 0);
      cat.target = categoryTotal;
      if (categoryTotal > 0) {
        cat.retailers.forEach(r => {
          r.percentage = categoryTotal > 0 ? (r.target / categoryTotal) * 100 : 100 / cat.retailers.length;
        });
      }
    });

    setRetailerCategoryTargets(newRetailerCategoryTargets);

    // Initialize monthly targets
    const newMonthTargets: MonthTarget[] = FY_MONTHS.map(m => {
      const existing = monthData?.find(md => md.month_number === m.number);
      return {
        monthNumber: m.number,
        monthName: m.name,
        percentage: 100 / 12,
        target: existing?.target_revenue || 0
      };
    });

    const totalMonthly = newMonthTargets.reduce((sum, m) => sum + m.target, 0);
    if (totalMonthly > 0) {
      newMonthTargets.forEach(m => {
        m.percentage = (m.target / totalMonthly) * 100;
      });
      setMonthEqualDivide(false);
    } else {
      setMonthEqualDivide(true);
    }
    setMonthTotalTarget(totalMonthly);
    setMonthTargets(newMonthTargets);
  };

  useEffect(() => {
    if (productCategories.length > 0 && selectedPlan) {
      loadExistingTargets();
    }
  }, [productCategories, retailerCategories, selectedPlan]);

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase
        .from('distributor_business_plans')
        .insert({
          distributor_id: distributorId,
          year: planForm.year,
          revenue_target: parseFloat(planForm.revenue_target) || 0,
          coverage_target: planForm.coverage_target || null,
          territory_target: planForm.territory_target || null,
          notes: planForm.notes || null,
        })
        .select()
        .single();

      if (error) throw error;
      toast.success("FY Plan created");
      setDialogOpen(false);
      loadPlans();
      setSelectedPlan(data);
    } catch (error: any) {
      toast.error("Failed to create plan: " + error.message);
    }
  };

  const toggleCategoryExpand = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const toggleRetailerCategoryExpand = (category: string) => {
    const newExpanded = new Set(expandedRetailerCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedRetailerCategories(newExpanded);
  };

  const handleCategoryTargetChange = (categoryId: string, value: number) => {
    setCategoryTargets(prev => prev.map(cat => {
      if (cat.categoryId !== categoryId) return cat;
      
      const newProducts = cat.products.map(p => ({
        ...p,
        target: cat.equalDivide ? value / cat.products.length : (p.percentage / 100) * value
      }));
      
      return { ...cat, target: value, products: newProducts };
    }));
  };

  const handleEqualDivideChange = (categoryId: string, checked: boolean) => {
    setCategoryTargets(prev => prev.map(cat => {
      if (cat.categoryId !== categoryId) return cat;
      
      const newProducts = cat.products.map(p => ({
        ...p,
        percentage: checked ? 100 / cat.products.length : p.percentage,
        target: checked ? cat.target / cat.products.length : (p.percentage / 100) * cat.target
      }));
      
      return { ...cat, equalDivide: checked, products: newProducts };
    }));
  };

  const handleProductPercentageChange = (categoryId: string, productId: string, percentage: number) => {
    setCategoryTargets(prev => prev.map(cat => {
      if (cat.categoryId !== categoryId) return cat;
      
      const newProducts = cat.products.map(p => {
        if (p.productId !== productId) return p;
        return {
          ...p,
          percentage,
          target: (percentage / 100) * cat.target
        };
      });
      
      return { ...cat, equalDivide: false, products: newProducts };
    }));
  };

  const removeCategory = (categoryId: string) => {
    setCategoryTargets(prev => prev.filter(cat => cat.categoryId !== categoryId));
  };

  const removeProduct = (categoryId: string, productId: string) => {
    setCategoryTargets(prev => prev.map(cat => {
      if (cat.categoryId !== categoryId) return cat;
      const newProducts = cat.products.filter(p => p.productId !== productId);
      return { ...cat, products: newProducts };
    }));
  };

  // Retailer handlers
  const handleRetailerCategoryTargetChange = (category: string, value: number) => {
    setRetailerCategoryTargets(prev => prev.map(cat => {
      if (cat.category !== category) return cat;
      
      const newRetailers = cat.retailers.map(r => ({
        ...r,
        target: cat.equalDivide ? value / cat.retailers.length : (r.percentage / 100) * value
      }));
      
      return { ...cat, target: value, retailers: newRetailers };
    }));
  };

  const handleRetailerEqualDivideChange = (category: string, checked: boolean) => {
    setRetailerCategoryTargets(prev => prev.map(cat => {
      if (cat.category !== category) return cat;
      
      const newRetailers = cat.retailers.map(r => ({
        ...r,
        percentage: checked ? 100 / cat.retailers.length : r.percentage,
        target: checked ? cat.target / cat.retailers.length : (r.percentage / 100) * cat.target
      }));
      
      return { ...cat, equalDivide: checked, retailers: newRetailers };
    }));
  };

  const handleRetailerPercentageChange = (category: string, retailerId: string, percentage: number) => {
    setRetailerCategoryTargets(prev => prev.map(cat => {
      if (cat.category !== category) return cat;
      
      const newRetailers = cat.retailers.map(r => {
        if (r.retailerId !== retailerId) return r;
        return {
          ...r,
          percentage,
          target: (percentage / 100) * cat.target
        };
      });
      
      return { ...cat, equalDivide: false, retailers: newRetailers };
    }));
  };

  const removeRetailerCategory = (category: string) => {
    setRetailerCategoryTargets(prev => prev.filter(cat => cat.category !== category));
  };

  const removeRetailer = (category: string, retailerId: string) => {
    setRetailerCategoryTargets(prev => prev.map(cat => {
      if (cat.category !== category) return cat;
      const newRetailers = cat.retailers.filter(r => r.retailerId !== retailerId);
      return { ...cat, retailers: newRetailers };
    }));
  };

  const saveProductTargets = async () => {
    if (!selectedPlan) return;
    
    try {
      // Delete existing
      await supabase
        .from('distributor_business_plan_products')
        .delete()
        .eq('business_plan_id', selectedPlan.id);

      // Insert new
      const productsToInsert = categoryTargets.flatMap(cat => 
        cat.products.filter(p => p.target > 0).map(p => ({
          business_plan_id: selectedPlan.id,
          product_id: p.productId,
          product_name: p.productName,
          quantity_target: 0,
          revenue_target: Math.round(p.target)
        }))
      );

      if (productsToInsert.length > 0) {
        const { error } = await supabase
          .from('distributor_business_plan_products')
          .insert(productsToInsert);
        if (error) throw error;
      }

      toast.success("Product targets saved");
    } catch (error: any) {
      toast.error("Failed to save: " + error.message);
    }
  };

  const saveRetailerTargets = async () => {
    if (!selectedPlan) return;
    
    try {
      // Delete existing
      await supabase
        .from('distributor_business_plan_retailers')
        .delete()
        .eq('business_plan_id', selectedPlan.id);

      // Insert new
      const retailersToInsert = retailerCategoryTargets.flatMap(cat => 
        cat.retailers.filter(r => r.target > 0).map(r => ({
          business_plan_id: selectedPlan.id,
          retailer_id: r.retailerId,
          retailer_name: r.retailerName,
          last_year_revenue: 0,
          target_revenue: Math.round(r.target),
          growth_percent: 0
        }))
      );

      if (retailersToInsert.length > 0) {
        const { error } = await supabase
          .from('distributor_business_plan_retailers')
          .insert(retailersToInsert);
        if (error) throw error;
      }

      toast.success("Retailer targets saved");
    } catch (error: any) {
      toast.error("Failed to save: " + error.message);
    }
  };

  // Month target handlers
  const handleMonthTotalTargetChange = (value: number) => {
    setMonthTotalTarget(value);
    if (monthEqualDivide) {
      setMonthTargets(prev => prev.map(m => ({
        ...m,
        target: value / 12,
        percentage: 100 / 12
      })));
    } else {
      setMonthTargets(prev => prev.map(m => ({
        ...m,
        target: (m.percentage / 100) * value
      })));
    }
  };

  const handleMonthEqualDivideChange = (checked: boolean) => {
    setMonthEqualDivide(checked);
    if (checked) {
      setMonthTargets(prev => prev.map(m => ({
        ...m,
        percentage: 100 / 12,
        target: monthTotalTarget / 12
      })));
    }
  };

  const handleMonthPercentageChange = (monthNumber: number, percentage: number) => {
    setMonthEqualDivide(false);
    setMonthTargets(prev => prev.map(m => {
      if (m.monthNumber !== monthNumber) return m;
      return {
        ...m,
        percentage,
        target: (percentage / 100) * monthTotalTarget
      };
    }));
  };

  const handleMonthTargetChange = (monthNumber: number, target: number) => {
    setMonthEqualDivide(false);
    setMonthTargets(prev => {
      const newTargets = prev.map(m => {
        if (m.monthNumber !== monthNumber) return m;
        return { ...m, target };
      });
      const newTotal = newTargets.reduce((sum, m) => sum + m.target, 0);
      setMonthTotalTarget(newTotal);
      return newTargets.map(m => ({
        ...m,
        percentage: newTotal > 0 ? (m.target / newTotal) * 100 : 100 / 12
      }));
    });
  };

  const saveMonthTargets = async () => {
    if (!selectedPlan) return;
    
    try {
      // Delete existing
      await supabase
        .from('distributor_business_plan_months')
        .delete()
        .eq('business_plan_id', selectedPlan.id);

      // Insert new
      const monthsToInsert = monthTargets.filter(m => m.target > 0).map(m => ({
        business_plan_id: selectedPlan.id,
        month_number: m.monthNumber,
        month_name: m.monthName,
        target_revenue: Math.round(m.target)
      }));

      if (monthsToInsert.length > 0) {
        const { error } = await supabase
          .from('distributor_business_plan_months')
          .insert(monthsToInsert);
        if (error) throw error;
      }

      toast.success("Monthly targets saved");
    } catch (error: any) {
      toast.error("Failed to save: " + error.message);
    }
  };

  const totalProductTarget = useMemo(() => 
    categoryTargets.reduce((sum, cat) => sum + cat.target, 0), 
    [categoryTargets]
  );

  const totalRetailerTarget = useMemo(() => 
    retailerCategoryTargets.reduce((sum, cat) => sum + cat.target, 0), 
    [retailerCategoryTargets]
  );

  const totalMonthTargetComputed = useMemo(() => 
    monthTargets.reduce((sum, m) => sum + m.target, 0), 
    [monthTargets]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <Target className="h-4 w-4" />
          FY Plans
        </h3>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="gap-1">
              <Plus className="h-3 w-3" />
              New Plan
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create FY Plan</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreatePlan} className="space-y-4">
              <div>
                <Label>Financial Year</Label>
                <Input
                  type="number"
                  value={planForm.year}
                  onChange={(e) => setPlanForm(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                  min={2020}
                  max={2050}
                />
              </div>
              <div>
                <Label>Revenue Target (₹)</Label>
                <Input
                  type="number"
                  value={planForm.revenue_target}
                  onChange={(e) => setPlanForm(prev => ({ ...prev, revenue_target: e.target.value }))}
                  placeholder="Annual revenue target"
                />
              </div>
              <div>
                <Label>Coverage Target</Label>
                <Input
                  value={planForm.coverage_target}
                  onChange={(e) => setPlanForm(prev => ({ ...prev, coverage_target: e.target.value }))}
                  placeholder="e.g., 50 new retailers"
                />
              </div>
              <Button type="submit" className="w-full">Create Plan</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="h-32 bg-muted animate-pulse rounded" />
      ) : plans.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Target className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No FY plans yet</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Year Selector */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {plans.map(plan => (
              <Button
                key={plan.id}
                variant={selectedPlan?.id === plan.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedPlan(plan)}
              >
                FY {plan.year}
              </Button>
            ))}
          </div>

          {selectedPlan && (
            <>
              {/* Plan Overview */}
              <Card>
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Revenue Target</p>
                      <p className="text-lg font-bold">₹{selectedPlan.revenue_target.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Coverage</p>
                      <p className="text-sm">{selectedPlan.coverage_target || '-'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Tabs for Product, Retailer and Month Targets */}
              <Tabs defaultValue="products">
                <TabsList className="grid grid-cols-3 w-full">
                  <TabsTrigger value="products" className="text-xs gap-1">
                    <Package className="h-3 w-3" />
                    Products
                  </TabsTrigger>
                  <TabsTrigger value="retailers" className="text-xs gap-1">
                    <Store className="h-3 w-3" />
                    Retailers
                  </TabsTrigger>
                  <TabsTrigger value="months" className="text-xs gap-1">
                    <Calendar className="h-3 w-3" />
                    Monthly
                  </TabsTrigger>
                </TabsList>

                {/* PRODUCT TARGETS TAB */}
                <TabsContent value="products" className="mt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">
                      Total: ₹{totalProductTarget.toLocaleString()}
                    </p>
                    <Button size="sm" onClick={saveProductTargets}>
                      Save Targets
                    </Button>
                  </div>

                  {categoryTargets.length === 0 ? (
                    <Card>
                      <CardContent className="py-8 text-center">
                        <p className="text-sm text-muted-foreground">No product categories available</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-2">
                      {categoryTargets.map(cat => (
                        <Card key={cat.categoryId}>
                          <Collapsible
                            open={expandedCategories.has(cat.categoryId)}
                            onOpenChange={() => toggleCategoryExpand(cat.categoryId)}
                          >
                            <CollapsibleTrigger asChild>
                              <CardHeader className="p-3 cursor-pointer hover:bg-muted/50">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    {expandedCategories.has(cat.categoryId) ? (
                                      <ChevronDown className="h-4 w-4" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4" />
                                    )}
                                    <span className="font-medium text-sm">{cat.categoryName}</span>
                                    <span className="text-xs text-muted-foreground">
                                      ({cat.products.length} products)
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                    <Input
                                      type="number"
                                      value={cat.target || ''}
                                      onChange={(e) => handleCategoryTargetChange(cat.categoryId, parseFloat(e.target.value) || 0)}
                                      className="w-28 h-8 text-right text-sm"
                                      placeholder="₹ Target"
                                    />
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 text-destructive"
                                      onClick={() => removeCategory(cat.categoryId)}
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              </CardHeader>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <CardContent className="px-3 pb-3 pt-0">
                                <div className="flex items-center gap-2 mb-3 p-2 bg-muted/50 rounded">
                                  <Checkbox
                                    id={`equal-${cat.categoryId}`}
                                    checked={cat.equalDivide}
                                    onCheckedChange={(checked) => handleEqualDivideChange(cat.categoryId, checked as boolean)}
                                  />
                                  <Label htmlFor={`equal-${cat.categoryId}`} className="text-xs cursor-pointer">
                                    Equally divide across products
                                  </Label>
                                </div>
                                <div className="space-y-2">
                                  {cat.products.map(p => (
                                    <div key={p.productId} className="flex items-center justify-between py-2 border-b last:border-0">
                                      <span className="text-sm">{p.productName}</span>
                                      <div className="flex items-center gap-2">
                                        {!cat.equalDivide && (
                                          <div className="flex items-center gap-1">
                                            <Input
                                              type="number"
                                              value={p.percentage.toFixed(1)}
                                              onChange={(e) => handleProductPercentageChange(cat.categoryId, p.productId, parseFloat(e.target.value) || 0)}
                                              className="w-16 h-7 text-right text-xs"
                                              min={0}
                                              max={100}
                                            />
                                            <span className="text-xs text-muted-foreground">%</span>
                                          </div>
                                        )}
                                        <span className="text-sm font-medium w-24 text-right">
                                          ₹{Math.round(p.target).toLocaleString()}
                                        </span>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6 text-destructive"
                                          onClick={() => removeProduct(cat.categoryId, p.productId)}
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </CardContent>
                            </CollapsibleContent>
                          </Collapsible>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* RETAILER TARGETS TAB */}
                <TabsContent value="retailers" className="mt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">
                      Total: ₹{totalRetailerTarget.toLocaleString()}
                    </p>
                    <Button size="sm" onClick={saveRetailerTargets}>
                      Save Targets
                    </Button>
                  </div>

                  {retailerCategoryTargets.length === 0 ? (
                    <Card>
                      <CardContent className="py-8 text-center">
                        <p className="text-sm text-muted-foreground">No retailers mapped to this distributor</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-2">
                      {retailerCategoryTargets.map(cat => (
                        <Card key={cat.category}>
                          <Collapsible
                            open={expandedRetailerCategories.has(cat.category)}
                            onOpenChange={() => toggleRetailerCategoryExpand(cat.category)}
                          >
                            <CollapsibleTrigger asChild>
                              <CardHeader className="p-3 cursor-pointer hover:bg-muted/50">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    {expandedRetailerCategories.has(cat.category) ? (
                                      <ChevronDown className="h-4 w-4" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4" />
                                    )}
                                    <span className="font-medium text-sm">{cat.category}</span>
                                    <span className="text-xs text-muted-foreground">
                                      ({cat.retailers.length} retailers)
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                    <Input
                                      type="number"
                                      value={cat.target || ''}
                                      onChange={(e) => handleRetailerCategoryTargetChange(cat.category, parseFloat(e.target.value) || 0)}
                                      className="w-28 h-8 text-right text-sm"
                                      placeholder="₹ Target"
                                    />
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 text-destructive"
                                      onClick={() => removeRetailerCategory(cat.category)}
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              </CardHeader>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <CardContent className="px-3 pb-3 pt-0">
                                <div className="flex items-center gap-2 mb-3 p-2 bg-muted/50 rounded">
                                  <Checkbox
                                    id={`retailer-equal-${cat.category}`}
                                    checked={cat.equalDivide}
                                    onCheckedChange={(checked) => handleRetailerEqualDivideChange(cat.category, checked as boolean)}
                                  />
                                  <Label htmlFor={`retailer-equal-${cat.category}`} className="text-xs cursor-pointer">
                                    Equally divide across retailers
                                  </Label>
                                </div>
                                <div className="space-y-2">
                                  {cat.retailers.map(r => (
                                    <div key={r.retailerId} className="flex items-center justify-between py-2 border-b last:border-0">
                                      <span className="text-sm">{r.retailerName}</span>
                                      <div className="flex items-center gap-2">
                                        {!cat.equalDivide && (
                                          <div className="flex items-center gap-1">
                                            <Input
                                              type="number"
                                              value={r.percentage.toFixed(1)}
                                              onChange={(e) => handleRetailerPercentageChange(cat.category, r.retailerId, parseFloat(e.target.value) || 0)}
                                              className="w-16 h-7 text-right text-xs"
                                              min={0}
                                              max={100}
                                            />
                                            <span className="text-xs text-muted-foreground">%</span>
                                          </div>
                                        )}
                                        <span className="text-sm font-medium w-24 text-right">
                                          ₹{Math.round(r.target).toLocaleString()}
                                        </span>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6 text-destructive"
                                          onClick={() => removeRetailer(cat.category, r.retailerId)}
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </CardContent>
                            </CollapsibleContent>
                          </Collapsible>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* MONTHLY TARGETS TAB */}
                <TabsContent value="months" className="mt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">
                      Total: ₹{totalMonthTargetComputed.toLocaleString()}
                    </p>
                    <Button size="sm" onClick={saveMonthTargets}>
                      Save Targets
                    </Button>
                  </div>

                  <Card>
                    <CardContent className="p-4 space-y-4">
                      {/* Total target input */}
                      <div className="flex items-center justify-between gap-4">
                        <Label className="text-sm font-medium">Annual Target (₹)</Label>
                        <Input
                          type="number"
                          value={monthTotalTarget || ''}
                          onChange={(e) => handleMonthTotalTargetChange(parseFloat(e.target.value) || 0)}
                          className="w-36 h-8 text-right"
                          placeholder="Enter total"
                        />
                      </div>

                      {/* Equal divide checkbox */}
                      <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                        <Checkbox
                          id="month-equal-divide"
                          checked={monthEqualDivide}
                          onCheckedChange={(checked) => handleMonthEqualDivideChange(checked as boolean)}
                        />
                        <Label htmlFor="month-equal-divide" className="text-xs cursor-pointer">
                          Equally divide across all months
                        </Label>
                      </div>

                      {/* Month-wise targets */}
                      <div className="space-y-2">
                        {monthTargets.map(m => (
                          <div key={m.monthNumber} className="flex items-center justify-between py-2 border-b last:border-0">
                            <span className="text-sm font-medium w-24">{m.monthName}</span>
                            <div className="flex items-center gap-2">
                              {!monthEqualDivide && (
                                <div className="flex items-center gap-1">
                                  <Input
                                    type="number"
                                    value={m.percentage.toFixed(1)}
                                    onChange={(e) => handleMonthPercentageChange(m.monthNumber, parseFloat(e.target.value) || 0)}
                                    className="w-16 h-7 text-right text-xs"
                                    min={0}
                                    max={100}
                                  />
                                  <span className="text-xs text-muted-foreground">%</span>
                                </div>
                              )}
                              <Input
                                type="number"
                                value={Math.round(m.target) || ''}
                                onChange={(e) => handleMonthTargetChange(m.monthNumber, parseFloat(e.target.value) || 0)}
                                className="w-28 h-7 text-right text-sm"
                                placeholder="₹ Target"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </>
          )}
        </>
      )}
    </div>
  );
}

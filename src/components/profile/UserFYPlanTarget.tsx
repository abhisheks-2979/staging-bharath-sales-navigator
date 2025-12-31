import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Target, TrendingUp, Package, Store, Calendar, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface BusinessPlan {
  id: string;
  year: number;
  revenue_target: number;
  quantity_target: number;
  quantity_unit: string;
  notes: string | null;
}

interface ProductTarget {
  id: string;
  product_id: string;
  product_name: string;
  quantity_target: number;
  revenue_target: number;
}

interface RetailerTarget {
  id: string;
  retailer_id: string;
  retailer_name: string;
  last_year_revenue: number;
  target_revenue: number;
  quantity_target: number;
  growth_percent: number;
}

interface MonthTarget {
  id: string;
  month_number: number;
  month_name: string;
  revenue_target: number;
  quantity_target: number;
}

interface Product {
  id: string;
  name: string;
}

interface Retailer {
  id: string;
  name: string;
}

const MONTHS = [
  { number: 1, name: "January" },
  { number: 2, name: "February" },
  { number: 3, name: "March" },
  { number: 4, name: "April" },
  { number: 5, name: "May" },
  { number: 6, name: "June" },
  { number: 7, name: "July" },
  { number: 8, name: "August" },
  { number: 9, name: "September" },
  { number: 10, name: "October" },
  { number: 11, name: "November" },
  { number: 12, name: "December" },
];

export function UserFYPlanTarget() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<BusinessPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<BusinessPlan | null>(null);
  const [productTargets, setProductTargets] = useState<ProductTarget[]>([]);
  const [retailerTargets, setRetailerTargets] = useState<RetailerTarget[]>([]);
  const [monthTargets, setMonthTargets] = useState<MonthTarget[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [retailerDialogOpen, setRetailerDialogOpen] = useState(false);

  const [planForm, setPlanForm] = useState({
    year: new Date().getFullYear(),
    revenue_target: "",
    quantity_target: "",
    quantity_unit: "units",
    notes: "",
  });

  const [productForm, setProductForm] = useState({
    product_id: "",
    quantity_target: "",
    revenue_target: "",
  });

  const [retailerForm, setRetailerForm] = useState({
    retailer_id: "",
    last_year_revenue: "",
    target_revenue: "",
    quantity_target: "",
  });

  useEffect(() => {
    if (user) {
      loadPlans();
      loadProducts();
      loadRetailers();
    }
  }, [user]);

  useEffect(() => {
    if (selectedPlan) {
      loadProductTargets();
      loadRetailerTargets();
      loadMonthTargets();
    }
  }, [selectedPlan]);

  const loadPlans = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('user_business_plans')
        .select('*')
        .eq('user_id', user.id)
        .order('year', { ascending: false });

      if (error) throw error;
      setPlans(data || []);
      if (data && data.length > 0) {
        setSelectedPlan(data[0]);
      }
    } catch (error: any) {
      toast.error("Failed to load business plans: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    const { data } = await supabase
      .from('products')
      .select('id, name')
      .eq('is_active', true)
      .order('name');
    setProducts(data || []);
  };

  const loadRetailers = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('retailers')
      .select('id, name')
      .eq('user_id', user.id)
      .order('name');
    setRetailers(data || []);
  };

  const loadProductTargets = async () => {
    if (!selectedPlan) return;
    const { data } = await supabase
      .from('user_business_plan_products')
      .select('*')
      .eq('business_plan_id', selectedPlan.id);
    setProductTargets(data || []);
  };

  const loadRetailerTargets = async () => {
    if (!selectedPlan) return;
    const { data } = await supabase
      .from('user_business_plan_retailers')
      .select('*')
      .eq('business_plan_id', selectedPlan.id);
    setRetailerTargets(data || []);
  };

  const loadMonthTargets = async () => {
    if (!selectedPlan) return;
    const { data } = await supabase
      .from('user_business_plan_months')
      .select('*')
      .eq('business_plan_id', selectedPlan.id)
      .order('month_number');
    setMonthTargets(data || []);
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('user_business_plans')
        .insert({
          user_id: user.id,
          year: planForm.year,
          revenue_target: parseFloat(planForm.revenue_target) || 0,
          quantity_target: parseFloat(planForm.quantity_target) || 0,
          quantity_unit: planForm.quantity_unit,
          notes: planForm.notes || null,
        })
        .select()
        .single();

      if (error) throw error;
      toast.success("FY Plan created");
      setDialogOpen(false);
      setPlanForm({
        year: new Date().getFullYear(),
        revenue_target: "",
        quantity_target: "",
        quantity_unit: "units",
        notes: "",
      });
      loadPlans();
      setSelectedPlan(data);
    } catch (error: any) {
      toast.error("Failed to create plan: " + error.message);
    }
  };

  const handleAddProductTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan || !productForm.product_id) return;

    const product = products.find(p => p.id === productForm.product_id);
    if (!product) return;

    try {
      const { error } = await supabase
        .from('user_business_plan_products')
        .insert({
          business_plan_id: selectedPlan.id,
          product_id: productForm.product_id,
          product_name: product.name,
          quantity_target: parseInt(productForm.quantity_target) || 0,
          revenue_target: parseFloat(productForm.revenue_target) || 0,
        });

      if (error) throw error;
      toast.success("Product target added");
      setProductDialogOpen(false);
      setProductForm({ product_id: "", quantity_target: "", revenue_target: "" });
      loadProductTargets();
    } catch (error: any) {
      toast.error("Failed to add product: " + error.message);
    }
  };

  const handleAddRetailerTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan || !retailerForm.retailer_id) return;

    const retailer = retailers.find(r => r.id === retailerForm.retailer_id);
    if (!retailer) return;

    const lastYear = parseFloat(retailerForm.last_year_revenue) || 0;
    const target = parseFloat(retailerForm.target_revenue) || 0;
    const growth = lastYear > 0 ? ((target - lastYear) / lastYear) * 100 : 0;

    try {
      const { error } = await supabase
        .from('user_business_plan_retailers')
        .insert({
          business_plan_id: selectedPlan.id,
          retailer_id: retailerForm.retailer_id,
          retailer_name: retailer.name,
          last_year_revenue: lastYear,
          target_revenue: target,
          quantity_target: parseFloat(retailerForm.quantity_target) || 0,
          growth_percent: growth,
        });

      if (error) throw error;
      toast.success("Retailer target added");
      setRetailerDialogOpen(false);
      setRetailerForm({ retailer_id: "", last_year_revenue: "", target_revenue: "", quantity_target: "" });
      loadRetailerTargets();
    } catch (error: any) {
      toast.error("Failed to add retailer: " + error.message);
    }
  };

  const handleUpdateMonthTarget = async (monthNumber: number, monthName: string, revenueTarget: number, quantityTarget: number) => {
    if (!selectedPlan) return;

    const existingMonth = monthTargets.find(m => m.month_number === monthNumber);

    try {
      if (existingMonth) {
        const { error } = await supabase
          .from('user_business_plan_months')
          .update({
            revenue_target: revenueTarget,
            quantity_target: quantityTarget,
          })
          .eq('id', existingMonth.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_business_plan_months')
          .insert({
            business_plan_id: selectedPlan.id,
            month_number: monthNumber,
            month_name: monthName,
            revenue_target: revenueTarget,
            quantity_target: quantityTarget,
          });
        if (error) throw error;
      }
      loadMonthTargets();
    } catch (error: any) {
      toast.error("Failed to update month target: " + error.message);
    }
  };

  const handleDeleteProductTarget = async (id: string) => {
    const { error } = await supabase
      .from('user_business_plan_products')
      .delete()
      .eq('id', id);
    if (error) toast.error("Failed to delete");
    else loadProductTargets();
  };

  const handleDeleteRetailerTarget = async (id: string) => {
    const { error } = await supabase
      .from('user_business_plan_retailers')
      .delete()
      .eq('id', id);
    if (error) toast.error("Failed to delete");
    else loadRetailerTargets();
  };

  const handleDistributeMonthly = async () => {
    if (!selectedPlan) return;
    
    const monthlyRevenue = (selectedPlan.revenue_target || 0) / 12;
    const monthlyQuantity = (selectedPlan.quantity_target || 0) / 12;

    for (const month of MONTHS) {
      await handleUpdateMonthTarget(month.number, month.name, monthlyRevenue, monthlyQuantity);
    }
    toast.success("Monthly targets distributed evenly");
  };

  const totalProductRevenue = productTargets.reduce((sum, p) => sum + (p.revenue_target || 0), 0);
  const totalProductQuantity = productTargets.reduce((sum, p) => sum + (p.quantity_target || 0), 0);
  const totalRetailerRevenue = retailerTargets.reduce((sum, r) => sum + (r.target_revenue || 0), 0);
  const totalRetailerQuantity = retailerTargets.reduce((sum, r) => sum + (r.quantity_target || 0), 0);
  const totalMonthlyRevenue = monthTargets.reduce((sum, m) => sum + (m.revenue_target || 0), 0);
  const totalMonthlyQuantity = monthTargets.reduce((sum, m) => sum + (m.quantity_target || 0), 0);

  const getMonthTarget = (monthNumber: number) => {
    return monthTargets.find(m => m.month_number === monthNumber) || { revenue_target: 0, quantity_target: 0 };
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            My FY Target Plan
          </CardTitle>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1">
                <Plus className="h-4 w-4" />
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
                  <Select
                    value={planForm.year.toString()}
                    onValueChange={(v) => setPlanForm(prev => ({ ...prev, year: parseInt(v) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[...Array(5)].map((_, i) => {
                        const year = new Date().getFullYear() + i;
                        return (
                          <SelectItem key={year} value={year.toString()}>
                            FY {year}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Annual Revenue Target (₹)</Label>
                  <Input
                    type="number"
                    value={planForm.revenue_target}
                    onChange={(e) => setPlanForm(prev => ({ ...prev, revenue_target: e.target.value }))}
                    placeholder="e.g., 1000000"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Quantity Target</Label>
                    <Input
                      type="number"
                      value={planForm.quantity_target}
                      onChange={(e) => setPlanForm(prev => ({ ...prev, quantity_target: e.target.value }))}
                      placeholder="e.g., 5000"
                    />
                  </div>
                  <div>
                    <Label>Unit</Label>
                    <Select
                      value={planForm.quantity_unit}
                      onValueChange={(v) => setPlanForm(prev => ({ ...prev, quantity_unit: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="units">Units</SelectItem>
                        <SelectItem value="kg">Kg</SelectItem>
                        <SelectItem value="liters">Liters</SelectItem>
                        <SelectItem value="boxes">Boxes</SelectItem>
                        <SelectItem value="cases">Cases</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Notes</Label>
                  <Input
                    value={planForm.notes}
                    onChange={(e) => setPlanForm(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Optional notes"
                  />
                </div>
                <Button type="submit" className="w-full">Create Plan</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : plans.length === 0 ? (
          <div className="text-center py-8">
            <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No FY plans yet. Create your first plan to set targets.</p>
          </div>
        ) : (
          <div className="space-y-4">
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
                <Card className="bg-muted/50">
                  <CardContent className="p-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Revenue Target</p>
                        <p className="text-lg font-bold">₹{(selectedPlan.revenue_target || 0).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Quantity Target</p>
                        <p className="text-lg font-bold">{(selectedPlan.quantity_target || 0).toLocaleString()} {selectedPlan.quantity_unit}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Year</p>
                        <p className="text-sm font-medium">FY {selectedPlan.year}</p>
                      </div>
                      {selectedPlan.notes && (
                        <div className="col-span-2 md:col-span-1">
                          <p className="text-xs text-muted-foreground">Notes</p>
                          <p className="text-sm">{selectedPlan.notes}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Tabs for Products, Retailers, Monthly */}
                <Tabs defaultValue="products" className="mt-4">
                  <TabsList className="grid grid-cols-3 w-full">
                    <TabsTrigger value="products" className="text-xs gap-1">
                      <Package className="h-3 w-3" />
                      Products
                    </TabsTrigger>
                    <TabsTrigger value="retailers" className="text-xs gap-1">
                      <Store className="h-3 w-3" />
                      Retailers
                    </TabsTrigger>
                    <TabsTrigger value="monthly" className="text-xs gap-1">
                      <Calendar className="h-3 w-3" />
                      Monthly
                    </TabsTrigger>
                  </TabsList>

                  {/* Products Tab */}
                  <TabsContent value="products" className="mt-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm">Product Targets</CardTitle>
                          <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="outline" className="gap-1 h-7">
                                <Plus className="h-3 w-3" />
                                Add
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Add Product Target</DialogTitle>
                              </DialogHeader>
                              <form onSubmit={handleAddProductTarget} className="space-y-4">
                                <div>
                                  <Label>Product</Label>
                                  <Select
                                    value={productForm.product_id}
                                    onValueChange={(v) => setProductForm(prev => ({ ...prev, product_id: v }))}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select product" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {products.map(p => (
                                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label>Quantity Target</Label>
                                  <Input
                                    type="number"
                                    value={productForm.quantity_target}
                                    onChange={(e) => setProductForm(prev => ({ ...prev, quantity_target: e.target.value }))}
                                  />
                                </div>
                                <div>
                                  <Label>Revenue Target (₹)</Label>
                                  <Input
                                    type="number"
                                    value={productForm.revenue_target}
                                    onChange={(e) => setProductForm(prev => ({ ...prev, revenue_target: e.target.value }))}
                                  />
                                </div>
                                <Button type="submit" className="w-full">Add Product</Button>
                              </form>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {productTargets.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">No product targets added yet</p>
                        ) : (
                          <div className="space-y-2">
                            {productTargets.map(pt => (
                              <div key={pt.id} className="flex items-center justify-between border rounded p-2">
                                <div>
                                  <p className="text-sm font-medium">{pt.product_name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    Qty: {pt.quantity_target.toLocaleString()} | ₹{pt.revenue_target.toLocaleString()}
                                  </p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-destructive"
                                  onClick={() => handleDeleteProductTarget(pt.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                            <div className="border-t pt-2 mt-2 flex justify-between text-sm font-medium">
                              <span>Total: {totalProductQuantity.toLocaleString()} qty</span>
                              <span>₹{totalProductRevenue.toLocaleString()}</span>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Retailers Tab */}
                  <TabsContent value="retailers" className="mt-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm">Retailer Growth Targets</CardTitle>
                          <Dialog open={retailerDialogOpen} onOpenChange={setRetailerDialogOpen}>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="outline" className="gap-1 h-7">
                                <Plus className="h-3 w-3" />
                                Add
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Add Retailer Target</DialogTitle>
                              </DialogHeader>
                              <form onSubmit={handleAddRetailerTarget} className="space-y-4">
                                <div>
                                  <Label>Retailer</Label>
                                  <Select
                                    value={retailerForm.retailer_id}
                                    onValueChange={(v) => setRetailerForm(prev => ({ ...prev, retailer_id: v }))}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select retailer" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {retailers.map(r => (
                                        <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label>Last Year Revenue (₹)</Label>
                                  <Input
                                    type="number"
                                    value={retailerForm.last_year_revenue}
                                    onChange={(e) => setRetailerForm(prev => ({ ...prev, last_year_revenue: e.target.value }))}
                                  />
                                </div>
                                <div>
                                  <Label>Target Revenue (₹)</Label>
                                  <Input
                                    type="number"
                                    value={retailerForm.target_revenue}
                                    onChange={(e) => setRetailerForm(prev => ({ ...prev, target_revenue: e.target.value }))}
                                  />
                                </div>
                                <div>
                                  <Label>Quantity Target</Label>
                                  <Input
                                    type="number"
                                    value={retailerForm.quantity_target}
                                    onChange={(e) => setRetailerForm(prev => ({ ...prev, quantity_target: e.target.value }))}
                                  />
                                </div>
                                <Button type="submit" className="w-full">Add Retailer</Button>
                              </form>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {retailerTargets.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">No retailer targets added yet</p>
                        ) : (
                          <div className="space-y-2">
                            {retailerTargets.map(rt => (
                              <div key={rt.id} className="flex items-center justify-between border rounded p-2">
                                <div>
                                  <p className="text-sm font-medium">{rt.retailer_name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    Last: ₹{rt.last_year_revenue.toLocaleString()} → Target: ₹{rt.target_revenue.toLocaleString()} | Qty: {rt.quantity_target.toLocaleString()}
                                  </p>
                                  <span className={`text-xs ${rt.growth_percent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    <TrendingUp className="h-3 w-3 inline mr-1" />
                                    {rt.growth_percent.toFixed(1)}% growth
                                  </span>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-destructive"
                                  onClick={() => handleDeleteRetailerTarget(rt.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                            <div className="border-t pt-2 mt-2 flex justify-between text-sm font-medium">
                              <span>Total: {totalRetailerQuantity.toLocaleString()} qty</span>
                              <span>₹{totalRetailerRevenue.toLocaleString()}</span>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Monthly Tab */}
                  <TabsContent value="monthly" className="mt-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm">Monthly Breakdown</CardTitle>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="gap-1 h-7"
                            onClick={handleDistributeMonthly}
                          >
                            Distribute Evenly
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {MONTHS.map(month => {
                            const target = getMonthTarget(month.number);
                            return (
                              <div key={month.number} className="grid grid-cols-5 gap-2 items-center">
                                <span className="text-sm font-medium col-span-1">{month.name.substring(0, 3)}</span>
                                <div className="col-span-2">
                                  <Input
                                    type="number"
                                    placeholder="Revenue ₹"
                                    className="h-8 text-xs"
                                    value={target.revenue_target || ""}
                                    onChange={(e) => {
                                      const newRevenue = parseFloat(e.target.value) || 0;
                                      handleUpdateMonthTarget(month.number, month.name, newRevenue, target.quantity_target);
                                    }}
                                  />
                                </div>
                                <div className="col-span-2">
                                  <Input
                                    type="number"
                                    placeholder="Quantity"
                                    className="h-8 text-xs"
                                    value={target.quantity_target || ""}
                                    onChange={(e) => {
                                      const newQty = parseFloat(e.target.value) || 0;
                                      handleUpdateMonthTarget(month.number, month.name, target.revenue_target, newQty);
                                    }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                          <div className="border-t pt-2 mt-2 grid grid-cols-5 gap-2 items-center text-sm font-medium">
                            <span>Total</span>
                            <span className="col-span-2">₹{totalMonthlyRevenue.toLocaleString()}</span>
                            <span className="col-span-2">{totalMonthlyQuantity.toLocaleString()} qty</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

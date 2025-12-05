import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { moveToRecycleBin } from "@/utils/recycleBinUtils";
import { 
  ArrowLeft, Plus, Search, Package, IndianRupee, 
  MoreVertical, Pencil, Trash2, Tag
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Product {
  id: string;
  product_code: string;
  product_name: string;
  description: string | null;
  category: string | null;
  unit: string;
  base_price: number;
  min_order_quantity: number;
  is_active: boolean;
  hsn_code: string | null;
  gst_rate: number;
}

const categories = ['Beverages', 'Food Products', 'FMCG', 'Electronics', 'Industrial', 'Other'];
const units = ['Piece', 'Case', 'Box', 'Kg', 'Liter', 'Pack', 'Carton'];

export default function InstitutionalProducts() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    product_code: "",
    product_name: "",
    description: "",
    category: "",
    unit: "Piece",
    base_price: "",
    min_order_quantity: "1",
    hsn_code: "",
    gst_rate: "18",
    is_active: true,
  });

  useEffect(() => {
    fetchProducts();
  }, [categoryFilter]);

  const fetchProducts = async () => {
    try {
      let query = supabase
        .from('inst_products')
        .select('*')
        .order('product_name');

      if (categoryFilter !== 'all') {
        query = query.eq('category', categoryFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.product_code || !formData.product_name || !formData.base_price) {
      toast.error('Product code, name, and price are required');
      return;
    }

    try {
      const { error } = await supabase.from('inst_products').insert({
        product_code: formData.product_code,
        product_name: formData.product_name,
        description: formData.description || null,
        category: formData.category || null,
        unit: formData.unit,
        base_price: parseFloat(formData.base_price),
        min_order_quantity: parseInt(formData.min_order_quantity) || 1,
        hsn_code: formData.hsn_code || null,
        gst_rate: parseFloat(formData.gst_rate) || 18,
        is_active: formData.is_active,
      });

      if (error) throw error;
      toast.success('Product created successfully');
      setIsCreateOpen(false);
      resetForm();
      fetchProducts();
    } catch (error: any) {
      console.error('Error creating product:', error);
      if (error.code === '23505') {
        toast.error('Product code already exists');
      } else {
        toast.error('Failed to create product');
      }
    }
  };

  const handleUpdate = async () => {
    if (!editingProduct) return;

    try {
      const { error } = await supabase
        .from('inst_products')
        .update({
          product_code: formData.product_code,
          product_name: formData.product_name,
          description: formData.description || null,
          category: formData.category || null,
          unit: formData.unit,
          base_price: parseFloat(formData.base_price),
          min_order_quantity: parseInt(formData.min_order_quantity) || 1,
          hsn_code: formData.hsn_code || null,
          gst_rate: parseFloat(formData.gst_rate) || 18,
          is_active: formData.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingProduct.id);

      if (error) throw error;
      toast.success('Product updated successfully');
      setEditingProduct(null);
      resetForm();
      fetchProducts();
    } catch (error) {
      console.error('Error updating product:', error);
      toast.error('Failed to update product');
    }
  };

  const handleDelete = async (productId: string) => {
    if (!confirm('Are you sure you want to move this product to recycle bin?')) return;

    try {
      const productData = products.find(p => p.id === productId);
      if (productData) {
        await moveToRecycleBin({
          tableName: 'inst_products',
          recordId: productId,
          recordData: productData,
          moduleName: 'Institutional Products',
          recordName: productData.product_name
        });
      }
      
      const { error } = await supabase.from('inst_products').delete().eq('id', productId);
      if (error) throw error;
      toast.success('Product moved to recycle bin');
      fetchProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Failed to delete product');
    }
  };

  const resetForm = () => {
    setFormData({
      product_code: "",
      product_name: "",
      description: "",
      category: "",
      unit: "Piece",
      base_price: "",
      min_order_quantity: "1",
      hsn_code: "",
      gst_rate: "18",
      is_active: true,
    });
  };

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      product_code: product.product_code,
      product_name: product.product_name,
      description: product.description || "",
      category: product.category || "",
      unit: product.unit,
      base_price: product.base_price.toString(),
      min_order_quantity: product.min_order_quantity.toString(),
      hsn_code: product.hsn_code || "",
      gst_rate: product.gst_rate.toString(),
      is_active: product.is_active,
    });
  };

  const filteredProducts = products.filter(product =>
    product.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.product_code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const renderFormFields = () => (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Product Code *</Label>
          <Input
            value={formData.product_code}
            onChange={(e) => setFormData(prev => ({ ...prev, product_code: e.target.value }))}
            placeholder="e.g., PRD001"
          />
        </div>
        <div className="space-y-2">
          <Label>Category</Label>
          <Select value={formData.category} onValueChange={(v) => setFormData(prev => ({ ...prev, category: v }))}>
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label>Product Name *</Label>
        <Input
          value={formData.product_name}
          onChange={(e) => setFormData(prev => ({ ...prev, product_name: e.target.value }))}
          placeholder="Product name"
        />
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Product description"
          rows={2}
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-2">
          <Label>Base Price (₹) *</Label>
          <Input
            type="number"
            value={formData.base_price}
            onChange={(e) => setFormData(prev => ({ ...prev, base_price: e.target.value }))}
            placeholder="0"
          />
        </div>
        <div className="space-y-2">
          <Label>Unit</Label>
          <Select value={formData.unit} onValueChange={(v) => setFormData(prev => ({ ...prev, unit: v }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {units.map((unit) => (
                <SelectItem key={unit} value={unit}>{unit}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Min Order Qty</Label>
          <Input
            type="number"
            value={formData.min_order_quantity}
            onChange={(e) => setFormData(prev => ({ ...prev, min_order_quantity: e.target.value }))}
            placeholder="1"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>HSN Code</Label>
          <Input
            value={formData.hsn_code}
            onChange={(e) => setFormData(prev => ({ ...prev, hsn_code: e.target.value }))}
            placeholder="HSN/SAC code"
          />
        </div>
        <div className="space-y-2">
          <Label>GST Rate (%)</Label>
          <Input
            type="number"
            value={formData.gst_rate}
            onChange={(e) => setFormData(prev => ({ ...prev, gst_rate: e.target.value }))}
            placeholder="18"
          />
        </div>
      </div>
      <div className="flex items-center justify-between">
        <Label>Active</Label>
        <Switch
          checked={formData.is_active}
          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
        />
      </div>
    </>
  );

  return (
    <Layout>
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/institutional-sales')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">Products</h1>
            <p className="text-xs text-muted-foreground">{products.length} products</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" /> Add Product
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Product</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {renderFormFields()}
                <Button onClick={handleCreate} className="w-full">
                  Create Product
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search and Filter */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Products List */}
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No products found. Create your first product!
            </div>
          ) : (
            filteredProducts.map((product) => (
              <Card key={product.id} className={`overflow-hidden ${!product.is_active ? 'opacity-60' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Package className="h-4 w-4 text-primary" />
                        <h3 className="font-semibold text-foreground">{product.product_name}</h3>
                        {!product.is_active && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                            Inactive
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
                        <span className="font-mono">{product.product_code}</span>
                        {product.category && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Tag className="h-3 w-3" /> {product.category}
                            </span>
                          </>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1 font-medium text-foreground">
                          <IndianRupee className="h-3 w-3" />
                          {formatCurrency(product.base_price)} / {product.unit}
                        </span>
                        <span>Min Qty: {product.min_order_quantity}</span>
                        <span>GST: {product.gst_rate}%</span>
                        {product.hsn_code && <span>HSN: {product.hsn_code}</span>}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditDialog(product)}>
                          <Pencil className="h-4 w-4 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDelete(product.id)} className="text-destructive">
                          <Trash2 className="h-4 w-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Edit Dialog */}
        <Dialog open={!!editingProduct} onOpenChange={(open) => !open && setEditingProduct(null)}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Product</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {renderFormFields()}
              <Button onClick={handleUpdate} className="w-full">
                Update Product
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}

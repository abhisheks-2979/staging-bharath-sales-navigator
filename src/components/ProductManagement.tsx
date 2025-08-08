import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2, Package, Tag, Gift, Search } from 'lucide-react';

interface ProductCategory {
  id: string;
  name: string;
  description: string;
}

interface Product {
  id: string;
  sku: string;
  name: string;
  description: string;
  category_id: string;
  category?: ProductCategory;
  rate: number;
  unit: string;
  closing_stock: number;
  is_active: boolean;
}

interface ProductScheme {
  id: string;
  product_id: string;
  product?: Product;
  name: string;
  description: string;
  scheme_type: string;
  condition_quantity: number;
  discount_percentage: number;
  discount_amount: number;
  free_quantity: number;
  is_active: boolean;
  start_date: string;
  end_date: string;
}

const ProductManagement = () => {
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [schemes, setSchemes] = useState<ProductScheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Dialog states
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [isSchemeDialogOpen, setIsSchemeDialogOpen] = useState(false);

  // Form states
  const [categoryForm, setCategoryForm] = useState({ id: '', name: '', description: '' });
  const [productForm, setProductForm] = useState({
    id: '',
    sku: '',
    name: '',
    description: '',
    category_id: '',
    rate: 0,
    unit: 'piece',
    closing_stock: 0,
    is_active: true
  });
  const [schemeForm, setSchemeForm] = useState({
    id: '',
    product_id: '',
    name: '',
    description: '',
    scheme_type: 'discount',
    condition_quantity: 0,
    discount_percentage: 0,
    discount_amount: 0,
    free_quantity: 0,
    is_active: true,
    start_date: '',
    end_date: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([fetchCategories(), fetchProducts(), fetchSchemes()]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('product_categories')
      .select('*')
      .order('name');
    
    if (error) throw error;
    setCategories(data || []);
  };

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        category:product_categories(*)
      `)
      .order('name');
    
    if (error) throw error;
    setProducts(data || []);
  };

  const fetchSchemes = async () => {
    const { data, error } = await supabase
      .from('product_schemes')
      .select(`
        *,
        product:products(*)
      `)
      .order('name');
    
    if (error) throw error;
    setSchemes(data || []);
  };

  const handleCategorySubmit = async () => {
    try {
      if (categoryForm.id) {
        const { error } = await supabase
          .from('product_categories')
          .update({
            name: categoryForm.name,
            description: categoryForm.description
          })
          .eq('id', categoryForm.id);
        
        if (error) throw error;
        toast.success('Category updated successfully');
      } else {
        const { error } = await supabase
          .from('product_categories')
          .insert({
            name: categoryForm.name,
            description: categoryForm.description
          });
        
        if (error) throw error;
        toast.success('Category created successfully');
      }
      
      setIsCategoryDialogOpen(false);
      setCategoryForm({ id: '', name: '', description: '' });
      fetchCategories();
    } catch (error) {
      console.error('Error saving category:', error);
      toast.error('Failed to save category');
    }
  };

  const handleProductSubmit = async () => {
    try {
      if (productForm.id) {
        const { error } = await supabase
          .from('products')
          .update({
            sku: productForm.sku,
            name: productForm.name,
            description: productForm.description,
            category_id: productForm.category_id,
            rate: productForm.rate,
            unit: productForm.unit,
            closing_stock: productForm.closing_stock,
            is_active: productForm.is_active
          })
          .eq('id', productForm.id);
        
        if (error) throw error;
        toast.success('Product updated successfully');
      } else {
        const { error } = await supabase
          .from('products')
          .insert({
            sku: productForm.sku,
            name: productForm.name,
            description: productForm.description,
            category_id: productForm.category_id,
            rate: productForm.rate,
            unit: productForm.unit,
            closing_stock: productForm.closing_stock,
            is_active: productForm.is_active
          });
        
        if (error) throw error;
        toast.success('Product created successfully');
      }
      
      setIsProductDialogOpen(false);
      setProductForm({
        id: '',
        sku: '',
        name: '',
        description: '',
        category_id: '',
        rate: 0,
        unit: 'piece',
        closing_stock: 0,
        is_active: true
      });
      fetchProducts();
    } catch (error) {
      console.error('Error saving product:', error);
      toast.error('Failed to save product');
    }
  };

  const handleSchemeSubmit = async () => {
    try {
      if (schemeForm.id) {
        const { error } = await supabase
          .from('product_schemes')
          .update({
            product_id: schemeForm.product_id,
            name: schemeForm.name,
            description: schemeForm.description,
            scheme_type: schemeForm.scheme_type,
            condition_quantity: schemeForm.condition_quantity,
            discount_percentage: schemeForm.discount_percentage,
            discount_amount: schemeForm.discount_amount,
            free_quantity: schemeForm.free_quantity,
            is_active: schemeForm.is_active,
            start_date: schemeForm.start_date || null,
            end_date: schemeForm.end_date || null
          })
          .eq('id', schemeForm.id);
        
        if (error) throw error;
        toast.success('Scheme updated successfully');
      } else {
        const { error } = await supabase
          .from('product_schemes')
          .insert({
            product_id: schemeForm.product_id,
            name: schemeForm.name,
            description: schemeForm.description,
            scheme_type: schemeForm.scheme_type,
            condition_quantity: schemeForm.condition_quantity,
            discount_percentage: schemeForm.discount_percentage,
            discount_amount: schemeForm.discount_amount,
            free_quantity: schemeForm.free_quantity,
            is_active: schemeForm.is_active,
            start_date: schemeForm.start_date || null,
            end_date: schemeForm.end_date || null
          });
        
        if (error) throw error;
        toast.success('Scheme created successfully');
      }
      
      setIsSchemeDialogOpen(false);
      setSchemeForm({
        id: '',
        product_id: '',
        name: '',
        description: '',
        scheme_type: 'discount',
        condition_quantity: 0,
        discount_percentage: 0,
        discount_amount: 0,
        free_quantity: 0,
        is_active: true,
        start_date: '',
        end_date: ''
      });
      fetchSchemes();
    } catch (error) {
      console.error('Error saving scheme:', error);
      toast.error('Failed to save scheme');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return;
    
    try {
      const { error } = await supabase
        .from('product_categories')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      toast.success('Category deleted successfully');
      fetchCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Failed to delete category');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      toast.success('Product deleted successfully');
      fetchProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Failed to delete product');
    }
  };

  const handleDeleteScheme = async (id: string) => {
    if (!confirm('Are you sure you want to delete this scheme?')) return;
    
    try {
      const { error } = await supabase
        .from('product_schemes')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      toast.success('Scheme deleted successfully');
      fetchSchemes();
    } catch (error) {
      console.error('Error deleting scheme:', error);
      toast.error('Failed to delete scheme');
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Product Management
          </CardTitle>
          <CardDescription>
            Manage your product catalog, categories, SKUs, and promotional schemes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="products" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="products" className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Products & SKUs
              </TabsTrigger>
              <TabsTrigger value="categories" className="flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Categories
              </TabsTrigger>
              <TabsTrigger value="schemes" className="flex items-center gap-2">
                <Gift className="h-4 w-4" />
                Schemes & Offers
              </TabsTrigger>
            </TabsList>

            <TabsContent value="products" className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search products or SKUs..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 w-80"
                    />
                  </div>
                </div>
                <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => setProductForm({
                      id: '',
                      sku: '',
                      name: '',
                      description: '',
                      category_id: '',
                      rate: 0,
                      unit: 'piece',
                      closing_stock: 0,
                      is_active: true
                    })}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Product
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>{productForm.id ? 'Edit Product' : 'Add New Product'}</DialogTitle>
                      <DialogDescription>
                        {productForm.id ? 'Update product details' : 'Add a new product to your catalog'}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="sku">SKU</Label>
                        <Input
                          id="sku"
                          value={productForm.sku}
                          onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                          placeholder="Enter SKU"
                        />
                      </div>
                      <div>
                        <Label htmlFor="name">Product Name</Label>
                        <Input
                          id="name"
                          value={productForm.name}
                          onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                          placeholder="Enter product name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          value={productForm.description}
                          onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                          placeholder="Enter product description"
                        />
                      </div>
                      <div>
                        <Label htmlFor="category">Category</Label>
                        <Select
                          value={productForm.category_id}
                          onValueChange={(value) => setProductForm({ ...productForm, category_id: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((category) => (
                              <SelectItem key={category.id} value={category.id}>
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="rate">Rate</Label>
                          <Input
                            id="rate"
                            type="number"
                            value={productForm.rate}
                            onChange={(e) => setProductForm({ ...productForm, rate: parseFloat(e.target.value) || 0 })}
                            placeholder="0.00"
                          />
                        </div>
                        <div>
                          <Label htmlFor="unit">Unit</Label>
                          <Select
                            value={productForm.unit}
                            onValueChange={(value) => setProductForm({ ...productForm, unit: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="piece">Piece</SelectItem>
                              <SelectItem value="kg">Kg</SelectItem>
                              <SelectItem value="liter">Liter</SelectItem>
                              <SelectItem value="packet">Packet</SelectItem>
                              <SelectItem value="bottle">Bottle</SelectItem>
                              <SelectItem value="box">Box</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="stock">Closing Stock</Label>
                        <Input
                          id="stock"
                          type="number"
                          value={productForm.closing_stock}
                          onChange={(e) => setProductForm({ ...productForm, closing_stock: parseInt(e.target.value) || 0 })}
                          placeholder="0"
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="active"
                          checked={productForm.is_active}
                          onCheckedChange={(checked) => setProductForm({ ...productForm, is_active: checked })}
                        />
                        <Label htmlFor="active">Active</Label>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsProductDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleProductSubmit}>
                        {productForm.id ? 'Update' : 'Create'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-mono">{product.sku}</TableCell>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>{product.category?.name}</TableCell>
                      <TableCell>₹{product.rate}</TableCell>
                      <TableCell>{product.unit}</TableCell>
                      <TableCell>{product.closing_stock}</TableCell>
                      <TableCell>
                        <Badge variant={product.is_active ? 'default' : 'secondary'}>
                          {product.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setProductForm({
                                id: product.id,
                                sku: product.sku,
                                name: product.name,
                                description: product.description || '',
                                category_id: product.category_id || '',
                                rate: product.rate,
                                unit: product.unit,
                                closing_stock: product.closing_stock,
                                is_active: product.is_active
                              });
                              setIsProductDialogOpen(true);
                            }}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteProduct(product.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="categories" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Product Categories</h3>
                <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => setCategoryForm({ id: '', name: '', description: '' })}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Category
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{categoryForm.id ? 'Edit Category' : 'Add New Category'}</DialogTitle>
                      <DialogDescription>
                        {categoryForm.id ? 'Update category details' : 'Create a new product category'}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="categoryName">Name</Label>
                        <Input
                          id="categoryName"
                          value={categoryForm.name}
                          onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                          placeholder="Enter category name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="categoryDescription">Description</Label>
                        <Textarea
                          id="categoryDescription"
                          value={categoryForm.description}
                          onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                          placeholder="Enter category description"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsCategoryDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCategorySubmit}>
                        {categoryForm.id ? 'Update' : 'Create'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Products</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell className="font-medium">{category.name}</TableCell>
                      <TableCell>{category.description}</TableCell>
                      <TableCell>
                        {products.filter(p => p.category_id === category.id).length} products
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setCategoryForm({
                                id: category.id,
                                name: category.name,
                                description: category.description || ''
                              });
                              setIsCategoryDialogOpen(true);
                            }}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteCategory(category.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="schemes" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Product Schemes & Offers</h3>
                <Dialog open={isSchemeDialogOpen} onOpenChange={setIsSchemeDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => setSchemeForm({
                      id: '',
                      product_id: '',
                      name: '',
                      description: '',
                      scheme_type: 'discount',
                      condition_quantity: 0,
                      discount_percentage: 0,
                      discount_amount: 0,
                      free_quantity: 0,
                      is_active: true,
                      start_date: '',
                      end_date: ''
                    })}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Scheme
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>{schemeForm.id ? 'Edit Scheme' : 'Add New Scheme'}</DialogTitle>
                      <DialogDescription>
                        {schemeForm.id ? 'Update scheme details' : 'Create a new promotional scheme'}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="product">Product</Label>
                        <Select
                          value={schemeForm.product_id}
                          onValueChange={(value) => setSchemeForm({ ...schemeForm, product_id: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select product" />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map((product) => (
                              <SelectItem key={product.id} value={product.id}>
                                {product.name} ({product.sku})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="schemeName">Scheme Name</Label>
                        <Input
                          id="schemeName"
                          value={schemeForm.name}
                          onChange={(e) => setSchemeForm({ ...schemeForm, name: e.target.value })}
                          placeholder="Enter scheme name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="schemeDescription">Description</Label>
                        <Textarea
                          id="schemeDescription"
                          value={schemeForm.description}
                          onChange={(e) => setSchemeForm({ ...schemeForm, description: e.target.value })}
                          placeholder="Enter scheme description"
                        />
                      </div>
                      <div>
                        <Label htmlFor="schemeType">Scheme Type</Label>
                        <Select
                          value={schemeForm.scheme_type}
                          onValueChange={(value) => 
                            setSchemeForm({ ...schemeForm, scheme_type: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="discount">Percentage Discount</SelectItem>
                            <SelectItem value="buy_x_get_y">Buy X Get Y Free</SelectItem>
                            <SelectItem value="percentage_off">Fixed Amount Off</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="conditionQty">Minimum Quantity</Label>
                        <Input
                          id="conditionQty"
                          type="number"
                          value={schemeForm.condition_quantity}
                          onChange={(e) => setSchemeForm({ ...schemeForm, condition_quantity: parseInt(e.target.value) || 0 })}
                          placeholder="Minimum quantity required"
                        />
                      </div>
                      {schemeForm.scheme_type === 'discount' && (
                        <div>
                          <Label htmlFor="discountPercentage">Discount Percentage (%)</Label>
                          <Input
                            id="discountPercentage"
                            type="number"
                            value={schemeForm.discount_percentage}
                            onChange={(e) => setSchemeForm({ ...schemeForm, discount_percentage: parseFloat(e.target.value) || 0 })}
                            placeholder="Discount percentage"
                          />
                        </div>
                      )}
                      {schemeForm.scheme_type === 'percentage_off' && (
                        <div>
                          <Label htmlFor="discountAmount">Discount Amount (₹)</Label>
                          <Input
                            id="discountAmount"
                            type="number"
                            value={schemeForm.discount_amount}
                            onChange={(e) => setSchemeForm({ ...schemeForm, discount_amount: parseFloat(e.target.value) || 0 })}
                            placeholder="Fixed discount amount"
                          />
                        </div>
                      )}
                      {schemeForm.scheme_type === 'buy_x_get_y' && (
                        <div>
                          <Label htmlFor="freeQuantity">Free Quantity</Label>
                          <Input
                            id="freeQuantity"
                            type="number"
                            value={schemeForm.free_quantity}
                            onChange={(e) => setSchemeForm({ ...schemeForm, free_quantity: parseInt(e.target.value) || 0 })}
                            placeholder="Free quantity"
                          />
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="startDate">Start Date</Label>
                          <Input
                            id="startDate"
                            type="date"
                            value={schemeForm.start_date}
                            onChange={(e) => setSchemeForm({ ...schemeForm, start_date: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="endDate">End Date</Label>
                          <Input
                            id="endDate"
                            type="date"
                            value={schemeForm.end_date}
                            onChange={(e) => setSchemeForm({ ...schemeForm, end_date: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="schemeActive"
                          checked={schemeForm.is_active}
                          onCheckedChange={(checked) => setSchemeForm({ ...schemeForm, is_active: checked })}
                        />
                        <Label htmlFor="schemeActive">Active</Label>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsSchemeDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleSchemeSubmit}>
                        {schemeForm.id ? 'Update' : 'Create'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Scheme Name</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schemes.map((scheme) => (
                    <TableRow key={scheme.id}>
                      <TableCell className="font-medium">{scheme.name}</TableCell>
                      <TableCell>{scheme.product?.name}</TableCell>
                      <TableCell className="capitalize">{scheme.scheme_type.replace('_', ' ')}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>Min Qty: {scheme.condition_quantity}</p>
                          {scheme.scheme_type === 'discount' && (
                            <p>Discount: {scheme.discount_percentage}%</p>
                          )}
                          {scheme.scheme_type === 'percentage_off' && (
                            <p>Discount: ₹{scheme.discount_amount}</p>
                          )}
                          {scheme.scheme_type === 'buy_x_get_y' && (
                            <p>Free Qty: {scheme.free_quantity}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={scheme.is_active ? 'default' : 'secondary'}>
                          {scheme.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSchemeForm({
                                id: scheme.id,
                                product_id: scheme.product_id,
                                name: scheme.name,
                                description: scheme.description || '',
                                scheme_type: scheme.scheme_type,
                                condition_quantity: scheme.condition_quantity,
                                discount_percentage: scheme.discount_percentage,
                                discount_amount: scheme.discount_amount,
                                free_quantity: scheme.free_quantity,
                                is_active: scheme.is_active,
                                start_date: scheme.start_date || '',
                                end_date: scheme.end_date || ''
                              });
                              setIsSchemeDialogOpen(true);
                            }}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteScheme(scheme.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductManagement;
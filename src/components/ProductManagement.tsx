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
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2, Package, Tag, Gift, Search, Grid3X3, Camera, Loader2 } from 'lucide-react';
import { SchemeFormFields } from './SchemeFormFields';
import { SchemeDetailsDisplay } from './SchemeDetailsDisplay';
import { migrateProducts } from '@/utils/productMigration';

interface ProductCategory {
  id: string;
  name: string;
  description: string;
}

interface Product {
  id: string;
  sku: string;
  product_number?: string;
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
  product_id?: string;
  product?: Product;
  variant_id?: string;
  category_id?: string;
  name: string;
  description: string;
  scheme_type: string;
  condition_quantity: number;
  quantity_condition_type?: string;
  discount_percentage: number;
  discount_amount: number;
  free_quantity: number;
  buy_quantity: number;
  free_product_id?: string;
  bundle_product_ids: string[];
  bundle_discount_amount: number;
  bundle_discount_percentage: number;
  tier_data: Array<{
    min_qty: number;
    max_qty: number;
    discount_percentage: number;
  }>;
  is_first_order_only: boolean;
  validity_days?: number;
  min_order_value: number;
  is_active: boolean;
  start_date: string;
  end_date: string;
}

interface ProductVariant {
  id: string;
  product_id: string;
  variant_name: string;
  sku: string;
  price: number;
  stock_quantity: number;
  discount_percentage: number;
  discount_amount: number;
  is_active: boolean;
}

const ProductManagement = () => {
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [schemes, setSchemes] = useState<ProductScheme[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProductForVariants, setSelectedProductForVariants] = useState<string>('');
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Dialog states
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [isSchemeDialogOpen, setIsSchemeDialogOpen] = useState(false);
  const [isVariantDialogOpen, setIsVariantDialogOpen] = useState(false);
  const [isVariantsViewOpen, setIsVariantsViewOpen] = useState(false);

  // Form states
  const [categoryForm, setCategoryForm] = useState({ id: '', name: '', description: '' });
const [productForm, setProductForm] = useState({
  id: '',
  sku: '',
  product_number: '',
  name: '',
  description: '',
  category_id: '',
  rate: 0,
  unit: 'piece',
  closing_stock: 0,
  is_active: true,
  sku_image_url: ''
});
  const [schemeForm, setSchemeForm] = useState({
    id: '',
    product_id: '',
    variant_id: '',
    category_id: '',
    name: '',
    description: '',
    scheme_type: 'percentage_discount',
    condition_quantity: 0,
    quantity_condition_type: 'more_than',
    discount_percentage: 0,
    discount_amount: 0,
    free_quantity: 0,
    buy_quantity: 0,
    free_product_id: '',
    bundle_product_ids: [],
    bundle_discount_amount: 0,
    bundle_discount_percentage: 0,
    tier_data: [],
    is_first_order_only: false,
    validity_days: null,
    min_order_value: 0,
    is_active: true,
    start_date: '',
    end_date: ''
  });
  
  const [variantForm, setVariantForm] = useState({
    id: '',
    product_id: '',
    variant_name: '',
    sku: '',
    price: 0,
    stock_quantity: 0,
    discount_percentage: 0,
    discount_amount: 0,
    is_active: true
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([fetchCategories(), fetchProducts(), fetchSchemes(), fetchVariants()]);
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
        product:products!product_schemes_product_id_fkey(*),
        category:product_categories(*),
        free_product:products!product_schemes_free_product_id_fkey(*)
      `)
      .order('name');
    
    if (error) throw error;
    setSchemes((data as any) || []);
  };

  const fetchVariants = async () => {
    const { data, error } = await supabase
      .from('product_variants')
      .select('*')
      .order('variant_name');
    
    if (error) throw error;
    setVariants(data || []);
  };

  const handleVariantSubmit = async () => {
    try {
      // Auto-generate SKU if empty
      let variantSku = variantForm.sku.trim();
      if (!variantSku) {
        // Generate unique SKU based on product and variant name
        const baseProduct = products.find(p => p.id === variantForm.product_id);
        const productSku = baseProduct?.sku || 'PROD';
        const variantNameClean = variantForm.variant_name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        variantSku = `${productSku}_${variantNameClean}_${Date.now().toString().slice(-6)}`;
      }

      if (variantForm.id) {
        const { error } = await supabase
          .from('product_variants')
          .update({
            product_id: variantForm.product_id,
            variant_name: variantForm.variant_name,
            sku: variantSku,
            price: variantForm.price,
            stock_quantity: variantForm.stock_quantity,
            discount_percentage: variantForm.discount_percentage,
            discount_amount: variantForm.discount_amount,
            is_active: variantForm.is_active
          })
          .eq('id', variantForm.id);
        
        if (error) throw error;
        toast.success('Variant updated successfully');
      } else {
        const { error } = await supabase
          .from('product_variants')
          .insert({
            product_id: variantForm.product_id,
            variant_name: variantForm.variant_name,
            sku: variantSku,
            price: variantForm.price,
            stock_quantity: variantForm.stock_quantity,
            discount_percentage: variantForm.discount_percentage,
            discount_amount: variantForm.discount_amount,
            is_active: variantForm.is_active
          });
        
        if (error) throw error;
        toast.success('Variant created successfully');
      }
      
      setIsVariantDialogOpen(false);
      setVariantForm({
        id: '',
        product_id: '',
        variant_name: '',
        sku: '',
        price: 0,
        stock_quantity: 0,
        discount_percentage: 0,
        discount_amount: 0,
        is_active: true
      });
      fetchVariants();
    } catch (error) {
      console.error('Error saving variant:', error);
      toast.error('Failed to save variant');
    }
  };

  const handleDeleteVariant = async (id: string) => {
    if (!confirm('Are you sure you want to delete this variant?')) return;
    
    try {
      const { error } = await supabase
        .from('product_variants')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      toast.success('Variant deleted successfully');
      fetchVariants();
    } catch (error) {
      console.error('Error deleting variant:', error);
      toast.error('Failed to delete variant');
    }
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
            product_number: productForm.product_number || null,
            name: productForm.name,
            description: productForm.description,
            category_id: productForm.category_id || null,
            rate: productForm.rate,
            unit: productForm.unit,
            closing_stock: productForm.closing_stock,
            is_active: productForm.is_active,
            sku_image_url: productForm.sku_image_url || null
          })
          .eq('id', productForm.id);
        
        if (error) throw error;
        toast.success('Product updated successfully');
      } else {
        const { error } = await supabase
          .from('products')
          .insert({
            sku: productForm.sku,
            product_number: productForm.product_number || null,
            name: productForm.name,
            description: productForm.description,
            category_id: productForm.category_id || null,
            rate: productForm.rate,
            unit: productForm.unit,
            closing_stock: productForm.closing_stock,
            is_active: productForm.is_active,
            sku_image_url: productForm.sku_image_url || null
          });
        
        if (error) throw error;
        toast.success('Product created successfully');
      }
      
      setIsProductDialogOpen(false);
setProductForm({
  id: '',
  sku: '',
  product_number: '',
  name: '',
  description: '',
  category_id: '',
  rate: 0,
  unit: 'piece',
  closing_stock: 0,
  is_active: true,
  sku_image_url: ''
});
      fetchProducts();
    } catch (error) {
      console.error('Error saving product:', error);
      toast.error('Failed to save product');
    }
  };

  const processProductPhoto = async (file: File) => {
    setUploadingPhoto(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random()}.${fileExt}`;
      const filePath = `products/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('product-photos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('product-photos')
        .getPublicUrl(filePath);

      setProductForm(prev => ({ ...prev, sku_image_url: publicUrl }));
      toast.success('Product photo uploaded successfully');
    } catch (error) {
      console.error('Error uploading product photo:', error);
      toast.error('Failed to upload product photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSkuImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processProductPhoto(file);
  };

  const handleCameraCapture = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (file) {
        await processProductPhoto(file);
      }
    };
    input.click();
    setShowPhotoOptions(false);
  };

  const handleGalleryUpload = () => {
    const input = document.getElementById('sku-image') as HTMLInputElement;
    input?.click();
    setShowPhotoOptions(false);
  };

  const handleSchemeSubmit = async () => {
    try {
      if (schemeForm.id) {
        const { error } = await supabase
          .from('product_schemes')
          .update({
            product_id: schemeForm.product_id || null,
            variant_id: schemeForm.variant_id === 'all' ? null : schemeForm.variant_id,
            category_id: schemeForm.category_id || null,
            name: schemeForm.name,
            description: schemeForm.description,
            scheme_type: schemeForm.scheme_type,
            condition_quantity: schemeForm.condition_quantity,
            quantity_condition_type: schemeForm.quantity_condition_type,
            discount_percentage: schemeForm.discount_percentage,
            discount_amount: schemeForm.discount_amount,
            free_quantity: schemeForm.free_quantity,
            buy_quantity: schemeForm.buy_quantity,
            free_product_id: schemeForm.free_product_id || null,
            bundle_product_ids: schemeForm.bundle_product_ids,
            bundle_discount_amount: schemeForm.bundle_discount_amount,
            bundle_discount_percentage: schemeForm.bundle_discount_percentage,
            tier_data: schemeForm.tier_data,
            is_first_order_only: schemeForm.is_first_order_only,
            validity_days: schemeForm.validity_days,
            min_order_value: schemeForm.min_order_value,
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
            product_id: schemeForm.product_id || null,
            variant_id: schemeForm.variant_id === 'all' ? null : schemeForm.variant_id,
            category_id: schemeForm.category_id || null,
            name: schemeForm.name,
            description: schemeForm.description,
            scheme_type: schemeForm.scheme_type,
            condition_quantity: schemeForm.condition_quantity,
            quantity_condition_type: schemeForm.quantity_condition_type,
            discount_percentage: schemeForm.discount_percentage,
            discount_amount: schemeForm.discount_amount,
            free_quantity: schemeForm.free_quantity,
            buy_quantity: schemeForm.buy_quantity,
            free_product_id: schemeForm.free_product_id || null,
            bundle_product_ids: schemeForm.bundle_product_ids,
            bundle_discount_amount: schemeForm.bundle_discount_amount,
            bundle_discount_percentage: schemeForm.bundle_discount_percentage,
            tier_data: schemeForm.tier_data,
            is_first_order_only: schemeForm.is_first_order_only,
            validity_days: schemeForm.validity_days,
            min_order_value: schemeForm.min_order_value,
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
        variant_id: 'all',
        category_id: '',
        name: '',
        description: '',
        scheme_type: 'percentage_discount',
        condition_quantity: 0,
        quantity_condition_type: 'more_than',
        discount_percentage: 0,
        discount_amount: 0,
        free_quantity: 0,
        buy_quantity: 0,
        free_product_id: '',
        bundle_product_ids: [],
        bundle_discount_amount: 0,
        bundle_discount_percentage: 0,
        tier_data: [],
        is_first_order_only: false,
        validity_days: null,
        min_order_value: 0,
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
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={async () => {
                      const success = await migrateProducts();
                      if (success) {
                        fetchData();
                      }
                    }}
                  >
                    Reset & Load Products
                  </Button>
                  <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
                    <DialogTrigger asChild>
<Button onClick={() => setProductForm({
  id: '',
  sku: '',
  product_number: '',
  name: '',
  description: '',
  category_id: '',
  rate: 0,
  unit: 'piece',
  closing_stock: 0,
  is_active: true,
  sku_image_url: ''
})}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Product
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
                    <DialogHeader>
                      <DialogTitle>{productForm.id ? 'Edit Product' : 'Add New Product'}</DialogTitle>
                      <DialogDescription>
                        {productForm.id ? 'Update product details' : 'Add a new product to your catalog'}
                      </DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="h-[400px] overflow-y-auto">
                      <div className="space-y-4 p-4">
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
                        <Label htmlFor="productNumber">Product Number</Label>
                        <Input
                          id="productNumber"
                          value={productForm.product_number}
                          onChange={(e) => setProductForm({ ...productForm, product_number: e.target.value })}
                          placeholder="Enter product number"
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
                              <SelectItem value="grams">Grams</SelectItem>
                              <SelectItem value="liter">Liter</SelectItem>
                              <SelectItem value="packet">Packet</SelectItem>
                              <SelectItem value="bottle">Bottle</SelectItem>
                              <SelectItem value="box">Box</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <Label>Product Photo</Label>
                        <div className="space-y-2">
                          {productForm.sku_image_url && (
                            <div className="relative w-32 h-32 mx-auto">
                              <img 
                                src={productForm.sku_image_url} 
                                alt="Product" 
                                className="w-full h-full object-cover rounded border"
                              />
                            </div>
                          )}
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowPhotoOptions(!showPhotoOptions)}
                            className="w-full"
                            disabled={uploadingPhoto}
                          >
                            <Camera className="h-4 w-4 mr-2" />
                            {productForm.sku_image_url ? 'Change Photo' : 'Add Photo'}
                          </Button>
                          
                          {showPhotoOptions && (
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                variant="secondary"
                                onClick={handleCameraCapture}
                                className="flex-1"
                              >
                                <Camera className="h-4 w-4 mr-2" />
                                Camera
                              </Button>
                              <Button
                                type="button"
                                variant="secondary"
                                onClick={handleGalleryUpload}
                                className="flex-1"
                              >
                                Gallery
                              </Button>
                            </div>
                          )}
                          
                          <Input
                            id="sku-image"
                            type="file"
                            accept="image/*"
                            onChange={handleSkuImageUpload}
                            className="hidden"
                          />
                          
                          {uploadingPhoto && (
                            <div className="flex items-center gap-2 p-2 bg-muted rounded">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span className="text-sm text-muted-foreground">Uploading photo...</span>
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Capture or upload a product photo (used for AI stock counting)
                        </p>
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
                     </ScrollArea>
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
              </div>

              <ScrollArea className="h-[400px] rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Image</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Variants</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>
                          {(product as any).sku_image_url ? (
                            <img 
                              src={(product as any).sku_image_url} 
                              alt={product.name}
                              className="w-12 h-12 object-cover rounded border"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-muted rounded border flex items-center justify-center">
                              <Package className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-mono">{product.sku}</TableCell>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell>{product.category?.name}</TableCell>
                        <TableCell>₹{product.rate}</TableCell>
                        <TableCell>{product.unit}</TableCell>
                        <TableCell>{product.closing_stock}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              {variants.filter(v => v.product_id === product.id).length} variants
                            </Badge>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedProductForVariants(product.id);
                                setIsVariantsViewOpen(true);
                              }}
                            >
                              <Grid3X3 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
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
  product_number: product.product_number || '',
  name: product.name,
  description: product.description || '',
  category_id: product.category_id || '',
  rate: product.rate,
  unit: product.unit,
  closing_stock: product.closing_stock,
  is_active: product.is_active,
  sku_image_url: (product as any).sku_image_url || ''
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
              </ScrollArea>
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

              <ScrollArea className="h-[400px] rounded-md border">
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
              </ScrollArea>
            </TabsContent>

            <TabsContent value="schemes" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Product Schemes & Offers</h3>
                <Dialog open={isSchemeDialogOpen} onOpenChange={setIsSchemeDialogOpen}>
                  <DialogTrigger asChild>
                  <Button onClick={() => setSchemeForm({
                    id: '',
                    product_id: '',
                    variant_id: 'all',
                    category_id: '',
                    name: '',
                    description: '',
                    scheme_type: 'percentage_discount',
                    condition_quantity: 0,
                    quantity_condition_type: 'more_than',
                    discount_percentage: 0,
                    discount_amount: 0,
                    free_quantity: 0,
                    buy_quantity: 0,
                    free_product_id: '',
                    bundle_product_ids: [],
                    bundle_discount_amount: 0,
                    bundle_discount_percentage: 0,
                    tier_data: [],
                    is_first_order_only: false,
                    validity_days: null,
                    min_order_value: 0,
                    is_active: true,
                    start_date: '',
                    end_date: ''
                  })}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Scheme
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md max-h-[90vh] overflow-hidden">
                    <DialogHeader>
                      <DialogTitle>{schemeForm.id ? 'Edit Scheme' : 'Add New Scheme'}</DialogTitle>
                      <DialogDescription>
                        {schemeForm.id ? 'Update scheme details' : 'Create a new promotional scheme'}
                      </DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="h-[60vh] pr-4">
                      <SchemeFormFields 
                        schemeForm={schemeForm} 
                        setSchemeForm={setSchemeForm}
                        products={products}
                        categories={categories}
                      />
                    </ScrollArea>
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

              <ScrollArea className="h-[400px] rounded-md border">
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
                          <SchemeDetailsDisplay scheme={scheme} />
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
                                  product_id: scheme.product_id || '',
                                  variant_id: scheme.variant_id || 'all',
                                  category_id: scheme.category_id || '',
                                  name: scheme.name,
                                  description: scheme.description || '',
                                  scheme_type: scheme.scheme_type,
                                  condition_quantity: scheme.condition_quantity,
                                  quantity_condition_type: scheme.quantity_condition_type || 'more_than',
                                  discount_percentage: scheme.discount_percentage,
                                  discount_amount: scheme.discount_amount,
                                  free_quantity: scheme.free_quantity,
                                  buy_quantity: scheme.buy_quantity || 0,
                                  free_product_id: scheme.free_product_id || '',
                                  bundle_product_ids: scheme.bundle_product_ids || [],
                                  bundle_discount_amount: scheme.bundle_discount_amount || 0,
                                  bundle_discount_percentage: scheme.bundle_discount_percentage || 0,
                                  tier_data: scheme.tier_data || [],
                                  is_first_order_only: scheme.is_first_order_only || false,
                                  validity_days: scheme.validity_days || null,
                                  min_order_value: scheme.min_order_value || 0,
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
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Product Variants Management Dialog */}
      <Dialog open={isVariantsViewOpen} onOpenChange={setIsVariantsViewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Grid3X3 className="h-5 w-5" />
              Product Variants
              {selectedProductForVariants && (
                <span className="text-sm font-normal text-muted-foreground">
                  - {products.find(p => p.id === selectedProductForVariants)?.name}
                </span>
              )}
            </DialogTitle>
            <DialogDescription>
              Manage variants for the selected product with different sizes, prices, and stock
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto space-y-4">
            <div className="flex justify-end">
              <Dialog open={isVariantDialogOpen} onOpenChange={setIsVariantDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    onClick={() => setVariantForm({
                      id: '',
                      product_id: selectedProductForVariants,
                      variant_name: '',
                      sku: '',
                      price: 0,
                      stock_quantity: 0,
                      discount_percentage: 0,
                      discount_amount: 0,
                      is_active: true
                    })}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Variant
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>{variantForm.id ? 'Edit Variant' : 'Add New Variant'}</DialogTitle>
                    <DialogDescription>
                      {variantForm.id ? 'Update variant details' : 'Create a new product variant'}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="variantName">Variant Name</Label>
                      <Input
                        id="variantName"
                        value={variantForm.variant_name}
                        onChange={(e) => setVariantForm({ ...variantForm, variant_name: e.target.value })}
                        placeholder="e.g., 1kg, 5kg bag, Large"
                      />
                    </div>
                    <div>
                      <Label htmlFor="variantSku">SKU</Label>
                      <Input
                        id="variantSku"
                        value={variantForm.sku}
                        onChange={(e) => setVariantForm({ ...variantForm, sku: e.target.value })}
                        placeholder="Unique SKU for this variant"
                      />
                    </div>
                    <div>
                      <Label htmlFor="variantPrice">Price (₹)</Label>
                      <Input
                        id="variantPrice"
                        type="number"
                        value={variantForm.price}
                        onChange={(e) => {
                          const price = parseFloat(e.target.value) || 0;
                          const discountAmount = (price * variantForm.discount_percentage) / 100;
                          setVariantForm({ 
                            ...variantForm, 
                            price,
                            discount_amount: Number(discountAmount.toFixed(2))
                          });
                        }}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <Label htmlFor="variantStock">Stock Quantity</Label>
                      <Input
                        id="variantStock"
                        type="number"
                        value={variantForm.stock_quantity}
                        onChange={(e) => setVariantForm({ ...variantForm, stock_quantity: parseInt(e.target.value) || 0 })}
                        placeholder="0"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="discountPerc">Discount %</Label>
                        <Input
                          id="discountPerc"
                          type="number"
                          value={variantForm.discount_percentage}
                          onChange={(e) => {
                            const percentage = parseFloat(e.target.value) || 0;
                            const discountAmount = (variantForm.price * percentage) / 100;
                            setVariantForm({ 
                              ...variantForm, 
                              discount_percentage: percentage,
                              discount_amount: Number(discountAmount.toFixed(2))
                            });
                          }}
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <Label htmlFor="discountAmt">Discount Amount (₹)</Label>
                        <Input
                          id="discountAmt"
                          type="number"
                          value={variantForm.discount_amount}
                          onChange={(e) => setVariantForm({ ...variantForm, discount_amount: parseFloat(e.target.value) || 0 })}
                          placeholder="0"
                          readOnly
                          className="bg-muted"
                        />
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="variantActive"
                        checked={variantForm.is_active}
                        onCheckedChange={(checked) => setVariantForm({ ...variantForm, is_active: checked })}
                      />
                      <Label htmlFor="variantActive">Active</Label>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsVariantDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleVariantSubmit}>
                      {variantForm.id ? 'Update' : 'Create'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <ScrollArea className="h-[350px] rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Variant Name</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Discounts</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {variants
                    .filter(variant => variant.product_id === selectedProductForVariants)
                    .map((variant) => (
                      <TableRow key={variant.id}>
                        <TableCell className="font-medium">{variant.variant_name}</TableCell>
                        <TableCell className="font-mono">{variant.sku}</TableCell>
                        <TableCell>₹{variant.price}</TableCell>
                        <TableCell>{variant.stock_quantity}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {variant.discount_percentage > 0 && (
                              <div>{variant.discount_percentage}% off</div>
                            )}
                            {variant.discount_amount > 0 && (
                              <div>₹{variant.discount_amount} off</div>
                            )}
                            {variant.discount_percentage === 0 && variant.discount_amount === 0 && (
                              <span className="text-muted-foreground">No discount</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={variant.is_active ? 'default' : 'secondary'}>
                            {variant.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setVariantForm({
                                  id: variant.id,
                                  product_id: variant.product_id,
                                  variant_name: variant.variant_name,
                                  sku: variant.sku,
                                  price: variant.price,
                                  stock_quantity: variant.stock_quantity,
                                  discount_percentage: variant.discount_percentage,
                                  discount_amount: variant.discount_amount,
                                  is_active: variant.is_active
                                });
                                setIsVariantDialogOpen(true);
                              }}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteVariant(variant.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </ScrollArea>
            
            {variants.filter(v => v.product_id === selectedProductForVariants).length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Grid3X3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No variants created yet</p>
                <p className="text-sm">Create variants to manage different sizes and pricing</p>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsVariantsViewOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductManagement;
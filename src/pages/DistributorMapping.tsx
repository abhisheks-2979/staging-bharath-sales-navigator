import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Plus, Building2, Package, Search, Edit, Trash2, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import DistributorList from '@/components/DistributorList';
import SuperStockistList from '@/components/SuperStockistList';

interface Retailer {
  id: string;
  name: string;
  address: string;
  category?: string;
}

interface Distributor {
  id: string;
  name: string;
  contact_name?: string;
  skills: string[];
  city?: string;
  state?: string;
}

interface DistributorMapping {
  id: string;
  distributor_id: string;
  retailer_id: string;
  mapping_type: 'all_items' | 'specific_items';
  distributor: Distributor;
  items?: Array<{
    id: string;
    product_name?: string;
    category_name?: string;
  }>;
}

interface Product {
  id: string;
  name: string;
  category: string;
}

interface ProductCategory {
  id: string;
  name: string;
}

const DistributorMapping = () => {
  const { loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const retailerId = searchParams.get('retailerId');
  const retailerName = searchParams.get('retailerName') || 'Retailer';

  const [retailer, setRetailer] = useState<Retailer | null>(null);
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [mappings, setMappings] = useState<DistributorMapping[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMapping, setEditingMapping] = useState<DistributorMapping | null>(null);

  // Form state
  const [selectedDistributorId, setSelectedDistributorId] = useState('');
  const [mappingType, setMappingType] = useState<'all_items' | 'specific_items'>('all_items');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  useEffect(() => {
    if (retailerId) {
      loadData();
    }
  }, [retailerId]);

  const loadData = async () => {
    try {
      setIsLoading(true);

      // Load retailer details
      const { data: retailerData, error: retailerError } = await supabase
        .from('retailers')
        .select('id, name, address, category')
        .eq('id', retailerId)
        .single();

      if (retailerError) throw retailerError;
      setRetailer(retailerData);

      // Load distributors
      const { data: distributorsData, error: distributorsError } = await supabase
        .from('vendors')
        .select('id, name, contact_name, skills, city, state')
        .eq('is_approved', true)
        .order('name');

      if (distributorsError) throw distributorsError;
      setDistributors(distributorsData || []);

      // Load existing mappings - handle the database relation manually
      const { data: mappingsData, error: mappingsError } = await supabase
        .from('distributor_retailer_mappings')
        .select('*')
        .eq('retailer_id', retailerId);

      if (mappingsError) throw mappingsError;

      // Fetch distributors for the mappings
      if (mappingsData && mappingsData.length > 0) {
        const distributorIds = mappingsData.map(m => m.distributor_id);
        const { data: distributorDetails } = await supabase
          .from('vendors')
          .select('id, name, contact_name, skills, city, state')
          .in('id', distributorIds);

        // Fetch item mappings
        const mappingIds = mappingsData.map(m => m.id);
        const { data: itemMappings } = await supabase
          .from('distributor_item_mappings')
          .select('*')
          .in('mapping_id', mappingIds);

        // Combine the data
        const combinedMappings = mappingsData.map(mapping => ({
          ...mapping,
          distributor: distributorDetails?.find(d => d.id === mapping.distributor_id),
          items: itemMappings?.filter(item => item.mapping_id === mapping.id) || []
        }));

        setMappings(combinedMappings as DistributorMapping[]);
      } else {
        setMappings([]);
      }

      // Load products and categories
      const [productsRes, categoriesRes] = await Promise.all([
        supabase
          .from('products')
          .select(`
            id, name,
            category:product_categories(name)
          `)
          .eq('is_active', true)
          .order('name'),
        supabase
          .from('product_categories')
          .select('id, name')
          .order('name')
      ]);

      if (productsRes.error) throw productsRes.error;
      if (categoriesRes.error) throw categoriesRes.error;

      const mappedProducts = (productsRes.data || []).map(p => ({
        id: p.id,
        name: p.name,
        category: p.category?.name || 'Uncategorized'
      }));

      setProducts(mappedProducts);
      setCategories(categoriesRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load distributor mappings',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveMapping = async () => {
    try {
      if (!selectedDistributorId) {
        toast({
          title: 'Error',
          description: 'Please select a distributor',
          variant: 'destructive'
        });
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      if (editingMapping) {
        // Update existing mapping
        const { error: updateError } = await supabase
          .from('distributor_retailer_mappings')
          .update({
            distributor_id: selectedDistributorId,
            mapping_type: mappingType
          })
          .eq('id', editingMapping.id);

        if (updateError) throw updateError;

        // Delete existing item mappings
        await supabase
          .from('distributor_item_mappings')
          .delete()
          .eq('mapping_id', editingMapping.id);

        // Insert new item mappings if specific items
        if (mappingType === 'specific_items') {
          await insertItemMappings(editingMapping.id);
        }
      } else {
        // Create new mapping
        const { data: mapping, error: mappingError } = await supabase
          .from('distributor_retailer_mappings')
          .insert({
            distributor_id: selectedDistributorId,
            retailer_id: retailerId,
            user_id: user.id,
            mapping_type: mappingType
          })
          .select()
          .single();

        if (mappingError) throw mappingError;

        // Insert item mappings if specific items
        if (mappingType === 'specific_items') {
          await insertItemMappings(mapping.id);
        }
      }

      toast({
        title: 'Success',
        description: 'Distributor mapping saved successfully'
      });

      setShowAddModal(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error saving mapping:', error);
      toast({
        title: 'Error',
        description: 'Failed to save distributor mapping',
        variant: 'destructive'
      });
    }
  };

  const insertItemMappings = async (mappingId: string) => {
    const itemMappings = [];

    // Add selected products
    for (const productId of selectedProducts) {
      const product = products.find(p => p.id === productId);
      if (product) {
        itemMappings.push({
          mapping_id: mappingId,
          product_id: productId,
          product_name: product.name
        });
      }
    }

    // Add selected categories
    for (const categoryId of selectedCategories) {
      const category = categories.find(c => c.id === categoryId);
      if (category) {
        itemMappings.push({
          mapping_id: mappingId,
          category_id: categoryId,
          category_name: category.name
        });
      }
    }

    if (itemMappings.length > 0) {
      const { error } = await supabase
        .from('distributor_item_mappings')
        .insert(itemMappings);

      if (error) throw error;
    }
  };

  const handleDeleteMapping = async (mappingId: string) => {
    if (!confirm('Are you sure you want to delete this distributor mapping?')) return;

    try {
      const { error } = await supabase
        .from('distributor_retailer_mappings')
        .delete()
        .eq('id', mappingId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Distributor mapping deleted successfully'
      });

      loadData();
    } catch (error) {
      console.error('Error deleting mapping:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete distributor mapping',
        variant: 'destructive'
      });
    }
  };

  const resetForm = () => {
    setSelectedDistributorId('');
    setMappingType('all_items');
    setSelectedProducts([]);
    setSelectedCategories([]);
    setEditingMapping(null);
  };

  const openEditModal = (mapping: DistributorMapping) => {
    setEditingMapping(mapping);
    setSelectedDistributorId(mapping.distributor_id);
    setMappingType(mapping.mapping_type);
    
    if (mapping.items) {
      const productIds = mapping.items
        .filter(item => item.product_name)
        .map(item => products.find(p => p.name === item.product_name)?.id)
        .filter(Boolean) as string[];
      
      const categoryIds = mapping.items
        .filter(item => item.category_name)
        .map(item => categories.find(c => c.name === item.category_name)?.id)
        .filter(Boolean) as string[];
      
      setSelectedProducts(productIds);
      setSelectedCategories(categoryIds);
    }
    
    setShowAddModal(true);
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!retailer) {
    return (
      <div className="min-h-screen bg-gradient-subtle p-4">
        <div className="max-w-7xl mx-auto">
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">Retailer not found</p>
              <Button onClick={() => navigate(-1)} className="mt-4">
                Go Back
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button 
            onClick={() => navigate(-1)} 
            variant="ghost" 
            size="sm"
            className="p-2"
          >
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Distributor Management</h1>
            <p className="text-muted-foreground">Manage distributors and super stockists for {retailer.name}</p>
          </div>
        </div>

        {/* Retailer Info */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Building2 size={20} className="text-primary" />
              <div>
                <h3 className="font-semibold">{retailer.name}</h3>
                <p className="text-sm text-muted-foreground">{retailer.address}</p>
                {retailer.category && (
                  <Badge variant="outline" className="mt-1">{retailer.category}</Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        <Tabs defaultValue="mapping" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="mapping">Retailer Mapping</TabsTrigger>
            <TabsTrigger value="distributors">Distributors</TabsTrigger>
            <TabsTrigger value="super-stockists">Super Stockists</TabsTrigger>
          </TabsList>

          <TabsContent value="mapping" className="space-y-6">

            {/* Actions Bar */}
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Assigned Distributors</h2>
          
          <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus size={16} className="mr-2" />
                Add Distributor
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingMapping ? 'Edit Distributor Mapping' : 'Add Distributor Mapping'}
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Select Distributor *</label>
                  <Select value={selectedDistributorId} onValueChange={setSelectedDistributorId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a distributor" />
                    </SelectTrigger>
                    <SelectContent>
                      {distributors.map(distributor => (
                        <SelectItem key={distributor.id} value={distributor.id}>
                          <div>
                            <div className="font-medium">{distributor.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {distributor.contact_name} • {[distributor.city, distributor.state].filter(Boolean).join(', ')}
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">Mapping Type *</label>
                  <Select value={mappingType} onValueChange={(value: 'all_items' | 'specific_items') => setMappingType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all_items">All Items</SelectItem>
                      <SelectItem value="specific_items">Specific Items/Categories</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {mappingType === 'specific_items' && (
                  <>
                    <div>
                      <label className="text-sm font-medium">Select Products</label>
                      <div className="max-h-40 overflow-y-auto border rounded p-2 space-y-2">
                        {products.map(product => (
                          <div key={product.id} className="flex items-center space-x-2">
                            <Checkbox
                              checked={selectedProducts.includes(product.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedProducts(prev => [...prev, product.id]);
                                } else {
                                  setSelectedProducts(prev => prev.filter(id => id !== product.id));
                                }
                              }}
                            />
                            <span className="text-sm">{product.name} ({product.category})</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium">Select Categories</label>
                      <div className="max-h-40 overflow-y-auto border rounded p-2 space-y-2">
                        {categories.map(category => (
                          <div key={category.id} className="flex items-center space-x-2">
                            <Checkbox
                              checked={selectedCategories.includes(category.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedCategories(prev => [...prev, category.id]);
                                } else {
                                  setSelectedCategories(prev => prev.filter(id => id !== category.id));
                                }
                              }}
                            />
                            <span className="text-sm">{category.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowAddModal(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveMapping}>
                    {editingMapping ? 'Update' : 'Add'} Mapping
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Mappings List */}
        <div className="grid gap-4">
          {mappings.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Package size={48} className="mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No distributors mapped to this retailer yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Click "Add Distributor" to assign distributors for product supply
                </p>
              </CardContent>
            </Card>
          ) : (
            mappings.map(mapping => (
              <Card key={mapping.id}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">{mapping.distributor.name}</h3>
                        <Badge variant={mapping.mapping_type === 'all_items' ? 'default' : 'secondary'}>
                          {mapping.mapping_type === 'all_items' ? 'All Items' : 'Specific Items'}
                        </Badge>
                      </div>
                      
                      {mapping.distributor.contact_name && (
                        <p className="text-sm text-muted-foreground mb-2">
                          Contact: {mapping.distributor.contact_name}
                        </p>
                      )}

                      {(mapping.distributor.city || mapping.distributor.state) && (
                        <div className="flex items-center gap-2 mb-3">
                          <MapPin size={14} className="text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {[mapping.distributor.city, mapping.distributor.state].filter(Boolean).join(', ')}
                          </span>
                        </div>
                      )}

                      {mapping.distributor.skills.length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs text-muted-foreground mb-1">Specializes in:</p>
                          <div className="flex flex-wrap gap-1">
                            {mapping.distributor.skills.map(skill => (
                              <Badge key={skill} variant="outline" className="text-xs">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {mapping.mapping_type === 'specific_items' && mapping.items && mapping.items.length > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Assigned Items:</p>
                          <div className="flex flex-wrap gap-1">
                            {mapping.items.map(item => (
                              <Badge key={item.id} variant="secondary" className="text-xs">
                                {item.product_name || item.category_name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                     </div>

                     <div className="flex gap-2">
                       <Button
                         variant="outline"
                         size="sm"
                         onClick={() => openEditModal(mapping)}
                       >
                         <Edit size={14} />
                       </Button>
                       <Button
                         variant="outline"
                         size="sm"
                         onClick={() => handleDeleteMapping(mapping.id)}
                         className="text-destructive hover:text-destructive"
                       >
                         <Trash2 size={14} />
                       </Button>
                     </div>
                   </div>
                 </CardContent>
               </Card>
             ))
           )}
         </div>
          </TabsContent>

          <TabsContent value="distributors">
            <DistributorList onDistributorAdded={loadData} />
          </TabsContent>

          <TabsContent value="super-stockists">
            <SuperStockistList onSuperStockistAdded={loadData} />
          </TabsContent>
        </Tabs>
       </div>
     </div>
   );
};

export default DistributorMapping;
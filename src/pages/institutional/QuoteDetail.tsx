import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { 
  ArrowLeft, FileText, Building2, Calendar, IndianRupee,
  Edit, Save, X, Send, CheckCircle, XCircle, Package, Plus, Trash2, Search
} from "lucide-react";

interface Quote {
  id: string;
  quote_number: string;
  account_id: string;
  opportunity_id: string | null;
  price_book_id: string | null;
  quote_date: string;
  valid_until: string | null;
  status: string;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  terms_and_conditions: string | null;
  notes: string | null;
  inst_accounts: { account_name: string } | null;
  inst_opportunities: { opportunity_name: string; id: string } | null;
}

interface QuoteItem {
  id: string;
  product_id: string;
  description: string | null;
  quantity: number;
  unit_price: number;
  discount_percentage: number;
  discount_amount: number;
  tax_rate: number;
  tax_amount: number;
  line_total: number;
}

interface Product {
  id: string;
  product_code: string;
  product_name: string;
  category: string | null;
  unit: string | null;
  base_price: number;
  gst_rate: number | null;
}

interface PriceBook {
  id: string;
  price_book_name: string;
}

interface PriceBookEntry {
  product_id: string;
  list_price: number;
  discount_percentage: number | null;
  final_price: number;
}

const statuses = [
  { value: 'draft', label: 'Draft', color: 'bg-gray-100 text-gray-700' },
  { value: 'sent', label: 'Sent', color: 'bg-blue-100 text-blue-700' },
  { value: 'accepted', label: 'Accepted', color: 'bg-green-100 text-green-700' },
  { value: 'rejected', label: 'Rejected', color: 'bg-red-100 text-red-700' },
  { value: 'expired', label: 'Expired', color: 'bg-orange-100 text-orange-700' },
];

export default function QuoteDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [priceBooks, setPriceBooks] = useState<PriceBook[]>([]);
  const [priceBookEntries, setPriceBookEntries] = useState<PriceBookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Quote>>({});
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [newItem, setNewItem] = useState({
    product_id: "",
    quantity: 1,
    unit_price: 0,
    discount_percentage: 0,
    tax_rate: 18,
  });

  useEffect(() => {
    if (id) {
      fetchQuote();
      fetchItems();
      fetchProducts();
      fetchPriceBooks();
    }
  }, [id]);

  useEffect(() => {
    if (quote?.price_book_id) {
      fetchPriceBookEntries(quote.price_book_id);
    }
  }, [quote?.price_book_id]);

  const fetchQuote = async () => {
    try {
      const { data, error } = await supabase
        .from('inst_quotes')
        .select('*, inst_accounts(account_name), inst_opportunities(id, opportunity_name)')
        .eq('id', id)
        .single();

      if (error) throw error;
      setQuote(data);
      setFormData(data);
    } catch (error) {
      console.error('Error fetching quote:', error);
      toast.error('Failed to fetch quote');
      navigate('/institutional-sales/quotes');
    } finally {
      setLoading(false);
    }
  };

  const fetchItems = async () => {
    const { data } = await supabase
      .from('inst_quote_line_items')
      .select('*')
      .eq('quote_id', id)
      .order('sort_order');
    setItems(data || []);
  };

  const fetchProducts = async () => {
    const { data } = await supabase
      .from('inst_products')
      .select('id, product_code, product_name, category, unit, base_price, gst_rate')
      .eq('is_active', true)
      .order('product_name');
    setProducts(data || []);
  };

  const fetchPriceBooks = async () => {
    const { data } = await supabase
      .from('inst_price_books')
      .select('id, price_book_name')
      .eq('is_active', true)
      .order('price_book_name');
    setPriceBooks(data || []);
  };

  const fetchPriceBookEntries = async (priceBookId: string) => {
    const { data } = await supabase
      .from('inst_price_book_entries')
      .select('product_id, list_price, discount_percentage, final_price')
      .eq('price_book_id', priceBookId);
    setPriceBookEntries(data || []);
  };

  const getProductPrice = (productId: string): number => {
    // Check price book first
    const priceBookEntry = priceBookEntries.find(e => e.product_id === productId);
    if (priceBookEntry) return priceBookEntry.final_price;
    
    // Fallback to base price
    const product = products.find(p => p.id === productId);
    return product?.base_price || 0;
  };

  const handleProductSelect = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      const price = getProductPrice(productId);
      setNewItem({
        ...newItem,
        product_id: productId,
        unit_price: price,
        tax_rate: product.gst_rate || 18,
      });
    }
  };

  const calculateLineTotal = () => {
    const baseAmount = newItem.quantity * newItem.unit_price;
    const discountAmount = (baseAmount * newItem.discount_percentage) / 100;
    const afterDiscount = baseAmount - discountAmount;
    const taxAmount = (afterDiscount * newItem.tax_rate) / 100;
    return afterDiscount + taxAmount;
  };

  const handleAddItem = async () => {
    if (!newItem.product_id) {
      toast.error('Please select a product');
      return;
    }

    const product = products.find(p => p.id === newItem.product_id);
    const baseAmount = newItem.quantity * newItem.unit_price;
    const discountAmount = (baseAmount * newItem.discount_percentage) / 100;
    const afterDiscount = baseAmount - discountAmount;
    const taxAmount = (afterDiscount * newItem.tax_rate) / 100;
    const lineTotal = afterDiscount + taxAmount;

    try {
      const { error } = await supabase.from('inst_quote_line_items').insert({
        quote_id: id,
        product_id: newItem.product_id,
        description: product?.product_name,
        quantity: newItem.quantity,
        unit_price: newItem.unit_price,
        discount_percentage: newItem.discount_percentage,
        discount_amount: discountAmount,
        tax_rate: newItem.tax_rate,
        tax_amount: taxAmount,
        line_total: lineTotal,
        sort_order: items.length,
      });

      if (error) throw error;
      
      toast.success('Item added');
      setIsAddItemOpen(false);
      setNewItem({ product_id: "", quantity: 1, unit_price: 0, discount_percentage: 0, tax_rate: 18 });
      setSearchQuery("");
      await fetchItems();
      await updateQuoteTotals();
    } catch (error) {
      console.error('Error adding item:', error);
      toast.error('Failed to add item');
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('inst_quote_line_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
      toast.success('Item removed');
      await fetchItems();
      await updateQuoteTotals();
    } catch (error) {
      console.error('Error removing item:', error);
      toast.error('Failed to remove item');
    }
  };

  const updateQuoteTotals = async () => {
    // Fetch updated items
    const { data: updatedItems } = await supabase
      .from('inst_quote_line_items')
      .select('*')
      .eq('quote_id', id);

    if (!updatedItems) return;

    const subtotal = updatedItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const discountAmount = updatedItems.reduce((sum, item) => sum + (item.discount_amount || 0), 0);
    const taxAmount = updatedItems.reduce((sum, item) => sum + (item.tax_amount || 0), 0);
    const totalAmount = subtotal - discountAmount + taxAmount;

    // Update quote totals
    const { error } = await supabase
      .from('inst_quotes')
      .update({ 
        subtotal, 
        discount_amount: discountAmount, 
        tax_amount: taxAmount, 
        total_amount: totalAmount,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      console.error('Error updating quote totals:', error);
    } else {
      // Update opportunity value if linked
      if (quote?.opportunity_id) {
        await supabase
          .from('inst_opportunities')
          .update({ expected_value: totalAmount, updated_at: new Date().toISOString() })
          .eq('id', quote.opportunity_id);
      }
      await fetchQuote();
    }
  };

  const handlePriceBookChange = async (priceBookId: string) => {
    try {
      const actualPriceBookId = priceBookId === "none" ? null : priceBookId;
      const { error } = await supabase
        .from('inst_quotes')
        .update({ price_book_id: actualPriceBookId, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      toast.success('Price book updated');
      setQuote({ ...quote!, price_book_id: actualPriceBookId });
      if (actualPriceBookId) {
        fetchPriceBookEntries(actualPriceBookId);
      } else {
        setPriceBookEntries([]);
      }
    } catch (error) {
      console.error('Error updating price book:', error);
      toast.error('Failed to update price book');
    }
  };

  const handleSave = async () => {
    try {
      const { error } = await supabase
        .from('inst_quotes')
        .update({
          valid_until: formData.valid_until,
          terms_and_conditions: formData.terms_and_conditions,
          notes: formData.notes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
      toast.success('Quote updated');
      setQuote({ ...quote, ...formData } as Quote);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating quote:', error);
      toast.error('Failed to update quote');
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      const { error } = await supabase
        .from('inst_quotes')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      toast.success('Status updated');
      setQuote({ ...quote, status: newStatus } as Quote);
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const getStatusInfo = (status: string) => statuses.find(s => s.value === status) || statuses[0];
  const formatCurrency = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);

  const filteredProducts = products.filter(p => 
    p.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.product_code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return <Layout><div className="p-4 text-center text-muted-foreground">Loading...</div></Layout>;
  }

  if (!quote) return null;

  const statusInfo = getStatusInfo(quote.status);
  const canEdit = quote.status === 'draft';

  return (
    <Layout>
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/institutional-sales/quotes')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {quote.quote_number}
            </h1>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Building2 className="h-3.5 w-3.5" />
              {quote.inst_accounts?.account_name}
              <span className={`px-2 py-0.5 rounded-full ${statusInfo.color}`}>{statusInfo.label}</span>
            </div>
          </div>
          {isEditing ? (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => { setIsEditing(false); setFormData(quote); }}>
                <X className="h-4 w-4 mr-1" /> Cancel
              </Button>
              <Button size="sm" onClick={handleSave}>
                <Save className="h-4 w-4 mr-1" /> Save
              </Button>
            </div>
          ) : (
            canEdit && (
              <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                <Edit className="h-4 w-4 mr-1" /> Edit
              </Button>
            )
          )}
        </div>

        {/* Status Actions */}
        {quote.status === 'draft' && items.length > 0 && (
          <Card>
            <CardContent className="p-3 flex justify-center">
              <Button size="sm" onClick={() => handleStatusChange('sent')}>
                <Send className="h-4 w-4 mr-1" /> Mark as Sent
              </Button>
            </CardContent>
          </Card>
        )}
        {quote.status === 'sent' && (
          <Card>
            <CardContent className="p-3 flex justify-center gap-3">
              <Button size="sm" variant="outline" onClick={() => handleStatusChange('accepted')} className="text-green-600">
                <CheckCircle className="h-4 w-4 mr-1" /> Accept
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleStatusChange('rejected')} className="text-red-600">
                <XCircle className="h-4 w-4 mr-1" /> Reject
              </Button>
            </CardContent>
          </Card>
        )}
        {quote.status === 'accepted' && (
          <Card>
            <CardContent className="p-3 flex justify-center">
              <Button size="sm" onClick={() => navigate(`/institutional-sales/order-commitments?quote=${quote.id}&account=${quote.account_id}`)}>
                <Package className="h-4 w-4 mr-1" /> Create Order Commitment
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="p-3 text-center">
              <Calendar className="h-5 w-5 mx-auto text-primary mb-1" />
              <p className="text-sm font-bold">{format(new Date(quote.quote_date), 'MMM dd, yyyy')}</p>
              <p className="text-xs text-muted-foreground">Quote Date</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <IndianRupee className="h-5 w-5 mx-auto text-primary mb-1" />
              <p className="text-lg font-bold">{formatCurrency(quote.total_amount)}</p>
              <p className="text-xs text-muted-foreground">Total Amount</p>
            </CardContent>
          </Card>
        </div>

        {/* Price Book Selection */}
        {canEdit && (
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <Label className="whitespace-nowrap">Price Book:</Label>
                <Select value={quote.price_book_id || "none"} onValueChange={handlePriceBookChange}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select price book" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Default (Base Prices)</SelectItem>
                    {priceBooks.map((pb) => (
                      <SelectItem key={pb.id} value={pb.id}>{pb.price_book_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs defaultValue="items">
          <TabsList className="w-full">
            <TabsTrigger value="items" className="flex-1">Items ({items.length})</TabsTrigger>
            <TabsTrigger value="details" className="flex-1">Details</TabsTrigger>
          </TabsList>

          <TabsContent value="items" className="mt-4 space-y-3">
            {/* Add Item Button */}
            {canEdit && (
              <Dialog open={isAddItemOpen} onOpenChange={setIsAddItemOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full">
                    <Plus className="h-4 w-4 mr-1" /> Add Item
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Add Item to Quote</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    {/* Product Search */}
                    <div className="space-y-2">
                      <Label>Search Product</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search by name or code..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                    </div>

                    {/* Product List */}
                    <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-2">
                      {filteredProducts.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">No products found</p>
                      ) : (
                        filteredProducts.map((product) => {
                          const price = getProductPrice(product.id);
                          const isSelected = newItem.product_id === product.id;
                          return (
                            <div
                              key={product.id}
                              onClick={() => handleProductSelect(product.id)}
                              className={`p-2 rounded-md cursor-pointer transition-colors ${
                                isSelected ? 'bg-primary/10 border border-primary' : 'hover:bg-muted'
                              }`}
                            >
                              <div className="flex justify-between items-center">
                                <div>
                                  <p className="font-medium text-sm">{product.product_name}</p>
                                  <p className="text-xs text-muted-foreground">{product.product_code} • {product.category}</p>
                                </div>
                                <div className="text-right">
                                  <p className="font-semibold text-sm">{formatCurrency(price)}</p>
                                  <p className="text-xs text-muted-foreground">per {product.unit || 'unit'}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Quantity & Pricing */}
                    {newItem.product_id && (
                      <>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label>Quantity</Label>
                            <Input
                              type="number"
                              min="1"
                              value={newItem.quantity}
                              onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 1 })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Unit Price (₹)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={newItem.unit_price}
                              onChange={(e) => setNewItem({ ...newItem, unit_price: parseFloat(e.target.value) || 0 })}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label>Discount (%)</Label>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              value={newItem.discount_percentage}
                              onChange={(e) => setNewItem({ ...newItem, discount_percentage: parseFloat(e.target.value) || 0 })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>GST Rate (%)</Label>
                            <Input
                              type="number"
                              min="0"
                              value={newItem.tax_rate}
                              onChange={(e) => setNewItem({ ...newItem, tax_rate: parseFloat(e.target.value) || 0 })}
                            />
                          </div>
                        </div>

                        {/* Line Total Preview */}
                        <div className="bg-muted p-3 rounded-md">
                          <div className="flex justify-between text-sm">
                            <span>Base Amount:</span>
                            <span>{formatCurrency(newItem.quantity * newItem.unit_price)}</span>
                          </div>
                          {newItem.discount_percentage > 0 && (
                            <div className="flex justify-between text-sm text-muted-foreground">
                              <span>Discount ({newItem.discount_percentage}%):</span>
                              <span>-{formatCurrency((newItem.quantity * newItem.unit_price * newItem.discount_percentage) / 100)}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-sm text-muted-foreground">
                            <span>GST ({newItem.tax_rate}%):</span>
                            <span>+{formatCurrency(((newItem.quantity * newItem.unit_price * (1 - newItem.discount_percentage/100)) * newItem.tax_rate) / 100)}</span>
                          </div>
                          <div className="flex justify-between font-bold border-t mt-2 pt-2">
                            <span>Line Total:</span>
                            <span>{formatCurrency(calculateLineTotal())}</span>
                          </div>
                        </div>
                      </>
                    )}

                    <Button onClick={handleAddItem} className="w-full" disabled={!newItem.product_id}>
                      Add to Quote
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}

            {/* Items List */}
            {items.length === 0 ? (
              <Card>
                <CardContent className="p-4 text-center text-muted-foreground">
                  No items added yet. {canEdit && "Click 'Add Item' to add products to this quote."}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {items.map((item) => {
                  const product = products.find(p => p.id === item.product_id);
                  return (
                    <Card key={item.id}>
                      <CardContent className="p-3">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="font-medium">{item.description || product?.product_name || 'Item'}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.quantity} × {formatCurrency(item.unit_price)}
                              {item.discount_percentage > 0 && ` (-${item.discount_percentage}%)`}
                              {item.tax_rate > 0 && ` +GST ${item.tax_rate}%`}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold">{formatCurrency(item.line_total)}</p>
                            {canEdit && (
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-8 w-8 text-destructive"
                                onClick={() => handleRemoveItem(item.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}

                {/* Totals Summary */}
                <Card>
                  <CardContent className="p-3 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{formatCurrency(quote.subtotal)}</span>
                    </div>
                    {quote.discount_amount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Discount</span>
                        <span className="text-red-600">-{formatCurrency(quote.discount_amount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tax (GST)</span>
                      <span>{formatCurrency(quote.tax_amount)}</span>
                    </div>
                    <div className="flex justify-between font-bold border-t pt-2">
                      <span>Total</span>
                      <span>{formatCurrency(quote.total_amount)}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="details" className="mt-4">
            <Card>
              <CardContent className="p-4 space-y-4">
                {isEditing ? (
                  <>
                    <div className="space-y-2">
                      <Label>Valid Until</Label>
                      <Input
                        type="date"
                        value={formData.valid_until || ''}
                        onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Terms & Conditions</Label>
                      <Textarea
                        value={formData.terms_and_conditions || ''}
                        onChange={(e) => setFormData({ ...formData, terms_and_conditions: e.target.value })}
                        rows={4}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Notes</Label>
                      <Textarea
                        value={formData.notes || ''}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        rows={2}
                      />
                    </div>
                  </>
                ) : (
                  <div className="space-y-4">
                    {quote.inst_opportunities && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Opportunity</p>
                        <p className="text-sm font-medium">{quote.inst_opportunities.opportunity_name}</p>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Quote Date</p>
                        <p className="text-sm">{format(new Date(quote.quote_date), 'MMM dd, yyyy')}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Valid Until</p>
                        <p className="text-sm">{quote.valid_until ? format(new Date(quote.valid_until), 'MMM dd, yyyy') : '-'}</p>
                      </div>
                    </div>
                    {quote.terms_and_conditions && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Terms & Conditions</p>
                        <p className="text-sm whitespace-pre-wrap">{quote.terms_and_conditions}</p>
                      </div>
                    )}
                    {quote.notes && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Notes</p>
                        <p className="text-sm">{quote.notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
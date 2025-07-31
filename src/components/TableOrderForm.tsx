import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Plus, Gift } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Product {
  id: string;
  name: string;
  category: string;
  rate: number;
  unit: string;
  hasScheme?: boolean;
  schemeDetails?: string;
  closingStock?: number;
}

interface OrderRow {
  id: string;
  productCode: string;
  product?: Product;
  quantity: number;
  closingStock: number;
  total: number;
}

const mockProducts: Product[] = [
  {
    id: "P001",
    name: "Premium Rice 25kg",
    category: "Rice & Grains",
    rate: 1200,
    unit: "bag",
    hasScheme: true,
    schemeDetails: "Buy 5+ bags, get 10% off",
    closingStock: 15
  },
  {
    id: "P002",
    name: "Wheat Flour 10kg",
    category: "Rice & Grains",
    rate: 400,
    unit: "bag",
    closingStock: 8
  },
  {
    id: "P003",
    name: "Sunflower Oil 1L",
    category: "Oil & Ghee",
    rate: 120,
    unit: "bottle",
    hasScheme: true,
    schemeDetails: "Buy 12+ bottles, get 15% off",
    closingStock: 24
  },
  {
    id: "P004",
    name: "Mustard Oil 1L",
    category: "Oil & Ghee",
    rate: 140,
    unit: "bottle",
    closingStock: 18
  },
  {
    id: "P005",
    name: "Toor Dal 1kg",
    category: "Pulses",
    rate: 80,
    unit: "packet",
    closingStock: 12
  },
  {
    id: "P006",
    name: "Moong Dal 1kg",
    category: "Pulses",
    rate: 90,
    unit: "packet",
    hasScheme: true,
    schemeDetails: "Buy 10+ packets, get 5% off",
    closingStock: 20
  }
];

interface TableOrderFormProps {
  onCartUpdate: (items: any[]) => void;
}

export const TableOrderForm = ({ onCartUpdate }: TableOrderFormProps) => {
  const [orderRows, setOrderRows] = useState<OrderRow[]>([
    { id: "1", productCode: "", quantity: 0, closingStock: 0, total: 0 }
  ]);

  const findProductByCode = (code: string): Product | undefined => {
    return mockProducts.find(p => p.id.toLowerCase() === code.toLowerCase());
  };

  const addNewRow = () => {
    const newRow: OrderRow = {
      id: Date.now().toString(),
      productCode: "",
      quantity: 0,
      closingStock: 0,
      total: 0
    };
    setOrderRows(prev => [...prev, newRow]);
  };

  const removeRow = (id: string) => {
    setOrderRows(prev => prev.filter(row => row.id !== id));
  };

  const updateRow = (id: string, field: keyof OrderRow, value: any) => {
    setOrderRows(prev => prev.map(row => {
      if (row.id === id) {
        const updatedRow = { ...row, [field]: value };
        
        if (field === "productCode") {
          const product = findProductByCode(value);
          updatedRow.product = product;
          updatedRow.closingStock = product?.closingStock || 0;
          updatedRow.total = product ? product.rate * updatedRow.quantity : 0;
        } else if (field === "quantity" && row.product) {
          updatedRow.total = row.product.rate * value;
        }
        
        return updatedRow;
      }
      return row;
    }));
  };

  const addToCart = () => {
    const validRows = orderRows.filter(row => row.product && row.quantity > 0);
    
    if (validRows.length === 0) {
      toast({
        title: "No Valid Items",
        description: "Please add valid products with quantities",
        variant: "destructive"
      });
      return;
    }

    const cartItems = validRows.map(row => ({
      ...row.product!,
      quantity: row.quantity,
      total: row.total
    }));

    onCartUpdate(cartItems);
    
    toast({
      title: "Added to Cart",
      description: `${validRows.length} items added to cart`
    });

    // Reset form
    setOrderRows([{ id: Date.now().toString(), productCode: "", quantity: 0, closingStock: 0, total: 0 }]);
  };

  const getTotalValue = () => {
    return orderRows.reduce((sum, row) => sum + row.total, 0);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Bulk Order Entry</CardTitle>
          <p className="text-sm text-muted-foreground">Enter product codes directly for faster ordering</p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">Code</TableHead>
                  <TableHead className="min-w-32">Product</TableHead>
                  <TableHead className="w-16">Qty</TableHead>
                  <TableHead className="w-16">Stock</TableHead>
                  <TableHead className="w-20">Total</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orderRows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="p-2">
                      <Input
                        placeholder="P001"
                        value={row.productCode}
                        onChange={(e) => updateRow(row.id, "productCode", e.target.value)}
                        className="h-8 text-xs"
                      />
                    </TableCell>
                    <TableCell className="p-2">
                      {row.product ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-medium">{row.product.name}</span>
                            {row.product.hasScheme && (
                              <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-[10px] px-1 py-0">
                                <Gift size={8} className="mr-0.5" />
                                Scheme
                              </Badge>
                            )}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            ₹{row.product.rate}/{row.product.unit}
                          </div>
                          {row.product.hasScheme && (
                            <div className="text-[10px] text-orange-600 bg-orange-50 p-1 rounded">
                              {row.product.schemeDetails}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Enter code</span>
                      )}
                    </TableCell>
                    <TableCell className="p-2">
                      <Input
                        type="number"
                        placeholder="0"
                        value={row.quantity || ""}
                        onChange={(e) => updateRow(row.id, "quantity", parseInt(e.target.value) || 0)}
                        className="h-8 text-xs"
                        disabled={!row.product}
                      />
                    </TableCell>
                    <TableCell className="p-2">
                      <Input
                        type="number"
                        placeholder="0"
                        value={row.closingStock || ""}
                        onChange={(e) => updateRow(row.id, "closingStock", parseInt(e.target.value) || 0)}
                        className="h-8 text-xs"
                        disabled={!row.product}
                      />
                    </TableCell>
                    <TableCell className="p-2">
                      <span className="text-xs font-medium">
                        {row.total > 0 ? `₹${row.total}` : "-"}
                      </span>
                    </TableCell>
                    <TableCell className="p-2">
                      {orderRows.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeRow(row.id)}
                          className="h-6 w-6"
                        >
                          <Trash2 size={12} />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between items-center">
        <Button
          variant="outline"
          onClick={addNewRow}
          className="flex items-center gap-2"
        >
          <Plus size={14} />
          Add Row
        </Button>
        
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Total</p>
          <p className="text-lg font-bold">₹{getTotalValue().toLocaleString()}</p>
        </div>
      </div>

      <Button 
        onClick={addToCart}
        className="w-full"
        disabled={getTotalValue() === 0}
      >
        Add All to Cart
      </Button>
    </div>
  );
};
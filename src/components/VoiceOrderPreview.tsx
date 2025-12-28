import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Check, X, AlertTriangle, ShoppingCart, Trash2 } from 'lucide-react';

interface MatchedProduct {
  id: string;
  name: string;
  matchedName: string;
  quantity: number;
  unit: string;
  rate: number;
  total: number;
  confidence: 'high' | 'medium' | 'low';
  notFound?: boolean;
}

interface VoiceOrderPreviewProps {
  open: boolean;
  onClose: () => void;
  matchedProducts: MatchedProduct[];
  onConfirm: (products: MatchedProduct[]) => void;
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemoveProduct: (id: string) => void;
}

export const VoiceOrderPreview: React.FC<VoiceOrderPreviewProps> = ({
  open,
  onClose,
  matchedProducts,
  onConfirm,
  onUpdateQuantity,
  onRemoveProduct,
}) => {
  const validProducts = matchedProducts.filter(p => !p.notFound);
  const invalidProducts = matchedProducts.filter(p => p.notFound);
  const totalAmount = validProducts.reduce((sum, p) => sum + p.total, 0);

  const getConfidenceBadge = (confidence: 'high' | 'medium' | 'low') => {
    switch (confidence) {
      case 'high':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">Exact</Badge>;
      case 'medium':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 text-xs">Similar</Badge>;
      case 'low':
        return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-xs">Check</Badge>;
    }
  };

  const handleConfirm = () => {
    if (validProducts.length > 0) {
      onConfirm(validProducts);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart size={20} />
            Voice Order Preview
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-3 py-2">
          {/* Valid products */}
          {validProducts.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <Check size={14} className="text-green-600" />
                Matched Products ({validProducts.length})
              </h4>
              {validProducts.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{product.name}</span>
                      {getConfidenceBadge(product.confidence)}
                    </div>
                    {product.matchedName.toLowerCase() !== product.name.toLowerCase() && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Heard: "{product.matchedName}"
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      ₹{product.rate.toFixed(2)} / {product.unit}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={product.quantity}
                      onChange={(e) => onUpdateQuantity(product.id, parseInt(e.target.value) || 0)}
                      className="w-16 h-8 text-center text-sm"
                      min={1}
                    />
                    <span className="text-xs text-muted-foreground w-8">{product.unit}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => onRemoveProduct(product.id)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Not found products */}
          {invalidProducts.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <AlertTriangle size={14} className="text-orange-500" />
                Not Found ({invalidProducts.length})
              </h4>
              {invalidProducts.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between p-3 bg-orange-50/50 rounded-lg border border-orange-200"
                >
                  <div className="flex-1">
                    <span className="text-sm text-orange-700 italic">
                      "{product.matchedName}"
                    </span>
                    <p className="text-xs text-orange-600">
                      Could not match to any product
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-orange-600"
                    onClick={() => onRemoveProduct(product.id)}
                  >
                    <X size={14} />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {matchedProducts.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p>No products to preview</p>
            </div>
          )}
        </div>

        {validProducts.length > 0 && (
          <div className="border-t pt-3 mt-2">
            <div className="flex justify-between items-center mb-3">
              <span className="font-medium">Total</span>
              <span className="text-lg font-bold text-primary">
                ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={validProducts.length === 0}
            className="gap-1"
          >
            <ShoppingCart size={16} />
            Add to Cart ({validProducts.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

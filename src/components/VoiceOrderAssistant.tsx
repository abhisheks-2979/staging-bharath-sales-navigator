import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Mic, MicOff, Loader2, X } from 'lucide-react';
import { useVoiceOrder } from '@/hooks/useVoiceOrder';
import { VoiceOrderPreview } from './VoiceOrderPreview';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Product {
  id: string;
  name: string;
  rate: number;
  unit?: string;
  category?: string;
}

interface CartItem {
  id: string;
  name: string;
  category: string;
  rate: number;
  unit: string;
  quantity: number;
  total: number;
}

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

interface VoiceOrderAssistantProps {
  products: Product[];
  onAddToCart: (items: CartItem[]) => void;
  disabled?: boolean;
}

export const VoiceOrderAssistant: React.FC<VoiceOrderAssistantProps> = ({
  products,
  onAddToCart,
  disabled = false,
}) => {
  const [showPreview, setShowPreview] = useState(false);
  const [previewProducts, setPreviewProducts] = useState<MatchedProduct[]>([]);

  const {
    isRecording,
    isProcessing,
    transcript,
    matchedProducts,
    startRecording,
    stopRecording,
    clearResults,
    error,
    isSupported,
  } = useVoiceOrder(products);

  // When matched products are available, show preview
  React.useEffect(() => {
    if (matchedProducts.length > 0) {
      setPreviewProducts([...matchedProducts]);
      setShowPreview(true);
    }
  }, [matchedProducts]);

  const handleToggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  const handleConfirmOrder = useCallback((products: MatchedProduct[]) => {
    const cartItems: CartItem[] = products
      .filter(p => !p.notFound)
      .map(p => ({
        id: p.id,
        name: p.name,
        category: '', // Will be filled from actual product data
        rate: p.rate,
        unit: p.unit,
        quantity: p.quantity,
        total: p.quantity * p.rate,
      }));

    if (cartItems.length > 0) {
      onAddToCart(cartItems);
      toast({
        title: 'Added to Cart',
        description: `${cartItems.length} product${cartItems.length > 1 ? 's' : ''} added successfully`,
      });
    }

    clearResults();
    setShowPreview(false);
    setPreviewProducts([]);
  }, [onAddToCart, clearResults]);

  const handleUpdateQuantity = useCallback((id: string, quantity: number) => {
    setPreviewProducts(prev =>
      prev.map(p =>
        p.id === id
          ? { ...p, quantity: Math.max(1, quantity), total: Math.max(1, quantity) * p.rate }
          : p
      )
    );
  }, []);

  const handleRemoveProduct = useCallback((id: string) => {
    setPreviewProducts(prev => prev.filter(p => p.id !== id));
  }, []);

  const handleClosePreview = useCallback(() => {
    setShowPreview(false);
    clearResults();
    setPreviewProducts([]);
  }, [clearResults]);

  if (!isSupported) {
    return null; // Don't render if not supported
  }

  return (
    <>
      <Button
        variant={isRecording ? "default" : "outline"}
        onClick={handleToggleRecording}
        disabled={disabled || isProcessing}
        className={cn(
          "flex-1 h-7 text-xs transition-all",
          isRecording && "bg-red-500 hover:bg-red-600 text-white animate-pulse"
        )}
        size="sm"
      >
        {isProcessing ? (
          <>
            <Loader2 size={12} className="mr-0.5 animate-spin" />
            Processing...
          </>
        ) : isRecording ? (
          <>
            <MicOff size={12} className="mr-0.5" />
            Stop
          </>
        ) : (
          <>
            <Mic size={12} className="mr-0.5" />
            Voice
          </>
        )}
      </Button>

      {/* Recording overlay */}
      {(isRecording || isProcessing) && (
        <Card className="fixed bottom-20 left-4 right-4 z-50 shadow-lg border-2 border-primary">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  {isRecording ? (
                    <>
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                      </span>
                      <span className="text-sm font-medium text-red-600">Listening...</span>
                    </>
                  ) : (
                    <>
                      <Loader2 size={14} className="animate-spin text-primary" />
                      <span className="text-sm font-medium">Processing order...</span>
                    </>
                  )}
                </div>
                
                {transcript && (
                  <p className="text-sm text-muted-foreground bg-muted/50 rounded p-2 italic">
                    "{transcript}"
                  </p>
                )}
                
                {error && (
                  <p className="text-sm text-destructive mt-2">{error}</p>
                )}
                
                {isRecording && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Speak product names with quantities. Example: "Adrak 5 kg, Haldi 2 kg"
                  </p>
                )}
              </div>
              
              {isRecording && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={stopRecording}
                >
                  <X size={16} />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview modal */}
      <VoiceOrderPreview
        open={showPreview}
        onClose={handleClosePreview}
        matchedProducts={previewProducts}
        onConfirm={handleConfirmOrder}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveProduct={handleRemoveProduct}
      />
    </>
  );
};

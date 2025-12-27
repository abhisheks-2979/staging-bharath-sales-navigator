import React, { useMemo } from 'react';
import { Gift, ChevronRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OrderRow {
  id: string;
  product?: {
    id: string;
    name: string;
  };
  quantity: number;
}

interface Scheme {
  id: string;
  name: string;
  is_active: boolean | null;
  start_date: string | null;
  end_date: string | null;
}

interface ApplyOfferSectionProps {
  schemes: Scheme[];
  orderRows: OrderRow[];
  onClick: () => void;
  loading?: boolean;
}

export const ApplyOfferSection: React.FC<ApplyOfferSectionProps> = ({
  schemes,
  orderRows,
  onClick,
  loading = false
}) => {
  // Count active schemes
  const activeSchemeCount = useMemo(() => {
    const now = new Date();
    return schemes.filter(scheme => {
      if (!scheme.is_active) return false;
      const startDate = scheme.start_date ? new Date(scheme.start_date) : null;
      const endDate = scheme.end_date ? new Date(scheme.end_date) : null;
      if (startDate && now < startDate) return false;
      if (endDate && now > endDate) return false;
      return true;
    }).length;
  }, [schemes]);

  // Check if any order rows have products (to show applicable offers hint)
  const hasProductsInOrder = useMemo(() => {
    return orderRows.some(row => row.product && row.quantity > 0);
  }, [orderRows]);

  if (loading) {
    return (
      <div className="animate-pulse bg-muted/50 rounded-lg p-3 flex items-center gap-3">
        <div className="w-9 h-9 bg-muted rounded-full"></div>
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-muted rounded w-24"></div>
          <div className="h-2 bg-muted rounded w-32"></div>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 p-3 rounded-lg border-2 border-dashed",
        "bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5",
        "border-primary/30 hover:border-primary/50 hover:from-primary/10 hover:via-primary/15 hover:to-primary/10",
        "transition-all duration-200 group"
      )}
    >
      {/* Icon */}
      <div className="relative">
        <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center">
          <Gift className="w-4.5 h-4.5 text-primary" />
        </div>
        {activeSchemeCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
            {activeSchemeCount > 9 ? '9+' : activeSchemeCount}
          </span>
        )}
      </div>

      {/* Text */}
      <div className="flex-1 text-left">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-sm text-foreground">Apply Offers</span>
          {activeSchemeCount > 0 && (
            <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse" />
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {activeSchemeCount > 0 
            ? `${activeSchemeCount} offer${activeSchemeCount > 1 ? 's' : ''} available`
            : 'View all schemes & offers'
          }
          {hasProductsInOrder && activeSchemeCount > 0 && ' • Tap to apply'}
        </p>
      </div>

      {/* Arrow */}
      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
    </button>
  );
};

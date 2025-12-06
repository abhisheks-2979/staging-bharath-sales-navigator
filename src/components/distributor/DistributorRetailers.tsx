import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Store, ChevronRight, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Retailer {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  category: string | null;
  priority: string | null;
  status: string | null;
}

interface Props {
  distributorId: string;
}

const priorityColors: Record<string, string> = {
  'high': 'bg-red-100 text-red-800',
  'medium': 'bg-yellow-100 text-yellow-800',
  'low': 'bg-green-100 text-green-800',
};

export function DistributorRetailers({ distributorId }: Props) {
  const navigate = useNavigate();
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRetailers();
  }, [distributorId]);

  const loadRetailers = async () => {
    try {
      const { data, error } = await supabase
        .from('retailers')
        .select('id, name, phone, address, category, priority, status')
        .eq('distributor_id', distributorId)
        .order('name');

      if (error) throw error;
      setRetailers(data || []);
    } catch (error: any) {
      toast.error("Failed to load retailers: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Store className="h-4 w-4" />
          Retailers Supported ({retailers.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded" />
            ))}
          </div>
        ) : retailers.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">No retailers linked to this distributor</p>
            <p className="text-xs text-muted-foreground mt-1">
              Link retailers by setting distributor in My Retailers
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {retailers.map(retailer => (
              <div
                key={retailer.id}
                className="flex items-center justify-between border rounded-lg p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => navigate(`/retailer/${retailer.id}`)}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                    <Store className="h-4 w-4 text-orange-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{retailer.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {retailer.phone && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {retailer.phone}
                        </span>
                      )}
                      {retailer.category && (
                        <Badge variant="outline" className="text-xs">
                          {retailer.category}
                        </Badge>
                      )}
                      {retailer.priority && (
                        <Badge className={`text-xs ${priorityColors[retailer.priority] || 'bg-gray-100'}`}>
                          {retailer.priority}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

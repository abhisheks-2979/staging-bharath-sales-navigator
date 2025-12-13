import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Map, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Territory {
  id: string;
  name: string;
  region: string;
  territory_type: string | null;
}

interface Props {
  distributorId: string;
}

export function DistributorTerritories({ distributorId }: Props) {
  const navigate = useNavigate();
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTerritories();
  }, [distributorId]);

  const loadTerritories = async () => {
    try {
      // Get territories that have this distributor in their assigned_distributor_ids array
      const { data, error } = await supabase
        .from('territories')
        .select('id, name, region, territory_type')
        .contains('assigned_distributor_ids', [distributorId])
        .order('name');

      if (error) throw error;
      setTerritories(data || []);
    } catch (error: any) {
      console.error("Failed to load territories:", error.message);
      // Don't show error toast, just set empty
      setTerritories([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Map className="h-4 w-4" />
          Territories ({territories.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {[1, 2].map(i => (
              <div key={i} className="h-12 bg-muted animate-pulse rounded" />
            ))}
          </div>
        ) : territories.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">No territories assigned</p>
            <p className="text-xs text-muted-foreground mt-1">
              Assign this distributor to territories in Territory Master
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {territories.map(territory => (
              <div
                key={territory.id}
                className="flex items-center justify-between border rounded-lg p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => navigate(`/territories-and-distributors`)}
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                    <Map className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="font-medium text-sm text-primary hover:underline">{territory.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className="text-xs">{territory.region}</Badge>
                      {territory.territory_type && (
                        <Badge variant="secondary" className="text-xs capitalize">
                          {territory.territory_type}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

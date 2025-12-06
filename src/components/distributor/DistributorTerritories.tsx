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
      // Get territories via beats linked to this distributor
      const { data: beats, error: beatsError } = await supabase
        .from('beats')
        .select('territory_id')
        .eq('distributor_id', distributorId)
        .not('territory_id', 'is', null);

      if (beatsError) throw beatsError;

      const territoryIds = [...new Set(beats?.map(b => b.territory_id).filter(Boolean))] as string[];

      if (territoryIds.length === 0) {
        setTerritories([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('territories')
        .select('id, name, territory_type')
        .in('id', territoryIds)
        .order('name');

      if (error) throw error;
      setTerritories(data || []);
    } catch (error: any) {
      toast.error("Failed to load territories: " + error.message);
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
            <p className="text-sm text-muted-foreground">No territories found</p>
            <p className="text-xs text-muted-foreground mt-1">
              Territories are derived from linked beats
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
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <Map className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{territory.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {territory.territory_type && (
                        <Badge variant="outline" className="text-xs capitalize">
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

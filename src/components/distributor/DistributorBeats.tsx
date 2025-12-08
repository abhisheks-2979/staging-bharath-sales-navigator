import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Route, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Beat {
  id: string;
  beat_id: string;
  beat_name: string;
  category: string | null;
  is_active: boolean | null;
}

interface Props {
  distributorId: string;
}

export function DistributorBeats({ distributorId }: Props) {
  const navigate = useNavigate();
  const [beats, setBeats] = useState<Beat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBeats();
  }, [distributorId]);

  const loadBeats = async () => {
    try {
      const { data, error } = await supabase
        .from('beats')
        .select('id, beat_id, beat_name, category, is_active')
        .eq('distributor_id', distributorId)
        .order('beat_name');

      if (error) throw error;
      setBeats(data || []);
    } catch (error: any) {
      toast.error("Failed to load beats: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Route className="h-4 w-4" />
          Beats Supported ({beats.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 bg-muted animate-pulse rounded" />
            ))}
          </div>
        ) : beats.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">No beats linked to this distributor</p>
            <p className="text-xs text-muted-foreground mt-1">
              Link beats by setting distributor in the Beat Master
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {beats.map(beat => (
              <div
                key={beat.id}
                className="flex items-center justify-between border rounded-lg p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => navigate(`/beat/${beat.id}`)}
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Route className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{beat.beat_name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {beat.category && <span className="text-xs text-muted-foreground">{beat.category}</span>}
                      {beat.category && (
                        <Badge variant="outline" className="text-xs">
                          {beat.category}
                        </Badge>
                      )}
                      {beat.is_active === false && (
                        <Badge variant="secondary" className="text-xs">Inactive</Badge>
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

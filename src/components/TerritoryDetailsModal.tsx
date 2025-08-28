import React, { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Building2, Store, BarChart3 } from "lucide-react";

interface TerritoryDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  territory: { id: string; name: string } | null;
}

interface DistributorRow {
  id: string;
  name: string;
  contact_person?: string | null;
}

interface RetailerRow {
  id: string;
  name: string;
  category?: string | null;
}

const TerritoryDetailsModal: React.FC<TerritoryDetailsModalProps> = ({ open, onOpenChange, territory }) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [distributors, setDistributors] = useState<DistributorRow[]>([]);
  const [retailers, setRetailers] = useState<RetailerRow[]>([]);
  const title = useMemo(() => territory ? `Territory: ${territory.name}` : "Territory", [territory]);

  useEffect(() => {
    if (!open || !territory?.id) return;
    const load = async () => {
      setLoading(true);
      try {
        // 1) Distributors in this territory
        const { data: distData, error: distErr } = await supabase
          .from('distributors')
          .select('id,name,contact_person')
          .eq('territory_id', territory.id);
        if (distErr) throw distErr;
        setDistributors((distData || []) as any);

        // 2) Retailers via distributor mapping table
        const distributorIds = (distData || []).map((d: any) => d.id);
        if (distributorIds.length === 0) {
          setRetailers([]);
          return;
        }

        const { data: maps, error: mapErr } = await supabase
          .from('distributor_retailer_mappings')
          .select('retailer_id')
          .in('distributor_id', distributorIds);
        if (mapErr) throw mapErr;

        const retailerIds = Array.from(new Set((maps || []).map((m: any) => m.retailer_id)));
        if (retailerIds.length === 0) {
          setRetailers([]);
          return;
        }

        const { data: retailersData, error: retErr } = await supabase
          .from('retailers')
          .select('id,name,category')
          .in('id', retailerIds);
        if (retErr) throw retErr;
        setRetailers((retailersData || []) as any);
      } catch (e: any) {
        console.error(e);
        toast({ title: 'Error', description: 'Failed to load related data', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [open, territory?.id, toast]);

  const handleAnalytics = () => {
    if (!territory) return;
    navigate(`/analytics?territory_id=${territory.id}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95%] max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="flex justify-end mb-2">
          <Button size="sm" variant="secondary" onClick={handleAnalytics} className="flex items-center gap-2">
            <BarChart3 size={16} /> Analytics
          </Button>
        </div>

        <Tabs defaultValue="distributors" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="distributors">Distributors</TabsTrigger>
            <TabsTrigger value="retailers">Retailers</TabsTrigger>
          </TabsList>

          <TabsContent value="distributors" className="mt-4">
            {loading ? (
              <div className="py-8 text-center text-muted-foreground">Loading...</div>
            ) : distributors.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">No distributors linked yet.</div>
            ) : (
              <ul className="space-y-2">
                {distributors.map(d => (
                  <li key={d.id} className="flex items-center justify-between rounded border p-3">
                    <div className="flex items-center gap-2">
                      <Building2 size={16} className="text-primary" />
                      <span className="font-medium">{d.name}</span>
                    </div>
                    {d.contact_person && <Badge variant="outline">{d.contact_person}</Badge>}
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>

          <TabsContent value="retailers" className="mt-4">
            {loading ? (
              <div className="py-8 text-center text-muted-foreground">Loading...</div>
            ) : retailers.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">No retailers mapped yet.</div>
            ) : (
              <ul className="space-y-2">
                {retailers.map(r => (
                  <li key={r.id} className="flex items-center justify-between rounded border p-3">
                    <div className="flex items-center gap-2">
                      <Store size={16} className="text-primary" />
                      <span className="font-medium">{r.name}</span>
                    </div>
                    {r.category && <Badge variant="secondary">{r.category}</Badge>}
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default TerritoryDetailsModal;

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, Camera, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface CompetitionRow {
  id: string;
  competitorId: string;
  skuId: string;
  stockQuantity: number;
  unit: string;
  insight: string;
  impactLevel: string;
  needsAttention: boolean;
  photoUrls: string[];
}

interface CompetitionDataFormProps {
  retailerId: string;
  visitId: string;
  onSave: () => void;
}

export const CompetitionDataForm = ({ retailerId, visitId, onSave }: CompetitionDataFormProps) => {
  const [rows, setRows] = useState<CompetitionRow[]>([
    { id: "1", competitorId: "", skuId: "", stockQuantity: 0, unit: "", insight: "", impactLevel: "", needsAttention: false, photoUrls: [] }
  ]);
  const [competitors, setCompetitors] = useState<any[]>([]);
  const [skus, setSkus] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCompetitors();
    loadSavedData();
  }, [retailerId, visitId]);

  const fetchCompetitors = async () => {
    try {
      const { data, error } = await supabase
        .from('competition_master')
        .select('*')
        .order('competitor_name');

      if (error) throw error;
      setCompetitors(data || []);
    } catch (error) {
      console.error('Error fetching competitors:', error);
      toast({
        title: "Error",
        description: "Failed to load competitors",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSKUs = async (competitorId: string) => {
    try {
      const { data, error } = await supabase
        .from('competition_skus')
        .select('*')
        .eq('competitor_id', competitorId);

      if (error) throw error;
      setSkus(data || []);
    } catch (error) {
      console.error('Error fetching SKUs:', error);
    }
  };

  const loadSavedData = async () => {
    try {
      const { data, error } = await supabase
        .from('competition_data')
        .select('*')
        .eq('visit_id', visitId)
        .eq('retailer_id', retailerId);

      if (error) throw error;

      if (data && data.length > 0) {
        const loadedRows = data.map((item, index) => ({
          id: (index + 1).toString(),
          competitorId: item.competitor_id,
          skuId: item.sku_id || "",
          stockQuantity: item.stock_quantity || 0,
          unit: item.unit || "",
          insight: item.insight || "",
          impactLevel: item.impact_level || "",
          needsAttention: item.needs_attention || false,
          photoUrls: item.photo_urls || []
        }));
        setRows(loadedRows);
      }
    } catch (error) {
      console.error('Error loading saved data:', error);
    }
  };

  const addRow = () => {
    const newId = (rows.length + 1).toString();
    setRows([...rows, {
      id: newId,
      competitorId: "",
      skuId: "",
      stockQuantity: 0,
      unit: "",
      insight: "",
      impactLevel: "",
      needsAttention: false,
      photoUrls: []
    }]);
  };

  const deleteRow = (id: string) => {
    if (rows.length > 1) {
      setRows(rows.filter(row => row.id !== id));
    }
  };

  const updateRow = (id: string, field: string, value: any) => {
    setRows(rows.map(row => {
      if (row.id === id) {
        if (field === 'competitorId' && value !== row.competitorId) {
          fetchSKUs(value);
          return { ...row, [field]: value, skuId: "" };
        }
        return { ...row, [field]: value };
      }
      return row;
    }));
  };

  const handlePhotoUpload = async (rowId: string, file: File) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('competition-photos')
        .upload(fileName, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('competition-photos')
        .getPublicUrl(fileName);

      setRows(rows.map(row => {
        if (row.id === rowId) {
          return { ...row, photoUrls: [...row.photoUrls, publicUrl] };
        }
        return row;
      }));

      toast({
        title: "Photo uploaded",
        description: "Photo added successfully"
      });
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast({
        title: "Error",
        description: "Failed to upload photo",
        variant: "destructive"
      });
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Delete existing data for this visit
      await supabase
        .from('competition_data')
        .delete()
        .eq('visit_id', visitId)
        .eq('retailer_id', retailerId);

      // Insert new data
      const dataToInsert = rows
        .filter(row => row.competitorId && row.skuId)
        .map(row => ({
          user_id: user.id,
          retailer_id: retailerId,
          visit_id: visitId,
          competitor_id: row.competitorId,
          sku_id: row.skuId,
          stock_quantity: row.stockQuantity,
          unit: row.unit,
          insight: row.insight,
          impact_level: row.impactLevel,
          needs_attention: row.needsAttention,
          photo_urls: row.photoUrls
        }));

      if (dataToInsert.length > 0) {
        const { error } = await supabase
          .from('competition_data')
          .insert(dataToInsert);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Competition data saved successfully"
        });
        
        onSave();
      } else {
        toast({
          title: "Warning",
          description: "Please fill in at least one complete row",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error saving data:', error);
      toast({
        title: "Error",
        description: "Failed to save competition data",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Competition Tracking</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Competitor</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Insight</TableHead>
                <TableHead>Impact</TableHead>
                <TableHead>Needs Attention</TableHead>
                <TableHead>Photos</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <Select
                      value={row.competitorId}
                      onValueChange={(value) => updateRow(row.id, 'competitorId', value)}
                    >
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {competitors.map((comp) => (
                          <SelectItem key={comp.id} value={comp.id}>
                            {comp.competitor_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={row.skuId}
                      onValueChange={(value) => updateRow(row.id, 'skuId', value)}
                      disabled={!row.competitorId}
                    >
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {skus
                          .filter(sku => sku.competitor_id === row.competitorId)
                          .map((sku) => (
                            <SelectItem key={sku.id} value={sku.id}>
                              {sku.sku_name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={row.stockQuantity}
                      onChange={(e) => updateRow(row.id, 'stockQuantity', parseInt(e.target.value) || 0)}
                      className="w-[80px]"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={row.unit}
                      onChange={(e) => updateRow(row.id, 'unit', e.target.value)}
                      className="w-[80px]"
                      placeholder="Unit"
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={row.insight}
                      onValueChange={(value) => updateRow(row.id, 'insight', value)}
                    >
                      <SelectTrigger className="w-[120px]">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pricing">Pricing</SelectItem>
                        <SelectItem value="promotion">Promotion</SelectItem>
                        <SelectItem value="shelf_space">Shelf Space</SelectItem>
                        <SelectItem value="new_product">New Product</SelectItem>
                        <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={row.impactLevel}
                      onValueChange={(value) => updateRow(row.id, 'impactLevel', value)}
                    >
                      <SelectTrigger className="w-[100px]">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Checkbox
                      checked={row.needsAttention}
                      onCheckedChange={(checked) => updateRow(row.id, 'needsAttention', checked)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`photo-${row.id}`} className="cursor-pointer">
                        <Camera className="h-4 w-4" />
                      </Label>
                      <Input
                        id={`photo-${row.id}`}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handlePhotoUpload(row.id, file);
                        }}
                      />
                      <span className="text-sm">{row.photoUrls.length}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteRow(row.id)}
                      disabled={rows.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="flex justify-between mt-4">
          <Button onClick={addRow} variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Add Row
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Check className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save Competition Data"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

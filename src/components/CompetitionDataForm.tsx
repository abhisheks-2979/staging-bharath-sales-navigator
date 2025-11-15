import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, Camera, Check, Mic, Square, Edit, ExternalLink } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

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
  voiceNoteUrls: string[];
}

interface CompetitionDataFormProps {
  retailerId: string;
  visitId: string;
  onSave: () => void;
}

export const CompetitionDataForm = ({ retailerId, visitId, onSave }: CompetitionDataFormProps) => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<CompetitionRow[]>([
    { id: "1", competitorId: "", skuId: "", stockQuantity: 0, unit: "KGS", insight: "", impactLevel: "", needsAttention: false, photoUrls: [], voiceNoteUrls: [] }
  ]);
  const [competitors, setCompetitors] = useState<any[]>([]);
  const [skus, setSkus] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recording, setRecording] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [savedData, setSavedData] = useState<CompetitionRow[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

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
          unit: item.unit || "KGS",
          insight: item.insight || "",
          impactLevel: item.impact_level || "",
          needsAttention: item.needs_attention || false,
          photoUrls: item.photo_urls || [],
          voiceNoteUrls: item.voice_note_urls || []
        }));
        setRows(loadedRows);
        setSavedData(loadedRows);
        setIsEditMode(false);
      } else {
        setIsEditMode(true);
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
      unit: "KGS",
      insight: "",
      impactLevel: "",
      needsAttention: false,
      photoUrls: [],
      voiceNoteUrls: []
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

  const startRecording = async (rowId: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await uploadVoiceNote(rowId, blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setRecording(rowId);
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Error",
        description: "Failed to start recording",
        variant: "destructive"
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(null);
    }
  };

  const uploadVoiceNote = async (rowId: string, blob: Blob) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const fileName = `${user.id}/${Date.now()}.webm`;
      
      const { data, error } = await supabase.storage
        .from('competition-photos')
        .upload(fileName, blob);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('competition-photos')
        .getPublicUrl(fileName);

      setRows(rows.map(row => {
        if (row.id === rowId) {
          return { ...row, voiceNoteUrls: [...row.voiceNoteUrls, publicUrl] };
        }
        return row;
      }));

      toast({
        title: "Voice note saved",
        description: "Voice note added successfully"
      });
    } catch (error) {
      console.error('Error uploading voice note:', error);
      toast({
        title: "Error",
        description: "Failed to upload voice note",
        variant: "destructive"
      });
    }
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
          photo_urls: row.photoUrls,
          voice_note_urls: row.voiceNoteUrls
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
        
        setSavedData(rows.filter(row => row.competitorId && row.skuId));
        setIsEditMode(false);
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

  // Display mode - show saved data as read-only table
  if (!isEditMode && savedData.length > 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Competition Tracking</CardTitle>
          <Button onClick={() => setIsEditMode(true)} size="sm" variant="outline">
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {savedData.map((row, index) => {
              const competitor = competitors.find(c => c.id === row.competitorId);
              const sku = skus.find(s => s.id === row.skuId);
              
              return (
                <div key={row.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="link"
                        className="p-0 h-auto font-semibold text-primary hover:underline"
                        onClick={() => navigate('/competition-master')}
                      >
                        {competitor?.competitor_name || 'Unknown'}
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </Button>
                      {row.needsAttention && (
                        <Badge variant="destructive">Needs Attention</Badge>
                      )}
                    </div>
                    {row.impactLevel && (
                      <Badge variant={
                        row.impactLevel === 'high' ? 'destructive' : 
                        row.impactLevel === 'medium' ? 'default' : 
                        'secondary'
                      }>
                        {row.impactLevel.toUpperCase()} Impact
                      </Badge>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">SKU:</span> {sku?.sku_name || 'Unknown'}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Stock:</span> {row.stockQuantity} {row.unit}
                    </div>
                    {row.insight && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Insight:</span> {row.insight}
                      </div>
                    )}
                    {row.photoUrls.length > 0 && (
                      <div>
                        <span className="text-muted-foreground">Photos:</span> {row.photoUrls.length}
                      </div>
                    )}
                    {row.voiceNoteUrls.length > 0 && (
                      <div>
                        <span className="text-muted-foreground">Voice Notes:</span> {row.voiceNoteUrls.length}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Edit mode - show editable table
  return (
    <Card>
      <CardHeader>
        <CardTitle>Competition Tracking</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="overflow-x-auto">
          <div className="min-w-max">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Competitor</TableHead>
                  <TableHead className="w-[120px]">SKU</TableHead>
                  <TableHead className="w-[80px]">Stock</TableHead>
                  <TableHead className="w-[80px]">Unit</TableHead>
                  <TableHead className="w-[100px]">Insight</TableHead>
                  <TableHead className="w-[80px]">Impact</TableHead>
                  <TableHead className="w-[60px]">Alert</TableHead>
                  <TableHead className="w-[90px]">Media</TableHead>
                  <TableHead className="w-[50px]">Action</TableHead>
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
                        <SelectTrigger className="w-[110px]">
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
                        <SelectTrigger className="w-[110px]">
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
                        className="w-[70px]"
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={row.unit}
                        onValueChange={(value) => updateRow(row.id, 'unit', value)}
                      >
                        <SelectTrigger className="w-[80px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="KGS">KGS</SelectItem>
                          <SelectItem value="Grams">Grams</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={row.insight}
                        onValueChange={(value) => updateRow(row.id, 'insight', value)}
                      >
                        <SelectTrigger className="w-[100px]">
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
                        <SelectTrigger className="w-[80px]">
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
                      <div className="flex items-center gap-1">
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
                        <span className="text-xs">{row.photoUrls.length}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => recording === row.id ? stopRecording() : startRecording(row.id)}
                        >
                          {recording === row.id ? (
                            <Square className="h-3 w-3 text-red-500" />
                          ) : (
                            <Mic className="h-3 w-3" />
                          )}
                        </Button>
                        <span className="text-xs">{row.voiceNoteUrls.length}</span>
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
        </div>
        <div className="flex justify-between gap-2 pt-2">
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

import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, Camera, Check, Mic, Square, Edit, ExternalLink } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

interface CompetitionRow {
  id: string;
  competitorId: string;
  skuId: string;
  stockQuantity: number;
  unit: string;
  sellingPrice: number;
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
    { id: "1", competitorId: "", skuId: "", stockQuantity: 0, unit: "KGS", sellingPrice: 0, insight: "", impactLevel: "", needsAttention: false, photoUrls: [], voiceNoteUrls: [] }
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
          sellingPrice: item.selling_price || 0,
          insight: item.insight || "",
          impactLevel: item.impact_level || "",
          needsAttention: item.needs_attention || false,
          photoUrls: item.photo_urls || [],
          voiceNoteUrls: item.voice_note_urls || []
        }));
        setRows(loadedRows);
        setSavedData(loadedRows);

        const uniqueCompetitorIds = [...new Set(data.map(item => item.competitor_id))];
        for (const compId of uniqueCompetitorIds) {
          await fetchSKUs(compId);
        }
      }
    } catch (error) {
      console.error('Error loading saved data:', error);
    }
  };

  const updateRow = (id: string, field: keyof CompetitionRow, value: any) => {
    setRows(prevRows => {
      const updatedRows = prevRows.map(row => {
        if (row.id === id) {
          const updated = { ...row, [field]: value };
          if (field === 'competitorId') {
            fetchSKUs(value);
            updated.skuId = "";
          }
          return updated;
        }
        return row;
      });
      return updatedRows;
    });
  };

  const addRow = () => {
    const newId = (rows.length + 1).toString();
    setRows([...rows, { 
      id: newId, 
      competitorId: "", 
      skuId: "", 
      stockQuantity: 0, 
      unit: "KGS", 
      sellingPrice: 0, 
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

  const handlePhotoUpload = async (rowId: string, file: File) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `competition-photos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('competition-photos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('competition-photos')
        .getPublicUrl(filePath);

      setRows(prevRows => prevRows.map(row => {
        if (row.id === rowId) {
          return { ...row, photoUrls: [...row.photoUrls, publicUrl] };
        }
        return row;
      }));

      toast({
        title: "Success",
        description: "Photo uploaded successfully"
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

  const startRecording = async (rowId: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await uploadVoiceNote(rowId, audioBlob);
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
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setRecording(null);
    }
  };

  const uploadVoiceNote = async (rowId: string, blob: Blob) => {
    try {
      const fileName = `${Date.now()}.webm`;
      const filePath = `competition-photos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('competition-photos')
        .upload(filePath, blob);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('competition-photos')
        .getPublicUrl(filePath);

      setRows(prevRows => prevRows.map(row => {
        if (row.id === rowId) {
          return { ...row, voiceNoteUrls: [...row.voiceNoteUrls, publicUrl] };
        }
        return row;
      }));

      toast({
        title: "Success",
        description: "Voice note saved successfully"
      });
    } catch (error) {
      console.error('Error uploading voice note:', error);
      toast({
        title: "Error",
        description: "Failed to save voice note",
        variant: "destructive"
      });
    }
  };

  const saveData = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      await supabase
        .from('competition_data')
        .delete()
        .eq('visit_id', visitId)
        .eq('retailer_id', retailerId);

      const dataToInsert = rows
        .filter(row => row.competitorId && row.skuId)
        .map(row => ({
          retailer_id: retailerId,
          visit_id: visitId,
          user_id: user.id,
          competitor_id: row.competitorId,
          sku_id: row.skuId,
          stock_quantity: row.stockQuantity,
          unit: row.unit,
          selling_price: row.sellingPrice,
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

  // Display mode - show saved data as read-only cards
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
            {savedData.map((row) => {
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
                        row.impactLevel === 'positive' ? 'default' : 
                        row.impactLevel === 'negative' ? 'destructive' : 
                        'secondary'
                      }>
                        {row.impactLevel.charAt(0).toUpperCase() + row.impactLevel.slice(1)}
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
                    {row.sellingPrice > 0 && (
                      <div>
                        <span className="text-muted-foreground">Price:</span> ₹{row.sellingPrice}
                      </div>
                    )}
                    {row.insight && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Insight:</span> {row.insight}
                      </div>
                    )}
                  </div>

                  {(row.photoUrls.length > 0 || row.voiceNoteUrls.length > 0) && (
                    <div className="flex gap-2 pt-2">
                      {row.photoUrls.map((url, idx) => (
                        <a key={idx} href={url} target="_blank" rel="noopener noreferrer">
                          <img src={url} alt="Competition" className="h-16 w-16 object-cover rounded border" />
                        </a>
                      ))}
                      {row.voiceNoteUrls.map((url, idx) => (
                        <audio key={idx} controls src={url} className="h-8" />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Edit mode - mobile-friendly card layout
  return (
    <Card>
      <CardHeader>
        <CardTitle>Competition Tracking</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
          {rows.map((row, index) => (
            <div key={row.id} className="border rounded-lg p-4 space-y-3 bg-card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">Entry #{index + 1}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteRow(row.id)}
                  disabled={rows.length === 1}
                  className="h-8 w-8"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-3">
                {/* Competitor */}
                <div className="space-y-1.5">
                  <Label className="text-sm">Competitor</Label>
                  <Select
                    value={row.competitorId}
                    onValueChange={(value) => updateRow(row.id, 'competitorId', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Competitor" />
                    </SelectTrigger>
                    <SelectContent>
                      {competitors.map((comp) => (
                        <SelectItem key={comp.id} value={comp.id}>
                          {comp.competitor_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* SKU */}
                <div className="space-y-1.5">
                  <Label className="text-sm">SKU</Label>
                  <Select
                    value={row.skuId}
                    onValueChange={(value) => updateRow(row.id, 'skuId', value)}
                    disabled={!row.competitorId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select SKU" />
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
                </div>

                {/* Stock and Unit */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm">Stock Quantity</Label>
                    <Input
                      type="number"
                      value={row.stockQuantity}
                      onChange={(e) => updateRow(row.id, 'stockQuantity', parseInt(e.target.value) || 0)}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Unit</Label>
                    <Select
                      value={row.unit}
                      onValueChange={(value) => updateRow(row.id, 'unit', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="KGS">KGS</SelectItem>
                        <SelectItem value="Grams">Grams</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Selling Price */}
                <div className="space-y-1.5">
                  <Label className="text-sm">Selling Price (₹)</Label>
                  <Input
                    type="number"
                    value={row.sellingPrice}
                    onChange={(e) => updateRow(row.id, 'sellingPrice', parseFloat(e.target.value) || 0)}
                    placeholder="0"
                  />
                </div>

                {/* Insight */}
                <div className="space-y-1.5">
                  <Label className="text-sm">Insight</Label>
                  <Select
                    value={row.insight}
                    onValueChange={(value) => updateRow(row.id, 'insight', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Insight" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pricing">Pricing</SelectItem>
                      <SelectItem value="promotion">Promotion</SelectItem>
                      <SelectItem value="shelf_space">Shelf Space</SelectItem>
                      <SelectItem value="new_product">New Product</SelectItem>
                      <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Retailer Feedback */}
                <div className="space-y-1.5">
                  <Label className="text-sm">Retailer Feedback</Label>
                  <Select
                    value={row.impactLevel}
                    onValueChange={(value) => updateRow(row.id, 'impactLevel', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Feedback" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="positive">Positive</SelectItem>
                      <SelectItem value="neutral">Neutral</SelectItem>
                      <SelectItem value="negative">Negative</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Needs Attention */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={`attention-${row.id}`}
                    checked={row.needsAttention}
                    onCheckedChange={(checked) => updateRow(row.id, 'needsAttention', checked)}
                  />
                  <Label htmlFor={`attention-${row.id}`} className="text-sm font-normal cursor-pointer">
                    Needs Attention
                  </Label>
                </div>

                {/* Media */}
                <div className="space-y-1.5">
                  <Label className="text-sm">Media</Label>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`photo-${row.id}`} className="cursor-pointer">
                        <div className="flex items-center gap-1 px-3 py-2 border rounded-md hover:bg-accent">
                          <Camera className="h-4 w-4" />
                          <span className="text-sm">Photo ({row.photoUrls.length})</span>
                        </div>
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
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => recording === row.id ? stopRecording() : startRecording(row.id)}
                      className="gap-1"
                    >
                      {recording === row.id ? (
                        <>
                          <Square className="h-4 w-4 text-red-500" />
                          <span>Stop</span>
                        </>
                      ) : (
                        <>
                          <Mic className="h-4 w-4" />
                          <span>Voice ({row.voiceNoteUrls.length})</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Button onClick={addRow} variant="outline" size="sm" className="flex-1">
            <Plus className="h-4 w-4 mr-2" />
            Add Entry
          </Button>
          <Button onClick={saveData} disabled={saving} size="sm" className="flex-1">
            <Check className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save All"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

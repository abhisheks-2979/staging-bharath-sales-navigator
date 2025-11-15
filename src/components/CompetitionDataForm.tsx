import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, Camera, Mic, Square, Edit } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

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
  const [rows, setRows] = useState<CompetitionRow[]>([
    { id: "1", competitorId: "", skuId: "", stockQuantity: 0, unit: "KGS", sellingPrice: 0, insight: "", impactLevel: "", needsAttention: false, photoUrls: [], voiceNoteUrls: [] }
  ]);
  const [competitors, setCompetitors] = useState<any[]>([]);
  const [skus, setSkus] = useState<{ [key: string]: any[] }>({});
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

  const fetchSKUs = async (competitorId: string, rowId: string) => {
    try {
      const { data, error } = await supabase
        .from('competition_skus')
        .select('*')
        .eq('competitor_id', competitorId)
        .eq('is_active', true);

      if (error) throw error;
      setSkus(prev => ({ ...prev, [rowId]: data || [] }));
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
        
        // Load SKUs for each competitor
        loadedRows.forEach(row => {
          if (row.competitorId) {
            fetchSKUs(row.competitorId, row.id);
          }
        });
      }
    } catch (error) {
      console.error('Error loading saved data:', error);
    }
  };

  const updateRow = (id: string, field: keyof CompetitionRow, value: any) => {
    setRows(prev => prev.map(row => {
      if (row.id === id) {
        // If competitor is changing, fetch new SKUs and reset SKU selection
        if (field === 'competitorId') {
          fetchSKUs(value, id);
          return { ...row, [field]: value, skuId: "" };
        }
        return { ...row, [field]: value };
      }
      return row;
    }));
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

  const handlePhotoUpload = async (id: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `competition-photos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('visits')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('visits')
        .getPublicUrl(filePath);

      updateRow(id, 'photoUrls', [...rows.find(r => r.id === id)!.photoUrls, publicUrl]);
      
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

  const startRecording = async (id: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await uploadVoiceNote(id, blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setRecording(id);
      
      toast({
        title: "Recording",
        description: "Voice recording started"
      });
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

  const uploadVoiceNote = async (id: string, blob: Blob) => {
    try {
      const fileName = `${Date.now()}.webm`;
      const filePath = `voice-notes/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('visits')
        .upload(filePath, blob);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('visits')
        .getPublicUrl(filePath);

      updateRow(id, 'voiceNoteUrls', [...rows.find(r => r.id === id)!.voiceNoteUrls, publicUrl]);
      
      toast({
        title: "Success",
        description: "Voice note uploaded successfully"
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

  const saveData = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Delete existing entries for this visit
      await supabase
        .from('competition_data')
        .delete()
        .eq('visit_id', visitId)
        .eq('retailer_id', retailerId);

      // Insert new entries
      const entries = rows
        .filter(row => row.competitorId && row.skuId)
        .map(row => ({
          competitor_id: row.competitorId,
          sku_id: row.skuId,
          stock_quantity: row.stockQuantity,
          unit: row.unit,
          selling_price: row.sellingPrice,
          insight: row.insight,
          impact_level: row.impactLevel,
          needs_attention: row.needsAttention,
          photo_urls: row.photoUrls,
          voice_note_urls: row.voiceNoteUrls,
          retailer_id: retailerId,
          visit_id: visitId,
          user_id: user.id
        }));

      if (entries.length > 0) {
        const { error } = await supabase
          .from('competition_data')
          .insert(entries);

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "Competition data saved successfully"
      });
      
      setSavedData(rows);
      setIsEditMode(false);
      onSave();
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
    return <div className="p-4">Loading...</div>;
  }

  // Display mode - show saved data
  if (!isEditMode && savedData.length > 0) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Competition Data</h3>
          <Button onClick={() => setIsEditMode(true)} variant="outline" size="sm">
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </div>
        
        <div className="space-y-4">
          {savedData.map((row) => {
            const competitor = competitors.find(c => c.id === row.competitorId);
            const sku = skus[row.id]?.find(s => s.id === row.skuId);
            
            return (
              <Card key={row.id}>
                <CardContent className="pt-6 space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Competitor</p>
                    <p className="font-medium">{competitor?.competitor_name || 'Unknown'}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">SKU</p>
                      <p className="font-medium">{sku?.sku_name || 'Unknown'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Unit</p>
                      <p className="font-medium">{row.unit}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Stock Quantity</p>
                      <p className="font-medium">{row.stockQuantity}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Selling Price</p>
                      <p className="font-medium">₹{row.sellingPrice}</p>
                    </div>
                  </div>
                  {(row.insight || row.impactLevel || row.needsAttention) && (
                    <div className="pt-4 border-t space-y-2">
                      {row.insight && (
                        <div>
                          <p className="text-sm text-muted-foreground">Retailer Feedback</p>
                          <p className="font-medium">{row.insight}</p>
                        </div>
                      )}
                      {row.impactLevel && (
                        <div>
                          <p className="text-sm text-muted-foreground">Impact Level</p>
                          <p className="font-medium">{row.impactLevel}</p>
                        </div>
                      )}
                      {row.needsAttention && (
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-muted-foreground">Needs Attention</p>
                          <span className="text-destructive font-medium">Yes</span>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  // Edit mode - show form with two sections
  return (
    <div className="space-y-6">
      {/* Section 1: Competition Stock */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>1. Competition Stock</span>
            <Button onClick={addRow} size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Row
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-2 text-left text-sm font-medium">Competitor</th>
                  <th className="p-2 text-left text-sm font-medium">SKU</th>
                  <th className="p-2 text-left text-sm font-medium">Unit</th>
                  <th className="p-2 text-left text-sm font-medium">Stock Qty</th>
                  <th className="p-2 text-left text-sm font-medium">Price (₹)</th>
                  <th className="p-2 text-center text-sm font-medium w-[50px]">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b">
                    <td className="p-2">
                      <Select
                        value={row.competitorId}
                        onValueChange={(value) => updateRow(row.id, 'competitorId', value)}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Select competitor" />
                        </SelectTrigger>
                        <SelectContent>
                          {competitors.map((comp) => (
                            <SelectItem key={comp.id} value={comp.id}>
                              {comp.competitor_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-2">
                      <Select
                        value={row.skuId}
                        onValueChange={(value) => updateRow(row.id, 'skuId', value)}
                        disabled={!row.competitorId}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Select SKU" />
                        </SelectTrigger>
                        <SelectContent>
                          {(skus[row.id] || []).map((sku) => (
                            <SelectItem key={sku.id} value={sku.id}>
                              {sku.sku_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-2">
                      <Select
                        value={row.unit}
                        onValueChange={(value) => updateRow(row.id, 'unit', value)}
                      >
                        <SelectTrigger className="w-[100px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="KGS">KGS</SelectItem>
                          <SelectItem value="LTRS">LTRS</SelectItem>
                          <SelectItem value="UNITS">UNITS</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-2">
                      <Input
                        type="number"
                        value={row.stockQuantity}
                        onChange={(e) => updateRow(row.id, 'stockQuantity', parseFloat(e.target.value) || 0)}
                        className="w-[100px]"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        type="number"
                        value={row.sellingPrice}
                        onChange={(e) => updateRow(row.id, 'sellingPrice', parseFloat(e.target.value) || 0)}
                        className="w-[120px]"
                      />
                    </td>
                    <td className="p-2 text-center">
                      <Button
                        onClick={() => deleteRow(row.id)}
                        variant="ghost"
                        size="sm"
                        disabled={rows.length === 1}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Retailer Feedback on Competition */}
      <Card>
        <CardHeader>
          <CardTitle>2. Retailer Feedback on Competition</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {rows.map((row, index) => {
            const competitor = competitors.find(c => c.id === row.competitorId);
            const sku = skus[row.id]?.find(s => s.id === row.skuId);
            
            return (
              <div key={row.id} className="p-4 border rounded-lg space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium">
                    Entry {index + 1}: {competitor?.competitor_name || 'Select competitor'} - {sku?.sku_name || 'Select SKU'}
                  </h4>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label>Retailer Feedback / Insight</Label>
                    <Textarea
                      value={row.insight}
                      onChange={(e) => updateRow(row.id, 'insight', e.target.value)}
                      placeholder="Enter retailer feedback about this competition product..."
                      className="mt-1"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Impact Level</Label>
                      <Select
                        value={row.impactLevel}
                        onValueChange={(value) => updateRow(row.id, 'impactLevel', value)}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select impact level" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Low">Low</SelectItem>
                          <SelectItem value="Medium">Medium</SelectItem>
                          <SelectItem value="High">High</SelectItem>
                          <SelectItem value="Critical">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center space-x-2 pt-6">
                      <Checkbox
                        id={`attention-${row.id}`}
                        checked={row.needsAttention}
                        onCheckedChange={(checked) => updateRow(row.id, 'needsAttention', checked)}
                      />
                      <Label htmlFor={`attention-${row.id}`}>
                        Action Required / Needs Attention
                      </Label>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handlePhotoUpload(row.id, e)}
                        className="hidden"
                        id={`photo-${row.id}`}
                      />
                      <Button
                        onClick={() => document.getElementById(`photo-${row.id}`)?.click()}
                        variant="outline"
                        size="sm"
                      >
                        <Camera className="h-4 w-4 mr-2" />
                        Add Photo ({row.photoUrls.length})
                      </Button>
                    </div>

                    <Button
                      onClick={() => recording === row.id ? stopRecording() : startRecording(row.id)}
                      variant={recording === row.id ? "destructive" : "outline"}
                      size="sm"
                    >
                      {recording === row.id ? (
                        <>
                          <Square className="h-4 w-4 mr-2" />
                          Stop Recording
                        </>
                      ) : (
                        <>
                          <Mic className="h-4 w-4 mr-2" />
                          Voice Note ({row.voiceNoteUrls.length})
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-2 justify-end">
        {savedData.length > 0 && (
          <Button onClick={() => setIsEditMode(false)} variant="outline">
            Cancel
          </Button>
        )}
        <Button onClick={saveData} disabled={saving}>
          {saving ? "Saving..." : "Save All Data"}
        </Button>
      </div>
    </div>
  );
}
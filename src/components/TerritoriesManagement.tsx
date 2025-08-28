import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import TerritoryDetailsModal from './TerritoryDetailsModal';

interface Territory {
  id: string;
  name: string;
  region: string;
  pincode_ranges: string[];
  created_at: string;
}

const TerritoriesManagement = () => {
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedTerritory, setSelectedTerritory] = useState<{ id: string; name: string } | null>(null);
  const [newTerritory, setNewTerritory] = useState({
    name: '',
    region: '',
    pincode_ranges: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    loadTerritories();
  }, []);

  const loadTerritories = async () => {
    try {
      const { data, error } = await supabase
        .from('territories')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;

      const normalized: Territory[] = (data || []).map((t: any) => ({
        id: t.id,
        name: t.name,
        region: t.region,
        pincode_ranges: t.pincode_ranges || [],
        created_at: t.created_at,
      }));
      setTerritories(normalized);
    } catch (error) {
      console.error('Error loading territories:', error);
      toast({
        title: "Error",
        description: "Failed to load territories",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddTerritory = async () => {
    if (!newTerritory.name || !newTerritory.region) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('territories')
        .insert({
          name: newTerritory.name,
          region: newTerritory.region,
          pincode_ranges: newTerritory.pincode_ranges.split(',').map(s => s.trim())
        })
        .select('*')
        .single();
      if (error) throw error;

      const territory: Territory = {
        id: data.id,
        name: data.name,
        region: data.region,
        pincode_ranges: data.pincode_ranges || [],
        created_at: data.created_at
      };

      setTerritories([territory, ...territories]);
      setNewTerritory({ name: '', region: '', pincode_ranges: '' });
      setShowAddForm(false);
      
      toast({
        title: "Success",
        description: "Territory added successfully",
      });
    } catch (error) {
      console.error('Error adding territory:', error);
      toast({
        title: "Error",
        description: "Failed to add territory",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Territory Management</h2>
          <p className="text-muted-foreground">Organize and manage territorial boundaries</p>
        </div>
        <Button onClick={() => setShowAddForm(true)} className="flex items-center gap-2">
          <Plus size={16} />
          Add Territory
        </Button>
      </div>

      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>Add New Territory</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Territory Name</Label>
                <Input
                  id="name"
                  value={newTerritory.name}
                  onChange={(e) => setNewTerritory({ ...newTerritory, name: e.target.value })}
                  placeholder="e.g., North Zone"
                />
              </div>
              <div>
                <Label htmlFor="region">Region</Label>
                <Input
                  id="region"
                  value={newTerritory.region}
                  onChange={(e) => setNewTerritory({ ...newTerritory, region: e.target.value })}
                  placeholder="e.g., Delhi NCR"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="pincodes">Pincode Ranges (comma separated)</Label>
              <Input
                id="pincodes"
                value={newTerritory.pincode_ranges}
                onChange={(e) => setNewTerritory({ ...newTerritory, pincode_ranges: e.target.value })}
                placeholder="e.g., 110001-110096, 201001-201310"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAddTerritory}>Add Territory</Button>
              <Button variant="outline" onClick={() => setShowAddForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {territories.map((territory) => (
          <Card key={territory.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin size={20} className="text-primary" />
                {territory.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Region</p>
                <p className="font-medium">{territory.region}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pincode Ranges</p>
                <div className="flex flex-wrap gap-1">
                  {territory.pincode_ranges.map((range, index) => (
                    <span key={index} className="text-xs bg-muted px-2 py-1 rounded">
                      {range}
                    </span>
                  ))}
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setSelectedTerritory(territory)}
                className="w-full mt-2"
              >
                View Details
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <TerritoryDetailsModal 
        open={!!selectedTerritory}
        onOpenChange={(open) => !open && setSelectedTerritory(null)}
        territory={selectedTerritory}
      />
    </div>
  );
};

export default TerritoriesManagement;
import { useState } from "react";
import { ArrowLeft, Plus, MapPin, Phone, Store, Camera, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
export const AddRetailer = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [retailerData, setRetailerData] = useState({
    name: "",
    phone: "",
    address: "",
    category: "",
    priority: "",
    notes: "",
    parentType: "",
    parentName: "",
    locationTag: "",
    retailType: "",
    potential: "",
    competitor1: "",
    competitor2: "",
    competitor3: "",
    latitude: "",
    longitude: ""
  });

  const [isSaving, setIsSaving] = useState(false);
  const [beatDialogOpen, setBeatDialogOpen] = useState(false);
  const [existingBeat, setExistingBeat] = useState<string | undefined>();
  const [newBeat, setNewBeat] = useState("");
  const [existingBeats, setExistingBeats] = useState<string[]>([]);

  const categories = ["Category A", "Category B", "Category C"];
  const priorities = ["High", "Medium", "Low"];
  const parentTypes = ["Company", "Super Stockist", "Distributor"];
  const retailTypes = ["Grocery Store", "Supermarket", "Convenience Store", "Provision Store", "General Store"];
  const potentials = ["High", "Medium", "Low"];

  const handleInputChange = (field: string, value: string) => {
    setRetailerData(prev => {
      const updated = { ...prev, [field]: value };
      
      // Auto-update Parent Name when Parent Type is Distributor
      if (field === "parentType" && value === "Distributor") {
        updated.parentName = "Auto-Selected Distributor";
      } else if (field === "parentType" && value !== "Distributor") {
        updated.parentName = "";
      }
      
      return updated;
    });
  };

  const loadExistingBeats = async () => {
    if (!user) return setExistingBeats([]);
    const { data, error } = await supabase
      .from('retailers')
      .select('beat_id')
      .eq('user_id', user.id);
    if (error) {
      setExistingBeats([]);
      return;
    }
    const set = new Set<string>();
    (data || []).forEach((r: any) => r.beat_id && set.add(r.beat_id));
    setExistingBeats(Array.from(set));
  };

  const performInsert = async (beatId: string) => {
    if (!user) {
      toast({ title: 'Not signed in', description: 'Please sign in to continue', variant: 'destructive' });
      return;
    }
    setIsSaving(true);
    const payload: any = {
      user_id: user.id,
      name: retailerData.name,
      phone: retailerData.phone,
      address: retailerData.address,
      category: retailerData.category || null,
      priority: retailerData.priority ? retailerData.priority.toLowerCase() : null,
      beat_id: beatId,
      status: 'active',
      notes: retailerData.notes || null,
      parent_type: retailerData.parentType || null,
      parent_name: retailerData.parentName || null,
      location_tag: retailerData.locationTag || null,
      retail_type: retailerData.retailType || null,
      potential: retailerData.potential ? retailerData.potential.toLowerCase() : null,
      competitors: [retailerData.competitor1, retailerData.competitor2, retailerData.competitor3].filter(Boolean),
    };

    const { data, error } = await supabase.from('retailers').insert(payload).select('id').maybeSingle();
    setIsSaving(false);

    if (error) {
      toast({ title: 'Failed to save', description: error.message, variant: 'destructive' });
      return;
    }

    toast({ title: 'Retailer Added', description: `${retailerData.name} saved successfully.` });
    // Navigate to My Retailers and open the created record for view/edit
    navigate('/my-retailers', { state: { openRetailerId: data?.id } });

  };

  const handleSaveWithBeat = async () => {
    if (!retailerData.name || !retailerData.phone || !retailerData.address) {
      toast({ title: 'Missing Information', description: 'Please fill in all required fields', variant: 'destructive' });
      return;
    }
    await loadExistingBeats();
    setExistingBeat(undefined);
    setNewBeat("");
    setBeatDialogOpen(true);
  };

  const confirmAssignBeat = async () => {
    const chosenBeat = (existingBeat && existingBeat !== '__new__') ? existingBeat : newBeat.trim();
    if (!chosenBeat) {
      toast({ title: 'Choose a beat', description: 'Pick an existing beat or enter a new name.' });
      return;
    }
    await performInsert(chosenBeat);
    setBeatDialogOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!retailerData.name || !retailerData.phone || !retailerData.address) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }
    // Save with default unassigned beat
    await performInsert('unassigned');
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 space-y-4">
        {/* Header */}
        <Card className="shadow-card bg-gradient-primary text-primary-foreground">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => {
                  if (window.history.length > 1) {
                    navigate(-1);
                  } else {
                    navigate('/');
                  }
                }}
                className="text-primary-foreground hover:bg-primary-foreground/20"
              >
                <ArrowLeft size={20} />
              </Button>
              <div>
                <CardTitle className="text-xl font-bold">Add Retailer</CardTitle>
                <p className="text-primary-foreground/80">Add a new retailer to today's plan</p>
              </div>
            </div>
            <Plus size={24} />
          </CardHeader>
        </Card>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Retailer Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Retailer Name *</Label>
                <Input
                  id="name"
                  placeholder="Enter retailer name"
                  value={retailerData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  className="bg-background"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="Enter phone number"
                  value={retailerData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  className="bg-background"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address *</Label>
                <div className="flex gap-2">
                  <Textarea
                    id="address"
                    placeholder="Enter complete address"
                    value={retailerData.address}
                    onChange={(e) => handleInputChange("address", e.target.value)}
                    className="bg-background min-h-[80px] flex-1"
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="icon"
                    onClick={async () => {
                      if (!navigator.geolocation) {
                        toast({ title: "GPS Not Available", description: "Your device doesn't support GPS", variant: "destructive" });
                        return;
                      }
                      
                      toast({ title: "Getting Location", description: "Please wait while we fetch your address..." });
                      
                      try {
                        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                          navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 15000 });
                        });
                        
                        const lat = position.coords.latitude;
                        const lon = position.coords.longitude;
                        
                        // Use reverse geocoding to get proper address
                        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`);
                        
                        if (!response.ok) throw new Error('Geocoding failed');
                        
                        const data = await response.json();
                        
                        // Extract address components
                        const address = data.address || {};
                        const parts = [];
                        
                        if (address.house_number) parts.push(address.house_number);
                        if (address.road) parts.push(address.road);
                        if (address.neighbourhood || address.suburb) parts.push(address.neighbourhood || address.suburb);
                        if (address.city || address.town || address.village) parts.push(address.city || address.town || address.village);
                        if (address.state) parts.push(address.state);
                        if (address.postcode) parts.push(address.postcode);
                        
                        const formattedAddress = parts.length > 0 ? parts.join(', ') : data.display_name || `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
                        
                        handleInputChange("address", formattedAddress);
                        handleInputChange("latitude", lat.toFixed(6));
                        handleInputChange("longitude", lon.toFixed(6));
                        toast({ title: "Location Updated", description: "Address and coordinates automatically filled from GPS" });
                      } catch (error) {
                        console.error('GPS/Geocoding error:', error);
                        toast({ title: "GPS Error", description: "Could not get location. Please enable GPS or check internet connection.", variant: "destructive" });
                      }
                    }}
                    className="mt-auto"
                  >
                    <MapPin size={16} />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Use GPS button to auto-fill location or enter manually</p>
                
                {/* Latitude and Longitude Display */}
                {(retailerData.latitude || retailerData.longitude) && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2 hidden">
                        <Label>Latitude</Label>
                        <Input
                          value={retailerData.latitude}
                          readOnly
                          className="bg-muted cursor-not-allowed"
                          placeholder="GPS Latitude"
                        />
                      </div>
                      <div className="space-y-2 hidden">
                        <Label>Longitude</Label>
                        <Input
                          value={retailerData.longitude}
                          readOnly
                          className="bg-muted cursor-not-allowed"
                          placeholder="GPS Longitude"
                        />
                      </div>
                    </div>
                    
                    {/* Google Maps Style Coordinate Display */}
                    {retailerData.latitude && retailerData.longitude && (
                      <div className="p-3 bg-muted/50 rounded-lg border">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-sm font-medium">GPS Coordinates</Label>
                            <button
                              type="button"
                              onClick={() => {
                                const googleMapsUrl = `https://www.google.com/maps?q=${retailerData.latitude},${retailerData.longitude}`;
                                window.open(googleMapsUrl, '_blank');
                                toast({ title: "Opening Google Maps", description: "Redirecting to Google Maps..." });
                              }}
                              className="text-primary hover:text-primary/80 transition-colors text-sm font-mono mt-1 block"
                              title="Click to open in Google Maps"
                            >
                              {retailerData.latitude}, {retailerData.longitude}
                            </button>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const googleMapsUrl = `https://www.google.com/maps?q=${retailerData.latitude},${retailerData.longitude}`;
                              window.open(googleMapsUrl, '_blank');
                              toast({ title: "Opening Google Maps", description: "Redirecting to Google Maps..." });
                            }}
                            className="text-xs"
                          >
                            <MapPin size={14} className="mr-1" />
                            Open in Maps
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          Click coordinates or button to view location in Google Maps
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={retailerData.category} onValueChange={(value) => handleInputChange("category", value)}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border z-50">
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>{category}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={retailerData.priority} onValueChange={(value) => handleInputChange("priority", value)}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border z-50">
                      {priorities.map((priority) => (
                        <SelectItem key={priority} value={priority}>{priority}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Parent Type</Label>
                  <Select value={retailerData.parentType} onValueChange={(value) => handleInputChange("parentType", value)}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Select parent" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border z-50">
                      {parentTypes.map((type) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Parent Name</Label>
                  <Input
                    placeholder={retailerData.parentType === "Distributor" ? "Auto-updated based on selection" : "Enter parent name"}
                    value={retailerData.parentName}
                    onChange={(e) => handleInputChange("parentName", e.target.value)}
                    className="bg-background"
                    disabled={retailerData.parentType === "Distributor"}
                  />
                  {retailerData.parentType === "Distributor" && (
                    <p className="text-xs text-muted-foreground">Name will auto-update when Distributor is selected</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="locationTag">Location Tag *</Label>
                <div className="flex gap-2">
                  <Input
                    id="locationTag"
                    placeholder="e.g., Near City Hospital, Main Market"
                    value={retailerData.locationTag}
                    onChange={(e) => handleInputChange("locationTag", e.target.value)}
                    className="bg-background"
                  />
                  <Button type="button" variant="outline" size="icon">
                    <Tag size={16} />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">This will be used to verify visit authenticity</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Retail Type</Label>
                  <Select value={retailerData.retailType} onValueChange={(value) => handleInputChange("retailType", value)}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border z-50">
                      {retailTypes.map((type) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Potential</Label>
                  <Select value={retailerData.potential} onValueChange={(value) => handleInputChange("potential", value)}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Select potential" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border z-50">
                      {potentials.map((potential) => (
                        <SelectItem key={potential} value={potential}>{potential}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Top 3 Competitors</Label>
                <div className="space-y-2">
                  <Input
                    placeholder="Competitor 1"
                    value={retailerData.competitor1}
                    onChange={(e) => handleInputChange("competitor1", e.target.value)}
                    className="bg-background"
                  />
                  <Input
                    placeholder="Competitor 2"
                    value={retailerData.competitor2}
                    onChange={(e) => handleInputChange("competitor2", e.target.value)}
                    className="bg-background"
                  />
                  <Input
                    placeholder="Competitor 3"
                    value={retailerData.competitor3}
                    onChange={(e) => handleInputChange("competitor3", e.target.value)}
                    className="bg-background"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Phone Attachment</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Additional phone numbers (comma separated)"
                    className="bg-background"
                  />
                  <Button type="button" variant="outline" size="icon">
                    <Camera size={16} />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">You can also attach photos of business cards</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Input
                  id="notes"
                  placeholder="Any additional notes"
                  value={retailerData.notes}
                  onChange={(e) => handleInputChange("notes", e.target.value)}
                  className="bg-background"
                />
              </div>
            </CardContent>
          </Card>

          {/* Quick Info */}
          <Card className="bg-muted/30">
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3">Quick Info</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Store size={14} className="text-muted-foreground" />
                  <span>Retailer will be added to today's visit plan</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin size={14} className="text-muted-foreground" />
                  <span>Location will be verified before visit</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone size={14} className="text-muted-foreground" />
                  <span>Contact details will be saved for future visits</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-2">
            <Button type="submit" className="flex-1" size="lg" disabled={isSaving}>
              <Plus size={16} className="mr-2" />
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
            <Button type="button" variant="outline" className="flex-1" size="lg" onClick={handleSaveWithBeat} disabled={isSaving}>
              <Tag size={16} className="mr-2" />
              Add to the Beat
            </Button>
          </div>
        </form>
        <Dialog open={beatDialogOpen} onOpenChange={setBeatDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add to Beat</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Choose existing beat</Label>
                <Select value={existingBeat} onValueChange={setExistingBeat}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select a beat" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border z-50">
                    {existingBeats.map((b) => (
                      <SelectItem key={b} value={b}>{b}</SelectItem>
                    ))}
                    <SelectItem value="__new__">Create new…</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(existingBeat === "__new__" || (!existingBeat && newBeat)) && (
                <div className="space-y-2">
                  <Label>New beat name</Label>
                  <Input placeholder="Enter beat name" value={newBeat} onChange={(e) => setNewBeat(e.target.value)} className="bg-background" />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="secondary" onClick={() => setBeatDialogOpen(false)}>Cancel</Button>
              <Button onClick={confirmAssignBeat} disabled={isSaving}>Assign & Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};
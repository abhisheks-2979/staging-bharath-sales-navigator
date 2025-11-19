import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { X, Camera, ScanLine, Store, ChevronsUpDown, Check, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface AddRetailerInlineToBeatProps {
  open: boolean;
  onClose: () => void;
  beatName: string;
  onRetailerAdded: (retailerId: string, retailerName: string) => void;
}

export const AddRetailerInlineToBeat = ({ open, onClose, beatName, onRetailerAdded }: AddRetailerInlineToBeatProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [capturedPhotoPreview, setCapturedPhotoPreview] = useState<string | null>(null);
  const [isScanningBoard, setIsScanningBoard] = useState(false);
  const [distributors, setDistributors] = useState<{id: string, name: string}[]>([]);
  const [territories, setTerritories] = useState<{id: string, name: string, region: string}[]>([]);
  const [selectedTerritoryId, setSelectedTerritoryId] = useState<string | null>(null);
  const [territoryComboOpen, setTerritoryComboOpen] = useState(false);

  const [retailerData, setRetailerData] = useState({
    name: "",
    gstNumber: "",
    phone: "",
    address: "",
    category: "",
    notes: "",
    parentType: "Distributor",
    parentName: "",
    selectedDistributors: [] as string[],
    locationTag: "",
    retailType: "",
    potential: "",
    competitor1: "",
    competitor2: "",
    competitor3: "",
    latitude: "",
    longitude: "",
    photo_url: ""
  });

  const categories = ["Category A", "Category B", "Category C"];
  const parentTypes = ["Company", "Super Stockist", "Distributor"];
  const retailTypes = ["Grocery Store", "Supermarket", "Convenience Store", "Provision Store", "General Store"];
  const potentials = ["High", "Medium", "Low"];

  useEffect(() => {
    if (user && open) {
      loadDistributors();
      loadTerritories();
    }
  }, [user, open]);

  const loadDistributors = async () => {
    if (!user) return;
    const { data, error } = await supabase.rpc('get_public_vendors');
    if (error) {
      console.error('Failed to load distributors:', error);
      setDistributors([]);
    } else {
      setDistributors(data || []);
    }
  };

  const loadTerritories = async () => {
    try {
      const { data, error } = await supabase
        .from('territories')
        .select('id, name, region')
        .order('name');
      if (error) throw error;
      setTerritories(data || []);
    } catch (error: any) {
      console.error('Error loading territories:', error);
    }
  };

  const handleInputChange = (field: string, value: string | string[]) => {
    setRetailerData(prev => ({ ...prev, [field]: value }));
  };

  const handleDistributorToggle = (distributorId: string) => {
    setRetailerData(prev => {
      const isSelected = prev.selectedDistributors.includes(distributorId);
      if (isSelected) {
        return {
          ...prev,
          selectedDistributors: prev.selectedDistributors.filter(id => id !== distributorId),
          parentName: prev.selectedDistributors.length === 1 ? "" : prev.parentName
        };
      } else {
        const newSelectedDistributors = [...prev.selectedDistributors, distributorId];
        const distributorNames = newSelectedDistributors.map(id => 
          distributors.find(d => d.id === id)?.name || ""
        ).filter(Boolean);
        return {
          ...prev,
          selectedDistributors: newSelectedDistributors,
          parentName: distributorNames.join(", ")
        };
      }
    });
  };

  const handlePhotoCapture = async () => {
    if (!user) {
      toast({ title: 'Authentication Error', description: 'Please sign in to upload photos', variant: 'destructive' });
      return;
    }

    try {
      setIsUploadingPhoto(true);
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'environment';
      
      input.onchange = async (event) => {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (!file) return;

        try {
          const reader = new FileReader();
          reader.onload = (e) => {
            setCapturedPhotoPreview(e.target?.result as string);
          };
          reader.readAsDataURL(file);

          const fileName = `${user.id}/${Date.now()}_retailer_photo.jpg`;
          const { data, error } = await supabase.storage
            .from('retailer-photos')
            .upload(fileName, file, {
              cacheControl: '3600',
              upsert: false
            });

          if (error) throw error;

          const { data: urlData } = supabase.storage
            .from('retailer-photos')
            .getPublicUrl(fileName);

          handleInputChange('photo_url', urlData.publicUrl);
          
          toast({ 
            title: 'Photo Captured', 
            description: 'Retailer photo uploaded successfully!' 
          });
        } catch (error) {
          console.error('Photo upload error:', error);
          toast({ 
            title: 'Upload Failed', 
            description: 'Could not upload photo. Please try again.', 
            variant: 'destructive' 
          });
        } finally {
          setIsUploadingPhoto(false);
        }
      };

      input.click();
    } catch (error) {
      console.error('Camera access error:', error);
      toast({ 
        title: 'Camera Error', 
        description: 'Could not access camera. Please check permissions.', 
        variant: 'destructive' 
      });
      setIsUploadingPhoto(false);
    }
  };

  const handleScanBoard = async () => {
    if (!user) {
      toast({ title: 'Authentication Error', description: 'Please sign in to scan boards', variant: 'destructive' });
      return;
    }

    try {
      setIsScanningBoard(true);
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'environment';
      
      input.onchange = async (event) => {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (!file) {
          setIsScanningBoard(false);
          return;
        }

        try {
          toast({ 
            title: 'Scanning...', 
            description: 'Reading board information',
            duration: 15000
          });

          const reader = new FileReader();
          reader.onload = async (e) => {
            const base64Image = e.target?.result as string;

            try {
              const { data, error } = await supabase.functions.invoke('scan-board', {
                body: { imageBase64: base64Image }
              });

              if (error) {
                console.error('Scan error:', error);
                setIsScanningBoard(false);
                return;
              }

              if (data?.error) {
                console.error('Scan data error:', data.error);
                setIsScanningBoard(false);
                return;
              }

              // Auto-fill form fields with extracted data
              let fieldsFound = [];
              if (data?.name && data.name.trim()) {
                handleInputChange('name', data.name);
                fieldsFound.push('name');
              }
              if (data?.address && data.address.trim()) {
                handleInputChange('address', data.address);
                fieldsFound.push('address');
              }
              if (data?.phone && data.phone.trim()) {
                handleInputChange('phone', data.phone);
                fieldsFound.push('phone');
              }

              if (fieldsFound.length > 0) {
                toast({ 
                  title: 'Success!', 
                  description: `Found ${fieldsFound.join(', ')} from the board`,
                  duration: 3000
                });
              } else {
                toast({ 
                  title: 'Scan Complete', 
                  description: 'No clear information found. Please enter details manually.',
                  duration: 3000
                });
              }
            } catch (scanError) {
              console.error('Scan processing error:', scanError);
            } finally {
              setIsScanningBoard(false);
            }
          };
          
          reader.readAsDataURL(file);
        } catch (error) {
          console.error('File read error:', error);
          setIsScanningBoard(false);
        }
      };

      input.click();
    } catch (error) {
      console.error('Camera access error:', error);
      setIsScanningBoard(false);
    }
  };

  const handleSave = async () => {
    if (!retailerData.name || !retailerData.phone || !retailerData.address) {
      toast({ title: 'Missing Information', description: 'Please fill in all required fields', variant: 'destructive' });
      return;
    }

    if (!user) {
      toast({ title: 'Not signed in', description: 'Please sign in to continue', variant: 'destructive' });
      return;
    }

    setIsSaving(true);

    const payload: any = {
      user_id: user.id,
      name: retailerData.name,
      gst_number: retailerData.gstNumber || null,
      phone: retailerData.phone,
      address: retailerData.address,
      category: retailerData.category || null,
      beat_id: 'temporary', // Will be set by CreateBeat
      beat_name: beatName,
      territory_id: selectedTerritoryId || null,
      status: 'active',
      notes: retailerData.notes || null,
      parent_type: retailerData.parentType || null,
      parent_name: retailerData.parentName || null,
      location_tag: retailerData.locationTag || null,
      retail_type: retailerData.retailType || null,
      potential: retailerData.potential ? retailerData.potential.toLowerCase() : null,
      competitors: [retailerData.competitor1, retailerData.competitor2, retailerData.competitor3].filter(Boolean),
      photo_url: retailerData.photo_url || null,
      latitude: retailerData.latitude ? parseFloat(retailerData.latitude) : null,
      longitude: retailerData.longitude ? parseFloat(retailerData.longitude) : null,
    };

    const { data, error } = await supabase.from('retailers').insert(payload).select('id, name').maybeSingle();
    setIsSaving(false);

    if (error) {
      toast({ title: 'Failed to save', description: error.message, variant: 'destructive' });
      return;
    }

    toast({ title: 'Retailer Added', description: `${retailerData.name} will be added to ${beatName}` });
    
    // Call parent callback with the new retailer
    onRetailerAdded(data.id, data.name);
    
    // Reset form and close
    setRetailerData({
      name: "",
      gstNumber: "",
      phone: "",
      address: "",
      category: "",
      notes: "",
      parentType: "Distributor",
      parentName: "",
      selectedDistributors: [],
      locationTag: "",
      retailType: "",
      potential: "",
      competitor1: "",
      competitor2: "",
      competitor3: "",
      latitude: "",
      longitude: "",
      photo_url: ""
    });
    setCapturedPhotoPreview(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            Add New Retailer to {beatName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Scan Board Section */}
          <div className="space-y-2 p-3 bg-muted/30 rounded-lg border border-dashed">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-semibold">Quick Scan</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Scan shop board to auto-fill details
                </p>
              </div>
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={handleScanBoard}
                disabled={isScanningBoard}
                className="flex items-center gap-2"
              >
                <ScanLine size={16} />
                {isScanningBoard ? 'Scanning...' : 'Scan Board'}
              </Button>
            </div>
          </div>

          {/* Basic Information */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Retailer Name *</Label>
              <Input
                id="name"
                placeholder="Enter retailer name"
                value={retailerData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone *</Label>
                <Input
                  id="phone"
                  placeholder="Enter phone number"
                  value={retailerData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gst">GST Number</Label>
                <Input
                  id="gst"
                  placeholder="Enter GST number"
                  value={retailerData.gstNumber}
                  onChange={(e) => handleInputChange("gstNumber", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address *</Label>
              <div className="flex gap-2">
                <Textarea
                  id="address"
                  placeholder="Enter complete address"
                  value={retailerData.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  rows={2}
                  className="flex-1"
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  size="icon"
                  className="shrink-0 h-[72px]"
                  onClick={async () => {
                    if (!navigator.geolocation) {
                      toast({ 
                        title: "GPS Not Available", 
                        description: "Your device doesn't support location services", 
                        variant: "destructive" 
                      });
                      return;
                    }
                    
                    try {
                      const permissionStatus = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
                      if (permissionStatus.state === 'denied') {
                        toast({ 
                          title: "Location Permission Denied", 
                          description: "Please enable location access in your device settings",
                          variant: "destructive",
                          duration: 5000
                        });
                        return;
                      }
                    } catch (e) {
                      console.log('Permission API not supported, will try direct geolocation');
                    }
                    
                    toast({ 
                      title: "Accessing Location", 
                      description: "Please allow location access...",
                      duration: 4000
                    });
                    
                    try {
                      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                        let best: GeolocationPosition | null = null;
                        const startedAt = Date.now();
                        const targetAccuracy = 30;
                        const maxWait = 45000;
                        
                        const watchId = navigator.geolocation.watchPosition(
                          (pos) => {
                            if (!best || pos.coords.accuracy < best.coords.accuracy) {
                              best = pos;
                            }
                            
                            const ageMs = Date.now() - pos.timestamp;
                            const goodEnough = pos.coords.accuracy <= targetAccuracy && ageMs < 30000;
                            const timedOut = Date.now() - startedAt > maxWait;
                            
                            if (goodEnough || timedOut) {
                              navigator.geolocation.clearWatch(watchId);
                              resolve(best || pos);
                            }
                          },
                          (error) => {
                            navigator.geolocation.clearWatch(watchId);
                            reject(error);
                          },
                          { 
                            enableHighAccuracy: true,
                            timeout: maxWait,
                            maximumAge: 0
                          }
                        );
                        
                        setTimeout(() => {
                          if (best) {
                            navigator.geolocation.clearWatch(watchId);
                            resolve(best);
                          }
                        }, maxWait + 1000);
                      });
                      
                      const lat = Number(position.coords.latitude.toFixed(7));
                      const lon = Number(position.coords.longitude.toFixed(7));
                      const accuracy = position.coords.accuracy;
                      
                      handleInputChange("latitude", lat.toString());
                      handleInputChange("longitude", lon.toString());
                      
                      if (accuracy > 100) {
                        toast({ 
                          title: "Low GPS Accuracy", 
                          description: `Current accuracy: ${accuracy.toFixed(0)}m. Try moving to an open area.`,
                          variant: "default",
                          duration: 4000
                        });
                      } else {
                        toast({ 
                          title: "GPS Location Locked", 
                          description: `Accuracy: ${accuracy.toFixed(0)}m. Fetching address...`,
                          duration: 2000
                        });
                      }
                      
                      // Fetch address using Nominatim
                      try {
                        const response = await fetch(
                          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
                          { headers: { 'User-Agent': 'FieldSalesNavigator/1.0' } }
                        );
                        
                        if (response.ok) {
                          const data = await response.json();
                          if (data.display_name) {
                            handleInputChange('address', data.display_name);
                            toast({ 
                              title: 'Address Found', 
                              description: 'Location address retrieved successfully',
                              duration: 2000
                            });
                          }
                        }
                      } catch (error) {
                        console.error('Address fetch error:', error);
                        toast({ 
                          title: 'GPS Location Captured', 
                          description: `Coordinates saved: ${lat}, ${lon}`,
                          duration: 2000
                        });
                      }
                    } catch (error) {
                      console.error('Geolocation error:', error);
                      toast({ 
                        title: 'Location Error', 
                        description: 'Could not get location. Please enter address manually.',
                        variant: 'destructive'
                      });
                    }
                  }}
                >
                  <MapPin className="h-4 w-4" />
                </Button>
              </div>
              {(retailerData.latitude && retailerData.longitude) && (
                <p className="text-xs text-muted-foreground">
                  📍 GPS: {retailerData.latitude}, {retailerData.longitude}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={retailerData.category} onValueChange={(value) => handleInputChange("category", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Retail Type</Label>
                <Select value={retailerData.retailType} onValueChange={(value) => handleInputChange("retailType", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {retailTypes.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Potential</Label>
                <Select value={retailerData.potential} onValueChange={(value) => handleInputChange("potential", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select potential" />
                  </SelectTrigger>
                  <SelectContent>
                    {potentials.map((pot) => (
                      <SelectItem key={pot} value={pot}>{pot}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Territory</Label>
                <Popover open={territoryComboOpen} onOpenChange={setTerritoryComboOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={territoryComboOpen}
                      className="w-full justify-between"
                    >
                      {selectedTerritoryId
                        ? territories.find((t) => t.id === selectedTerritoryId)?.name
                        : "Select territory"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Search territory..." />
                      <CommandEmpty>No territory found.</CommandEmpty>
                      <CommandList>
                        <CommandGroup>
                          {territories.map((territory) => (
                            <CommandItem
                              key={territory.id}
                              value={territory.name}
                              onSelect={() => {
                                setSelectedTerritoryId(territory.id);
                                setTerritoryComboOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedTerritoryId === territory.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {territory.name} ({territory.region})
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Photo Capture */}
            <div className="space-y-2">
              <Label>Retailer Photo</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handlePhotoCapture}
                  disabled={isUploadingPhoto}
                  className="flex items-center gap-2"
                >
                  <Camera size={16} />
                  {isUploadingPhoto ? 'Uploading...' : 'Capture Photo'}
                </Button>
                {capturedPhotoPreview && (
                  <img src={capturedPhotoPreview} alt="Preview" className="h-16 w-16 rounded object-cover" />
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Any additional notes..."
                value={retailerData.notes}
                onChange={(e) => handleInputChange("notes", e.target.value)}
                rows={2}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Add Retailer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

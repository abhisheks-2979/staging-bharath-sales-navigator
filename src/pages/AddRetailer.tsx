import { useState, useEffect } from "react";
import { ArrowLeft, Plus, MapPin, Phone, Store, Camera, Tag, X, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
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
    gstNumber: "",
    phone: "",
    address: "",
    category: "",
    notes: "",
    parentType: "Distributor", // Default to Distributor
    parentName: "",
    selectedDistributors: [] as string[], // Array for multiple distributors
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

  const [isSaving, setIsSaving] = useState(false);
  const [beatDialogOpen, setBeatDialogOpen] = useState(false);
  const [existingBeat, setExistingBeat] = useState<string | undefined>();
  const [newBeat, setNewBeat] = useState("");
  const [existingBeats, setExistingBeats] = useState<string[]>([]);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [capturedPhotoPreview, setCapturedPhotoPreview] = useState<string | null>(null);
  const [distributors, setDistributors] = useState<{id: string, name: string}[]>([]);
  const [selectedBeat, setSelectedBeat] = useState<string>('');
  const [beats, setBeats] = useState<{beat_id: string, beat_name: string}[]>([]);
  const [isScanningBoard, setIsScanningBoard] = useState(false);

  const categories = ["Category A", "Category B", "Category C"];
  const parentTypes = ["Company", "Super Stockist", "Distributor"];
  const retailTypes = ["Grocery Store", "Supermarket", "Convenience Store", "Provision Store", "General Store"];
  const potentials = ["High", "Medium", "Low"];

  // Load distributors from vendors table (Distributor Management)
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

  // Load beats from the beats table
  const loadBeats = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('beats')
      .select('beat_id, beat_name')
      .eq('created_by', user.id)
      .eq('is_active', true)
      .order('beat_name');
    
    if (error) {
      console.error('Failed to load beats:', error);
      setBeats([]);
    } else {
      setBeats(data || []);
    }
  };

  useEffect(() => {
    if (user) {
      loadDistributors();
      loadBeats();
    }
  }, [user]);

  const handleInputChange = (field: string, value: string | string[]) => {
    setRetailerData(prev => ({ ...prev, [field]: value }));
  };

  const handleDistributorToggle = (distributorId: string, distributorName: string) => {
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
      
      // Create file input for camera
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'environment'; // Use rear camera if available
      
      input.onchange = async (event) => {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (!file) return;

        try {
          // Show preview
          const reader = new FileReader();
          reader.onload = (e) => {
            setCapturedPhotoPreview(e.target?.result as string);
          };
          reader.readAsDataURL(file);

          // Upload to Supabase Storage
          const fileName = `${user.id}/${Date.now()}_retailer_photo.jpg`;
          const { data, error } = await supabase.storage
            .from('retailer-photos')
            .upload(fileName, file, {
              cacheControl: '3600',
              upsert: false
            });

          if (error) throw error;

          // Get public URL
          const { data: urlData } = supabase.storage
            .from('retailer-photos')
            .getPublicUrl(fileName);

          // Update retailer data with photo URL
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
      
      // Create file input for camera
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'environment'; // Use rear camera
      
      input.onchange = async (event) => {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (!file) {
          setIsScanningBoard(false);
          return;
        }

        try {
          toast({ 
            title: 'Scanning Board', 
            description: 'Extracting information from image...',
            duration: 3000
          });

          // Convert image to base64
          const reader = new FileReader();
          reader.onload = async (e) => {
            const base64Image = e.target?.result as string;

            try {
              // Call edge function to extract data
              const { data, error } = await supabase.functions.invoke('scan-board', {
                body: { imageBase64: base64Image }
              });

              if (error) {
                throw error;
              }

              if (data.error) {
                throw new Error(data.error);
              }

              // Auto-fill form fields with extracted data
              if (data.name) {
                handleInputChange('name', data.name);
              }
              if (data.address) {
                handleInputChange('address', data.address);
              }
              if (data.phone) {
                handleInputChange('phone', data.phone);
              }

              const fieldsFound = [];
              if (data.name) fieldsFound.push('name');
              if (data.address) fieldsFound.push('address');
              if (data.phone) fieldsFound.push('phone');

              if (fieldsFound.length > 0) {
                toast({ 
                  title: 'Board Scanned Successfully!', 
                  description: `Auto-filled: ${fieldsFound.join(', ')}`,
                  duration: 5000
                });
              } else {
                toast({ 
                  title: 'No Information Found', 
                  description: 'Could not extract name, address, or phone from the image. Please try a clearer photo.',
                  variant: 'destructive',
                  duration: 5000
                });
              }
            } catch (scanError) {
              console.error('Scan error:', scanError);
              toast({ 
                title: 'Scan Failed', 
                description: scanError instanceof Error ? scanError.message : 'Could not extract information from image', 
                variant: 'destructive',
                duration: 5000
              });
            } finally {
              setIsScanningBoard(false);
            }
          };
          
          reader.readAsDataURL(file);
        } catch (error) {
          console.error('File read error:', error);
          toast({ 
            title: 'Error', 
            description: 'Could not read image file', 
            variant: 'destructive' 
          });
          setIsScanningBoard(false);
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
      setIsScanningBoard(false);
    }
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
      gst_number: retailerData.gstNumber || null,
      phone: retailerData.phone,
      address: retailerData.address,
      category: retailerData.category || null,
      beat_id: beatId,
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
    // Save with selected beat or default to unassigned
    await performInsert(selectedBeat || 'unassigned');
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
                onClick={() => navigate('/my-retailers')}
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
              {/* Scan Board Section */}
              <div className="space-y-2 p-3 bg-muted/30 rounded-lg border border-dashed">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-semibold">Quick Scan</Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Take a photo of the shop board to auto-fill details
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
                <Label htmlFor="gstNumber">GST Number</Label>
                <Input
                  id="gstNumber"
                  placeholder="Enter GST number"
                  value={retailerData.gstNumber}
                  onChange={(e) => handleInputChange("gstNumber", e.target.value)}
                  className="bg-background"
                />
              </div>

              {/* Photo Attachment Section */}
              <div className="space-y-2">
                <Label>Retailer Photo</Label>
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handlePhotoCapture}
                    disabled={isUploadingPhoto}
                    className="flex items-center gap-2"
                  >
                    <Camera size={16} />
                    {isUploadingPhoto ? 'Uploading...' : 'Take Photo'}
                  </Button>
                  
                  {(capturedPhotoPreview || retailerData.photo_url) && (
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-12 border rounded-lg overflow-hidden bg-muted">
                        <img
                          src={capturedPhotoPreview || retailerData.photo_url}
                          alt="Retailer photo"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <span className="text-sm text-muted-foreground">Photo captured</span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Take a photo of the retailer store front for reference</p>
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
                        toast({ 
                          title: "GPS Not Available", 
                          description: "Your device doesn't support location services", 
                          variant: "destructive" 
                        });
                        return;
                      }
                      
                      // Check if location permission is granted
                      try {
                        const permissionStatus = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
                        
                        if (permissionStatus.state === 'denied') {
                          toast({ 
                            title: "Location Permission Denied", 
                            description: "Please enable location access in your device settings and reload the page",
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
                        description: "Please enable GPS and allow location access...",
                        duration: 4000
                      });
                      
                      try {
                        // Request high-accuracy location with iterative refinement
                        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                          let best: GeolocationPosition | null = null;
                          const startedAt = Date.now();
                          const targetAccuracy = 30; // meters
                          const maxWait = 45000; // ms
                          
                          const watchId = navigator.geolocation.watchPosition(
                            (pos) => {
                              // Keep the most accurate reading so far
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
                              console.error('Geolocation error:', error);
                              reject(error);
                            },
                            { 
                              enableHighAccuracy: true, // Use GPS, not network location
                              timeout: maxWait, // Longer timeout for GPS lock
                              maximumAge: 0 // Always get fresh location
                            }
                          );
                          
                          // Absolute safety timeout
                          setTimeout(() => {
                            if (best) {
                              navigator.geolocation.clearWatch(watchId);
                              resolve(best);
                            }
                          }, maxWait + 1000);
                        });
                        
                        // Get precise coordinates with 7 decimal places (~1 cm accuracy)
                        const lat = Number(position.coords.latitude.toFixed(7));
                        const lon = Number(position.coords.longitude.toFixed(7));
                        const accuracy = position.coords.accuracy;
                        
                        console.log('GPS Location captured:', { 
                          latitude: lat, 
                          longitude: lon, 
                          accuracy: `${accuracy.toFixed(1)}m`,
                          timestamp: new Date(position.timestamp).toISOString()
                        });
                        
                        // Update coordinates immediately
                        handleInputChange("latitude", lat.toString());
                        handleInputChange("longitude", lon.toString());
                        
                        if (accuracy > 100) {
                          toast({ 
                            title: "Low GPS Accuracy", 
                            description: `Current accuracy: ${accuracy.toFixed(0)}m. Try moving to an open area for better signal.`,
                            variant: "default",
                            duration: 4000
                          });
                        } else {
                          toast({ 
                            title: "GPS Location Locked", 
                            description: `High accuracy: ${accuracy.toFixed(0)}m. Fetching address from Google Maps...`,
                            duration: 2000
                          });
                        }
                        
                        // Use Google Maps Geocoding/Places for more precise POI-first address
                        try {
                          const googleApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

                          // Helper to compute distance in meters
                          const haversine = (lat1: number, lon1: number, lat2: number, lon2: number) => {
                            const toRad = (v: number) => (v * Math.PI) / 180;
                            const R = 6371000; // meters
                            const dLat = toRad(lat2 - lat1);
                            const dLon = toRad(lon2 - lon1);
                            const a =
                              Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
                                Math.sin(dLon / 2) * Math.sin(dLon / 2);
                            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                            return R * c;
                          };

                          if (googleApiKey && googleApiKey !== 'your_google_maps_api_key_here') {
                            // 1) Reverse geocode prioritizing POIs/premise/street address
                            const geocodeUrl =
                              `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}` +
                              `&language=en&key=${googleApiKey}` +
                              `&result_type=street_address|premise|point_of_interest|establishment|shopping_mall` +
                              `&location_type=ROOFTOP|GEOMETRIC_CENTER`;

                            // 2) Nearby places ordered by distance (to snap to closest POI like malls/stores)
                            const nearbyUrl =
                              `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lon}` +
                              `&rankby=distance&type=establishment&key=${googleApiKey}`;

                            const [geoRes, nearbyRes] = await Promise.all([
                              fetch(geocodeUrl),
                              fetch(nearbyUrl)
                            ]);

                            let bestGeocode: any | null = null;
                            if (geoRes.ok) {
                              const geoData = await geoRes.json();
                              if (geoData.status === 'OK' && Array.isArray(geoData.results)) {
                                const priority = [
                                  'shopping_mall',
                                  'premise',
                                  'establishment',
                                  'point_of_interest',
                                  'street_address',
                                  'route'
                                ];
                                const score = (types: string[] = []) => {
                                  for (let i = 0; i < priority.length; i++) {
                                    if (types.includes(priority[i])) return i;
                                  }
                                  return 999;
                                };
                                bestGeocode = geoData.results
                                  .slice()
                                  .sort((a: any, b: any) => score(a.types) - score(b.types))[0] || null;
                              }
                            }

                            let bestPlace: any | null = null;
                            if (nearbyRes.ok) {
                              const nearbyData = await nearbyRes.json();
                              if ((nearbyData.status === 'OK' || nearbyData.status === 'ZERO_RESULTS') && Array.isArray(nearbyData.results)) {
                                const desiredPlaceTypes = new Set([
                                  'shopping_mall',
                                  'supermarket',
                                  'department_store',
                                  'grocery_or_supermarket',
                                  'store',
                                  'point_of_interest',
                                  'establishment'
                                ]);
                                // Prefer closest place matching desired types and within ~300m
                                for (const p of nearbyData.results) {
                                  if (!Array.isArray(p.types)) continue;
                                  const hasDesired = p.types.some((t: string) => desiredPlaceTypes.has(t));
                                  if (!hasDesired) continue;
                                  const plat = p.geometry?.location?.lat;
                                  const plon = p.geometry?.location?.lng;
                                  if (typeof plat === 'number' && typeof plon === 'number') {
                                    const d = haversine(lat, lon, plat, plon);
                                    if (d <= 350) { // within 350m of user
                                      bestPlace = p;
                                      break; // first match is the closest due to rankby=distance
                                    }
                                  }
                                }
                                // If nothing within 350m, still take the very first result as the nearest POI fallback
                                if (!bestPlace && nearbyData.results[0]) bestPlace = nearbyData.results[0];
                              }
                            }

                            // If we have a close POI (e.g., Bharath Mall), use its official name and address
                            if (bestPlace?.place_id) {
                              try {
                                const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${bestPlace.place_id}&fields=name,formatted_address,geometry,types&key=${googleApiKey}`;
                                const detRes = await fetch(detailsUrl);
                                if (detRes.ok) {
                                  const detData = await detRes.json();
                                  if (detData.status === 'OK' && detData.result) {
                                    const name = detData.result.name;
                                    const addr = detData.result.formatted_address || bestGeocode?.formatted_address || bestPlace.vicinity;
                                    const finalAddr = name && addr && !addr.startsWith(name) ? `${name}, ${addr}` : (addr || name);
                                    if (finalAddr) {
                                      handleInputChange('address', finalAddr);
                                      toast({ title: 'Address Found', description: `📍 ${name || 'Nearby place'} selected`, duration: 2500 });
                                      return;
                                    }
                                  }
                                }
                              } catch {}
                              // Fallback to place vicinity/name if details failed
                              const fallbackAddr = (bestPlace.name ? `${bestPlace.name}, ` : '') + (bestPlace.vicinity || bestGeocode?.formatted_address || `${lat}, ${lon}`);
                              handleInputChange('address', fallbackAddr);
                              toast({ title: 'Address Found', description: 'Nearest place selected', duration: 2500 });
                              return;
                            }

                            // Otherwise, use the best geocode result (more precise than generic area)
                            if (bestGeocode?.formatted_address) {
                              handleInputChange('address', bestGeocode.formatted_address);
                              toast({ title: 'Address Found', description: 'Location fetched from Google Maps', duration: 2000 });
                              return;
                            }
                          }

                          // Fallback to OpenStreetMap Nominatim
                          const response = await fetch(
                            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
                            { headers: { 'User-Agent': 'FieldSalesNavigator/1.0' } }
                          );
                          if (!response.ok) throw new Error('Geocoding service unavailable');
                          const data = await response.json();
                          const address = data.address || {};
                          const parts = [] as string[];
                          if (address.house_number) parts.push(address.house_number);
                          if (address.road || address.street) parts.push(address.road || address.street);
                          if (address.neighbourhood || address.suburb) parts.push(address.neighbourhood || address.suburb);
                          if (address.city || address.town || address.village) parts.push(address.city || address.town || address.village);
                          if (address.state_district) parts.push(address.state_district);
                          if (address.state) parts.push(address.state);
                          if (address.postcode) parts.push(address.postcode);
                          const formattedAddress = parts.length > 0 ? parts.join(', ') : data.display_name || `${lat}, ${lon}`;
                          handleInputChange('address', formattedAddress);
                          toast({ title: '✓ Address Found', description: 'Location fetched successfully', duration: 2000 });
                        } catch (geocodeError) {
                          console.error('Geocoding error:', geocodeError);
                          toast({ title: 'Address Not Found', description: 'Coordinates saved. Please enter address manually.', variant: 'default', duration: 3000 });
                        }
                        
                      } catch (error: any) {
                        console.error('GPS/Geocoding error:', error);
                        
                        // Provide specific error messages
                        if (error.code === 1) {
                          toast({ 
                            title: "Location Permission Denied", 
                            description: "Please enable location access in your device settings: Settings → Privacy → Location Services",
                            variant: "destructive",
                            duration: 6000
                          });
                        } else if (error.code === 2) {
                          toast({ 
                            title: "Location Unavailable", 
                            description: "GPS signal not available. Please ensure you're outdoors or near a window and try again.",
                            variant: "destructive",
                            duration: 5000
                          });
                        } else if (error.code === 3) {
                          toast({ 
                            title: "Location Timeout", 
                            description: "GPS took too long to respond. Please try again in a few moments.",
                            variant: "destructive",
                            duration: 5000
                          });
                        } else {
                          toast({ 
                            title: "GPS Error", 
                            description: "Could not get accurate location. Please check your GPS settings and internet connection.",
                            variant: "destructive",
                            duration: 5000
                          });
                        }
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
                  <Label>Select Distributor</Label>
                  {retailerData.parentType === "Distributor" ? (
                    <Select 
                      value={retailerData.selectedDistributors[0] || ""} 
                      onValueChange={(value) => {
                        const distributor = distributors.find(d => d.id === value);
                        handleInputChange("selectedDistributors", [value]);
                        handleInputChange("parentName", distributor?.name || "");
                      }}
                    >
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="Select distributor" />
                      </SelectTrigger>
                      <SelectContent className="bg-background border z-50">
                        {distributors.length > 0 ? (
                          distributors.map((distributor) => (
                            <SelectItem key={distributor.id} value={distributor.id}>
                              {distributor.name}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="none" disabled>No distributors available</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      placeholder="Enter parent name"
                      value={retailerData.parentName}
                      onChange={(e) => handleInputChange("parentName", e.target.value)}
                      className="bg-background"
                    />
                  )}
                </div>
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
                <Label htmlFor="beat">Assign to Beat *</Label>
                <Select value={selectedBeat} onValueChange={(value) => setSelectedBeat(value)}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select a beat" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border z-50">
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {beats.length > 0 ? (
                      beats.map((beat) => (
                        <SelectItem key={beat.beat_id} value={beat.beat_id}>
                          {beat.beat_name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>No beats available</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Select which beat this retailer belongs to</p>
              </div>

              <div className="space-y-2 hidden">
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
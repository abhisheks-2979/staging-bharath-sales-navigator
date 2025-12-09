import React, { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarIcon, MapPin, User } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { JourneyMap } from '@/components/JourneyMap';
import { CurrentLocationMap } from '@/components/CurrentLocationMap';
import { toast } from 'sonner';

interface TeamMember {
  id: string;
  full_name: string;
}

interface GPSData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: Date;
}

interface RetailerLocation {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  visitId: string;
  checkInTime: string | null;
  status: string;
}

export default function GPSTrack() {
  const { user, userRole } = useAuth();
  const [date, setDate] = useState<Date>(new Date());
  const [selectedMember, setSelectedMember] = useState<string>('');
  const [currentLocationUser, setCurrentLocationUser] = useState<string>('');
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [gpsData, setGpsData] = useState<GPSData[]>([]);
  const [retailers, setRetailers] = useState<RetailerLocation[]>([]);
  const [loading, setLoading] = useState(false);
  
  const isAdmin = userRole === 'admin';

  useEffect(() => {
    if (isAdmin) {
      loadTeamMembers();
    } else if (user?.id) {
      // Non-admin users only see their own location
      setCurrentLocationUser(user.id);
      setSelectedMember(user.id);
    }
  }, [isAdmin, user?.id]);

  useEffect(() => {
    if (selectedMember) {
      loadGPSData();
      loadRetailerLocations();
    }
  }, [selectedMember, date]);

  // Real-time subscription for visit updates
  useEffect(() => {
    if (!selectedMember) return;

    const dateStr = date.toISOString().split('T')[0];
    
    const channel = supabase
      .channel('visit-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'visits',
          filter: `user_id=eq.${selectedMember}`
        },
        (payload) => {
          console.log('Visit update received:', payload);
          loadRetailerLocations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedMember, date]);

  const loadTeamMembers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name')
      .order('full_name');

    if (error) {
      console.error('Error loading team members:', error);
      toast.error('Failed to load team members');
      return;
    }

    if (data) {
      setTeamMembers(data as TeamMember[]);
      // Auto-select current user if available
      if (user?.id) {
        setSelectedMember(user.id);
        setCurrentLocationUser(user.id);
      }
    }
  };

  const loadGPSData = async () => {
    if (!selectedMember) return;

    setLoading(true);
    const dateStr = date.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('gps_tracking')
      .select('*')
      .eq('user_id', selectedMember)
      .eq('date', dateStr)
      .order('timestamp', { ascending: true });

    if (error) {
      console.error('Error loading GPS data:', error);
      toast.error('Failed to load tracking data');
      setLoading(false);
      return;
    }

    if (data) {
      setGpsData(
        data.map((d) => ({
          latitude: parseFloat(d.latitude as unknown as string),
          longitude: parseFloat(d.longitude as unknown as string),
          accuracy: d.accuracy ? parseFloat(d.accuracy as unknown as string) : 0,
          timestamp: new Date(d.timestamp),
        }))
      );
    }

    setLoading(false);
  };

  const loadRetailerLocations = async () => {
    if (!selectedMember) return;

    const dateStr = date.toISOString().split('T')[0];
    console.log('Loading retailer locations for date:', dateStr, 'user:', selectedMember);

    const { data: visitsData, error: visitsError } = await supabase
      .from('visits')
      .select('id, check_in_time, check_out_time, status, retailer_id, check_in_location, check_in_address')
      .eq('user_id', selectedMember)
      .eq('planned_date', dateStr)
      .not('retailer_id', 'is', null)
      .order('check_in_time', { ascending: true });

    if (visitsError) {
      console.error('Error loading visits:', visitsError);
      toast.error('Failed to load visits');
      return;
    }

    if (!visitsData || visitsData.length === 0) {
      console.log('No visits found for this date');
      setRetailers([]);
      return;
    }

    console.log('Found visits:', visitsData);

    const retailerIds = [...new Set(visitsData.map(v => v.retailer_id).filter(Boolean))];
    
    if (retailerIds.length === 0) {
      setRetailers([]);
      return;
    }

    const { data: retailersData, error: retailersError } = await supabase
      .from('retailers')
      .select('id, name, address, latitude, longitude')
      .in('id', retailerIds);

    if (retailersError) {
      console.error('Error loading retailers:', retailersError);
      toast.error('Failed to load retailer details');
      return;
    }

    console.log('Found retailers:', retailersData);

    if (retailersData) {
      const retailersWithoutLocation = retailersData.filter(r => !r.latitude || !r.longitude);
      
      const parseLatLngFromAddress = (addr?: string | null) => {
        if (!addr) return null;
        const match = addr.match(/(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)/);
        if (!match) return null;
        const lat = parseFloat(match[1]);
        const lng = parseFloat(match[2]);
        if (isNaN(lat) || isNaN(lng)) return null;
        return { latitude: lat, longitude: lng };
      };

      const retailerLocations: RetailerLocation[] = visitsData
        .map((visit: any) => {
          const retailer = retailersData.find(r => r.id === visit.retailer_id);
          let lat: number | null = null;
          let lng: number | null = null;
          let address: string = retailer?.address || '';

          if (retailer?.latitude && retailer?.longitude) {
            lat = parseFloat(retailer.latitude as unknown as string);
            lng = parseFloat(retailer.longitude as unknown as string);
          } else if (visit.check_in_location?.latitude && visit.check_in_location?.longitude) {
            lat = visit.check_in_location.latitude;
            lng = visit.check_in_location.longitude;
            if (!address) address = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
          } else {
            const parsed = parseLatLngFromAddress(visit.check_in_address);
            if (parsed) {
              lat = parsed.latitude;
              lng = parsed.longitude;
              if (!address) address = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
            }
          }

          if (lat == null || lng == null) {
            console.log('Skipping - no coords from retailer or visit:', visit.retailer_id, retailer?.name);
            return null;
          }

          return {
            id: retailer?.id || visit.retailer_id,
            name: retailer?.name || 'Retailer',
            address,
            latitude: lat,
            longitude: lng,
            visitId: visit.id,
            checkInTime: visit.check_in_time,
            status: visit.status
          };
        })
        .filter((loc): loc is RetailerLocation => loc !== null);

      console.log('Processed retailer locations (with fallbacks):', retailerLocations);
      setRetailers(retailerLocations);

      if (retailerLocations.length === 0 && retailersWithoutLocation.length > 0) {
        const missingNames = retailersWithoutLocation.map(r => r.name).join(', ');
        toast.error(
          `${retailersWithoutLocation.length} retailer${retailersWithoutLocation.length > 1 ? 's' : ''} missing location data. Using visit locations when available. Missing: ${missingNames}`,
          { duration: 8000 }
        );
      }
    }
  };

  const isViewingOtherUser = currentLocationUser !== user?.id;

  return (
    <Layout>
      <div className="container mx-auto p-4 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">GPS Track</h1>
            <p className="text-muted-foreground">Monitor field movement with GPS tracking</p>
          </div>
        </div>

        <Tabs defaultValue="current" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="current">Current Location</TabsTrigger>
            <TabsTrigger value="day">Day Tracking</TabsTrigger>
          </TabsList>

          {/* Current Location Tab */}
          <TabsContent value="current" className="space-y-6 mt-6">
            {/* User Selector - Only for Admin */}
            {isAdmin && (
              <Card className="p-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Team Member</label>
                  <Select value={currentLocationUser} onValueChange={setCurrentLocationUser}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a team member">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          {teamMembers.find((m) => m.id === currentLocationUser)?.full_name || 'Select member'}
                        </div>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {teamMembers.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.full_name}
                          {member.id === user?.id && ' (You)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </Card>
            )}

            <Card className="p-6 relative z-0">
              <CurrentLocationMap 
                height="600px" 
                userId={currentLocationUser} 
                isViewingOther={isViewingOtherUser}
              />
            </Card>
          </TabsContent>

          {/* Day Tracking Tab */}
          <TabsContent value="day" className="space-y-6 mt-6">
            {/* Filters */}
            <Card className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Date Selector */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(date, 'PPP')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Team Member Selector - Only for Admin */}
                {isAdmin && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Select Team Member</label>
                    <Select value={selectedMember} onValueChange={setSelectedMember}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a team member">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            {teamMembers.find((m) => m.id === selectedMember)?.full_name || 'Select member'}
                          </div>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {teamMembers.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.full_name}
                            {member.id === user?.id && ' (You)'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </Card>

            {/* Map Display */}
            <div className="space-y-4">
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-semibold">Journey Heatmap</h2>
                    {retailers.length > 0 && (
                      <span className="text-sm text-muted-foreground">
                        ({retailers.length} retailer{retailers.length > 1 ? 's' : ''})
                      </span>
                    )}
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      loadGPSData();
                      loadRetailerLocations();
                    }}
                  >
                    Refresh Map
                  </Button>
                </div>
              </Card>

              {loading ? (
                <Card className="flex items-center justify-center h-96">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </Card>
              ) : (
              <Card className="overflow-hidden relative z-0">
                  <JourneyMap positions={gpsData} retailers={retailers} height="500px" />
                </Card>
              )}

              {/* Stats */}
              {(gpsData.length > 0 || retailers.length > 0) && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {retailers.length > 0 && (
                    <>
                      <Card className="p-4">
                        <div className="text-sm text-muted-foreground">Scheduled Retailers</div>
                        <div className="text-2xl font-bold">{retailers.length}</div>
                      </Card>
                      <Card className="p-4">
                        <div className="text-sm text-muted-foreground">Completed Visits</div>
                        <div className="text-2xl font-bold text-green-600">
                          {retailers.filter(r => r.status === 'completed' || r.status === 'productive' || r.checkInTime).length}
                        </div>
                      </Card>
                      <Card className="p-4">
                        <div className="text-sm text-muted-foreground">Pending Visits</div>
                        <div className="text-2xl font-bold text-orange-600">
                          {retailers.filter(r => !r.checkInTime && r.status !== 'completed').length}
                        </div>
                      </Card>
                    </>
                  )}
                  {gpsData.length > 0 && (
                    <>
                      <Card className="p-4">
                        <div className="text-sm text-muted-foreground">GPS Points</div>
                        <div className="text-2xl font-bold">{gpsData.length}</div>
                      </Card>
                      {!retailers.length && (
                        <>
                          <Card className="p-4">
                            <div className="text-sm text-muted-foreground">Start Time</div>
                            <div className="text-xl font-semibold">
                              {format(gpsData[0].timestamp, 'hh:mm a')}
                            </div>
                          </Card>
                          <Card className="p-4">
                            <div className="text-sm text-muted-foreground">Last Update</div>
                            <div className="text-xl font-semibold">
                              {format(gpsData[gpsData.length - 1].timestamp, 'hh:mm a')}
                            </div>
                          </Card>
                          <Card className="p-4">
                            <div className="text-sm text-muted-foreground">Avg Accuracy</div>
                            <div className="text-xl font-semibold">
                              {Math.round(gpsData.reduce((sum, d) => sum + d.accuracy, 0) / gpsData.length)}m
                            </div>
                          </Card>
                        </>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

import React, { useState, useEffect, useCallback } from 'react';
import { Layout } from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarIcon, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { JourneyMap } from '@/components/JourneyMap';
import { CurrentLocationMap } from '@/components/CurrentLocationMap';
import { toast } from 'sonner';
import { UserSelector } from '@/components/UserSelector';
import { useSubordinates } from '@/hooks/useSubordinates';
import { GPSStatsCard } from '@/components/gps/GPSStatsCard';

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

interface VisitStats {
  planned: number;
  productive: number;
  unproductive: number;
  pending: number;
}

export default function GPSTrack() {
  const { user } = useAuth();
  const [date, setDate] = useState<Date>(new Date());
  const [gpsData, setGpsData] = useState<GPSData[]>([]);
  const [retailers, setRetailers] = useState<RetailerLocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [beatName, setBeatName] = useState<string | null>(null);
  const [visitStats, setVisitStats] = useState<VisitStats>({ planned: 0, productive: 0, unproductive: 0, pending: 0 });
  const [totalKmTraveled, setTotalKmTraveled] = useState(0);
  
  // Hierarchical user filter using useSubordinates hook
  const { isManager, subordinates, isLoading: subordinatesLoading } = useSubordinates();
  
  // State for user selection - 'self' means current user
  const [selectedUserId, setSelectedUserId] = useState<string>('self');
  const [currentLocationUserId, setCurrentLocationUserId] = useState<string>('self');
  
  // Determine if user can select team members (is a manager with subordinates)
  const canSelectTeamMembers = isManager;

  // Get the actual user ID for data fetching
  const getActualUserId = (selectorValue: string): string => {
    if (selectorValue === 'self' || !selectorValue) {
      return user?.id || '';
    }
    return selectorValue;
  };

  const selectedMember = getActualUserId(selectedUserId);
  const currentLocationUser = getActualUserId(currentLocationUserId);

  // Initialize selection when user loads
  useEffect(() => {
    if (user?.id && !subordinatesLoading) {
      setSelectedUserId('self');
      setCurrentLocationUserId('self');
    }
  }, [user?.id, subordinatesLoading]);

  // Data loading effect - moved after function definitions below

  // Real-time subscription for visit updates
  useEffect(() => {
    if (!selectedMember) return;

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

  // Calculate distance between two points using Haversine formula
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Calculate total km traveled from GPS data
  useEffect(() => {
    if (gpsData.length > 1) {
      let total = 0;
      for (let i = 1; i < gpsData.length; i++) {
        total += calculateDistance(
          gpsData[i - 1].latitude,
          gpsData[i - 1].longitude,
          gpsData[i].latitude,
          gpsData[i].longitude
        );
      }
      setTotalKmTraveled(total);
    } else {
      setTotalKmTraveled(0);
    }
  }, [gpsData]);

  const loadBeatInfo = async () => {
    if (!selectedMember) return;

    const dateStr = date.toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('beat_plans')
      .select('beat_name')
      .eq('user_id', selectedMember)
      .eq('plan_date', dateStr)
      .maybeSingle();

    if (error) {
      console.error('Error loading beat info:', error);
      return;
    }

    setBeatName(data?.beat_name || null);
  };

  const loadVisitStats = async () => {
    if (!selectedMember) return;

    const dateStr = date.toISOString().split('T')[0];
    
    // CRITICAL FIX: Use the same calculation logic as Today's Progress
    // Fetch both visits AND orders to calculate stats correctly
    const [visitsRes, ordersRes, beatPlansRes] = await Promise.all([
      supabase
        .from('visits')
        .select('id, retailer_id, status, no_order_reason')
        .eq('user_id', selectedMember)
        .eq('planned_date', dateStr),
      supabase
        .from('orders')
        .select('id, retailer_id')
        .eq('user_id', selectedMember)
        .eq('order_date', dateStr)
        .eq('status', 'confirmed'),
      supabase
        .from('beat_plans')
        .select('beat_id, beat_data')
        .eq('user_id', selectedMember)
        .eq('plan_date', dateStr)
    ]);

    if (visitsRes.error) {
      console.error('Error loading visit stats:', visitsRes.error);
      return;
    }

    const visits = visitsRes.data || [];
    const orders = ordersRes.data || [];
    const beatPlans = beatPlansRes.data || [];
    
    // Get retailer IDs with confirmed orders
    const retailersWithOrders = new Set(orders.map(o => o.retailer_id));
    
    // Track unique retailers by status (same logic as Today's Progress)
    const visitsByRetailer = new Map<string, any[]>();
    visits.forEach(v => {
      if (!v?.retailer_id) return;
      const list = visitsByRetailer.get(v.retailer_id) || [];
      list.push(v);
      visitsByRetailer.set(v.retailer_id, list);
    });

    let productive = 0;
    let unproductive = 0;
    let planned = 0;
    const countedRetailers = new Set<string>();

    // Count from visits
    visitsByRetailer.forEach((group, retailerId) => {
      countedRetailers.add(retailerId);
      if (retailersWithOrders.has(retailerId)) {
        productive++;
      } else if (group.some(v => v.status === 'productive')) {
        productive++;
      } else if (group.some(v => v.status === 'unproductive' || !!v.no_order_reason)) {
        unproductive++;
      } else {
        planned++;
      }
    });

    // Count retailers with orders but no visits as productive
    retailersWithOrders.forEach(rid => {
      if (!countedRetailers.has(rid)) {
        productive++;
        countedRetailers.add(rid);
      }
    });

    // Count remaining planned retailers from beat_data
    for (const bp of beatPlans) {
      const beatData = bp.beat_data as any;
      if (beatData?.retailer_ids?.length > 0) {
        for (const rid of beatData.retailer_ids) {
          if (!countedRetailers.has(rid)) {
            planned++;
            countedRetailers.add(rid);
          }
        }
      }
    }

    const pending = planned; // Planned = Pending in GPS Track context
    
    setVisitStats({ planned: countedRetailers.size, productive, unproductive, pending });
  }

  // Data loading effect - called after all functions are defined
  useEffect(() => {
    if (selectedMember) {
      loadGPSData();
      loadRetailerLocations();
      loadBeatInfo();
      loadVisitStats();
    }
  }, [selectedMember, date]);

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
            {/* User Selector - For Managers with subordinates */}
            {canSelectTeamMembers && (
              <Card className="p-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Team Member</label>
                  <UserSelector
                    selectedUserId={currentLocationUserId}
                    onUserChange={setCurrentLocationUserId}
                    showAllOption={false}
                    className="w-full max-w-full h-10"
                  />
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

                {/* Team Member Selector - For Managers with subordinates */}
                {canSelectTeamMembers && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Select Team Member</label>
                    <UserSelector
                      selectedUserId={selectedUserId}
                      onUserChange={setSelectedUserId}
                      showAllOption={false}
                      className="w-full max-w-full h-10"
                    />
                  </div>
                )}
              </div>
            </Card>

            {/* Stats Card */}
            <GPSStatsCard
              beatName={beatName}
              plannedVisits={visitStats.planned}
              productiveVisits={visitStats.productive}
              unproductiveVisits={visitStats.unproductive}
              pendingVisits={visitStats.pending}
              totalKmTraveled={totalKmTraveled}
            />

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
                      loadBeatInfo();
                      loadVisitStats();
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

              {/* GPS Tracking Info */}
              {gpsData.length > 0 && (
                <Card className="p-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-sm text-muted-foreground">GPS Points</div>
                      <div className="text-xl font-bold">{gpsData.length}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Start Time</div>
                      <div className="text-xl font-semibold">
                        {format(gpsData[0].timestamp, 'hh:mm a')}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Last Update</div>
                      <div className="text-xl font-semibold">
                        {format(gpsData[gpsData.length - 1].timestamp, 'hh:mm a')}
                      </div>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

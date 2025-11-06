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
  const { user } = useAuth();
  const [date, setDate] = useState<Date>(new Date());
  const [selectedMember, setSelectedMember] = useState<string>('');
  const [currentLocationUser, setCurrentLocationUser] = useState<string>('');
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [gpsData, setGpsData] = useState<GPSData[]>([]);
  const [retailers, setRetailers] = useState<RetailerLocation[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTeamMembers();
  }, []);

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
          // Reload retailer locations when visits are updated
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

    // Fetch visits for the selected date and user with retailer details
    const { data: visitsData, error } = await supabase
      .from('visits')
      .select(`
        id,
        check_in_time,
        status,
        retailer_id,
        retailers (
          id,
          name,
          address,
          latitude,
          longitude
        )
      `)
      .eq('user_id', selectedMember)
      .eq('planned_date', dateStr)
      .order('check_in_time', { ascending: true });

    if (error) {
      console.error('Error loading retailer locations:', error);
      return;
    }

    if (visitsData) {
      const retailerLocations: RetailerLocation[] = visitsData
        .filter((visit: any) => visit.retailers && visit.retailers.latitude && visit.retailers.longitude)
        .map((visit: any) => ({
          id: visit.retailers.id,
          name: visit.retailers.name,
          address: visit.retailers.address,
          latitude: parseFloat(visit.retailers.latitude as unknown as string),
          longitude: parseFloat(visit.retailers.longitude as unknown as string),
          visitId: visit.id,
          checkInTime: visit.check_in_time,
          status: visit.status
        }));

      setRetailers(retailerLocations);
    }
  };

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
            {/* User Selector */}
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
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </Card>

            <Card className="p-6">
              <CurrentLocationMap height="600px" userId={currentLocationUser} />
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

                {/* Team Member Selector */}
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
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>

            {/* Map Display */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold">Journey Heatmap</h2>
              </div>

              {loading ? (
                <div className="flex items-center justify-center h-96">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <JourneyMap positions={gpsData} retailers={retailers} height="600px" />
              )}

              {/* Stats */}
              {gpsData.length > 0 && (
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="p-4">
                    <div className="text-sm text-muted-foreground">Total Points</div>
                    <div className="text-2xl font-bold">{gpsData.length}</div>
                  </Card>
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
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

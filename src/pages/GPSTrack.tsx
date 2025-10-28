import React, { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CalendarIcon, MapPin, User, Clock, RefreshCw, Search, CheckCircle, XCircle, Store, Users } from 'lucide-react';
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

interface Visit {
  id: string;
  check_in_time: string;
  check_out_time: string | null;
  check_in_address: string | null;
  status: string;
  retailer_id: string;
  retailer: {
    name: string;
    address: string;
    phone: string;
  } | null;
}

interface Attendance {
  check_in_time: string;
  check_out_time: string | null;
  check_in_address: string | null;
  check_out_address: string | null;
}

export default function GPSTrack() {
  const { user } = useAuth();
  const [date, setDate] = useState<Date>(new Date());
  const [selectedMember, setSelectedMember] = useState<string>('');
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [gpsData, setGpsData] = useState<GPSData[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [attendance, setAttendance] = useState<Attendance | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadTeamMembers();
  }, []);

  useEffect(() => {
    if (selectedMember) {
      loadAllData();
    }
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
      }
    }
  };

  const loadAllData = async () => {
    if (!selectedMember) return;

    setLoading(true);
    const dateStr = date.toISOString().split('T')[0];

    try {
      // Load GPS data
      const { data: gpsData, error: gpsError } = await supabase
        .from('gps_tracking')
        .select('*')
        .eq('user_id', selectedMember)
        .eq('date', dateStr)
        .order('timestamp', { ascending: true });

      if (gpsError) throw gpsError;

      if (gpsData) {
        setGpsData(
          gpsData.map((d) => ({
            latitude: parseFloat(d.latitude as unknown as string),
            longitude: parseFloat(d.longitude as unknown as string),
            accuracy: d.accuracy ? parseFloat(d.accuracy as unknown as string) : 0,
            timestamp: new Date(d.timestamp),
          }))
        );
      }

      // Load visits data
      const { data: visitsData, error: visitsError } = await supabase
        .from('visits')
        .select(`
          id,
          check_in_time,
          check_out_time,
          check_in_address,
          status,
          retailer_id
        `)
        .eq('user_id', selectedMember)
        .gte('check_in_time', `${dateStr}T00:00:00`)
        .lte('check_in_time', `${dateStr}T23:59:59`)
        .order('check_in_time', { ascending: true });

      if (visitsError) throw visitsError;

      // Fetch retailer details for each visit
      const visitsWithRetailers: Visit[] = [];
      if (visitsData && visitsData.length > 0) {
        for (const visit of visitsData) {
          const { data: retailer } = await supabase
            .from('retailers')
            .select('name, address, phone')
            .eq('id', visit.retailer_id)
            .single();

          visitsWithRetailers.push({
            ...visit,
            retailer: retailer || null
          });
        }
      }
      setVisits(visitsWithRetailers);

      // Load attendance data
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance')
        .select('check_in_time, check_out_time, check_in_address, check_out_address')
        .eq('user_id', selectedMember)
        .eq('date', dateStr)
        .single();

      if (attendanceError && attendanceError.code !== 'PGRST116') {
        console.error('Error loading attendance:', attendanceError);
      }
      setAttendance(attendanceData);

    } catch (error: any) {
      console.error('Error loading data:', error);
      toast.error('Failed to load tracking data');
    } finally {
      setLoading(false);
    }
  };

  const refreshData = () => {
    if (selectedMember) {
      loadAllData();
      toast.success('Data refreshed');
    }
  };

  const filteredTeamMembers = teamMembers.filter(member =>
    member.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
            <Card className="p-6">
              <CurrentLocationMap height="600px" />
            </Card>
          </TabsContent>

          {/* Day Tracking Tab */}
          <TabsContent value="day" className="mt-6">
            <div className="grid grid-cols-12 gap-4 h-[calc(100vh-16rem)]">
              {/* Left Sidebar - Task List */}
              <Card className="col-span-3 p-4 flex flex-col">
                <div className="space-y-4 flex-shrink-0">
                  <h2 className="text-lg font-semibold">Track Your Salesmen</h2>
                  
                  {/* User Selector */}
                  <Select value={selectedMember} onValueChange={setSelectedMember}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select User">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          {teamMembers.find((m) => m.id === selectedMember)?.full_name || 'Select user'}
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

                  {/* Date Picker */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(date, 'dd-MM-yyyy')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Tasks/Visits List */}
                <div className="mt-4 flex-1 min-h-0">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-medium">
                      All Tasks ({visits.length})
                    </div>
                    <Button variant="ghost" size="sm" onClick={refreshData}>
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>

                  <ScrollArea className="h-full">
                    {loading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {/* Attendance Check-in */}
                        {attendance?.check_in_time && (
                          <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                            <div className="flex items-center gap-2 text-green-700 dark:text-green-400 text-sm font-medium mb-1">
                              <CheckCircle className="h-4 w-4" />
                              Checked in at {format(new Date(attendance.check_in_time), 'h:mm a')}
                            </div>
                            {attendance.check_in_address && (
                              <p className="text-xs text-muted-foreground mt-1">{attendance.check_in_address}</p>
                            )}
                          </div>
                        )}

                        {/* Visits */}
                        {visits.map((visit) => (
                          <Card key={visit.id} className="p-3 hover:shadow-md transition-shadow">
                            <div className="space-y-2">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-medium text-sm truncate">
                                    {visit.retailer?.name || 'Unknown Retailer'}
                                  </h4>
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {visit.retailer?.phone}
                                  </p>
                                </div>
                                <Badge variant={visit.check_out_time ? "default" : "secondary"} className="text-xs flex-shrink-0">
                                  {visit.check_out_time ? 'Complete' : 'In Progress'}
                                </Badge>
                              </div>

                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <CheckCircle className="h-3 w-3 text-green-600" />
                                <span>Checked-in at {format(new Date(visit.check_in_time), 'h:mm a')}</span>
                              </div>

                              {visit.check_in_address && (
                                <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                                  <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                  <span className="line-clamp-2">{visit.check_in_address}</span>
                                </div>
                              )}

                              {visit.retailer?.address && (
                                <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                                  <Store className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                  <span className="line-clamp-2">{visit.retailer.address}</span>
                                </div>
                              )}
                            </div>
                          </Card>
                        ))}

                        {/* Attendance Check-out */}
                        {attendance?.check_out_time && (
                          <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                            <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 text-sm font-medium mb-1">
                              <XCircle className="h-4 w-4" />
                              Checked out at {format(new Date(attendance.check_out_time), 'h:mm a')}
                            </div>
                            {attendance.check_out_address && (
                              <p className="text-xs text-muted-foreground mt-1">{attendance.check_out_address}</p>
                            )}
                          </div>
                        )}

                        {!loading && visits.length === 0 && !attendance && (
                          <div className="text-center py-8 text-sm text-muted-foreground">
                            No activity for this date
                          </div>
                        )}
                      </div>
                    )}
                  </ScrollArea>
                </div>
              </Card>

              {/* Center - Map */}
              <Card className="col-span-6 p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-semibold">Route Mapping</h2>
                  </div>
                  {gpsData.length > 0 && (
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {format(gpsData[0].timestamp, 'h:mm a')} - {format(gpsData[gpsData.length - 1].timestamp, 'h:mm a')}
                      </div>
                      <Badge variant="outline">{gpsData.length} points</Badge>
                    </div>
                  )}
                </div>

                {loading ? (
                  <div className="flex items-center justify-center h-[calc(100%-4rem)]">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : gpsData.length > 0 ? (
                  <JourneyMap positions={gpsData} height="calc(100% - 4rem)" />
                ) : (
                  <div className="flex items-center justify-center h-[calc(100%-4rem)] text-muted-foreground">
                    {selectedMember ? 'No GPS data available for this date' : 'Select a user to view route'}
                  </div>
                )}
              </Card>

              {/* Right Sidebar - Team Members */}
              <Card className="col-span-3 p-4 flex flex-col">
                <div className="space-y-4 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-semibold">Leads</h2>
                  </div>

                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search Lead Name"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>

                {/* Team Members List */}
                <div className="mt-4 flex-1 min-h-0">
                  <div className="text-sm font-medium mb-3">Lead Name</div>
                  <ScrollArea className="h-full">
                    <div className="space-y-1">
                      {filteredTeamMembers.map((member) => (
                        <button
                          key={member.id}
                          onClick={() => setSelectedMember(member.id)}
                          className={`w-full text-left px-3 py-2.5 rounded-md text-sm transition-colors ${
                            selectedMember === member.id
                              ? 'bg-primary/10 text-primary font-medium'
                              : 'hover:bg-muted'
                          }`}
                        >
                          {member.full_name}
                        </button>
                      ))}
                      {filteredTeamMembers.length === 0 && (
                        <div className="text-center py-8 text-sm text-muted-foreground">
                          No team members found
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

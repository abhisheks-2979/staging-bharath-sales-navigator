import { useState, useEffect } from "react";
import { MapPin, Users, CheckCircle, Save, ArrowLeft, Plus, Calendar as CalendarIcon, Search, ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Layout } from "@/components/Layout";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SearchInput } from "@/components/SearchInput";
import { format, isAfter, startOfDay, startOfWeek, addDays, isSameDay, addWeeks, subWeeks } from "date-fns";
import { cn } from "@/lib/utils";

interface Beat {
  id: string; // beat_id
  name: string; // beat name (same as id unless we have prettier names)
  retailerCount: number;
  lastVisited?: string;
  category: "all";
  priority: "high" | "medium" | "low";
}


// Beats are loaded dynamically from retailers table for the current user.

const getWeekDays = (selectedWeekStart: Date) => {
  const startOfSelectedWeek = startOfWeek(selectedWeekStart, { weekStartsOn: 1 }); // Start from Monday
  const today = new Date();
  
  const weekDays = [];
  for (let i = 0; i < 7; i++) {
    const day = addDays(startOfSelectedWeek, i);
    const isToday = isSameDay(day, today);
    
    weekDays.push({
      day: format(day, 'EEE'),
      date: day.getDate().toString(),
      isToday: isToday,
      isoDate: format(day, 'yyyy-MM-dd'),
      fullDate: day,
      dayName: format(day, 'EEEE')
    });
  }
  return weekDays;
};

export const BeatPlanning = () => {
  const [selectedCategory] = useState<"all">("all");
  const [selectedDay, setSelectedDay] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedWeek, setSelectedWeek] = useState(new Date());
  const [plannedBeats, setPlannedBeats] = useState<{[key: string]: string[]}>({});
  const [weekDays, setWeekDays] = useState(() => getWeekDays(new Date()));
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [calendarDate, setCalendarDate] = useState<Date | undefined>(new Date());
  const [plannedDates, setPlannedDates] = useState<Set<string>>(new Set());
  const navigate = useNavigate();
  const { user } = useAuth();
  const [beats, setBeats] = useState<Beat[]>([]);

  const loadBeats = async () => {
    if (!user) return;
    try {
      // Get user's own beats
      const { data: beatsData, error: beatsError } = await supabase
        .from('beats')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      if (beatsError) throw beatsError;

      // Get retailer counts for each beat for the current user
      const { data: retailersData, error: retailersError } = await supabase
        .from('retailers')
        .select('beat_id, priority')
        .eq('user_id', user.id);

      if (retailersError) throw retailersError;

      // Count retailers per beat and determine priority
      const retailerCountMap = new Map<string, { count: number; priority: 'high' | 'medium' | 'low' }>();
      (retailersData || []).forEach((r: any) => {
        const beatId = r.beat_id;
        if (!beatId || beatId === 'unassigned') return;
        const current = retailerCountMap.get(beatId) || { count: 0, priority: 'medium' };
        const pr = (r.priority as string | null)?.toLowerCase() as 'high' | 'medium' | 'low' | undefined;
        const priority = pr === 'high' ? 'high' : pr === 'low' ? (current.priority === 'high' ? 'high' : 'low') : current.priority;
        retailerCountMap.set(beatId, { count: current.count + 1, priority });
      });

      // Map beats data with retailer counts - show ALL beats even if user has 0 retailers
      const beatsArr: Beat[] = (beatsData || []).map((beat: any) => {
        const retailerInfo = retailerCountMap.get(beat.beat_id) || { count: 0, priority: 'medium' };
        return {
          id: beat.beat_id,
          name: beat.beat_name,
          retailerCount: retailerInfo.count,
          category: beat.category || 'all',
          priority: retailerInfo.priority,
        };
      });
      
      // Show all beats, including those with 0 retailers (for new users)
      setBeats(beatsArr);
    } catch (e) {
      console.error('Error loading beats', e);
    }
  };

  // Initialize selected day to today if it exists in current week
  useEffect(() => {
    const today = weekDays.find(d => d.isToday);
    if (today && !selectedDay) {
      setSelectedDay(today.day);
      setSelectedDate(today.fullDate);
    }
  }, [weekDays, selectedDay]);

  // Update week days when selected week changes
  useEffect(() => {
    setWeekDays(getWeekDays(selectedWeek));
  }, [selectedWeek]);

  // Load existing beat plans when component mounts or selected date changes
  useEffect(() => {
    if (user && selectedDate) {
      const dateString = selectedDate.toISOString().split('T')[0];
      loadBeatPlans(dateString);
      loadBeats();
    }
  }, [user, selectedDate]);

  // Load week plan markers for calendar
  useEffect(() => {
    if (!user) return;
    const loadWeekPlans = async () => {
      try {
        const startIso = weekDays[0]?.isoDate;
        const endIso = weekDays[weekDays.length - 1]?.isoDate;
        if (!startIso || !endIso) return;
        const { data, error } = await supabase
          .from('beat_plans')
          .select('plan_date')
          .eq('user_id', user.id)
          .gte('plan_date', startIso)
          .lte('plan_date', endIso);
        if (error) throw error;
        setPlannedDates(new Set((data || []).map((d: any) => d.plan_date)));
      } catch (err) {
        console.error('Error loading week plans:', err);
      }
    };
    loadWeekPlans();
  }, [user, weekDays]);

  const loadBeatPlans = async (date: string) => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('beat_plans')
        .select('beat_id')
        .eq('user_id', user.id)
        .eq('plan_date', date);

      if (error) throw error;

      const plannedBeatIds = data.map(plan => plan.beat_id);
      // Use the correct day key based on the date being loaded
      const loadedDate = new Date(date + 'T00:00:00');
      const dayKey = loadedDate.toLocaleDateString('en-US', { weekday: 'short' });
      setPlannedBeats(prev => ({
        ...prev,
        [dayKey]: plannedBeatIds
      }));
    } catch (error) {
      console.error('Error loading beat plans:', error);
    }
  };

  const filteredBeats = beats.filter(beat => 
    beat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    beat.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectBeat = (beatId: string) => {
    setPlannedBeats(prev => ({
      ...prev,
      [selectedDay]: [...(prev[selectedDay] || []), beatId]
    }));
  };

  const handleRemoveBeat = (beatId: string) => {
    setPlannedBeats(prev => ({
      ...prev,
      [selectedDay]: (prev[selectedDay] || []).filter(id => id !== beatId)
    }));
  };

  const createExpenseRecords = async (selectedBeatIds: string[], dateString: string) => {
    if (!user) {
      console.error('No user found when creating expense records');
      return;
    }
    
    try {
      console.log('Creating expense records for date:', dateString);
      console.log('Selected beat IDs:', selectedBeatIds);
      console.log('User ID:', user.id);
      
      if (selectedBeatIds.length === 0) {
        console.log('No beats selected, skipping expense creation');
        return;
      }

      // Create expense records for each planned beat using upsert
      const expenseData = selectedBeatIds.map(beatId => {
        const beat = beats.find(b => b.id === beatId);
        console.log(`Beat ${beatId} found:`, beat);
        return {
          user_id: user.id,
          beat_id: beatId,
          beat_name: beat?.name || beatId,
          daily_allowance: 500, // Default daily allowance
          travel_allowance: 200, // Default travel allowance
          created_at: `${dateString}T12:00:00.000Z`, // Use the correct date for expense records
          updated_at: new Date().toISOString()
        };
      });

      console.log('Expense data to upsert:', expenseData);

      if (expenseData.length === 0) {
        console.log('No expense data to upsert');
        return;
      }

      // Use upsert to handle existing records
      const { error, data } = await supabase
        .from('beat_allowances')
        .upsert(expenseData, {
          onConflict: 'beat_id,user_id',
          ignoreDuplicates: false
        });

      if (error) {
        console.error('Upsert error:', error);
        console.error('Upsert error details:', JSON.stringify(error, null, 2));
        throw error;
      }
      
      console.log('Successfully created/updated expense records:', data);
      
      // Show success message
      toast.success(`Created expense records for ${selectedBeatIds.length} beat(s)`);
    } catch (error) {
      console.error('Error creating expense records:', error);
      toast.error('Failed to create expense records. Please check the console for details.', {
        duration: 5000,
      });
    }
  };

  const handleSubmitPlan = async () => {
    if (!user || !selectedDate) return;
    
    const dateKey = selectedDate.toLocaleDateString('en-US', { weekday: 'short' });
    const selectedBeatIds = plannedBeats[dateKey] || [];
    if (selectedBeatIds.length === 0) {
      toast.error("Please select at least one beat to plan.");
      return;
    }

    setIsLoading(true);
    try {
      // Format date correctly to avoid timezone issues
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;
      console.log('Submitting plan for date:', dateString, 'from selectedDate:', selectedDate);
      // Delete existing plans for this date
      await supabase
        .from('beat_plans')
        .delete()
        .eq('user_id', user.id)
        .eq('plan_date', dateString);

      const planData = selectedBeatIds.map(beatId => {
        const beat = beats.find(b => b.id === beatId);
        const beatData = beat
          ? { id: beat.id, name: beat.name, retailerCount: beat.retailerCount, category: beat.category, priority: beat.priority }
          : { id: beatId, name: beatId, retailerCount: 0, category: 'all', priority: 'medium' };
        return {
          user_id: user.id,
          plan_date: dateString,
          beat_id: beatId,
          beat_name: beat?.name || beatId,
          beat_data: beatData as any
        };
      });

      const { error } = await supabase
        .from('beat_plans')
        .insert(planData);

      if (error) throw error;

      // Automatically create/update expense records for planned beats
      await createExpenseRecords(selectedBeatIds, dateString);

      // Trigger data refresh on My Visits page
      window.dispatchEvent(new Event('visitDataChanged'));

      toast.success(`Successfully planned ${selectedBeatIds.length} beat(s) for ${format(selectedDate, 'MMMM d, yyyy')}`);
    } catch (error) {
      console.error('Error saving beat plan:', error);
      toast.error("Failed to save beat plan. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDayChange = (day: string) => {
    setSelectedDay(day);
    const dayInfo = weekDays.find(d => d.day === day);
    if (dayInfo) {
      setSelectedDate(dayInfo.fullDate);
    }
  };

  const handleCalendarDateSelect = (date: Date | undefined) => {
    if (date && isAfter(date, startOfDay(new Date()))) {
      setCalendarDate(date);
      const weekStart = startOfWeek(date, { weekStartsOn: 1 });
      setSelectedWeek(weekStart);
      
      // Set the selected day to the picked date
      const newWeekDays = getWeekDays(weekStart);
      const selectedDayInfo = newWeekDays.find(d => isSameDay(d.fullDate, date));
      if (selectedDayInfo) {
        setSelectedDay(selectedDayInfo.day);
        setSelectedDate(selectedDayInfo.fullDate);
      }
    } else if (date && !isAfter(date, startOfDay(new Date()))) {
      toast.error("Cannot plan for past dates. Please select a future date.");
    }
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeek = direction === 'prev' ? subWeeks(selectedWeek, 1) : addWeeks(selectedWeek, 1);
    setSelectedWeek(newWeek);
    setCalendarDate(newWeek);
    
    // Keep the same day of week if possible, otherwise select the first day
    const newWeekDays = getWeekDays(newWeek);
    const sameWeekdayIndex = weekDays.findIndex(d => d.day === selectedDay);
    const targetDay = newWeekDays[sameWeekdayIndex] || newWeekDays[0];
    setSelectedDay(targetDay.day);
    setSelectedDate(targetDay.fullDate);
  };

  const isBeatSelected = (beatId: string) => {
    const dateKey = selectedDate.toLocaleDateString('en-US', { weekday: 'short' });
    return (plannedBeats[dateKey] || []).includes(beatId);
  };

  const handleProceedToRetailers = () => {
    const dateKey = selectedDate.toLocaleDateString('en-US', { weekday: 'short' });
    const selectedBeatIds = plannedBeats[dateKey] || [];
    if (selectedBeatIds.length > 0) {
      // Navigate to retailer list with selected beats
      navigate('/visits/retailers', { state: { selectedBeats: selectedBeatIds, selectedDay: dateKey } });
    }
  };

  const getTotalPlannedDays = () => {
    return Object.keys(plannedBeats).filter(day => plannedBeats[day].length > 0).length;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-destructive text-destructive-foreground";
      case "medium": return "bg-warning text-warning-foreground";
      case "low": return "bg-muted text-muted-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <Layout>
      <div className="p-4 space-y-4">
        {/* Header */}
        <Card className="shadow-card bg-gradient-primary text-primary-foreground">
          <CardHeader className="pb-2 sm:pb-3">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2 sm:gap-3">
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => navigate('/visits/retailers')}
                  className="text-primary-foreground hover:bg-primary-foreground/20"
                >
                  <ArrowLeft size={18} className="sm:hidden" />
                  <ArrowLeft size={20} className="hidden sm:block" />
                </Button>
                <div>
                  <CardTitle className="text-lg sm:text-xl font-bold">
                    {(() => {
                      const dateKey = selectedDate.toLocaleDateString('en-US', { weekday: 'short' });
                      return plannedBeats[dateKey]?.length > 0 
                        ? `Journey: ${plannedBeats[dateKey].slice(0, 2).map(beatId => beats.find(b => b.id === beatId)?.name || beatId).join(', ')}${plannedBeats[dateKey].length > 2 ? '...' : ''}`
                        : 'Plan My Journey';
                    })()}
                  </CardTitle>
                  <p className="text-xs sm:text-sm text-primary-foreground/80">
                    {(() => {
                      const dateKey = selectedDate.toLocaleDateString('en-US', { weekday: 'short' });
                      return plannedBeats[dateKey]?.length > 0 
                        ? `${plannedBeats[dateKey].length} beat${plannedBeats[dateKey].length > 1 ? 's' : ''} selected`
                        : 'Select beats for your visit schedule';
                    })()}
                  </p>
                </div>
              </div>
              <Button 
                onClick={() => navigate('/my-beats?openCreateModal=true')}
                variant="secondary"
                size="sm"
                className="bg-primary-foreground/10 text-primary-foreground border-primary-foreground/20 hover:bg-primary-foreground/20 text-xs sm:text-sm"
              >
                <Plus size={14} className="sm:mr-1" />
                <span className="hidden sm:inline">Create Beat</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Calendar Selector */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "bg-primary-foreground/10 text-primary-foreground border-primary-foreground/20 hover:bg-primary-foreground/20",
                        !calendarDate && "text-primary-foreground/50"
                      )}
                    >
                      <CalendarDays className="mr-2 h-4 w-4" />
                      {calendarDate ? format(calendarDate, "MMM yyyy") : "Pick a month"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={calendarDate}
                      onSelect={handleCalendarDateSelect}
                      disabled={(date) => !isAfter(date, startOfDay(new Date()))}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateWeek('prev')}
                  className="bg-primary-foreground/10 text-primary-foreground border-primary-foreground/20 hover:bg-primary-foreground/20"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium text-primary-foreground px-2">
                  {format(selectedWeek, "MMM d")} - {format(addDays(selectedWeek, 6), "MMM d, yyyy")}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateWeek('next')}
                  className="bg-primary-foreground/10 text-primary-foreground border-primary-foreground/20 hover:bg-primary-foreground/20"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Weekly Calendar - Mobile Optimized */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-6">
              {weekDays.map((dayInfo) => (
                <button
                  key={dayInfo.day}
                  onClick={() => handleDayChange(dayInfo.day)}
                  className={`p-2 sm:p-3 rounded-lg text-center transition-colors relative ${
                    selectedDay === dayInfo.day
                      ? 'bg-primary-foreground text-primary'
                      : 'bg-primary-foreground/10 hover:bg-primary-foreground/20'
                  }`}
                >
                  <div className="text-xs font-medium mb-1">{dayInfo.day}</div>
                  <div className="text-sm sm:text-lg font-bold">{dayInfo.date}</div>
                  {plannedDates.has(dayInfo.isoDate) && (
                    <div className="absolute -top-1 -right-1 w-2 h-2 sm:w-3 sm:h-3 bg-success rounded-full"></div>
                  )}
                  {dayInfo.isToday && (
                    <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-primary-foreground rounded-full"></div>
                  )}
                </button>
              ))}
            </div>

            {/* Search Section */}
            <div className="mb-4">
              <SearchInput
                placeholder="Search beats by name or ID..."
                value={searchTerm}
                onChange={setSearchTerm}
              />
            </div>

            {/* Planning Summary */}
            <div className="text-center text-primary-foreground/90 text-sm">
              Planning for {format(selectedDate, 'EEEE, MMMM d, yyyy')} • 
              {(() => {
                const dateKey = selectedDate.toLocaleDateString('en-US', { weekday: 'short' });
                return plannedBeats[dateKey]?.length || 0;
              })()} beats selected
            </div>
          </CardContent>
        </Card>

        {/* Category Tabs removed - showing all beats derived from your retailers */}

        {/* Beats List */}
        <div className="space-y-3">
          {filteredBeats.map((beat) => (
            <Card key={beat.id} className="shadow-card">
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-foreground">{beat.name}</h3>
                      <Badge className={getPriorityColor(beat.priority)}>
                        {beat.priority}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">
                        Last visited: {beat.lastVisited || 'Never'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Category: {beat.category || 'General'}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button
                      size="sm"
                      variant={isBeatSelected(beat.id) ? "destructive" : "default"}
                      onClick={() => {
                        const dateKey = selectedDate.toLocaleDateString('en-US', { weekday: 'short' });
                        if (isBeatSelected(beat.id)) {
                          setPlannedBeats(prev => ({
                            ...prev,
                            [dateKey]: (prev[dateKey] || []).filter(id => id !== beat.id)
                          }));
                        } else {
                          setPlannedBeats(prev => ({
                            ...prev,
                            [dateKey]: [...(prev[dateKey] || []), beat.id]
                          }));
                        }
                      }}
                    >
                      {isBeatSelected(beat.id) ? "Remove" : "Select"}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => navigate(`/beat-analytics?beat=${beat.id}`)}
                      className="text-xs"
                    >
                      Analytics
                    </Button>
                  </div>
                </div>

                {/* Beat Stats */}
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="flex items-center justify-center mb-1">
                      <Users size={16} className="text-primary mr-1" />
                    </div>
                    <div className="text-lg font-bold text-primary">{beat.retailerCount}</div>
                    <div className="text-xs text-muted-foreground">Retailers</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-primary">₹{(Math.random() * 150000 + 50000).toFixed(0)}</div>
                    <div className="text-xs text-muted-foreground">Avg Revenue</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-primary">₹{(Math.random() * 500000 + 200000).toFixed(0)}</div>
                    <div className="text-xs text-muted-foreground">6M Sales</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Floating Action - Mobile Optimized */}
        {(() => {
          const dateKey = selectedDate.toLocaleDateString('en-US', { weekday: 'short' });
          return (plannedBeats[dateKey]?.length || 0) > 0;
        })() && (
          <div className="fixed bottom-4 left-4 right-4 z-10">
            <Card className="shadow-lg bg-primary text-primary-foreground">
              <CardContent className="p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm sm:text-base font-semibold truncate">
                      {(() => {
                        const dateKey = selectedDate.toLocaleDateString('en-US', { weekday: 'short' });
                        return plannedBeats[dateKey]?.length || 0;
                      })()} beat(s) selected for {format(selectedDate, 'MMM d')}
                    </div>
                    <div className="text-xs sm:text-sm text-primary-foreground/80">
                      Save plan or view my visit
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button 
                      variant="secondary"
                      onClick={handleSubmitPlan}
                      disabled={isLoading}
                      size="sm"
                      className="bg-success text-success-foreground hover:bg-success/90 text-xs sm:text-sm"
                    >
                      <Save size={14} className="mr-1 sm:mr-2" />
                      <span className="hidden xs:inline">{isLoading ? "Saving..." : "Save Plan"}</span>
                      <span className="xs:hidden">{isLoading ? "Save..." : "Save"}</span>
                    </Button>
                    <Button 
                      variant="secondary"
                      onClick={handleProceedToRetailers}
                      size="sm"
                      className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 text-xs sm:text-sm"
                    >
                      <MapPin size={14} className="mr-1 sm:mr-2" />
                      <span className="hidden xs:inline">View My Visit</span>
                      <span className="xs:hidden">Visit</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
};
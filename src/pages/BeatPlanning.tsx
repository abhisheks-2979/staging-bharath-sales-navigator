import { useState, useEffect } from "react";
import { MapPin, Users, CheckCircle, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Layout } from "@/components/Layout";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Beat {
  id: string; // beat_id
  name: string; // beat name (same as id unless we have prettier names)
  retailerCount: number;
  lastVisited?: string;
  category: "all";
  priority: "high" | "medium" | "low";
}


// Beats are loaded dynamically from retailers table for the current user.

const getWeekDays = () => {
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Start from Monday
  
  const weekDays = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(startOfWeek);
    day.setDate(startOfWeek.getDate() + i);
    
    weekDays.push({
      day: day.toLocaleDateString('en-US', { weekday: 'short' }),
      date: day.getDate().toString(),
      fullDate: day.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }),
      isoDate: day.toISOString().split('T')[0]
    });
  }
  return weekDays;
};

export const BeatPlanning = () => {
  const [selectedCategory] = useState<"all">("all");
  const [selectedDay, setSelectedDay] = useState("Mon");
  const [selectedDate, setSelectedDate] = useState("");
  const [plannedBeats, setPlannedBeats] = useState<{[key: string]: string[]}>({});
  const [weekDays, setWeekDays] = useState(getWeekDays());
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const [beats, setBeats] = useState<Beat[]>([]);

  const loadBeats = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('retailers')
        .select('beat_id, priority')
        .eq('user_id', user.id);

      if (error) throw error;

      const map = new Map<string, { count: number; priority: 'high' | 'medium' | 'low' }>();
      (data || []).forEach((r: any) => {
        const beatId = r.beat_id;
        if (!beatId || beatId === 'unassigned') return;
        const current = map.get(beatId) || { count: 0, priority: 'medium' };
        const pr = (r.priority as string | null)?.toLowerCase() as 'high' | 'medium' | 'low' | undefined;
        const priority = pr === 'high' ? 'high' : pr === 'low' ? (current.priority === 'high' ? 'high' : 'low') : current.priority;
        map.set(beatId, { count: current.count + 1, priority });
      });

      const beatsArr: Beat[] = Array.from(map.entries()).map(([id, info]) => ({
        id,
        name: id,
        retailerCount: info.count,
        category: 'all',
        priority: info.priority,
      }));
      setBeats(beatsArr);
    } catch (e) {
      console.error('Error loading beats', e);
    }
  };
  // Load existing beat plans when component mounts or selected day changes
  useEffect(() => {
    if (user && selectedDate) {
      loadBeatPlans(selectedDate);
      loadBeats();
    }
  }, [user, selectedDate]);

  // Set initial selected date and day
  useEffect(() => {
    const today = weekDays.find(d => d.day === selectedDay);
    if (today) {
      setSelectedDate(today.isoDate);
    }
  }, [selectedDay, weekDays]);

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
      setPlannedBeats(prev => ({
        ...prev,
        [selectedDay]: plannedBeatIds
      }));
    } catch (error) {
      console.error('Error loading beat plans:', error);
    }
  };

  const filteredBeats = beats;

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

  const handleSubmitPlan = async () => {
    if (!user || !selectedDate) return;
    
    const selectedBeatIds = plannedBeats[selectedDay] || [];
    if (selectedBeatIds.length === 0) {
      toast.error("Please select at least one beat to plan.");
      return;
    }

    setIsLoading(true);
    try {
      // Delete existing plans for this date
      await supabase
        .from('beat_plans')
        .delete()
        .eq('user_id', user.id)
        .eq('plan_date', selectedDate);

      const planData = selectedBeatIds.map(beatId => {
        const beat = beats.find(b => b.id === beatId);
        const beatData = beat
          ? { id: beat.id, name: beat.name, retailerCount: beat.retailerCount, category: beat.category, priority: beat.priority }
          : { id: beatId, name: beatId, retailerCount: 0, category: 'all', priority: 'medium' };
        return {
          user_id: user.id,
          plan_date: selectedDate,
          beat_id: beatId,
          beat_name: beat?.name || beatId,
          beat_data: beatData as any
        };
      });

      const { error } = await supabase
        .from('beat_plans')
        .insert(planData);

      if (error) throw error;

      toast.success(`Successfully planned ${selectedBeatIds.length} beat(s) for ${weekDays.find(d => d.day === selectedDay)?.fullDate}`);
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
      setSelectedDate(dayInfo.isoDate);
    }
  };

  const isBeatSelected = (beatId: string) => {
    return (plannedBeats[selectedDay] || []).includes(beatId);
  };

  const handleProceedToRetailers = () => {
    const selectedBeatIds = plannedBeats[selectedDay] || [];
    if (selectedBeatIds.length > 0) {
      // Navigate to retailer list with selected beats
      navigate('/visits/retailers', { state: { selectedBeats: selectedBeatIds, selectedDay } });
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
          <CardHeader className="pb-3">
            <CardTitle className="text-xl font-bold">Plan My Visits</CardTitle>
            <p className="text-primary-foreground/80">Select beats for your weekly visit schedule</p>
          </CardHeader>
          <CardContent>
            {/* Weekly Calendar */}
            <div className="grid grid-cols-7 gap-2 mb-4">
              {weekDays.map((dayInfo) => (
                <button
                  key={dayInfo.day}
                  onClick={() => handleDayChange(dayInfo.day)}
                  className={`p-2 rounded-lg text-center transition-colors relative ${
                    selectedDay === dayInfo.day
                      ? 'bg-primary-foreground text-primary'
                      : 'bg-primary-foreground/10 hover:bg-primary-foreground/20'
                  }`}
                >
                  <div className="text-xs font-medium">{dayInfo.day}</div>
                  <div className="text-lg font-bold">{dayInfo.date}</div>
                  {plannedBeats[dayInfo.day]?.length > 0 && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-success rounded-full flex items-center justify-center">
                      <CheckCircle size={10} className="text-primary-foreground" />
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* Planning Summary */}
            <div className="text-center text-primary-foreground/90 text-sm">
              Planning for {weekDays.find(d => d.day === selectedDay)?.fullDate} • 
              {plannedBeats[selectedDay]?.length || 0} beats selected • 
              {getTotalPlannedDays()} days planned
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
                      <h3 className="font-semibold">{beat.name}</h3>
                      <Badge className={getPriorityColor(beat.priority)}>
                        {beat.priority}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Last visited: {beat.lastVisited}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant={isBeatSelected(beat.id) ? "destructive" : "default"}
                    onClick={() => isBeatSelected(beat.id) ? handleRemoveBeat(beat.id) : handleSelectBeat(beat.id)}
                  >
                    {isBeatSelected(beat.id) ? "Remove" : "Select"}
                  </Button>
                </div>

                {/* Beat Stats */}
                <div className="grid grid-cols-1 gap-4 text-center">
                  <div>
                    <div className="flex items-center justify-center mb-1">
                      <Users size={16} className="text-primary mr-1" />
                    </div>
                    <div className="text-lg font-bold text-primary">{beat.retailerCount}</div>
                    <div className="text-xs text-muted-foreground">Retailers</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Floating Action */}
        {(plannedBeats[selectedDay]?.length || 0) > 0 && (
          <div className="fixed bottom-4 left-4 right-4 z-10">
            <Card className="shadow-lg bg-primary text-primary-foreground">
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-semibold">
                      {plannedBeats[selectedDay]?.length} beat(s) selected for {selectedDay}
                    </div>
                    <div className="text-sm text-primary-foreground/80">
                      Save plan or view retailers
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="secondary"
                      onClick={handleSubmitPlan}
                      disabled={isLoading}
                      className="bg-success text-success-foreground hover:bg-success/90"
                    >
                      <Save size={16} className="mr-2" />
                      {isLoading ? "Saving..." : "Save Plan"}
                    </Button>
                    <Button 
                      variant="secondary"
                      onClick={handleProceedToRetailers}
                      className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"
                    >
                      <MapPin size={16} className="mr-2" />
                      View Retailers
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
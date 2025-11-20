import { useState, useEffect } from "react";
import { Search, Store, TrendingUp, BarChart3, Phone, MapPin, Users, Truck, Plus, Save, Trash2, Repeat, CalendarDays } from "lucide-react";
import { format, addDays, addWeeks, addMonths, startOfWeek, endOfWeek } from "date-fns";
import { SearchInput } from "@/components/SearchInput";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Layout } from "@/components/Layout";
import { RetailerAnalytics } from "@/components/RetailerAnalytics";
import { AddRetailerInlineToBeat } from "@/components/AddRetailerInlineToBeat";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

interface Retailer {
  id: string;
  name: string;
  type: string;
  category: "A" | "B" | "C";
  phone: string;
  address: string;
  image: string;
  beatName: string;
  distributor: string;
  lastVisitDate?: string;
  isSelected: boolean;
  priority?: "high" | "medium" | "low";
  metrics: {
    avgOrders3Months: number;
    avgOrderPerVisit: number;
    visitsIn3Months: number;
    revenue12Months: number;
  };
}

const mockRetailers: Retailer[] = [
  {
    id: "1",
    name: "Vardhman Kirana",
    type: "Retailers",
    category: "A",
    phone: "9926612072",
    address: "Indiranagar, Bangalore",
    image: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=200&h=200&fit=crop&crop=face",
    beatName: "Central Bangalore",
    distributor: "Metro Distribution Co.",
    lastVisitDate: "2024-01-15",
    isSelected: false,
    priority: "high",
    metrics: {
      avgOrders3Months: 15,
      avgOrderPerVisit: 3500,
      visitsIn3Months: 8,
      revenue12Months: 185000
    }
  },
  {
    id: "2", 
    name: "Sham Kirana and General Stores",
    type: "Small and Medium Businesses",
    category: "B",
    phone: "9926963147",
    address: "34 A, Kharghar, Navi Mumbai, Maharashtra",
    image: "https://images.unsplash.com/photo-1581092795360-fd1ca04f0952?w=200&h=200&fit=crop&crop=face",
    beatName: "Navi Mumbai West",
    distributor: "Sunrise Distributors",
    lastVisitDate: "2024-01-12",
    isSelected: false,
    priority: "medium",
    metrics: {
      avgOrders3Months: 12,
      avgOrderPerVisit: 2800,
      visitsIn3Months: 6,
      revenue12Months: 142000
    }
  },
  {
    id: "3",
    name: "Mahesh Kirana and General Stores",
    type: "Retailers",
    category: "A", 
    phone: "9955551112",
    address: "MG Road, Bangalore",
    image: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=200&h=200&fit=crop&crop=face",
    beatName: "Central Bangalore",
    distributor: "Metro Distribution Co.",
    lastVisitDate: "2024-01-10",
    isSelected: false,
    priority: "high",
    metrics: {
      avgOrders3Months: 18,
      avgOrderPerVisit: 4200,
      visitsIn3Months: 9,
      revenue12Months: 225000
    }
  },
  {
    id: "4",
    name: "Balaji Kiranad",
    type: "Retailers",
    category: "C",
    phone: "9516584711", 
    address: "Commercial Street, Bangalore",
    image: "https://images.unsplash.com/photo-1581090464777-f3220bbe1b8b?w=200&h=200&fit=crop&crop=face",
    beatName: "South Bangalore",
    distributor: "Quick Supply Ltd.",
    lastVisitDate: "2024-01-08",
    isSelected: false,
    priority: "medium",
    metrics: {
      avgOrders3Months: 10,
      avgOrderPerVisit: 2200,
      visitsIn3Months: 5,
      revenue12Months: 98000
    }
  },
  {
    id: "5",
    name: "Krishna General Store",
    type: "Retailers",
    category: "B",
    phone: "9876543210",
    address: "Jayanagar, Bangalore", 
    image: "https://images.unsplash.com/photo-1487958449943-2429e8be8625?w=200&h=200&fit=crop&crop=face",
    beatName: "South Bangalore",
    distributor: "Quick Supply Ltd.",
    lastVisitDate: "2024-01-05",
    isSelected: false,
    priority: "low",
    metrics: {
      avgOrders3Months: 8,
      avgOrderPerVisit: 1800,
      visitsIn3Months: 4,
      revenue12Months: 76000
    }
  },
  {
    id: "6",
    name: "Lakshmi Provision Store",
    type: "Retailers",
    category: "A",
    phone: "9123456789",
    address: "Koramangala, Bangalore",
    image: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=200&h=200&fit=crop&crop=face",
    beatName: "East Bangalore",
    distributor: "Prime Logistics",
    lastVisitDate: "2024-01-03",
    isSelected: false,
    priority: "high",
    metrics: {
      avgOrders3Months: 16,
      avgOrderPerVisit: 3800,
      visitsIn3Months: 7,
      revenue12Months: 198000
    }
  }
];

export const CreateBeat = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAnalyticsRetailer, setSelectedAnalyticsRetailer] = useState<Retailer | null>(null);
  const [selectedRetailers, setSelectedRetailers] = useState<string[]>([]);
  const [beatName, setBeatName] = useState("");
  const [retailers, setRetailers] = useState<any[]>([]);
  const [isAddRetailerModalOpen, setIsAddRetailerModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  // Recurrence settings
  const [repeatEnabled, setRepeatEnabled] = useState(false);
  const [repeatType, setRepeatType] = useState<"daily" | "weekly" | "monthly" | "custom">("weekly");
  const [repeatDays, setRepeatDays] = useState<number[]>([1]); // 0=Sunday, 1=Monday, etc.
  const [repeatEndDate, setRepeatEndDate] = useState<Date | undefined>(undefined);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [customIntervalDays, setCustomIntervalDays] = useState<number>(15);
  const [repeatUntilMode, setRepeatUntilMode] = useState<"date" | "permanent">("date");

  const weekDays = [
    { label: "Mon", value: 1 },
    { label: "Tue", value: 2 },
    { label: "Wed", value: 3 },
    { label: "Thu", value: 4 },
    { label: "Fri", value: 5 },
    { label: "Sat", value: 6 },
    { label: "Sun", value: 0 },
  ];

  // Load retailers from database
  useEffect(() => {
    if (user) {
      loadRetailers();
    }
  }, [user]);

  const loadRetailers = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('retailers')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('name');
      
      if (error) throw error;
      setRetailers(data || []);
    } catch (error: any) {
      console.error('Error loading retailers:', error);
      toast({
        title: "Error",
        description: "Failed to load retailers",
        variant: "destructive"
      });
    }
  };

  const filteredRetailers = retailers.filter(retailer =>
    retailer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (retailer.category && retailer.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (retailer.phone && retailer.phone.includes(searchTerm))
  );

  const handleRetailerSelection = (retailerId: string) => {
    setSelectedRetailers(prev => 
      prev.includes(retailerId) 
        ? prev.filter(id => id !== retailerId)
        : [...prev, retailerId]
    );
  };

  const handleCreateBeat = async () => {
    if (!beatName.trim()) {
      toast({
        title: "Beat Name Required",
        description: "Please enter a name for the beat",
        variant: "destructive"
      });
      return;
    }

    if (selectedRetailers.length === 0) {
      toast({
        title: "No Retailers Selected",
        description: "Please select at least one retailer for the beat",
        variant: "destructive"
      });
      return;
    }

    if (repeatEnabled && repeatUntilMode === "date" && !repeatEndDate) {
      toast({
        title: "End Date Required",
        description: "Please select an end date for the recurring beat",
        variant: "destructive"
      });
      return;
    }

    if (repeatEnabled && (repeatType === "weekly" || repeatType === "monthly") && repeatDays.length === 0) {
      toast({
        title: "Days Required",
        description: `Please select at least one day for ${repeatType} recurring beats`,
        variant: "destructive"
      });
      return;
    }

    if (repeatEnabled && repeatType === "custom" && (!customIntervalDays || customIntervalDays < 1)) {
      toast({
        title: "Invalid Interval",
        description: "Please enter a valid number of days (minimum 1)",
        variant: "destructive"
      });
      return;
    }

    if (!user) {
      toast({
        title: "Authentication Error",
        description: "Please sign in to create beats",
        variant: "destructive"
      });
      return;
    }

    setIsCreating(true);

    try {
      // Create a unique beat ID
      const beatId = `beat_${Date.now()}`;
      
      // Update all selected retailers with the beat_id and beat_name
      const { error: updateError } = await supabase
        .from('retailers')
        .update({ 
          beat_id: beatId,
          beat_name: beatName 
        })
        .in('id', selectedRetailers);

      if (updateError) throw updateError;

      // Create beat plans based on recurrence settings
      if (repeatEnabled) {
        const endDate = repeatUntilMode === "permanent" ? addDays(new Date(), 365) : repeatEndDate;
        if (endDate) {
          const beatPlans = generateBeatPlans(beatId, beatName, endDate);
          
          const { error: planError } = await supabase
            .from('beat_plans')
            .insert(beatPlans);

          if (planError) throw planError;

          const untilText = repeatUntilMode === "permanent" ? "permanently" : `until ${format(endDate, 'PP')}`;
          toast({
            title: "Beat Created Successfully",
            description: `"${beatName}" created with ${selectedRetailers.length} retailers and scheduled ${untilText}`,
          });
        }
      } else {
        toast({
          title: "Beat Created Successfully",
          description: `"${beatName}" created with ${selectedRetailers.length} retailers`,
        });
      }

      // Navigate to My Visits
      navigate('/visits');
    } catch (error: any) {
      console.error('Error creating beat:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create beat",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  const generateBeatPlans = (beatId: string, beatName: string, endDate: Date) => {
    const plans = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let currentDate = new Date(today);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    while (currentDate <= end) {
      let shouldInclude = false;

      if (repeatType === "daily") {
        shouldInclude = true;
      } else if (repeatType === "weekly") {
        const dayOfWeek = currentDate.getDay();
        shouldInclude = repeatDays.includes(dayOfWeek);
      } else if (repeatType === "monthly") {
        // For monthly, use the first selected day of each month
        const dayOfWeek = currentDate.getDay();
        shouldInclude = repeatDays.includes(dayOfWeek);
      } else if (repeatType === "custom") {
        // For custom interval, include every Nth day
        const daysDiff = Math.floor((currentDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        shouldInclude = daysDiff % customIntervalDays === 0;
      }

      if (shouldInclude) {
        plans.push({
          user_id: user!.id,
          beat_id: beatId,
          beat_name: beatName,
          plan_date: format(currentDate, 'yyyy-MM-dd'),
          beat_data: {
            retailer_ids: selectedRetailers
          }
        });
      }

      // Increment date based on repeat type
      if (repeatType === "daily") {
        currentDate = addDays(currentDate, 1);
      } else if (repeatType === "weekly") {
        currentDate = addDays(currentDate, 1);
      } else if (repeatType === "monthly") {
        currentDate = addDays(currentDate, 1);
      } else if (repeatType === "custom") {
        currentDate = addDays(currentDate, 1);
      }
    }

    return plans;
  };

  const handleRetailerAdded = (retailerId: string, retailerName: string) => {
    // Add the newly created retailer to selected retailers
    setSelectedRetailers(prev => [...prev, retailerId]);
    // Reload retailers to show the new one
    loadRetailers();
  };

  const handleWeekDayToggle = (dayValue: number) => {
    setRepeatDays(prev => 
      prev.includes(dayValue)
        ? prev.filter(d => d !== dayValue)
        : [...prev, dayValue]
    );
  };

  const handleRemoveRetailer = (retailerId: string) => {
    setSelectedRetailers(prev => prev.filter(id => id !== retailerId));
  };

  const formatCurrency = (amount: number) => `₹${amount.toLocaleString()}`;

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case "high": return "bg-destructive text-destructive-foreground";
      case "medium": return "bg-warning text-warning-foreground";
      case "low": return "bg-muted text-muted-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case "supermarket": return <Store className="text-primary" size={20} />;
      case "grocery store": return <Store className="text-success" size={20} />;
      case "provision store": return <Store className="text-warning" size={20} />;
      default: return <Store className="text-muted-foreground" size={20} />;
    }
  };

  return (
    <Layout>
      <div className="p-4 space-y-4">
        {/* Header */}
        <Card className="shadow-card bg-gradient-primary text-primary-foreground">
          <CardHeader className="pb-3">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <Store size={24} />
              Create Beat
            </CardTitle>
            <p className="text-primary-foreground/80">
              Select retailers and create a new beat for planning
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold">{retailers.length}</div>
                <div className="text-sm text-primary-foreground/80">Available Retailers</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{selectedRetailers.length}</div>
                <div className="text-sm text-primary-foreground/80">Selected</div>
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {formatCurrency(retailers.filter(r => selectedRetailers.includes(r.id)).reduce((sum, r) => sum + (r.order_value || 0), 0))}
                </div>
                <div className="text-sm text-primary-foreground/80">Selected Revenue</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Beat Creation Form */}
        {selectedRetailers.length > 0 && (
          <Card className="shadow-card border-primary/20 bg-primary/5">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Create New Beat</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedRetailers([])}
                >
                  <Trash2 size={14} className="mr-1" />
                  Clear Selection
                </Button>
              </div>
              
              {/* Beat Name and Recurrence Scheduling in Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="beatName">Beat Name</Label>
                  <Input
                    id="beatName"
                    placeholder="Enter beat name (e.g., North Zone Beat)"
                    value={beatName}
                    onChange={(e) => setBeatName(e.target.value)}
                  />
                </div>
                
                {/* Recurrence Scheduling */}
                <div className="space-y-3 p-3 border rounded-lg bg-background">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="repeatEnabled"
                    checked={repeatEnabled}
                    onChange={(e) => setRepeatEnabled(e.target.checked)}
                    className="h-4 w-4 rounded border-muted"
                  />
                  <Label htmlFor="repeatEnabled" className="flex items-center gap-2 cursor-pointer">
                    <Repeat size={16} />
                    Schedule Recurring Visits
                  </Label>
                </div>

                {repeatEnabled && (
                  <div className="space-y-3 pl-6">
                    <div className="space-y-2">
                      <Label>Repeat Frequency</Label>
                      <RadioGroup value={repeatType} onValueChange={(val: any) => setRepeatType(val)}>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="daily" id="daily" />
                          <Label htmlFor="daily" className="cursor-pointer">Daily</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="weekly" id="weekly" />
                          <Label htmlFor="weekly" className="cursor-pointer">Weekly</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="monthly" id="monthly" />
                          <Label htmlFor="monthly" className="cursor-pointer">Monthly</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="custom" id="custom" />
                          <Label htmlFor="custom" className="cursor-pointer">Custom Interval</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    {repeatType === "custom" && (
                      <div className="space-y-2">
                        <Label>Repeat Every (Days) *</Label>
                        <Input
                          type="number"
                          min="1"
                          value={customIntervalDays}
                          onChange={(e) => setCustomIntervalDays(parseInt(e.target.value) || 1)}
                          placeholder="Enter number of days"
                          className="w-full"
                        />
                        <p className="text-xs text-muted-foreground">
                          Visit will repeat every {customIntervalDays} day(s)
                        </p>
                      </div>
                    )}

                    {repeatType === "weekly" && (
                      <div className="space-y-2">
                        <Label>Select Days *</Label>
                        <div className="flex flex-wrap gap-2">
                          {weekDays.map((day) => (
                            <Button
                              key={day.value}
                              type="button"
                              variant={repeatDays.includes(day.value) ? "default" : "outline"}
                              size="sm"
                              onClick={() => handleWeekDayToggle(day.value)}
                              className="w-12"
                            >
                              {day.label}
                            </Button>
                          ))}
                        </div>
                        {repeatDays.length === 0 && (
                          <p className="text-xs text-destructive">Please select at least one day</p>
                        )}
                      </div>
                    )}
                    
                    {repeatType === "monthly" && (
                      <div className="space-y-2">
                        <Label>Select Days of Month *</Label>
                        <div className="flex flex-wrap gap-2">
                          {weekDays.map((day) => (
                            <Button
                              key={day.value}
                              type="button"
                              variant={repeatDays.includes(day.value) ? "default" : "outline"}
                              size="sm"
                              onClick={() => handleWeekDayToggle(day.value)}
                              className="w-12"
                            >
                              {day.label}
                            </Button>
                          ))}
                        </div>
                        {repeatDays.length === 0 && (
                          <p className="text-xs text-destructive">Please select at least one day</p>
                        )}
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>Repeat Until</Label>
                      <RadioGroup value={repeatUntilMode} onValueChange={(val: any) => setRepeatUntilMode(val)}>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="date" id="until-date" />
                          <Label htmlFor="until-date" className="cursor-pointer">Until Date</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="permanent" id="permanent" />
                          <Label htmlFor="permanent" className="cursor-pointer">Permanent</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    {repeatUntilMode === "date" && (
                      <div className="space-y-2">
                        <Label>End Date *</Label>
                        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !repeatEndDate && "text-muted-foreground"
                              )}
                            >
                              <CalendarDays className="mr-2 h-4 w-4" />
                              {repeatEndDate ? format(repeatEndDate, "PPP") : "Select end date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={repeatEndDate}
                              onSelect={(date) => {
                                setRepeatEndDate(date);
                                setIsCalendarOpen(false);
                              }}
                              disabled={(date) => date < new Date()}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    )}

                    {repeatUntilMode === "permanent" && (
                      <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                        Visits will repeat indefinitely for this beat
                      </p>
                    )}
                  </div>
                )}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Selected Retailers ({selectedRetailers.length})</Label>
                <div className="flex flex-wrap gap-2">
                  {retailers
                    .filter(r => selectedRetailers.includes(r.id))
                    .map(retailer => (
                      <Badge
                        key={retailer.id}
                        variant="secondary"
                        className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => handleRemoveRetailer(retailer.id)}
                      >
                        {retailer.name} ×
                      </Badge>
                    ))}
                </div>
              </div>
              
              <Button onClick={handleCreateBeat} className="w-full" disabled={isCreating}>
                <Save size={16} className="mr-2" />
                {isCreating ? "Creating..." : "Create Beat"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Add Entity Buttons */}
        <Card className="shadow-card">
          <CardContent className="p-4 space-y-2">
            <Button
              variant="default"
              className="w-full"
              onClick={() => setIsAddRetailerModalOpen(true)}
              disabled={!beatName.trim()}
            >
              <Plus size={16} className="mr-2" />
              {beatName.trim() ? `Add New Retailer to ${beatName}` : "Enter Beat Name First"}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Or select existing retailers below
            </p>
          </CardContent>
        </Card>

        {/* Search */}
        <SearchInput
          placeholder="Search retailers by name, category, or phone"
          value={searchTerm}
          onChange={setSearchTerm}
        />

        {/* Retailers List */}
        <div className="space-y-3">
          {filteredRetailers.length === 0 ? (
            <Card className="shadow-card">
              <CardContent className="p-8 text-center">
                <Search size={48} className="mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold text-muted-foreground mb-2">No retailers found</h3>
                <p className="text-sm text-muted-foreground">
                  Try adjusting your search terms
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredRetailers.map((retailer) => (
              <Card 
                key={retailer.id} 
                className={`shadow-card hover:shadow-md transition-all cursor-pointer ${
                  selectedRetailers.includes(retailer.id) 
                    ? "border-primary bg-primary/5 shadow-md" 
                    : ""
                }`}
                onClick={() => handleRetailerSelection(retailer.id)}
              >
                <CardContent className="p-3">
                  <div className="flex flex-col md:flex-row gap-3">
                    {/* Mobile Header Row */}
                    <div className="flex md:hidden gap-3 items-start">
                      {/* Selection Indicator */}
                      <div className="flex-shrink-0 flex items-center">
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                          selectedRetailers.includes(retailer.id)
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-muted-foreground"
                        }`}>
                          {selectedRetailers.includes(retailer.id) && "✓"}
                        </div>
                      </div>
                      
                      {/* Retailer Image */}
                      <div className="flex-shrink-0">
                        {retailer.photo_url ? (
                          <img
                            src={retailer.photo_url}
                            alt={retailer.name}
                            className="w-12 h-12 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                            <Store size={20} className="text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-sm truncate">{retailer.name}</h3>
                            <p className="text-xs text-muted-foreground">Category {retailer.category}</p>
                          </div>
                          <Badge className={`${getPriorityColor(retailer.priority)} ml-2 flex-shrink-0`}>
                            {retailer.priority?.toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Desktop Layout */}
                    <div className="hidden md:flex gap-3 w-full">
                      {/* Selection Indicator */}
                      <div className="flex-shrink-0 flex items-center">
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                          selectedRetailers.includes(retailer.id)
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-muted-foreground"
                        }`}>
                          {selectedRetailers.includes(retailer.id) && "✓"}
                        </div>
                      </div>
                      
                      {/* Retailer Image */}
                      <div className="flex-shrink-0">
                        {retailer.photo_url ? (
                          <img
                            src={retailer.photo_url}
                            alt={retailer.name}
                            className="w-16 h-16 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
                            <Store size={24} className="text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Main Content */}
                    <div className="flex-1 space-y-2 min-w-0">
                      {/* Header Row - Desktop Only */}
                      <div className="hidden md:flex justify-between items-start">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-sm">{retailer.name}</h3>
                          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                            {retailer.category && <span>Category {retailer.category}</span>}
                            {retailer.beat_name && (
                              <div className="flex items-center gap-1">
                                <Users size={10} />
                                <span className="truncate max-w-[100px]">{retailer.beat_name}</span>
                              </div>
                            )}
                            {retailer.parent_name && (
                              <div className="flex items-center gap-1">
                                <Truck size={10} />
                                <span className="truncate max-w-[120px]">{retailer.parent_name}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <Badge className={getPriorityColor(retailer.priority)}>
                          {retailer.priority?.toUpperCase()}
                        </Badge>
                      </div>

                      {/* Beat and Distributor - Mobile Only */}
                      <div className="md:hidden space-y-1">
                        {retailer.beat_name && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Users size={10} />
                            <span className="truncate">{retailer.beat_name}</span>
                          </div>
                        )}
                        {retailer.parent_name && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Truck size={10} />
                            <span className="truncate">{retailer.parent_name}</span>
                          </div>
                        )}
                      </div>

                      {/* Contact Info */}
                      <div className="flex flex-col md:flex-row gap-1 md:gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Phone size={10} />
                          <span>{retailer.phone}</span>
                        </div>
                        <div className="flex items-center gap-1 min-w-0">
                          <MapPin size={10} />
                          <span className="truncate">{retailer.address}</span>
                        </div>
                      </div>

                      {/* Quick Highlights */}
                      <div className="bg-muted/20 rounded p-2">
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">Category</div>
                            <div className="font-semibold text-xs md:text-sm">{retailer.category || 'N/A'}</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">Order Value</div>
                            <div className="font-semibold text-xs md:text-sm">
                              ₹{((retailer.order_value || 0) / 1000).toFixed(0)}K
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">Pending</div>
                            <div className="font-semibold text-xs md:text-sm">
                              ₹{((retailer.pending_amount || 0) / 1000).toFixed(1)}K
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Action Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full h-8 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAnalyticsRetailer(retailer);
                        }}
                      >
                        <BarChart3 size={12} className="mr-1" />
                        View Analytics
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Analytics Modal */}
        {selectedAnalyticsRetailer && (
          <RetailerAnalytics
            isOpen={!!selectedAnalyticsRetailer}
            retailer={selectedAnalyticsRetailer}
            onClose={() => setSelectedAnalyticsRetailer(null)}
          />
        )}
        
        {/* Add Retailer Modal */}
        <AddRetailerInlineToBeat
          open={isAddRetailerModalOpen}
          onClose={() => setIsAddRetailerModalOpen(false)}
          beatName={beatName}
          onRetailerAdded={handleRetailerAdded}
        />
      </div>
    </Layout>
  );
};
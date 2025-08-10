import { useState, useEffect } from "react";
import { Calendar, FileText, Plus, TrendingUp, Route, CheckCircle } from "lucide-react";
import { SearchInput } from "@/components/SearchInput";
import { VisitCard } from "@/components/VisitCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Visit {
  id: string;
  retailerName: string;
  address: string;
  phone: string;
  retailerCategory: string;
  status: "planned" | "in-progress" | "productive" | "unproductive" | "store-closed" | "cancelled";
  visitType: string;
  time?: string;
  day?: string;
  checkInStatus?: "not-checked-in" | "checked-in-correct" | "checked-in-wrong-location";
  hasOrder?: boolean;
  orderValue?: number;
  noOrderReason?: "over-stocked" | "owner-not-available" | "store-closed" | "permanently-closed";
  distributor?: string;
}

const mockVisits: Visit[] = [
  {
    id: "1",
    retailerName: "Vardhman Kirana",
    address: "Indiranagar, Bangalore",
    phone: "9926612072",
    retailerCategory: "Category A",
    status: "in-progress",
    visitType: "First Visit",
    time: "10:00 AM",
    day: "Today",
    checkInStatus: "checked-in-correct",
    hasOrder: true,
    orderValue: 15000,
    distributor: "ABC Distributors"
  },
  {
    id: "2",
    retailerName: "Sham Kirana and General Stores",
    address: "34 A, Kharghar, Navi Mumbai, Maharashtra 410210, Karnataka",
    phone: "9926963147",
    retailerCategory: "Category B", 
    status: "planned",
    visitType: "Negotiation",
    time: "2:00 PM",
    day: "Today",
    checkInStatus: "not-checked-in",
    hasOrder: false,
    distributor: "XYZ Distributors"
  },
  {
    id: "3",
    retailerName: "Mahesh Kirana and General Stores", 
    address: "MG Road, Bangalore",
    phone: "9955551112",
    retailerCategory: "Category A",
    status: "productive",
    visitType: "First Visit",
    time: "9:00 AM",
    day: "Today",
    checkInStatus: "checked-in-correct",
    hasOrder: true,
    orderValue: 22000,
    distributor: "ABC Distributors"
  },
  {
    id: "4",
    retailerName: "Balaji Kiranad",
    address: "Commercial Street, Bangalore", 
    phone: "9516584711",
    retailerCategory: "Category C",
    status: "unproductive",
    visitType: "Follow-up",
    time: "11:00 AM",
    day: "Today",
    checkInStatus: "checked-in-wrong-location",
    hasOrder: false,
    noOrderReason: "over-stocked",
    distributor: "PQR Distributors"
  },
  {
    id: "5",
    retailerName: "New Mart",
    address: "Brigade Road, Bangalore", 
    phone: "9876543210",
    retailerCategory: "Category B",
    status: "store-closed",
    visitType: "Follow-up",
    time: "3:00 PM",
    day: "Today",
    checkInStatus: "checked-in-correct",
    hasOrder: false,
    noOrderReason: "store-closed",
    distributor: "ABC Distributors"
  }
];

const getWeekDays = () => {
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay()); // Start from Sunday
  
  const weekDays = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(startOfWeek);
    day.setDate(startOfWeek.getDate() + i);
    
    const isToday = day.toDateString() === new Date().toDateString();
    
    weekDays.push({
      day: day.toLocaleDateString('en-US', { weekday: 'short' }),
      date: day.getDate().toString(),
      isToday: isToday,
      isoDate: day.toISOString().split('T')[0]
    });
  }
  return weekDays;
};

export const MyVisits = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDay, setSelectedDay] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [weekDays, setWeekDays] = useState(getWeekDays());
  const [plannedBeats, setPlannedBeats] = useState<any[]>([]);
  const [retailers, setRetailers] = useState<any[]>([]);
  const [plannedDates, setPlannedDates] = useState<Set<string>>(new Set());
  const [currentBeatName, setCurrentBeatName] = useState("No beats planned");
  const { user } = useAuth();

  // Initialize selected day to today
  useEffect(() => {
    const today = weekDays.find(d => d.isToday);
    if (today && !selectedDay) {
      setSelectedDay(today.day);
      setSelectedDate(today.isoDate);
    }
  }, [weekDays, selectedDay]);

  // Load beat plans and retailers when user or date changes
  useEffect(() => {
    if (user && selectedDate) {
      loadPlannedBeats(selectedDate);
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

  const loadPlannedBeats = async (date: string) => {
    if (!user) return;
    
    try {
      const { data: beatPlans, error } = await supabase
        .from('beat_plans')
        .select('*')
        .eq('user_id', user.id)
        .eq('plan_date', date);

      if (error) throw error;

      setPlannedBeats(beatPlans || []);

      // Update beat name based on planned beats
      if (beatPlans && beatPlans.length > 0) {
        const beatNames = beatPlans.map(plan => plan.beat_name).join(', ');
        setCurrentBeatName(beatNames);
        
        // Load retailers for the planned beats
        const beatIds = beatPlans.map(plan => plan.beat_id);
        loadRetailersForBeats(beatIds);
      } else {
        setCurrentBeatName("No beats planned");
        setRetailers([]);
      }
    } catch (error) {
      console.error('Error loading beat plans:', error);
    }
  };

  const loadRetailersForBeats = async (beatIds: string[]) => {
    if (!user || beatIds.length === 0) return;
    try {
      const { data, error } = await supabase
        .from('retailers')
        .select('*')
        .eq('user_id', user.id)
        .in('beat_id', beatIds);
      if (error) throw error;

      const transformedRetailers = (data || []).map(retailer => ({
        id: retailer.id,
        retailerId: retailer.id,
        retailerName: retailer.name,
        address: retailer.address,
        phone: retailer.phone || '',
        retailerCategory: retailer.category || 'Category A',
        status: 'planned' as const,
        visitType: 'Regular Visit',
        day: 'Today',
        checkInStatus: 'not-checked-in' as const,
        hasOrder: false,
        orderValue: 0,
        retailerLat: retailer.latitude != null ? Number(retailer.latitude) : undefined,
        retailerLng: retailer.longitude != null ? Number(retailer.longitude) : undefined,
      }));

      // Derive today's visit and order status
      const retailerIds = (data || []).map(r => r.id);
      const todayStart = new Date(selectedDate || new Date().toISOString().split('T')[0]);
      todayStart.setHours(0,0,0,0);
      const todayEnd = new Date(selectedDate || new Date().toISOString().split('T')[0]);
      todayEnd.setHours(23,59,59,999);

      const [{ data: visitsToday }, { data: ordersToday }] = await Promise.all([
        supabase
          .from('visits')
          .select('id, retailer_id, check_in_time, status')
          .eq('user_id', user.id)
          .eq('planned_date', (selectedDate || new Date().toISOString().split('T')[0]))
          .in('retailer_id', retailerIds),
        supabase
          .from('orders')
          .select('id, retailer_id, total_amount, created_at')
          .eq('user_id', user.id)
          .eq('status', 'confirmed')
          .in('retailer_id', retailerIds)
          .gte('created_at', todayStart.toISOString())
          .lte('created_at', todayEnd.toISOString()),
      ]);

      const checkedInRetailers = new Set((visitsToday || []).filter(v => v.check_in_time).map(v => v.retailer_id));
      const statusByRetailer = new Map<string, string>();
      (visitsToday || []).forEach(v => {
        if (v.retailer_id && v.status) statusByRetailer.set(v.retailer_id as string, v.status as string);
      });
      const totalsByRetailer = new Map<string, number>();
      (ordersToday || []).forEach(o => {
        if (!o.retailer_id) return;
        totalsByRetailer.set(o.retailer_id, (totalsByRetailer.get(o.retailer_id) || 0) + Number(o.total_amount || 0));
      });

      const finalRetailers = transformedRetailers.map(v => {
        const hasCheckIn = checkedInRetailers.has(v.retailerId);
        const orderTotal = totalsByRetailer.get(v.retailerId || '') || 0;
        const hasOrder = orderTotal > 0;
        const recordedStatus = statusByRetailer.get(v.retailerId || '');
        const status = hasOrder
          ? ('productive' as const)
          : (recordedStatus === 'unproductive'
              ? ('unproductive' as const)
              : (hasCheckIn ? ('in-progress' as const) : ('planned' as const)));
        return {
          ...v,
          hasOrder,
          orderValue: orderTotal,
          status,
        };
      });

      setRetailers(finalRetailers);
    } catch (error) {
      console.error('Error loading retailers:', error);
    }
  };

  const handleDayChange = (day: string) => {
    setSelectedDay(day);
    const dayInfo = weekDays.find(d => d.day === day);
    if (dayInfo) {
      setSelectedDate(dayInfo.isoDate);
    }
  };

  // Show visits for selected date based on planned beats
  const allVisits = retailers;

  const filteredVisits = allVisits.filter(visit => {
    const matchesSearch = visit.retailerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      visit.phone.includes(searchTerm);
    const matchesStatus = !statusFilter || visit.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const visitsForSelectedDate = retailers;
  const plannedVisits = visitsForSelectedDate.filter(visit => visit.status === "planned").length;
  const productiveVisits = visitsForSelectedDate.filter(visit => visit.status === "productive").length;
  const pendingVisits = visitsForSelectedDate.filter(visit => visit.status === "in-progress").length;
  const totalOrdersToday = visitsForSelectedDate.filter(visit => visit.hasOrder).length;

  const handleViewDetails = (visitId: string) => {
    window.location.href = `/visit/${visitId}`;
  };

  const handleStatusClick = (status: string) => {
    setStatusFilter(statusFilter === status ? "" : status);
  };

  return (
    <Layout>
      <div className="p-4 space-y-4">
        {/* Header Card */}
        <Card className="shadow-card bg-gradient-primary text-primary-foreground">
          <CardHeader className="pb-3">
            <div>
              <CardTitle className="text-xl font-bold">My Visits</CardTitle>
              <p className="text-lg font-semibold mt-1">{currentBeatName}</p>
            </div>
            <p className="text-primary-foreground/80">Manage your daily visit schedule</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Weekly Calendar */}
            <div className="grid grid-cols-7 gap-2">
              {weekDays.map((dayInfo) => (
                <button
                  key={dayInfo.day}
                  onClick={() => handleDayChange(dayInfo.day)}
                  className={`relative p-2 rounded-lg text-center transition-colors ${
                    dayInfo.isToday || selectedDay === dayInfo.day
                      ? 'bg-primary-foreground text-primary'
                      : 'bg-primary-foreground/10 hover:bg-primary-foreground/20'
                  }`}
                >
                  <div className="text-xs font-medium">{dayInfo.day}</div>
                  <div className="text-lg font-bold">{dayInfo.date}</div>
                  {plannedDates.has(dayInfo.isoDate) && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-success" />
                  )}
                </button>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-2 mb-2">
              <Button 
                variant="secondary" 
                size="sm" 
                className="bg-primary-foreground/10 text-primary-foreground border-primary-foreground/20 hover:bg-primary-foreground/20"
                onClick={() => window.location.href = '/today-summary'}
              >
                <FileText size={16} className="mr-1" />
                Today's Summary
              </Button>
              <Button 
                variant="secondary" 
                size="sm"
                className="bg-primary-foreground/10 text-primary-foreground border-primary-foreground/20 hover:bg-primary-foreground/20"
                onClick={() => window.location.href = '/add-retailer'}
              >
                <Plus size={16} className="mr-1" />
                Add Retailer
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <Button 
                variant="secondary" 
                size="sm"
                className="bg-primary-foreground/10 text-primary-foreground border-primary-foreground/20 hover:bg-primary-foreground/20"
                onClick={() => window.location.href = '/beat-analytics'}
              >
                <TrendingUp size={16} className="mr-1" />
                Beat Analytics
              </Button>
              <Button 
                variant="secondary" 
                size="sm"
                className="bg-primary-foreground/10 text-primary-foreground border-primary-foreground/20 hover:bg-primary-foreground/20"
                onClick={() => window.location.href = '/add-beat'}
              >
                <Plus size={16} className="mr-1" />
                Add Beat
              </Button>
            </div>
            <div className="grid grid-cols-1">
              <Button 
                variant="secondary" 
                size="sm"
                className="bg-primary-foreground/10 text-primary-foreground border-primary-foreground/20 hover:bg-primary-foreground/20"
                onClick={() => window.location.href = '/visits'}
              >
                <Route size={16} className="mr-1" />
                Journey Plan
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Progress Card */}
        <Card className="shadow-card bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg text-primary">Today's Progress</h3>
              <div className="text-sm text-muted-foreground">
                {(selectedDate ? new Date(selectedDate) : new Date()).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
              </div>
            </div>
            
            {/* Key Metrics Row */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-gradient-to-r from-success/10 to-success/5 p-4 rounded-xl border border-success/20">
                <div className="text-2xl font-bold text-success">₹{visitsForSelectedDate.reduce((sum, visit) => sum + (visit.orderValue || 0), 0).toLocaleString()}</div>
                <div className="text-sm text-success/80 font-medium">Total Order Value</div>
              </div>
              <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-4 rounded-xl border border-primary/20">
                <div className="text-2xl font-bold text-primary">{totalOrdersToday}</div>
                <div className="text-sm text-primary/80 font-medium">Orders Placed</div>
              </div>
            </div>
            
            {/* Visit Status Grid */}
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleStatusClick("planned")}
                className={`p-3 rounded-xl text-center transition-all transform hover:scale-105 ${
                  statusFilter === "planned" 
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25" 
                    : "bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-150 border border-blue-200"
                }`}
              >
                <div className="text-xl font-bold">{plannedVisits}</div>
                <div className="text-xs font-medium opacity-80">Planned</div>
              </button>
              
              <button
                onClick={() => handleStatusClick("productive")}
                className={`p-3 rounded-xl text-center transition-all transform hover:scale-105 ${
                  statusFilter === "productive" 
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25" 
                    : "bg-gradient-to-br from-green-50 to-green-100 hover:from-green-100 hover:to-green-150 border border-green-200"
                }`}
              >
                <div className="text-xl font-bold">{productiveVisits}</div>
                <div className="text-xs font-medium opacity-80">Productive</div>
              </button>
              
              <button
                onClick={() => handleStatusClick("in-progress")}
                className={`p-3 rounded-xl text-center transition-all transform hover:scale-105 ${
                  statusFilter === "in-progress" 
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25" 
                    : "bg-gradient-to-br from-orange-50 to-orange-100 hover:from-orange-100 hover:to-orange-150 border border-orange-200"
                }`}
              >
                <div className="text-xl font-bold">{pendingVisits}</div>
                <div className="text-xs font-medium opacity-80">Pending</div>
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Search */}
        <SearchInput
          placeholder="Search visits by name or status"
          value={searchTerm}
          onChange={setSearchTerm}
        />

        {/* Visits List */}
        <div className="space-y-3">
          {filteredVisits.length === 0 ? (
            <Card className="shadow-card">
              <CardContent className="p-8 text-center">
                <Calendar size={48} className="mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold text-muted-foreground mb-2">No visits found</h3>
                <p className="text-sm text-muted-foreground">
                  Try adjusting your search or create a new visit
                </p>
                <Button className="mt-4">
                  <Plus size={16} className="mr-2" />
                  Create New Visit
                </Button>
              </CardContent>
            </Card>
          ) : (
            filteredVisits.map((visit) => (
              <VisitCard
                key={visit.id}
                visit={visit}
                onViewDetails={handleViewDetails}
              />
            ))
          )}
        </div>
      </div>
    </Layout>
  );
};
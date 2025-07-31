import { useState } from "react";
import { Calendar, MapPin, TrendingUp, Users, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Layout } from "@/components/Layout";
import { useNavigate } from "react-router-dom";

interface Beat {
  id: string;
  name: string;
  lastVisited: string;
  retailerCount: number;
  avgSalesPerVisit: string;
  category: "all" | "recommended" | "high-performing";
  priority: "high" | "medium" | "low";
  totalRevenue: string;
  visitHistory: number;
}

const mockBeats: Beat[] = [
  {
    id: "1",
    name: "M.G. Road Beat",
    lastVisited: "July 15, 2025",
    retailerCount: 40,
    avgSalesPerVisit: "₹5,585",
    category: "high-performing",
    priority: "high",
    totalRevenue: "₹2,23,400",
    visitHistory: 8
  },
  {
    id: "2", 
    name: "Commercial Street Beat",
    lastVisited: "July 12, 2025",
    retailerCount: 35,
    avgSalesPerVisit: "₹4,720",
    category: "recommended",
    priority: "medium",
    totalRevenue: "₹1,65,200",
    visitHistory: 6
  },
  {
    id: "3",
    name: "Indiranagar Beat",
    lastVisited: "July 10, 2025", 
    retailerCount: 28,
    avgSalesPerVisit: "₹6,150",
    category: "high-performing",
    priority: "high",
    totalRevenue: "₹1,72,200",
    visitHistory: 7
  },
  {
    id: "4",
    name: "Koramangala Beat",
    lastVisited: "July 8, 2025",
    retailerCount: 32,
    avgSalesPerVisit: "₹3,890",
    category: "recommended", 
    priority: "medium",
    totalRevenue: "₹1,24,480",
    visitHistory: 5
  },
  {
    id: "5",
    name: "Whitefield Beat",
    lastVisited: "July 5, 2025",
    retailerCount: 22,
    avgSalesPerVisit: "₹2,950",
    category: "all",
    priority: "low",
    totalRevenue: "₹64,900",
    visitHistory: 3
  }
];

const weekDays = [
  { day: "Mon", date: "21", fullDate: "July 21" },
  { day: "Tue", date: "22", fullDate: "July 22" },
  { day: "Wed", date: "23", fullDate: "July 23" },
  { day: "Thu", date: "24", fullDate: "July 24" },
  { day: "Fri", date: "25", fullDate: "July 25" },
  { day: "Sat", date: "26", fullDate: "July 26" },
  { day: "Sun", date: "27", fullDate: "July 27" }
];

export const BeatPlanning = () => {
  const [selectedCategory, setSelectedCategory] = useState<"all" | "recommended" | "high-performing">("all");
  const [selectedDay, setSelectedDay] = useState("Mon");
  const [plannedBeats, setPlannedBeats] = useState<{[key: string]: string[]}>({});
  const navigate = useNavigate();

  const filteredBeats = mockBeats.filter(beat => 
    selectedCategory === "all" ? true : beat.category === selectedCategory
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
                  onClick={() => setSelectedDay(dayInfo.day)}
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

        {/* Category Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          <Button
            variant={selectedCategory === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory("all")}
            className="whitespace-nowrap"
          >
            All Beats ({mockBeats.length})
          </Button>
          <Button
            variant={selectedCategory === "recommended" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory("recommended")}
            className="whitespace-nowrap"
          >
            Recommended ({mockBeats.filter(b => b.category === "recommended").length})
          </Button>
          <Button
            variant={selectedCategory === "high-performing" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory("high-performing")}
            className="whitespace-nowrap"
          >
            High Performing ({mockBeats.filter(b => b.category === "high-performing").length})
          </Button>
        </div>

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
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="flex items-center justify-center mb-1">
                      <Users size={16} className="text-primary mr-1" />
                    </div>
                    <div className="text-lg font-bold text-primary">{beat.retailerCount}</div>
                    <div className="text-xs text-muted-foreground">Retailers</div>
                  </div>
                  <div>
                    <div className="flex items-center justify-center mb-1">
                      <TrendingUp size={16} className="text-success mr-1" />
                    </div>
                    <div className="text-lg font-bold text-success">{beat.avgSalesPerVisit}</div>
                    <div className="text-xs text-muted-foreground">Avg per Visit</div>
                  </div>
                  <div>
                    <div className="flex items-center justify-center mb-1">
                      <Calendar size={16} className="text-warning mr-1" />
                    </div>
                    <div className="text-lg font-bold text-warning">{beat.visitHistory}</div>
                    <div className="text-xs text-muted-foreground">Past Visits</div>
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
                      Ready to view retailers?
                    </div>
                  </div>
                  <Button 
                    variant="secondary"
                    onClick={handleProceedToRetailers}
                    className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"
                  >
                    <MapPin size={16} className="mr-2" />
                    View Retailers
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
};
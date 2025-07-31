import { useState } from "react";
import { Calendar, FileText, Plus, TrendingUp } from "lucide-react";
import { SearchInput } from "@/components/SearchInput";
import { VisitCard } from "@/components/VisitCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Layout } from "@/components/Layout";

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
    hasOrder: true
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
    hasOrder: false
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
    hasOrder: true
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
    hasOrder: false
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
    hasOrder: false
  }
];

const weekDays = [
  { day: "Sun", date: "20", isToday: false },
  { day: "Mon", date: "21", isToday: false },
  { day: "Tue", date: "22", isToday: false },
  { day: "Wed", date: "23", isToday: true },
  { day: "Thu", date: "24", isToday: false },
  { day: "Fri", date: "25", isToday: false },
  { day: "Sat", date: "26", isToday: false }
];

export const MyVisits = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDay, setSelectedDay] = useState("Wed");
  const [statusFilter, setStatusFilter] = useState<string>("");

  const filteredVisits = mockVisits.filter(visit => {
    const matchesSearch = visit.retailerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      visit.phone.includes(searchTerm);
    const matchesStatus = !statusFilter || visit.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const todayVisits = mockVisits.filter(visit => visit.day === "Today");
  const plannedVisits = todayVisits.filter(visit => visit.status === "planned").length;
  const productiveVisits = todayVisits.filter(visit => visit.status === "productive").length;
  const pendingVisits = todayVisits.filter(visit => visit.status === "in-progress").length;
  const totalOrdersToday = todayVisits.filter(visit => visit.hasOrder).length;

  const handleViewDetails = (visitId: string) => {
    // You could use navigate(`/visit/${visitId}`) here with useNavigate
    console.log("View details for visit:", visitId);
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
            <CardTitle className="text-xl font-bold">My Visits</CardTitle>
            <p className="text-primary-foreground/80">Manage your daily visit schedule</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Weekly Calendar */}
            <div className="grid grid-cols-7 gap-2">
              {weekDays.map((dayInfo) => (
                <button
                  key={dayInfo.day}
                  onClick={() => setSelectedDay(dayInfo.day)}
                  className={`p-2 rounded-lg text-center transition-colors ${
                    dayInfo.isToday || selectedDay === dayInfo.day
                      ? 'bg-primary-foreground text-primary'
                      : 'bg-primary-foreground/10 hover:bg-primary-foreground/20'
                  }`}
                >
                  <div className="text-xs font-medium">{dayInfo.day}</div>
                  <div className="text-lg font-bold">{dayInfo.date}</div>
                </button>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-3 gap-2">
              <Button 
                variant="secondary" 
                size="sm" 
                className="bg-primary-foreground/10 text-primary-foreground border-primary-foreground/20 hover:bg-primary-foreground/20"
              >
                <FileText size={16} className="mr-1" />
                Summary PDF
              </Button>
              <Button 
                variant="secondary" 
                size="sm"
                className="bg-primary-foreground/10 text-primary-foreground border-primary-foreground/20 hover:bg-primary-foreground/20"
              >
                <Plus size={16} className="mr-1" />
                New Visit
              </Button>
              <Button 
                variant="secondary" 
                size="sm"
                className="bg-primary-foreground/10 text-primary-foreground border-primary-foreground/20 hover:bg-primary-foreground/20"
              >
                <TrendingUp size={16} className="mr-1" />
                Analytics
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Progress Card */}
        <Card className="shadow-card">
          <CardContent className="p-4">
            <h3 className="font-semibold mb-4">Today's Progress</h3>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => handleStatusClick("planned")}
                className={`p-3 rounded-lg text-left transition-colors ${
                  statusFilter === "planned" 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-muted hover:bg-muted/80"
                }`}
              >
                <div className="text-2xl font-bold">{plannedVisits}</div>
                <div className="text-sm opacity-80">Planned Visits</div>
              </button>
              
              <button
                onClick={() => handleStatusClick("productive")}
                className={`p-3 rounded-lg text-left transition-colors ${
                  statusFilter === "productive" 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-muted hover:bg-muted/80"
                }`}
              >
                <div className="text-2xl font-bold">{productiveVisits}</div>
                <div className="text-sm opacity-80">Productive Visits</div>
              </button>
              
              <button
                onClick={() => handleStatusClick("in-progress")}
                className={`p-3 rounded-lg text-left transition-colors ${
                  statusFilter === "in-progress" 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-muted hover:bg-muted/80"
                }`}
              >
                <div className="text-2xl font-bold">{pendingVisits}</div>
                <div className="text-sm opacity-80">Pending Visits</div>
              </button>
              
              <div className="p-3 rounded-lg bg-success/10 text-success">
                <div className="text-2xl font-bold">{totalOrdersToday}</div>
                <div className="text-sm opacity-80">Total Orders</div>
              </div>
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
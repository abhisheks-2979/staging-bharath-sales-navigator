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
  accountType: string;
  status: "planned" | "in-progress" | "completed" | "not-started";
  visitType: string;
  time?: string;
  day?: string;
}

const mockVisits: Visit[] = [
  {
    id: "1",
    retailerName: "Vardhman Kirana",
    address: "Indiranagar, Bangalore",
    phone: "9926612072",
    accountType: "Retailers",
    status: "in-progress",
    visitType: "First Visit",
    time: "10:00 AM",
    day: "Today"
  },
  {
    id: "2",
    retailerName: "Sham Kirana and General Stores",
    address: "34 A, Kharghar, Navi Mumbai, Maharashtra 410210, Karnataka",
    phone: "9926963147",
    accountType: "Small and Medium Businesses", 
    status: "planned",
    visitType: "Negotiation",
    time: "2:00 PM",
    day: "Today"
  },
  {
    id: "3",
    retailerName: "Mahesh Kirana and General Stores", 
    address: "MG Road, Bangalore",
    phone: "9955551112",
    accountType: "Retailers",
    status: "completed",
    visitType: "First Visit",
    time: "9:00 AM",
    day: "Yesterday"
  },
  {
    id: "4",
    retailerName: "Balaji Kiranad",
    address: "Commercial Street, Bangalore", 
    phone: "9516584711",
    accountType: "Retailers",
    status: "planned",
    visitType: "Follow-up",
    time: "11:00 AM",
    day: "Tomorrow"
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

  const filteredVisits = mockVisits.filter(visit =>
    visit.retailerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    visit.phone.includes(searchTerm)
  );

  const todayVisits = filteredVisits.filter(visit => visit.day === "Today");
  const completedToday = todayVisits.filter(visit => visit.status === "completed").length;
  const totalToday = todayVisits.length;

  const handleViewDetails = (visitId: string) => {
    // You could use navigate(`/visit/${visitId}`) here with useNavigate
    console.log("View details for visit:", visitId);
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
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-semibold">Today's Progress</h3>
                <p className="text-sm text-muted-foreground">
                  {completedToday} of {totalToday} visits completed
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-primary">
                  {totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 0}%
                </div>
                <div className="w-20 h-2 bg-muted rounded-full mt-1">
                  <div 
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${totalToday > 0 ? (completedToday / totalToday) * 100 : 0}%` }}
                  />
                </div>
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
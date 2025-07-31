import { useState } from "react";
import { Search, Store, TrendingUp, BarChart3, Calendar, Phone, MapPin, Users, Truck } from "lucide-react";
import { SearchInput } from "@/components/SearchInput";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Layout } from "@/components/Layout";
import { RetailerAnalytics } from "@/components/RetailerAnalytics";

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

export const Retailers = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAnalyticsRetailer, setSelectedAnalyticsRetailer] = useState<Retailer | null>(null);

  const filteredRetailers = mockRetailers.filter(retailer =>
    retailer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    retailer.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    retailer.phone.includes(searchTerm)
  );

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
              All Retailers
            </CardTitle>
            <p className="text-primary-foreground/80">
              Manage and analyze your retailer relationships
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold">{mockRetailers.length}</div>
                <div className="text-sm text-primary-foreground/80">Total Retailers</div>
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {formatCurrency(mockRetailers.reduce((sum, r) => sum + r.metrics.revenue12Months, 0))}
                </div>
                <div className="text-sm text-primary-foreground/80">Total Revenue</div>
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {Math.round(mockRetailers.reduce((sum, r) => sum + r.metrics.visitsIn3Months, 0) / mockRetailers.length)}
                </div>
                <div className="text-sm text-primary-foreground/80">Avg Visits</div>
              </div>
            </div>
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
              <Card key={retailer.id} className="shadow-card hover:shadow-md transition-all">
                <CardContent className="p-3">
                  <div className="flex gap-3">
                    {/* Retailer Image */}
                    <div className="flex-shrink-0">
                      <img
                        src={retailer.image}
                        alt={retailer.name}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                    </div>
                    
                    {/* Main Content */}
                    <div className="flex-1 space-y-2">
                      {/* Header Row */}
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-sm">{retailer.name}</h3>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>Category {retailer.category}</span>
                            <div className="flex items-center gap-1">
                              <Users size={10} />
                              <span>{retailer.beatName}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Truck size={10} />
                              <span>{retailer.distributor}</span>
                            </div>
                          </div>
                        </div>
                        <Badge className={getPriorityColor(retailer.priority)}>
                          {retailer.priority?.toUpperCase()}
                        </Badge>
                      </div>

                      {/* Contact Info */}
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Phone size={10} />
                          <span>{retailer.phone}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin size={10} />
                          <span className="truncate">{retailer.address}</span>
                        </div>
                      </div>

                      {/* Quick Highlights */}
                      <div className="bg-muted/20 rounded p-2">
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">3M Visits</div>
                            <div className="font-semibold text-sm">{retailer.metrics.visitsIn3Months}</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">12M Revenue</div>
                            <div className="font-semibold text-sm">
                              {formatCurrency(retailer.metrics.revenue12Months)}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">Avg Order</div>
                            <div className="font-semibold text-sm">
                              {formatCurrency(retailer.metrics.avgOrderPerVisit)}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Action Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full h-8 text-xs"
                        onClick={() => setSelectedAnalyticsRetailer(retailer)}
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
            retailer={selectedAnalyticsRetailer}
            onClose={() => setSelectedAnalyticsRetailer(null)}
          />
        )}
      </div>
    </Layout>
  );
};
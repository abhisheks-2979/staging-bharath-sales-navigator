import { useState } from "react";
import { Search, Store, TrendingUp, BarChart3, Calendar, Phone, MapPin } from "lucide-react";
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
  category: string;
  phone: string;
  address: string;
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
    category: "General Store",
    phone: "9926612072",
    address: "Indiranagar, Bangalore",
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
    category: "Grocery Store",
    phone: "9926963147",
    address: "34 A, Kharghar, Navi Mumbai, Maharashtra",
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
    category: "General Store", 
    phone: "9955551112",
    address: "MG Road, Bangalore",
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
    category: "Supermarket",
    phone: "9516584711", 
    address: "Commercial Street, Bangalore",
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
    category: "General Store",
    phone: "9876543210",
    address: "Jayanagar, Bangalore", 
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
    category: "Provision Store",
    phone: "9123456789",
    address: "Koramangala, Bangalore",
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
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {/* Header Row */}
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                          {getCategoryIcon(retailer.category)}
                        </div>
                        <div>
                          <h3 className="font-semibold">{retailer.name}</h3>
                          <p className="text-sm text-muted-foreground">{retailer.category}</p>
                        </div>
                      </div>
                      <Badge className={getPriorityColor(retailer.priority)}>
                        {retailer.priority?.toUpperCase()}
                      </Badge>
                    </div>

                    {/* Contact Info */}
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Phone size={14} />
                        <span>{retailer.phone}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin size={14} />
                        <span>{retailer.address}</span>
                      </div>
                    </div>

                    {/* Quick Highlight Section */}
                    <div className="bg-muted/30 rounded-lg p-3">
                      <h4 className="font-medium text-sm mb-2">Quick Highlights</h4>
                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div>
                          <div className="flex items-center justify-center gap-1 mb-1">
                            <Calendar size={12} className="text-primary" />
                            <span className="text-xs text-muted-foreground">3M Visits</span>
                          </div>
                          <div className="font-semibold text-sm">{retailer.metrics.visitsIn3Months}</div>
                        </div>
                        <div>
                          <div className="flex items-center justify-center gap-1 mb-1">
                            <TrendingUp size={12} className="text-success" />
                            <span className="text-xs text-muted-foreground">12M Revenue</span>
                          </div>
                          <div className="font-semibold text-sm">
                            {formatCurrency(retailer.metrics.revenue12Months)}
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center justify-center gap-1 mb-1">
                            <Store size={12} className="text-warning" />
                            <span className="text-xs text-muted-foreground">Avg Order</span>
                          </div>
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
                      className="w-full"
                      onClick={() => setSelectedAnalyticsRetailer(retailer)}
                    >
                      <BarChart3 size={16} className="mr-2" />
                      View Retailer Analytics
                    </Button>
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
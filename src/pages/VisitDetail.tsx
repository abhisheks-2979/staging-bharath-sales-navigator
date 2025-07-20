import { ArrowLeft, CheckCircle, Clock, MapPin, Phone, ShoppingCart, TrendingUp, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Layout } from "@/components/Layout";
import { useNavigate } from "react-router-dom";

export const VisitDetail = () => {
  const navigate = useNavigate();

  const retailerData = {
    name: "Sham Kirana and General Stores",
    address: "34 A, Kharghar, Navi Mumbai, Maharashtra 410210",
    phone: "9926963147",
    accountType: "Small and Medium Businesses",
    status: "Negotiation",
    lastOrder: "₹12,450",
    lastVisit: "3 days ago"
  };

  const quickInsights = [
    { label: "Monthly Revenue", value: "₹45,200", trend: "+12%" },
    { label: "Order Frequency", value: "2x/week", trend: "+5%" },
    { label: "Popular Category", value: "Beverages", trend: "85%" },
    { label: "Payment Terms", value: "30 days", trend: "On time" }
  ];

  const schemes = [
    {
      id: "1",
      title: "Summer Special - Cold Drinks",
      description: "Buy 5 cases, get 1 free + 5% extra margin",
      validity: "Valid till 31st May",
      priority: "high"
    },
    {
      id: "2", 
      title: "Volume Bonus - Carbonated Drinks",
      description: "Order above ₹25,000 and get 3% cashback",
      validity: "Valid till 15th June",
      priority: "medium"
    }
  ];

  return (
    <Layout>
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="p-2"
          >
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Visit Details</h1>
            <p className="text-sm text-muted-foreground">Plan your visit strategy</p>
          </div>
        </div>

        {/* Retailer Info Card */}
        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-lg">{retailerData.name}</CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline">{retailerData.accountType}</Badge>
                  <Badge className="bg-warning text-warning-foreground">
                    {retailerData.status}
                  </Badge>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 gap-2">
              <div className="flex items-start gap-2 text-sm">
                <MapPin size={16} className="mt-0.5 text-muted-foreground flex-shrink-0" />
                <span>{retailerData.address}</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <Phone size={16} className="text-muted-foreground" />
                <span>{retailerData.phone}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2 border-t">
              <div>
                <p className="text-xs text-muted-foreground">Last Order</p>
                <p className="font-semibold">{retailerData.lastOrder}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Last Visit</p>
                <p className="font-semibold">{retailerData.lastVisit}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Intelligence */}
        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp size={20} className="text-primary" />
              Quick Intelligence
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {quickInsights.map((insight, index) => (
                <div key={index} className="space-y-1">
                  <p className="text-xs text-muted-foreground">{insight.label}</p>
                  <p className="font-semibold">{insight.value}</p>
                  <p className="text-xs text-success">{insight.trend}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Button className="h-12 shadow-button">
            <CheckCircle size={18} className="mr-2" />
            Check-In
          </Button>
          <Button variant="outline" className="h-12">
            <Clock size={18} className="mr-2" />
            Start Call
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" className="h-12">
            <ShoppingCart size={18} className="mr-2" />
            View Orders
          </Button>
          <Button variant="outline" className="h-12">
            <TrendingUp size={18} className="mr-2" />
            Schemes
          </Button>
        </div>

        {/* Recommended Schemes */}
        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Recommended Schemes</CardTitle>
            <p className="text-sm text-muted-foreground">Push these offers to maximize sales</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {schemes.map((scheme) => (
              <Card key={scheme.id} className="border-l-4 border-l-primary">
                <CardContent className="p-3">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-sm">{scheme.title}</h4>
                    <Badge 
                      className={scheme.priority === "high" 
                        ? "bg-destructive text-destructive-foreground" 
                        : "bg-warning text-warning-foreground"
                      }
                    >
                      {scheme.priority}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {scheme.description}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {scheme.validity}
                  </p>
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>

        {/* Competitor Info Button */}
        <Button variant="outline" className="w-full h-12">
          <Users size={18} className="mr-2" />
          Create Competitor Info
        </Button>

        {/* Back Button */}
        <Button 
          variant="ghost" 
          className="w-full mt-6"
          onClick={() => navigate(-1)}
        >
          Back to Visits
        </Button>
      </div>
    </Layout>
  );
};
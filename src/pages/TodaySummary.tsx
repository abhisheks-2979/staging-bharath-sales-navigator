import { useState } from "react";
import { ArrowLeft, Download, Share, FileText, Clock, MapPin, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";

export const TodaySummary = () => {
  const navigate = useNavigate();

  const summaryData = {
    date: new Date().toLocaleDateString('en-IN', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }),
    beat: "Beat 1 (Central Bangalore)",
    plannedVisits: 15,
    completedVisits: 12,
    productiveVisits: 10,
    totalOrders: 8,
    totalOrderValue: 145750,
    avgOrderValue: 18219,
    visitEfficiency: 80,
    orderConversionRate: 67
  };

  const visitBreakdown = [
    { status: "Productive", count: 10, color: "success" },
    { status: "Unproductive", count: 2, color: "destructive" },
    { status: "Store Closed", count: 2, color: "muted" },
    { status: "Pending", count: 3, color: "warning" }
  ];

  const topRetailers = [
    { name: "Vardhman Kirana", orderValue: 25000, location: "Indiranagar" },
    { name: "Mahesh Kirana", orderValue: 22000, location: "MG Road" },
    { name: "New Corner Store", orderValue: 18500, location: "Koramangala" },
    { name: "City Mart", orderValue: 15750, location: "Brigade Road" }
  ];

  const handleDownloadPDF = () => {
    toast({
      title: "PDF Downloaded",
      description: "Today's summary has been downloaded successfully",
    });
  };

  const handleShare = () => {
    toast({
      title: "Summary Shared",
      description: "Today's summary has been shared with your team",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 space-y-4">
        {/* Header */}
        <Card className="shadow-card bg-gradient-primary text-primary-foreground">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => navigate(-1)}
                className="text-primary-foreground hover:bg-primary-foreground/20"
              >
                <ArrowLeft size={20} />
              </Button>
              <div>
                <CardTitle className="text-xl font-bold">Today's Summary</CardTitle>
                <p className="text-primary-foreground/80">{summaryData.date}</p>
              </div>
            </div>
            <FileText size={24} />
          </CardHeader>
        </Card>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Button 
            onClick={handleDownloadPDF}
            className="flex items-center gap-2"
          >
            <Download size={16} />
            Download PDF
          </Button>
          <Button 
            variant="outline"
            onClick={handleShare}
            className="flex items-center gap-2"
          >
            <Share size={16} />
            Share Summary
          </Button>
        </div>

        {/* Beat Information */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <MapPin size={16} className="text-muted-foreground" />
              <span className="font-semibold">{summaryData.beat}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Start: 9:00 AM | End: 6:30 PM
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Key Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Key Metrics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-primary/10 rounded-lg">
                <div className="text-2xl font-bold text-primary">₹{summaryData.totalOrderValue.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Total Order Value</div>
              </div>
              <div className="text-center p-4 bg-success/10 rounded-lg">
                <div className="text-2xl font-bold text-success">{summaryData.totalOrders}</div>
                <div className="text-sm text-muted-foreground">Orders Placed</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-lg font-bold">{summaryData.visitEfficiency}%</div>
                <div className="text-sm text-muted-foreground">Visit Efficiency</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-lg font-bold">₹{summaryData.avgOrderValue.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Avg Order Value</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Visit Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Visit Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {visitBreakdown.map((item) => (
                <div key={item.status} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge 
                      className={
                        item.color === "success" ? "bg-success text-success-foreground" :
                        item.color === "destructive" ? "bg-destructive text-destructive-foreground" :
                        item.color === "warning" ? "bg-warning text-warning-foreground" :
                        "bg-muted text-muted-foreground"
                      }
                    >
                      {item.status}
                    </Badge>
                    <span className="text-sm">{item.count} visits</span>
                  </div>
                  <div className="text-sm font-medium">
                    {Math.round((item.count / summaryData.plannedVisits) * 100)}%
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Performing Retailers */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top Performing Retailers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topRetailers.map((retailer, index) => (
                <div key={retailer.name} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <div className="font-semibold">{retailer.name}</div>
                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                      <MapPin size={12} />
                      {retailer.location}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-success">₹{retailer.orderValue.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">#{index + 1}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Performance Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Performance Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span>Planned Visits:</span>
                <span className="font-semibold">{summaryData.plannedVisits}</span>
              </div>
              <div className="flex justify-between">
                <span>Completed Visits:</span>
                <span className="font-semibold">{summaryData.completedVisits}</span>
              </div>
              <div className="flex justify-between">
                <span>Order Conversion Rate:</span>
                <span className="font-semibold text-success">{summaryData.orderConversionRate}%</span>
              </div>
              <div className="flex justify-between">
                <span>Distance Covered:</span>
                <span className="font-semibold">47.2 km</span>
              </div>
              <div className="flex justify-between">
                <span>Travel Time:</span>
                <span className="font-semibold">2h 15m</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
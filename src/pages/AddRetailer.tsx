import { useState } from "react";
import { ArrowLeft, Plus, MapPin, Phone, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";

export const AddRetailer = () => {
  const navigate = useNavigate();
  const [retailerData, setRetailerData] = useState({
    name: "",
    phone: "",
    address: "",
    category: "",
    visitType: "",
    priority: "",
    notes: ""
  });

  const categories = ["Category A", "Category B", "Category C"];
  const visitTypes = ["First Visit", "Follow-up", "Negotiation", "Order Collection"];
  const priorities = ["High", "Medium", "Low"];

  const handleInputChange = (field: string, value: string) => {
    setRetailerData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!retailerData.name || !retailerData.phone || !retailerData.address) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Retailer Added",
      description: `${retailerData.name} has been added to today's visit plan`,
    });

    // Reset form
    setRetailerData({
      name: "",
      phone: "",
      address: "",
      category: "",
      visitType: "",
      priority: "",
      notes: ""
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
                <CardTitle className="text-xl font-bold">Add Retailer</CardTitle>
                <p className="text-primary-foreground/80">Add a new retailer to today's plan</p>
              </div>
            </div>
            <Plus size={24} />
          </CardHeader>
        </Card>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Retailer Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Retailer Name *</Label>
                <Input
                  id="name"
                  placeholder="Enter retailer name"
                  value={retailerData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  className="bg-background"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="Enter phone number"
                  value={retailerData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  className="bg-background"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address *</Label>
                <Input
                  id="address"
                  placeholder="Enter complete address"
                  value={retailerData.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  className="bg-background"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={retailerData.category} onValueChange={(value) => handleInputChange("category", value)}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border z-50">
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>{category}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Visit Type</Label>
                  <Select value={retailerData.visitType} onValueChange={(value) => handleInputChange("visitType", value)}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border z-50">
                      {visitTypes.map((type) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={retailerData.priority} onValueChange={(value) => handleInputChange("priority", value)}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border z-50">
                    {priorities.map((priority) => (
                      <SelectItem key={priority} value={priority}>{priority}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Input
                  id="notes"
                  placeholder="Any additional notes"
                  value={retailerData.notes}
                  onChange={(e) => handleInputChange("notes", e.target.value)}
                  className="bg-background"
                />
              </div>
            </CardContent>
          </Card>

          {/* Quick Info */}
          <Card className="bg-muted/30">
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3">Quick Info</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Store size={14} className="text-muted-foreground" />
                  <span>Retailer will be added to today's visit plan</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin size={14} className="text-muted-foreground" />
                  <span>Location will be verified before visit</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone size={14} className="text-muted-foreground" />
                  <span>Contact details will be saved for future visits</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <Button type="submit" className="w-full" size="lg">
            <Plus size={16} className="mr-2" />
            Add Retailer to Plan
          </Button>
        </form>
      </div>
    </div>
  );
};
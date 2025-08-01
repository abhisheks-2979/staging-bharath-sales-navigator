import { useState } from "react";
import { ArrowLeft, Plus, MapPin, Phone, Store, Camera, Tag, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";

export const AddSuperStockist = () => {
  const navigate = useNavigate();
  const [superStockistData, setSuperStockistData] = useState({
    name: "",
    phone: "",
    address: "",
    category: "",
    priority: "",
    notes: "",
    parentType: "",
    parentName: "",
    locationTag: "",
    businessType: "",
    potential: "",
    competitor1: "",
    competitor2: "",
    competitor3: "",
    territoryArea: "",
    creditLimit: "",
    gstNumber: ""
  });

  const categories = ["Category A", "Category B", "Category C"];
  const priorities = ["High", "Medium", "Low"];
  const parentTypes = ["Company"];
  const businessTypes = ["Super Stockist", "Regional Distributor", "Area Distributor", "Stockist"];
  const potentials = ["High", "Medium", "Low"];

  const handleInputChange = (field: string, value: string) => {
    setSuperStockistData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!superStockistData.name || !superStockistData.phone || !superStockistData.address) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Super Stockist Added",
      description: `${superStockistData.name} has been added to the system`,
    });

    // Reset form
    setSuperStockistData({
      name: "",
      phone: "",
      address: "",
      category: "",
      priority: "",
      notes: "",
      parentType: "",
      parentName: "",
      locationTag: "",
      businessType: "",
      potential: "",
      competitor1: "",
      competitor2: "",
      competitor3: "",
      territoryArea: "",
      creditLimit: "",
      gstNumber: ""
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
                <CardTitle className="text-xl font-bold">Add Super Stockist</CardTitle>
                <p className="text-primary-foreground/80">Add a new super stockist to the hierarchy</p>
              </div>
            </div>
            <Building2 size={24} />
          </CardHeader>
        </Card>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Super Stockist Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Super Stockist Name *</Label>
                <Input
                  id="name"
                  placeholder="Enter super stockist name"
                  value={superStockistData.name}
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
                  value={superStockistData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  className="bg-background"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address *</Label>
                <Textarea
                  id="address"
                  placeholder="Enter complete address (Google Maps integration available)"
                  value={superStockistData.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  className="bg-background min-h-[80px]"
                />
                <p className="text-xs text-muted-foreground">Tip: You can copy address from Google Maps for accuracy</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={superStockistData.category} onValueChange={(value) => handleInputChange("category", value)}>
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
                  <Label>Priority</Label>
                  <Select value={superStockistData.priority} onValueChange={(value) => handleInputChange("priority", value)}>
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
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Parent Type</Label>
                  <Select value={superStockistData.parentType} onValueChange={(value) => handleInputChange("parentType", value)}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Select parent" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border z-50">
                      {parentTypes.map((type) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Parent Name</Label>
                  <Input
                    placeholder="Enter parent name"
                    value={superStockistData.parentName}
                    onChange={(e) => handleInputChange("parentName", e.target.value)}
                    className="bg-background"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="locationTag">Location Tag *</Label>
                <div className="flex gap-2">
                  <Input
                    id="locationTag"
                    placeholder="e.g., Regional Hub, State Office"
                    value={superStockistData.locationTag}
                    onChange={(e) => handleInputChange("locationTag", e.target.value)}
                    className="bg-background"
                  />
                  <Button type="button" variant="outline" size="icon">
                    <Tag size={16} />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">This will be used to verify visit authenticity</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Business Type</Label>
                  <Select value={superStockistData.businessType} onValueChange={(value) => handleInputChange("businessType", value)}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border z-50">
                      {businessTypes.map((type) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Potential</Label>
                  <Select value={superStockistData.potential} onValueChange={(value) => handleInputChange("potential", value)}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Select potential" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border z-50">
                      {potentials.map((potential) => (
                        <SelectItem key={potential} value={potential}>{potential}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Territory Area</Label>
                  <Input
                    placeholder="e.g., South India, Mumbai Zone"
                    value={superStockistData.territoryArea}
                    onChange={(e) => handleInputChange("territoryArea", e.target.value)}
                    className="bg-background"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Credit Limit</Label>
                  <Input
                    placeholder="e.g., ₹50,00,000"
                    value={superStockistData.creditLimit}
                    onChange={(e) => handleInputChange("creditLimit", e.target.value)}
                    className="bg-background"
                  />
                </div>

                <div className="space-y-2">
                  <Label>GST Number</Label>
                  <Input
                    placeholder="Enter GST number"
                    value={superStockistData.gstNumber}
                    onChange={(e) => handleInputChange("gstNumber", e.target.value)}
                    className="bg-background"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Top 3 Competitors</Label>
                <div className="space-y-2">
                  <Input
                    placeholder="Competitor 1"
                    value={superStockistData.competitor1}
                    onChange={(e) => handleInputChange("competitor1", e.target.value)}
                    className="bg-background"
                  />
                  <Input
                    placeholder="Competitor 2"
                    value={superStockistData.competitor2}
                    onChange={(e) => handleInputChange("competitor2", e.target.value)}
                    className="bg-background"
                  />
                  <Input
                    placeholder="Competitor 3"
                    value={superStockistData.competitor3}
                    onChange={(e) => handleInputChange("competitor3", e.target.value)}
                    className="bg-background"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Phone Attachment</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Additional phone numbers (comma separated)"
                    className="bg-background"
                  />
                  <Button type="button" variant="outline" size="icon">
                    <Camera size={16} />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">You can also attach photos of business cards</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Any additional notes"
                  value={superStockistData.notes}
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
                  <Building2 size={14} className="text-muted-foreground" />
                  <span>Super Stockist will be added to the hierarchy system</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin size={14} className="text-muted-foreground" />
                  <span>Location will be verified before visits</span>
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
            Add Super Stockist
          </Button>
        </form>
      </div>
    </div>
  );
};
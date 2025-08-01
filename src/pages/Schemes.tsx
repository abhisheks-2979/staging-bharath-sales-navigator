import { useState, useMemo } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Filter, Search, Star, MessageSquare, Package, MapPin, Calendar, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Scheme {
  id: string;
  title: string;
  description: string;
  product: string;
  region: string;
  status: "active" | "inactive";
  startDate: string;
  endDate: string;
  minQuantity: number;
  discount: number;
  rate: number;
  category: string;
  feedback: SchemesFeedback[];
  averageRating: number;
}

interface SchemesFeedback {
  id: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  date: string;
}

// Mock data for schemes
const mockSchemes: Scheme[] = [
  {
    id: "1",
    title: "Rice Premium Discount",
    description: "Special discount on premium basmati rice for bulk purchases",
    product: "Basmati Rice",
    region: "North India",
    status: "active",
    startDate: "2024-01-01",
    endDate: "2024-03-31",
    minQuantity: 50,
    discount: 15,
    rate: 85,
    category: "Food Grains",
    averageRating: 4.2,
    feedback: [
      {
        id: "f1",
        userId: "u1",
        userName: "Rajesh Kumar",
        rating: 4,
        comment: "Good scheme, customers are happy with the pricing",
        date: "2024-01-15"
      },
      {
        id: "f2",
        userId: "u2",
        userName: "Priya Singh",
        rating: 5,
        comment: "Excellent response from retailers",
        date: "2024-01-20"
      }
    ]
  },
  {
    id: "2",
    title: "Oil Combo Offer",
    description: "Buy 2 get 1 free on cooking oil bottles",
    product: "Cooking Oil",
    region: "South India",
    status: "active",
    startDate: "2024-02-01",
    endDate: "2024-04-30",
    minQuantity: 24,
    discount: 33,
    rate: 120,
    category: "Cooking Essentials",
    averageRating: 3.8,
    feedback: [
      {
        id: "f3",
        userId: "u3",
        userName: "Arun Nair",
        rating: 4,
        comment: "Popular among customers but margins are tight",
        date: "2024-02-05"
      }
    ]
  },
  {
    id: "3",
    title: "Pulse Power Pack",
    description: "Seasonal discount on all varieties of pulses",
    product: "Pulses",
    region: "West India",
    status: "inactive",
    startDate: "2023-10-01",
    endDate: "2023-12-31",
    minQuantity: 30,
    discount: 12,
    rate: 95,
    category: "Food Grains",
    averageRating: 4.5,
    feedback: [
      {
        id: "f4",
        userId: "u4",
        userName: "Meera Patel",
        rating: 5,
        comment: "Very successful scheme, brought in many new customers",
        date: "2023-11-10"
      }
    ]
  },
  {
    id: "4",
    title: "Spice Festival Deal",
    description: "Festive season special on spice packets",
    product: "Spices",
    region: "East India",
    status: "active",
    startDate: "2024-02-15",
    endDate: "2024-05-15",
    minQuantity: 100,
    discount: 20,
    rate: 25,
    category: "Spices & Seasonings",
    averageRating: 4.0,
    feedback: []
  }
];

const products = [...new Set(mockSchemes.map(scheme => scheme.product))];
const regions = [...new Set(mockSchemes.map(scheme => scheme.region))];

export const Schemes = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("all");
  const [selectedRegion, setSelectedRegion] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedScheme, setSelectedScheme] = useState<Scheme | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [rating, setRating] = useState(0);
  const { toast } = useToast();

  const filteredSchemes = useMemo(() => {
    return mockSchemes.filter(scheme => {
      const matchesSearch = scheme.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           scheme.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesProduct = selectedProduct === "all" || scheme.product === selectedProduct;
      const matchesRegion = selectedRegion === "all" || scheme.region === selectedRegion;
      const matchesStatus = statusFilter === "all" || scheme.status === statusFilter;
      
      return matchesSearch && matchesProduct && matchesRegion && matchesStatus;
    });
  }, [searchTerm, selectedProduct, selectedRegion, statusFilter]);

  const activeSchemes = filteredSchemes.filter(scheme => scheme.status === "active");
  const inactiveSchemes = filteredSchemes.filter(scheme => scheme.status === "inactive");

  const handleFeedbackSubmit = () => {
    if (!selectedScheme || !feedbackText || rating === 0) {
      toast({
        title: "Please fill all fields",
        description: "Rating and feedback are required",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Feedback submitted",
      description: "Thank you for your feedback on this scheme"
    });

    setFeedbackText("");
    setRating(0);
    setSelectedScheme(null);
  };

  const renderStars = (currentRating: number, interactive: boolean = false) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < currentRating
            ? "fill-yellow-400 text-yellow-400"
            : "text-gray-300"
        } ${interactive ? "cursor-pointer hover:text-yellow-400" : ""}`}
        onClick={interactive ? () => setRating(i + 1) : undefined}
      />
    ));
  };

  const SchemeCard = ({ scheme }: { scheme: Scheme }) => (
    <Card className="h-full hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-lg">{scheme.title}</CardTitle>
            <CardDescription className="mt-1">{scheme.description}</CardDescription>
          </div>
          <Badge variant={scheme.status === "active" ? "default" : "secondary"}>
            {scheme.status}
          </Badge>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <div className="flex items-center">
            {renderStars(Math.floor(scheme.averageRating))}
            <span className="ml-1 text-sm text-muted-foreground">
              ({scheme.averageRating})
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-muted-foreground" />
            <span>{scheme.product}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            <span>{scheme.region}</span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
            <span>{scheme.discount}% discount</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span>Min: {scheme.minQuantity} units</span>
          </div>
        </div>
        
        <div className="border-t pt-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Rate: </span>
              <span>₹{scheme.rate}/unit</span>
            </div>
            <div>
              <span className="font-medium">Valid till: </span>
              <span>{new Date(scheme.endDate).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={() => setSelectedScheme(scheme)}
          >
            <MessageSquare className="w-4 h-4 mr-1" />
            Give Feedback
          </Button>
        </div>

        {scheme.feedback.length > 0 && (
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium mb-2">Recent Feedback</h4>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {scheme.feedback.slice(0, 2).map((feedback) => (
                <div key={feedback.id} className="text-xs bg-muted/50 p-2 rounded">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{feedback.userName}</span>
                    <div className="flex">
                      {renderStars(feedback.rating)}
                    </div>
                  </div>
                  <p className="text-muted-foreground">{feedback.comment}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Layout>
      <div className="p-4 space-y-6">
        {/* Header */}
        <div className="bg-gradient-primary text-primary-foreground p-6 rounded-lg">
          <h1 className="text-2xl font-bold">Schemes & Offers</h1>
          <p className="text-primary-foreground/80 mt-1">
            Explore current schemes and share your feedback
          </p>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search schemes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Product" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Products</SelectItem>
                  {products.map(product => (
                    <SelectItem key={product} value={product}>{product}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Region" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Regions</SelectItem>
                  {regions.map(region => (
                    <SelectItem key={region} value={region}>{region}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Previous</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Schemes Tabs */}
        <Tabs defaultValue="active" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="active">
              Active Schemes ({activeSchemes.length})
            </TabsTrigger>
            <TabsTrigger value="previous">
              Previous Schemes ({inactiveSchemes.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4">
            {activeSchemes.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeSchemes.map(scheme => (
                  <SchemeCard key={scheme.id} scheme={scheme} />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-muted-foreground">No active schemes found</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="previous" className="space-y-4">
            {inactiveSchemes.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {inactiveSchemes.map(scheme => (
                  <SchemeCard key={scheme.id} scheme={scheme} />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-muted-foreground">No previous schemes found</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Feedback Modal */}
        {selectedScheme && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>Feedback for {selectedScheme.title}</CardTitle>
                <CardDescription>Share your experience with this scheme</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Rating</label>
                  <div className="flex gap-1 mt-1">
                    {renderStars(rating, true)}
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Your Feedback</label>
                  <Textarea
                    placeholder="Share your thoughts about this scheme..."
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    className="mt-1"
                  />
                </div>
                
                <div className="flex gap-2">
                  <Button onClick={handleFeedbackSubmit} className="flex-1">
                    Submit Feedback
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setSelectedScheme(null)}
                  >
                    Cancel
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
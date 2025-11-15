import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MessageSquare, Trophy, Image } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface RetailerFeedback {
  id: string;
  feedback_type: string;
  comments: string;
  rating: number;
  created_at: string;
  retailer_id: string;
  retailers: {
    name: string;
  };
}

interface CompetitionInsight {
  id: string;
  competitor_name: string;
  product_category: string;
  insight_type: string;
  description: string;
  impact_level: string;
  action_required: boolean;
  created_at: string;
  retailer_id: string;
  retailers: {
    name: string;
  };
}

interface BrandingRequest {
  id: string;
  title: string;
  description: string;
  status: string;
  requested_assets: string;
  created_at: string;
  retailer_id: string;
  retailers: {
    name: string;
  };
}

export default function FeedbackManagement() {
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const [retailerFeedback, setRetailerFeedback] = useState<any[]>([]);
  const [brandingRequests, setBrandingRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userRole !== 'admin') {
      navigate('/');
      return;
    }
    fetchAllFeedback();
  }, [userRole, navigate]);

  const fetchAllFeedback = async () => {
    try {
      setLoading(true);

      // Fetch retailer feedback
      const { data: feedbackData, error: feedbackError } = await supabase
        .from('retailer_feedback')
        .select('*')
        .order('created_at', { ascending: false });

      if (feedbackError) throw feedbackError;

      // Fetch retailer names separately
      const retailerIds = [...new Set(feedbackData?.map(f => f.retailer_id) || [])];
      const { data: retailers } = await supabase
        .from('retailers')
        .select('id, name')
        .in('id', retailerIds);

      const retailerMap = new Map(retailers?.map(r => [r.id, r.name]));
      const enrichedFeedback = feedbackData?.map(f => ({
        ...f,
        retailer_name: retailerMap.get(f.retailer_id) || 'Unknown'
      })) || [];

      setRetailerFeedback(enrichedFeedback);

      // Fetch branding requests
      const { data: brandingData, error: brandingError } = await supabase
        .from('branding_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (brandingError) throw brandingError;

      const brandingRetailerIds = [...new Set(brandingData?.map(b => b.retailer_id) || [])];
      const { data: brandingRetailers } = await supabase
        .from('retailers')
        .select('id, name')
        .in('id', brandingRetailerIds);

      const brandingRetailerMap = new Map(brandingRetailers?.map(r => [r.id, r.name]));
      const enrichedBranding = brandingData?.map(b => ({
        ...b,
        retailer_name: brandingRetailerMap.get(b.retailer_id) || 'Unknown'
      })) || [];

      setBrandingRequests(enrichedBranding);

    } catch (error) {
      console.error('Error fetching feedback:', error);
      toast({
        title: "Error",
        description: "Failed to load feedback data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getImpactBadge = (level: string) => {
    const colors = {
      high: "bg-destructive text-destructive-foreground",
      medium: "bg-warning text-warning-foreground",
      low: "bg-muted text-muted-foreground"
    };
    return colors[level as keyof typeof colors] || colors.low;
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      submitted: "bg-blue-500 text-white",
      approved: "bg-green-500 text-white",
      rejected: "bg-red-500 text-white",
      in_progress: "bg-yellow-500 text-white",
      completed: "bg-green-600 text-white"
    };
    return colors[status as keyof typeof colors] || "bg-gray-500 text-white";
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/admin')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Feedback Management</h1>
            <p className="text-muted-foreground">View and manage all feedback from field teams</p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="retailer" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="retailer" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Retailer Feedback
            </TabsTrigger>
            <TabsTrigger value="competition" className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Competition Insights
            </TabsTrigger>
            <TabsTrigger value="branding" className="flex items-center gap-2">
              <Image className="h-4 w-4" />
              Branding Requests
            </TabsTrigger>
          </TabsList>

          {/* Retailer Feedback Tab */}
          <TabsContent value="retailer">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Retailer Feedback</h2>
              {loading ? (
                <p className="text-center py-8 text-muted-foreground">Loading...</p>
              ) : retailerFeedback.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No feedback records found</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Retailer</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead>Comments</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {retailerFeedback.map((feedback) => (
                      <TableRow key={feedback.id}>
                        <TableCell className="font-medium">
                          {feedback.retailer_name}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{feedback.feedback_type}</Badge>
                        </TableCell>
                        <TableCell>
                          {feedback.rating ? `${feedback.rating}/5` : 'N/A'}
                        </TableCell>
                        <TableCell className="max-w-md truncate">
                          {feedback.comments || 'No comments'}
                        </TableCell>
                        <TableCell>
                          {new Date(feedback.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>
          </TabsContent>

          {/* Branding Requests Tab */}
          <TabsContent value="branding">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Branding Requests</h2>
              {loading ? (
                <p className="text-center py-8 text-muted-foreground">Loading...</p>
              ) : brandingRequests.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No branding requests found</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Retailer</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Assets</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {brandingRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell className="font-medium">
                          {request.retailer_name}
                        </TableCell>
                        <TableCell>{request.title || 'Untitled'}</TableCell>
                        <TableCell>{request.requested_assets || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge className={getStatusBadge(request.status)}>
                            {request.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-md truncate">
                          {request.description || 'No description'}
                        </TableCell>
                        <TableCell>
                          {new Date(request.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

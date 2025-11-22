import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Loader2, Gift, Sparkles } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ProgramsManagement } from "@/components/loyalty/ProgramsManagement";
import { ActionsManagement } from "@/components/loyalty/ActionsManagement";
import { RetailerPointsDashboard } from "@/components/loyalty/RetailerPointsDashboard";
import { RedemptionsManagement } from "@/components/loyalty/RedemptionsManagement";
import { LoyaltyAnalytics } from "@/components/loyalty/LoyaltyAnalytics";
import { seedLoyaltyData } from "@/utils/seedLoyaltyData";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function RetailerLoyaltyAdmin() {
  const { userRole, loading } = useAuth();
  const [isSeeding, setIsSeeding] = useState(false);

  const handleSeedData = async () => {
    setIsSeeding(true);
    await seedLoyaltyData();
    setIsSeeding(false);
    window.location.reload();
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </Layout>
    );
  }

  if (userRole !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <Layout>
      <div className="container mx-auto p-4 sm:p-6 max-w-7xl space-y-6">
        {/* Header Card */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-pink-100 rounded-lg">
                  <Gift className="h-8 w-8 text-pink-600" />
                </div>
                <div>
                  <CardTitle className="text-2xl sm:text-3xl">
                    Retailer Loyalty Program
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Manage programs, actions, points, and redemptions to boost retailer engagement
                  </CardDescription>
                </div>
              </div>
              <Button
                onClick={handleSeedData}
                disabled={isSeeding}
                variant="outline"
                size="sm"
                className="shrink-0"
              >
                {isSeeding ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                Create Sample Data
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Management Tabs */}
        <Tabs defaultValue="programs" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5">
            <TabsTrigger value="programs">Programs</TabsTrigger>
            <TabsTrigger value="actions">Actions</TabsTrigger>
            <TabsTrigger value="points">Points</TabsTrigger>
            <TabsTrigger value="redemptions">Redemptions</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="programs" className="space-y-4">
            <ProgramsManagement />
          </TabsContent>

          <TabsContent value="actions" className="space-y-4">
            <ActionsManagement />
          </TabsContent>

          <TabsContent value="points" className="space-y-4">
            <RetailerPointsDashboard />
          </TabsContent>

          <TabsContent value="redemptions" className="space-y-4">
            <RedemptionsManagement />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <LoyaltyAnalytics />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

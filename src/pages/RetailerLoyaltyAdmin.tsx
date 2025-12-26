import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Loader2, Gift } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProgramsManagement } from "@/components/loyalty/ProgramsManagement";
import { ActionsManagement } from "@/components/loyalty/ActionsManagement";
import { RetailerPointsDashboard } from "@/components/loyalty/RetailerPointsDashboard";
import { RedemptionsManagement } from "@/components/loyalty/RedemptionsManagement";
import { LoyaltyAnalytics } from "@/components/loyalty/LoyaltyAnalytics";
import { RewardsManagement } from "@/components/loyalty/RewardsManagement";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function RetailerLoyaltyAdmin() {
  const { userRole, loading } = useAuth();

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
          </CardHeader>
        </Card>

        {/* Management Tabs */}
        <Tabs defaultValue="programs" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6">
            <TabsTrigger value="programs">Programs</TabsTrigger>
            <TabsTrigger value="rewards">Rewards</TabsTrigger>
            <TabsTrigger value="actions">Actions</TabsTrigger>
            <TabsTrigger value="points">Points</TabsTrigger>
            <TabsTrigger value="redemptions">Redemptions</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="programs" className="space-y-4">
            <ProgramsManagement />
          </TabsContent>

          <TabsContent value="rewards" className="space-y-4">
            <RewardsManagement />
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

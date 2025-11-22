import { Layout } from "@/components/Layout";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Loader2, Gift } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProgramsManagement } from "@/components/loyalty/ProgramsManagement";
import { ActionsManagement } from "@/components/loyalty/ActionsManagement";
import { RetailerPointsDashboard } from "@/components/loyalty/RetailerPointsDashboard";
import { RedemptionsManagement } from "@/components/loyalty/RedemptionsManagement";
import { LoyaltyAnalytics } from "@/components/loyalty/LoyaltyAnalytics";

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
    <>
      <Navbar />
      <Layout>
        <div className="container mx-auto p-4 sm:p-6 max-w-7xl">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-gradient-primary rounded-lg">
                <Gift className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold">
                  Retailer Loyalty Program
                </h1>
                <p className="text-muted-foreground mt-1">
                  Manage programs, actions, points, and redemptions
                </p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="programs" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5 gap-2">
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
    </>
  );
}

import { Layout } from "@/components/Layout";
import { CreditManagementConfig } from "@/components/CreditManagementConfig";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

export default function CreditManagement() {
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
      <div className="container mx-auto p-6 max-w-5xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Credit Management Configuration</h1>
          <p className="text-muted-foreground mt-2">
            Configure retailer credit scoring system and parameters
          </p>
        </div>
        <CreditManagementConfig />
      </div>
    </Layout>
  );
}
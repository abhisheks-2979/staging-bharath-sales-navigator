import React, { lazy, Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { StatusBar } from "@/components/StatusBar";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { RoleBasedAuthPage } from "@/components/auth/RoleBasedAuthPage";
import { useMasterDataCache } from "@/hooks/useMasterDataCache";
import Index from "./pages/Index";

// Lazy load feature pages
const BeatPlanningFeature = lazy(() => import("./pages/features/BeatPlanningFeature").then(module => ({ default: module.BeatPlanningFeature })));
const RetailerManagementFeature = lazy(() => import("./pages/features/RetailerManagementFeature").then(module => ({ default: module.RetailerManagementFeature })));
const VisitSchedulingFeature = lazy(() => import("./pages/features/VisitSchedulingFeature").then(module => ({ default: module.VisitSchedulingFeature })));
const SalesAnalyticsFeature = lazy(() => import("./pages/features/SalesAnalyticsFeature").then(module => ({ default: module.SalesAnalyticsFeature })));
const PerformanceTrackingFeature = lazy(() => import("./pages/features/PerformanceTrackingFeature").then(module => ({ default: module.PerformanceTrackingFeature })));
const GrowthAnalyticsFeature = lazy(() => import("./pages/features/GrowthAnalyticsFeature").then(module => ({ default: module.GrowthAnalyticsFeature })));
import { LandingPage } from "./pages/LandingPage";
import { VisitPlanner } from "./pages/VisitPlanner";
import { BeatPlanning } from "./pages/BeatPlanning";
import { MyVisits } from "./pages/MyVisits";
import { VisitDetail } from "./pages/VisitDetail";
import { OrderEntry } from "./pages/OrderEntry";
import { Cart } from "./pages/Cart";
import { CreateBeat } from "./pages/CreateBeat";
import { BeatAnalytics } from "./pages/BeatAnalytics";
import { TodaySummary } from "./pages/TodaySummary";
import { AddRetailer } from "./pages/AddRetailer";
import { AddDistributor } from "./pages/AddDistributor";
import { AddSuperStockist } from "./pages/AddSuperStockist";
import { AddBeat } from "./pages/AddBeat";
import AddRecords from "./pages/AddRecords";
import Attendance from "./pages/Attendance";

import Leaderboard from "./pages/Leaderboard";
import Performance from "./pages/Performance";
import SalesCoach from "./pages/SalesCoach";
import Analytics from "./pages/Analytics";
import { Schemes } from "./pages/Schemes";
import { AdminDashboard } from "./pages/AdminDashboard";
import AdminControls from "./pages/AdminControls";
import ProductManagementPage from "./pages/ProductManagementPage";
import AttendanceManagement from "./pages/AttendanceManagement";
import NotFound from "./pages/NotFound";
import { MyRetailers } from "./pages/MyRetailers";
import BrandingRequests from "./pages/BrandingRequests";
import { MyBeats } from "./pages/MyBeats";
import { BeatDetail } from "./pages/BeatDetail";
import Vendors from "./pages/Vendors";
import { RetailerDetail } from "./pages/RetailerDetail";
import TerritoriesAndDistributors from "./pages/TerritoriesAndDistributors";
import Operations from "./pages/Operations";
import DistributorMaster from "./pages/DistributorMaster";
import DistributorMapping from "./pages/DistributorMapping";
import LiveTracking from "./pages/LiveTracking";

import AdminExpenseManagement from "./pages/AdminExpenseManagement";
import MyExpenses from "./pages/MyExpenses";
import UserProfile from "./pages/UserProfile";
import CompleteProfile from "./pages/CompleteProfile";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        // Don't retry if offline
        if (!navigator.onLine) return false;
        // Retry up to 2 times for other errors
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: false,
    },
  },
});

const MasterDataCacheInitializer = () => {
  const { cacheAllMasterData, isOnline } = useMasterDataCache();
  
  useEffect(() => {
    // Cache master data on app load when online
    if (isOnline) {
      cacheAllMasterData();
    }
  }, [isOnline, cacheAllMasterData]);
  
  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <MasterDataCacheInitializer />
      <Toaster />
      <Sonner />
      <PWAInstallPrompt />
      <StatusBar />
      <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<RoleBasedAuthPage />} />
        <Route path="/auth/complete-profile" element={<CompleteProfile />} />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Index />
          </ProtectedRoute>
        } />
          <Route path="/admin" element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute>
              <UserProfile />
            </ProtectedRoute>
          } />
          <Route path="/admin-controls" element={
            <ProtectedRoute>
              <AdminControls />
            </ProtectedRoute>
          } />
          <Route path="/product-management" element={
            <ProtectedRoute>
              <ProductManagementPage />
            </ProtectedRoute>
          } />
          <Route path="/attendance-management" element={
            <ProtectedRoute>
              <AttendanceManagement />
            </ProtectedRoute>
          } />
          <Route path="/retailer/:id" element={<RetailerDetail />} />
          <Route path="/territories-and-distributors" element={
            <ProtectedRoute>
              <TerritoriesAndDistributors />
            </ProtectedRoute>
          } />
          <Route path="/admin-expense-management" element={
            <ProtectedRoute>
              <AdminExpenseManagement />
            </ProtectedRoute>
          } />
          <Route path="/operations" element={
            <ProtectedRoute>
              <Operations />
            </ProtectedRoute>
          } />
          <Route path="/distributor-master" element={
            <ProtectedRoute>
              <DistributorMaster />
            </ProtectedRoute>
          } />
          <Route path="/distributor-mapping" element={
            <ProtectedRoute>
              <DistributorMapping />
            </ProtectedRoute>
          } />
            <Route path="/visit-planner" element={
              <ProtectedRoute>
                <VisitPlanner />
              </ProtectedRoute>
            } />
            <Route path="/visits" element={
              <ProtectedRoute>
                <BeatPlanning />
              </ProtectedRoute>
            } />
            <Route path="/beat-planning" element={
              <ProtectedRoute>
                <BeatPlanning />
              </ProtectedRoute>
            } />
            <Route path="/visits/retailers" element={
              <ProtectedRoute>
                <MyVisits />
              </ProtectedRoute>
            } />
            <Route path="/order-entry" element={
              <ProtectedRoute>
                <OrderEntry />
              </ProtectedRoute>
            } />
            <Route path="/cart" element={
              <ProtectedRoute>
                <Cart />
              </ProtectedRoute>
            } />
            <Route path="/create-beat" element={
              <ProtectedRoute>
                <CreateBeat />
              </ProtectedRoute>
            } />
            <Route path="/my-beats" element={
              <ProtectedRoute>
                <MyBeats />
              </ProtectedRoute>
            } />
            <Route path="/beat/:id" element={
              <ProtectedRoute>
                <BeatDetail />
              </ProtectedRoute>
            } />
            <Route path="/visit/:id" element={
              <ProtectedRoute>
                <VisitDetail />
              </ProtectedRoute>
            } />
            <Route path="/beat-analytics" element={
              <ProtectedRoute>
                <BeatAnalytics />
              </ProtectedRoute>
            } />
            <Route path="/today-summary" element={
              <ProtectedRoute>
                <TodaySummary />
              </ProtectedRoute>
            } />
            <Route path="/add-retailer" element={
              <ProtectedRoute>
                <AddRetailer />
              </ProtectedRoute>
            } />
            <Route path="/add-distributor" element={
              <ProtectedRoute>
                <AddDistributor />
              </ProtectedRoute>
            } />
            <Route path="/add-super-stockist" element={
              <ProtectedRoute>
                <AddSuperStockist />
              </ProtectedRoute>
            } />
            <Route path="/add-records" element={
              <ProtectedRoute>
                <AddRecords />
              </ProtectedRoute>
            } />
            <Route path="/add-beat" element={
              <ProtectedRoute>
                <AddBeat />
              </ProtectedRoute>
            } />
            <Route path="/attendance" element={
              <ProtectedRoute>
                <Attendance />
              </ProtectedRoute>
            } />
            <Route path="/expenses" element={
              <ProtectedRoute>
                <MyExpenses />
              </ProtectedRoute>
            } />
            <Route path="/leaderboard" element={
              <ProtectedRoute>
                <Leaderboard />
              </ProtectedRoute>
            } />
            <Route path="/performance" element={
              <ProtectedRoute>
                <Performance />
              </ProtectedRoute>
            } />
            <Route path="/sales-coach" element={
              <ProtectedRoute>
                <SalesCoach />
              </ProtectedRoute>
            } />
            <Route path="/analytics" element={
              <ProtectedRoute>
                <Analytics />
              </ProtectedRoute>
            } />
            <Route path="/schemes" element={
              <ProtectedRoute>
                <Schemes />
              </ProtectedRoute>
            } />
            <Route path="/my-retailers" element={
              <ProtectedRoute>
                <MyRetailers />
              </ProtectedRoute>
            } />
            <Route path="/branding-requests" element={
              <ProtectedRoute>
                <BrandingRequests />
              </ProtectedRoute>
            } />
            <Route path="/vendors" element={
              <ProtectedRoute>
                <Vendors />
              </ProtectedRoute>
            } />
            <Route path="/live-tracking" element={
              <ProtectedRoute>
                <LiveTracking />
              </ProtectedRoute>
            } />
            <Route path="/features/beat-planning" element={<Suspense fallback={<div>Loading...</div>}><BeatPlanningFeature /></Suspense>} />
            <Route path="/features/retailer-management" element={<Suspense fallback={<div>Loading...</div>}><RetailerManagementFeature /></Suspense>} />
            <Route path="/features/visit-scheduling" element={<Suspense fallback={<div>Loading...</div>}><VisitSchedulingFeature /></Suspense>} />
            <Route path="/features/sales-analytics" element={<Suspense fallback={<div>Loading...</div>}><SalesAnalyticsFeature /></Suspense>} />
            <Route path="/features/performance-tracking" element={<Suspense fallback={<div>Loading...</div>}><PerformanceTrackingFeature /></Suspense>} />
            <Route path="/features/growth-analytics" element={<Suspense fallback={<div>Loading...</div>}><GrowthAnalyticsFeature /></Suspense>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

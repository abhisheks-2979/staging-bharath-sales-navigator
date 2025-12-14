import React, { lazy, Suspense, useEffect } from "react";
import { I18nextProvider } from 'react-i18next';
import i18n from '@/i18n/config';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { RoleBasedAuthPage } from "@/components/auth/RoleBasedAuthPage";
import { useMasterDataCache } from "@/hooks/useMasterDataCache";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useAndroidBackButton } from "@/hooks/useAndroidBackButton";
import { visitStatusCache } from "@/lib/visitStatusCache";

// Initialize visit status cache early to avoid flicker
visitStatusCache.init();

// Critical pages for offline support - keep direct imports (bundled together, always available)
import { LandingPage } from "./pages/LandingPage";
import Index from "./pages/Index";
import { MyVisits } from "./pages/MyVisits";
import { OrderEntry } from "./pages/OrderEntry";
import { Cart } from "./pages/Cart";
import { MyRetailers } from "./pages/MyRetailers";
import { MyBeats } from "./pages/MyBeats";
import { AddRetailer } from "./pages/AddRetailer";
import Attendance from "./pages/Attendance";
import { TodaySummary } from "./pages/TodaySummary";

// Lazy load helper with offline fallback
const lazyWithRetry = (importFn: () => Promise<any>, fallbackComponent?: React.ComponentType) => {
  return lazy(() => 
    importFn().catch((error) => {
      console.warn('Failed to load module, likely offline:', error);
      // Return a simple offline fallback component
      return { 
        default: fallbackComponent || (() => (
          <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-foreground mb-2">Page Unavailable Offline</h2>
              <p className="text-muted-foreground mb-4">This page requires an internet connection to load.</p>
              <button 
                onClick={() => window.location.reload()} 
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
              >
                Retry
              </button>
            </div>
          </div>
        ))
      };
    })
  );
};

// Lazy load all other pages for better code splitting
const BeatPlanningFeature = lazyWithRetry(() => import("./pages/features/BeatPlanningFeature").then(module => ({ default: module.BeatPlanningFeature })));
const RetailerManagementFeature = lazyWithRetry(() => import("./pages/features/RetailerManagementFeature").then(module => ({ default: module.RetailerManagementFeature })));
const VisitSchedulingFeature = lazyWithRetry(() => import("./pages/features/VisitSchedulingFeature").then(module => ({ default: module.VisitSchedulingFeature })));
const SalesAnalyticsFeature = lazyWithRetry(() => import("./pages/features/SalesAnalyticsFeature").then(module => ({ default: module.SalesAnalyticsFeature })));
const PerformanceTrackingFeature = lazyWithRetry(() => import("./pages/features/PerformanceTrackingFeature").then(module => ({ default: module.PerformanceTrackingFeature })));
const GrowthAnalyticsFeature = lazyWithRetry(() => import("./pages/features/GrowthAnalyticsFeature").then(module => ({ default: module.GrowthAnalyticsFeature })));

// Lazy load pages
const VisitPlanner = lazyWithRetry(() => import("./pages/VisitPlanner").then(m => ({ default: m.VisitPlanner })));
const BeatPlanning = lazyWithRetry(() => import("./pages/BeatPlanning").then(m => ({ default: m.BeatPlanning })));
const VisitDetail = lazyWithRetry(() => import("./pages/VisitDetail").then(m => ({ default: m.VisitDetail })));
const CreateBeat = lazyWithRetry(() => import("./pages/CreateBeat").then(m => ({ default: m.CreateBeat })));
const BeatAnalytics = lazyWithRetry(() => import("./pages/BeatAnalytics").then(m => ({ default: m.BeatAnalytics })));
const AddBeat = lazyWithRetry(() => import("./pages/AddBeat").then(m => ({ default: m.AddBeat })));
const AddRecords = lazyWithRetry(() => import("./pages/AddRecords"));
const Leaderboard = lazyWithRetry(() => import("./pages/Leaderboard"));
const Performance = lazyWithRetry(() => import("./pages/Performance"));
const SalesCoach = lazyWithRetry(() => import("./pages/SalesCoach"));
const Analytics = lazyWithRetry(() => import("./pages/Analytics"));
const Schemes = lazyWithRetry(() => import("./pages/Schemes").then(m => ({ default: m.Schemes })));
const AdminDashboard = lazyWithRetry(() => import("./pages/AdminDashboard").then(m => ({ default: m.AdminDashboard })));
const AdminControls = lazyWithRetry(() => import("./pages/AdminControls"));
const FeatureManagement = lazyWithRetry(() => import("./pages/FeatureManagement"));
const ProductManagementPage = lazyWithRetry(() => import("./pages/ProductManagementPage"));
const AttendanceManagement = lazyWithRetry(() => import("./pages/AttendanceManagement"));
const ActivitiesInfo = lazyWithRetry(() => import("./pages/ActivitiesInfo"));
const BadgesInfo = lazyWithRetry(() => import("./pages/BadgesInfo"));
const FeedbackManagement = lazyWithRetry(() => import("./pages/FeedbackManagement"));
const CompetitionMaster = lazyWithRetry(() => import("./pages/CompetitionMaster"));
const CompetitorDetail = lazyWithRetry(() => import("./pages/CompetitorDetail"));
const NotFound = lazyWithRetry(() => import("./pages/NotFound"));
const UserRoles = lazyWithRetry(() => import("./pages/UserRoles"));
const BrandingRequests = lazyWithRetry(() => import("./pages/BrandingRequests"));
const BeatDetail = lazyWithRetry(() => import("./pages/BeatDetail").then(m => ({ default: m.BeatDetail })));
const EmployeeOnboarding = lazyWithRetry(() => import("./pages/EmployeeOnboarding"));
const Employee360 = lazyWithRetry(() => import("./pages/Employee360"));
const Vendors = lazyWithRetry(() => import("./pages/Vendors"));
const RetailerDetail = lazyWithRetry(() => import("./pages/RetailerDetail").then(m => ({ default: m.RetailerDetail })));
const TerritoriesAndDistributors = lazyWithRetry(() => import("./pages/TerritoriesAndDistributors"));
const Operations = lazyWithRetry(() => import("./pages/Operations"));
const GPSTrack = lazyWithRetry(() => import("./pages/GPSTrack"));
const GPSTrackManagement = lazyWithRetry(() => import("./pages/GPSTrackManagement"));
const RetailManagement = lazyWithRetry(() => import("./pages/RetailManagement"));
const VanSalesManagement = lazyWithRetry(() => import("./pages/VanSalesManagement"));
const AdminExpenseManagement = lazyWithRetry(() => import("./pages/AdminExpenseManagement"));
const MyExpenses = lazyWithRetry(() => import("./pages/MyExpenses"));
const UserProfile = lazyWithRetry(() => import("./pages/UserProfile"));
const CompleteProfile = lazyWithRetry(() => import("./pages/CompleteProfile"));
const GamificationAdmin = lazyWithRetry(() => import("./pages/GamificationAdmin"));
const InvoiceManagement = lazyWithRetry(() => import("./pages/InvoiceManagement"));
const GamePolicy = lazyWithRetry(() => import("./pages/GamePolicy"));
const CreditManagement = lazyWithRetry(() => import("./pages/CreditManagement"));
const RetailerLoyaltyAdmin = lazyWithRetry(() => import("./pages/RetailerLoyaltyAdmin"));
const RetailerLoyalty = lazyWithRetry(() => import("./pages/RetailerLoyalty"));
const SecurityManagement = lazyWithRetry(() => import("./pages/SecurityManagement"));
const PushContentSetup = lazyWithRetry(() => import("./pages/admin/PushContentSetup"));
const PerformanceModuleAdmin = lazyWithRetry(() => import("./pages/admin/PerformanceModuleAdmin"));
const PriceBookAdmin = lazyWithRetry(() => import("./pages/admin/PriceBookAdmin"));
const PriceBookDetail = lazyWithRetry(() => import("./pages/admin/PriceBookDetail"));
const RecycleBin = lazyWithRetry(() => import("./pages/RecycleBin"));
const RecycleBinAdmin = lazyWithRetry(() => import("./pages/admin/RecycleBinAdmin"));
const MyTargets = lazyWithRetry(() => import("./pages/MyTargets"));
const TeamTargets = lazyWithRetry(() => import("./pages/TeamTargets"));
const PendingPaymentsAll = lazyWithRetry(() => import("./pages/PendingPaymentsAll"));
const JointSalesAnalytics = lazyWithRetry(() => import("./pages/JointSalesAnalytics"));
const DistributorMaster = lazyWithRetry(() => import("./pages/DistributorMaster"));
const AddDistributor = lazyWithRetry(() => import("./pages/AddDistributor"));
const DistributorDetail = lazyWithRetry(() => import("./pages/DistributorDetail"));
const EditDistributor = lazyWithRetry(() => import("./pages/EditDistributor"));
const PrimaryOrders = lazyWithRetry(() => import("./pages/PrimaryOrders"));

// Distributor Portal Pages
const DistributorLogin = lazy(() => import("./pages/distributor-portal/DistributorLogin"));
const DistributorDashboard = lazy(() => import("./pages/distributor-portal/DistributorDashboard"));
const PrimaryOrdersList = lazy(() => import("./pages/distributor-portal/PrimaryOrdersList"));
const CreatePrimaryOrder = lazy(() => import("./pages/distributor-portal/CreatePrimaryOrder"));
const PrimaryOrderDetail = lazy(() => import("./pages/distributor-portal/PrimaryOrderDetail"));
const DistributorInventory = lazy(() => import("./pages/distributor-portal/DistributorInventory"));
const SecondarySales = lazy(() => import("./pages/distributor-portal/SecondarySales"));
const PackingList = lazy(() => import("./pages/distributor-portal/PackingList"));
const GoodsReceipt = lazy(() => import("./pages/distributor-portal/GoodsReceipt"));
const DistributorClaims = lazy(() => import("./pages/distributor-portal/DistributorClaims"));
const DistributorSupport = lazy(() => import("./pages/distributor-portal/DistributorSupport"));
const DistributorIdeas = lazy(() => import("./pages/distributor-portal/DistributorIdeas"));
const DistributorProfile = lazy(() => import("./pages/distributor-portal/DistributorProfile"));
const DistributorContactsPortal = lazy(() => import("./pages/distributor-portal/DistributorContacts"));
const DistributorFYPlanPage = lazy(() => import("./pages/distributor-portal/DistributorFYPlan"));

// Institutional Sales pages
const InstitutionalSalesDashboard = lazy(() => import("./pages/institutional/InstitutionalSalesDashboard"));
const LeadManagement = lazy(() => import("./pages/institutional/LeadManagement"));
const AccountManagement = lazy(() => import("./pages/institutional/AccountManagement"));
const AccountDetail = lazy(() => import("./pages/institutional/AccountDetail"));
const ContactManagement = lazy(() => import("./pages/institutional/ContactManagement"));
const ContactDetail = lazy(() => import("./pages/institutional/ContactDetail"));
const OpportunityManagement = lazy(() => import("./pages/institutional/OpportunityManagement"));
const OpportunityDetail = lazy(() => import("./pages/institutional/OpportunityDetail"));
const QuoteManagement = lazy(() => import("./pages/institutional/QuoteManagement"));
const QuoteDetail = lazy(() => import("./pages/institutional/QuoteDetail"));
const InstitutionalProducts = lazy(() => import("./pages/institutional/InstitutionalProducts"));
const OrderCommitments = lazy(() => import("./pages/institutional/OrderCommitments"));
const InstitutionalInvoices = lazy(() => import("./pages/institutional/InstitutionalInvoices"));
const PriceBooks = lazy(() => import("./pages/institutional/PriceBooks"));
const Collections = lazy(() => import("./pages/institutional/Collections"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        if (!navigator.onLine) return false;
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: false,
    },
  },
});

// Master data cache initializer
const MasterDataCacheInitializer = () => {
  const { cacheAllMasterData, isOnline } = useMasterDataCache();
  
  useEffect(() => {
    if (isOnline) {
      cacheAllMasterData();
    }
  }, [isOnline, cacheAllMasterData]);
  
  return null;
};

// Lazy route wrapper for consistent loading
const LazyRoute = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<LoadingScreen />}>{children}</Suspense>
);

const App = () => {
  const [hasError, setHasError] = React.useState(false);

  useEffect(() => {
    const errorHandler = (event: ErrorEvent) => {
      console.error('Global error:', event.error);
      setHasError(true);
    };

    window.addEventListener('error', errorHandler);
    return () => window.removeEventListener('error', errorHandler);
  }, []);

  return (
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <BrowserRouter>
              <AppContent hasError={hasError} />
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </I18nextProvider>
  );
};

const AppContent = ({ hasError }: { hasError: boolean }) => {
  useAndroidBackButton();

  if (hasError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle p-4">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">Something went wrong</h1>
          <p className="text-muted-foreground">Please refresh the page to try again</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <MasterDataCacheInitializer />
      <Toaster />
      <Sonner />
      <PWAInstallPrompt />
      <Routes>
        {/* Critical routes - no lazy loading */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<RoleBasedAuthPage />} />
        <Route path="/auth/complete-profile" element={<LazyRoute><CompleteProfile /></LazyRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><Index /></ProtectedRoute>} />
        
        {/* Lazy loaded routes */}
        <Route path="/admin" element={<ProtectedRoute><LazyRoute><AdminDashboard /></LazyRoute></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><LazyRoute><UserProfile /></LazyRoute></ProtectedRoute>} />
        <Route path="/admin-controls" element={<ProtectedRoute><LazyRoute><AdminControls /></LazyRoute></ProtectedRoute>} />
        <Route path="/feature-management" element={<ProtectedRoute><LazyRoute><FeatureManagement /></LazyRoute></ProtectedRoute>} />
        <Route path="/push-content-setup" element={<ProtectedRoute><LazyRoute><PushContentSetup /></LazyRoute></ProtectedRoute>} />
        <Route path="/user_roles" element={<ProtectedRoute><LazyRoute><UserRoles /></LazyRoute></ProtectedRoute>} />
        <Route path="/security-management" element={<ProtectedRoute><LazyRoute><SecurityManagement /></LazyRoute></ProtectedRoute>} />
        <Route path="/product-management" element={<ProtectedRoute><LazyRoute><ProductManagementPage /></LazyRoute></ProtectedRoute>} />
        <Route path="/attendance-management" element={<ProtectedRoute><LazyRoute><AttendanceManagement /></LazyRoute></ProtectedRoute>} />
        <Route path="/feedback-management" element={<ProtectedRoute><LazyRoute><FeedbackManagement /></LazyRoute></ProtectedRoute>} />
        <Route path="/competition-master" element={<ProtectedRoute><LazyRoute><CompetitionMaster /></LazyRoute></ProtectedRoute>} />
        <Route path="/competition-master/:competitorId" element={<ProtectedRoute><LazyRoute><CompetitorDetail /></LazyRoute></ProtectedRoute>} />
        <Route path="/retailer/:id" element={<LazyRoute><RetailerDetail /></LazyRoute>} />
        <Route path="/territories-and-distributors" element={<ProtectedRoute><LazyRoute><TerritoriesAndDistributors /></LazyRoute></ProtectedRoute>} />
        <Route path="/admin-expense-management" element={<ProtectedRoute><LazyRoute><AdminExpenseManagement /></LazyRoute></ProtectedRoute>} />
        <Route path="/operations" element={<ProtectedRoute><LazyRoute><Operations /></LazyRoute></ProtectedRoute>} />
        <Route path="/visit-planner" element={<ProtectedRoute><LazyRoute><VisitPlanner /></LazyRoute></ProtectedRoute>} />
        <Route path="/visits" element={<ProtectedRoute><LazyRoute><BeatPlanning /></LazyRoute></ProtectedRoute>} />
        <Route path="/beat-planning" element={<ProtectedRoute><LazyRoute><BeatPlanning /></LazyRoute></ProtectedRoute>} />
        {/* Critical offline routes - directly imported, no lazy loading */}
        <Route path="/visits/retailers" element={<ProtectedRoute><MyVisits /></ProtectedRoute>} />
        <Route path="/order-entry" element={<ProtectedRoute><OrderEntry /></ProtectedRoute>} />
        <Route path="/cart" element={<ProtectedRoute><Cart /></ProtectedRoute>} />
        <Route path="/my-beats" element={<ProtectedRoute><MyBeats /></ProtectedRoute>} />
        <Route path="/today-summary" element={<ProtectedRoute><TodaySummary /></ProtectedRoute>} />
        <Route path="/add-retailer" element={<ProtectedRoute><AddRetailer /></ProtectedRoute>} />
        <Route path="/attendance" element={<ProtectedRoute><Attendance /></ProtectedRoute>} />
        <Route path="/my-retailers" element={<ProtectedRoute><MyRetailers /></ProtectedRoute>} />
        
        {/* Lazy loaded routes */}
        <Route path="/create-beat" element={<ProtectedRoute><LazyRoute><CreateBeat /></LazyRoute></ProtectedRoute>} />
        <Route path="/beat/:id" element={<ProtectedRoute><LazyRoute><BeatDetail /></LazyRoute></ProtectedRoute>} />
        <Route path="/visit/:id" element={<ProtectedRoute><LazyRoute><VisitDetail /></LazyRoute></ProtectedRoute>} />
        <Route path="/beat-analytics" element={<ProtectedRoute><LazyRoute><BeatAnalytics /></LazyRoute></ProtectedRoute>} />
        <Route path="/add-records" element={<ProtectedRoute><LazyRoute><AddRecords /></LazyRoute></ProtectedRoute>} />
        <Route path="/add-beat" element={<ProtectedRoute><LazyRoute><AddBeat /></LazyRoute></ProtectedRoute>} />
        <Route path="/expenses" element={<ProtectedRoute><LazyRoute><MyExpenses /></LazyRoute></ProtectedRoute>} />
        <Route path="/leaderboard" element={<ProtectedRoute><LazyRoute><Leaderboard /></LazyRoute></ProtectedRoute>} />
        <Route path="/game-policy" element={<ProtectedRoute><LazyRoute><GamePolicy /></LazyRoute></ProtectedRoute>} />
        <Route path="/activities-info" element={<ProtectedRoute><LazyRoute><ActivitiesInfo /></LazyRoute></ProtectedRoute>} />
        <Route path="/badges-info" element={<ProtectedRoute><LazyRoute><BadgesInfo /></LazyRoute></ProtectedRoute>} />
        <Route path="/performance" element={<ProtectedRoute><LazyRoute><Performance /></LazyRoute></ProtectedRoute>} />
        <Route path="/sales-coach" element={<ProtectedRoute><LazyRoute><SalesCoach /></LazyRoute></ProtectedRoute>} />
        <Route path="/analytics" element={<ProtectedRoute><LazyRoute><Analytics /></LazyRoute></ProtectedRoute>} />
        <Route path="/schemes" element={<ProtectedRoute><LazyRoute><Schemes /></LazyRoute></ProtectedRoute>} />
        
        <Route path="/branding-requests" element={<ProtectedRoute><LazyRoute><BrandingRequests /></LazyRoute></ProtectedRoute>} />
        <Route path="/vendors" element={<ProtectedRoute><LazyRoute><Vendors /></LazyRoute></ProtectedRoute>} />
        <Route path="/gps-track" element={<ProtectedRoute><LazyRoute><GPSTrack /></LazyRoute></ProtectedRoute>} />
        <Route path="/gps-track-management" element={<ProtectedRoute><LazyRoute><GPSTrackManagement /></LazyRoute></ProtectedRoute>} />
        <Route path="/retail-management" element={<ProtectedRoute><LazyRoute><RetailManagement /></LazyRoute></ProtectedRoute>} />
        <Route path="/van-sales-management" element={<ProtectedRoute><LazyRoute><VanSalesManagement /></LazyRoute></ProtectedRoute>} />
        <Route path="/gamification-admin" element={<ProtectedRoute><LazyRoute><GamificationAdmin /></LazyRoute></ProtectedRoute>} />
        <Route path="/credit-management" element={<ProtectedRoute><LazyRoute><CreditManagement /></LazyRoute></ProtectedRoute>} />
        <Route path="/retailer-loyalty-admin" element={<ProtectedRoute><LazyRoute><RetailerLoyaltyAdmin /></LazyRoute></ProtectedRoute>} />
        <Route path="/retailer-loyalty" element={<ProtectedRoute><LazyRoute><RetailerLoyalty /></LazyRoute></ProtectedRoute>} />
        <Route path="/invoice-management" element={<ProtectedRoute><LazyRoute><InvoiceManagement /></LazyRoute></ProtectedRoute>} />
        <Route path="/pending-payments-all" element={<ProtectedRoute><LazyRoute><PendingPaymentsAll /></LazyRoute></ProtectedRoute>} />
        <Route path="/admin/performance-module" element={<ProtectedRoute><LazyRoute><PerformanceModuleAdmin /></LazyRoute></ProtectedRoute>} />
        <Route path="/admin/price-books" element={<ProtectedRoute><LazyRoute><PriceBookAdmin /></LazyRoute></ProtectedRoute>} />
        <Route path="/admin/price-books/:id" element={<ProtectedRoute><LazyRoute><PriceBookDetail /></LazyRoute></ProtectedRoute>} />
        <Route path="/my-targets" element={<ProtectedRoute><LazyRoute><MyTargets /></LazyRoute></ProtectedRoute>} />
        <Route path="/team-targets" element={<ProtectedRoute><LazyRoute><TeamTargets /></LazyRoute></ProtectedRoute>} />
        <Route path="/joint-sales-analytics" element={<ProtectedRoute><LazyRoute><JointSalesAnalytics /></LazyRoute></ProtectedRoute>} />
        <Route path="/features/beat-planning" element={<LazyRoute><BeatPlanningFeature /></LazyRoute>} />
        <Route path="/features/retailer-management" element={<LazyRoute><RetailerManagementFeature /></LazyRoute>} />
        <Route path="/features/visit-scheduling" element={<LazyRoute><VisitSchedulingFeature /></LazyRoute>} />
        <Route path="/features/sales-analytics" element={<LazyRoute><SalesAnalyticsFeature /></LazyRoute>} />
        <Route path="/features/performance-tracking" element={<LazyRoute><PerformanceTrackingFeature /></LazyRoute>} />
        <Route path="/features/growth-analytics" element={<LazyRoute><GrowthAnalyticsFeature /></LazyRoute>} />
        <Route path="/onboarding" element={<ProtectedRoute><LazyRoute><EmployeeOnboarding /></LazyRoute></ProtectedRoute>} />
        <Route path="/employee-360" element={<ProtectedRoute><LazyRoute><Employee360 /></LazyRoute></ProtectedRoute>} />
        <Route path="/recycle-bin" element={<ProtectedRoute><LazyRoute><RecycleBin /></LazyRoute></ProtectedRoute>} />
        <Route path="/admin/recycle-bin" element={<ProtectedRoute><LazyRoute><RecycleBinAdmin /></LazyRoute></ProtectedRoute>} />
        <Route path="/distributor-master" element={<ProtectedRoute><LazyRoute><DistributorMaster /></LazyRoute></ProtectedRoute>} />
        <Route path="/add-distributor" element={<ProtectedRoute><LazyRoute><AddDistributor /></LazyRoute></ProtectedRoute>} />
        <Route path="/distributor/:id" element={<ProtectedRoute><LazyRoute><DistributorDetail /></LazyRoute></ProtectedRoute>} />
        <Route path="/edit-distributor/:id" element={<ProtectedRoute><LazyRoute><EditDistributor /></LazyRoute></ProtectedRoute>} />
        <Route path="/primary-orders" element={<ProtectedRoute><LazyRoute><PrimaryOrders /></LazyRoute></ProtectedRoute>} />

        {/* Distributor Portal Routes */}
        <Route path="/distributor-portal/login" element={<LazyRoute><DistributorLogin /></LazyRoute>} />
        <Route path="/distributor-portal/dashboard" element={<LazyRoute><DistributorDashboard /></LazyRoute>} />
        <Route path="/distributor-portal/primary-orders" element={<LazyRoute><PrimaryOrdersList /></LazyRoute>} />
        <Route path="/distributor-portal/create-primary-order" element={<LazyRoute><CreatePrimaryOrder /></LazyRoute>} />
        <Route path="/distributor-portal/primary-order/:id" element={<LazyRoute><PrimaryOrderDetail /></LazyRoute>} />
        <Route path="/distributor-portal/inventory" element={<LazyRoute><DistributorInventory /></LazyRoute>} />
        <Route path="/distributor-portal/secondary-sales" element={<LazyRoute><SecondarySales /></LazyRoute>} />
        <Route path="/distributor-portal/packing-list" element={<LazyRoute><PackingList /></LazyRoute>} />
        <Route path="/distributor-portal/goods-receipt" element={<LazyRoute><GoodsReceipt /></LazyRoute>} />
        <Route path="/distributor-portal/claims" element={<LazyRoute><DistributorClaims /></LazyRoute>} />
        <Route path="/distributor-portal/support" element={<LazyRoute><DistributorSupport /></LazyRoute>} />
        <Route path="/distributor-portal/ideas" element={<LazyRoute><DistributorIdeas /></LazyRoute>} />
        <Route path="/distributor-portal/profile" element={<LazyRoute><DistributorProfile /></LazyRoute>} />
        <Route path="/distributor-portal/contacts" element={<LazyRoute><DistributorContactsPortal /></LazyRoute>} />
        <Route path="/distributor-portal/fy-plan" element={<LazyRoute><DistributorFYPlanPage /></LazyRoute>} />

        {/* Institutional Sales Routes */}
        <Route path="/institutional" element={<ProtectedRoute><LazyRoute><InstitutionalSalesDashboard /></LazyRoute></ProtectedRoute>} />
        <Route path="/institutional/leads" element={<ProtectedRoute><LazyRoute><LeadManagement /></LazyRoute></ProtectedRoute>} />
        <Route path="/institutional/accounts" element={<ProtectedRoute><LazyRoute><AccountManagement /></LazyRoute></ProtectedRoute>} />
        <Route path="/institutional/account/:id" element={<ProtectedRoute><LazyRoute><AccountDetail /></LazyRoute></ProtectedRoute>} />
        <Route path="/institutional/contacts" element={<ProtectedRoute><LazyRoute><ContactManagement /></LazyRoute></ProtectedRoute>} />
        <Route path="/institutional/contact/:id" element={<ProtectedRoute><LazyRoute><ContactDetail /></LazyRoute></ProtectedRoute>} />
        <Route path="/institutional/opportunities" element={<ProtectedRoute><LazyRoute><OpportunityManagement /></LazyRoute></ProtectedRoute>} />
        <Route path="/institutional/opportunity/:id" element={<ProtectedRoute><LazyRoute><OpportunityDetail /></LazyRoute></ProtectedRoute>} />
        <Route path="/institutional/quotes" element={<ProtectedRoute><LazyRoute><QuoteManagement /></LazyRoute></ProtectedRoute>} />
        <Route path="/institutional/quote/:id" element={<ProtectedRoute><LazyRoute><QuoteDetail /></LazyRoute></ProtectedRoute>} />
        <Route path="/institutional/products" element={<ProtectedRoute><LazyRoute><InstitutionalProducts /></LazyRoute></ProtectedRoute>} />
        <Route path="/institutional/order-commitments" element={<ProtectedRoute><LazyRoute><OrderCommitments /></LazyRoute></ProtectedRoute>} />
        <Route path="/institutional/invoices" element={<ProtectedRoute><LazyRoute><InstitutionalInvoices /></LazyRoute></ProtectedRoute>} />
        <Route path="/institutional/price-books" element={<ProtectedRoute><LazyRoute><PriceBooks /></LazyRoute></ProtectedRoute>} />
        <Route path="/institutional/collections" element={<ProtectedRoute><LazyRoute><Collections /></LazyRoute></ProtectedRoute>} />

        <Route path="*" element={<LazyRoute><NotFound /></LazyRoute>} />
      </Routes>
    </>
  );
};

export default App;

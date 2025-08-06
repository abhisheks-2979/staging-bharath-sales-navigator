import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AuthPage } from "@/components/auth/AuthPage";
import Index from "./pages/Index";
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
import Expenses from "./pages/Expenses";
import Leaderboard from "./pages/Leaderboard";
import Performance from "./pages/Performance";
import SalesCoach from "./pages/SalesCoach";
import Analytics from "./pages/Analytics";
import { Schemes } from "./pages/Schemes";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <PWAInstallPrompt />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/" element={
              <ProtectedRoute>
                <Index />
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
                <Expenses />
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
            <Route path="/beat-analytics" element={
              <ProtectedRoute>
                <Analytics />
              </ProtectedRoute>
            } />
            <Route path="/schemes" element={
              <ProtectedRoute>
                <Schemes />
              </ProtectedRoute>
            } />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

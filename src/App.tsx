import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/visit-planner" element={<VisitPlanner />} />
          <Route path="/visits" element={<BeatPlanning />} />
          <Route path="/visits/retailers" element={<MyVisits />} />
          <Route path="/order-entry" element={<OrderEntry />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/create-beat" element={<CreateBeat />} />
          <Route path="/visit/:id" element={<VisitDetail />} />
          <Route path="/beat-analytics" element={<BeatAnalytics />} />
          <Route path="/today-summary" element={<TodaySummary />} />
            <Route path="/add-retailer" element={<AddRetailer />} />
            <Route path="/add-distributor" element={<AddDistributor />} />
            <Route path="/add-super-stockist" element={<AddSuperStockist />} />
            <Route path="/add-records" element={<AddRecords />} />
          <Route path="/add-beat" element={<AddBeat />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/expenses" element={<Expenses />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/performance" element={<Performance />} />
          <Route path="/sales-coach" element={<SalesCoach />} />
          <Route path="/beat-analytics" element={<Analytics />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

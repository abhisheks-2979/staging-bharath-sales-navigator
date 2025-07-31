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
import { Retailers } from "./pages/Retailers";
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
          <Route path="/retailers" element={<Retailers />} />
          <Route path="/visit/:id" element={<VisitDetail />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

import { useState } from "react";
import { Check, Sparkles, Target, Brain, BarChart3, Users, Trophy, Truck, Building2, Shield, Settings, ChevronRight, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import quickappLogo from "@/assets/quickapp-logo.png";
import { cn } from "@/lib/utils";

const featureCategories = [
  {
    id: "sales",
    title: "Sales Execution",
    icon: Target,
    color: "from-amber-500 to-orange-500",
    tagline: "Execute flawlessly in the field",
    features: [
      { name: "Beat Planning & Management", description: "Create, assign, and optimize sales beats with territory mapping" },
      { name: "Visit Management", description: "Plan, execute, and track retailer visits with check-in/check-out" },
      { name: "Order Entry", description: "Quick order capture with product catalog, pricing, and schemes" },
      { name: "Attendance Management", description: "Face-verified check-in/check-out with GPS location" },
      { name: "GPS Tracking", description: "Real-time location tracking and journey mapping" },
      { name: "Route Optimization", description: "AI-suggested optimal visit routes to save time" },
      { name: "No-Order Capture", description: "Record reasons for unproductive visits" },
      { name: "Visit Calendar", description: "Weekly and monthly visit planning view" },
      { name: "Joint Sales Visits", description: "Manager accompaniment tracking and feedback" },
    ]
  },
  {
    id: "ai",
    title: "AI Intelligence",
    icon: Brain,
    color: "from-purple-500 to-pink-500",
    tagline: "Smart insights that drive results",
    features: [
      { name: "Sales Coach AI", description: "AI-powered sales recommendations and coaching tips" },
      { name: "Stock Image Analysis", description: "AI scans shelf images to detect stock levels" },
      { name: "Credit Score AI", description: "Automatic retailer credit scoring based on payment history" },
      { name: "Smart Recommendations", description: "AI-suggested products based on retailer history" },
      { name: "Competition Insight AI", description: "Analyze competitor products from photos" },
      { name: "Board Scanning", description: "OCR to capture retailer information from signboards" },
      { name: "Voice Notes", description: "Voice-to-text for quick note capture" },
      { name: "Chat Assistant", description: "AI chatbot for instant answers and support" },
      { name: "Predictive Analytics", description: "Forecast sales trends and demand patterns" },
    ]
  },
  {
    id: "analytics",
    title: "Analytics & Insights",
    icon: BarChart3,
    color: "from-blue-500 to-cyan-500",
    tagline: "Data-driven decisions",
    features: [
      { name: "Real-time Dashboard", description: "Live sales, visits, and performance metrics" },
      { name: "Performance Reports", description: "Detailed reports on team and individual performance" },
      { name: "Beat Analytics", description: "Analysis of beat productivity and coverage" },
      { name: "Retailer Analytics", description: "Deep dive into retailer performance and trends" },
      { name: "Territory Dashboard", description: "Territory-wise sales and coverage analysis" },
      { name: "Target vs Achievement", description: "Track progress against sales targets" },
      { name: "Trend Analysis", description: "Historical trends and growth patterns" },
      { name: "Export Reports", description: "Download reports in Excel/PDF formats" },
      { name: "Custom KPIs", description: "Configure and track custom performance metrics" },
    ]
  },
  {
    id: "retailer",
    title: "Retailer Management",
    icon: Users,
    color: "from-green-500 to-emerald-500",
    tagline: "Build lasting relationships",
    features: [
      { name: "Retailer Profiles", description: "Complete retailer information with photos and location" },
      { name: "Loyalty Programs", description: "Points-based rewards and redemption system" },
      { name: "Scheme Management", description: "Create and apply promotional schemes" },
      { name: "Credit Management", description: "Credit limits, outstanding tracking, and alerts" },
      { name: "Payment Collection", description: "Record payments with proof upload" },
      { name: "Retailer Feedback", description: "Capture and track retailer feedback" },
      { name: "Baseline Photos", description: "Store reference photos for each retailer" },
      { name: "Order History", description: "Complete order history and trends per retailer" },
      { name: "Bulk Import", description: "Import retailers from Excel files" },
    ]
  },
  {
    id: "gamification",
    title: "Gamification",
    icon: Trophy,
    color: "from-yellow-500 to-amber-500",
    tagline: "Motivate and engage teams",
    features: [
      { name: "Leaderboard", description: "Real-time rankings with daily, weekly, monthly views" },
      { name: "Badges & Achievements", description: "Earn badges for hitting milestones" },
      { name: "Points System", description: "Earn points for productive activities" },
      { name: "Team Competition", description: "Territory and team-based competitions" },
      { name: "Streak Tracking", description: "Track consecutive productive days" },
      { name: "Performance Calendar", description: "Visual calendar showing daily performance" },
      { name: "Rewards Management", description: "Configure and distribute rewards" },
      { name: "Goal Setting", description: "Personal and team goal tracking" },
      { name: "Recognition Alerts", description: "Real-time notifications for achievements" },
    ]
  },
  {
    id: "van",
    title: "Van Sales",
    icon: Truck,
    color: "from-orange-500 to-red-500",
    tagline: "Mobile commerce made easy",
    features: [
      { name: "Morning Inventory", description: "Load van stock at start of day" },
      { name: "Stock Management", description: "Track van inventory in real-time" },
      { name: "Route Sales", description: "Execute sales directly from van" },
      { name: "Closing Stock", description: "End-of-day stock reconciliation" },
      { name: "Return Stock", description: "Process and track returned items" },
      { name: "Invoice Generation", description: "Generate invoices on-the-spot" },
      { name: "Cash Collection", description: "Track cash and payment collection" },
      { name: "Stock Transfer", description: "Transfer stock between vans" },
      { name: "Route Analysis", description: "Analyze van route performance" },
    ]
  },
  {
    id: "distributor",
    title: "Distributor Portal",
    icon: Building2,
    color: "from-indigo-500 to-purple-500",
    tagline: "Empower your distribution network",
    features: [
      { name: "Primary Orders", description: "Place and track orders to company" },
      { name: "Inventory Management", description: "Track distributor stock levels" },
      { name: "Claims Management", description: "Submit and track claims" },
      { name: "Goods Receipt", description: "Receive and verify shipments" },
      { name: "Secondary Sales", description: "Track sales to retailers" },
      { name: "Business Planning", description: "Annual business plan and targets" },
      { name: "Contact Management", description: "Manage distributor team contacts" },
      { name: "Support Requests", description: "Raise and track support tickets" },
      { name: "Idea Submission", description: "Submit product and market ideas" },
    ]
  },
  {
    id: "institutional",
    title: "Institutional Sales",
    icon: Building2,
    color: "from-teal-500 to-green-500",
    tagline: "Win big accounts",
    features: [
      { name: "Lead Management", description: "Capture and nurture sales leads" },
      { name: "Opportunity Tracking", description: "Pipeline and deal management" },
      { name: "Quote Generation", description: "Create and send quotations" },
      { name: "Account Management", description: "Manage institutional accounts" },
      { name: "Contact Management", description: "Track key contacts per account" },
      { name: "Order Commitments", description: "Track committed orders" },
      { name: "Collections", description: "Track and collect payments" },
      { name: "Price Books", description: "Account-specific pricing" },
      { name: "Invoice Management", description: "Generate and track invoices" },
    ]
  },
  {
    id: "enterprise",
    title: "Enterprise Features",
    icon: Shield,
    color: "from-slate-500 to-gray-600",
    tagline: "Built for scale",
    features: [
      { name: "Multi-Language Support", description: "Hindi, Tamil, Telugu, Kannada, Gujarati, English" },
      { name: "Offline-First", description: "Full functionality without internet" },
      { name: "Role-Based Access", description: "Granular permissions and security" },
      { name: "User Management", description: "Create and manage user accounts" },
      { name: "Territory Management", description: "Hierarchical territory structure" },
      { name: "Holiday Management", description: "Configure holidays and leave" },
      { name: "Approval Workflows", description: "Multi-level approval processes" },
      { name: "Audit Trail", description: "Track all system activities" },
      { name: "Data Export", description: "Export data for external analysis" },
    ]
  },
  {
    id: "integration",
    title: "Integration & Support",
    icon: Settings,
    color: "from-rose-500 to-pink-500",
    tagline: "Connect everything",
    features: [
      { name: "WhatsApp Integration", description: "Send invoices and notifications via WhatsApp" },
      { name: "SMS Notifications", description: "Configurable SMS alerts" },
      { name: "Push Notifications", description: "Real-time app notifications" },
      { name: "PWA Support", description: "Install as native app on any device" },
      { name: "API Access", description: "REST APIs for integration" },
      { name: "Supabase Backend", description: "Secure and scalable cloud backend" },
      { name: "Real-time Sync", description: "Instant data synchronization" },
      { name: "Branding Requests", description: "Request and track branding materials" },
      { name: "Vendor Management", description: "Manage external vendors" },
    ]
  }
];

const FeatureListPage = () => {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState(featureCategories[0].id);
  
  const currentCategory = featureCategories.find(c => c.id === activeCategory) || featureCategories[0];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1A1F2C] via-[#1A1F2C] to-[#0F1218]">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#1A1F2C]/95 backdrop-blur-sm border-b border-white/10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")}>
            <img src={quickappLogo} alt="QuickApp.AI" className="h-10 w-10 rounded-lg" />
            <span className="text-xl font-bold text-white">QuickApp.AI</span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" className="text-white/80 hover:text-white" onClick={() => navigate("/")}>
              Back to Home
            </Button>
            <Button className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white" onClick={() => navigate("/auth")}>
              Get Started
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section - Compact */}
      <section className="pt-28 pb-8 px-4">
        <div className="container mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-full px-4 py-2 mb-4">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="text-amber-400 text-sm font-medium">100+ Features Across 10 Modules</span>
          </div>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3">
            Explore Our Platform
          </h1>
          <p className="text-lg text-white/60 max-w-2xl mx-auto">
            Click any category to discover powerful features designed to transform your field sales operations.
          </p>
        </div>
      </section>

      {/* Interactive Feature Explorer */}
      <section className="pb-20 px-4">
        <div className="container mx-auto">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Category Navigation - Sticky on desktop */}
            <div className="lg:w-80 lg:flex-shrink-0">
              <div className="lg:sticky lg:top-24 space-y-2">
                <p className="text-white/40 text-xs uppercase tracking-wider mb-3 px-2">Categories</p>
                {featureCategories.map((category) => {
                  const isActive = activeCategory === category.id;
                  return (
                    <button
                      key={category.id}
                      onClick={() => setActiveCategory(category.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 text-left group",
                        isActive 
                          ? "bg-white/10 border border-white/20" 
                          : "hover:bg-white/5 border border-transparent"
                      )}
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-300",
                        isActive 
                          ? `bg-gradient-to-br ${category.color}` 
                          : "bg-white/10 group-hover:bg-white/15"
                      )}>
                        <category.icon className={cn(
                          "w-5 h-5 transition-colors",
                          isActive ? "text-white" : "text-white/60 group-hover:text-white/80"
                        )} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "font-medium truncate transition-colors",
                          isActive ? "text-white" : "text-white/70 group-hover:text-white/90"
                        )}>
                          {category.title}
                        </p>
                        <p className="text-xs text-white/40 truncate">{category.features.length} features</p>
                      </div>
                      <ChevronRight className={cn(
                        "w-4 h-4 transition-all duration-300",
                        isActive 
                          ? "text-white/60 rotate-90" 
                          : "text-white/30 group-hover:text-white/50"
                      )} />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Feature Display Area */}
            <div className="flex-1 min-w-0">
              <div 
                key={activeCategory}
                className="animate-fade-in"
              >
                {/* Category Header */}
                <div className="mb-8">
                  <div className="flex items-center gap-4 mb-3">
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${currentCategory.color} flex items-center justify-center`}>
                      <currentCategory.icon className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl md:text-3xl font-bold text-white">{currentCategory.title}</h2>
                      <p className="text-white/60">{currentCategory.tagline}</p>
                    </div>
                  </div>
                </div>

                {/* Features Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {currentCategory.features.map((feature, index) => (
                    <div 
                      key={feature.name}
                      className="bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/10 hover:border-white/20 transition-all duration-300 hover:scale-[1.02] group"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${currentCategory.color} flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform`}>
                          <Check className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <h3 className="text-white font-semibold mb-1 group-hover:text-amber-300 transition-colors">{feature.name}</h3>
                          <p className="text-white/60 text-sm leading-relaxed">{feature.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Quick Stats */}
                <div className="mt-8 p-6 bg-gradient-to-r from-white/5 to-white/[0.02] rounded-xl border border-white/10">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-white/40 text-sm">This module includes</p>
                      <p className="text-2xl font-bold text-white">{currentCategory.features.length} powerful features</p>
                    </div>
                    <Button 
                      className={`bg-gradient-to-r ${currentCategory.color} hover:opacity-90 text-white`}
                      onClick={() => navigate("/auth")}
                    >
                      Try {currentCategory.title}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Navigation Pills - Mobile friendly */}
      <div className="lg:hidden fixed bottom-4 left-4 right-4 z-40">
        <div className="bg-[#1A1F2C]/95 backdrop-blur-md rounded-2xl border border-white/10 p-2 overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            {featureCategories.map((category) => {
              const isActive = activeCategory === category.id;
              return (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-xl transition-all whitespace-nowrap",
                    isActive 
                      ? `bg-gradient-to-r ${category.color} text-white` 
                      : "text-white/60 hover:text-white hover:bg-white/10"
                  )}
                >
                  <category.icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{category.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <section className="py-16 px-4 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-t border-white/10">
        <div className="container mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
            Ready to Experience All Features?
          </h2>
          <p className="text-lg text-white/60 mb-6 max-w-xl mx-auto">
            Start your free trial and explore every feature with your team.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button 
              size="lg"
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white px-8"
              onClick={() => navigate("/auth")}
            >
              Start Free Trial
            </Button>
            <Button 
              size="lg"
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10 px-8"
              onClick={() => navigate("/roi-calculator")}
            >
              Calculate ROI
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-white/10 mb-20 lg:mb-0">
        <div className="container mx-auto text-center text-white/40 text-sm">
          © 2024 QuickApp.AI by KVP Business Solutions. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default FeatureListPage;

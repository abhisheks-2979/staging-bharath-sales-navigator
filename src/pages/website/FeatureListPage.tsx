import { Check, Sparkles, MapPin, ShoppingCart, Users, BarChart3, Trophy, Truck, Building2, Smartphone, Globe, Shield, Zap, Brain, Target, Clock, Camera, MessageSquare, Bell, FileText, CreditCard, Package, Headphones, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import quickappLogo from "@/assets/quickapp-logo.png";

const featureCategories = [
  {
    title: "Sales Execution",
    icon: Target,
    color: "from-amber-500 to-orange-500",
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
    title: "AI Intelligence",
    icon: Brain,
    color: "from-purple-500 to-pink-500",
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
    title: "Analytics & Insights",
    icon: BarChart3,
    color: "from-blue-500 to-cyan-500",
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
    title: "Retailer Management",
    icon: Users,
    color: "from-green-500 to-emerald-500",
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
    title: "Gamification",
    icon: Trophy,
    color: "from-yellow-500 to-amber-500",
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
    title: "Van Sales",
    icon: Truck,
    color: "from-orange-500 to-red-500",
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
    title: "Distributor Portal",
    icon: Building2,
    color: "from-indigo-500 to-purple-500",
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
    title: "Institutional Sales",
    icon: Building2,
    color: "from-teal-500 to-green-500",
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
    title: "Enterprise Features",
    icon: Shield,
    color: "from-slate-500 to-gray-500",
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
    title: "Integration & Support",
    icon: Settings,
    color: "from-rose-500 to-pink-500",
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

      {/* Hero Section */}
      <section className="pt-32 pb-16 px-4">
        <div className="container mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-full px-4 py-2 mb-6">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="text-amber-400 text-sm font-medium">100+ Features</span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
            Complete Feature List
          </h1>
          <p className="text-xl text-white/60 max-w-3xl mx-auto mb-8">
            Explore all the powerful features that make QuickApp.AI the most comprehensive 
            field sales automation platform in the market.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <div className="flex items-center gap-2 text-white/60">
              <Check className="w-5 h-5 text-green-400" />
              <span>AI-Powered</span>
            </div>
            <div className="flex items-center gap-2 text-white/60">
              <Check className="w-5 h-5 text-green-400" />
              <span>Offline-First</span>
            </div>
            <div className="flex items-center gap-2 text-white/60">
              <Check className="w-5 h-5 text-green-400" />
              <span>Multi-Language</span>
            </div>
            <div className="flex items-center gap-2 text-white/60">
              <Check className="w-5 h-5 text-green-400" />
              <span>Enterprise Ready</span>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Categories */}
      <section className="pb-20 px-4">
        <div className="container mx-auto">
          {featureCategories.map((category, categoryIndex) => (
            <div key={categoryIndex} className="mb-16">
              <div className="flex items-center gap-4 mb-8">
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${category.color} flex items-center justify-center`}>
                  <category.icon className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold text-white">{category.title}</h2>
                  <p className="text-white/60">{category.features.length} features</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {category.features.map((feature, featureIndex) => (
                  <div 
                    key={featureIndex}
                    className="bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/10 hover:border-white/20 transition-all duration-300"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${category.color} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                        <Check className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <h3 className="text-white font-semibold mb-1">{feature.name}</h3>
                        <p className="text-white/60 text-sm">{feature.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-t border-white/10">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Transform Your Sales Operations?
          </h2>
          <p className="text-xl text-white/60 mb-8 max-w-2xl mx-auto">
            Join leading FMCG and beverage companies using QuickApp.AI to boost their field sales productivity.
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
              onClick={() => navigate("/")}
            >
              Back to Home
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-white/10">
        <div className="container mx-auto text-center text-white/40 text-sm">
          © 2024 QuickApp.AI by KVP Business Solutions. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default FeatureListPage;

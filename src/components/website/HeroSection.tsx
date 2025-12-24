import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { 
  Brain, 
  MapPin, 
  Store, 
  Package, 
  ShoppingCart, 
  BarChart3, 
  MessageSquare, 
  CheckSquare,
  Sparkles,
  TrendingUp,
  Gift,
  ArrowRight
} from "lucide-react";
import { motion } from "framer-motion";

const FeatureCard = ({ 
  icon: Icon, 
  title, 
  description, 
  className = "",
  delay = 0 
}: { 
  icon: React.ElementType; 
  title: string; 
  description: string; 
  className?: string;
  delay?: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
    className={`bg-card/90 backdrop-blur-xl border border-border/50 rounded-xl p-4 shadow-lg max-w-[280px] ${className}`}
  >
    <div className="flex items-start gap-3">
      <div className="p-2 rounded-lg bg-primary/10 shrink-0">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div>
        <h4 className="font-semibold text-foreground text-sm mb-1">{title}</h4>
        <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </div>
  </motion.div>
);

const AIRecommendationCard = ({ delay = 0 }: { delay?: number }) => (
  <motion.div
    initial={{ opacity: 0, x: -30 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ duration: 0.6, delay }}
    className="bg-card/95 backdrop-blur-xl border border-border/50 rounded-xl p-5 shadow-2xl max-w-[320px]"
  >
    <div className="flex items-center gap-2 mb-3">
      <div className="p-1.5 rounded-lg bg-accent-gold/20">
        <Sparkles className="w-4 h-4 text-accent-gold" />
      </div>
      <span className="text-xs font-medium text-accent-gold">AI Recommendation</span>
    </div>
    <p className="text-sm text-foreground mb-3">
      "Based on your sales pattern, visit <span className="font-semibold text-primary">Sector 15 Beat</span> today. 
      3 high-priority retailers need attention."
    </p>
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <MapPin className="w-3.5 h-3.5" />
      <span>12 retailers • 2.5km route</span>
    </div>
  </motion.div>
);

const TopRetailersCard = ({ delay = 0 }: { delay?: number }) => (
  <motion.div
    initial={{ opacity: 0, x: 30 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ duration: 0.6, delay }}
    className="bg-card/95 backdrop-blur-xl border border-border/50 rounded-xl p-5 shadow-2xl max-w-[300px]"
  >
    <div className="flex items-center gap-2 mb-3">
      <div className="p-1.5 rounded-lg bg-primary/10">
        <Store className="w-4 h-4 text-primary" />
      </div>
      <span className="text-xs font-medium text-primary">Top Retailers</span>
    </div>
    <div className="space-y-2">
      {[
        { name: "Sharma General Store", revenue: "₹45K/mo", trend: "+12%" },
        { name: "Gupta Traders", revenue: "₹38K/mo", trend: "+8%" },
        { name: "City Mart", revenue: "₹32K/mo", trend: "+15%" },
      ].map((retailer, i) => (
        <div key={i} className="flex items-center justify-between text-xs">
          <span className="text-foreground">{retailer.name}</span>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">{retailer.revenue}</span>
            <span className="text-green-500 flex items-center">
              <TrendingUp className="w-3 h-3 mr-0.5" />
              {retailer.trend}
            </span>
          </div>
        </div>
      ))}
    </div>
  </motion.div>
);

const OrderCard = ({ delay = 0 }: { delay?: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6, delay }}
    className="bg-card/95 backdrop-blur-xl border border-border/50 rounded-xl p-4 shadow-2xl max-w-[260px]"
  >
    <div className="flex items-center gap-2 mb-3">
      <div className="p-1.5 rounded-lg bg-green-500/10">
        <ShoppingCart className="w-4 h-4 text-green-500" />
      </div>
      <span className="text-xs font-medium text-green-500">Quick Order</span>
    </div>
    <div className="space-y-2 text-xs">
      <div className="flex justify-between">
        <span className="text-muted-foreground">Premium Rice 25kg</span>
        <span className="text-foreground">x10</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Cooking Oil 5L</span>
        <span className="text-foreground">x15</span>
      </div>
      <div className="border-t border-border pt-2 mt-2 flex justify-between font-medium">
        <span className="text-foreground">Total</span>
        <span className="text-primary">₹12,450</span>
      </div>
    </div>
  </motion.div>
);

const SchemeCard = ({ delay = 0 }: { delay?: number }) => (
  <motion.div
    initial={{ opacity: 0, y: -20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6, delay }}
    className="bg-gradient-to-br from-accent-gold/20 to-accent-bronze/20 backdrop-blur-xl border border-accent-gold/30 rounded-xl p-4 shadow-2xl max-w-[240px]"
  >
    <div className="flex items-center gap-2 mb-2">
      <Gift className="w-4 h-4 text-accent-gold" />
      <span className="text-xs font-medium text-accent-gold">Active Scheme</span>
    </div>
    <p className="text-sm font-semibold text-foreground mb-1">Buy 10 Get 1 Free</p>
    <p className="text-xs text-muted-foreground">Valid on Premium Range • Ends Dec 31</p>
  </motion.div>
);

export const HeroSection = () => {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-[90vh] py-16 lg:py-20 px-4 overflow-hidden bg-gradient-to-b from-background via-background to-muted/30">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl"></div>
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-accent-gold/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl animate-pulse"></div>
      </div>

      <div className="container mx-auto relative z-10">
        {/* Header content */}
        <div className="text-center mb-12">
          {/* Badge */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6 border border-primary/20"
          >
            <Brain className="h-4 w-4" />
            AI-Powered Field Sales Platform
          </motion.div>

          {/* Main Headline */}
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight"
          >
            Superpowers for
            <br />
            <span className="bg-gradient-to-r from-primary to-accent-gold bg-clip-text text-transparent">
              Every Sales Rep
            </span>
          </motion.h1>

          {/* Sub-headline */}
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto"
          >
            AI recommendations, smart routing, instant orders, and real-time insights — 
            all in one app that guides your field team to success.
          </motion.p>

          {/* CTAs */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Button 
              size="lg"
              onClick={() => navigate('/auth')}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-6 text-lg font-semibold gap-2"
            >
              Start Free Trial
              <ArrowRight className="w-5 h-5" />
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              onClick={() => navigate('/request-demo')}
              className="border-border bg-background/50 text-foreground hover:bg-muted px-8 py-6 text-lg font-medium"
            >
              Request Demo
            </Button>
          </motion.div>
        </div>

        {/* Feature showcase with floating cards */}
        <div className="relative max-w-6xl mx-auto">
          {/* Center illustration area - could be replaced with actual app screenshot */}
          <div className="flex justify-center items-center min-h-[400px] relative">
            {/* Central visual - sales rep silhouette or app mockup */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="relative w-64 h-64 md:w-80 md:h-80 rounded-full bg-gradient-to-br from-primary/20 via-primary/10 to-transparent flex items-center justify-center"
            >
              <div className="w-48 h-48 md:w-60 md:h-60 rounded-full bg-gradient-to-br from-primary/30 to-accent-gold/20 flex items-center justify-center shadow-2xl">
                <div className="text-center">
                  <div className="w-20 h-20 md:w-24 md:h-24 mx-auto rounded-full bg-primary/20 flex items-center justify-center mb-2">
                    <Brain className="w-10 h-10 md:w-12 md:h-12 text-primary" />
                  </div>
                  <p className="text-sm font-medium text-foreground">AI-Guided</p>
                  <p className="text-xs text-muted-foreground">Field Sales</p>
                </div>
              </div>
            </motion.div>

            {/* Floating feature cards positioned around the center */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Left side cards */}
              <div className="absolute left-0 top-0 pointer-events-auto">
                <AIRecommendationCard delay={0.5} />
              </div>
              
              <div className="absolute left-0 bottom-0 pointer-events-auto hidden md:block">
                <FeatureCard 
                  icon={MessageSquare} 
                  title="Retailer Feedback" 
                  description="Capture voice notes, photos & feedback during visits"
                  delay={0.7}
                />
              </div>

              {/* Right side cards */}
              <div className="absolute right-0 top-0 pointer-events-auto">
                <TopRetailersCard delay={0.6} />
              </div>

              <div className="absolute right-0 bottom-0 pointer-events-auto hidden md:block">
                <OrderCard delay={0.8} />
              </div>

              {/* Top center */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-auto hidden lg:block">
                <SchemeCard delay={0.9} />
              </div>

              {/* Bottom cards - visible on larger screens */}
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex gap-4 pointer-events-auto hidden lg:flex">
                <FeatureCard 
                  icon={BarChart3} 
                  title="Real-time Reports" 
                  description="Track performance, targets & analytics"
                  delay={1.0}
                />
                <FeatureCard 
                  icon={CheckSquare} 
                  title="Smart Checklists" 
                  description="Never miss a task with guided workflows"
                  delay={1.1}
                />
              </div>
            </div>
          </div>

          {/* Mobile feature grid */}
          <div className="grid grid-cols-2 gap-3 mt-8 md:hidden">
            <FeatureCard 
              icon={Package} 
              title="Product Bundles" 
              description="AI-suggested combos"
              delay={0.7}
            />
            <FeatureCard 
              icon={BarChart3} 
              title="Reports" 
              description="Real-time analytics"
              delay={0.8}
            />
            <FeatureCard 
              icon={MessageSquare} 
              title="Feedback" 
              description="Capture insights"
              delay={0.9}
            />
            <FeatureCard 
              icon={CheckSquare} 
              title="Checklists" 
              description="Guided workflows"
              delay={1.0}
            />
          </div>
        </div>
      </div>
    </section>
  );
};

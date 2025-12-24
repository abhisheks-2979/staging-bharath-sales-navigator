import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { 
  MapPin, 
  Store, 
  ShoppingCart, 
  TrendingUp,
  Gift,
  ArrowRight,
  MessageCircle,
  Mic,
  Target,
  Users,
  Lightbulb,
  Sparkles
} from "lucide-react";
import { motion } from "framer-motion";
import salesRepHero from "@/assets/sales-rep-hero.png";

const FeatureCard = ({ 
  icon: Icon, 
  title, 
  description, 
  className = "",
  delay = 0,
  iconColor = "text-primary",
  iconBg = "bg-primary/10"
}: { 
  icon: React.ElementType; 
  title: string; 
  description: string; 
  className?: string;
  delay?: number;
  iconColor?: string;
  iconBg?: string;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
    className={`bg-card/90 backdrop-blur-xl border border-border/50 rounded-xl p-3 md:p-4 shadow-lg ${className}`}
  >
    <div className="flex items-start gap-2 md:gap-3">
      <div className={`p-1.5 md:p-2 rounded-lg ${iconBg} shrink-0`}>
        <Icon className={`w-4 h-4 md:w-5 md:h-5 ${iconColor}`} />
      </div>
      <div className="min-w-0">
        <h4 className="font-semibold text-foreground text-xs md:text-sm mb-0.5 md:mb-1 truncate">{title}</h4>
        <p className="text-[10px] md:text-xs text-muted-foreground leading-relaxed line-clamp-2">{description}</p>
      </div>
    </div>
  </motion.div>
);

const AIRecommendationCard = ({ delay = 0 }: { delay?: number }) => (
  <motion.div
    initial={{ opacity: 0, x: -30 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ duration: 0.6, delay }}
    className="bg-card/95 backdrop-blur-xl border border-border/50 rounded-xl p-3 md:p-5 shadow-2xl w-full max-w-[280px] md:max-w-[320px]"
  >
    <div className="flex items-center gap-2 mb-2 md:mb-3">
      <div className="p-1 md:p-1.5 rounded-lg bg-accent-gold/20">
        <Sparkles className="w-3 h-3 md:w-4 md:h-4 text-accent-gold" />
      </div>
      <span className="text-[10px] md:text-xs font-medium text-accent-gold">AI Recommendation</span>
    </div>
    <p className="text-xs md:text-sm text-foreground mb-2 md:mb-3">
      "Visit <span className="font-semibold text-primary">Sector 15 Beat</span> today. 
      3 high-priority retailers need attention."
    </p>
    <div className="flex items-center gap-2 text-[10px] md:text-xs text-muted-foreground">
      <MapPin className="w-3 h-3" />
      <span>12 retailers • 2.5km route</span>
    </div>
  </motion.div>
);

const TopRetailersCard = ({ delay = 0 }: { delay?: number }) => (
  <motion.div
    initial={{ opacity: 0, x: 30 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ duration: 0.6, delay }}
    className="bg-card/95 backdrop-blur-xl border border-border/50 rounded-xl p-3 md:p-5 shadow-2xl w-full max-w-[260px] md:max-w-[300px]"
  >
    <div className="flex items-center gap-2 mb-2 md:mb-3">
      <div className="p-1 md:p-1.5 rounded-lg bg-primary/10">
        <Store className="w-3 h-3 md:w-4 md:h-4 text-primary" />
      </div>
      <span className="text-[10px] md:text-xs font-medium text-primary">Top Retailers</span>
    </div>
    <div className="space-y-1.5 md:space-y-2">
      {[
        { name: "Sharma General Store", revenue: "₹45K/mo", trend: "+12%" },
        { name: "Gupta Traders", revenue: "₹38K/mo", trend: "+8%" },
        { name: "City Mart", revenue: "₹32K/mo", trend: "+15%" },
      ].map((retailer, i) => (
        <div key={i} className="flex items-center justify-between text-[10px] md:text-xs">
          <span className="text-foreground truncate max-w-[100px] md:max-w-none">{retailer.name}</span>
          <div className="flex items-center gap-1 md:gap-2">
            <span className="text-muted-foreground hidden md:inline">{retailer.revenue}</span>
            <span className="text-green-500 flex items-center">
              <TrendingUp className="w-2.5 h-2.5 md:w-3 md:h-3 mr-0.5" />
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
    className="bg-card/95 backdrop-blur-xl border border-border/50 rounded-xl p-3 md:p-4 shadow-2xl w-full max-w-[220px] md:max-w-[260px]"
  >
    <div className="flex items-center gap-2 mb-2 md:mb-3">
      <div className="p-1 md:p-1.5 rounded-lg bg-green-500/10">
        <ShoppingCart className="w-3 h-3 md:w-4 md:h-4 text-green-500" />
      </div>
      <span className="text-[10px] md:text-xs font-medium text-green-500">Quick Order</span>
    </div>
    <div className="space-y-1.5 md:space-y-2 text-[10px] md:text-xs">
      <div className="flex justify-between">
        <span className="text-muted-foreground">Premium Rice 25kg</span>
        <span className="text-foreground">x10</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Cooking Oil 5L</span>
        <span className="text-foreground">x15</span>
      </div>
      <div className="border-t border-border pt-1.5 md:pt-2 mt-1.5 md:mt-2 flex justify-between font-medium">
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
    className="bg-gradient-to-br from-accent-gold/20 to-accent-bronze/20 backdrop-blur-xl border border-accent-gold/30 rounded-xl p-3 md:p-4 shadow-2xl w-full max-w-[200px] md:max-w-[240px]"
  >
    <div className="flex items-center gap-2 mb-1.5 md:mb-2">
      <Gift className="w-3 h-3 md:w-4 md:h-4 text-accent-gold" />
      <span className="text-[10px] md:text-xs font-medium text-accent-gold">Active Scheme</span>
    </div>
    <p className="text-xs md:text-sm font-semibold text-foreground mb-0.5 md:mb-1">Buy 10 Get 1 Free</p>
    <p className="text-[10px] md:text-xs text-muted-foreground">Premium Range • Ends Dec 31</p>
  </motion.div>
);

const NextBestStepCard = ({ delay = 0 }: { delay?: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6, delay }}
    className="bg-gradient-to-br from-primary/10 to-primary/5 backdrop-blur-xl border border-primary/30 rounded-xl p-3 md:p-4 shadow-2xl w-full max-w-[240px] md:max-w-[280px]"
  >
    <div className="flex items-center gap-2 mb-1.5 md:mb-2">
      <Lightbulb className="w-3 h-3 md:w-4 md:h-4 text-primary" />
      <span className="text-[10px] md:text-xs font-medium text-primary">Next Best Step</span>
    </div>
    <p className="text-xs md:text-sm font-semibold text-foreground mb-0.5 md:mb-1">Cross-sell Opportunity</p>
    <p className="text-[10px] md:text-xs text-muted-foreground">Suggest cooking oil bundle at Sharma Store</p>
  </motion.div>
);

export const HeroSection = () => {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-[100vh] md:min-h-[90vh] py-8 md:py-16 lg:py-20 px-4 overflow-hidden bg-gradient-to-b from-background via-background to-muted/30">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[400px] md:w-[600px] h-[400px] md:h-[600px] bg-primary/5 rounded-full blur-3xl"></div>
        <div className="absolute -top-40 -right-40 w-60 md:w-80 h-60 md:h-80 bg-accent-gold/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-60 md:w-80 h-60 md:h-80 bg-primary/5 rounded-full blur-3xl animate-pulse"></div>
      </div>

      <div className="container mx-auto relative z-10">
        {/* Header content */}
        <div className="text-center mb-6 md:mb-12">
          {/* Badge */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-medium mb-4 md:mb-6 border border-primary/20"
          >
            <Sparkles className="h-3 w-3 md:h-4 md:w-4" />
            AI-Powered Field Sales Platform
          </motion.div>

          {/* Main Headline */}
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-3xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4 md:mb-6 leading-tight"
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
            className="text-sm md:text-lg lg:text-xl text-muted-foreground mb-6 md:mb-8 max-w-2xl mx-auto px-4"
          >
            AI recommendations, smart routing, instant orders, and real-time insights — 
            all in one app that guides your field team to success.
          </motion.p>

          {/* CTAs */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center px-4"
          >
            <Button 
              size="lg"
              onClick={() => navigate('/auth')}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 md:px-8 py-5 md:py-6 text-base md:text-lg font-semibold gap-2"
            >
              Start Free Trial
              <ArrowRight className="w-4 h-4 md:w-5 md:h-5" />
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              onClick={() => navigate('/request-demo')}
              className="border-border bg-background/50 text-foreground hover:bg-muted px-6 md:px-8 py-5 md:py-6 text-base md:text-lg font-medium"
            >
              Request Demo
            </Button>
          </motion.div>
        </div>

        {/* Feature showcase with floating cards */}
        <div className="relative max-w-6xl mx-auto">
          {/* Center illustration area with sales rep image */}
          <div className="flex justify-center items-center min-h-[350px] md:min-h-[450px] relative">
            {/* Central visual - sales rep image */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="relative w-56 h-56 md:w-72 md:h-72 lg:w-80 lg:h-80"
            >
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/30 via-primary/10 to-accent-gold/20 blur-xl"></div>
              <div className="relative w-full h-full rounded-full overflow-hidden border-4 border-primary/20 shadow-2xl">
                <img 
                  src={salesRepHero} 
                  alt="Field Sales Representative" 
                  className="w-full h-full object-cover object-top"
                />
              </div>
            </motion.div>

            {/* Floating feature cards positioned around the center - Desktop */}
            <div className="absolute inset-0 pointer-events-none hidden md:block">
              {/* Left side cards */}
              <div className="absolute left-0 top-4 lg:top-0 pointer-events-auto">
                <AIRecommendationCard delay={0.5} />
              </div>
              
              <div className="absolute left-0 bottom-4 lg:bottom-0 pointer-events-auto">
                <FeatureCard 
                  icon={MessageCircle} 
                  title="WhatsApp Bot Orders" 
                  description="Update orders instantly via WhatsApp integration"
                  delay={0.7}
                  iconColor="text-green-500"
                  iconBg="bg-green-500/10"
                  className="max-w-[260px]"
                />
              </div>

              {/* Right side cards */}
              <div className="absolute right-0 top-4 lg:top-0 pointer-events-auto">
                <TopRetailersCard delay={0.6} />
              </div>

              <div className="absolute right-0 bottom-4 lg:bottom-0 pointer-events-auto">
                <FeatureCard 
                  icon={Mic} 
                  title="Voice Updates" 
                  description="Capture orders & notes using voice-to-text"
                  delay={0.8}
                  iconColor="text-purple-500"
                  iconBg="bg-purple-500/10"
                  className="max-w-[260px]"
                />
              </div>

              {/* Top center */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-auto hidden lg:block">
                <SchemeCard delay={0.9} />
              </div>

              {/* Bottom cards - visible on larger screens */}
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex gap-3 pointer-events-auto hidden lg:flex">
                <FeatureCard 
                  icon={Target} 
                  title="Territory Performance" 
                  description="AI-powered territory analytics & insights"
                  delay={1.0}
                  iconColor="text-blue-500"
                  iconBg="bg-blue-500/10"
                  className="max-w-[240px]"
                />
                <FeatureCard 
                  icon={Users} 
                  title="Retailer Intelligence" 
                  description="Smart retailer scoring & recommendations"
                  delay={1.1}
                  iconColor="text-orange-500"
                  iconBg="bg-orange-500/10"
                  className="max-w-[240px]"
                />
              </div>
            </div>
          </div>

          {/* Mobile feature grid */}
          <div className="grid grid-cols-2 gap-2 mt-6 md:hidden px-2">
            <FeatureCard 
              icon={MessageCircle} 
              title="WhatsApp Orders" 
              description="Order via WhatsApp Bot"
              delay={0.7}
              iconColor="text-green-500"
              iconBg="bg-green-500/10"
            />
            <FeatureCard 
              icon={Mic} 
              title="Voice Updates" 
              description="Voice-to-text capture"
              delay={0.8}
              iconColor="text-purple-500"
              iconBg="bg-purple-500/10"
            />
            <FeatureCard 
              icon={Target} 
              title="Territory AI" 
              description="Performance insights"
              delay={0.9}
              iconColor="text-blue-500"
              iconBg="bg-blue-500/10"
            />
            <FeatureCard 
              icon={Users} 
              title="Retailer Score" 
              description="Smart recommendations"
              delay={1.0}
              iconColor="text-orange-500"
              iconBg="bg-orange-500/10"
            />
            <div className="col-span-2">
              <NextBestStepCard delay={1.1} />
            </div>
          </div>

          {/* Next Best Step for desktop */}
          <div className="hidden md:flex justify-center mt-4">
            <NextBestStepCard delay={1.2} />
          </div>
        </div>
      </div>
    </section>
  );
};

import { 
  MapPin, 
  Store, 
  ShoppingCart, 
  TrendingUp,
  MessageCircle,
  Mic,
  Target,
  Users,
  Lightbulb,
  Sparkles,
  Gift
} from "lucide-react";
import { motion } from "framer-motion";
import fieldSalesHero from "@/assets/field-sales-hero.png";

const FloatingCard = ({ 
  children, 
  className = "",
  delay = 0
}: { 
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6, delay }}
    className={`absolute bg-card/90 backdrop-blur-xl border border-border/50 rounded-xl shadow-2xl ${className}`}
  >
    {children}
  </motion.div>
);

const AIRecommendationCard = () => (
  <div className="p-3 md:p-4 max-w-[260px] md:max-w-[300px]">
    <div className="flex items-center gap-2 mb-2">
      <div className="p-1.5 rounded-lg bg-accent-gold/20">
        <Sparkles className="w-3 h-3 md:w-4 md:h-4 text-accent-gold" />
      </div>
      <span className="text-[10px] md:text-xs font-medium text-accent-gold">AI Recommendation</span>
    </div>
    <p className="text-xs md:text-sm text-foreground mb-2">
      "Visit <span className="font-semibold text-primary">Sector 15</span> today. 
      3 high-priority retailers."
    </p>
    <div className="flex items-center gap-2 text-[10px] md:text-xs text-muted-foreground">
      <MapPin className="w-3 h-3" />
      <span>12 retailers • 2.5km</span>
    </div>
  </div>
);

const TopRetailersCard = () => (
  <div className="p-3 md:p-4 max-w-[240px] md:max-w-[280px]">
    <div className="flex items-center gap-2 mb-2">
      <div className="p-1.5 rounded-lg bg-primary/10">
        <Store className="w-3 h-3 md:w-4 md:h-4 text-primary" />
      </div>
      <span className="text-[10px] md:text-xs font-medium text-primary">Top Retailers</span>
    </div>
    <div className="space-y-1.5">
      {[
        { name: "Sharma Store", trend: "+12%" },
        { name: "Gupta Traders", trend: "+8%" },
      ].map((retailer, i) => (
        <div key={i} className="flex items-center justify-between text-[10px] md:text-xs">
          <span className="text-foreground">{retailer.name}</span>
          <span className="text-green-500 flex items-center">
            <TrendingUp className="w-2.5 h-2.5 mr-0.5" />
            {retailer.trend}
          </span>
        </div>
      ))}
    </div>
  </div>
);

const QuickOrderCard = () => (
  <div className="p-3 md:p-4 max-w-[200px] md:max-w-[240px]">
    <div className="flex items-center gap-2 mb-2">
      <div className="p-1.5 rounded-lg bg-green-500/10">
        <ShoppingCart className="w-3 h-3 md:w-4 md:h-4 text-green-500" />
      </div>
      <span className="text-[10px] md:text-xs font-medium text-green-500">Quick Order</span>
    </div>
    <div className="text-[10px] md:text-xs">
      <div className="flex justify-between mb-1">
        <span className="text-muted-foreground">Rice 25kg</span>
        <span className="text-foreground">x10</span>
      </div>
      <div className="border-t border-border pt-1 flex justify-between font-medium">
        <span className="text-foreground">Total</span>
        <span className="text-primary">₹12,450</span>
      </div>
    </div>
  </div>
);

const WhatsAppCard = () => (
  <div className="p-3 md:p-4 max-w-[220px] md:max-w-[260px]">
    <div className="flex items-center gap-2 mb-2">
      <div className="p-1.5 rounded-lg bg-green-500/10">
        <MessageCircle className="w-3 h-3 md:w-4 md:h-4 text-green-500" />
      </div>
      <span className="text-[10px] md:text-xs font-medium text-green-500">WhatsApp Bot</span>
    </div>
    <p className="text-xs md:text-sm text-foreground">Update orders via WhatsApp instantly</p>
  </div>
);

const VoiceCard = () => (
  <div className="p-3 md:p-4 max-w-[200px] md:max-w-[240px]">
    <div className="flex items-center gap-2 mb-2">
      <div className="p-1.5 rounded-lg bg-purple-500/10">
        <Mic className="w-3 h-3 md:w-4 md:h-4 text-purple-500" />
      </div>
      <span className="text-[10px] md:text-xs font-medium text-purple-500">Voice Updates</span>
    </div>
    <p className="text-xs md:text-sm text-foreground">Capture notes with voice-to-text</p>
  </div>
);

const TerritoryCard = () => (
  <div className="p-3 md:p-4 max-w-[220px] md:max-w-[260px]">
    <div className="flex items-center gap-2 mb-2">
      <div className="p-1.5 rounded-lg bg-blue-500/10">
        <Target className="w-3 h-3 md:w-4 md:h-4 text-blue-500" />
      </div>
      <span className="text-[10px] md:text-xs font-medium text-blue-500">Territory AI</span>
    </div>
    <p className="text-xs md:text-sm text-foreground">AI-powered performance insights</p>
  </div>
);

const NextStepCard = () => (
  <div className="p-3 md:p-4 max-w-[220px] md:max-w-[260px] bg-gradient-to-br from-primary/20 to-primary/5">
    <div className="flex items-center gap-2 mb-2">
      <div className="p-1.5 rounded-lg bg-primary/20">
        <Lightbulb className="w-3 h-3 md:w-4 md:h-4 text-primary" />
      </div>
      <span className="text-[10px] md:text-xs font-medium text-primary">Next Best Step</span>
    </div>
    <p className="text-xs md:text-sm text-foreground">Cross-sell cooking oil at Sharma Store</p>
  </div>
);

const SchemeCard = () => (
  <div className="p-3 md:p-4 max-w-[180px] md:max-w-[220px] bg-gradient-to-br from-accent-gold/20 to-accent-bronze/10">
    <div className="flex items-center gap-2 mb-1">
      <Gift className="w-3 h-3 md:w-4 md:h-4 text-accent-gold" />
      <span className="text-[10px] md:text-xs font-medium text-accent-gold">Active Scheme</span>
    </div>
    <p className="text-xs font-semibold text-foreground">Buy 10 Get 1 Free</p>
  </div>
);

export const HeroSection = () => {
  return (
    <section className="relative min-h-screen overflow-hidden">
      {/* Full-screen background image */}
      <div className="absolute inset-0">
        <img 
          src={fieldSalesHero} 
          alt="Field Sales Representative" 
          className="w-full h-full object-cover object-[center_20%] md:object-[center_30%]"
        />
        {/* Gradient overlays for text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/20 to-background/70"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-background/50 via-transparent to-background/50"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header content - Mobile: split top/bottom, Desktop: centered */}
        <div className="flex-1 flex flex-col md:items-center md:justify-center pt-20 md:pt-20 px-4">
          {/* Top section for mobile */}
          <div className="md:hidden">
            {/* Badge */}
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 bg-background/80 backdrop-blur-sm text-primary px-3 py-1.5 rounded-full text-xs font-medium mb-3 border border-primary/30"
            >
              <Sparkles className="h-3 w-3" />
              AI-Powered Field Sales
            </motion.div>

            {/* Main Headline - Top */}
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-3xl font-bold text-foreground leading-tight"
            >
              Superpowers,
            </motion.h1>
          </div>

          {/* Desktop content - centered */}
          <div className="hidden md:block text-center">
            {/* Badge */}
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 bg-background/80 backdrop-blur-sm text-primary px-4 py-2 rounded-full text-sm font-medium mb-6 border border-primary/30"
            >
              <Sparkles className="h-4 w-4" />
              AI-Powered Field Sales Platform
            </motion.div>

            {/* Main Headline */}
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-5xl lg:text-7xl font-bold text-foreground mb-6 leading-tight"
            >
              Superpowers,
              <br />
              <span className="bg-gradient-to-r from-primary via-primary to-accent-gold bg-clip-text text-transparent">
                everywhere you sell
              </span>
            </motion.h1>
          </div>

          {/* Spacer for mobile to push bottom content down */}
          <div className="flex-1 md:hidden" />

          {/* Bottom section for mobile */}
          <div className="md:hidden pb-4">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-3xl font-bold leading-tight"
            >
              <span className="bg-gradient-to-r from-primary via-primary to-accent-gold bg-clip-text text-transparent">
                everywhere you sell
              </span>
            </motion.h1>
          </div>
        </div>

        {/* Floating cards positioned randomly around - Desktop */}
        <div className="hidden lg:block">
          {/* Left side - top */}
          <FloatingCard className="left-4 xl:left-8 top-28" delay={0.5}>
            <AIRecommendationCard />
          </FloatingCard>

          {/* Left side - middle */}
          <FloatingCard className="left-8 xl:left-16 top-[45%]" delay={0.7}>
            <WhatsAppCard />
          </FloatingCard>

          {/* Left side - bottom */}
          <FloatingCard className="left-4 xl:left-12 bottom-24" delay={0.9}>
            <TerritoryCard />
          </FloatingCard>

          {/* Right side - top */}
          <FloatingCard className="right-4 xl:right-8 top-32" delay={0.6}>
            <TopRetailersCard />
          </FloatingCard>

          {/* Right side - middle */}
          <FloatingCard className="right-8 xl:right-20 top-[50%]" delay={0.8}>
            <VoiceCard />
          </FloatingCard>

          {/* Right side - bottom */}
          <FloatingCard className="right-4 xl:right-16 bottom-20" delay={1.0}>
            <NextStepCard />
          </FloatingCard>

          {/* Bottom left */}
          <FloatingCard className="left-[20%] bottom-8" delay={1.1}>
            <QuickOrderCard />
          </FloatingCard>

          {/* Bottom right */}
          <FloatingCard className="right-[22%] bottom-12" delay={1.2}>
            <SchemeCard />
          </FloatingCard>
        </div>

        {/* Floating cards - Tablet */}
        <div className="hidden md:block lg:hidden">
          <FloatingCard className="left-2 top-24" delay={0.5}>
            <AIRecommendationCard />
          </FloatingCard>

          <FloatingCard className="right-2 top-28" delay={0.6}>
            <TopRetailersCard />
          </FloatingCard>

          <FloatingCard className="left-4 bottom-20" delay={0.7}>
            <WhatsAppCard />
          </FloatingCard>

          <FloatingCard className="right-4 bottom-24" delay={0.8}>
            <VoiceCard />
          </FloatingCard>
        </div>

        {/* Mobile cards - scrollable row at bottom */}
        <div className="md:hidden px-4 pb-6">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide"
          >
            <div className="flex-shrink-0 bg-card/90 backdrop-blur-xl border border-border/50 rounded-xl shadow-lg">
              <AIRecommendationCard />
            </div>
            <div className="flex-shrink-0 bg-card/90 backdrop-blur-xl border border-border/50 rounded-xl shadow-lg">
              <WhatsAppCard />
            </div>
            <div className="flex-shrink-0 bg-card/90 backdrop-blur-xl border border-border/50 rounded-xl shadow-lg">
              <VoiceCard />
            </div>
            <div className="flex-shrink-0 bg-card/90 backdrop-blur-xl border border-border/50 rounded-xl shadow-lg">
              <TerritoryCard />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

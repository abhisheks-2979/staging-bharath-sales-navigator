import { 
  MapPin, 
  Store, 
  ShoppingCart, 
  TrendingUp,
  MessageCircle,
  Mic,
  Trophy,
  Heart,
  Sparkles,
  Zap,
  Brain,
  Target
} from "lucide-react";
import { motion } from "framer-motion";
import fieldSalesHero from "@/assets/field-sales-hero.png";

const FloatingCard = ({ 
  children, 
  className = "",
  delay = 0,
  size = "normal"
}: { 
  children: React.ReactNode;
  className?: string;
  delay?: number;
  size?: "small" | "normal" | "large";
}) => {
  const sizeClasses = {
    small: "max-w-[200px] md:max-w-[220px]",
    normal: "max-w-[260px] md:max-w-[300px]",
    large: "max-w-[300px] md:max-w-[340px]"
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.7, delay, ease: "easeOut" }}
      className={`absolute bg-background/40 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] ${sizeClasses[size]} ${className}`}
      style={{ 
        background: "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)"
      }}
    >
      {children}
    </motion.div>
  );
};

// LARGE CARD 1: AI Beat Optimizer
const AIBeatOptimizerCard = () => (
  <div className="p-5">
    <div className="flex items-center gap-3 mb-3">
      <div className="p-2 rounded-xl bg-gradient-to-br from-accent-gold/30 to-accent-gold/10">
        <Brain className="w-5 h-5 text-accent-gold" />
      </div>
      <div>
        <span className="text-sm font-semibold text-accent-gold">AI Beat Optimizer</span>
        <p className="text-[10px] text-muted-foreground">Powered by Machine Learning</p>
      </div>
    </div>
    <p className="text-sm text-foreground/90 mb-3 leading-relaxed">
      "Visit <span className="font-semibold text-primary">Sector 15</span> today — 
      3 high-priority retailers with <span className="text-green-400 font-medium">₹45K potential</span> based on purchase patterns."
    </p>
    <div className="flex items-center gap-4 text-xs text-muted-foreground">
      <span className="flex items-center gap-1">
        <MapPin className="w-3 h-3" />
        12 retailers
      </span>
      <span className="flex items-center gap-1">
        <Target className="w-3 h-3" />
        2.5km route
      </span>
    </div>
    <div className="mt-3 pt-3 border-t border-white/10">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Conversion prediction</span>
        <span className="text-green-400 font-medium">87% likely</span>
      </div>
    </div>
  </div>
);

// LARGE CARD 2: AI Sales Intelligence
const AISalesIntelligenceCard = () => (
  <div className="p-5">
    <div className="flex items-center gap-3 mb-3">
      <div className="p-2 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10">
        <Sparkles className="w-5 h-5 text-primary" />
      </div>
      <div>
        <span className="text-sm font-semibold text-primary">AI Sales Intelligence</span>
        <p className="text-[10px] text-muted-foreground">Real-time Recommendations</p>
      </div>
    </div>
    <p className="text-sm text-foreground/90 mb-3 leading-relaxed">
      Cross-sell <span className="font-semibold">cooking oil</span> at Sharma Store — 
      <span className="text-accent-gold font-medium"> 92% match</span> with their purchase history.
    </p>
    <div className="space-y-2">
      {[
        { label: "Revenue impact", value: "+₹8,500/month", color: "text-green-400" },
        { label: "Similar retailers bought", value: "34 stores", color: "text-blue-400" },
      ].map((item, i) => (
        <div key={i} className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{item.label}</span>
          <span className={`font-medium ${item.color}`}>{item.value}</span>
        </div>
      ))}
    </div>
  </div>
);

// LARGE CARD 3: Top Performers
const TopPerformersCard = () => (
  <div className="p-5">
    <div className="flex items-center gap-3 mb-3">
      <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/30 to-blue-500/10">
        <Store className="w-5 h-5 text-blue-400" />
      </div>
      <div>
        <span className="text-sm font-semibold text-blue-400">Top Performers Today</span>
        <p className="text-[10px] text-muted-foreground">Live sales leaderboard</p>
      </div>
    </div>
    <div className="space-y-2.5">
      {[
        { name: "Sharma Kirana Store", value: "₹24,500", trend: "+18%", rank: 1 },
        { name: "Gupta General Traders", value: "₹19,200", trend: "+12%", rank: 2 },
        { name: "Patel & Sons Retail", value: "₹15,800", trend: "+9%", rank: 3 },
      ].map((retailer, i) => (
        <div key={i} className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-medium text-foreground/70">
              {retailer.rank}
            </span>
            <span className="text-xs text-foreground/90">{retailer.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-foreground">{retailer.value}</span>
            <span className="text-[10px] text-green-400 flex items-center">
              <TrendingUp className="w-2.5 h-2.5 mr-0.5" />
              {retailer.trend}
            </span>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// SMALL CARD 1: WhatsApp Commerce Bot
const WhatsAppBotCard = () => (
  <div className="p-4">
    <div className="flex items-center gap-2 mb-2">
      <div className="p-1.5 rounded-lg bg-gradient-to-br from-green-500/30 to-green-500/10">
        <MessageCircle className="w-4 h-4 text-green-400" />
      </div>
      <span className="text-xs font-semibold text-green-400">WhatsApp Commerce</span>
    </div>
    <p className="text-xs text-foreground/80 leading-relaxed mb-2">
      Retailers order via WhatsApp — AI processes orders instantly, confirms availability & schedules delivery.
    </p>
    <div className="text-[10px] text-muted-foreground">
      <span className="text-green-400 font-medium">2,400+</span> orders processed this week
    </div>
  </div>
);

// SMALL CARD 2: Voice-First Updates
const VoiceUpdatesCard = () => (
  <div className="p-4">
    <div className="flex items-center gap-2 mb-2">
      <div className="p-1.5 rounded-lg bg-gradient-to-br from-purple-500/30 to-purple-500/10">
        <Mic className="w-4 h-4 text-purple-400" />
      </div>
      <span className="text-xs font-semibold text-purple-400">Voice-First Updates</span>
    </div>
    <p className="text-xs text-foreground/80 leading-relaxed mb-2">
      Speak naturally — AI transcribes visit notes, objections & competitor intel in real-time. No typing needed.
    </p>
    <div className="text-[10px] text-muted-foreground">
      Supports <span className="text-purple-400 font-medium">12 Indian languages</span>
    </div>
  </div>
);

// ADD-ON CARD 1: Gamification
const GamificationCard = () => (
  <div className="p-4">
    <div className="flex items-center gap-2 mb-2">
      <div className="p-1.5 rounded-lg bg-gradient-to-br from-accent-gold/30 to-accent-bronze/10">
        <Trophy className="w-4 h-4 text-accent-gold" />
      </div>
      <span className="text-xs font-semibold text-accent-gold">Gamification</span>
    </div>
    <p className="text-xs text-foreground/80 leading-relaxed mb-2">
      Leaderboards, badges & rewards that drive 40% higher field engagement.
    </p>
    <div className="flex items-center gap-2 text-[10px]">
      <span className="px-2 py-0.5 rounded-full bg-accent-gold/20 text-accent-gold">Streaks</span>
      <span className="px-2 py-0.5 rounded-full bg-accent-gold/20 text-accent-gold">Points</span>
    </div>
  </div>
);

// ADD-ON CARD 2: Retailer Loyalty
const RetailerLoyaltyCard = () => (
  <div className="p-4">
    <div className="flex items-center gap-2 mb-2">
      <div className="p-1.5 rounded-lg bg-gradient-to-br from-rose-500/30 to-rose-500/10">
        <Heart className="w-4 h-4 text-rose-400" />
      </div>
      <span className="text-xs font-semibold text-rose-400">Retailer Loyalty</span>
    </div>
    <p className="text-xs text-foreground/80 leading-relaxed mb-2">
      Track loyalty scores, reward top buyers & reduce churn with AI-driven retention alerts.
    </p>
    <div className="flex items-center gap-2 text-[10px]">
      <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400">Tiers</span>
      <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400">Rewards</span>
    </div>
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
        {/* Gradient overlays for text readability - softer for glassmorphism effect */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/10 to-background/60"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-background/40 via-transparent to-background/40"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header content - centered for both mobile and desktop */}
        <div className="flex-1 flex flex-col items-center justify-center pt-20 px-4">
          {/* Mobile content - centered */}
          <div className="md:hidden text-center">
            {/* Badge */}
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-xl text-primary px-4 py-2 rounded-full text-xs font-medium mb-4 border border-white/20"
            >
              <Sparkles className="h-3 w-3" />
              AI-Powered Field Sales Platform
            </motion.div>

            {/* Main Headline */}
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-3xl font-bold text-foreground leading-tight"
            >
              Superpowers,
              <br />
              <span className="bg-gradient-to-r from-primary via-primary to-accent-gold bg-clip-text text-transparent">
                everywhere you sell
              </span>
            </motion.h1>
          </div>

          {/* Desktop content - centered */}
          <div className="hidden md:block text-center">
            {/* Badge */}
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-xl text-primary px-5 py-2.5 rounded-full text-sm font-medium mb-6 border border-white/20"
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
        </div>

        {/* Floating cards - Desktop: 3 Large + 2 Small + 2 Add-on */}
        <div className="hidden lg:block">
          {/* LEFT SIDE - Large Cards */}
          <FloatingCard className="left-6 xl:left-10 top-28" delay={0.4} size="large">
            <AIBeatOptimizerCard />
          </FloatingCard>

          <FloatingCard className="left-4 xl:left-8 bottom-32" delay={0.7} size="normal">
            <WhatsAppBotCard />
          </FloatingCard>

          {/* RIGHT SIDE - Large Cards */}
          <FloatingCard className="right-6 xl:right-10 top-24" delay={0.5} size="large">
            <AISalesIntelligenceCard />
          </FloatingCard>

          <FloatingCard className="right-4 xl:right-8 bottom-36" delay={0.8} size="normal">
            <VoiceUpdatesCard />
          </FloatingCard>

          {/* CENTER BOTTOM - Large Card */}
          <FloatingCard className="left-1/2 -translate-x-1/2 bottom-8" delay={0.6} size="large">
            <TopPerformersCard />
          </FloatingCard>

          {/* ADD-ON Cards - positioned subtly */}
          <FloatingCard className="left-[22%] top-[55%]" delay={0.9} size="small">
            <GamificationCard />
          </FloatingCard>

          <FloatingCard className="right-[22%] top-[58%]" delay={1.0} size="small">
            <RetailerLoyaltyCard />
          </FloatingCard>
        </div>

        {/* Floating cards - Tablet */}
        <div className="hidden md:block lg:hidden">
          <FloatingCard className="left-2 top-24" delay={0.5} size="large">
            <AIBeatOptimizerCard />
          </FloatingCard>

          <FloatingCard className="right-2 top-28" delay={0.6} size="large">
            <AISalesIntelligenceCard />
          </FloatingCard>

          <FloatingCard className="left-4 bottom-24" delay={0.7} size="normal">
            <WhatsAppBotCard />
          </FloatingCard>

          <FloatingCard className="right-4 bottom-20" delay={0.8} size="normal">
            <VoiceUpdatesCard />
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
            <div 
              className="flex-shrink-0 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-lg"
              style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)" }}
            >
              <AIBeatOptimizerCard />
            </div>
            <div 
              className="flex-shrink-0 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-lg"
              style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)" }}
            >
              <WhatsAppBotCard />
            </div>
            <div 
              className="flex-shrink-0 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-lg"
              style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)" }}
            >
              <VoiceUpdatesCard />
            </div>
            <div 
              className="flex-shrink-0 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-lg"
              style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)" }}
            >
              <GamificationCard />
            </div>
            <div 
              className="flex-shrink-0 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-lg"
              style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)" }}
            >
              <RetailerLoyaltyCard />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

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
    small: "w-[200px] md:w-[220px]",
    normal: "w-[260px] md:w-[280px]",
    large: "w-[300px] md:w-[320px]"
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.7, delay, ease: "easeOut" }}
      className={`bg-white/90 backdrop-blur-xl border border-black/5 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.15)] ${sizeClasses[size]} ${className}`}
    >
      {children}
    </motion.div>
  );
};

// LARGE CARD 1: AI Beat Optimizer
const AIBeatOptimizerCard = () => (
  <div className="p-5">
    <div className="flex items-center gap-3 mb-3">
      <div className="p-2 rounded-xl bg-amber-100">
        <Brain className="w-5 h-5 text-black" />
      </div>
      <div>
        <span className="text-sm font-semibold text-black">AI Beat Optimizer</span>
        <p className="text-[10px] text-black/60">Powered by Machine Learning</p>
      </div>
    </div>
    <p className="text-sm text-black/80 mb-3 leading-relaxed">
      "Visit <span className="font-semibold">Sector 15</span> today — 
      3 high-priority retailers with <span className="font-medium">₹45K potential</span> based on purchase patterns."
    </p>
    <div className="flex items-center gap-4 text-xs text-black/60">
      <span className="flex items-center gap-1">
        <MapPin className="w-3 h-3" />
        12 retailers
      </span>
      <span className="flex items-center gap-1">
        <Target className="w-3 h-3" />
        2.5km route
      </span>
    </div>
    <div className="mt-3 pt-3 border-t border-black/10">
      <div className="flex items-center justify-between text-xs">
        <span className="text-black/60">Conversion prediction</span>
        <span className="text-black font-medium">87% likely</span>
      </div>
    </div>
  </div>
);

// LARGE CARD 2: AI Sales Intelligence
const AISalesIntelligenceCard = () => (
  <div className="p-5">
    <div className="flex items-center gap-3 mb-3">
      <div className="p-2 rounded-xl bg-blue-100">
        <Sparkles className="w-5 h-5 text-black" />
      </div>
      <div>
        <span className="text-sm font-semibold text-black">AI Sales Intelligence</span>
        <p className="text-[10px] text-black/60">Real-time Recommendations</p>
      </div>
    </div>
    <p className="text-sm text-black/80 mb-3 leading-relaxed">
      Cross-sell <span className="font-semibold">cooking oil</span> at Sharma Store — 
      <span className="font-medium"> 92% match</span> with their purchase history.
    </p>
    <div className="space-y-2">
      {[
        { label: "Revenue impact", value: "+₹8,500/month" },
        { label: "Similar retailers bought", value: "34 stores" },
      ].map((item, i) => (
        <div key={i} className="flex items-center justify-between text-xs">
          <span className="text-black/60">{item.label}</span>
          <span className="font-medium text-black">{item.value}</span>
        </div>
      ))}
    </div>
  </div>
);

// LARGE CARD 3: Top Performers
const TopPerformersCard = () => (
  <div className="p-5">
    <div className="flex items-center gap-3 mb-3">
      <div className="p-2 rounded-xl bg-green-100">
        <Store className="w-5 h-5 text-black" />
      </div>
      <div>
        <span className="text-sm font-semibold text-black">Top Performers Today</span>
        <p className="text-[10px] text-black/60">Live sales leaderboard</p>
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
            <span className="w-5 h-5 rounded-full bg-black/10 flex items-center justify-center text-[10px] font-medium text-black/70">
              {retailer.rank}
            </span>
            <span className="text-xs text-black/80">{retailer.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-black">{retailer.value}</span>
            <span className="text-[10px] text-black/70 flex items-center">
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
      <div className="p-1.5 rounded-lg bg-green-100">
        <MessageCircle className="w-4 h-4 text-black" />
      </div>
      <span className="text-xs font-semibold text-black">WhatsApp Commerce</span>
    </div>
    <p className="text-xs text-black/80 leading-relaxed mb-2">
      Retailers order via WhatsApp — AI processes orders instantly, confirms availability & schedules delivery.
    </p>
    <div className="text-[10px] text-black/60">
      <span className="font-medium text-black">2,400+</span> orders processed this week
    </div>
  </div>
);

// SMALL CARD 2: Voice-First Updates
const VoiceUpdatesCard = () => (
  <div className="p-4">
    <div className="flex items-center gap-2 mb-2">
      <div className="p-1.5 rounded-lg bg-purple-100">
        <Mic className="w-4 h-4 text-black" />
      </div>
      <span className="text-xs font-semibold text-black">Voice-First Updates</span>
    </div>
    <p className="text-xs text-black/80 leading-relaxed mb-2">
      Speak naturally — AI transcribes visit notes, objections & competitor intel in real-time. No typing needed.
    </p>
    <div className="text-[10px] text-black/60">
      Supports <span className="font-medium text-black">12 Indian languages</span>
    </div>
  </div>
);

// ADD-ON CARD 1: Gamification
const GamificationCard = () => (
  <div className="p-4">
    <div className="flex items-center gap-2 mb-2">
      <div className="p-1.5 rounded-lg bg-amber-100">
        <Trophy className="w-4 h-4 text-black" />
      </div>
      <span className="text-xs font-semibold text-black">Gamification</span>
    </div>
    <p className="text-xs text-black/80 leading-relaxed mb-2">
      Leaderboards, badges & rewards that drive 40% higher field engagement.
    </p>
    <div className="flex items-center gap-2 text-[10px]">
      <span className="px-2 py-0.5 rounded-full bg-black/10 text-black">Streaks</span>
      <span className="px-2 py-0.5 rounded-full bg-black/10 text-black">Points</span>
    </div>
  </div>
);

// ADD-ON CARD 2: Retailer Loyalty
const RetailerLoyaltyCard = () => (
  <div className="p-4">
    <div className="flex items-center gap-2 mb-2">
      <div className="p-1.5 rounded-lg bg-rose-100">
        <Heart className="w-4 h-4 text-black" />
      </div>
      <span className="text-xs font-semibold text-black">Retailer Loyalty</span>
    </div>
    <p className="text-xs text-black/80 leading-relaxed mb-2">
      Track loyalty scores, reward top buyers & reduce churn with AI-driven retention alerts.
    </p>
    <div className="flex items-center gap-2 text-[10px]">
      <span className="px-2 py-0.5 rounded-full bg-black/10 text-black">Tiers</span>
      <span className="px-2 py-0.5 rounded-full bg-black/10 text-black">Rewards</span>
    </div>
  </div>
);

export const HeroSection = () => {
  return (
    <section className="relative min-h-screen overflow-hidden">
      {/* Full-screen background image with darker sunset overlay */}
      <div className="absolute inset-0">
        <img 
          src={fieldSalesHero} 
          alt="Field Sales Representative" 
          className="w-full h-full object-cover object-[center_20%] md:object-[center_30%]"
        />
        {/* Darker sunset gradient overlay - amber/orange tones with dark */}
        <div className="absolute inset-0 bg-gradient-to-b from-amber-900/70 via-orange-800/50 to-stone-900/80"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-stone-900/60 via-transparent to-amber-800/40"></div>
        <div className="absolute inset-0 bg-black/25"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header content - centered for both mobile and desktop */}
        <div className="flex-1 flex flex-col items-center justify-start pt-32 md:pt-28 lg:pt-24 px-4">
          {/* Mobile content - centered, moved down */}
          <div className="md:hidden text-center mt-8">
            {/* Badge */}
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-xl text-white px-4 py-2 rounded-full text-xs font-medium mb-4 border border-white/30"
            >
              <Sparkles className="h-3 w-3" />
              AI-Powered Field Sales Platform
            </motion.div>

            {/* Main Headline */}
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-3xl font-bold text-white leading-tight"
            >
              Superpowers,
              <br />
              <span className="text-amber-300">
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
              className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-xl text-white px-5 py-2.5 rounded-full text-sm font-medium mb-6 border border-white/30"
            >
              <Sparkles className="h-4 w-4" />
              AI-Powered Field Sales Platform
            </motion.div>

            {/* Main Headline */}
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-5xl lg:text-7xl font-bold text-white mb-6 leading-tight"
            >
              Superpowers,
              <br />
              <span className="text-amber-300">
                everywhere you sell
              </span>
            </motion.h1>
          </div>
        </div>

        {/* Floating cards - Desktop: Grid layout with proper spacing */}
        <div className="hidden lg:block absolute inset-0 pointer-events-none">
          <div className="relative w-full h-full max-w-7xl mx-auto">
            {/* LEFT COLUMN */}
            <div className="absolute left-8 xl:left-12 top-28 pointer-events-auto">
              <FloatingCard delay={0.4} size="large">
                <AIBeatOptimizerCard />
              </FloatingCard>
            </div>

            <div className="absolute left-8 xl:left-12 top-[340px] pointer-events-auto">
              <FloatingCard delay={0.7} size="normal">
                <WhatsAppBotCard />
              </FloatingCard>
            </div>

            <div className="absolute left-8 xl:left-12 bottom-8 pointer-events-auto">
              <FloatingCard delay={0.9} size="small">
                <GamificationCard />
              </FloatingCard>
            </div>

            {/* RIGHT COLUMN */}
            <div className="absolute right-8 xl:right-12 top-28 pointer-events-auto">
              <FloatingCard delay={0.5} size="large">
                <AISalesIntelligenceCard />
              </FloatingCard>
            </div>

            <div className="absolute right-8 xl:right-12 top-[340px] pointer-events-auto">
              <FloatingCard delay={0.8} size="normal">
                <VoiceUpdatesCard />
              </FloatingCard>
            </div>

            <div className="absolute right-8 xl:right-12 bottom-8 pointer-events-auto">
              <FloatingCard delay={1.0} size="small">
                <RetailerLoyaltyCard />
              </FloatingCard>
            </div>

            {/* CENTER BOTTOM - Large Card */}
            <div className="absolute left-1/2 -translate-x-1/2 bottom-8 pointer-events-auto">
              <FloatingCard delay={0.6} size="large">
                <TopPerformersCard />
              </FloatingCard>
            </div>
          </div>
        </div>

        {/* Floating cards - Tablet - Grid layout */}
        <div className="hidden md:block lg:hidden">
          <div className="absolute left-4 top-[220px]">
            <FloatingCard delay={0.5} size="normal">
              <AIBeatOptimizerCard />
            </FloatingCard>
          </div>

          <div className="absolute right-4 top-[220px]">
            <FloatingCard delay={0.6} size="normal">
              <AISalesIntelligenceCard />
            </FloatingCard>
          </div>

          <div className="absolute left-4 bottom-24">
            <FloatingCard delay={0.7} size="small">
              <WhatsAppBotCard />
            </FloatingCard>
          </div>

          <div className="absolute right-4 bottom-24">
            <FloatingCard delay={0.8} size="small">
              <VoiceUpdatesCard />
            </FloatingCard>
          </div>
        </div>

        {/* Mobile cards - scrollable row at bottom */}
        <div className="md:hidden px-4 pb-6 mt-auto">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide"
          >
            <div className="flex-shrink-0 w-[260px] bg-white/90 backdrop-blur-xl border border-black/5 rounded-2xl shadow-lg">
              <AIBeatOptimizerCard />
            </div>
            <div className="flex-shrink-0 w-[220px] bg-white/90 backdrop-blur-xl border border-black/5 rounded-2xl shadow-lg">
              <WhatsAppBotCard />
            </div>
            <div className="flex-shrink-0 w-[220px] bg-white/90 backdrop-blur-xl border border-black/5 rounded-2xl shadow-lg">
              <VoiceUpdatesCard />
            </div>
            <div className="flex-shrink-0 w-[200px] bg-white/90 backdrop-blur-xl border border-black/5 rounded-2xl shadow-lg">
              <GamificationCard />
            </div>
            <div className="flex-shrink-0 w-[200px] bg-white/90 backdrop-blur-xl border border-black/5 rounded-2xl shadow-lg">
              <RetailerLoyaltyCard />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

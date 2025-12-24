import { useState, useEffect } from "react";
import { 
  MapPin, 
  Store, 
  TrendingUp,
  MessageCircle,
  Mic,
  Trophy,
  Heart,
  Sparkles,
  Brain,
  Target,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import fieldSalesHero from "@/assets/field-sales-hero.png";
import fieldSalesHero2 from "@/assets/field-sales-hero-2.png";

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
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
      className={`bg-white/90 backdrop-blur-xl border border-black/5 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.15)] ${sizeClasses[size]} ${className}`}
    >
      {children}
    </motion.div>
  );
};

// CARD COMPONENTS
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
  </div>
);

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
    <div className="flex items-center justify-between text-xs">
      <span className="text-black/60">Revenue impact</span>
      <span className="font-medium text-black">+₹8,500/month</span>
    </div>
  </div>
);

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
    <div className="space-y-2">
      {[
        { name: "Sharma Kirana Store", value: "₹24,500", rank: 1 },
        { name: "Gupta General Traders", value: "₹19,200", rank: 2 },
      ].map((retailer, i) => (
        <div key={i} className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-black/10 flex items-center justify-center text-[10px] font-medium text-black/70">
              {retailer.rank}
            </span>
            <span className="text-xs text-black/80">{retailer.name}</span>
          </div>
          <span className="text-xs font-medium text-black">{retailer.value}</span>
        </div>
      ))}
    </div>
  </div>
);

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

// Slide configurations
const slides = [
  {
    background: fieldSalesHero,
    cards: [
      { Component: AIBeatOptimizerCard, size: "large" as const, position: "left-top" },
      { Component: AISalesIntelligenceCard, size: "large" as const, position: "right-top" },
      { Component: TopPerformersCard, size: "large" as const, position: "center-bottom" },
      { Component: WhatsAppBotCard, size: "normal" as const, position: "left-bottom" },
    ]
  },
  {
    background: fieldSalesHero2,
    cards: [
      { Component: VoiceUpdatesCard, size: "normal" as const, position: "left-top" },
      { Component: GamificationCard, size: "normal" as const, position: "right-top" },
      { Component: RetailerLoyaltyCard, size: "normal" as const, position: "center-bottom" },
    ]
  }
];

export const HeroSection = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  // Auto-scroll every 5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  const goToPrev = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const goToNext = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const currentSlideData = slides[currentSlide];

  return (
    <section className="relative min-h-screen overflow-hidden">
      {/* Background with transition */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSlide}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className="absolute inset-0"
        >
          <img 
            src={currentSlideData.background} 
            alt="Field Sales Representative" 
            className="w-full h-full object-cover object-[center_20%] md:object-[center_30%]"
          />
          {/* Original gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/10 to-background/60"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-background/40 via-transparent to-background/40"></div>
        </motion.div>
      </AnimatePresence>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header content */}
        <div className="flex-1 flex flex-col items-center justify-start pt-32 md:pt-28 lg:pt-24 px-4">
          {/* Mobile content */}
          <div className="md:hidden text-center mt-8">
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-xl text-primary px-4 py-2 rounded-full text-xs font-medium mb-4 border border-white/20"
            >
              <Sparkles className="h-3 w-3" />
              AI-Powered Field Sales Platform
            </motion.div>

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

          {/* Desktop content */}
          <div className="hidden md:block text-center">
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-xl text-primary px-5 py-2.5 rounded-full text-sm font-medium mb-6 border border-white/20"
            >
              <Sparkles className="h-4 w-4" />
              AI-Powered Field Sales Platform
            </motion.div>

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

        {/* Floating cards - Desktop */}
        <div className="hidden lg:block absolute inset-0 pointer-events-none">
          <div className="relative w-full h-full max-w-7xl mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0"
              >
                {currentSlideData.cards.map((card, index) => {
                  const { Component, size, position } = card;
                  let positionClass = "";
                  
                  switch (position) {
                    case "left-top":
                      positionClass = "left-8 xl:left-12 top-28";
                      break;
                    case "right-top":
                      positionClass = "right-8 xl:right-12 top-28";
                      break;
                    case "left-bottom":
                      positionClass = "left-8 xl:left-12 bottom-24";
                      break;
                    case "right-bottom":
                      positionClass = "right-8 xl:right-12 bottom-24";
                      break;
                    case "center-bottom":
                      positionClass = "left-1/2 -translate-x-1/2 bottom-24";
                      break;
                  }
                  
                  return (
                    <div key={index} className={`absolute pointer-events-auto ${positionClass}`}>
                      <FloatingCard delay={index * 0.15} size={size}>
                        <Component />
                      </FloatingCard>
                    </div>
                  );
                })}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Floating cards - Tablet */}
        <div className="hidden md:block lg:hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            >
              {currentSlideData.cards.slice(0, 4).map((card, index) => {
                const { Component, size } = card;
                const positions = [
                  "absolute left-4 top-[220px]",
                  "absolute right-4 top-[220px]",
                  "absolute left-4 bottom-28",
                  "absolute right-4 bottom-28"
                ];
                
                return (
                  <div key={index} className={positions[index] || positions[0]}>
                    <FloatingCard delay={index * 0.15} size={size}>
                      <Component />
                    </FloatingCard>
                  </div>
                );
              })}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Mobile cards - scrollable */}
        <div className="md:hidden px-4 pb-6 mt-auto">
          <AnimatePresence mode="wait">
            <motion.div 
              key={currentSlide}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.5 }}
              className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide"
            >
              {currentSlideData.cards.map((card, index) => {
                const { Component, size } = card;
                const widthClass = size === "large" ? "w-[280px]" : size === "normal" ? "w-[240px]" : "w-[200px]";
                
                return (
                  <div 
                    key={index}
                    className={`flex-shrink-0 ${widthClass} bg-white/90 backdrop-blur-xl border border-black/5 rounded-2xl shadow-lg`}
                  >
                    <Component />
                  </div>
                );
              })}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation arrows - Desktop */}
        <div className="hidden md:flex absolute left-4 right-4 top-1/2 -translate-y-1/2 justify-between z-20 pointer-events-none">
          <button
            onClick={goToPrev}
            className="pointer-events-auto p-3 rounded-full bg-white/20 backdrop-blur-xl border border-white/30 text-foreground hover:bg-white/30 transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={goToNext}
            className="pointer-events-auto p-3 rounded-full bg-white/20 backdrop-blur-xl border border-white/30 text-foreground hover:bg-white/30 transition-all"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Slide indicators */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-20">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentSlide 
                  ? "bg-primary w-6" 
                  : "bg-white/40 hover:bg-white/60"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

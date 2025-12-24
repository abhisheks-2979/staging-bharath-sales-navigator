import { useState } from "react";
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
  ChevronRight,
  CreditCard,
  FileText,
  Package,
  Truck,
  RotateCcw,
  ClipboardList,
  Megaphone,
  Headphones,
  Receipt,
  Wallet,
  Link
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import fieldSalesHero from "@/assets/field-sales-hero.png";
import fieldSalesHero2 from "@/assets/field-sales-hero-2.png";
import distributorHero from "@/assets/distributor-hero.png";

const FloatingCard = ({ 
  children, 
  className = "",
  delay = 0,
  size = "normal"
}: { 
  children: React.ReactNode;
  className?: string;
  delay?: number;
  size?: "small" | "normal" | "large" | "wide";
}) => {
  const sizeClasses = {
    small: "w-[180px] md:w-[200px]",
    normal: "w-[220px] md:w-[240px]",
    large: "w-[260px] md:w-[280px]",
    wide: "w-[280px] md:w-[300px]"
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
      className={`bg-white/95 backdrop-blur-xl border border-black/5 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] ${sizeClasses[size]} ${className}`}
    >
      {children}
    </motion.div>
  );
};

// SLIDE 1 CARDS - Field Sales AI
const AIBeatOptimizerCard = () => (
  <div className="p-4">
    <div className="flex items-center gap-2 mb-2">
      <div className="p-2 rounded-xl bg-amber-100">
        <Brain className="w-4 h-4 text-black" />
      </div>
      <span className="text-sm font-semibold text-black">AI Beat Optimizer</span>
    </div>
    <p className="text-xs text-black/80 leading-relaxed mb-2">
      ML-powered route optimization — visit <span className="font-medium">high-priority retailers</span> with ₹45K potential based on purchase patterns.
    </p>
    <div className="flex items-center gap-3 text-[10px] text-black/60">
      <span className="flex items-center gap-1">
        <MapPin className="w-3 h-3" /> 12 retailers
      </span>
      <span className="flex items-center gap-1">
        <Target className="w-3 h-3" /> 2.5km route
      </span>
    </div>
  </div>
);

const AISalesIntelligenceCard = () => (
  <div className="p-4">
    <div className="flex items-center gap-2 mb-2">
      <div className="p-2 rounded-xl bg-blue-100">
        <Sparkles className="w-4 h-4 text-black" />
      </div>
      <span className="text-sm font-semibold text-black">AI Sales Intelligence</span>
    </div>
    <p className="text-xs text-black/80 leading-relaxed mb-2">
      Cross-sell <span className="font-medium">cooking oil</span> — 92% match with purchase history. Revenue impact: <span className="font-medium">+₹8,500/month</span>
    </p>
    <div className="text-[10px] text-black/60">Real-time recommendations</div>
  </div>
);

const TopPerformersCard = () => (
  <div className="p-4">
    <div className="flex items-center gap-2 mb-2">
      <div className="p-2 rounded-xl bg-green-100">
        <Store className="w-4 h-4 text-black" />
      </div>
      <span className="text-sm font-semibold text-black">Top Performers</span>
    </div>
    <div className="space-y-1.5">
      {[
        { name: "Sharma Kirana", value: "₹24,500", rank: 1 },
        { name: "Gupta Traders", value: "₹19,200", rank: 2 },
      ].map((retailer, i) => (
        <div key={i} className="flex items-center justify-between text-xs">
          <span className="text-black/80">{retailer.rank}. {retailer.name}</span>
          <span className="font-medium text-black">{retailer.value}</span>
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
    <p className="text-[11px] text-black/80 leading-relaxed">
      Retailers order via WhatsApp — AI processes instantly, confirms availability & schedules delivery.
    </p>
  </div>
);

// SLIDE 2 CARDS - Retailer Engagement
const VoiceUpdatesCard = () => (
  <div className="p-4">
    <div className="flex items-center gap-2 mb-2">
      <div className="p-2 rounded-xl bg-purple-100">
        <Mic className="w-4 h-4 text-black" />
      </div>
      <span className="text-sm font-semibold text-black">Voice-First Updates</span>
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
      <div className="p-2 rounded-xl bg-amber-100">
        <Trophy className="w-4 h-4 text-black" />
      </div>
      <span className="text-sm font-semibold text-black">Gamification</span>
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
      <div className="p-2 rounded-xl bg-rose-100">
        <Heart className="w-4 h-4 text-black" />
      </div>
      <span className="text-sm font-semibold text-black">Retailer Loyalty</span>
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

const CreditManagementCard = () => (
  <div className="p-4">
    <div className="flex items-center gap-2 mb-2">
      <div className="p-2 rounded-xl bg-blue-100">
        <CreditCard className="w-4 h-4 text-black" />
      </div>
      <span className="text-sm font-semibold text-black">Credit Management</span>
    </div>
    <p className="text-xs text-black/80 leading-relaxed mb-2">
      Rule-based credit limits — auto-calculate based on payment history, order frequency & retailer score.
    </p>
    <div className="flex items-center gap-2 text-[10px]">
      <span className="px-2 py-0.5 rounded-full bg-black/10 text-black">Auto-hold</span>
      <span className="px-2 py-0.5 rounded-full bg-black/10 text-black">Alerts</span>
    </div>
  </div>
);

const TallyIntegrationCard = () => (
  <div className="p-4">
    <div className="flex items-center gap-2 mb-2">
      <div className="p-2 rounded-xl bg-indigo-100">
        <Link className="w-4 h-4 text-black" />
      </div>
      <span className="text-sm font-semibold text-black">Tally Integration</span>
    </div>
    <p className="text-xs text-black/80 leading-relaxed mb-2">
      Seamless sync with Tally, SAP & other finance systems — invoices, payments & reconciliation automated.
    </p>
    <div className="flex items-center gap-2 text-[10px]">
      <span className="px-2 py-0.5 rounded-full bg-black/10 text-black">Real-time</span>
      <span className="px-2 py-0.5 rounded-full bg-black/10 text-black">2-way sync</span>
    </div>
  </div>
);

// SLIDE 3 CARDS - Distributor Management
const DistributorPortalCard = () => (
  <div className="p-4">
    <div className="flex items-center gap-2 mb-2">
      <div className="p-2 rounded-xl bg-cyan-100">
        <Store className="w-4 h-4 text-black" />
      </div>
      <span className="text-sm font-semibold text-black">Distributor Portal</span>
    </div>
    <p className="text-xs text-black/80 leading-relaxed mb-2">
      AI-powered dashboard for primary orders, inventory & claims — all in one place with smart insights.
    </p>
    <div className="text-[10px] text-black/60">Self-service operations</div>
  </div>
);

const OrderTrackingCard = () => (
  <div className="p-4">
    <div className="flex items-center gap-2 mb-2">
      <div className="p-2 rounded-xl bg-orange-100">
        <Truck className="w-4 h-4 text-black" />
      </div>
      <span className="text-sm font-semibold text-black">Order & Delivery</span>
    </div>
    <p className="text-xs text-black/80 leading-relaxed mb-2">
      Track primary orders, packing lists & supply — AI predicts delivery times & flags delays proactively.
    </p>
    <div className="flex items-center gap-2 text-[10px]">
      <span className="px-2 py-0.5 rounded-full bg-black/10 text-black">Live tracking</span>
    </div>
  </div>
);

const InventoryGRNCard = () => (
  <div className="p-4">
    <div className="flex items-center gap-2 mb-2">
      <div className="p-2 rounded-xl bg-teal-100">
        <Package className="w-4 h-4 text-black" />
      </div>
      <span className="text-sm font-semibold text-black">Inventory & GRN</span>
    </div>
    <p className="text-xs text-black/80 leading-relaxed mb-2">
      Real-time stock visibility — AI forecasts reorder points & automates GRN with photo verification.
    </p>
    <div className="text-[10px] text-black/60">Smart stock alerts</div>
  </div>
);

const ReturnsClaimsCard = () => (
  <div className="p-4">
    <div className="flex items-center gap-2 mb-2">
      <div className="p-2 rounded-xl bg-red-100">
        <RotateCcw className="w-4 h-4 text-black" />
      </div>
      <span className="text-sm font-semibold text-black">Returns & Claims</span>
    </div>
    <p className="text-xs text-black/80 leading-relaxed mb-2">
      Streamlined returns & damage claims — AI validates, categorizes & routes for faster resolution.
    </p>
    <div className="flex items-center gap-2 text-[10px]">
      <span className="px-2 py-0.5 rounded-full bg-black/10 text-black">Auto-approve</span>
    </div>
  </div>
);

const MDFSupportCard = () => (
  <div className="p-4">
    <div className="flex items-center gap-2 mb-2">
      <div className="p-2 rounded-xl bg-pink-100">
        <Megaphone className="w-4 h-4 text-black" />
      </div>
      <span className="text-sm font-semibold text-black">MDF & Support</span>
    </div>
    <p className="text-xs text-black/80 leading-relaxed mb-2">
      Marketing fund management & case tracking — AI prioritizes issues & suggests resolutions.
    </p>
    <div className="text-[10px] text-black/60">Faster ticket resolution</div>
  </div>
);

const CollectionARCard = () => (
  <div className="p-4">
    <div className="flex items-center gap-2 mb-2">
      <div className="p-2 rounded-xl bg-emerald-100">
        <Wallet className="w-4 h-4 text-black" />
      </div>
      <span className="text-sm font-semibold text-black">Collection & AR</span>
    </div>
    <p className="text-xs text-black/80 leading-relaxed mb-2">
      Invoice to retailers, collections & AR — AI sends payment reminders & predicts default risk.
    </p>
    <div className="flex items-center gap-2 text-[10px]">
      <span className="px-2 py-0.5 rounded-full bg-black/10 text-black">Auto-reconcile</span>
    </div>
  </div>
);

// Slide configurations with grid positions
const slides = [
  {
    background: fieldSalesHero,
    title: "Field Sales AI",
    cards: [
      { Component: AIBeatOptimizerCard, size: "large" as const, gridPos: 1 },
      { Component: AISalesIntelligenceCard, size: "large" as const, gridPos: 2 },
      { Component: TopPerformersCard, size: "normal" as const, gridPos: 3 },
      { Component: WhatsAppBotCard, size: "small" as const, gridPos: 4 },
      { Component: GamificationCard, size: "normal" as const, gridPos: 5 },
    ]
  },
  {
    background: fieldSalesHero2,
    title: "Retailer Engagement",
    cards: [
      { Component: VoiceUpdatesCard, size: "large" as const, gridPos: 1 },
      { Component: RetailerLoyaltyCard, size: "normal" as const, gridPos: 2 },
      { Component: CreditManagementCard, size: "large" as const, gridPos: 3 },
      { Component: TallyIntegrationCard, size: "normal" as const, gridPos: 4 },
    ]
  },
  {
    background: distributorHero,
    title: "Distributor Management",
    cards: [
      { Component: DistributorPortalCard, size: "large" as const, gridPos: 1 },
      { Component: OrderTrackingCard, size: "normal" as const, gridPos: 2 },
      { Component: InventoryGRNCard, size: "normal" as const, gridPos: 3 },
      { Component: ReturnsClaimsCard, size: "large" as const, gridPos: 4 },
      { Component: MDFSupportCard, size: "normal" as const, gridPos: 5 },
      { Component: CollectionARCard, size: "normal" as const, gridPos: 6 },
    ]
  }
];

// Desktop card positions - no overlaps, well spaced, positioned outside center content
const getDesktopPosition = (gridPos: number, totalCards: number) => {
  // 4 cards layout - 2 left, 2 right
  if (totalCards === 4) {
    switch (gridPos) {
      case 1: return "left-4 xl:left-8 top-[180px]";
      case 2: return "right-4 xl:right-8 top-[180px]";
      case 3: return "left-4 xl:left-8 bottom-[120px]";
      case 4: return "right-4 xl:right-8 bottom-[120px]";
      default: return "left-4 top-[180px]";
    }
  }
  // 5 cards layout - 2 left, 2 right, 1 bottom center
  if (totalCards === 5) {
    switch (gridPos) {
      case 1: return "left-4 xl:left-8 top-[180px]";
      case 2: return "right-4 xl:right-8 top-[180px]";
      case 3: return "left-4 xl:left-8 bottom-[120px]";
      case 4: return "right-4 xl:right-8 bottom-[120px]";
      case 5: return "left-1/2 -translate-x-1/2 bottom-[100px]";
      default: return "left-4 top-[180px]";
    }
  }
  // 6 cards layout - 3 left side, 3 right side (stacked)
  if (totalCards === 6) {
    switch (gridPos) {
      case 1: return "left-4 xl:left-8 top-[160px]";
      case 2: return "right-4 xl:right-8 top-[160px]";
      case 3: return "left-4 xl:left-8 top-[340px]";
      case 4: return "right-4 xl:right-8 top-[340px]";
      case 5: return "left-4 xl:left-8 bottom-[80px]";
      case 6: return "right-4 xl:right-8 bottom-[80px]";
      default: return "left-4 top-[160px]";
    }
  }
  return "left-4 top-[180px]";
};

export const HeroSection = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

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
  const totalCards = currentSlideData.cards.length;

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
          {/* Gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/10 to-background/60"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-background/40 via-transparent to-background/40"></div>
        </motion.div>
      </AnimatePresence>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Badge at TOP - moved above everything */}
        <div className="absolute top-20 md:top-16 left-0 right-0 z-30 flex justify-center px-4">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-xl text-primary px-4 py-2 md:px-5 md:py-2.5 rounded-full text-xs md:text-sm font-medium border border-white/20"
          >
            <Sparkles className="h-3 w-3 md:h-4 md:w-4" />
            AI-Powered Field Sales Platform
          </motion.div>
        </div>

        {/* Header content */}
        <div className="flex-1 flex flex-col items-center justify-start pt-40 md:pt-36 lg:pt-32 px-4">
          {/* Mobile content */}
          <div className="md:hidden text-center mt-4">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-3xl font-bold text-foreground leading-tight"
            >
              Superpowers,
              <br />
              <span className="text-foreground">
                everywhere you <span className="text-black font-extrabold">Sell</span>
              </span>
            </motion.h1>
          </div>

          {/* Desktop content */}
          <div className="hidden md:block text-center">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-5xl lg:text-7xl font-bold text-foreground mb-6 leading-tight"
            >
              Superpowers,
              <br />
              <span className="text-foreground">
                everywhere you <span className="text-black font-extrabold">Sell</span>
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
                  const { Component, size, gridPos } = card;
                  const positionClass = getDesktopPosition(gridPos, totalCards);
                  
                  return (
                    <div key={index} className={`absolute pointer-events-auto ${positionClass}`}>
                      <FloatingCard delay={index * 0.1} size={size}>
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
        <div className="hidden md:block lg:hidden absolute inset-0 pointer-events-none">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0"
            >
              {currentSlideData.cards.slice(0, 4).map((card, index) => {
                const { Component, size } = card;
                const positions = [
                  "absolute left-4 top-48",
                  "absolute right-4 top-48",
                  "absolute left-4 bottom-32",
                  "absolute right-4 bottom-32"
                ];
                
                return (
                  <div key={index} className={`${positions[index] || positions[0]} pointer-events-auto`}>
                    <FloatingCard delay={index * 0.1} size={size}>
                      <Component />
                    </FloatingCard>
                  </div>
                );
              })}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Mobile cards - scrollable */}
        <div className="md:hidden px-4 pb-8 mt-auto">
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
                const widthClass = size === "large" ? "w-[260px]" : size === "normal" ? "w-[220px]" : "w-[180px]";
                
                return (
                  <div 
                    key={index}
                    className={`flex-shrink-0 ${widthClass} bg-white/95 backdrop-blur-xl border border-black/5 rounded-2xl shadow-lg`}
                  >
                    <Component />
                  </div>
                );
              })}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation arrows */}
        <div className="absolute left-4 right-4 top-1/2 -translate-y-1/2 flex justify-between z-20 pointer-events-none">
          <button
            onClick={goToPrev}
            className="pointer-events-auto p-3 rounded-full bg-white/20 backdrop-blur-xl border border-white/30 text-foreground hover:bg-white/30 transition-all shadow-lg"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={goToNext}
            className="pointer-events-auto p-3 rounded-full bg-white/20 backdrop-blur-xl border border-white/30 text-foreground hover:bg-white/30 transition-all shadow-lg"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Slide indicators with labels */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-20">
          <span className="text-xs font-medium text-foreground/80 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
            {currentSlideData.title}
          </span>
          <div className="flex gap-2">
            {slides.map((slide, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`h-2 rounded-full transition-all ${
                  index === currentSlide 
                    ? "bg-primary w-6" 
                    : "bg-white/40 hover:bg-white/60 w-2"
                }`}
                title={slide.title}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

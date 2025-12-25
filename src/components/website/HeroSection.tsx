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

// Superhuman-inspired glass card with subtle gradients and refined shadows
const FloatingCard = ({ 
  children, 
  className = "",
  delay = 0,
  size = "normal",
  variant = "default"
}: { 
  children: React.ReactNode;
  className?: string;
  delay?: number;
  size?: "small" | "normal" | "large" | "wide";
  variant?: "default" | "accent" | "subtle";
}) => {
  const sizeClasses = {
    small: "w-[150px] md:w-[160px]",
    normal: "w-[170px] md:w-[190px]",
    large: "w-[200px] md:w-[220px]",
    wide: "w-[220px] md:w-[240px]"
  };

  const variantClasses = {
    default: "bg-white/90 backdrop-blur-2xl border border-white/60 shadow-[0_8px_40px_rgba(0,0,0,0.08),0_0_0_1px_rgba(255,255,255,0.5)_inset]",
    accent: "bg-gradient-to-br from-white/95 to-white/80 backdrop-blur-2xl border border-white/70 shadow-[0_12px_48px_rgba(0,0,0,0.1),0_0_0_1px_rgba(255,255,255,0.6)_inset]",
    subtle: "bg-white/80 backdrop-blur-xl border border-white/40 shadow-[0_4px_24px_rgba(0,0,0,0.06)]"
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4, scale: 1.02, transition: { duration: 0.2 } }}
      className={`rounded-2xl ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
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
      { Component: AIBeatOptimizerCard, size: "large" as const, gridPos: 1, variant: "accent" as const },
      { Component: AISalesIntelligenceCard, size: "large" as const, gridPos: 2, variant: "accent" as const },
      { Component: TopPerformersCard, size: "normal" as const, gridPos: 3, variant: "default" as const },
      { Component: WhatsAppBotCard, size: "small" as const, gridPos: 4, variant: "subtle" as const },
      { Component: GamificationCard, size: "normal" as const, gridPos: 5, variant: "default" as const },
    ]
  },
  {
    background: fieldSalesHero2,
    title: "Retailer Engagement",
    cards: [
      { Component: VoiceUpdatesCard, size: "large" as const, gridPos: 1, variant: "accent" as const },
      { Component: RetailerLoyaltyCard, size: "normal" as const, gridPos: 2, variant: "default" as const },
      { Component: CreditManagementCard, size: "large" as const, gridPos: 3, variant: "accent" as const },
      { Component: TallyIntegrationCard, size: "normal" as const, gridPos: 4, variant: "default" as const },
      { Component: GamificationCard, size: "normal" as const, gridPos: 5, variant: "default" as const },
    ]
  },
  {
    background: distributorHero,
    title: "Distributor Management",
    cards: [
      { Component: DistributorPortalCard, size: "normal" as const, gridPos: 1, variant: "accent" as const },
      { Component: OrderTrackingCard, size: "small" as const, gridPos: 2, variant: "default" as const },
      { Component: MDFSupportCard, size: "small" as const, gridPos: 3, variant: "subtle" as const },
      { Component: CollectionARCard, size: "small" as const, gridPos: 4, variant: "subtle" as const },
      { Component: InventoryGRNCard, size: "small" as const, gridPos: 5, variant: "default" as const },
      { Component: ReturnsClaimsCard, size: "small" as const, gridPos: 6, variant: "default" as const },
    ]
  }
];

// Desktop card positions - cards on far left/right edges, avoiding center title
const getDesktopPosition = (gridPos: number, totalCards: number) => {
  // 4 cards layout - 2 on each side, vertically stacked with good separation
  if (totalCards === 4) {
    switch (gridPos) {
      case 1: return "left-3 xl:left-6 top-[100px]";
      case 2: return "right-3 xl:right-6 top-[100px]";
      case 3: return "left-3 xl:left-6 bottom-[130px]";
      case 4: return "right-3 xl:right-6 bottom-[130px]";
      default: return "left-3 top-[100px]";
    }
  }
  // 5 cards layout - Slide 2: WhatsApp below subtitle in center-bottom
  if (totalCards === 5) {
    switch (gridPos) {
      case 1: return "left-3 xl:left-6 top-[100px]";       // Top left
      case 2: return "right-3 xl:right-6 top-[100px]";     // Top right
      case 3: return "left-3 xl:left-6 bottom-[130px]";    // Bottom left
      case 4: return "right-3 xl:right-6 bottom-[130px]";  // Bottom right
      case 5: return "left-1/2 -translate-x-1/2 bottom-[100px]"; // Center bottom - below subtitle
      default: return "left-3 top-[100px]";
    }
  }
  // 6 cards layout - Slide 3: 2 top, 2 middle (left/right of center), 2 below subtitle
  if (totalCards === 6) {
    switch (gridPos) {
      case 1: return "left-3 xl:left-6 top-[100px]";       // Top left - Distributor Portal
      case 2: return "right-3 xl:right-6 top-[100px]";     // Top right - Order Tracking
      case 3: return "left-3 xl:left-6 bottom-[130px]";    // Bottom left - MDF Support
      case 4: return "right-3 xl:right-6 bottom-[130px]";  // Bottom right - Collection AR
      case 5: return "left-[25%] -translate-x-1/2 bottom-[100px]";  // Below subtitle left - Inventory
      case 6: return "right-[25%] translate-x-1/2 bottom-[100px]";  // Below subtitle right - Returns
      default: return "left-3 top-[100px]";
    }
  }
  return "left-3 top-[100px]";
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
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0"
        >
          <img 
            src={currentSlideData.background} 
            alt="Field Sales Representative" 
            className="w-full h-full object-cover object-[center_20%] md:object-[center_30%]"
          />
          {/* Superhuman-inspired gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-b from-slate-900/60 via-transparent to-slate-900/50"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900/30 via-transparent to-slate-900/30"></div>
          {/* Subtle purple/blue tint like Superhuman */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900/10 via-transparent to-blue-900/10"></div>
        </motion.div>
      </AnimatePresence>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Badge at TOP */}
        <div className="absolute top-20 md:top-20 left-0 right-0 z-30 flex justify-center px-4">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-2xl text-white px-5 py-2.5 md:px-6 md:py-3 rounded-full text-xs md:text-sm font-medium border border-white/25 shadow-[0_8px_32px_rgba(0,0,0,0.12)]"
          >
            <Sparkles className="h-3.5 w-3.5 md:h-4 md:w-4" />
            AI-Powered Field Sales Platform
          </motion.div>
        </div>

        {/* Header content - centered title with breathing room */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 pointer-events-none">
          {/* Mobile content */}
          <div className="md:hidden text-center">
            <motion.h1 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="text-[2.25rem] font-bold leading-tight drop-shadow-lg"
            >
              <span className="text-white">Superpowers,</span>
              <br />
              <span className="text-white/90">
                everywhere you <span className="text-white font-black">Sell</span>
              </span>
            </motion.h1>
          </div>

          {/* Desktop content */}
          <div className="hidden md:block text-center">
            <motion.h1 
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="text-[3.4rem] lg:text-[4.5rem] font-bold leading-[1.1] drop-shadow-xl"
            >
              <span className="text-white">Superpowers,</span>
              <br />
              <span className="text-white/90">
                everywhere you <span className="text-white font-black">Sell</span>
              </span>
            </motion.h1>
            {/* Subtitle like Superhuman */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="mt-6 text-lg lg:text-xl text-white/70 font-medium max-w-2xl mx-auto"
            >
              AI-powered sales, insights, and automation for every retailer and distributor
            </motion.p>
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
                  const { Component, size, gridPos, variant } = card;
                  const positionClass = getDesktopPosition(gridPos, totalCards);
                  
                  return (
                    <div key={index} className={`absolute pointer-events-auto ${positionClass}`}>
                      <FloatingCard delay={0.4 + index * 0.08} size={size} variant={variant}>
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
                const { Component, size, variant } = card;
                const positions = [
                  "absolute left-4 top-[220px]",
                  "absolute right-4 top-[200px]",
                  "absolute left-4 bottom-[140px]",
                  "absolute right-4 bottom-[160px]"
                ];
                
                return (
                  <div key={index} className={`${positions[index] || positions[0]} pointer-events-auto`}>
                    <FloatingCard delay={0.3 + index * 0.08} size={size} variant={variant}>
                      <Component />
                    </FloatingCard>
                  </div>
                );
              })}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Mobile cards - scrollable */}
        <div className="md:hidden px-4 pb-10 mt-auto">
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
                const { Component, size, variant } = card;
                const widthClass = size === "large" ? "w-[220px]" : size === "normal" ? "w-[190px]" : "w-[160px]";
                const variantClasses = {
                  default: "bg-white/90 backdrop-blur-2xl border border-white/60 shadow-[0_8px_40px_rgba(0,0,0,0.08)]",
                  accent: "bg-gradient-to-br from-white/95 to-white/80 backdrop-blur-2xl border border-white/70 shadow-[0_12px_48px_rgba(0,0,0,0.1)]",
                  subtle: "bg-white/80 backdrop-blur-xl border border-white/40 shadow-[0_4px_24px_rgba(0,0,0,0.06)]"
                };
                
                return (
                  <motion.div 
                    key={index}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 + index * 0.05 }}
                    className={`flex-shrink-0 ${widthClass} ${variantClasses[variant || 'default']} rounded-2xl`}
                  >
                    <Component />
                  </motion.div>
                );
              })}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation arrows - Superhuman style */}
        <div className="absolute left-4 right-4 md:left-8 md:right-8 top-1/2 -translate-y-1/2 flex justify-between z-20 pointer-events-none">
          <motion.button
            onClick={goToPrev}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="pointer-events-auto p-3 md:p-4 rounded-full bg-white/15 backdrop-blur-2xl border border-white/20 text-white hover:bg-white/25 transition-all shadow-[0_8px_32px_rgba(0,0,0,0.12)]"
          >
            <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
          </motion.button>
          <motion.button
            onClick={goToNext}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="pointer-events-auto p-3 md:p-4 rounded-full bg-white/15 backdrop-blur-2xl border border-white/20 text-white hover:bg-white/25 transition-all shadow-[0_8px_32px_rgba(0,0,0,0.12)]"
          >
            <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
          </motion.button>
        </div>

        {/* Slide indicators - elegant pill style */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 z-20">
          <motion.span 
            key={currentSlideData.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm font-semibold text-white bg-white/15 backdrop-blur-2xl px-5 py-2 rounded-full border border-white/20 shadow-lg"
          >
            {currentSlideData.title}
          </motion.span>
          <div className="flex gap-2.5">
            {slides.map((slide, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`h-2.5 rounded-full transition-all duration-300 ${
                  index === currentSlide 
                    ? "bg-white w-8 shadow-lg" 
                    : "bg-white/30 hover:bg-white/50 w-2.5"
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

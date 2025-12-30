import { useNavigate } from "react-router-dom";
import { 
  Sparkles,
  Play,
  Users,
  Globe,
  Target,
  Store,
  Truck,
  Building2,
  ArrowRight,
  CheckCircle2
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

// Solution card data
const solutions = [
  {
    icon: Target,
    title: "Field Sales AI",
    description: "AI-powered beat optimization, voice updates & real-time insights for your field force.",
    color: "from-amber-500/20 to-orange-500/20",
    iconBg: "bg-amber-500/20",
    iconColor: "text-amber-400"
  },
  {
    icon: Store,
    title: "Distributor Portal",
    description: "Self-service dashboard for orders, inventory, claims & seamless Tally integration.",
    color: "from-cyan-500/20 to-blue-500/20",
    iconBg: "bg-cyan-500/20",
    iconColor: "text-cyan-400"
  },
  {
    icon: Building2,
    title: "Institutional CRM",
    description: "Enterprise sales tracking with pipeline management & automated follow-ups.",
    color: "from-purple-500/20 to-pink-500/20",
    iconBg: "bg-purple-500/20",
    iconColor: "text-purple-400"
  }
];

// Trust indicators
const trustIndicators = [
  { icon: Users, text: "500+ Sales Teams" },
  { icon: Globe, text: "12 Indian Languages" },
  { icon: Truck, text: "FMCG • Pharma • Beverages" }
];

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: "easeOut" as const
    }
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: "easeOut" as const
    }
  }
};

export const HeroSection = () => {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Animated background mesh */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Primary gradient orbs */}
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-purple-500/5 rounded-full blur-[150px]" />
        
        {/* Subtle grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
          }}
        />
      </div>

      {/* Content */}
      <motion.div 
        className="relative z-10 container mx-auto px-4 pt-24 md:pt-32 pb-16"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Badge */}
        <motion.div variants={itemVariants} className="flex justify-center mb-8">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-xl text-white px-5 py-2.5 rounded-full text-sm font-medium border border-white/20 shadow-lg">
            <Sparkles className="h-4 w-4 text-amber-400" />
            AI-Powered Field Sales Platform
          </div>
        </motion.div>

        {/* Main headline */}
        <motion.div variants={itemVariants} className="text-center max-w-4xl mx-auto mb-6">
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1] tracking-tight">
            <span className="text-white">Transform Your</span>
            <br />
            <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 bg-clip-text text-transparent">
              Field Sales with AI
            </span>
          </h1>
        </motion.div>

        {/* Subheadline */}
        <motion.p 
          variants={itemVariants}
          className="text-center text-lg md:text-xl text-white/60 max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          The complete platform for FMCG, Pharma & Beverage companies to 
          <span className="text-white/80 font-medium"> automate sales</span>, 
          <span className="text-white/80 font-medium"> empower distributors</span> & 
          <span className="text-white/80 font-medium"> grow revenue</span>.
        </motion.p>

        {/* CTAs */}
        <motion.div 
          variants={itemVariants}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12"
        >
          <Button
            size="lg"
            onClick={() => navigate("/signup")}
            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold px-8 py-6 text-lg rounded-xl shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-all duration-300 group"
          >
            Start Free Trial
            <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => navigate("/contact")}
            className="border-white/20 bg-white/5 hover:bg-white/10 text-white font-semibold px-8 py-6 text-lg rounded-xl backdrop-blur-sm transition-all duration-300 group"
          >
            <Play className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
            Watch Demo
          </Button>
        </motion.div>

        {/* Trust indicators */}
        <motion.div 
          variants={itemVariants}
          className="flex flex-wrap items-center justify-center gap-6 md:gap-10 mb-16 md:mb-20"
        >
          {trustIndicators.map((item, index) => (
            <div 
              key={index}
              className="flex items-center gap-2 text-white/50 text-sm"
            >
              <item.icon className="h-4 w-4 text-white/40" />
              <span>{item.text}</span>
            </div>
          ))}
        </motion.div>

        {/* Solution cards */}
        <motion.div 
          variants={containerVariants}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto"
        >
          {solutions.map((solution, index) => (
            <motion.div
              key={index}
              variants={cardVariants}
              whileHover={{ y: -8, transition: { duration: 0.2 } }}
              className={`relative group p-6 rounded-2xl bg-gradient-to-br ${solution.color} backdrop-blur-xl border border-white/10 hover:border-white/20 transition-all duration-300 cursor-pointer`}
            >
              {/* Glow effect on hover */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              <div className="relative z-10">
                <div className={`w-12 h-12 rounded-xl ${solution.iconBg} flex items-center justify-center mb-4`}>
                  <solution.icon className={`h-6 w-6 ${solution.iconColor}`} />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">{solution.title}</h3>
                <p className="text-white/60 text-sm leading-relaxed">{solution.description}</p>
                
                {/* Learn more link */}
                <div className="mt-4 flex items-center gap-1 text-sm text-white/40 group-hover:text-white/70 transition-colors">
                  <span>Learn more</span>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Bottom feature highlights */}
        <motion.div 
          variants={itemVariants}
          className="flex flex-wrap items-center justify-center gap-6 md:gap-8 mt-16 text-sm text-white/40"
        >
          {[
            "No credit card required",
            "Setup in 5 minutes",
            "Free onboarding support"
          ].map((feature, index) => (
            <div key={index} className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-400/60" />
              <span>{feature}</span>
            </div>
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
};

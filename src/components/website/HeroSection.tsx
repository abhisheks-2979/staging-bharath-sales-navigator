import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Star, Wifi, WifiOff, Shield, Zap, Calculator, Users, Brain, Sparkles } from "lucide-react";

export const HeroSection = () => {
  const navigate = useNavigate();

  return (
    <section className="relative py-20 lg:py-28 px-4 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-hero"></div>
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/40"></div>
      
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-accent-gold/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent-gold/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="container mx-auto text-center relative z-10">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-accent-gold/20 text-accent-gold px-4 py-2 rounded-full text-sm font-medium mb-6 backdrop-blur border border-accent-gold/30">
          <Brain className="h-4 w-4" />
          AI-First Platform • Built to Guide, Not Just Collect Data
        </div>

        {/* Main Headline */}
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
          One Price, Unlimited Users <br className="hidden lg:block" />
          <span className="bg-gradient-to-r from-accent-gold to-accent-bronze bg-clip-text text-transparent">
            Success-Based Pricing
          </span>
        </h1>

        {/* Sub-headline */}
        <p className="text-lg md:text-xl text-white/90 mb-6 max-w-3xl mx-auto leading-relaxed">
          <strong>Field Sales • Distributor Management • Institutional Sales • Van Sales</strong> — 
          all powered by AI that <em>guides</em> your team, not just collects data.
        </p>
        <p className="text-xl md:text-2xl font-semibold text-accent-gold mb-8 max-w-2xl mx-auto">
          Stop paying per user. Give everyone in your organization the power of digital and AI.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
          <Button 
            size="lg"
            onClick={() => navigate('/auth')}
            className="bg-accent-gold hover:bg-accent-gold/90 text-accent-gold-foreground px-8 py-6 text-lg font-semibold shadow-hero"
          >
            Start Free Trial
          </Button>
          <Button 
            variant="outline" 
            size="lg"
            className="border-white/50 bg-white/10 text-white hover:bg-white/20 px-8 py-6 text-lg backdrop-blur font-medium"
          >
            Watch Demo
          </Button>
        </div>

        {/* ROI Calculator CTA */}
        <div className="mb-8">
          <Button
            variant="link"
            onClick={() => navigate('/roi-calculator')}
            className="text-accent-gold hover:text-accent-gold/80 gap-2"
          >
            <Calculator className="w-4 h-4" />
            Calculate Your ROI Potential
          </Button>
        </div>
      </div>
    </section>
  );
};

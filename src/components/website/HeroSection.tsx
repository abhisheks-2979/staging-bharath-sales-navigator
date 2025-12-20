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
        <p className="text-base md:text-lg text-white/70 mb-8 max-w-2xl mx-auto">
          One price, unlimited users. We charge for the success we create, not per seat — 
          so everyone in your organization gets the power of digital and AI.
        </p>

        {/* Trust Badges */}
        <div className="flex flex-wrap justify-center gap-4 mb-8">
          <div className="flex items-center gap-2 bg-accent-gold/20 backdrop-blur px-4 py-2 rounded-full text-accent-gold text-sm border border-accent-gold/40 font-medium">
            <Users className="h-4 w-4" />
            Unlimited Users
          </div>
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur px-4 py-2 rounded-full text-white/90 text-sm border border-white/20">
            <Brain className="h-4 w-4 text-accent-gold" />
            AI-First Architecture
          </div>
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur px-4 py-2 rounded-full text-white/90 text-sm border border-white/20">
            <WifiOff className="h-4 w-4 text-accent-gold" />
            Works Offline
          </div>
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur px-4 py-2 rounded-full text-white/90 text-sm border border-white/20">
            <Sparkles className="h-4 w-4 text-accent-gold" />
            Guides, Not Just Tracks
          </div>
        </div>

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
        <div className="mb-12">
          <Button
            variant="link"
            onClick={() => navigate('/roi-calculator')}
            className="text-accent-gold hover:text-accent-gold/80 gap-2"
          >
            <Calculator className="w-4 h-4" />
            Calculate Your ROI Potential
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 max-w-4xl mx-auto">
          <div className="text-center p-4 rounded-xl bg-accent-gold/10 backdrop-blur border border-accent-gold/30">
            <div className="text-3xl md:text-4xl font-bold text-accent-gold">∞</div>
            <div className="text-sm text-white/80">Unlimited Users</div>
          </div>
          <div className="text-center p-4 rounded-xl bg-white/5 backdrop-blur border border-white/10">
            <div className="text-3xl md:text-4xl font-bold text-accent-gold">AI</div>
            <div className="text-sm text-white/80">First Approach</div>
          </div>
          <div className="text-center p-4 rounded-xl bg-white/5 backdrop-blur border border-white/10">
            <div className="text-3xl md:text-4xl font-bold text-accent-gold">100%</div>
            <div className="text-sm text-white/80">Offline Ready</div>
          </div>
          <div className="text-center p-4 rounded-xl bg-white/5 backdrop-blur border border-white/10">
            <div className="text-3xl md:text-4xl font-bold text-accent-gold">6</div>
            <div className="text-sm text-white/80">Languages</div>
          </div>
        </div>
      </div>
    </section>
  );
};

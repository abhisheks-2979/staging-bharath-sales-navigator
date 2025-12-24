import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { 
  ArrowRight,
  Sparkles,
  MapPin,
  Mic,
  MessageCircle
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
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.5, delay }}
    className={`absolute bg-card/95 backdrop-blur-md border border-border/40 rounded-lg shadow-xl p-3 ${className}`}
  >
    {children}
  </motion.div>
);

export const HeroSection = () => {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-screen overflow-hidden">
      {/* Full-screen background image with strong overlay for readability */}
      <div className="absolute inset-0">
        <img 
          src={fieldSalesHero} 
          alt="Field Sales Representative" 
          className="w-full h-full object-cover object-center"
        />
        {/* Stronger gradient overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/90 via-background/50 to-background/90"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-20">
        {/* Badge */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 bg-primary/10 backdrop-blur-sm text-primary px-4 py-2 rounded-full text-xs md:text-sm font-medium mb-6 border border-primary/20"
        >
          <Sparkles className="h-3 w-3 md:h-4 md:w-4" />
          AI-Powered Field Sales
        </motion.div>

        {/* Main Headline */}
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl md:text-6xl lg:text-7xl font-bold text-foreground mb-6 leading-tight text-center max-w-4xl"
        >
          Superpowers,
          <br />
          <span className="bg-gradient-to-r from-primary to-accent-gold bg-clip-text text-transparent">
            everywhere you sell
          </span>
        </motion.h1>

        {/* Sub-headline */}
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-lg md:text-xl text-muted-foreground mb-8 max-w-xl text-center"
        >
          AI recommendations, smart routing, and real-time insights for every beat
        </motion.p>

        {/* CTAs */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-4 mb-12"
        >
          <Button 
            size="lg"
            onClick={() => navigate('/auth')}
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-6 text-lg font-semibold gap-2"
          >
            Start Free Trial
            <ArrowRight className="w-5 h-5" />
          </Button>
          <Button 
            variant="outline" 
            size="lg"
            onClick={() => navigate('/request-demo')}
            className="border-border bg-background/80 backdrop-blur-sm text-foreground hover:bg-background px-8 py-6 text-lg font-medium"
          >
            Request Demo
          </Button>
        </motion.div>

        {/* Floating cards - Only 3 key features, desktop only */}
        <div className="hidden lg:block">
          {/* Left card */}
          <FloatingCard className="left-[8%] top-[35%]" delay={0.6}>
            <div className="flex items-center gap-2 text-sm">
              <div className="p-1.5 rounded bg-accent-gold/20">
                <MapPin className="w-4 h-4 text-accent-gold" />
              </div>
              <div>
                <p className="font-medium text-foreground">AI Beat Planner</p>
                <p className="text-xs text-muted-foreground">Smart route optimization</p>
              </div>
            </div>
          </FloatingCard>

          {/* Right top card */}
          <FloatingCard className="right-[8%] top-[30%]" delay={0.7}>
            <div className="flex items-center gap-2 text-sm">
              <div className="p-1.5 rounded bg-green-500/20">
                <MessageCircle className="w-4 h-4 text-green-500" />
              </div>
              <div>
                <p className="font-medium text-foreground">WhatsApp Orders</p>
                <p className="text-xs text-muted-foreground">Update via chat bot</p>
              </div>
            </div>
          </FloatingCard>

          {/* Right bottom card */}
          <FloatingCard className="right-[12%] bottom-[25%]" delay={0.8}>
            <div className="flex items-center gap-2 text-sm">
              <div className="p-1.5 rounded bg-purple-500/20">
                <Mic className="w-4 h-4 text-purple-500" />
              </div>
              <div>
                <p className="font-medium text-foreground">Voice Updates</p>
                <p className="text-xs text-muted-foreground">Speak to capture notes</p>
              </div>
            </div>
          </FloatingCard>
        </div>

        {/* Mobile - Simple feature pills */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="lg:hidden flex flex-wrap justify-center gap-2"
        >
          {[
            { icon: MapPin, label: "AI Beat Planner", color: "text-accent-gold" },
            { icon: MessageCircle, label: "WhatsApp Orders", color: "text-green-500" },
            { icon: Mic, label: "Voice Updates", color: "text-purple-500" },
          ].map((item, i) => (
            <div 
              key={i}
              className="flex items-center gap-1.5 bg-card/80 backdrop-blur-sm border border-border/40 rounded-full px-3 py-1.5 text-xs"
            >
              <item.icon className={`w-3 h-3 ${item.color}`} />
              <span className="text-foreground">{item.label}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};
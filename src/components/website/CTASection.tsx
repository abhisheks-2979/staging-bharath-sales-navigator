import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowRight, CheckCircle } from "lucide-react";

export const CTASection = () => {
  const navigate = useNavigate();

  const benefits = [
    "14-day free trial",
    "No credit card required",
    "Full feature access",
    "Dedicated onboarding support"
  ];

  return (
    <section className="py-20 px-4 bg-gradient-hero relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/40"></div>
      
      {/* Background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-64 h-64 bg-accent-gold/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-accent-gold/5 rounded-full blur-3xl"></div>
      </div>

      <div className="container mx-auto text-center relative z-10">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6">
          Ready to Transform Your <br className="hidden md:block" />
          <span className="bg-gradient-to-r from-accent-gold to-accent-bronze bg-clip-text text-transparent">
            Field Sales Operations?
          </span>
        </h2>
        
        <p className="text-lg md:text-xl text-white/90 mb-8 max-w-2xl mx-auto">
          Join hundreds of companies using QuickApp.AI to boost sales productivity, 
          improve retailer relationships, and drive revenue growth.
        </p>

        {/* Benefits */}
        <div className="flex flex-wrap justify-center gap-4 mb-10">
          {benefits.map((benefit, index) => (
            <div key={index} className="flex items-center gap-2 text-white/90 text-sm">
              <CheckCircle className="h-4 w-4 text-accent-gold" />
              {benefit}
            </div>
          ))}
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button 
            size="lg"
            onClick={() => navigate('/auth')}
            className="bg-accent-gold hover:bg-accent-gold/90 text-accent-gold-foreground px-10 py-6 text-lg font-semibold shadow-hero"
          >
            Start Free Trial
            <ArrowRight className="h-5 w-5 ml-2" />
          </Button>
          <Button 
            variant="outline"
            size="lg"
            className="border-white/30 text-white hover:bg-white/10 px-10 py-6 text-lg backdrop-blur"
          >
            Schedule Demo
          </Button>
        </div>

        {/* Trust indicator */}
        <p className="text-white/60 text-sm mt-8">
          Trusted by sales teams across FMCG, Beverages, Pharma, and Consumer Durables
        </p>
      </div>
    </section>
  );
};

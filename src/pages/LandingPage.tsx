import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { BarChart3, Users, MapPin, Target, TrendingUp, Calendar, Star, Award, CheckCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";

export const LandingPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Redirect logged-in users to dashboard
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const features = [
    {
      icon: <MapPin className="h-8 w-8 text-primary" />,
      title: "Beat Planning",
      description: "Optimize your sales routes and territory management with intelligent beat planning."
    },
    {
      icon: <Users className="h-8 w-8 text-primary" />,
      title: "Retailer Management",
      description: "Maintain comprehensive retailer profiles and track relationships effectively."
    },
    {
      icon: <Calendar className="h-8 w-8 text-primary" />,
      title: "Visit Scheduling",
      description: "Plan and track customer visits with automated scheduling and reminders."
    },
    {
      icon: <BarChart3 className="h-8 w-8 text-primary" />,
      title: "Sales Analytics",
      description: "Get real-time insights into your sales performance and market trends."
    },
    {
      icon: <Target className="h-8 w-8 text-primary" />,
      title: "Performance Tracking",
      description: "Monitor team performance and achieve sales targets with data-driven insights."
    },
    {
      icon: <TrendingUp className="h-8 w-8 text-primary" />,
      title: "Growth Analytics",
      description: "Track business growth and identify opportunities for expansion."
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-hero rounded-lg flex items-center justify-center shadow-button">
              <BarChart3 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Field Sales AI</h1>
              <p className="text-xs text-muted-foreground">by KVP Business Solutions</p>
            </div>
          </div>
          <Button 
            onClick={() => navigate('/auth')}
            className="bg-primary hover:bg-primary-dark text-primary-foreground shadow-button"
          >
            Login
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-24 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/40"></div>
        <div className="container mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-accent-gold/20 text-accent-gold px-4 py-2 rounded-full text-sm font-medium mb-6 backdrop-blur">
            <Star className="h-4 w-4" />
            Certified Salesforce Partner Solutions
          </div>
          <h2 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
            Revolutionize Your <br />
            <span className="bg-gradient-to-r from-accent-gold to-accent-bronze bg-clip-text text-transparent">
              Field Sales
            </span>
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-3xl mx-auto leading-relaxed">
            Empower your sales team with KVP's AI-driven insights, intelligent route planning, 
            and comprehensive performance analytics. Transform your field operations today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg"
              onClick={() => navigate('/auth')}
              className="bg-accent-gold hover:bg-accent-gold/90 text-accent-gold-foreground px-8 py-4 text-lg font-semibold shadow-hero"
            >
              Get Started
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              className="border-white/30 text-white hover:bg-white/10 px-8 py-4 text-lg backdrop-blur"
            >
              Watch Demo
            </Button>
          </div>
          
          {/* Trust Indicators */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-16 text-white/80">
            <div className="text-center">
              <div className="text-3xl font-bold text-accent-gold">500+</div>
              <div className="text-sm">Successful Projects</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-accent-gold">15,000+</div>
              <div className="text-sm">Users Supported</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-accent-gold">18+</div>
              <div className="text-sm">Countries Served</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-accent-gold">98%</div>
              <div className="text-sm">Client Satisfaction</div>
            </div>
          </div>
        </div>
      </section>

      {/* AI Differentiation Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-accent-gold/10 text-accent-gold px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Award className="h-4 w-4" />
            Powered by Advanced AI Technology
          </div>
          <h3 className="text-4xl font-bold text-foreground mb-6">
            AI-Powered Sales Intelligence
          </h3>
          <p className="text-xl text-muted-foreground mb-12 max-w-4xl mx-auto">
            Our AI technology analyzes retailer behavior, market trends, and sales patterns to provide 
            personalized insights that help you build stronger relationships and close more deals in the field.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="border-border/40 bg-card shadow-card hover:shadow-hero transition-all duration-300">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-6 shadow-button">
                  <Target className="h-8 w-8 text-white" />
                </div>
                <h4 className="text-xl font-semibold text-foreground mb-4">
                  Smart Retailer Insights
                </h4>
                <p className="text-muted-foreground">
                  AI analyzes purchase patterns, preferences, and timing to suggest the best products and offers for each retailer visit.
                </p>
              </CardContent>
            </Card>
            <Card className="border-border/40 bg-card shadow-card hover:shadow-hero transition-all duration-300">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-6 shadow-button">
                  <TrendingUp className="h-8 w-8 text-white" />
                </div>
                <h4 className="text-xl font-semibold text-foreground mb-4">
                  Predictive Analytics
                </h4>
                <p className="text-muted-foreground">
                  Forecast demand, identify growth opportunities, and predict which retailers are most likely to increase their orders.
                </p>
              </CardContent>
            </Card>
            <Card className="border-border/40 bg-card shadow-card hover:shadow-hero transition-all duration-300">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-6 shadow-button">
                  <Users className="h-8 w-8 text-white" />
                </div>
                <h4 className="text-xl font-semibold text-foreground mb-4">
                  Personalized Conversations
                </h4>
                <p className="text-muted-foreground">
                  Get conversation starters, talking points, and relationship-building tips tailored to each retailer's history and preferences.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-background">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h3 className="text-4xl font-bold text-foreground mb-6">
              Powerful Features for Modern Sales Teams
            </h3>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Discover how our comprehensive suite of tools transforms field sales operations
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="border-border/40 bg-card shadow-card hover:shadow-hero transition-all duration-300 hover:scale-105 cursor-pointer group" 
                    onClick={() => navigate(`/features/${feature.title.toLowerCase().replace(/\s+/g, '-')}`)}>
                <CardContent className="p-8 text-center">
                  <div className="flex justify-center mb-6">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary-light rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      {feature.icon}
                    </div>
                  </div>
                  <h4 className="text-xl font-semibold text-foreground mb-4">
                    {feature.title}
                  </h4>
                  <p className="text-muted-foreground mb-6">
                    {feature.description}
                  </p>
                  <Button variant="outline" size="sm" className="group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    Learn More
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-hero relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/40"></div>
        <div className="container mx-auto text-center relative z-10">
          <h3 className="text-4xl font-bold text-white mb-6">
            Ready to Transform Your Sales Process?
          </h3>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Join thousands of sales professionals who trust KVP's Field Sales AI solutions
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg"
              onClick={() => navigate('/auth')}
              className="bg-accent-gold hover:bg-accent-gold/90 text-accent-gold-foreground px-12 py-4 text-lg font-semibold shadow-hero"
            >
              Start Your Journey
            </Button>
            <Button 
              variant="outline"
              size="lg"
              className="border-white/30 text-white hover:bg-white/10 px-12 py-4 text-lg backdrop-blur"
            >
              Schedule Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 bg-background py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center space-x-3 mb-6 md:mb-0">
              <div className="w-10 h-10 bg-gradient-hero rounded-lg flex items-center justify-center shadow-button">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <div>
                <span className="text-lg font-semibold text-foreground">Field Sales AI</span>
                <p className="text-sm text-muted-foreground">by KVP Business Solutions</p>
              </div>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-accent-gold" />
                <span>Certified Salesforce Partner</span>
              </div>
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-accent-gold" />
                <span>ISO 27001 Certified</span>
              </div>
            </div>
          </div>
          <div className="border-t border-border/40 mt-8 pt-8 text-center">
            <p className="text-muted-foreground">
              © 2024 KVP Business Solutions. Empowering sales teams worldwide.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};
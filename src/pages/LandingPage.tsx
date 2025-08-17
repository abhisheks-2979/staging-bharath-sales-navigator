import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { BarChart3, Users, MapPin, Target, TrendingUp, Calendar } from "lucide-react";

export const LandingPage = () => {
  const navigate = useNavigate();

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
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <BarChart3 className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Field Sales AI</h1>
          </div>
          <Button 
            onClick={() => navigate('/auth')}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            Login
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <h2 className="text-5xl font-bold text-foreground mb-6">
            Revolutionize Your <span className="text-primary">Field Sales</span>
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Empower your sales team with AI-driven insights, intelligent route planning, 
            and comprehensive performance analytics. Transform your field operations today.
          </p>
          <div className="space-x-4">
            <Button 
              size="lg"
              onClick={() => navigate('/auth')}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 text-lg"
            >
              Get Started
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              className="px-8 py-4 text-lg"
            >
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-background/50">
        <div className="container mx-auto">
          <h3 className="text-3xl font-bold text-center text-foreground mb-12">
            Powerful Features for Modern Sales Teams
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="border-border/40 bg-card/50 backdrop-blur">
                <CardContent className="p-6 text-center">
                  <div className="flex justify-center mb-4">
                    {feature.icon}
                  </div>
                  <h4 className="text-xl font-semibold text-foreground mb-3">
                    {feature.title}
                  </h4>
                  <p className="text-muted-foreground">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <h3 className="text-3xl font-bold text-foreground mb-6">
            Ready to Transform Your Sales Process?
          </h3>
          <p className="text-xl text-muted-foreground mb-8">
            Join thousands of sales professionals who trust Field Sales AI
          </p>
          <Button 
            size="lg"
            onClick={() => navigate('/auth')}
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-12 py-4 text-lg"
          >
            Start Your Journey
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 bg-background/95 py-8">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <BarChart3 className="h-6 w-6 text-primary" />
            <span className="text-lg font-semibold text-foreground">Field Sales AI</span>
          </div>
          <p className="text-muted-foreground">
            © 2024 Field Sales AI. Empowering sales teams worldwide.
          </p>
        </div>
      </footer>
    </div>
  );
};
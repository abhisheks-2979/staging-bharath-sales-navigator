import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, BarChart3, PieChart, TrendingUp, Eye, Brain, Target } from "lucide-react";

export const SalesAnalyticsFeature = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <BarChart3 className="h-6 w-6" />,
      title: "Real-time Dashboards",
      description: "Monitor sales performance, visit outcomes, and market trends with live, interactive dashboards."
    },
    {
      icon: <PieChart className="h-6 w-6" />,
      title: "Market Insights",
      description: "Analyze market penetration, competitor activity, and customer segmentation for strategic planning."
    },
    {
      icon: <Brain className="h-6 w-6" />,
      title: "Predictive Intelligence",
      description: "AI-powered forecasting helps predict trends, identify opportunities, and prevent issues before they occur."
    },
    {
      icon: <Target className="h-6 w-6" />,
      title: "Performance Metrics",
      description: "Track KPIs, conversion rates, and goal achievement with detailed performance analytics."
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/')}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
          <div className="flex items-center space-x-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold text-foreground">Sales Analytics</h1>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto text-center">
          <BarChart3 className="h-16 w-16 text-primary mx-auto mb-6" />
          <h2 className="text-4xl font-bold text-foreground mb-6">
            Unlock Sales <span className="text-primary">Intelligence</span>
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Get real-time insights into your sales performance and market trends with powerful analytics 
            that help you make data-driven decisions and drive growth.
          </p>
          <Button 
            size="lg"
            onClick={() => navigate('/auth')}
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 text-lg"
          >
            Explore Sales Analytics
          </Button>
        </div>
      </section>

      {/* Screenshot Section */}
      <section className="py-16 px-4 bg-background/50">
        <div className="container mx-auto">
          <div className="max-w-4xl mx-auto">
            <Card className="shadow-xl">
              <CardContent className="p-8">
                <img 
                  src="/lovable-uploads/4c36505f-db4e-43df-a38e-80e7d29ff090.png" 
                  alt="Sales Analytics Dashboard"
                  className="w-full rounded-lg shadow-lg"
                />
              </CardContent>
            </Card>
            <p className="text-center text-muted-foreground mt-4 text-sm">
              Comprehensive analytics dashboard with charts, trends, and actionable insights
            </p>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <h3 className="text-3xl font-bold text-center text-foreground mb-12">
            Advanced Analytics Features
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {features.map((feature, index) => (
              <Card key={index} className="border-border/40 bg-card/50 backdrop-blur">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                      {feature.icon}
                    </div>
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 px-4 bg-primary/5">
        <div className="container mx-auto">
          <div className="max-w-3xl mx-auto text-center">
            <h3 className="text-2xl font-bold text-foreground mb-8">
              Data-Driven Sales Success
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-2">70%</div>
                <div className="text-sm text-muted-foreground">Better decision making</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-2">55%</div>
                <div className="text-sm text-muted-foreground">Faster opportunity identification</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-2">40%</div>
                <div className="text-sm text-muted-foreground">Improved forecasting accuracy</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto text-center">
          <h3 className="text-2xl font-bold text-foreground mb-6">
            Ready to Harness Your Sales Data?
          </h3>
          <Button 
            size="lg"
            onClick={() => navigate('/auth')}
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4"
          >
            Get Started with Analytics
          </Button>
        </div>
      </section>
    </div>
  );
};
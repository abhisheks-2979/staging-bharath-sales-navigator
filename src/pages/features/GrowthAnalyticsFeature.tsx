import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, TrendingUp, Zap, Eye, Lightbulb, BarChart2 } from "lucide-react";

export const GrowthAnalyticsFeature = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <Zap className="h-6 w-6" />,
      title: "Growth Opportunities",
      description: "Identify untapped markets, customer segments, and product opportunities for business expansion."
    },
    {
      icon: <Eye className="h-6 w-6" />,
      title: "Market Intelligence",
      description: "Analyze market trends, competitor movements, and customer behavior patterns for strategic insights."
    },
    {
      icon: <Lightbulb className="h-6 w-6" />,
      title: "Strategic Recommendations",
      description: "Receive AI-powered recommendations for growth strategies based on your data and market conditions."
    },
    {
      icon: <BarChart2 className="h-6 w-6" />,
      title: "Expansion Planning",
      description: "Plan territory expansion, new market entry, and resource allocation with data-driven insights."
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
            <TrendingUp className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold text-foreground">Growth Analytics</h1>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto text-center">
          <TrendingUp className="h-16 w-16 text-primary mx-auto mb-6" />
          <h2 className="text-4xl font-bold text-foreground mb-6">
            Accelerate Your <span className="text-primary">Growth</span>
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Track business growth and identify opportunities for expansion with advanced analytics 
            that reveal hidden patterns and untapped potential in your market.
          </p>
          <Button 
            size="lg"
            onClick={() => navigate('/auth')}
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 text-lg"
          >
            Unlock Growth Insights
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
                  src="/lovable-uploads/f1a677a5-6652-4477-972d-8c634cd05cd0.png" 
                  alt="Growth Analytics Dashboard"
                  className="w-full rounded-lg shadow-lg"
                />
              </CardContent>
            </Card>
            <p className="text-center text-muted-foreground mt-4 text-sm">
              Growth analytics dashboard with trend analysis and expansion opportunities
            </p>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <h3 className="text-3xl font-bold text-center text-foreground mb-12">
            Strategic Growth Intelligence
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
              Unlock Exponential Growth
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-2">150%</div>
                <div className="text-sm text-muted-foreground">Faster market expansion</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-2">80%</div>
                <div className="text-sm text-muted-foreground">Better opportunity identification</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-2">60%</div>
                <div className="text-sm text-muted-foreground">More strategic decisions</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto text-center">
          <h3 className="text-2xl font-bold text-foreground mb-6">
            Ready to Scale Your Business?
          </h3>
          <Button 
            size="lg"
            onClick={() => navigate('/auth')}
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4"
          >
            Get Started with Growth Analytics
          </Button>
        </div>
      </section>
    </div>
  );
};
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { WebsiteHeader } from "@/components/website";
import { useNavigate } from "react-router-dom";
import { 
  Building2, 
  Users, 
  Target, 
  FileText, 
  TrendingUp, 
  CheckCircle2,
  Briefcase,
  PieChart,
  Mail,
  Calendar,
  DollarSign,
  LineChart
} from "lucide-react";

const features = [
  {
    icon: Building2,
    title: "Account Management",
    description: "360° view of institutional accounts with contact hierarchy, purchase history, and relationship mapping."
  },
  {
    icon: Target,
    title: "Lead Management",
    description: "Capture and nurture leads with automated scoring, assignment rules, and follow-up reminders."
  },
  {
    icon: Briefcase,
    title: "Opportunity Pipeline",
    description: "Visual pipeline management with stage-wise tracking, win probability, and forecasting."
  },
  {
    icon: FileText,
    title: "Quote Management",
    description: "Create professional quotes with product configuration, pricing tiers, and approval workflows."
  },
  {
    icon: Calendar,
    title: "Activity Tracking",
    description: "Log meetings, calls, and emails. Never miss a follow-up with smart reminders."
  },
  {
    icon: DollarSign,
    title: "Collections Management",
    description: "Track outstanding invoices, payment schedules, and collection activities for better cash flow."
  }
];

const benefits = [
  "Complete CRM for institutional/B2B sales",
  "Visual pipeline with accurate forecasting",
  "Automated lead scoring and assignment",
  "Professional quote generation",
  "360° account visibility",
  "Mobile-first for on-the-go sales teams"
];

const relatedFeatures = [
  { title: "Lead Tracking", link: "/features" },
  { title: "Quote Builder", link: "/features" },
  { title: "Sales Forecasting", link: "/features" },
  { title: "Account Analytics", link: "/features" }
];

export default function InstitutionalSalesSolution() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <WebsiteHeader />
      
      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 bg-gradient-to-b from-primary/10 to-background">
        <div className="container mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="inline-block px-4 py-2 bg-primary/20 text-primary rounded-full text-sm font-medium mb-6">
                Institutional Sales CRM
              </span>
              <h1 className="text-4xl md:text-5xl font-bold mb-6">
                Win More Deals with{" "}
                <span className="text-primary">B2B Sales CRM</span>
              </h1>
              <p className="text-xl text-muted-foreground mb-8">
                Purpose-built CRM for institutional and B2B sales. Manage leads, opportunities, 
                quotes, and accounts with a mobile-first approach designed for field sales teams.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button 
                  size="lg" 
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={() => navigate('/demo')}
                >
                  Request Demo
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  onClick={() => navigate('/features')}
                >
                  View All Features
                </Button>
              </div>
            </div>
            <div className="relative">
              <div className="bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl p-8 border border-primary/20">
                <img 
                  src="/lovable-uploads/9f7ffcf1-9bd9-472a-b8c1-c50198c85075.png" 
                  alt="Institutional Sales CRM Dashboard" 
                  className="rounded-lg shadow-2xl"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Complete B2B Sales <span className="text-primary">Platform</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Everything you need to manage complex B2B sales cycles
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="bg-card/50 border-border/50 hover:border-primary/50 transition-all duration-300">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4 bg-primary/5">
        <div className="container mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Why Choose Our <span className="text-primary">Institutional CRM?</span>
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Built specifically for B2B sales teams in FMCG, manufacturing, and distribution.
              </p>
              <ul className="space-y-4">
                {benefits.map((benefit, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-foreground">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-card/50 border-primary/20 p-6 text-center">
                <TrendingUp className="w-10 h-10 text-primary mx-auto mb-3" />
                <div className="text-3xl font-bold text-primary mb-1">35%</div>
                <div className="text-sm text-muted-foreground">Higher Win Rate</div>
              </Card>
              <Card className="bg-card/50 border-primary/20 p-6 text-center">
                <Users className="w-10 h-10 text-primary mx-auto mb-3" />
                <div className="text-3xl font-bold text-primary mb-1">50%</div>
                <div className="text-sm text-muted-foreground">Faster Follow-ups</div>
              </Card>
              <Card className="bg-card/50 border-primary/20 p-6 text-center">
                <PieChart className="w-10 h-10 text-primary mx-auto mb-3" />
                <div className="text-3xl font-bold text-primary mb-1">90%</div>
                <div className="text-sm text-muted-foreground">Forecast Accuracy</div>
              </Card>
              <Card className="bg-card/50 border-primary/20 p-6 text-center">
                <LineChart className="w-10 h-10 text-primary mx-auto mb-3" />
                <div className="text-3xl font-bold text-primary mb-1">2x</div>
                <div className="text-sm text-muted-foreground">Pipeline Growth</div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Related Features */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-2xl font-bold mb-8 text-center">Related Features</h2>
          <div className="flex flex-wrap justify-center gap-4">
            {relatedFeatures.map((feature, index) => (
              <Button 
                key={index}
                variant="outline" 
                className="border-primary/30 hover:bg-primary/10"
                onClick={() => navigate(feature.link)}
              >
                {feature.title}
              </Button>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-primary/20 to-primary/10">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Win More B2B Deals?
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            See how our institutional CRM can accelerate your sales cycle.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button 
              size="lg" 
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => navigate('/demo')}
            >
              Schedule Free Demo
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              onClick={() => navigate('/contact')}
            >
              Contact Sales
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

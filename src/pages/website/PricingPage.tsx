import { Check, Zap, Building2, Rocket, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { WebsiteHeader, WebsiteFooter } from "@/components/website";

const pricingTiers = [
  {
    name: "Free",
    price: "₹0",
    period: "forever",
    description: "Perfect for trying out the platform",
    icon: Zap,
    featured: false,
    features: [
      "Up to 10 users",
      "25 orders per day",
      "50 retailers",
      "5 beats",
      "1 GB storage",
      "7-day data retention",
      "Standard reports",
    ],
    cta: "Get Started Free",
  },
  {
    name: "Starter",
    price: "₹25,000",
    period: "/month",
    description: "For small teams starting digital transformation",
    icon: Rocket,
    featured: false,
    target: "10-30 field reps",
    features: [
      "Unlimited users",
      "5,000 orders/month",
      "500 retailers/month",
      "10,000 visits/month",
      "Offline capabilities",
      "Secondary sales management",
      "Beat planning & tracking",
      "Basic analytics",
    ],
    cta: "Start Free Trial",
  },
  {
    name: "Professional",
    price: "₹45,000",
    period: "/month",
    description: "For growing teams with distributor needs",
    icon: Building2,
    featured: true,
    target: "30-100 field reps",
    features: [
      "Everything in Starter, plus:",
      "15,000 orders/month",
      "1,500 retailers/month",
      "30,000 visits/month",
      "5 distributor portals",
      "Primary sales management",
      "Product bundles",
      "Advanced reporting",
    ],
    cta: "Start Free Trial",
  },
  {
    name: "Enterprise",
    price: "₹85,000",
    period: "/month",
    description: "For large teams with complex operations",
    icon: Crown,
    featured: false,
    target: "100-300 field reps",
    features: [
      "Everything in Professional, plus:",
      "40,000 orders/month",
      "4,000 retailers/month",
      "80,000 visits/month",
      "20 distributor portals",
      "AI-powered insights",
      "Retailer loyalty program",
      "Priority support",
    ],
    cta: "Contact Sales",
  },
];

export const PricingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <WebsiteHeader />
      
      {/* Hero Section */}
      <section className="pt-32 pb-16 px-4">
        <div className="container mx-auto text-center max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Simple, <span className="text-primary">Value-Based</span> Pricing
          </h1>
          <p className="text-xl text-muted-foreground">
            Pay for the value you unlock, not the number of users. All plans include unlimited users.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-12 px-4">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {pricingTiers.map((tier) => {
              const Icon = tier.icon;
              return (
                <Card
                  key={tier.name}
                  className={`relative p-6 flex flex-col ${
                    tier.featured
                      ? "border-primary bg-primary/5 scale-105 shadow-xl shadow-primary/10"
                      : "border-border bg-card"
                  }`}
                >
                  {tier.featured && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                        Most Popular
                      </span>
                    </div>
                  )}
                  
                  <div className="mb-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold">{tier.name}</h3>
                    {tier.target && (
                      <p className="text-xs text-muted-foreground mt-1">{tier.target}</p>
                    )}
                  </div>

                  <div className="mb-4">
                    <span className="text-3xl font-bold">{tier.price}</span>
                    <span className="text-muted-foreground">{tier.period}</span>
                  </div>

                  <p className="text-sm text-muted-foreground mb-6">
                    {tier.description}
                  </p>

                  <ul className="space-y-3 mb-8 flex-grow">
                    {tier.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className={`w-full ${
                      tier.featured
                        ? "bg-primary hover:bg-primary/90"
                        : "bg-secondary hover:bg-secondary/80"
                    }`}
                    onClick={() => navigate("/demo")}
                  >
                    {tier.cta}
                  </Button>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Enterprise Plus Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <Card className="p-8 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="flex-1">
                <h2 className="text-2xl font-bold mb-2">Enterprise Plus</h2>
                <p className="text-muted-foreground mb-4">
                  For large enterprises with 300+ field reps and multi-region operations
                </p>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary" />
                    Unlimited everything
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary" />
                    White-label options
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary" />
                    Custom integrations
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary" />
                    Dedicated success manager
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary" />
                    SLA guarantees
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary" />
                    On-premise deployment
                  </li>
                </ul>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">Custom pricing</p>
                <Button size="lg" onClick={() => navigate("/demo")}>
                  Contact Sales
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto max-w-3xl">
          <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold mb-2">What happens if I exceed my plan limits?</h3>
              <p className="text-muted-foreground text-sm">
                We'll notify you when you're approaching limits. Overages are charged at ₹3 per additional order and ₹8 per additional retailer.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Can I change plans anytime?</h3>
              <p className="text-muted-foreground text-sm">
                Yes, you can upgrade or downgrade your plan at any time. Changes take effect from the next billing cycle.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Is there a free trial?</h3>
              <p className="text-muted-foreground text-sm">
                Yes! All paid plans come with a 14-day free trial. No credit card required.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Do you offer annual discounts?</h3>
              <p className="text-muted-foreground text-sm">
                Yes, annual billing comes with a 20% discount. Contact our sales team for more details.
              </p>
            </div>
          </div>
        </div>
      </section>

      <WebsiteFooter />
    </div>
  );
};

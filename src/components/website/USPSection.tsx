import { Card, CardContent } from "@/components/ui/card";
import { Check, X, Zap, WifiOff, Trophy, Building2 } from "lucide-react";

const uspItems = [
  {
    icon: WifiOff,
    title: "True Offline-First Architecture",
    description: "Unlike competitors who offer limited offline, QuickApp.AI works 100% offline. Take orders, capture photos, record visits — everything works without internet and syncs automatically.",
    highlight: "100% functionality offline"
  },
  {
    icon: Zap,
    title: "Built-in AI Intelligence",
    description: "AI Sales Coach, smart product recommendations, credit scoring, and predictive analytics come standard — no extra cost or integration needed.",
    highlight: "AI included, not add-on"
  },
  {
    icon: Trophy,
    title: "Native Gamification Engine",
    description: "Leaderboards, badges, points, and team competitions built directly into the platform. Boost motivation without third-party tools.",
    highlight: "Gamification built-in"
  },
  {
    icon: Building2,
    title: "Triple Platform Coverage",
    description: "Field Sales + Distributor Portal + Institutional CRM in one unified platform. Manage your entire sales ecosystem without juggling multiple tools.",
    highlight: "3 platforms in 1"
  }
];

const comparisonData = [
  { feature: "True Offline Mode", quickapp: true, others: "Limited" },
  { feature: "Built-in AI Intelligence", quickapp: true, others: "Add-on" },
  { feature: "Native Gamification", quickapp: true, others: false },
  { feature: "Distributor Portal", quickapp: true, others: "Separate" },
  { feature: "Institutional CRM", quickapp: true, others: false },
  { feature: "Multi-Language (6+)", quickapp: true, others: "2-3" },
  { feature: "AI Credit Scoring", quickapp: true, others: false },
  { feature: "Van Sales Module", quickapp: true, others: "Add-on" },
];

export const USPSection = () => {
  return (
    <section id="why-us" className="py-20 px-4 bg-muted/30">
      <div className="container mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-accent-gold/10 text-accent-gold px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Zap className="h-4 w-4" />
            Why Choose QuickApp.AI
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            What Makes Us Different
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            We're not just another SFA tool. Here's why leading brands choose QuickApp.AI over traditional solutions.
          </p>
        </div>

        {/* USP Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          {uspItems.map((item, index) => (
            <Card key={index} className="border-border/40 bg-card shadow-card overflow-hidden group hover:shadow-hero transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-gold to-accent-bronze flex items-center justify-center flex-shrink-0">
                    <item.icon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <div className="inline-block px-2 py-1 bg-accent-gold/10 text-accent-gold text-xs font-medium rounded mb-2">
                      {item.highlight}
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      {item.title}
                    </h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Comparison Table */}
        <div className="max-w-3xl mx-auto">
          <h3 className="text-2xl font-bold text-foreground mb-6 text-center">
            QuickApp.AI vs. Traditional SFA
          </h3>
          <div className="rounded-xl border border-border/40 overflow-hidden bg-card shadow-card">
            <div className="grid grid-cols-3 bg-primary text-primary-foreground font-semibold">
              <div className="p-4">Feature</div>
              <div className="p-4 text-center border-l border-white/20">QuickApp.AI</div>
              <div className="p-4 text-center border-l border-white/20">Others</div>
            </div>
            {comparisonData.map((row, index) => (
              <div 
                key={index} 
                className={`grid grid-cols-3 ${index % 2 === 0 ? 'bg-background' : 'bg-muted/30'}`}
              >
                <div className="p-4 text-foreground font-medium">{row.feature}</div>
                <div className="p-4 text-center border-l border-border/40">
                  {row.quickapp === true ? (
                    <Check className="h-5 w-5 text-green-500 mx-auto" />
                  ) : (
                    <span className="text-muted-foreground">{row.quickapp}</span>
                  )}
                </div>
                <div className="p-4 text-center border-l border-border/40">
                  {row.others === true ? (
                    <Check className="h-5 w-5 text-green-500 mx-auto" />
                  ) : row.others === false ? (
                    <X className="h-5 w-5 text-red-400 mx-auto" />
                  ) : (
                    <span className="text-muted-foreground text-sm">{row.others}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

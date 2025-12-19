import { useState, useMemo } from "react";
import { Calculator, TrendingUp, Clock, Users, Check, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useNavigate } from "react-router-dom";
import { WebsiteHeader, WebsiteFooter } from "@/components/website";

const competitorPricing: Record<string, number> = {
  "no-solution": 1100,
  "bizom": 1500,
  "beatroute": 1200,
  "fieldassist": 1500,
  "grahaak": 750,
  "botree": 1250,
  "salesdiary": 800,
  "saleson": 1000,
  "other": 1100,
};

const industries = [
  { value: "fmcg", label: "FMCG/CPG" },
  { value: "pharma", label: "Pharmaceuticals" },
  { value: "durables", label: "Consumer Durables" },
  { value: "industrial", label: "Industrial/Manufacturing" },
  { value: "retail", label: "Retail/Distribution" },
  { value: "other", label: "Other" },
];

const competitors = [
  { value: "no-solution", label: "No current solution" },
  { value: "bizom", label: "Bizom" },
  { value: "beatroute", label: "Beatroute" },
  { value: "fieldassist", label: "FieldAssist" },
  { value: "grahaak", label: "Grahaak" },
  { value: "botree", label: "Botree SFA" },
  { value: "salesdiary", label: "SalesDiary" },
  { value: "saleson", label: "SalesOn" },
  { value: "other", label: "Other" },
];

const featureComparison = [
  { feature: "Unlimited Users", competitor: false, kvp: true },
  { feature: "AI Beat Planning", competitor: false, kvp: true },
  { feature: "Gamification", competitor: false, kvp: true },
  { feature: "Face Recognition", competitor: false, kvp: true },
  { feature: "Offline-First", competitor: "Limited", kvp: true },
  { feature: "Outcome Pricing", competitor: false, kvp: true },
];

export const ROICalculator = () => {
  const navigate = useNavigate();
  
  // Input state
  const [numReps, setNumReps] = useState(50);
  const [industry, setIndustry] = useState("fmcg");
  const [competitor, setCompetitor] = useState("no-solution");
  const [ordersPerRep, setOrdersPerRep] = useState(200);
  const [retailersPerRep, setRetailersPerRep] = useState(15);
  const [visitsPerDay, setVisitsPerDay] = useState(12);
  const [workingDays, setWorkingDays] = useState(24);

  // Calculations
  const calculations = useMemo(() => {
    // KVP Pricing
    const kvpBase = 35000;
    const monthlyOrders = numReps * ordersPerRep;
    const orderCharges = monthlyOrders * 3;
    const monthlyRetailers = numReps * retailersPerRep;
    const retailerCharges = monthlyRetailers * 8;
    const monthlyVisits = numReps * visitsPerDay * workingDays;
    const visitCharges = monthlyVisits * 0.5;
    const totalKvp = kvpBase + orderCharges + retailerCharges + visitCharges;

    // Competitor Pricing
    const perUserPrice = competitorPricing[competitor] || 1100;
    const totalCompetitor = numReps * perUserPrice;

    // Savings
    const monthlySavings = totalCompetitor - totalKvp;
    const annualSavings = monthlySavings * 12;
    const savingsPercentage = totalCompetitor > 0 ? (monthlySavings / totalCompetitor) * 100 : 0;

    // Productivity Gains
    const timeSavedHours = numReps * 2 * workingDays; // 2 hours/day saved per rep
    const valueOfTime = timeSavedHours * 500; // ₹500/hour
    const currentAdoption = 0.70;
    const kvpAdoption = 0.91;
    const additionalActiveUsers = numReps * (kvpAdoption - currentAdoption);
    const valueOfAdoption = additionalActiveUsers * 1000;
    const totalProductivityGain = valueOfTime + valueOfAdoption;

    // Cost per order
    const costPerOrderKvp = totalKvp / monthlyOrders;
    const costPerOrderCompetitor = totalCompetitor / monthlyOrders;

    // ROI Score (0-100) - based on savings percentage and productivity
    const hasSavings = monthlySavings > 0;
    let roiScore = 0;
    if (hasSavings) {
      const savingsScore = Math.min(savingsPercentage, 50) * 1.5; // Max 75 points
      const productivityScore = Math.min(totalProductivityGain / 100000, 1) * 25; // Max 25 points
      roiScore = Math.round(savingsScore + productivityScore);
    } else {
      // Even without cost savings, productivity gains provide value
      const productivityScore = Math.min(totalProductivityGain / 100000, 1) * 40;
      roiScore = Math.round(productivityScore);
    }

    return {
      kvpBase,
      orderCharges,
      retailerCharges,
      visitCharges,
      totalKvp,
      totalCompetitor,
      monthlySavings,
      annualSavings,
      savingsPercentage,
      timeSavedHours,
      valueOfTime,
      additionalActiveUsers,
      valueOfAdoption,
      totalProductivityGain,
      costPerOrderKvp,
      costPerOrderCompetitor,
      hasSavings,
      roiScore,
      monthlyOrders,
      monthlyRetailers,
      monthlyVisits,
    };
  }, [numReps, competitor, ordersPerRep, retailersPerRep, visitsPerDay, workingDays]);

  const formatCurrency = (amount: number) => {
    if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(2)} L`;
    }
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const getROILevel = (score: number) => {
    if (score >= 80) return { label: "Excellent", color: "text-green-500", bg: "bg-green-500" };
    if (score >= 60) return { label: "Very Good", color: "text-emerald-500", bg: "bg-emerald-500" };
    if (score >= 40) return { label: "Good", color: "text-yellow-500", bg: "bg-yellow-500" };
    return { label: "Moderate", color: "text-orange-500", bg: "bg-orange-500" };
  };

  const roiLevel = getROILevel(calculations.roiScore);

  return (
    <div className="min-h-screen bg-background">
      <WebsiteHeader />
      
      {/* Hero */}
      <section className="pt-28 pb-12 px-4">
        <div className="container mx-auto text-center max-w-3xl">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Calculator className="w-4 h-4" />
            ROI Calculator
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            Calculate Your <span className="text-primary">Savings</span> with QuickApp
          </h1>
          <p className="text-muted-foreground">
            See how much you can save compared to traditional per-user pricing solutions
          </p>
        </div>
      </section>

      {/* Calculator Section */}
      <section className="py-8 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="grid lg:grid-cols-5 gap-8">
            
            {/* Input Panel */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="p-6">
                <h2 className="text-lg font-semibold mb-6">Your Team Details</h2>
                
                {/* Number of Reps */}
                <div className="space-y-4 mb-6">
                  <div className="flex justify-between">
                    <Label>Number of Field Sales Reps</Label>
                    <span className="text-sm font-medium text-primary">{numReps}</span>
                  </div>
                  <Slider
                    value={[numReps]}
                    onValueChange={(v) => setNumReps(v[0])}
                    min={10}
                    max={300}
                    step={5}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    Include all field sales reps, ASMs, and TSMs
                  </p>
                </div>

                {/* Industry */}
                <div className="space-y-2 mb-6">
                  <Label>Industry</Label>
                  <Select value={industry} onValueChange={setIndustry}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {industries.map((ind) => (
                        <SelectItem key={ind.value} value={ind.value}>
                          {ind.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Current Solution */}
                <div className="space-y-2 mb-6">
                  <Label>Current SFA Solution</Label>
                  <Select value={competitor} onValueChange={setCompetitor}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {competitors.map((comp) => (
                        <SelectItem key={comp.value} value={comp.value}>
                          {comp.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </Card>

              <Card className="p-6">
                <h2 className="text-lg font-semibold mb-6">Activity Metrics</h2>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Orders/Rep/Month</Label>
                    <Input
                      type="number"
                      value={ordersPerRep}
                      onChange={(e) => setOrdersPerRep(Number(e.target.value))}
                      min={50}
                      max={1000}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">New Retailers/Rep/Month</Label>
                    <Input
                      type="number"
                      value={retailersPerRep}
                      onChange={(e) => setRetailersPerRep(Number(e.target.value))}
                      min={5}
                      max={100}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Visits/Rep/Day</Label>
                    <Input
                      type="number"
                      value={visitsPerDay}
                      onChange={(e) => setVisitsPerDay(Number(e.target.value))}
                      min={5}
                      max={30}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Working Days/Month</Label>
                    <Input
                      type="number"
                      value={workingDays}
                      onChange={(e) => setWorkingDays(Number(e.target.value))}
                      min={20}
                      max={26}
                    />
                  </div>
                </div>
              </Card>
            </div>

            {/* Results Panel */}
            <div className="lg:col-span-3 space-y-6">
              
              {/* ROI Score Card */}
              <Card className="p-6 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Your ROI Score</h2>
                  <span className={`text-sm font-medium px-3 py-1 rounded-full ${roiLevel.bg}/20 ${roiLevel.color}`}>
                    {roiLevel.label}
                  </span>
                </div>
                <div className="flex items-end gap-4">
                  <span className="text-6xl font-bold text-primary">{calculations.roiScore}</span>
                  <span className="text-2xl text-muted-foreground mb-2">/100</span>
                </div>
                <div className="w-full bg-muted rounded-full h-3 mt-4">
                  <div 
                    className={`h-3 rounded-full transition-all duration-500 ${roiLevel.bg}`}
                    style={{ width: `${calculations.roiScore}%` }}
                  />
                </div>
                <p className="text-sm text-muted-foreground mt-4">
                  Based on your inputs, QuickApp can help you save significantly while improving team productivity.
                </p>
              </Card>

              {/* Savings Summary */}
              <Card className="p-6">
                <h2 className="text-lg font-semibold mb-4">
                  {calculations.hasSavings ? "Your Estimated Savings" : "Cost Comparison"}
                </h2>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className={`text-center p-4 rounded-lg ${calculations.hasSavings ? 'bg-green-500/10' : 'bg-orange-500/10'}`}>
                    <p className={`text-2xl font-bold ${calculations.hasSavings ? 'text-green-600' : 'text-orange-600'}`}>
                      {calculations.hasSavings 
                        ? formatCurrency(calculations.monthlySavings)
                        : `+${formatCurrency(Math.abs(calculations.monthlySavings))}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {calculations.hasSavings ? "Monthly Savings" : "Additional Investment"}
                    </p>
                  </div>
                  <div className={`text-center p-4 rounded-lg ${calculations.hasSavings ? 'bg-green-500/10' : 'bg-orange-500/10'}`}>
                    <p className={`text-2xl font-bold ${calculations.hasSavings ? 'text-green-600' : 'text-orange-600'}`}>
                      {calculations.hasSavings 
                        ? formatCurrency(calculations.annualSavings)
                        : `+${formatCurrency(Math.abs(calculations.annualSavings))}`}
                    </p>
                    <p className="text-xs text-muted-foreground">Annual</p>
                  </div>
                  <div className="text-center p-4 bg-primary/10 rounded-lg">
                    <p className="text-2xl font-bold text-primary">
                      {formatCurrency(calculations.totalProductivityGain)}
                    </p>
                    <p className="text-xs text-muted-foreground">Productivity Value/mo</p>
                  </div>
                </div>

                {!calculations.hasSavings && (
                  <p className="text-sm text-muted-foreground mb-4 p-3 bg-muted/50 rounded-lg">
                    💡 QuickApp's value-based pricing works best for teams with higher activity. 
                    Try selecting a larger competitor like Bizom or FieldAssist to see typical savings.
                  </p>
                )}

                {/* Cost Comparison Bar */}
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Competitor Cost</span>
                    <span className={`font-medium ${calculations.hasSavings ? 'text-red-500' : 'text-muted-foreground'}`}>
                      {formatCurrency(calculations.totalCompetitor)}/mo
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-4">
                    <div 
                      className={`h-4 rounded-full ${calculations.hasSavings ? 'bg-red-500' : 'bg-muted-foreground/50'}`}
                      style={{ width: calculations.hasSavings ? '100%' : `${Math.min((calculations.totalCompetitor / calculations.totalKvp) * 100, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">QuickApp Cost</span>
                    <span className={`font-medium ${calculations.hasSavings ? 'text-green-500' : 'text-muted-foreground'}`}>
                      {formatCurrency(calculations.totalKvp)}/mo
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-4">
                    <div 
                      className={`h-4 rounded-full transition-all duration-500 ${calculations.hasSavings ? 'bg-green-500' : 'bg-primary'}`}
                      style={{ width: calculations.hasSavings 
                        ? `${Math.min((calculations.totalKvp / calculations.totalCompetitor) * 100, 100)}%`
                        : '100%' 
                      }}
                    />
                  </div>
                </div>
              </Card>

              {/* Cost Breakdown */}
              <Card className="p-6">
                <h2 className="text-lg font-semibold mb-4">Cost Breakdown</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Component</th>
                        <th className="text-right py-2">Competitor</th>
                        <th className="text-right py-2">QuickApp</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b">
                        <td className="py-2">Base/License Fee</td>
                        <td className="text-right text-red-500">{formatCurrency(calculations.totalCompetitor)}</td>
                        <td className="text-right text-green-500">{formatCurrency(calculations.kvpBase)}</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2">Order Charges ({calculations.monthlyOrders.toLocaleString()} orders)</td>
                        <td className="text-right">₹0</td>
                        <td className="text-right">{formatCurrency(calculations.orderCharges)}</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2">Retailer Charges ({calculations.monthlyRetailers.toLocaleString()} retailers)</td>
                        <td className="text-right">₹0</td>
                        <td className="text-right">{formatCurrency(calculations.retailerCharges)}</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2">Visit Charges ({calculations.monthlyVisits.toLocaleString()} visits)</td>
                        <td className="text-right">₹0</td>
                        <td className="text-right">{formatCurrency(calculations.visitCharges)}</td>
                      </tr>
                      <tr className="font-semibold">
                        <td className="py-2">Total Monthly</td>
                        <td className="text-right text-red-500">{formatCurrency(calculations.totalCompetitor)}</td>
                        <td className="text-right text-green-500">{formatCurrency(calculations.totalKvp)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* Productivity Gains */}
              <Card className="p-6">
                <h2 className="text-lg font-semibold mb-4">Productivity Impact</h2>
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
                    <Clock className="w-8 h-8 text-primary" />
                    <div>
                      <p className="text-xl font-bold">{calculations.timeSavedHours.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">Hours Saved/Month</p>
                      <p className="text-xs text-primary mt-1">Worth {formatCurrency(calculations.valueOfTime)}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
                    <Users className="w-8 h-8 text-primary" />
                    <div>
                      <p className="text-xl font-bold">+{Math.round(calculations.additionalActiveUsers)}</p>
                      <p className="text-xs text-muted-foreground">More Active Reps</p>
                      <p className="text-xs text-primary mt-1">30% adoption boost</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
                    <TrendingUp className="w-8 h-8 text-primary" />
                    <div>
                      <p className="text-xl font-bold">{formatCurrency(calculations.totalProductivityGain)}</p>
                      <p className="text-xs text-muted-foreground">Productivity Value/Month</p>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Feature Comparison */}
              <Card className="p-6">
                <h2 className="text-lg font-semibold mb-4">What You Get with QuickApp</h2>
                <div className="grid grid-cols-2 gap-2">
                  {featureComparison.map((item) => (
                    <div key={item.feature} className="flex items-center justify-between py-2 px-3 bg-muted/30 rounded">
                      <span className="text-sm">{item.feature}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-xs text-muted-foreground">Others:</span>
                        {item.competitor === true ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : item.competitor === "Limited" ? (
                          <span className="text-xs text-yellow-500">Limited</span>
                        ) : (
                          <X className="w-4 h-4 text-red-500" />
                        )}
                        <span className="text-xs text-muted-foreground">QuickApp:</span>
                        <Check className="w-4 h-4 text-green-500" />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* CTA */}
              <Card className="p-6 bg-primary/5 border-primary/20">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  <div>
                    <h3 className="font-semibold mb-1">Ready to Start Saving?</h3>
                    <p className="text-sm text-muted-foreground">
                      Get a personalized demo and see QuickApp in action
                    </p>
                  </div>
                  <Button size="lg" onClick={() => navigate("/demo")} className="gap-2">
                    Request Demo <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <WebsiteFooter />
    </div>
  );
};

export default ROICalculator;

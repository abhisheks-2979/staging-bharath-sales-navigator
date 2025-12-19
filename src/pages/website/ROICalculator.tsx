import { useState } from "react";
import { 
  ArrowRight, ArrowLeft, Calculator, Users, Target, Clock, 
  TrendingUp, AlertTriangle, CheckCircle2, Sparkles, Calendar,
  BarChart3, Smartphone, Award, Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";
import { WebsiteHeader, WebsiteFooter } from "@/components/website";

type StepId = "team" | "process" | "challenges" | "metrics" | "goals" | "results";

interface Answer {
  teamSize: number;
  currentProcess: string;
  challenges: string[];
  visitTracking: string;
  orderAccuracy: string;
  dataDelay: string;
  topPriority: string;
}

const initialAnswers: Answer = {
  teamSize: 50,
  currentProcess: "",
  challenges: [],
  visitTracking: "",
  orderAccuracy: "",
  dataDelay: "",
  topPriority: "",
};

const processOptions = [
  { value: "manual", label: "Manual / Paper-based", description: "Excel sheets, paper forms, WhatsApp groups", impact: 40 },
  { value: "basic-app", label: "Basic Mobile App", description: "Simple order booking app with limited features", impact: 25 },
  { value: "legacy-sfa", label: "Legacy SFA Tool", description: "Traditional SFA with per-user pricing", impact: 15 },
  { value: "none", label: "No Formal Process", description: "Reps work independently without tracking", impact: 50 },
];

const challengeOptions = [
  { value: "visibility", label: "Limited Field Visibility", description: "Don't know what reps are doing in real-time", icon: Target },
  { value: "productivity", label: "Low Rep Productivity", description: "Reps spend too much time on admin work", icon: Clock },
  { value: "accuracy", label: "Data Accuracy Issues", description: "Orders, stock data is often incorrect", icon: AlertTriangle },
  { value: "adoption", label: "Poor Tool Adoption", description: "Team doesn't use existing tools consistently", icon: Smartphone },
  { value: "insights", label: "Lack of Insights", description: "No actionable data for decision making", icon: BarChart3 },
  { value: "collections", label: "Collection Delays", description: "Payments are often delayed or missed", icon: Calendar },
];

const visitTrackingOptions = [
  { value: "none", label: "No tracking", score: 0 },
  { value: "end-of-day", label: "End of day reports", score: 30 },
  { value: "manual-checkin", label: "Manual check-in via app", score: 50 },
  { value: "gps-verified", label: "GPS verified visits", score: 80 },
];

const orderAccuracyOptions = [
  { value: "below-70", label: "Below 70%", score: 0 },
  { value: "70-80", label: "70-80%", score: 30 },
  { value: "80-90", label: "80-90%", score: 60 },
  { value: "above-90", label: "Above 90%", score: 90 },
];

const dataDelayOptions = [
  { value: "3-days", label: "3+ days", score: 0 },
  { value: "1-2-days", label: "1-2 days", score: 30 },
  { value: "same-day", label: "Same day", score: 60 },
  { value: "real-time", label: "Real-time", score: 100 },
];

const priorityOptions = [
  { value: "productivity", label: "Increase Rep Productivity", description: "Get more done with the same team" },
  { value: "visibility", label: "Improve Field Visibility", description: "Know what's happening in real-time" },
  { value: "growth", label: "Drive Sales Growth", description: "Increase orders and revenue" },
  { value: "efficiency", label: "Reduce Operational Costs", description: "Cut manual work and errors" },
];

export const ROICalculator = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<StepId>("team");
  const [answers, setAnswers] = useState<Answer>(initialAnswers);

  const steps: { id: StepId; label: string }[] = [
    { id: "team", label: "Your Team" },
    { id: "process", label: "Current Process" },
    { id: "challenges", label: "Challenges" },
    { id: "metrics", label: "Current Metrics" },
    { id: "goals", label: "Your Goals" },
    { id: "results", label: "Your ROI" },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const canProceed = () => {
    switch (currentStep) {
      case "team": return answers.teamSize >= 5;
      case "process": return answers.currentProcess !== "";
      case "challenges": return answers.challenges.length > 0;
      case "metrics": return answers.visitTracking && answers.orderAccuracy && answers.dataDelay;
      case "goals": return answers.topPriority !== "";
      default: return true;
    }
  };

  const nextStep = () => {
    const idx = steps.findIndex(s => s.id === currentStep);
    if (idx < steps.length - 1) setCurrentStep(steps[idx + 1].id);
  };

  const prevStep = () => {
    const idx = steps.findIndex(s => s.id === currentStep);
    if (idx > 0) setCurrentStep(steps[idx - 1].id);
  };

  const toggleChallenge = (value: string) => {
    setAnswers(prev => ({
      ...prev,
      challenges: prev.challenges.includes(value)
        ? prev.challenges.filter(c => c !== value)
        : [...prev.challenges, value]
    }));
  };

  // Calculate ROI Score
  const calculateROI = () => {
    let score = 0;
    let opportunities: { title: string; value: string; description: string }[] = [];
    
    // Process impact (higher score = more improvement potential)
    const processImpact = processOptions.find(p => p.value === answers.currentProcess)?.impact || 0;
    score += processImpact;

    // Current metrics gaps
    const visitScore = visitTrackingOptions.find(v => v.value === answers.visitTracking)?.score || 0;
    const accuracyScore = orderAccuracyOptions.find(o => o.value === answers.orderAccuracy)?.score || 0;
    const delayScore = dataDelayOptions.find(d => d.value === answers.dataDelay)?.score || 0;
    
    const metricsGap = 100 - ((visitScore + accuracyScore + delayScore) / 3);
    score += metricsGap * 0.4;

    // Number of challenges
    score += answers.challenges.length * 5;

    // Team size factor
    const teamFactor = Math.min(answers.teamSize / 100, 1.5);
    score = score * teamFactor;

    // Calculate specific opportunities
    const monthlyHours = answers.teamSize * 2 * 24; // 2 hours saved per rep per day
    const hourlyValue = 250; // INR per hour
    const timeSavings = monthlyHours * hourlyValue;

    if (answers.challenges.includes("productivity") || answers.currentProcess === "manual") {
      opportunities.push({
        title: "Time Savings",
        value: `₹${(timeSavings / 100000).toFixed(1)}L/month`,
        description: `${monthlyHours.toLocaleString()} hours saved through automation`
      });
    }

    if (answers.challenges.includes("accuracy") || accuracyScore < 70) {
      const errorReduction = answers.teamSize * 200 * 0.1 * 50; // 10% error reduction, ₹50/error cost
      opportunities.push({
        title: "Error Reduction",
        value: `₹${(errorReduction / 100000).toFixed(1)}L/month`,
        description: "Reduced order errors and returns"
      });
    }

    if (answers.challenges.includes("adoption")) {
      opportunities.push({
        title: "Adoption Boost",
        value: "+30%",
        description: "Higher tool adoption through gamification"
      });
    }

    if (answers.challenges.includes("visibility") || visitScore < 60) {
      opportunities.push({
        title: "Real-time Visibility",
        value: "100%",
        description: "Complete visibility into field activities"
      });
    }

    if (answers.challenges.includes("collections")) {
      const collectionImprovement = answers.teamSize * 5000 * 0.15; // 15% improvement
      opportunities.push({
        title: "Faster Collections",
        value: `₹${(collectionImprovement / 100000).toFixed(1)}L/month`,
        description: "Improved payment tracking and follow-ups"
      });
    }

    // Normalize score to 0-100
    score = Math.min(Math.round(score), 100);

    return { score, opportunities, timeSavings };
  };

  const getScoreLevel = (score: number) => {
    if (score >= 75) return { label: "High Impact Opportunity", color: "text-green-500", bg: "bg-green-500", recommendation: "immediate" };
    if (score >= 50) return { label: "Significant Value Potential", color: "text-emerald-500", bg: "bg-emerald-500", recommendation: "pilot" };
    if (score >= 25) return { label: "Good Fit", color: "text-yellow-500", bg: "bg-yellow-500", recommendation: "explore" };
    return { label: "Moderate Opportunity", color: "text-orange-500", bg: "bg-orange-500", recommendation: "assess" };
  };

  const { score, opportunities, timeSavings } = calculateROI();
  const scoreLevel = getScoreLevel(score);

  const renderStep = () => {
    switch (currentStep) {
      case "team":
        return (
          <div className="space-y-8">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Let&apos;s understand your team</h2>
              <p className="text-muted-foreground">How large is your field sales team?</p>
            </div>
            <div className="max-w-md mx-auto space-y-6">
              <div className="text-center">
                <span className="text-5xl font-bold text-primary">{answers.teamSize}</span>
                <span className="text-xl text-muted-foreground ml-2">field reps</span>
              </div>
              <Slider
                value={[answers.teamSize]}
                onValueChange={(v) => setAnswers(prev => ({ ...prev, teamSize: v[0] }))}
                min={5}
                max={500}
                step={5}
                className="w-full"
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>5 reps</span>
                <span>500+ reps</span>
              </div>
              <p className="text-sm text-center text-muted-foreground">
                Include all field sales executives, area managers, and territory managers
              </p>
            </div>
          </div>
        );

      case "process":
        return (
          <div className="space-y-8">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Smartphone className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-2">How do you manage field sales today?</h2>
              <p className="text-muted-foreground">Select the option that best describes your current process</p>
            </div>
            <RadioGroup
              value={answers.currentProcess}
              onValueChange={(v) => setAnswers(prev => ({ ...prev, currentProcess: v }))}
              className="grid gap-4 max-w-2xl mx-auto"
            >
              {processOptions.map((option) => (
                <Label
                  key={option.value}
                  className={`flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-all ${
                    answers.currentProcess === option.value 
                      ? "border-primary bg-primary/5" 
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <RadioGroupItem value={option.value} className="mt-1" />
                  <div>
                    <p className="font-medium">{option.label}</p>
                    <p className="text-sm text-muted-foreground">{option.description}</p>
                  </div>
                </Label>
              ))}
            </RadioGroup>
          </div>
        );

      case "challenges":
        return (
          <div className="space-y-8">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-2">What challenges are you facing?</h2>
              <p className="text-muted-foreground">Select all that apply to your organization</p>
            </div>
            <div className="grid sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
              {challengeOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = answers.challenges.includes(option.value);
                return (
                  <button
                    key={option.value}
                    onClick={() => toggleChallenge(option.value)}
                    className={`flex items-start gap-4 p-4 rounded-lg border text-left transition-all ${
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-medium">{option.label}</p>
                      <p className="text-sm text-muted-foreground">{option.description}</p>
                    </div>
                    {isSelected && (
                      <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 ml-auto" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );

      case "metrics":
        return (
          <div className="space-y-8">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-2">How do your current metrics look?</h2>
              <p className="text-muted-foreground">Help us understand your current performance</p>
            </div>
            <div className="space-y-8 max-w-2xl mx-auto">
              <div className="space-y-4">
                <Label className="text-base font-medium">How do you track field visits?</Label>
                <RadioGroup
                  value={answers.visitTracking}
                  onValueChange={(v) => setAnswers(prev => ({ ...prev, visitTracking: v }))}
                  className="grid grid-cols-2 gap-3"
                >
                  {visitTrackingOptions.map((option) => (
                    <Label
                      key={option.value}
                      className={`p-3 rounded-lg border cursor-pointer text-center transition-all ${
                        answers.visitTracking === option.value
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <RadioGroupItem value={option.value} className="sr-only" />
                      <span className="text-sm">{option.label}</span>
                    </Label>
                  ))}
                </RadioGroup>
              </div>

              <div className="space-y-4">
                <Label className="text-base font-medium">What&apos;s your current order accuracy rate?</Label>
                <RadioGroup
                  value={answers.orderAccuracy}
                  onValueChange={(v) => setAnswers(prev => ({ ...prev, orderAccuracy: v }))}
                  className="grid grid-cols-2 gap-3"
                >
                  {orderAccuracyOptions.map((option) => (
                    <Label
                      key={option.value}
                      className={`p-3 rounded-lg border cursor-pointer text-center transition-all ${
                        answers.orderAccuracy === option.value
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <RadioGroupItem value={option.value} className="sr-only" />
                      <span className="text-sm">{option.label}</span>
                    </Label>
                  ))}
                </RadioGroup>
              </div>

              <div className="space-y-4">
                <Label className="text-base font-medium">How quickly do you get field data?</Label>
                <RadioGroup
                  value={answers.dataDelay}
                  onValueChange={(v) => setAnswers(prev => ({ ...prev, dataDelay: v }))}
                  className="grid grid-cols-2 gap-3"
                >
                  {dataDelayOptions.map((option) => (
                    <Label
                      key={option.value}
                      className={`p-3 rounded-lg border cursor-pointer text-center transition-all ${
                        answers.dataDelay === option.value
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <RadioGroupItem value={option.value} className="sr-only" />
                      <span className="text-sm">{option.label}</span>
                    </Label>
                  ))}
                </RadioGroup>
              </div>
            </div>
          </div>
        );

      case "goals":
        return (
          <div className="space-y-8">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Target className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-2">What&apos;s your top priority?</h2>
              <p className="text-muted-foreground">What would make the biggest impact for your business?</p>
            </div>
            <RadioGroup
              value={answers.topPriority}
              onValueChange={(v) => setAnswers(prev => ({ ...prev, topPriority: v }))}
              className="grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto"
            >
              {priorityOptions.map((option) => (
                <Label
                  key={option.value}
                  className={`flex flex-col p-5 rounded-lg border cursor-pointer transition-all ${
                    answers.topPriority === option.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <RadioGroupItem value={option.value} className="sr-only" />
                  <p className="font-semibold mb-1">{option.label}</p>
                  <p className="text-sm text-muted-foreground">{option.description}</p>
                </Label>
              ))}
            </RadioGroup>
          </div>
        );

      case "results":
        return (
          <div className="space-y-8">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Your ROI Assessment</h2>
              <p className="text-muted-foreground">Based on your responses, here&apos;s what QuickApp can do for you</p>
            </div>

            {/* Score Card */}
            <Card className="p-6 max-w-2xl mx-auto bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">ROI Potential Score</h3>
                <span className={`text-sm font-medium px-3 py-1 rounded-full ${scoreLevel.bg}/20 ${scoreLevel.color}`}>
                  {scoreLevel.label}
                </span>
              </div>
              <div className="flex items-end gap-4 mb-4">
                <span className="text-6xl font-bold text-primary">{score}</span>
                <span className="text-2xl text-muted-foreground mb-2">/100</span>
              </div>
              <Progress value={score} className="h-3 mb-4" />
              <p className="text-sm text-muted-foreground">
                {score >= 75 && "Your organization has significant room for improvement. QuickApp can deliver substantial ROI."}
                {score >= 50 && score < 75 && "There's strong potential for QuickApp to improve your field sales operations."}
                {score >= 25 && score < 50 && "QuickApp can help optimize your existing processes and drive incremental gains."}
                {score < 25 && "You have a solid foundation. QuickApp can help you reach the next level of efficiency."}
              </p>
            </Card>

            {/* Opportunities */}
            <div className="max-w-2xl mx-auto">
              <h3 className="text-lg font-semibold mb-4">Key Opportunities Identified</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                {opportunities.map((opp, idx) => (
                  <Card key={idx} className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
                        <TrendingUp className="w-5 h-5 text-green-500" />
                      </div>
                      <div>
                        <p className="font-medium">{opp.title}</p>
                        <p className="text-xl font-bold text-primary">{opp.value}</p>
                        <p className="text-xs text-muted-foreground">{opp.description}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Recommendation */}
            <Card className="p-6 max-w-2xl mx-auto border-primary/20">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Award className="w-5 h-5 text-primary" />
                Our Recommendation
              </h3>
              {scoreLevel.recommendation === "immediate" && (
                <div className="space-y-4">
                  <p className="text-muted-foreground">
                    With a team of <strong>{answers.teamSize} reps</strong> and your current challenges, 
                    QuickApp can deliver <strong>immediate, measurable impact</strong>. We recommend starting 
                    with a full deployment.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button size="lg" onClick={() => navigate("/demo")} className="gap-2">
                      Schedule a Demo <ArrowRight className="w-4 h-4" />
                    </Button>
                    <Button size="lg" variant="outline" onClick={() => navigate("/pricing")}>
                      View Pricing
                    </Button>
                  </div>
                </div>
              )}
              {scoreLevel.recommendation === "pilot" && (
                <div className="space-y-4">
                  <p className="text-muted-foreground">
                    We recommend starting with a <strong>pilot program</strong> with a subset of your team 
                    to demonstrate value quickly. This typically takes 2-4 weeks and delivers measurable results.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button size="lg" onClick={() => navigate("/demo")} className="gap-2">
                      Start Pilot Program <ArrowRight className="w-4 h-4" />
                    </Button>
                    <Button size="lg" variant="outline" onClick={() => navigate("/features")}>
                      Explore Features
                    </Button>
                  </div>
                </div>
              )}
              {scoreLevel.recommendation === "explore" && (
                <div className="space-y-4">
                  <p className="text-muted-foreground">
                    QuickApp can help you <strong>build on your existing foundation</strong>. 
                    We recommend a discovery call to understand your specific needs and create a tailored solution.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button size="lg" onClick={() => navigate("/demo")} className="gap-2">
                      Book Discovery Call <ArrowRight className="w-4 h-4" />
                    </Button>
                    <Button size="lg" variant="outline" onClick={() => navigate("/solutions/field-sales")}>
                      Learn More
                    </Button>
                  </div>
                </div>
              )}
              {scoreLevel.recommendation === "assess" && (
                <div className="space-y-4">
                  <p className="text-muted-foreground">
                    You already have good processes in place. QuickApp can help you <strong>unlock the next level 
                    of performance</strong> with advanced features like AI insights and gamification.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button size="lg" onClick={() => navigate("/demo")} className="gap-2">
                      Explore Advanced Features <ArrowRight className="w-4 h-4" />
                    </Button>
                    <Button size="lg" variant="outline" onClick={() => navigate("/features")}>
                      See All Features
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <WebsiteHeader />
      
      {/* Hero */}
      <section className="pt-28 pb-8 px-4">
        <div className="container mx-auto text-center max-w-3xl">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Calculator className="w-4 h-4" />
            ROI Assessment Tool
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            Discover Your <span className="text-primary">ROI Potential</span>
          </h1>
          <p className="text-muted-foreground">
            Answer a few questions to understand how QuickApp can transform your field sales operations
          </p>
        </div>
      </section>

      {/* Progress */}
      <section className="px-4 pb-8">
        <div className="container mx-auto max-w-3xl">
          <div className="flex items-center justify-between mb-2 text-sm">
            <span className="text-muted-foreground">Step {currentStepIndex + 1} of {steps.length}</span>
            <span className="font-medium">{steps[currentStepIndex].label}</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </section>

      {/* Step Content */}
      <section className="py-8 px-4">
        <div className="container mx-auto max-w-4xl">
          <Card className="p-6 md:p-10">
            {renderStep()}
          </Card>
        </div>
      </section>

      {/* Navigation */}
      <section className="py-8 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentStepIndex === 0}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
            {currentStep !== "results" ? (
              <Button
                onClick={nextStep}
                disabled={!canProceed()}
                className="gap-2"
              >
                Continue <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={() => setCurrentStep("team")}
                variant="outline"
                className="gap-2"
              >
                <Zap className="w-4 h-4" /> Start Over
              </Button>
            )}
          </div>
        </div>
      </section>

      <WebsiteFooter />
    </div>
  );
};

export default ROICalculator;

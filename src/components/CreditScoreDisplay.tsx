import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Info, TrendingUp, Clock, ShoppingCart, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CreditScoreDisplayProps {
  retailerId: string;
  variant?: "compact" | "full";
  showCreditLimit?: boolean;
}

export const CreditScoreDisplay = ({ 
  retailerId, 
  variant = "compact",
  showCreditLimit = false 
}: CreditScoreDisplayProps) => {
  const { data: config } = useQuery({
    queryKey: ['credit-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('credit_management_config')
        .select('*')
        .single();
      if (error) throw error;
      return data;
    }
  });

  const { data: creditScore, isLoading } = useQuery({
    queryKey: ['credit-score', retailerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('retailer_credit_scores')
        .select('*')
        .eq('retailer_id', retailerId)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!config?.is_enabled
  });

  const { data: retailer } = useQuery({
    queryKey: ['retailer-manual-score', retailerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('retailers')
        .select('manual_credit_score')
        .eq('id', retailerId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: config?.is_enabled && config?.scoring_mode === 'manual'
  });

  if (!config?.is_enabled || isLoading) {
    return null;
  }

  const score = config.scoring_mode === 'manual' 
    ? retailer?.manual_credit_score 
    : creditScore?.score;

  if (!score) {
    return null;
  }

  const getScoreColor = (score: number) => {
    if (score >= 8) return "text-green-600 bg-green-50 border-green-200";
    if (score >= 6) return "text-yellow-600 bg-yellow-50 border-yellow-200";
    return "text-red-600 bg-red-50 border-red-200";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 8) return "Excellent";
    if (score >= 6) return "Good";
    if (score >= 4) return "Fair";
    return "Poor";
  };

  if (variant === "compact") {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="h-auto p-0">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={getScoreColor(score)}>
                <CreditCard className="mr-1 h-3 w-3" />
                {score.toFixed(1)}/10
              </Badge>
              <Info className="h-3 w-3 text-muted-foreground" />
            </div>
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Credit Score Details</DialogTitle>
          </DialogHeader>
          <CreditScoreBreakdown 
            score={score} 
            creditScore={creditScore}
            config={config}
            showCreditLimit={showCreditLimit}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Credit Score</CardTitle>
            <CardDescription>
              {config.scoring_mode === 'manual' ? 'Manual Entry' : 'AI-Driven Calculation'}
            </CardDescription>
          </div>
          <div className="text-right">
            <div className={`text-3xl font-bold ${getScoreColor(score)}`}>
              {score.toFixed(1)}/10
            </div>
            <div className="text-sm text-muted-foreground">
              {getScoreLabel(score)}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <CreditScoreBreakdown 
          score={score} 
          creditScore={creditScore}
          config={config}
          showCreditLimit={showCreditLimit}
        />
      </CardContent>
    </Card>
  );
};

const CreditScoreBreakdown = ({ score, creditScore, config, showCreditLimit }: any) => {
  if (config.scoring_mode === 'manual') {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          This credit score has been manually entered by an administrator.
        </p>
        {showCreditLimit && creditScore?.credit_limit && (
          <div className="p-4 bg-primary/5 rounded-lg">
            <div className="text-sm text-muted-foreground">Credit Limit</div>
            <div className="text-2xl font-bold text-primary">
              ₹{creditScore.credit_limit.toLocaleString()}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (!creditScore) {
    return (
      <p className="text-sm text-muted-foreground">
        No AI-driven score calculated yet. Score will be generated based on historical data.
      </p>
    );
  }

  const isNewRetailer = !creditScore.growth_rate_score && !creditScore.repayment_dso_score;

  if (isNewRetailer) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          This is a new retailer with insufficient historical data. 
          The score shown is the default starting score configured by the admin.
        </p>
        {showCreditLimit && (
          <div className="p-4 bg-primary/5 rounded-lg">
            <div className="text-sm text-muted-foreground">Credit Limit</div>
            <div className="text-2xl font-bold text-primary">
              ₹{creditScore.credit_limit?.toLocaleString() || '0'}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Will be calculated after sufficient order history
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {/* Growth Rate */}
        <div className="flex items-start gap-3">
          <TrendingUp className="h-5 w-5 text-primary mt-0.5" />
          <div className="flex-1">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Average Growth Rate</span>
              <span className="text-sm font-bold">
                {creditScore.growth_rate_score?.toFixed(1) || 0}/{config.weight_growth_rate?.toFixed(1)}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              {creditScore.avg_growth_rate?.toFixed(1)}% avg. monthly growth
            </div>
            <div className="mt-1 bg-secondary rounded-full h-2">
              <div 
                className="bg-primary rounded-full h-2 transition-all"
                style={{ width: `${(creditScore.growth_rate_score / config.weight_growth_rate) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Repayment DSO */}
        <div className="flex items-start gap-3">
          <Clock className="h-5 w-5 text-primary mt-0.5" />
          <div className="flex-1">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Repayment DSO</span>
              <span className="text-sm font-bold">
                {creditScore.repayment_dso_score?.toFixed(1) || 0}/{config.weight_repayment_dso?.toFixed(1)}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              Avg. {creditScore.avg_dso?.toFixed(0)} days (Target: {config.payment_term_days} days)
            </div>
            <div className="mt-1 bg-secondary rounded-full h-2">
              <div 
                className="bg-primary rounded-full h-2 transition-all"
                style={{ width: `${(creditScore.repayment_dso_score / config.weight_repayment_dso) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Order Frequency */}
        <div className="flex items-start gap-3">
          <ShoppingCart className="h-5 w-5 text-primary mt-0.5" />
          <div className="flex-1">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Order Frequency</span>
              <span className="text-sm font-bold">
                {creditScore.order_frequency_score?.toFixed(1) || 0}/{config.weight_order_frequency?.toFixed(1)}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              Avg. {creditScore.avg_order_frequency?.toFixed(1)} orders per visit
            </div>
            <div className="mt-1 bg-secondary rounded-full h-2">
              <div 
                className="bg-primary rounded-full h-2 transition-all"
                style={{ width: `${(creditScore.order_frequency_score / config.weight_order_frequency) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {showCreditLimit && (
        <div className="p-4 bg-primary/5 rounded-lg">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-sm text-muted-foreground">Credit Limit</div>
              <div className="text-2xl font-bold text-primary">
                ₹{creditScore.credit_limit?.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Based on last month's revenue: ₹{creditScore.last_month_revenue?.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="text-xs text-muted-foreground">
        Last calculated: {new Date(creditScore.calculated_at).toLocaleString()}
      </div>
    </div>
  );
};
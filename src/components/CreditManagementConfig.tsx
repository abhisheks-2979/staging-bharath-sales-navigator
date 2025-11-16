import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Save, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CreditConfig {
  id: string;
  is_enabled: boolean;
  scoring_mode: 'manual' | 'ai_driven';
  lookback_period_months: number;
  new_retailer_starting_score: number;
  payment_term_days: number;
  credit_multiplier: number;
  weight_growth_rate: number;
  weight_repayment_dso: number;
  weight_order_frequency: number;
}

export const CreditManagementConfig = () => {
  const queryClient = useQueryClient();
  const [config, setConfig] = useState<Partial<CreditConfig>>({});

  const { data: currentConfig, isLoading } = useQuery({
    queryKey: ['credit-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('credit_management_config')
        .select('*')
        .single();
      
      if (error) throw error;
      const typedData = data as CreditConfig;
      setConfig(typedData);
      return typedData;
    }
  });

  const updateConfigMutation = useMutation({
    mutationFn: async (updatedConfig: Partial<CreditConfig>) => {
      if (!currentConfig?.id) throw new Error("No configuration found");
      
      const { data, error } = await supabase
        .from('credit_management_config')
        .update(updatedConfig)
        .eq('id', currentConfig.id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit-config'] });
      toast.success("Credit management configuration updated successfully");
    },
    onError: (error: any) => {
      toast.error(`Failed to update configuration: ${error.message}`);
    }
  });

  const handleSave = () => {
    const totalWeight = (config.weight_growth_rate || 0) + 
                       (config.weight_repayment_dso || 0) + 
                       (config.weight_order_frequency || 0);
    
    if (totalWeight !== 10) {
      toast.error("Total weight must equal 10 points");
      return;
    }

    updateConfigMutation.mutate(config);
  };

  const totalWeight = (config.weight_growth_rate || 0) + 
                      (config.weight_repayment_dso || 0) + 
                      (config.weight_order_frequency || 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Credit Management System</CardTitle>
          <CardDescription>
            Configure retailer credit scoring and limit calculation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable Feature */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="is_enabled">Enable Credit Management</Label>
              <p className="text-sm text-muted-foreground">
                Activate credit scoring and limit tracking for retailers
              </p>
            </div>
            <Switch
              id="is_enabled"
              checked={config.is_enabled || false}
              onCheckedChange={(checked) => setConfig({ ...config, is_enabled: checked })}
            />
          </div>

          {config.is_enabled && (
            <>
              {/* Scoring Mode */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="scoring_mode">Scoring Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Choose between manual entry or AI-driven calculation
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm">Manual</span>
                  <Switch
                    id="scoring_mode"
                    checked={config.scoring_mode === 'ai_driven'}
                    onCheckedChange={(checked) => 
                      setConfig({ ...config, scoring_mode: checked ? 'ai_driven' : 'manual' })
                    }
                  />
                  <span className="text-sm font-medium">AI-Driven</span>
                </div>
              </div>

              {/* AI-Driven Configuration */}
              {config.scoring_mode === 'ai_driven' && (
                <>
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      AI-Driven mode automatically calculates credit scores based on historical data and configured parameters.
                    </AlertDescription>
                  </Alert>

                  {/* Basic Parameters */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="lookback_period">Lookback Period (X) - Months</Label>
                      <Input
                        id="lookback_period"
                        type="number"
                        min="1"
                        max="12"
                        value={config.lookback_period_months || 3}
                        onChange={(e) => setConfig({ ...config, lookback_period_months: parseInt(e.target.value) })}
                      />
                      <p className="text-xs text-muted-foreground">
                        Historical data period for calculations
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="new_retailer_score">New Retailer Starting Score (XX)</Label>
                      <Input
                        id="new_retailer_score"
                        type="number"
                        min="0"
                        max="10"
                        step="0.1"
                        value={config.new_retailer_starting_score || 6.0}
                        onChange={(e) => setConfig({ ...config, new_retailer_starting_score: parseFloat(e.target.value) })}
                      />
                      <p className="text-xs text-muted-foreground">
                        Default score for retailers with insufficient data
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="payment_term">Payment Term (Y) - Days</Label>
                      <Input
                        id="payment_term"
                        type="number"
                        min="0"
                        value={config.payment_term_days || 30}
                        onChange={(e) => setConfig({ ...config, payment_term_days: parseInt(e.target.value) })}
                      />
                      <p className="text-xs text-muted-foreground">
                        Standard payment term for invoices
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="credit_multiplier">Credit Multiplier (Z)</Label>
                      <Input
                        id="credit_multiplier"
                        type="number"
                        min="0"
                        step="0.1"
                        value={config.credit_multiplier || 1.5}
                        onChange={(e) => setConfig({ ...config, credit_multiplier: parseFloat(e.target.value) })}
                      />
                      <p className="text-xs text-muted-foreground">
                        Credit Limit = Z × Last Month's Revenue
                      </p>
                    </div>
                  </div>

                  {/* Weight Configuration */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Score Parameter Weights (Total must be 10)</Label>
                      <span className={`text-sm font-medium ${totalWeight === 10 ? 'text-green-600' : 'text-red-600'}`}>
                        Total: {totalWeight.toFixed(1)} / 10
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="weight_growth">Average Growth Rate (Max Points)</Label>
                        <Input
                          id="weight_growth"
                          type="number"
                          min="0"
                          max="10"
                          step="0.1"
                          value={config.weight_growth_rate || 4.0}
                          onChange={(e) => setConfig({ ...config, weight_growth_rate: parseFloat(e.target.value) })}
                        />
                        <p className="text-xs text-muted-foreground">
                          Points awarded based on monthly revenue growth rate
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="weight_dso">Repayment DSO (Max Points)</Label>
                        <Input
                          id="weight_dso"
                          type="number"
                          min="0"
                          max="10"
                          step="0.1"
                          value={config.weight_repayment_dso || 4.0}
                          onChange={(e) => setConfig({ ...config, weight_repayment_dso: parseFloat(e.target.value) })}
                        />
                        <p className="text-xs text-muted-foreground">
                          Points awarded based on Days Sales Outstanding (lower is better)
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="weight_frequency">Order Frequency (Max Points)</Label>
                        <Input
                          id="weight_frequency"
                          type="number"
                          min="0"
                          max="10"
                          step="0.1"
                          value={config.weight_order_frequency || 2.0}
                          onChange={(e) => setConfig({ ...config, weight_order_frequency: parseFloat(e.target.value) })}
                        />
                        <p className="text-xs text-muted-foreground">
                          Points awarded based on productive visits (orders per visit)
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {config.scoring_mode === 'manual' && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Manual mode allows you to enter credit scores directly in each retailer's profile.
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}

          <div className="flex justify-end">
            <Button 
              onClick={handleSave}
              disabled={updateConfigMutation.isPending || (config.scoring_mode === 'ai_driven' && totalWeight !== 10)}
            >
              {updateConfigMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              Save Configuration
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  ArrowLeft, 
  Target,
  Calendar,
  TrendingUp,
  Save,
  Plus
} from 'lucide-react';
import { toast } from 'sonner';

interface FYPlan {
  id: string;
  year: number;
  revenue_target: number | null;
  territory_target: string | null;
  coverage_target: string | null;
  notes: string | null;
}

const DistributorFYPlanPage = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<FYPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [distributorId, setDistributorId] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [currentPlan, setCurrentPlan] = useState<FYPlan | null>(null);
  const [formData, setFormData] = useState({
    revenue_target: '',
    territory_target: '',
    coverage_target: '',
    notes: ''
  });

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() + i);

  useEffect(() => {
    const storedUser = localStorage.getItem('distributor_user');
    if (!storedUser) {
      navigate('/distributor-portal/login');
      return;
    }
    const user = JSON.parse(storedUser);
    setDistributorId(user.distributor_id);
    loadPlans(user.distributor_id);
  }, [navigate]);

  const loadPlans = async (distId: string) => {
    try {
      const { data, error } = await supabase
        .from('distributor_business_plans')
        .select('*')
        .eq('distributor_id', distId)
        .order('year', { ascending: false });

      if (error) throw error;
      setPlans(data || []);

      // Load plan for selected year
      const currentYearPlan = data?.find(p => p.year === selectedYear);
      if (currentYearPlan) {
        setCurrentPlan(currentYearPlan);
        setFormData({
          revenue_target: currentYearPlan.revenue_target?.toString() || '',
          territory_target: currentYearPlan.territory_target || '',
          coverage_target: currentYearPlan.coverage_target || '',
          notes: currentYearPlan.notes || ''
        });
      } else {
        setCurrentPlan(null);
        setFormData({
          revenue_target: '',
          territory_target: '',
          coverage_target: '',
          notes: ''
        });
      }
    } catch (error: any) {
      toast.error('Failed to load plans: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (distributorId) {
      const plan = plans.find(p => p.year === selectedYear);
      if (plan) {
        setCurrentPlan(plan);
        setFormData({
          revenue_target: plan.revenue_target?.toString() || '',
          territory_target: plan.territory_target || '',
          coverage_target: plan.coverage_target || '',
          notes: plan.notes || ''
        });
      } else {
        setCurrentPlan(null);
        setFormData({
          revenue_target: '',
          territory_target: '',
          coverage_target: '',
          notes: ''
        });
      }
    }
  }, [selectedYear, plans, distributorId]);

  const handleSave = async () => {
    if (!distributorId) return;
    setSaving(true);

    try {
      const payload = {
        distributor_id: distributorId,
        year: selectedYear,
        revenue_target: formData.revenue_target ? parseFloat(formData.revenue_target) : null,
        territory_target: formData.territory_target || null,
        coverage_target: formData.coverage_target || null,
        notes: formData.notes || null,
        updated_at: new Date().toISOString()
      };

      if (currentPlan) {
        const { error } = await supabase
          .from('distributor_business_plans')
          .update(payload)
          .eq('id', currentPlan.id);
        if (error) throw error;
        toast.success('Plan updated');
      } else {
        const { error } = await supabase
          .from('distributor_business_plans')
          .insert(payload);
        if (error) throw error;
        toast.success('Plan created');
      }

      loadPlans(distributorId);
    } catch (error: any) {
      toast.error('Failed to save: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/distributor-portal')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-semibold text-foreground">FY Plan</h1>
              <p className="text-xs text-muted-foreground">Annual business targets</p>
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Year Selector */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                <span className="font-medium">Financial Year</span>
              </div>
              <Select
                value={selectedYear.toString()}
                onValueChange={(value) => setSelectedYear(parseInt(value))}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map(year => (
                    <SelectItem key={year} value={year.toString()}>
                      FY {year}-{(year + 1).toString().slice(-2)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Plan Status */}
        <div className="flex items-center gap-2">
          <Badge variant={currentPlan ? 'default' : 'secondary'}>
            {currentPlan ? 'Plan Exists' : 'No Plan Yet'}
          </Badge>
          {currentPlan && (
            <span className="text-xs text-muted-foreground">
              Last updated: {new Date(currentPlan.id).toLocaleDateString()}
            </span>
          )}
        </div>

        {/* Revenue Target */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Revenue Target
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label>Annual Revenue Target (₹)</Label>
                <Input
                  type="number"
                  value={formData.revenue_target}
                  onChange={(e) => setFormData({ ...formData, revenue_target: e.target.value })}
                  placeholder="Enter target revenue"
                  className="mt-1"
                />
                {formData.revenue_target && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Monthly avg: ₹{(parseFloat(formData.revenue_target) / 12).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Territory & Coverage */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4" />
              Territory & Coverage Goals
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Territory Expansion Target</Label>
              <Textarea
                value={formData.territory_target}
                onChange={(e) => setFormData({ ...formData, territory_target: e.target.value })}
                placeholder="Describe territory expansion plans..."
                rows={2}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Coverage Target</Label>
              <Textarea
                value={formData.coverage_target}
                onChange={(e) => setFormData({ ...formData, coverage_target: e.target.value })}
                placeholder="Describe coverage improvement goals..."
                rows={2}
                className="mt-1"
              />
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Additional Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any additional notes or plans for the year..."
              rows={4}
            />
          </CardContent>
        </Card>

        {/* Historical Plans */}
        {plans.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Historical Plans</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {plans.map(plan => (
                  <div 
                    key={plan.id}
                    className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                      plan.year === selectedYear 
                        ? 'bg-primary/10 border border-primary' 
                        : 'bg-muted/50 hover:bg-muted'
                    }`}
                    onClick={() => setSelectedYear(plan.year)}
                  >
                    <div>
                      <p className="font-medium">FY {plan.year}-{(plan.year + 1).toString().slice(-2)}</p>
                      {plan.revenue_target && (
                        <p className="text-sm text-muted-foreground">
                          Target: ₹{plan.revenue_target.toLocaleString('en-IN')}
                        </p>
                      )}
                    </div>
                    {plan.year === selectedYear && (
                      <Badge>Selected</Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default DistributorFYPlanPage;

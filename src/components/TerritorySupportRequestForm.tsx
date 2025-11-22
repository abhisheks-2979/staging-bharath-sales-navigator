import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { HeartHandshake } from 'lucide-react';

interface TerritorySupportRequestFormProps {
  territoryId: string;
  territoryName: string;
}

const TerritorySupportRequestForm: React.FC<TerritorySupportRequestFormProps> = ({ territoryId, territoryName }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [supportType, setSupportType] = useState('');
  const [priority, setPriority] = useState('');
  const [description, setDescription] = useState('');
  const [estimatedBudget, setEstimatedBudget] = useState('');
  const [expectedImpact, setExpectedImpact] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast.error('You must be logged in to submit a request');
      setLoading(false);
      return;
    }
    
    // Using support_requests table as a general support request system
    const { error } = await supabase.from('support_requests').insert({
      user_id: user.id,
      subject: `Territory Growth Support: ${territoryName}`,
      description: `
Support Type: ${supportType}
Priority: ${priority}
Territory: ${territoryName}

Description:
${description}

${estimatedBudget ? `Estimated Budget: ₹${estimatedBudget}` : ''}

${expectedImpact ? `Expected Impact:\n${expectedImpact}` : ''}
      `.trim(),
      status: 'open',
      support_category: 'territory_support',
    });

    if (error) {
      console.error('Error creating support request:', error);
      toast.error('Failed to create support request');
    } else {
      toast.success('Support request created successfully!');
      setOpen(false);
      // Reset form
      setSupportType('');
      setPriority('');
      setDescription('');
      setEstimatedBudget('');
      setExpectedImpact('');
    }

    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 w-full sm:w-auto">
          <HeartHandshake className="h-4 w-4" />
          Request Support
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Territory Growth Support Request</DialogTitle>
          <DialogDescription>
            Request resources or support to grow {territoryName}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="supportType">Support Type *</Label>
              <Select value={supportType} onValueChange={setSupportType} required>
                <SelectTrigger id="supportType">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="marketing_campaign">Marketing Campaign</SelectItem>
                  <SelectItem value="branding_material">Branding Material</SelectItem>
                  <SelectItem value="additional_manpower">Additional Manpower</SelectItem>
                  <SelectItem value="training_program">Training Program</SelectItem>
                  <SelectItem value="promotional_scheme">Promotional Scheme</SelectItem>
                  <SelectItem value="infrastructure">Infrastructure Support</SelectItem>
                  <SelectItem value="inventory_support">Inventory Support</SelectItem>
                  <SelectItem value="technology_tools">Technology/Tools</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority *</Label>
              <Select value={priority} onValueChange={setPriority} required>
                <SelectTrigger id="priority">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the support needed and how it will help grow the territory..."
              rows={4}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="estimatedBudget">Estimated Budget (₹)</Label>
            <Input
              id="estimatedBudget"
              type="number"
              value={estimatedBudget}
              onChange={(e) => setEstimatedBudget(e.target.value)}
              placeholder="Enter estimated budget if applicable"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="expectedImpact">Expected Impact</Label>
            <Textarea
              id="expectedImpact"
              value={expectedImpact}
              onChange={(e) => setExpectedImpact(e.target.value)}
              placeholder="Describe the expected impact on sales, market share, or other metrics..."
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Request'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TerritorySupportRequestForm;

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Edit, Plus, Search, CalendarIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface BeatAllowance {
  id: string;
  beat_id: string;
  beat_name: string;
  daily_allowance: number;
  travel_allowance: number;
  user_id: string;
  user_name: string;
  created_at: string;
  updated_at: string;
  date?: string;
  additional_expenses?: number;
  total_expenses?: number;
  todays_order?: number;
  productivity?: number;
}

interface Beat {
  beat_id: string;
  beat_name: string;
  user_id: string;
}

const BeatAllowanceManagement = () => {
  const [allowances, setAllowances] = useState<BeatAllowance[]>([]);
  const [beats, setBeats] = useState<Beat[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAllowance, setEditingAllowance] = useState<BeatAllowance | null>(null);
  const [formData, setFormData] = useState({
    beat_id: '',
    daily_allowance: '',
    travel_allowance: ''
  });
  const { toast } = useToast();

  const fetchAllowances = async () => {
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) return;

      const { data, error } = await (supabase as any)
        .from('beat_allowances')
        .select('*')
        .eq('user_id', user.data.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedData = (data as any[] | null)?.map((item: any) => ({
        id: item.id,
        beat_id: item.beat_id,
        beat_name: item.beat_name,
        daily_allowance: item.daily_allowance,
        travel_allowance: item.travel_allowance,
        user_id: item.user_id,
        user_name: '-', // Not needed for user's own expenses
        created_at: item.created_at,
        updated_at: item.updated_at,
        date: new Date(item.created_at).toLocaleDateString(),
        additional_expenses: 0, // Placeholder for future implementation
        total_expenses: item.daily_allowance + item.travel_allowance,
        todays_order: 0, // Placeholder for future implementation
        productivity: 0 // Placeholder for future implementation
      })) || [];

      setAllowances(formattedData);
    } catch (error) {
      console.error('Error fetching allowances:', error);
      toast({
        title: "Error",
        description: "Failed to fetch expenses",
        variant: "destructive",
      });
    }
  };

  const fetchBeats = async () => {
    try {
      const { data, error } = await supabase
        .from('beat_plans')
        .select('beat_id, beat_name, user_id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .order('beat_name');

      if (error) throw error;
      setBeats(data || []);
    } catch (error) {
      console.error('Error fetching beats:', error);
    }
  };

  useEffect(() => {
    Promise.all([fetchAllowances(), fetchBeats()]).finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.beat_id || !formData.daily_allowance || !formData.travel_allowance) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const selectedBeat = beats.find(b => b.beat_id === formData.beat_id);
      
      const allowanceData = {
        beat_id: formData.beat_id,
        beat_name: selectedBeat?.beat_name || '',
        user_id: selectedBeat?.user_id || '',
        daily_allowance: parseFloat(formData.daily_allowance),
        travel_allowance: parseFloat(formData.travel_allowance)
      };

      if (editingAllowance) {
        const { error } = await (supabase as any)
          .from('beat_allowances')
          .update(allowanceData)
          .eq('id', editingAllowance.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Beat allowance updated successfully",
        });
      } else {
        const { error } = await (supabase as any)
          .from('beat_allowances')
          .insert([allowanceData]);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Beat allowance created successfully",
        });
      }

      setIsDialogOpen(false);
      setEditingAllowance(null);
      setFormData({ beat_id: '', daily_allowance: '', travel_allowance: '' });
      fetchAllowances();
    } catch (error) {
      console.error('Error saving allowance:', error);
      toast({
        title: "Error",
        description: "Failed to save beat allowance",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (allowance: BeatAllowance) => {
    setEditingAllowance(allowance);
    setFormData({
      beat_id: allowance.beat_id,
      daily_allowance: allowance.daily_allowance.toString(),
      travel_allowance: allowance.travel_allowance.toString()
    });
    setIsDialogOpen(true);
  };

  const filteredAllowances = allowances.filter(allowance => {
    const matchesSearch = allowance.beat_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      allowance.user_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!selectedDate) return matchesSearch;
    
    const allowanceDate = new Date(allowance.created_at).toDateString();
    const filterDate = selectedDate.toDateString();
    
    return matchesSearch && allowanceDate === filterDate;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogContent className="sm:max-w-[425px] mx-2 sm:mx-0 max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-lg sm:text-xl">{editingAllowance ? 'Edit' : 'Add'} Beat Allowance</DialogTitle>
                  <DialogDescription className="text-sm sm:text-base">
                    Set daily and travel allowances for specific beats.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="beat_id">Beat</Label>
                    <Select
                      value={formData.beat_id}
                      onValueChange={(value) => setFormData({ ...formData, beat_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a beat" />
                      </SelectTrigger>
                      <SelectContent>
                        {beats.map((beat) => (
                          <SelectItem key={beat.beat_id} value={beat.beat_id}>
                            {beat.beat_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="daily_allowance">Daily Allowance (₹)</Label>
                    <Input
                      id="daily_allowance"
                      type="number"
                      step="0.01"
                      value={formData.daily_allowance}
                      onChange={(e) => setFormData({ ...formData, daily_allowance: e.target.value })}
                      placeholder="Enter daily allowance"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="travel_allowance">Travel Allowance (₹)</Label>
                    <Input
                      id="travel_allowance"
                      type="number"
                      step="0.01"
                      value={formData.travel_allowance}
                      onChange={(e) => setFormData({ ...formData, travel_allowance: e.target.value })}
                      placeholder="Enter travel allowance"
                    />
                  </div>
                  <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsDialogOpen(false)}
                      className="w-full sm:w-auto order-2 sm:order-1"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit"
                      className="w-full sm:w-auto order-1 sm:order-2"
                    >
                      {editingAllowance ? 'Update' : 'Create'} Allowance
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="px-3 sm:px-6">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex items-center space-x-2 flex-1">
                <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <Input
                  placeholder="Search by beat name or user..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1 text-sm"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[200px] justify-start text-left font-normal",
                        !selectedDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
                {selectedDate && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedDate(undefined)}
                    className="px-3"
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>

            {/* Mobile Cards View */}
            <div className="block sm:hidden space-y-3">
              {filteredAllowances.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No expenses found
                </div>
              ) : (
                filteredAllowances.map((allowance) => (
                  <Card key={allowance.id} className="p-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium text-sm">{allowance.beat_name}</h3>
                          <p className="text-xs text-muted-foreground">{new Date(allowance.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">DA:</span>
                          <span className="ml-1 font-medium">₹{allowance.daily_allowance.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">TA:</span>
                          <span className="ml-1 font-medium">₹{allowance.travel_allowance.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Additional:</span>
                          <span className="ml-1 font-medium">₹0.00</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Total:</span>
                          <span className="ml-1 font-medium">₹{allowance.daily_allowance + allowance.travel_allowance}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Today's Order:</span>
                          <span className="ml-1 font-medium">₹0.00</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Productivity:</span>
                          <span className="ml-1 font-medium">-</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden sm:block rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs md:text-sm">Date</TableHead>
                    <TableHead className="text-xs md:text-sm">Beat Name</TableHead>
                    <TableHead className="text-xs md:text-sm">DA</TableHead>
                    <TableHead className="text-xs md:text-sm">TA</TableHead>
                    <TableHead className="text-xs md:text-sm">Additional Expenses</TableHead>
                    <TableHead className="text-xs md:text-sm">Total Expenses</TableHead>
                    <TableHead className="text-xs md:text-sm">Today's Order</TableHead>
                    <TableHead className="text-xs md:text-sm">Productivity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAllowances.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground text-sm">
                        No expenses found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAllowances.map((allowance) => (
                      <TableRow key={allowance.id}>
                        <TableCell className="text-xs md:text-sm">{new Date(allowance.created_at).toLocaleDateString()}</TableCell>
                        <TableCell className="font-medium text-xs md:text-sm">{allowance.beat_name}</TableCell>
                        <TableCell className="text-xs md:text-sm">₹{allowance.daily_allowance.toFixed(2)}</TableCell>
                        <TableCell className="text-xs md:text-sm">₹{allowance.travel_allowance.toFixed(2)}</TableCell>
                        <TableCell className="text-xs md:text-sm">₹0.00</TableCell>
                        <TableCell className="text-xs md:text-sm">₹{(allowance.daily_allowance + allowance.travel_allowance).toFixed(2)}</TableCell>
                        <TableCell className="text-xs md:text-sm">₹0.00</TableCell>
                        <TableCell className="text-xs md:text-sm">-</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BeatAllowanceManagement;
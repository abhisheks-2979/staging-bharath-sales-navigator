import { MapPin, Phone, Store, ShoppingCart, XCircle, BarChart3, Check, Users, MessageSquare, Paintbrush, Camera, LogIn, LogOut, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { toast } from "@/hooks/use-toast";
import { CompetitionInsightModal } from "./CompetitionInsightModal";
import { RetailerFeedbackModal } from "./RetailerFeedbackModal";
import { NoOrderModal } from "./NoOrderModal";
import { supabase } from "@/integrations/supabase/client";
import BrandingRequestModal from "./BrandingRequestModal";
import { StockCycleModal } from "./StockCycleModal";
import { AnalyticsModal } from "./AnalyticsModal";
import { StockDataModal } from "./StockDataModal";

interface Visit {
  id: string;
  retailerId?: string;
  retailerName: string;
  address: string;
  phone: string;
  retailerCategory: string;
  status: "planned" | "in-progress" | "productive" | "unproductive" | "store-closed" | "cancelled";
  visitType: string;
  time?: string;
  checkInStatus?: "not-checked-in" | "checked-in-correct" | "checked-in-wrong-location";
  hasOrder?: boolean;
  orderValue?: number;
  noOrderReason?: "over-stocked" | "owner-not-available" | "store-closed" | "permanently-closed";
  distributor?: string;
  retailerLat?: number;
  retailerLng?: number;
}

interface VisitCardProps {
  visit: Visit;
  onViewDetails: (visitId: string) => void;
  selectedDate?: string; // Add selectedDate prop
}

export const VisitCard = ({ visit, onViewDetails, selectedDate }: VisitCardProps) => {
  const navigate = useNavigate();
  const [showNoOrderModal, setShowNoOrderModal] = useState(false);
  const [noOrderReason, setNoOrderReason] = useState<string>(visit.noOrderReason || "");
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackActiveTab, setFeedbackActiveTab] = useState("menu");
  const [showStockCycleModal, setShowStockCycleModal] = useState(false);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [hasViewedAnalytics, setHasViewedAnalytics] = useState(false);
  const [showStockDataModal, setShowStockDataModal] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'in-progress' | 'completed'>(visit.status === 'in-progress' ? 'in-progress' : 'idle');
  const [locationMatchIn, setLocationMatchIn] = useState<boolean | null>(null);
  const [locationMatchOut, setLocationMatchOut] = useState<boolean | null>(null);
  const [currentVisitId, setCurrentVisitId] = useState<string | null>(null);
  const [orderPreviewOpen, setOrderPreviewOpen] = useState(false);
  const [lastOrderItems, setLastOrderItems] = useState<Array<{ product_name: string; quantity: number; rate: number; actualRate: number }>>([]);
  const [loadingOrder, setLoadingOrder] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [isNoOrderMarked, setIsNoOrderMarked] = useState(!!visit.noOrderReason);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [isCheckedOut, setIsCheckedOut] = useState(false);
  const [hasOrderToday, setHasOrderToday] = useState(!!visit.hasOrder);
  const [actualOrderValue, setActualOrderValue] = useState<number>(0);
  const [distributorName, setDistributorName] = useState<string>('');
  const [hasStockRecords, setHasStockRecords] = useState(false);
  const [stockRecordCount, setStockRecordCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingPhotoActionRef = useRef<'checkin' | 'checkout' | null>(null);
  const [proceedWithoutCheckIn, setProceedWithoutCheckIn] = useState(false);
  const [showReasonInput, setShowReasonInput] = useState(false);
  const [skipCheckInReason, setSkipCheckInReason] = useState('');
  
  // Check if the selected date is today's date
  const isTodaysVisit = selectedDate === new Date().toISOString().split('T')[0];
  
  // Check if user has viewed analytics for this visit, check-in status, and load distributor info
  useEffect(() => {
    const checkStatus = async () => {
      try {
        console.log('Checking status for visit:', visit.id, 'retailerId:', visit.retailerId);
        const { data: user } = await supabase.auth.getUser();
        if (user.user) {
          const visitRetailerId = visit.retailerId || visit.id;
          const targetDate = (selectedDate && selectedDate.length > 0) ? selectedDate : new Date().toISOString().split('T')[0];
          
          // Load distributor information - First try to get from distributor mapping
          const { data: distributorMapping, error: mappingError } = await supabase
            .from('distributor_retailer_mappings')
            .select('distributor_id')
            .eq('retailer_id', visitRetailerId)
            .eq('user_id', user.user.id)
            .maybeSingle();

          if (!mappingError && distributorMapping?.distributor_id) {
            // Try to get distributor from retailers table (distributors are stored as retailers with entity_type = 'distributor')
            const { data: distributorData, error: distributorError } = await supabase
              .from('retailers')
              .select('name')
              .eq('id', distributorMapping.distributor_id)
              .eq('entity_type', 'distributor')
              .maybeSingle();

            if (!distributorError && distributorData) {
              setDistributorName(distributorData.name);
            }
          }

          // Check if stock records exist for this retailer today
          const stockCheckDate = targetDate;
          const { data: stockRecords, error: stockError } = await supabase
            .from('stock')
            .select('id, product_name')
            .eq('user_id', user.user.id)
            .eq('retailer_id', visitRetailerId)
            .gte('created_at', `${stockCheckDate}T00:00:00.000Z`)
            .lte('created_at', `${stockCheckDate}T23:59:59.999Z`);

          if (!stockError && stockRecords && stockRecords.length > 0) {
            setHasStockRecords(true);
            setStockRecordCount(stockRecords.length);
          } else {
            setHasStockRecords(false);
            setStockRecordCount(0);
          }
          // Check analytics view
          const { data, error } = await supabase
            .from('analytics_views')
            .select('id')
            .eq('user_id', user.user.id)
            .eq('visit_id', visit.id)
            .maybeSingle();
          
          if (data && !error) {
            setHasViewedAnalytics(true);
          }

          // Check visit status for today
          const today = targetDate;
          const { data: visitData } = await supabase
            .from('visits')
            .select('id, check_in_time, check_out_time, status')
            .eq('user_id', user.user.id)
            .eq('retailer_id', visitRetailerId)
            .eq('planned_date', today)
            .maybeSingle();

          console.log('Visit data from DB:', visitData);
          if (visitData) {
            const checkedIn = ((visitData as any).status === 'in-progress') || !!(visitData as any).check_in_time;
            const checkedOut = !!(visitData as any).check_out_time;
            const skippedCheckIn = !!(visitData as any).skip_check_in_reason;
            console.log('Setting state - isCheckedIn:', checkedIn, 'isCheckedOut:', checkedOut, 'skippedCheckIn:', skippedCheckIn);
            setIsCheckedIn(checkedIn);
            setIsCheckedOut(checkedOut);
            setProceedWithoutCheckIn(skippedCheckIn);
            if (skippedCheckIn) {
              setSkipCheckInReason((visitData as any).skip_check_in_reason);
            }
            setCurrentVisitId((visitData as any).id);
            
            if ((visitData as any).status === 'unproductive') {
              setIsNoOrderMarked(true);
              setPhase('completed');
            }
            if (((visitData as any).check_in_time || skippedCheckIn) && !(visitData as any).check_out_time && (visitData as any).status === 'in-progress') {
              setPhase('in-progress');
            } else if ((visitData as any).check_out_time || (visitData as any).status === 'unproductive' || (visitData as any).status === 'productive') {
              setPhase('completed');
            }
          } else {
            console.log('No visit data found, resetting states');
            setIsCheckedIn(false);
            setIsCheckedOut(false);
            setProceedWithoutCheckIn(false);
            setCurrentVisitId(null);
          }

          // Check if there are any orders today for this retailer
          const todayStart = new Date(today);
          todayStart.setHours(0, 0, 0, 0);
          const todayEnd = new Date(today);
          todayEnd.setHours(23, 59, 59, 999);

          const { data: ordersToday } = await supabase
            .from('orders')
            .select('id, total_amount')
            .eq('user_id', user.user.id)
            .eq('retailer_id', visitRetailerId)
            .eq('status', 'confirmed')
            .gte('created_at', todayStart.toISOString())
            .lte('created_at', todayEnd.toISOString());

          if (ordersToday && ordersToday.length > 0) {
            setHasOrderToday(true);
            // Calculate the actual total of all orders today
            const totalOrderValue = ordersToday.reduce((sum, order) => sum + Number(order.total_amount || 0), 0);
            setActualOrderValue(totalOrderValue);
            
            // If an order exists and visit is checked in, automatically mark as productive
            if (visitData?.check_in_time && visitData.status === 'in-progress') {
              await supabase
                .from('visits')
                .update({ status: 'productive' })
                .eq('id', visitData.id);
            }
          } else {
            setHasOrderToday(false);
            setActualOrderValue(0);
          }
        }
      } catch (error) {
        console.log('Status check error:', error);
      }
    };

    checkStatus();
    
    // Listen for custom events to refresh status
    const handleStatusChange = () => {
      console.log('Received visitStatusChanged event, refreshing status...');
      checkStatus();
    };
    
    window.addEventListener('visitStatusChanged', handleStatusChange);
    
    return () => {
      window.removeEventListener('visitStatusChanged', handleStatusChange);
    };
  }, [visit.id, visit.retailerId, selectedDate]);

  // Set up real-time listener for orders to automatically update visit status
  useEffect(() => {
    const setupListener = async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const retailerId = visit.retailerId || visit.id;
      const channel = supabase
        .channel('order-updates')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'orders',
            filter: `retailer_id=eq.${retailerId}`
          },
          async (payload) => {
            // When an order is placed, automatically mark visit as productive if checked in
            const targetDate = (selectedDate && selectedDate.length > 0) ? selectedDate : new Date().toISOString().split('T')[0];
            const createdAt: any = (payload as any)?.new?.created_at || (payload as any)?.created_at;
            const createdDate = createdAt ? new Date(createdAt).toISOString().split('T')[0] : null;
            if (createdDate !== targetDate) {
              return;
            }
            const { data: userData } = await supabase.auth.getUser();
            if (userData.user) {
              const { data: visitData } = await supabase
                .from('visits')
                .select('id, status, check_in_time')
                .eq('user_id', userData.user.id)
                .eq('retailer_id', retailerId)
                .eq('planned_date', targetDate)
                .maybeSingle();

              if (visitData?.check_in_time && (visitData.status === 'in-progress' || visitData.status === 'unproductive')) {
                await supabase
                  .from('visits')
                  .update({ status: 'productive', no_order_reason: null })
                  .eq('id', visitData.id);
              }
              setHasOrderToday(true);
              setIsNoOrderMarked(false);
              setNoOrderReason('');
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    setupListener();
  }, [visit.retailerId, visit.id, selectedDate]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "productive":
        return "bg-success text-success-foreground";
      case "in-progress":
        return "bg-warning text-warning-foreground";
      case "planned":
        return "bg-primary text-primary-foreground";
      case "unproductive":
        return "bg-destructive text-destructive-foreground";
      case "store-closed":
        return "bg-muted text-muted-foreground";
      case "cancelled":
        return "bg-muted text-muted-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "productive":
        return "Productive";
      case "in-progress":
        return "In Progress";
      case "planned":
        return "Planned";
      case "unproductive":
        return "Unproductive";
      case "store-closed":
        return "Store Closed";
      case "cancelled":
        return "Cancelled";
      default:
        return "Not Started";
    }
  };

  const getLocationBtnClass = () => {
    if (isCheckedOut) {
      return "bg-success text-success-foreground hover:bg-success/90";
    }
    if (isCheckedIn || proceedWithoutCheckIn) {
      return "bg-warning text-warning-foreground hover:bg-warning/90";
    }
    // idle
    return "bg-muted text-muted-foreground hover:bg-muted/80";
  };

  const getLocationBtnTitle = () => {
    if (phase === 'completed') {
      return (locationMatchOut ?? false) ? 'Checked Out (Location match)' : 'Checked Out (Location mismatch)';
    }
    if (phase === 'in-progress') {
      return (locationMatchIn ?? false) ? 'In Progress (Location match)' : 'In Progress (Location mismatch)';
    }
    if (proceedWithoutCheckIn) {
      return 'Proceeding without Check-in';
    }
    return 'Check-In';
  };

  const toRad = (v: number) => (v * Math.PI) / 180;
  const distanceMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371000; // meters
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const getPosition = () => new Promise<GeolocationPosition>((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Geolocation not supported'));
    navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 30000, maximumAge: 10000 });
  });

  const ensureVisit = async (userId: string, retailerId: string, date: string) => {
    // Get the most recent visit (in case of duplicates, use the latest one)
    const { data, error } = await supabase
      .from('visits')
      .select('id, status, check_in_time, location_match_in, location_match_out')
      .eq('user_id', userId)
      .eq('retailer_id', retailerId)
      .eq('planned_date', date)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.log('ensureVisit select error', error);
    }

    if (data) {
      setCurrentVisitId(data.id);
      if (data.check_in_time) setPhase('in-progress');
      if (data.location_match_in != null) setLocationMatchIn(data.location_match_in);
      if (data.location_match_out != null) setLocationMatchOut(data.location_match_out);
      return data.id;
    }

    // Only insert if no visit exists
    const { data: inserted, error: insertError } = await supabase
      .from('visits')
      .insert({ user_id: userId, retailer_id: retailerId, planned_date: date })
      .select('id')
      .single();
    if (insertError) throw insertError;
    setCurrentVisitId(inserted.id);
    return inserted.id;
  };

  const handlePhotoSelected = async (e: any) => {
    try {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file || !currentVisitId) return;
      const action = pendingPhotoActionRef.current;
      pendingPhotoActionRef.current = null;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const path = `${user.id}/${currentVisitId}-${action || 'checkin'}-${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('visit-photos')
        .upload(path, file, { contentType: file.type || 'image/jpeg', upsert: false });
      if (uploadError) throw uploadError;

      const column = action === 'checkout' ? 'check_out_photo_url' : 'check_in_photo_url';
      const { error: updateError } = await supabase
        .from('visits')
        .update({ [column]: path })
        .eq('id', currentVisitId);
      if (updateError) throw updateError;

      toast({ title: 'Photo saved', description: 'Visit photo uploaded successfully.' });
    } catch (err: any) {
      console.error('Photo upload error', err);
      toast({ title: 'Photo upload failed', description: err.message || 'Try again.', variant: 'destructive' });
    }
  };

  const handleLocationClick = () => {
    setShowLocationModal(true);
  };

  const handleCheckInOut = async (action: 'checkin' | 'checkout') => {
    try {
      console.log(`Starting ${action} process...`);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: 'Login required', description: 'Please sign in to record visits.', variant: 'destructive' });
        return;
      }

      const today = new Date().toISOString().split('T')[0];
      const retailerId = visit.retailerId || visit.id;
      console.log(`Ensuring visit for retailer ${retailerId} on ${today}`);
      const visitId = await ensureVisit(user.id, retailerId, today);
      console.log(`Visit ID: ${visitId}`);

      const pos = await getPosition();
      const current = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      console.log(`Current location: ${current.latitude}, ${current.longitude}`);

      let match: boolean | null = null;
      if (typeof visit.retailerLat === 'number' && typeof visit.retailerLng === 'number') {
        const dist = distanceMeters(current.latitude, current.longitude, visit.retailerLat, visit.retailerLng);
        match = dist <= 150; // within 150 meters
        console.log(`Location match: ${match} (distance: ${dist}m)`);
      }

      // Get reverse geocoding for address
      let address = '';
      try {
        const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${current.latitude}&longitude=${current.longitude}&localityLanguage=en`);
        const data = await response.json();
        address = data.display_name || `${current.latitude}, ${current.longitude}`;
      } catch {
        address = `${current.latitude}, ${current.longitude}`;
      }

      const timestamp = new Date().toISOString();

      if (action === 'checkin') {
        console.log(`Performing check-in for visit ${visitId}`);
        // Update visits table
        const { error, data: updatedVisit } = await supabase
          .from('visits')
          .update({
            check_in_time: timestamp,
            check_in_location: current,
            check_in_address: address,
            location_match_in: match,
            status: 'in-progress'
          })
          .eq('id', visitId)
          .select()
          .single();
        
        if (error) {
          console.error('Check-in update error:', error);
          throw error;
        }
        console.log('Check-in successful, updated visit:', updatedVisit);

        // Update attendance table
        const { error: attendanceError } = await supabase
          .from('attendance')
          .upsert({
            user_id: user.id,
            date: today,
            check_in_time: timestamp,
            check_in_location: current,
            check_in_address: address,
            status: 'present'
          }, {
            onConflict: 'user_id,date'
          });
        
        if (attendanceError) console.error('Attendance check-in error:', attendanceError);

        setPhase('in-progress');
        setLocationMatchIn(match);
        setIsCheckedIn(true);
        console.log('Local state updated - isCheckedIn:', true, 'phase:', 'in-progress');
        toast({ title: 'Checked in', description: match === false ? 'Location mismatch' : 'Location verified' });
        
        // Refresh the component state to ensure UI updates
        window.dispatchEvent(new CustomEvent('visitStatusChanged', { 
          detail: { visitId, status: 'in-progress', retailerId } 
        }));
        
        pendingPhotoActionRef.current = 'checkin';
        fileInputRef.current?.click();

      } else if (action === 'checkout') {
        // Check if there are orders today for this retailer to determine final status
        const today = new Date().toISOString().split('T')[0];
        const todayStart = new Date(today);
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(today);
        todayEnd.setHours(23, 59, 59, 999);

        const { data: ordersToday } = await supabase
          .from('orders')
          .select('id')
          .eq('user_id', user.id)
          .eq('retailer_id', visit.retailerId || visit.id)
          .eq('status', 'confirmed')
          .gte('created_at', todayStart.toISOString())
          .lte('created_at', todayEnd.toISOString())
          .limit(1);

        // Determine final status based on orders
        const finalStatus = (ordersToday && ordersToday.length > 0) ? 'productive' : 'unproductive';

        // Update visits table
        const { error } = await supabase
          .from('visits')
          .update({
            check_out_time: timestamp,
            check_out_location: current,
            check_out_address: address,
            location_match_out: match,
            status: finalStatus
          })
          .eq('id', visitId);
        if (error) throw error;

        // Update attendance table
        const { data: attendanceData } = await supabase
          .from('attendance')
          .select('check_in_time')
          .eq('user_id', user.id)
          .eq('date', today)
          .single();

        if (attendanceData?.check_in_time) {
          const checkInTime = new Date(attendanceData.check_in_time);
          const checkOutTime = new Date(timestamp);
          const totalHours = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);

          const { error: attendanceError } = await supabase
            .from('attendance')
            .update({
              check_out_time: timestamp,
              check_out_location: current,
              check_out_address: address,
              total_hours: totalHours
            })
            .eq('user_id', user.id)
            .eq('date', today);
          
          if (attendanceError) console.error('Attendance check-out error:', attendanceError);
        }

        setPhase('completed');
        setLocationMatchOut(match);
        setIsCheckedOut(true);
        toast({ title: 'Checked out', description: match === false ? 'Location mismatch' : 'Location verified' });
        pendingPhotoActionRef.current = 'checkout';
        fileInputRef.current?.click();
      }

      setShowLocationModal(false);
    } catch (err: any) {
      console.error('Check-in/out error', err);
      toast({ title: 'Location/Permission error', description: err.message || 'Enable GPS and try again.', variant: 'destructive' });
    }
  };
  const handleNoOrderReasonSelect = async (reason: string) => {
    console.log('Marking visit as unproductive with reason:', reason);
    try {
      setNoOrderReason(reason);
      setIsNoOrderMarked(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const today = new Date().toISOString().split('T')[0];
        const retailerId = (visit.retailerId || visit.id) as string;
        const visitId = await ensureVisit(user.id, retailerId, today);
        setCurrentVisitId(visitId);
        
        console.log('Updating visit status to unproductive for visitId:', visitId);
        
        // Update visit status to unproductive and store the reason
        const { data, error } = await supabase
          .from('visits')
          .update({ 
            status: 'unproductive',
            no_order_reason: reason
          })
          .eq('id', visitId)
          .select();
        
        if (error) {
          console.error('Error updating visit:', error);
          throw error;
        }
        
        console.log('Visit updated successfully:', data);
        
        // Update local state to reflect the change immediately
        setPhase('completed');
        
        // Trigger a manual refresh of the parent component's data
        window.dispatchEvent(new CustomEvent('visitStatusChanged', { 
          detail: { visitId, status: 'unproductive', retailerId } 
        }));
      }
      setShowNoOrderModal(false);
      toast({
        title: "Visit Marked as Unproductive",
        description: `Reason: ${reason.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}`,
      });
    } catch (err: any) {
      console.error('Mark unproductive error', err);
      toast({ title: 'Failed to mark unproductive', description: err.message || 'Try again.', variant: 'destructive' });
    }
  };

  const handleNoOrderClick = () => {
    if (!isCheckedIn && !proceedWithoutCheckIn && isTodaysVisit) {
      toast({ 
        title: 'Check-in Required', 
        description: 'Please check in or proceed without check-in first.',
        variant: 'destructive' 
      });
      return;
    }
    if (isNoOrderMarked) {
      // Show unproductive result or navigate to results
      toast({
        title: "Unproductive Visit",
        description: `Reason: ${noOrderReason.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}`,
      });
    } else {
      setShowNoOrderModal(true);
    }
  };


  const handleViewAnalytics = async (visitId: string) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (user.user) {
        // Record analytics view
        await supabase
          .from('analytics_views')
          .insert({
            user_id: user.user.id,
            visit_id: visitId
          });
        
        setHasViewedAnalytics(true);
      }
    } catch (error) {
      console.log('Analytics view recording error:', error);
    }
    
    setShowAnalyticsModal(true);
  };


  const loadLastOrder = async () => {
    try {
      if (loadingOrder) return;
      setLoadingOrder(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoadingOrder(false); return; }
      const retailerId = (visit.retailerId || visit.id) as string;
      
      // Use selectedDate if provided, otherwise use today's date
      const targetDate = selectedDate ? new Date(selectedDate) : new Date();
      const dayStart = new Date(targetDate);
      dayStart.setHours(0,0,0,0);
      const dayEnd = new Date(targetDate);
      dayEnd.setHours(23,59,59,999);

      const { data: orders } = await supabase
        .from('orders')
        .select('id')
        .eq('user_id', user.id)
        .eq('retailer_id', retailerId)
        .eq('status', 'confirmed')
        .gte('created_at', dayStart.toISOString())
        .lte('created_at', dayEnd.toISOString());

      if ((orders || []).length > 0) {
        const orderIds = (orders || []).map(o => o.id);
        const { data: items } = await supabase
          .from('order_items')
          .select('product_name, quantity, rate, total, order_id')
          .in('order_id', orderIds);

        // Group items by product for a clean summary
        const grouped = new Map<string, { product_name: string; quantity: number; rate: number; actualRate: number }>();
        (items || []).forEach(it => {
          const key = it.product_name;
          const existing = grouped.get(key);
          const actualRate = Number(it.total || 0) / Number(it.quantity || 1); // Calculate actual price paid per unit
          if (existing) {
            existing.quantity += Number(it.quantity || 0);
            // Recalculate weighted average of actual rate
            const totalValue = (existing.actualRate * (existing.quantity - Number(it.quantity || 0))) + Number(it.total || 0);
            existing.actualRate = totalValue / existing.quantity;
          } else {
            grouped.set(key, { 
              product_name: key, 
              quantity: Number(it.quantity || 0), 
              rate: Number(it.rate || 0), // Original rate for reference
              actualRate: actualRate // Actual price paid (with offers applied)
            });
          }
        });
        setLastOrderItems(Array.from(grouped.values()).sort((a, b) => a.product_name.localeCompare(b.product_name)));
      } else {
        setLastOrderItems([]);
      }
    } finally {
      setLoadingOrder(false);
    }
  };
  return (
    <Card className="shadow-card hover:shadow-xl transition-all duration-300 border-l-4 border-l-primary/30 bg-gradient-to-r from-card to-card/50">
      <CardContent className="p-3 sm:p-4">
        {/* Header - Retailer info and status */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-card-foreground text-sm sm:text-base truncate">
              <button
                onClick={() => window.open(`/retailer/${visit.retailerId || visit.id}`, '_blank')}
                className="text-left hover:text-primary transition-colors cursor-pointer underline-offset-4 hover:underline"
                title="View retailer details"
              >
                {visit.retailerName}
              </button>
            </h3>
            {(distributorName || visit.distributor) && (
              <div className="flex items-center gap-1 text-xs sm:text-sm text-muted-foreground mt-1">
                <Store size={12} className="sm:size-3.5 flex-shrink-0" />
                <span className="truncate" title="Mapped Distributor">
                  {distributorName || visit.distributor}
                </span>
              </div>
            )}
          </div>
          <div className="flex sm:flex-col items-start sm:items-end gap-2 sm:gap-1">
            <Badge className={`${getStatusColor(visit.status)} text-xs px-2 py-1`}>
              {getStatusText(visit.status)}
            </Badge>
            {hasStockRecords && (
              <Badge 
                className="bg-blue-500 text-white hover:bg-blue-600 text-xs px-2 py-1 cursor-pointer transition-all" 
                variant="secondary"
                onClick={() => setShowStockDataModal(true)}
              >
                <Package size={12} className="mr-1" />
                {stockRecordCount} Stock{stockRecordCount !== 1 ? 's' : ''}
              </Badge>
            )}
            <div className="text-xs text-muted-foreground">{visit.retailerCategory}</div>
            {actualOrderValue > 0 && hasOrderToday && visit.status !== 'unproductive' && (
              <Button
                variant="link"
                size="sm"
                className="h-6 p-0 text-primary"
                onClick={async () => {
                  const next = !orderPreviewOpen;
                  setOrderPreviewOpen(next);
                  if (next && lastOrderItems.length === 0) {
                    await loadLastOrder();
                  }
                }}
                title={selectedDate ? `View order for ${new Date(selectedDate).toLocaleDateString()}` : "View today's order"}
              >
                ₹{actualOrderValue.toLocaleString()}
              </Button>
            )}
          </div>
        </div>

        {/* Contact info */}
        <div className="mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
            <div className="flex items-center gap-1 flex-1 min-w-0">
              <MapPin size={12} className="sm:size-3.5 flex-shrink-0" />
              <span className="truncate">{visit.address}</span>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Phone size={12} className="sm:size-3.5" />
              <span>{visit.phone}</span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {/* First row - Check In, Order, No Order */}
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
            <Button 
              size="sm" 
              className={`${getLocationBtnClass()} p-1.5 sm:p-2 h-8 sm:h-10 text-xs sm:text-sm flex flex-col items-center gap-0.5`}
              onClick={handleLocationClick}
              title={getLocationBtnTitle()}
            >
              <MapPin size={12} className="sm:size-3.5" />
              <span className="text-xs">Check-in</span>
            </Button>
            
            <Button 
              variant={hasOrderToday ? "default" : "outline"}
              size="sm"
              className={`p-1.5 sm:p-2 h-8 sm:h-10 text-xs sm:text-sm flex flex-col items-center gap-0.5 ${
                hasOrderToday ? "bg-success text-success-foreground" : ""
              } ${(!isCheckedIn && !proceedWithoutCheckIn || !isTodaysVisit) ? "opacity-50 cursor-not-allowed" : ""}`}
              onClick={async () => {
                if (!isCheckedIn && !proceedWithoutCheckIn && isTodaysVisit) {
                  toast({ 
                    title: 'Check-in Required', 
                    description: 'Please check in first to place an order.',
                    variant: 'destructive' 
                  });
                  return;
                }
                if ((!isCheckedIn && !proceedWithoutCheckIn) || !isTodaysVisit) return;
                try {
                  const { data: { user } } = await supabase.auth.getUser();
                  if (!user) {
                    toast({ title: 'Login required', description: 'Please sign in to place orders.', variant: 'destructive' });
                    return;
                  }
                  const today = new Date().toISOString().split('T')[0];
                  const retailerId = (visit.retailerId || visit.id) as string;
                  const visitId = await ensureVisit(user.id, retailerId, today);
                  setCurrentVisitId(visitId);
                  navigate(`/order-entry?retailerId=${encodeURIComponent(retailerId)}&visitId=${encodeURIComponent(visitId)}&retailer=${encodeURIComponent(visit.retailerName)}`);
                } catch (err: any) {
                  console.error('Open order entry error', err);
                  toast({ title: 'Unable to open', description: err.message || 'Try again.', variant: 'destructive' });
                }
              }}
              title={`${(!isCheckedIn && !proceedWithoutCheckIn) ? "Check in first to place order" : `Order${visit.orderValue || hasOrderToday ? ` (₹${visit.orderValue ? visit.orderValue.toLocaleString() : 'Order Placed'})` : ""}`}`}
            >
              <ShoppingCart size={12} className="sm:size-3.5" />
              <span className="text-xs">Order</span>
            </Button>
            
            <Button 
              variant={isNoOrderMarked ? "default" : "outline"}
              size="sm"
              className={`p-1.5 sm:p-2 h-8 sm:h-10 text-xs sm:text-sm flex flex-col items-center gap-0.5 ${
                isNoOrderMarked ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""
              } ${(isNoOrderMarked || hasOrderToday || (!isCheckedIn && !proceedWithoutCheckIn) || !isTodaysVisit) ? "opacity-50 cursor-not-allowed" : ""}`}
              onClick={handleNoOrderClick}
              disabled={hasOrderToday || (!isCheckedIn && !proceedWithoutCheckIn) || !isTodaysVisit}
              title={
                (!isCheckedIn && !proceedWithoutCheckIn)
                  ? "Check in first to mark no order"
                  : isNoOrderMarked 
                    ? `Unproductive (${noOrderReason.replace(/-/g, ' ')})` 
                    : hasOrderToday 
                      ? "Cannot mark no order - Order already placed today"
                      : "Mark No Order"
              }
            >
              <XCircle size={12} className="sm:size-3.5" />
              <span className="text-xs">No Order</span>
            </Button>
          </div>

          {/* Second row - Analytics and Feedback */}
          <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
            <Button 
              variant="outline" 
              size="sm"
              className={`p-1.5 sm:p-2 h-8 sm:h-10 text-xs sm:text-sm flex flex-col items-center gap-0.5 ${
                hasViewedAnalytics ? "bg-success text-success-foreground hover:bg-success/90" : ""
              }`}
              onClick={() => handleViewAnalytics(visit.id)}
              title="Analytics"
            >
              <BarChart3 size={12} className="sm:size-3.5" />
              <span className="text-xs">Analytics</span>
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              className="p-1.5 sm:p-2 h-8 sm:h-10 text-xs sm:text-sm flex flex-col items-center gap-0.5"
              onClick={() => setShowFeedbackModal(true)}
              title="Feedback - Branding, Retailer Feedback & Competition Insights"
            >
              <MessageSquare size={12} className="sm:size-3.5" />
              <span className="text-xs">Feedback</span>
            </Button>
          </div>

          {(visit.hasOrder || hasOrderToday) && (
            <div className="mt-2 p-2 rounded-lg border border-primary/20 bg-primary/5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {selectedDate 
                    ? `${new Date(selectedDate).toDateString() === new Date().toDateString() ? "Today's" : new Date(selectedDate).toLocaleDateString()} Order`
                    : "Today's Order"}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7"
                  onClick={async () => {
                    const next = !orderPreviewOpen;
                    setOrderPreviewOpen(next);
                    if (next && lastOrderItems.length === 0) {
                      await loadLastOrder();
                    }
                  }}
                >
                  {orderPreviewOpen ? 'Hide' : 'View'}
                </Button>
              </div>
              {orderPreviewOpen && (
                <div className="mt-2 space-y-1">
                  {loadingOrder && <div className="text-xs text-muted-foreground">Loading...</div>}
                  {!loadingOrder && lastOrderItems.length === 0 && (
                    <div className="text-xs text-muted-foreground">No items found.</div>
                  )}
                  {!loadingOrder && lastOrderItems.map((it, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs">
                      <span className="truncate pr-2">{it.product_name}</span>
                      <div className="whitespace-nowrap text-right">
                        <div className="flex flex-col">
                          <span className="font-medium">{it.quantity} x ₹{it.actualRate.toFixed(2)}</span>
                          {it.actualRate !== it.rate && (
                            <span className="text-xs text-muted-foreground line-through">₹{it.rate.toFixed(2)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Hidden file input for photo capture */}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          ref={fileInputRef}
          onChange={handlePhotoSelected}
        />

        {/* Location Modal */}
        <Dialog open={showLocationModal} onOpenChange={setShowLocationModal}>
          <DialogContent className="w-[95%] max-w-sm mx-auto rounded-lg">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold text-center">Location Options</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-4">
                <Button
                  onClick={() => handleCheckInOut('checkin')}
                  className={`w-full h-12 text-base font-medium ${
                    isCheckedIn || !isTodaysVisit
                      ? 'bg-muted text-muted-foreground cursor-not-allowed' 
                      : 'bg-primary hover:bg-primary/90'
                  }`}
                  disabled={isCheckedIn || !isTodaysVisit}
                >
                <LogIn className="mr-2 h-5 w-5" />
                {isCheckedIn ? 'Checked In' : 'Check In'}
              </Button>
              <Button
                onClick={() => handleCheckInOut('checkout')}
                className={`w-full h-12 text-base font-medium ${
                  isCheckedOut
                    ? 'bg-success text-success-foreground hover:bg-success/90 border-success'
                    : !isCheckedIn || !isTodaysVisit
                      ? 'bg-muted text-muted-foreground cursor-not-allowed border-muted' 
                      : 'border-primary text-primary hover:bg-primary hover:text-primary-foreground'
                }`}
                variant={isCheckedOut ? "default" : "outline"}
                disabled={!isCheckedIn || isCheckedOut || !isTodaysVisit}
              >
                <LogOut className="mr-2 h-5 w-5" />
                {isCheckedOut ? 'Checked Out' : 'Check Out'}
              </Button>
              
              <div className="pt-2 border-t">
                {!showReasonInput && !proceedWithoutCheckIn && !isCheckedIn && (
                  <button
                    onClick={() => setShowReasonInput(true)}
                    className="w-full text-sm text-primary hover:underline text-center py-2"
                  >
                    Click here to proceed without Check-in
                  </button>
                )}
                
                {showReasonInput && !proceedWithoutCheckIn && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Reason for proceeding without check-in:
                      </label>
                      <textarea
                        value={skipCheckInReason}
                        onChange={(e) => setSkipCheckInReason(e.target.value)}
                        className="w-full min-h-[80px] p-2 text-sm border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Enter your reason here..."
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          setShowReasonInput(false);
                          setSkipCheckInReason('');
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={async () => {
                          if (skipCheckInReason.trim()) {
                            try {
                              const { data: { user } } = await supabase.auth.getUser();
                              if (user) {
                                const today = new Date().toISOString().split('T')[0];
                                const retailerId = visit.retailerId || visit.id;
                                const visitId = await ensureVisit(user.id, retailerId, today);
                                
                                // Update visit with skip check-in reason and set to in-progress
                                await supabase
                                  .from('visits')
                                  .update({ 
                                    status: 'in-progress',
                                    skip_check_in_reason: skipCheckInReason,
                                    skip_check_in_time: new Date().toISOString()
                                  } as any)
                                  .eq('id', visitId);
                              }
                              
                              setProceedWithoutCheckIn(true);
                              setPhase('in-progress');
                              setIsCheckedIn(true);
                              setShowLocationModal(false);
                              setShowReasonInput(false);
                              toast({
                                title: 'Proceeding without check-in',
                                description: 'You can now access Order and No Order options.',
                              });
                            } catch (err: any) {
                              console.error('Skip check-in error:', err);
                              toast({
                                title: 'Error',
                                description: 'Failed to record skip check-in reason.',
                                variant: 'destructive'
                              });
                            }
                          } else {
                            toast({
                              title: 'Reason required',
                              description: 'Please enter a reason to proceed.',
                              variant: 'destructive'
                            });
                          }
                        }}
                        disabled={!skipCheckInReason.trim()}
                      >
                        Submit
                      </Button>
                    </div>
                  </div>
                )}
                
                {proceedWithoutCheckIn && (
                  <div className="text-sm text-center py-2 text-muted-foreground">
                    Proceeding without check-in
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modals */}
        <NoOrderModal
          isOpen={showNoOrderModal}
          onClose={() => setShowNoOrderModal(false)}
          onReasonSelect={handleNoOrderReasonSelect}
          currentReason={noOrderReason}
        />

        {/* Unified Feedback Modal with Tabs */}
        {showFeedbackModal && feedbackActiveTab === "retailer-feedback" && (
          <RetailerFeedbackModal
            isOpen={true}
            onClose={() => setShowFeedbackModal(false)}
            onBack={() => setFeedbackActiveTab("menu")}
            visitId={currentVisitId || visit.id}
            retailerId={(visit.retailerId || visit.id) as string}
            retailerName={visit.retailerName}
          />
        )}

        {showFeedbackModal && feedbackActiveTab === "competition" && (
          <CompetitionInsightModal
            isOpen={true}
            onClose={() => setShowFeedbackModal(false)}
            onBack={() => setFeedbackActiveTab("menu")}
            visitId={currentVisitId || visit.id}
            retailerId={(visit.retailerId || visit.id) as string}
            retailerName={visit.retailerName}
          />
        )}

        {showFeedbackModal && feedbackActiveTab === "branding" && (
          <BrandingRequestModal
            isOpen={true}
            onClose={() => setShowFeedbackModal(false)}
            onBack={() => setFeedbackActiveTab("menu")}
            defaultVisitId={currentVisitId}
            defaultRetailerId={(visit.retailerId || visit.id) as string}
            defaultPincode={null}
          />
        )}

        {/* Tab Selector Modal */}
        <Dialog open={showFeedbackModal && !['retailer-feedback', 'competition', 'branding'].includes(feedbackActiveTab)} onOpenChange={(open) => {
          if (!open) setShowFeedbackModal(false);
        }}>
          <DialogContent className="max-w-[95vw] sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold">Feedback Options</DialogTitle>
              <p className="text-sm text-muted-foreground">{visit.retailerName}</p>
            </DialogHeader>
            <div className="grid gap-3 py-4">
              <Button
                variant="outline"
                className="h-16 flex flex-col items-center gap-2"
                onClick={() => setFeedbackActiveTab("retailer-feedback")}
              >
                <MessageSquare size={24} />
                <div className="text-center">
                  <div className="font-medium">Retailer Feedback</div>
                  <div className="text-xs text-muted-foreground">Share feedback about the retailer</div>
                </div>
              </Button>
              
              <Button
                variant="outline"
                className="h-16 flex flex-col items-center gap-2"
                onClick={() => setFeedbackActiveTab("competition")}
              >
                <Users size={24} />
                <div className="text-center">
                  <div className="font-medium">Competition Insight</div>
                  <div className="text-xs text-muted-foreground">Record competitor information</div>
                </div>
              </Button>
              
              <Button
                variant="outline"
                className="h-16 flex flex-col items-center gap-2"
                onClick={() => setFeedbackActiveTab("branding")}
              >
                <Paintbrush size={24} />
                <div className="text-center">
                  <div className="font-medium">Branding Request</div>
                  <div className="text-xs text-muted-foreground">Request branding materials</div>
                </div>
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <StockCycleModal
          isOpen={showStockCycleModal}
          onClose={() => setShowStockCycleModal(false)}
          visitId={currentVisitId || visit.id}
          retailerId={(visit.retailerId || visit.id) as string}
          retailerName={visit.retailerName}
        />

        {/* Analytics Modal */}
        <AnalyticsModal
          isOpen={showAnalyticsModal}
          onClose={() => setShowAnalyticsModal(false)}
          visitId={currentVisitId || visit.id}
          retailerId={(visit.retailerId || visit.id) as string}
          retailerName={visit.retailerName}
          onViewDetails={onViewDetails}
        />

        {/* Stock Data Modal */}
        <StockDataModal
          isOpen={showStockDataModal}
          onClose={() => setShowStockDataModal(false)}
          retailerId={(visit.retailerId || visit.id) as string}
          retailerName={visit.retailerName}
        />
      </CardContent>
    </Card>
  );
};
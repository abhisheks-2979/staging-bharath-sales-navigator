import { MapPin, Phone, Store, ShoppingCart, XCircle, BarChart3, Check, Users, MessageSquare, Paintbrush, Camera, LogIn, LogOut, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { toast } from "@/hooks/use-toast";
import { CompetitionInsightModal } from "./CompetitionInsightModal";
import { RetailerFeedbackModal } from "./RetailerFeedbackModal";
import { NoOrderModal } from "./NoOrderModal";
import { supabase } from "@/integrations/supabase/client";
import BrandingRequestModal from "./BrandingRequestModal";
import { StockCycleModal } from "./StockCycleModal";
import { StockCycleTable } from "./StockCycleTable";

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
  const [showCompetitionModal, setShowCompetitionModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showBrandingModal, setShowBrandingModal] = useState(false);
  const [showStockCycleModal, setShowStockCycleModal] = useState(false);
  const [showStockCycleTable, setShowStockCycleTable] = useState(false);
  const [hasViewedAnalytics, setHasViewedAnalytics] = useState(false);
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingPhotoActionRef = useRef<'checkin' | 'checkout' | null>(null);
  
  // Check if the selected date is today's date
  const isTodaysVisit = selectedDate === new Date().toISOString().split('T')[0];
  
  // Check if user has viewed analytics for this visit and check-in status
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const { data: user } = await supabase.auth.getUser();
        if (user.user) {
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
          const today = new Date().toISOString().split('T')[0];
          const retailerId = visit.retailerId || visit.id;
          const { data: visitData } = await supabase
            .from('visits')
            .select('id, check_in_time, check_out_time, status')
            .eq('user_id', user.user.id)
            .eq('retailer_id', retailerId)
            .eq('planned_date', today)
            .maybeSingle();

          if (visitData) {
            setIsCheckedIn(!!visitData.check_in_time);
            setIsCheckedOut(!!visitData.check_out_time);
            if (visitData.status === 'unproductive') {
              setIsNoOrderMarked(true);
              setPhase('completed');
            }
            if (visitData.check_in_time && !visitData.check_out_time && visitData.status === 'in-progress') {
              setPhase('in-progress');
            } else if (visitData.check_out_time || visitData.status === 'unproductive' || visitData.status === 'productive') {
              setPhase('completed');
            }
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
            .eq('retailer_id', retailerId)
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
  }, [visit.id, visit.retailerId]);

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
            const today = new Date().toISOString().split('T')[0];
            const { data: userData } = await supabase.auth.getUser();
            if (userData.user) {
              const { data: visitData } = await supabase
                .from('visits')
                .select('id, status, check_in_time')
                .eq('user_id', userData.user.id)
                .eq('retailer_id', retailerId)
                .eq('planned_date', today)
                .maybeSingle();

              if (visitData?.check_in_time && visitData.status === 'in-progress') {
                await supabase
                  .from('visits')
                  .update({ status: 'productive' })
                  .eq('id', visitData.id);
              }
              setHasOrderToday(true);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    setupListener();
  }, [visit.retailerId, visit.id]);

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
    if (isCheckedIn) {
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
    navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 15000 });
  });

  const ensureVisit = async (userId: string, retailerId: string, date: string) => {
    const { data, error } = await supabase
      .from('visits')
      .select('id, status, check_in_time, location_match_in, location_match_out')
      .eq('user_id', userId)
      .eq('retailer_id', retailerId)
      .eq('planned_date', date)
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: 'Login required', description: 'Please sign in to record visits.', variant: 'destructive' });
        return;
      }

      const today = new Date().toISOString().split('T')[0];
      const retailerId = visit.retailerId || visit.id;
      const visitId = await ensureVisit(user.id, retailerId, today);

      const pos = await getPosition();
      const current = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };

      let match: boolean | null = null;
      if (typeof visit.retailerLat === 'number' && typeof visit.retailerLng === 'number') {
        const dist = distanceMeters(current.latitude, current.longitude, visit.retailerLat, visit.retailerLng);
        match = dist <= 150; // within 150 meters
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
        // Update visits table
        const { error } = await supabase
          .from('visits')
          .update({
            check_in_time: timestamp,
            check_in_location: current,
            check_in_address: address,
            location_match_in: match,
            status: 'in-progress'
          })
          .eq('id', visitId);
        if (error) throw error;

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
        toast({ title: 'Checked in', description: match === false ? 'Location mismatch' : 'Location verified' });
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
    if (!isCheckedIn && isTodaysVisit) {
      toast({ 
        title: 'Check-in Required', 
        description: 'Please check in first to mark no order.',
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
    
    onViewDetails(visitId);
  };

  const handleOpenBranding = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: 'Login required', description: 'Please sign in to create branding requests.', variant: 'destructive' });
        return;
      }
      const today = new Date().toISOString().split('T')[0];
      const retailerId = visit.retailerId || visit.id;
      const visitId = await ensureVisit(user.id, retailerId, today);
      setCurrentVisitId(visitId);
      setShowBrandingModal(true);
    } catch (err: any) {
      console.error('Open branding modal error', err);
      toast({ title: 'Unable to open', description: err.message || 'Try again.', variant: 'destructive' });
    }
  };

  const loadLastOrder = async () => {
    try {
      if (loadingOrder) return;
      setLoadingOrder(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoadingOrder(false); return; }
      const retailerId = (visit.retailerId || visit.id) as string;
      const todayStart = new Date();
      todayStart.setHours(0,0,0,0);
      const todayEnd = new Date();
      todayEnd.setHours(23,59,59,999);

      const { data: orders } = await supabase
        .from('orders')
        .select('id')
        .eq('user_id', user.id)
        .eq('retailer_id', retailerId)
        .eq('status', 'confirmed')
        .gte('created_at', todayStart.toISOString())
        .lte('created_at', todayEnd.toISOString());

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
            <h3 className="font-semibold text-card-foreground text-sm sm:text-base truncate">{visit.retailerName}</h3>
            {visit.distributor && (
              <div className="flex items-center gap-1 text-xs sm:text-sm text-muted-foreground mt-1">
                <Store size={12} className="sm:size-3.5 flex-shrink-0" />
                <span className="truncate">{visit.distributor}</span>
              </div>
            )}
          </div>
          <div className="flex sm:flex-col items-start sm:items-end gap-2 sm:gap-1">
            <Badge className={`${getStatusColor(visit.status)} text-xs px-2 py-1`}>
              {getStatusText(visit.status)}
            </Badge>
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
                title="View today's order"
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
          {/* First row - Check-in/Order actions */}
          <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
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
              } ${(isNoOrderMarked || !isCheckedIn || !isTodaysVisit) ? "opacity-50 cursor-not-allowed" : ""}`}
              onClick={async () => {
                if (!isCheckedIn && isTodaysVisit) {
                  toast({ 
                    title: 'Check-in Required', 
                    description: 'Please check in first to place an order.',
                    variant: 'destructive' 
                  });
                  return;
                }
                if (isNoOrderMarked || !isCheckedIn || !isTodaysVisit) return;
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
              title={`${!isCheckedIn ? "Check in first to place order" : isNoOrderMarked ? "Disabled - No Order Marked" : `Order${visit.orderValue || hasOrderToday ? ` (₹${visit.orderValue ? visit.orderValue.toLocaleString() : 'Order Placed'})` : ""}`}`}
            >
              <ShoppingCart size={12} className="sm:size-3.5" />
              <span className="text-xs">Order</span>
            </Button>
            
            <Button 
              variant={isNoOrderMarked ? "default" : "outline"}
              size="sm"
              className={`p-1.5 sm:p-2 h-8 sm:h-10 text-xs sm:text-sm flex flex-col items-center gap-0.5 ${
                isNoOrderMarked ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""
              } ${(isNoOrderMarked || hasOrderToday || !isCheckedIn || !isTodaysVisit) ? "opacity-50 cursor-not-allowed" : ""}`}
              onClick={handleNoOrderClick}
              disabled={isNoOrderMarked || hasOrderToday || !isCheckedIn || !isTodaysVisit}
              title={
                !isCheckedIn
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
          </div>

          {/* Second row - Feedback actions */}
          <div className="grid grid-cols-4 gap-1 sm:gap-1.5">
            <Button 
              variant="outline" 
              size="sm"
              className="p-1.5 sm:p-2 h-8 sm:h-10 text-xs sm:text-sm flex flex-col items-center gap-0.5"
              onClick={() => setShowCompetitionModal(true)}
              title="Competition Insights"
            >
              <Users size={12} className="sm:size-3.5" />
              <span className="text-xs">Competition</span>
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              className="p-1.5 sm:p-2 h-8 sm:h-10 text-xs sm:text-sm flex flex-col items-center gap-0.5"
              onClick={() => setShowFeedbackModal(true)}
              title="Retailer Feedback"
            >
              <MessageSquare size={12} className="sm:size-3.5" />
              <span className="text-xs">Feedback</span>
            </Button>

            <Button 
              variant="outline" 
              size="sm"
              className="p-1.5 sm:p-2 h-8 sm:h-10 text-xs sm:text-sm flex flex-col items-center gap-0.5"
              onClick={handleOpenBranding}
              title="Branding Request"
            >
              <Paintbrush size={12} className="sm:size-3.5" />
              <span className="text-xs">Branding</span>
            </Button>

            <Button 
              variant="outline" 
              size="sm"
              className="p-1.5 sm:p-2 h-8 sm:h-10 text-xs sm:text-sm flex flex-col items-center gap-0.5"
              onClick={() => setShowStockCycleTable(true)}
              title="Stock Cycle"
            >
              <Package size={12} className="sm:size-3.5" />
              <span className="text-xs">Stock Cycle</span>
            </Button>
          </div>

          {(visit.hasOrder || hasOrderToday) && (
            <div className="mt-2 p-2 rounded-lg border border-primary/20 bg-primary/5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Today's Order</span>
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

        <CompetitionInsightModal
          isOpen={showCompetitionModal}
          onClose={() => setShowCompetitionModal(false)}
          visitId={currentVisitId || visit.id}
          retailerId={(visit.retailerId || visit.id) as string}
          retailerName={visit.retailerName}
        />

        <RetailerFeedbackModal
          isOpen={showFeedbackModal}
          onClose={() => setShowFeedbackModal(false)}
          visitId={currentVisitId || visit.id}
          retailerId={(visit.retailerId || visit.id) as string}
          retailerName={visit.retailerName}
        />

        <BrandingRequestModal
          isOpen={showBrandingModal}
          onClose={() => setShowBrandingModal(false)}
          defaultVisitId={currentVisitId}
          defaultRetailerId={(visit.retailerId || visit.id) as string}
          defaultPincode={null}
        />

        <StockCycleModal
          isOpen={showStockCycleModal}
          onClose={() => setShowStockCycleModal(false)}
          visitId={currentVisitId || visit.id}
          retailerId={(visit.retailerId || visit.id) as string}
          retailerName={visit.retailerName}
        />

        {/* Stock Cycle Table Dialog */}
        <Dialog open={showStockCycleTable} onOpenChange={setShowStockCycleTable}>
          <DialogContent className="w-[95%] max-w-4xl mx-auto max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold">Stock Cycle Tracking</DialogTitle>
            </DialogHeader>
            <StockCycleTable
              retailerId={(visit.retailerId || visit.id) as string}
              retailerName={visit.retailerName}
              currentVisitId={currentVisitId || visit.id}
            />
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
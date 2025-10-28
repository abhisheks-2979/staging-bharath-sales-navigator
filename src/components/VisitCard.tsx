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
import { RetailerAnalytics } from "./RetailerAnalytics";

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
  lastVisitDate?: string;
  priority?: "high" | "medium" | "low";
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
  const [showRetailerAnalytics, setShowRetailerAnalytics] = useState(false);
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
  const [pendingAmount, setPendingAmount] = useState<number>(0);
  const [isCreditOrder, setIsCreditOrder] = useState(false);
  const [creditPendingAmount, setCreditPendingAmount] = useState<number>(0);
  const [creditPaidAmount, setCreditPaidAmount] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingPhotoActionRef = useRef<'checkin' | 'checkout' | null>(null);
  const pendingCheckDataRef = useRef<{
    action: 'checkin' | 'checkout';
    timestamp: string;
    current: { latitude: number; longitude: number };
    address: string;
    match: boolean | null;
    visitId: string;
    userId: string;
    retailerId: string;
    today: string;
  } | null>(null);
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

          // Fetch pending amount for this retailer
          const { data: retailerData, error: retailerError } = await supabase
            .from('retailers')
            .select('pending_amount')
            .eq('id', visitRetailerId)
            .maybeSingle();

          if (!retailerError && retailerData?.pending_amount) {
            setPendingAmount(Number(retailerData.pending_amount));
          } else {
            setPendingAmount(0);
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
            .select('id, check_in_time, check_out_time, status, skip_check_in_reason, skip_check_in_time')
            .eq('user_id', user.user.id)
            .eq('retailer_id', visitRetailerId)
            .eq('planned_date', today)
            .maybeSingle();

          console.log('Visit data from DB:', visitData);
          if (visitData) {
            const skippedCheckIn = !!(visitData as any).skip_check_in_reason || !!(visitData as any).skip_check_in_time;
            const checkedIn = ((visitData as any).status === 'in-progress') || !!(visitData as any).check_in_time || skippedCheckIn;
            const checkedOut = !!(visitData as any).check_out_time;
            console.log('Setting state - isCheckedIn:', checkedIn, 'isCheckedOut:', checkedOut, 'skippedCheckIn:', skippedCheckIn);
            setIsCheckedIn(checkedIn);
            setIsCheckedOut(checkedOut);
            setProceedWithoutCheckIn(skippedCheckIn);
            if (skippedCheckIn) {
              setSkipCheckInReason((visitData as any).skip_check_in_reason || 'phone-order');
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
            .select('id, total_amount, is_credit_order, credit_pending_amount, credit_paid_amount')
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
            
            // Check if any order is a credit order and get credit details
            const creditOrder = ordersToday.find(order => order.is_credit_order);
            if (creditOrder) {
              setIsCreditOrder(true);
              setCreditPendingAmount(Number(creditOrder.credit_pending_amount || 0));
              setCreditPaidAmount(Number(creditOrder.credit_paid_amount || 0));
            } else {
              setIsCreditOrder(false);
              setCreditPendingAmount(0);
              setCreditPaidAmount(0);
            }
            
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
            setIsCreditOrder(false);
            setCreditPendingAmount(0);
            setCreditPaidAmount(0);
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
                // Get order time for auto check-out
                const orderTime = createdAt || new Date().toISOString();
                
                // Auto check-out the visit when order is placed
                await supabase
                  .from('visits')
                  .update({ 
                    status: 'productive', 
                    no_order_reason: null,
                    check_out_time: orderTime
                  })
                  .eq('id', visitData.id);
              }
              setHasOrderToday(true);
              setIsNoOrderMarked(false);
              setNoOrderReason('');
              setIsCheckedOut(true);
              setPhase('completed');
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
        // Show order value if available, otherwise just "Productive"
        return actualOrderValue > 0 ? `₹${actualOrderValue.toLocaleString()}` : "Productive";
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
      .select('id, status, check_in_time, location_match_in, location_match_out, skip_check_in_reason, skip_check_in_time')
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
      if (data.check_in_time || (data as any).skip_check_in_time) {
        setPhase('in-progress');
        setIsCheckedIn(true);
      }
      if (data.location_match_in != null) setLocationMatchIn(data.location_match_in);
      if (data.location_match_out != null) setLocationMatchOut(data.location_match_out);
      if ((data as any).skip_check_in_reason || (data as any).skip_check_in_time) {
        setProceedWithoutCheckIn(true);
        setSkipCheckInReason((data as any).skip_check_in_reason || 'phone-order');
        setIsCheckedIn(true);
      }
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
      const action = pendingPhotoActionRef.current;
      const checkData = pendingCheckDataRef.current;
      
      // If no file selected, show error and clear
      if (!file) {
        toast({
          title: 'Photo required',
          description: 'You must take a photo to complete check-in/out',
          variant: 'destructive'
        });
        pendingPhotoActionRef.current = null;
        pendingCheckDataRef.current = null;
        return;
      }

      if (!action || !checkData) {
        pendingPhotoActionRef.current = null;
        pendingCheckDataRef.current = null;
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        pendingPhotoActionRef.current = null;
        pendingCheckDataRef.current = null;
        return;
      }

      const { visitId, userId, retailerId, today, timestamp, current, address, match } = checkData;

      // Upload photo first
      const path = `${userId}/${visitId}-${action}-${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('visit-photos')
        .upload(path, file, { contentType: file.type || 'image/jpeg', upsert: false });
      
      if (uploadError) {
        console.error('Photo upload error:', uploadError);
        toast({ 
          title: 'Photo upload failed', 
          description: 'Could not upload photo. Please try again.', 
          variant: 'destructive' 
        });
        pendingPhotoActionRef.current = null;
        pendingCheckDataRef.current = null;
        return;
      }

      // NOW save check-in/out data with photo
      if (action === 'checkin') {
        // Auto check-out any previous in-progress visits
        await autoCheckOutPreviousVisit(userId, retailerId, today);

        // Update visit with check-in data INCLUDING photo
        const { error } = await supabase
          .from('visits')
          .update({
            check_in_time: timestamp,
            check_in_location: current,
            check_in_address: address,
            check_in_photo_url: path,
            location_match_in: match,
            status: 'in-progress'
          })
          .eq('id', visitId);
        
        if (error) throw error;

        // Update attendance record with photo
        const { error: attendanceError } = await supabase
          .from('attendance')
          .upsert({
            user_id: userId,
            date: today,
            check_in_time: timestamp,
            check_in_location: current,
            check_in_address: address,
            check_in_photo_url: path,
            status: 'present'
          }, { onConflict: 'user_id,date' });
        
        if (attendanceError) console.error('Attendance check-in error:', attendanceError);

        // Update UI state
        setPhase('in-progress');
        setLocationMatchIn(match);
        setIsCheckedIn(true);
        window.dispatchEvent(new CustomEvent('visitStatusChanged', { 
          detail: { visitId: visitId, status: 'in-progress', retailerId: retailerId } 
        }));
        
        toast({ 
          title: 'Checked in successfully', 
          description: match === false ? 'Location mismatch detected' : 'Location verified' 
        });

      } else {
        // Check-out process
        const todayStart = new Date(today); todayStart.setHours(0,0,0,0);
        const todayEnd = new Date(today); todayEnd.setHours(23,59,59,999);

        const { data: ordersToday } = await supabase
          .from('orders')
          .select('id')
          .eq('user_id', userId)
          .eq('retailer_id', retailerId)
          .eq('status', 'confirmed')
          .gte('created_at', todayStart.toISOString())
          .lte('created_at', todayEnd.toISOString())
          .limit(1);

        const finalStatus = (ordersToday && ordersToday.length > 0) ? 'productive' : 'unproductive';

        // Update visit with check-out data INCLUDING photo
        const { error } = await supabase
          .from('visits')
          .update({
            check_out_time: timestamp,
            check_out_location: current,
            check_out_address: address,
            check_out_photo_url: path,
            location_match_out: match,
            status: finalStatus
          })
          .eq('id', visitId);
        
        if (error) throw error;

        // Update attendance with check-out
        const { data: attendanceData } = await supabase
          .from('attendance')
          .select('check_in_time')
          .eq('user_id', userId)
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
              check_out_photo_url: path,
              total_hours: totalHours
            })
            .eq('user_id', userId)
            .eq('date', today);
          
          if (attendanceError) console.error('Attendance check-out error:', attendanceError);
        }

        // Update UI state
        setPhase('completed');
        setLocationMatchOut(match);
        setIsCheckedOut(true);
        
        toast({ 
          title: 'Checked out successfully', 
          description: match === false ? 'Location mismatch detected' : 'Visit completed' 
        });
      }

      pendingPhotoActionRef.current = null;
      pendingCheckDataRef.current = null;
    } catch (err: any) {
      console.error('Photo processing error', err);
      toast({ 
        title: 'Check-in/out failed', 
        description: err.message || 'Could not complete the operation. Please try again.', 
        variant: 'destructive' 
      });
      pendingPhotoActionRef.current = null;
      pendingCheckDataRef.current = null;
    }
  };

  const handleLocationClick = () => {
    setShowLocationModal(true);
  };

  // Helper function to calculate distance between two GPS coordinates
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  };

  const autoCheckOutPreviousVisit = async (userId: string, currentRetailerId: string, today: string) => {
    try {
      // Find any in-progress visit at a different retailer for today
      const { data: inProgressVisits } = await supabase
        .from('visits')
        .select('id, retailer_id, check_in_time')
        .eq('user_id', userId)
        .eq('planned_date', today)
        .eq('status', 'in-progress')
        .neq('retailer_id', currentRetailerId);

      if (inProgressVisits && inProgressVisits.length > 0) {
        for (const prevVisit of inProgressVisits) {
          console.log('Auto checking out previous visit:', prevVisit.id);
          
          // Get the last order for this visit to determine check-out time
          const { data: lastOrder } = await supabase
            .from('orders')
            .select('created_at')
            .eq('user_id', userId)
            .eq('retailer_id', prevVisit.retailer_id)
            .eq('status', 'confirmed')
            .gte('created_at', `${today}T00:00:00.000Z`)
            .lte('created_at', `${today}T23:59:59.999Z`)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          // Use last order time or current time for checkout
          const checkOutTime = lastOrder?.created_at || new Date().toISOString();
          
          // Check if there are any orders for this visit
          const { data: ordersForVisit } = await supabase
            .from('orders')
            .select('id')
            .eq('user_id', userId)
            .eq('retailer_id', prevVisit.retailer_id)
            .eq('status', 'confirmed')
            .gte('created_at', `${today}T00:00:00.000Z`)
            .lte('created_at', `${today}T23:59:59.999Z`)
            .limit(1);

          const finalStatus = (ordersForVisit && ordersForVisit.length > 0) ? 'productive' : 'unproductive';

          // Auto check-out the previous visit
          await supabase
            .from('visits')
            .update({
              check_out_time: checkOutTime,
              status: finalStatus
            })
            .eq('id', prevVisit.id);

          console.log(`Auto checked out visit ${prevVisit.id} at ${checkOutTime} with status ${finalStatus}`);
        }
      }
    } catch (error) {
      console.error('Error auto checking out previous visit:', error);
    }
  };

  const handleCheckInOut = async (action: 'checkin' | 'checkout') => {
    try {
      console.log(`Starting ${action} process...`);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: 'Login required', description: 'Please sign in to record visits.', variant: 'destructive' });
        return;
      }

      // Check if geolocation is supported
      if (!navigator.geolocation) {
        toast({ 
          title: 'Location not supported', 
          description: 'Your device does not support location services.',
          variant: 'destructive' 
        });
        return;
      }

      const timestamp = new Date().toISOString();
      const today = timestamp.split('T')[0];
      const retailerId = visit.retailerId || visit.id;
      
      // Ensure visit exists and get visit ID
      const visitId = await ensureVisit(user.id, retailerId, today);
      setCurrentVisitId(visitId);

      // Get current location with better error handling
      let current: { latitude: number; longitude: number };
      try {
        current = await new Promise<{ latitude: number; longitude: number }>((resolve, reject) => {
          const timeoutId = setTimeout(() => {
            reject(new Error('Location request timed out. Please ensure location services are enabled.'));
          }, 15000);

          navigator.geolocation.getCurrentPosition(
            (position) => {
              clearTimeout(timeoutId);
              resolve({ 
                latitude: position.coords.latitude, 
                longitude: position.coords.longitude 
              });
            },
            (error) => {
              clearTimeout(timeoutId);
              let errorMessage = 'Unable to get your location.';
              
              switch(error.code) {
                case error.PERMISSION_DENIED:
                  errorMessage = 'Location permission denied. Please enable location access in your device settings.';
                  break;
                case error.POSITION_UNAVAILABLE:
                  errorMessage = 'Location information is unavailable. Please check your GPS settings.';
                  break;
                case error.TIMEOUT:
                  errorMessage = 'Location request timed out. Please try again.';
                  break;
              }
              
              reject(new Error(errorMessage));
            },
            { 
              enableHighAccuracy: true, 
              timeout: 15000, 
              maximumAge: 0 
            }
          );
        });
      } catch (locationError: any) {
        toast({ 
          title: 'Location Error', 
          description: locationError.message || 'Failed to get location. Please enable location services.',
          variant: 'destructive' 
        });
        return;
      }

      const address = `${current.latitude.toFixed(6)}, ${current.longitude.toFixed(6)}`;
      let match: boolean | null = null;
      
      if (visit.retailerLat && visit.retailerLng) {
        const distance = calculateDistance(current.latitude, current.longitude, visit.retailerLat, visit.retailerLng);
        match = distance <= 100;
      }

      // Store pending check data for after photo capture
      pendingPhotoActionRef.current = action;
      pendingCheckDataRef.current = { action, timestamp, current, address, match, visitId, userId: user.id, retailerId, today };
      
      // Close location modal and trigger photo capture
      setShowLocationModal(false);
      
      // Request photo capture with clear message
      toast({ 
        title: 'Photo Required', 
        description: `Please take a photo to complete ${action === 'checkin' ? 'check-in' : 'check-out'}`,
        duration: 3000
      });
      
      // Trigger file input to open camera
      setTimeout(() => {
        fileInputRef.current?.click();
      }, 300);

    } catch (err: any) {
      console.error('Check-in/out error', err);
      
      // Provide user-friendly error messages
      let errorTitle = action === 'checkin' ? 'Check-in failed' : 'Check-out failed';
      let errorDescription = err.message || 'An unexpected error occurred. Please try again.';
      
      // Handle specific error types
      if (err.message?.includes('Location') || err.message?.includes('GPS')) {
        errorDescription = err.message;
      } else if (err.message?.includes('permission')) {
        errorDescription = 'Please enable location and camera permissions in your device settings.';
      } else if (err.message?.includes('timeout') || err.message?.includes('timed out')) {
        errorDescription = 'Request timed out. Please check your GPS and internet connection, then try again.';
      }
      
      toast({ 
        title: errorTitle, 
        description: errorDescription,
        variant: 'destructive' 
      });
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
        
        // Auto check-out when marking as no order
        const checkOutTime = new Date().toISOString();
        
        // Update visit status to unproductive and store the reason
        const { data, error } = await supabase
          .from('visits')
          .update({ 
            status: 'unproductive',
            no_order_reason: reason,
            check_out_time: checkOutTime
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
        setIsCheckedOut(true);
        
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
          {pendingAmount > 0 && (
            <div className="mb-3 p-2 bg-warning/10 border border-warning/30 rounded-md">
              <p className="text-xs sm:text-sm font-medium text-warning flex items-center gap-1">
                <span>⚠️</span>
                Pending Amount: ₹{pendingAmount.toLocaleString()}
              </p>
            </div>
          )}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
            <div className="flex items-center gap-1 flex-1 min-w-0">
              <MapPin size={12} className="sm:size-3.5 flex-shrink-0" />
<a
  href={`https://www.google.com/maps/search/?api=1&query=${(visit.retailerLat && visit.retailerLng) ? `${visit.retailerLat},${visit.retailerLng}` : encodeURIComponent(visit.address || '')}`}
  target="_blank"
  rel="noopener noreferrer"
  className="truncate text-primary hover:underline cursor-pointer"
  onClick={(e) => e.stopPropagation()}
  title="Open in Google Maps"
>
  {visit.address}
</a>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <a
                href={`tel:${(visit.phone || '').replace(/\s+/g, '')}`}
                className="flex items-center gap-1 text-primary hover:underline cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  const cleaned = (visit.phone || '').replace(/\s+/g, '');
                  if (cleaned) window.location.href = `tel:${cleaned}`;
                }}
                title="Call"
              >
                <Phone size={12} className="sm:size-3.5" />
                <span>{visit.phone}</span>
              </a>
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
              <span className="text-xs">Check-In/Out</span>
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
              
              {/* Credit Order Information */}
              {isCreditOrder && (
                <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Total Amount:</span>
                    <span className="font-semibold">₹{actualOrderValue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-success">Paid Amount:</span>
                    <span className="font-medium text-success">₹{creditPaidAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-warning">Credit Amount:</span>
                    <span className="font-medium text-warning">₹{creditPendingAmount.toLocaleString()}</span>
                  </div>
                </div>
              )}
              
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
              {!isCheckedIn && isTodaysVisit && (
                <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-sm text-blue-800 dark:text-blue-200">
                  <p className="font-medium mb-1">📍 Location & Camera Required</p>
                  <p className="text-xs">Please allow location and camera access when prompted for check-in.</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
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
                  onClick={async () => {
                    try {
                      const { data: { user } } = await supabase.auth.getUser();
                      if (user) {
                        const today = new Date().toISOString().split('T')[0];
                        const retailerId = visit.retailerId || visit.id;
                        
                        // Auto check-out any previous in-progress visit before phone order
                        await autoCheckOutPreviousVisit(user.id, retailerId, today);
                        
                        const visitId = await ensureVisit(user.id, retailerId, today);
                        
                                // Update visit with phone order reason and set to in-progress
                                await supabase
                                  .from('visits')
                                  .update({ 
                                    status: 'in-progress',
                                    skip_check_in_reason: 'phone-order',
                                    skip_check_in_time: new Date().toISOString()
                                  } as any)
                                  .eq('id', visitId);
                                
                                // Dispatch event to notify parent components
                                window.dispatchEvent(new CustomEvent('visitStatusChanged', { 
                                  detail: { visitId, status: 'in-progress', retailerId } 
                                }));
                              }
                              
                              setProceedWithoutCheckIn(true);
                              setSkipCheckInReason('phone-order');
                              setPhase('in-progress');
                              setIsCheckedIn(true);
                              setShowLocationModal(false);
                              setShowReasonInput(false);
                              toast({
                                title: 'Phone Order',
                                description: 'You can now record order or no order.',
                              });
                    } catch (err: any) {
                      console.error('Phone order error:', err);
                      toast({
                        title: 'Error',
                        description: 'Failed to proceed with phone order.',
                        variant: 'destructive'
                      });
                    }
                  }}
                  variant={isCheckedIn || !isTodaysVisit ? "outline" : "default"}
                  className={`w-full h-12 text-base font-medium ${
                    isCheckedIn || !isTodaysVisit
                      ? 'bg-muted text-muted-foreground cursor-not-allowed' 
                      : 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600'
                  }`}
                  disabled={isCheckedIn || !isTodaysVisit}
                >
                  <Phone className="mr-2 h-5 w-5" />
                  Phone Order
                </Button>
              </div>
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
                                
                                // Auto check-out any previous in-progress visit before proceeding
                                await autoCheckOutPreviousVisit(user.id, retailerId, today);
                                
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
                              
                                setProceedWithoutCheckIn(true);
                                setPhase('in-progress');
                                setIsCheckedIn(true);
                                setShowLocationModal(false);
                                setShowReasonInput(false);
                                
                                // Dispatch event to notify parent components
                                window.dispatchEvent(new CustomEvent('visitStatusChanged', { 
                                  detail: { visitId, status: 'in-progress', retailerId } 
                                }));
                                
                                toast({
                                  title: 'Proceeding without check-in',
                                  description: 'You can now access Order and No Order options.',
                                });
                              }
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

        {/* Retailer Analytics Modal */}
        {showRetailerAnalytics && (
          <RetailerAnalytics
            isOpen={showRetailerAnalytics}
            retailer={{
              id: visit.retailerId || visit.id,
              name: visit.retailerName,
              type: visit.retailerCategory,
              phone: visit.phone,
              address: visit.address,
              lastVisitDate: visit.lastVisitDate,
              isSelected: false,
              priority: visit.priority,
              metrics: {
                avgOrders3Months: actualOrderValue,
                avgOrderPerVisit: actualOrderValue,
                visitsIn3Months: 1
              }
            }}
            onClose={() => setShowRetailerAnalytics(false)}
          />
        )}
      </CardContent>
    </Card>
  );
};
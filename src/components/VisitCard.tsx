import { MapPin, Phone, Store, ShoppingCart, XCircle, BarChart3, Check, Users, MessageSquare, Paintbrush, Camera, LogIn, LogOut, Package, FileText, IndianRupee, Sparkles, Truck, UserCheck, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "@/hooks/use-toast";
import { CompetitionDataForm } from "./CompetitionDataForm";
import { RetailerFeedbackModal } from "./RetailerFeedbackModal";
import { NoOrderModal } from "./NoOrderModal";
import { supabase } from "@/integrations/supabase/client";
import BrandingRequestModal from "./BrandingRequestModal";
import { JointSalesFeedbackModal } from "./JointSalesFeedbackModal";
import { JointSalesFeedbackViewModal } from "./JointSalesFeedbackViewModal";
import { StockCycleModal } from "./StockCycleModal";
import { AnalyticsModal } from "./AnalyticsModal";
import { StockDataModal } from "./StockDataModal";
import { RetailerAnalytics } from "./RetailerAnalytics";
import { VisitInvoicePDFGenerator } from "./VisitInvoicePDFGenerator";
import { PaymentMarkingModal } from "./PaymentMarkingModal";
import { VisitAIInsightsModal } from "./VisitAIInsightsModal";
import { VanSalesModal } from "./VanSalesModal";
import { useVanSales } from "@/hooks/useVanSales";
import { checkUploadSpeed } from "@/utils/internetSpeedCheck";
import { hasRecentUploadErrors, hasRecentUploadAttempts } from "@/utils/uploadErrorChecker";
import { CameraCapture } from "./CameraCapture";
import { useCheckInMandatory } from "@/hooks/useCheckInMandatory";
import { useLocationFeature } from "@/hooks/useLocationFeature";
import { useRetailerVisitTracking } from "@/hooks/useRetailerVisitTracking";
import { RetailerVisitDetailsModal } from "./RetailerVisitDetailsModal";
import { CreditScoreDisplay } from "./CreditScoreDisplay";
import { offlineStorage, STORES } from "@/lib/offlineStorage";
import { visitStatusCache } from "@/lib/visitStatusCache";
import { retailerStatusRegistry } from "@/lib/retailerStatusRegistry";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/useAuth";
import { RetailerDetailModal } from "./RetailerDetailModal";
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
export const VisitCard = ({
  visit,
  onViewDetails,
  selectedDate
}: VisitCardProps) => {
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
  const [lastOrderItems, setLastOrderItems] = useState<Array<{
    product_name: string;
    quantity: number;
    rate: number;
    actualRate: number;
  }>>([]);
  const [loadingOrder, setLoadingOrder] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [isNoOrderMarked, setIsNoOrderMarked] = useState(!!visit.noOrderReason);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [isCheckedOut, setIsCheckedOut] = useState(false);
  const [isJointSalesVisit, setIsJointSalesVisit] = useState(false);
  const [jointSalesMemberId, setJointSalesMemberId] = useState<string | null>(null);
  const [beatPlanId, setBeatPlanId] = useState<string | null>(null);
  const [showJointSalesFeedback, setShowJointSalesFeedback] = useState(false);
  const [jointSalesChecked, setJointSalesChecked] = useState(false);
  const [hasJointSalesFeedback, setHasJointSalesFeedback] = useState(false);
  const [showJointSalesFeedbackView, setShowJointSalesFeedbackView] = useState(false);
  const { user } = useAuth();
  const [hasOrderToday, setHasOrderToday] = useState(!!visit.hasOrder);
  const [actualOrderValue, setActualOrderValue] = useState<number>(0);
  const [distributorName, setDistributorName] = useState<string>('');
  const [hasStockRecords, setHasStockRecords] = useState(false);
  const [stockRecordCount, setStockRecordCount] = useState(0);
  const [pendingAmount, setPendingAmount] = useState<number>(0);
  const [pendingSinceDate, setPendingSinceDate] = useState<string | null>(null);
  const [isCreditOrder, setIsCreditOrder] = useState(false);
  const [creditPendingAmount, setCreditPendingAmount] = useState<number>(0);
  const [creditPaidAmount, setCreditPaidAmount] = useState<number>(0);
  const [paidTodayAmount, setPaidTodayAmount] = useState<number>(0);
  const [ordersTodayList, setOrdersTodayList] = useState<Array<{
    id: string;
    created_at: string;
    total_amount: number;
    is_credit_order: boolean;
    credit_paid_amount: number;
  }>>([]);
  const [previousPendingCleared, setPreviousPendingCleared] = useState<number>(0);
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCameraCapture, setShowCameraCapture] = useState(false);
  const pendingPhotoActionRef = useRef<'checkin' | 'checkout' | null>(null);
  const pendingCheckDataRef = useRef<{
    action: 'checkin' | 'checkout';
    timestamp: string;
    current: {
      latitude: number;
      longitude: number;
    };
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
  const [skipCheckInReasonType, setSkipCheckInReasonType] = useState<string>('');
  const [showAIInsights, setShowAIInsights] = useState(false);
  const [showVanSales, setShowVanSales] = useState(false);
  const [showRetailerOverview, setShowRetailerOverview] = useState(false);
  const [retailerOverviewData, setRetailerOverviewData] = useState<any>(null);
  const {
    isVanSalesEnabled
  } = useVanSales();
  const {
    isCheckInMandatory
  } = useCheckInMandatory();
  const {
    isLocationEnabled,
    loading: locationFeatureLoading
  } = useLocationFeature();

  // Get user ID for visit tracking
  const [userId, setUserId] = useState<string>('');
  useEffect(() => {
    const getUserId = async () => {
      // Use getSession() for offline support (reads from localStorage cache)
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) setUserId(session.user.id);
    };
    getUserId();
  }, []);

  // Visit tracking hook
  const {
    currentLog,
    locationStatus: trackingLocationStatus,
    distance: trackingDistance,
    timeSpent,
    formattedTimeSpent,
    startTracking,
    endTracking,
    endAllActiveLogs
  } = useRetailerVisitTracking({
    retailerId: visit.retailerId || visit.id,
    retailerLat: visit.retailerLat,
    retailerLng: visit.retailerLng,
    visitId: currentVisitId || undefined,
    userId,
    selectedDate
  });

  // Handle logout - end all active logs
  useEffect(() => {
    const handleLogout = async () => {
      await endAllActiveLogs();
    };

    // Listen for auth state changes (logout)
    const {
      data: {
        subscription
      }
    } = supabase.auth.onAuthStateChange(event => {
      if (event === 'SIGNED_OUT') {
        handleLogout();
      }
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [endAllActiveLogs]);
  const [showVisitDetailsModal, setShowVisitDetailsModal] = useState(false);
  
  // SYNC CACHE READ: Try to get status from cache OR use prop if it has final status
  // This prevents the flicker where status shows "planned" before cache is loaded
  const getInitialStatus = (): "planned" | "in-progress" | "productive" | "unproductive" | "store-closed" | "cancelled" | null => {
    // PRIORITY 1: If prop already has a final status (from parent's database fetch), use it directly
    const propStatus = visit.status;
    if (propStatus === 'productive' || propStatus === 'unproductive') {
      console.log('⚡ [VisitCard] Initial status from PROP (final):', propStatus);
      return propStatus;
    }
    
    // PRIORITY 2: Check sync cache
    const retailerId = visit.retailerId || visit.id;
    const cachedUserId = typeof window !== 'undefined' ? localStorage.getItem('cached_user_id') : null;
    const targetDate = selectedDate && selectedDate.length > 0 ? selectedDate : new Date().toISOString().split('T')[0];
    
    if (cachedUserId && visitStatusCache.isReady()) {
      const cached = visitStatusCache.getSync(retailerId, cachedUserId, targetDate);
      if (cached) {
        console.log('⚡ [VisitCard] Initial status from SYNC cache:', cached.status);
        return cached.status;
      }
    }
    
    // PRIORITY 3: Use prop status (could be 'planned' or other non-final)
    return propStatus;
  };
  
  // Track current visit status - initialize from prop or cache
  const [currentStatus, setCurrentStatus] = useState<"planned" | "in-progress" | "productive" | "unproductive" | "store-closed" | "cancelled" | null>(getInitialStatus);
  const [statusLoadedFromDB, setStatusLoadedFromDB] = useState(() => {
    // Mark as loaded if we got a final status from prop
    const propStatus = visit.status;
    return propStatus === 'productive' || propStatus === 'unproductive';
  });
  
  // Track last fetched status to prevent redundant updates causing flicker
  const lastFetchedStatusRef = useRef<string | null>(null);
  const isRefreshingRef = useRef(false);
  const lastRefreshTimeRef = useRef<number>(0);
  
  // Display status - currentStatus is always initialized now (from prop or cache)
  // Only fall back to prop if currentStatus is somehow null (shouldn't happen)
  const displayStatus = currentStatus || visit.status;

  // Check if the selected date is today's date
  const isTodaysVisit = selectedDate === new Date().toISOString().split('T')[0];

  // Ensure visit tracking ends when this card unmounts or user navigates away
  useEffect(() => {
    return () => {
      try { endTracking?.(); } catch {}
    };
  }, [endTracking]);

  // Load retailer data for overview modal
  useEffect(() => {
    const loadRetailerData = async () => {
      if (!showRetailerOverview) return;
      const retailerId = visit.retailerId || visit.id;
      try {
        const { data } = await supabase
          .from('retailers')
          .select('*')
          .eq('id', retailerId)
          .maybeSingle();
        if (data) setRetailerOverviewData(data);
      } catch (e) {
        console.error('Error loading retailer:', e);
      }
    };
    loadRetailerData();
  }, [showRetailerOverview, visit.retailerId, visit.id]);

  // Memoized retailer ID for this card
  const myRetailerId = visit.retailerId || visit.id;

  // SMART STATUS CHECK: Only runs once initially OR when explicitly marked for refresh
  const checkStatus = useCallback(async (forceRefresh = false) => {
    // Get user and date info first
    const { data: { session } } = await supabase.auth.getSession();
    const currentUserId = session?.user?.id || userId;
    const visitRetailerId = visit.retailerId || visit.id;
    const targetDate = selectedDate && selectedDate.length > 0 ? selectedDate : new Date().toISOString().split('T')[0];
    
    if (!currentUserId) return;
    
    // Skip if initial check is done and NOT a forced refresh (from registry notification)
    const hasInitialCheck = retailerStatusRegistry.hasInitialCheckDone(visitRetailerId);
    const needsRefresh = retailerStatusRegistry.needsRefresh(visitRetailerId);
    
    if (hasInitialCheck && !forceRefresh && !needsRefresh) {
      console.log('⏭️ [VisitCard] Skipping status check - already done, no changes for:', visitRetailerId);
      return;
    }
    
    // CACHE-FIRST: Check if we have cached status
    const cachedStatus = await visitStatusCache.get(visitRetailerId, currentUserId, targetDate);
    
    if (cachedStatus) {
      // Apply cached status immediately - no network needed
      // Only update state if values are different to prevent re-renders
      if (currentStatus !== cachedStatus.status) {
        console.log('⚡ [VisitCard] Using CACHED status:', cachedStatus.status, cachedStatus.isFinal ? '(FINAL)' : '');
        setCurrentStatus(cachedStatus.status);
      }
      if (currentVisitId !== cachedStatus.visitId) {
        setCurrentVisitId(cachedStatus.visitId);
      }
      if (!statusLoadedFromDB) {
        setStatusLoadedFromDB(true);
      }
      lastFetchedStatusRef.current = cachedStatus.status;
      
      if (cachedStatus.orderValue && actualOrderValue !== cachedStatus.orderValue) {
        setActualOrderValue(cachedStatus.orderValue);
        setHasOrderToday(true);
      }
      if (cachedStatus.noOrderReason && noOrderReason !== cachedStatus.noOrderReason) {
        setIsNoOrderMarked(true);
        setNoOrderReason(cachedStatus.noOrderReason);
      }
      if ((cachedStatus.status === 'productive' || cachedStatus.status === 'unproductive') && phase !== 'completed') {
        setPhase('completed');
        setIsCheckedOut(true);
      }
      
      // Mark initial check done, clear refresh flag
      retailerStatusRegistry.markInitialCheckDone(visitRetailerId);
      retailerStatusRegistry.clearRefreshFlag(visitRetailerId);
      
      // Only 'productive' is truly final - skip network refresh
      if (cachedStatus.status === 'productive') {
        isRefreshingRef.current = false;
        return;
      }
      
      // If not force refresh and no registry flag, use cache and skip network
      if (!forceRefresh && !needsRefresh) {
        isRefreshingRef.current = false;
        return;
      }
    }
    
    // Debounce: prevent rapid consecutive refreshes (minimum 500ms between refreshes)
    const now = Date.now();
    if (now - lastRefreshTimeRef.current < 500) {
      console.log('⏳ [VisitCard] Debouncing checkStatus - too soon after last refresh');
      return;
    }
    
    // Prevent concurrent refreshes
    if (isRefreshingRef.current) {
      console.log('⏳ [VisitCard] Skipping checkStatus - already refreshing');
      return;
    }
    
    isRefreshingRef.current = true;
    lastRefreshTimeRef.current = now;
    
    try {
      console.log('🔍 [VisitCard] Checking status from network for visit:', visit.id);

      // Load distributor information - First try to get from distributor mapping
      const {
        data: distributorMapping,
        error: mappingError
      } = await supabase.from('distributor_retailer_mappings').select('distributor_id').eq('retailer_id', visitRetailerId).eq('user_id', currentUserId).maybeSingle();
      if (!mappingError && distributorMapping?.distributor_id) {
        // Try to get distributor from retailers table (distributors are stored as retailers with entity_type = 'distributor')
            const {
              data: distributorData,
              error: distributorError
            } = await supabase.from('retailers').select('name').eq('id', distributorMapping.distributor_id).eq('entity_type', 'distributor').maybeSingle();
            if (!distributorError && distributorData) {
              setDistributorName(distributorData.name);
            }
          }

          // Fetch pending amount for this retailer
          const {
            data: retailerData,
            error: retailerError
          } = await supabase.from('retailers').select('pending_amount').eq('id', visitRetailerId).maybeSingle();
          if (!retailerError && retailerData?.pending_amount) {
            setPendingAmount(Number(retailerData.pending_amount));
            
            // Fetch the oldest order with pending amount to get "pending since" date
            const { data: oldestOrder } = await supabase
              .from('orders')
              .select('order_date')
              .eq('retailer_id', visitRetailerId)
              .gt('pending_amount', 0)
              .order('order_date', { ascending: true })
              .limit(1)
              .maybeSingle();
            
            if (oldestOrder) {
              setPendingSinceDate(oldestOrder.order_date);
            }
          }

          // Check if analytics viewed
          const {
            data: analyticsView
          } = await supabase.from('analytics_views').select('id').eq('visit_id', visit.id).eq('user_id', currentUserId).maybeSingle();
          if (analyticsView) {
            setHasViewedAnalytics(true);
          }

            // Check if this is a joint sales visit
          const { data: beatPlanData } = await supabase
            .from('beat_plans')
            .select('id, joint_sales_manager_id')
            .eq('plan_date', targetDate)
            .or(`user_id.eq.${currentUserId},joint_sales_manager_id.eq.${currentUserId}`)
            .maybeSingle();
          
          if (beatPlanData) {
            setBeatPlanId(beatPlanData.id);
            if (beatPlanData.joint_sales_manager_id) {
              setIsJointSalesVisit(true);
              setJointSalesMemberId(beatPlanData.joint_sales_manager_id);
            }
          }

          // Check if joint feedback exists - either with beat plan or by date/retailer
          const { data: feedbackData } = await supabase
            .from('joint_sales_feedback')
            .select('id, manager_id')
            .eq('retailer_id', visitRetailerId)
            .eq('feedback_date', targetDate)
            .maybeSingle();
          
          if (feedbackData) {
            setHasJointSalesFeedback(true);
            // If we found feedback but didn't have joint sales visit from beat plan
            if (!beatPlanData?.joint_sales_manager_id && feedbackData.manager_id) {
              setJointSalesMemberId(feedbackData.manager_id);
            }
          }

          // Fetch visit data from database to get latest check-in/out status
          // Order by created_at DESC to get the most recent visit (handles duplicate visits)
          const {
            data: visitDataArr,
            error: visitError
          } = await supabase.from('visits').select('check_in_time, check_out_time, status, no_order_reason, location_match_in, location_match_out, id').eq('user_id', currentUserId).eq('retailer_id', visitRetailerId).eq('planned_date', targetDate).order('created_at', { ascending: false }).limit(1);
          
          const visitData = visitDataArr?.[0] || null;
          
          if (!visitError && visitData) {
            console.log('📊 Visit data from DB:', visitData);
            setCurrentVisitId(visitData.id);
            setIsCheckedIn(!!visitData.check_in_time);
            setIsCheckedOut(!!visitData.check_out_time);
            setLocationMatchIn(visitData.location_match_in || null);
            setLocationMatchOut(visitData.location_match_out || null);
            
            // Update current status from database with proper type assertion
            // ONLY update if status actually changed to prevent UI flicker
            const validStatus = visitData.status as "planned" | "in-progress" | "productive" | "unproductive" | "store-closed" | "cancelled";
            
            if (lastFetchedStatusRef.current !== validStatus) {
              console.log('📊 [VisitCard] Setting currentStatus from DB:', {
                visitId: visitData.id,
                oldStatus: currentStatus,
                newStatus: validStatus,
                hasCheckIn: !!visitData.check_in_time,
                hasCheckOut: !!visitData.check_out_time
              });
              setCurrentStatus(validStatus);
              lastFetchedStatusRef.current = validStatus;
              
              // Update cache with this status from DB
              await visitStatusCache.set(
                visitData.id,
                visitRetailerId,
                currentUserId,
                targetDate,
                validStatus,
                undefined, // orderValue will be set later if orders exist
                visitData.no_order_reason || undefined
              );
            } else {
              console.log('📊 [VisitCard] Status unchanged, skipping update:', validStatus);
            }
            setStatusLoadedFromDB(true); // Mark that we've loaded from DB
            
            if (visitData.no_order_reason) {
              setIsNoOrderMarked(true);
              setNoOrderReason(visitData.no_order_reason);
            } else {
              setIsNoOrderMarked(false);
              setNoOrderReason('');
            }
            if (visitData.check_in_time && !visitData.check_out_time) {
              setPhase('in-progress');
            } else if (visitData.check_out_time) {
              setPhase('completed');
            }
          } else {
            // No visit in database - check local cache for offline-created visits
            console.log('📵 No visit in DB, checking local cache...');
            try {
              const cachedVisits = await offlineStorage.getAll(STORES.VISITS);
              // Check multiple possible IDs for matching - sort by created_at DESC for duplicates
              const possibleRetailerIds = [visit.retailerId, visit.id].filter(Boolean);
              const matchingVisits = (cachedVisits as any[])?.filter((v: any) => 
                possibleRetailerIds.includes(v.retailer_id) && 
                v.user_id === currentUserId && 
                v.planned_date === targetDate
              ).sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
              
              const cachedVisit = matchingVisits?.[0];
              
              if (cachedVisit) {
                console.log('📦 Found cached visit:', cachedVisit);
                setCurrentVisitId(cachedVisit.id);
                if (cachedVisit.status) {
                  const validStatus = cachedVisit.status as "planned" | "in-progress" | "productive" | "unproductive" | "store-closed" | "cancelled";
                  setCurrentStatus(validStatus);
                  setStatusLoadedFromDB(true);
                  if (validStatus === 'unproductive') {
                    setPhase('completed');
                    setIsCheckedOut(true);
                  }
                }
                if (cachedVisit.no_order_reason) {
                  setIsNoOrderMarked(true);
                  setNoOrderReason(cachedVisit.no_order_reason);
                }
                if (cachedVisit.check_out_time) {
                  setPhase('completed');
                  setIsCheckedOut(true);
                }
              }
            } catch (cacheError) {
              console.log('Cache check error:', cacheError);
            }
          }

            // Check stock records - @ts-ignore to bypass TypeScript deep type inference issue
          // @ts-ignore
          const stockResponse = await supabase
            .from('stock')
            .select('id')
            .eq('retailer_id', visitRetailerId)
            .eq('user_id', currentUserId)
            .eq('stock_date', targetDate);
          
          const stockRecords = stockResponse.data;
          const stockError = stockResponse.error;
          
          if (!stockError && stockRecords) {
            setHasStockRecords(stockRecords.length > 0);
            setStockRecordCount(stockRecords.length);
          }

          // Fetch orders for today - @ts-ignore to bypass TypeScript deep type inference issue
          // @ts-ignore
          const ordersResponse = await supabase
            .from('orders')
            .select('*, order_items(*)')
            .eq('retailer_id', visitRetailerId)
            .eq('order_date', targetDate)
            .eq('status', 'confirmed');
          
          const ordersToday = ordersResponse.data;
          const ordersError = ordersResponse.error;
          
          if (!ordersError && ordersToday && ordersToday.length > 0) {
            setOrdersTodayList(ordersToday);
            // Store the most recent order ID for invoice generation
            setLastOrderId(ordersToday[0].id);
            // Calculate totals for today
            const totalOrderValue = ordersToday.reduce((sum, order) => sum + Number((order as any).total_amount || 0), 0);
            console.log('💰 [VisitCard] Setting actualOrderValue:', {
              visitId: visit.id,
              orderCount: ordersToday.length,
              totalOrderValue,
              orders: ordersToday.map((o: any) => ({ id: o.id, amount: o.total_amount }))
            });
            setActualOrderValue(totalOrderValue);
            setHasOrderToday(true);

            // Calculate total previous pending cleared
            const totalPendingCleared = ordersToday.reduce((sum, order) => sum + Number((order as any).previous_pending_cleared || 0), 0);
            setPreviousPendingCleared(totalPendingCleared);

            // Split cash vs credit orders and aggregate properly
            const creditOrders = ordersToday.filter((o: any) => !!o.is_credit_order);
            const cashOrders = ordersToday.filter((o: any) => !o.is_credit_order);
            const paidFromCash = cashOrders.reduce((sum: number, o: any) => sum + Number(o.total_amount || 0), 0);
            const creditOrdersTotal = creditOrders.reduce((sum: number, o: any) => sum + Number(o.total_amount || 0), 0);
            const totalPaidFromCredit = creditOrders.reduce((sum: number, o: any) => sum + Number(o.credit_paid_amount || 0), 0);
            const totalPaidToday = paidFromCash + totalPaidFromCredit;

            // Calculate pending using: (Previous pending + Current order) - Amount paid = Updated pending
            // Use the retailer's pending_amount from state as the previous pending
            const previousPending = pendingAmount || 0;
            const updatedPending = Math.max(0, previousPending + creditOrdersTotal - totalPaidFromCredit);
            setIsCreditOrder(creditOrders.length > 0);
            setCreditPaidAmount(totalPaidFromCredit); // Credit paid amount today (for reference)
            setPaidTodayAmount(totalPaidToday); // Total paid amount today (cash + credit)
            setCreditPendingAmount(updatedPending); // Updated pending after today's order

            // CRITICAL: Update local status to productive immediately when orders exist
            console.log('✅ [VisitCard] Orders exist - setting status to productive immediately');
            setCurrentStatus('productive');
            setStatusLoadedFromDB(true); // Mark that we've loaded from DB
            
            // Update cache with productive status and order value
            await visitStatusCache.set(
              visitData?.id || currentVisitId || visit.id,
              visitRetailerId,
              currentUserId,
              targetDate,
              'productive',
              totalOrderValue,
              undefined
            );

            // ALSO update database if needed
            // This handles cases where visit was cancelled/planned but has orders
            if (visitData && visitData.status !== 'productive') {
              console.log('🔄 [VisitCard] Visit has orders but DB status is not productive - updating DB:', {
                visitId: visitData.id,
                currentStatus: visitData.status,
                orderCount: ordersToday.length,
                totalValue: totalOrderValue
              });
              const { error: updateError } = await supabase.from('visits').update({
                status: 'productive',
                check_out_time: visitData.check_out_time || new Date().toISOString(),
                no_order_reason: null
              }).eq('id', visitData.id);
              
              if (updateError) {
                console.error('❌ [VisitCard] Error updating visit status:', updateError);
              } else {
                console.log('✅ [VisitCard] Visit status updated to productive');
              }
            }
            
            setHasOrderToday(true);
          } else {
            setHasOrderToday(false);
            setActualOrderValue(0);
            console.log('💰 Reset actualOrderValue to 0');
            setIsCreditOrder(false);
            setCreditPendingAmount(0);
            setCreditPaidAmount(0);
            setPaidTodayAmount(0);
            setOrdersTodayList([]);
            setPreviousPendingCleared(0);
          }
    } catch (error) {
      console.log('❌ Status check error:', error);
    } finally {
      isRefreshingRef.current = false;
      // Mark initial check done after first successful network check
      retailerStatusRegistry.markInitialCheckDone(visitRetailerId);
      retailerStatusRegistry.clearRefreshFlag(visitRetailerId);
    }
  }, [visit.id, visit.retailerId, selectedDate, userId, currentStatus, currentVisitId, statusLoadedFromDB, actualOrderValue, noOrderReason, phase, pendingAmount]);

  // Run initial status check and register for targeted refresh
  useEffect(() => {
    // Register this card to receive targeted refresh notifications
    const unregister = retailerStatusRegistry.register(myRetailerId, () => {
      console.log('🎯 [VisitCard] Received targeted refresh notification for:', myRetailerId);
      checkStatus(true); // Force refresh only for this retailer
    });
    
    // OPTIMIZATION: Skip initial check if prop already has final status (from parent)
    // This prevents unnecessary network calls for already-known statuses
    const propStatus = visit.status;
    const isFinalStatus = propStatus === 'productive' || propStatus === 'unproductive';
    
    if (isFinalStatus) {
      // Prop already has final status - trust it and cache it
      console.log('⚡ [VisitCard] Prop has final status, skipping initial check:', propStatus);
      if (currentStatus !== propStatus) {
        setCurrentStatus(propStatus);
        setStatusLoadedFromDB(true);
      }
    } else {
      // Only run initial check for non-final statuses
      checkStatus(false);
    }
    
    return () => {
      unregister();
    };
  }, [myRetailerId]); // Removed checkStatus and visit.status from deps to prevent re-running

  // Listen for custom events to refresh status - trigger full data reload
  useEffect(() => {
    const handleStatusChange = async (event: any) => {
      console.log('🔔 [VisitCard] Received visitStatusChanged event:', {
        eventDetail: event.detail,
        currentVisitId: visit.id,
        currentRetailerId: myRetailerId
      });
      
      // Match by visitId, retailerId, OR if no detail provided (global refresh)
      const matchesVisit = event.detail?.visitId === visit.id || event.detail?.visitId === currentVisitId;
      const matchesRetailer = event.detail?.retailerId && (event.detail.retailerId === myRetailerId || event.detail.retailerId === visit.id || event.detail.retailerId === visit.retailerId);
      // Disable global refresh - only refresh if specifically targeted
      const isGlobalRefresh = false;
      
      if (matchesVisit || matchesRetailer || isGlobalRefresh) {
        console.log('✅ [VisitCard] Event matches - updating status');
        
        // CRITICAL: If event has status, update immediately and cache it
        if (event.detail?.status) {
          const newStatus = event.detail.status as "planned" | "in-progress" | "productive" | "unproductive" | "store-closed" | "cancelled";
          
          // Only update if status actually changed to prevent flicker
          if (currentStatus !== newStatus) {
            console.log('📊 [VisitCard] Setting status directly from event:', newStatus);
            setCurrentStatus(newStatus);
          }
          if (!statusLoadedFromDB) {
            setStatusLoadedFromDB(true);
          }
          lastFetchedStatusRef.current = newStatus;
          
          if (newStatus === 'unproductive' && phase !== 'completed') {
            setIsNoOrderMarked(true);
            setPhase('completed');
            setIsCheckedOut(true);
          }
          
          // Update cache with new status (background - don't block)
          const { data: { session } } = await supabase.auth.getSession();
          const currentUserId = session?.user?.id || userId;
          const targetDate = selectedDate && selectedDate.length > 0 ? selectedDate : new Date().toISOString().split('T')[0];
          
          if (currentUserId) {
            visitStatusCache.set(
              event.detail.visitId || currentVisitId || visit.id,
              myRetailerId,
              currentUserId,
              targetDate,
              newStatus,
              event.detail.orderValue,
              event.detail.noOrderReason
            );
          }
          
          // Only 'productive' is truly final - don't fetch from network
          // 'unproductive' can be overridden by orders placed later
          if (newStatus === 'productive') {
            console.log('🛑 [VisitCard] Status is PRODUCTIVE (truly final), skipping network refresh');
            return;
          }
        }
        
        // Only refresh if this specific retailer is marked
        if (retailerStatusRegistry.needsRefresh(myRetailerId)) {
          checkStatus(true);
        }
      } else {
        console.log('ℹ️ [VisitCard] Event is for different visit, ignoring');
      }
    };
    
    // SIMPLIFIED: Only respond to visitDataChanged if this retailer is specifically marked for refresh
    const handleDataChange = () => {
      const myRetailerId = visit.retailerId || visit.id;
      
      // ONLY refresh if this specific retailer is marked in the registry
      if (retailerStatusRegistry.needsRefresh(myRetailerId)) {
        console.log('🔔 [VisitCard] visitDataChanged - retailer marked for refresh:', myRetailerId);
        checkStatus(true);
      }
      // Otherwise, do nothing - prevents mass refresh of all cards
    };
    
    // SIMPLIFIED: syncComplete handler - only for retailers marked for refresh
    const handleSyncComplete = () => {
      const myRetailerId = visit.retailerId || visit.id;
      
      if (retailerStatusRegistry.needsRefresh(myRetailerId)) {
        console.log('🔔 [VisitCard] syncComplete - retailer marked for refresh:', myRetailerId);
        checkStatus(true);
      }
    };
    
    window.addEventListener('visitStatusChanged', handleStatusChange as EventListener);
    window.addEventListener('visitDataChanged', handleDataChange);
    window.addEventListener('syncComplete', handleSyncComplete);
    return () => {
      window.removeEventListener('visitStatusChanged', handleStatusChange as EventListener);
      window.removeEventListener('visitDataChanged', handleDataChange);
      window.removeEventListener('syncComplete', handleSyncComplete);
    };
  }, [visit.id, visit.retailerId, selectedDate, userId, myRetailerId, checkStatus]);

  // Set up real-time listener for orders to automatically update visit status
  useEffect(() => {
    const setupListener = async () => {
      // Use getSession() for offline support
      const { data: { session } } = await supabase.auth.getSession();
      const currentUserId = session?.user?.id || userId;
      if (!currentUserId) return;
      const retailerId = visit.retailerId || visit.id;
      const channel = supabase.channel('order-updates').on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'orders',
        filter: `retailer_id=eq.${retailerId}`
      }, async payload => {
        // When an order is placed, automatically mark visit as productive if checked in
        const targetDate = selectedDate && selectedDate.length > 0 ? selectedDate : new Date().toISOString().split('T')[0];
        const createdAt: any = (payload as any)?.new?.created_at || (payload as any)?.created_at;
        const createdDate = createdAt ? new Date(createdAt).toISOString().split('T')[0] : null;
        if (createdDate !== targetDate) {
          return;
        }
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        const activeUserId = currentSession?.user?.id || userId;
        if (activeUserId) {
          // Get the most recent visit using proper ordering
          const { data: visitDataArr } = await supabase.from('visits').select('id, status, check_in_time, created_at').eq('user_id', activeUserId).eq('retailer_id', retailerId).eq('planned_date', targetDate).order('created_at', { ascending: false }).limit(1);
          const visitData = visitDataArr?.[0] || null;
          if (visitData?.check_in_time && (visitData.status === 'in-progress' || visitData.status === 'unproductive')) {
            // Get order time for auto check-out
            const orderTime = createdAt || new Date().toISOString();

            // Auto check-out the visit when order is placed
            await supabase.from('visits').update({
              status: 'productive',
              no_order_reason: null,
              check_out_time: orderTime
            }).eq('id', visitData.id);
            
            // Update local state to reflect productive status
            setCurrentStatus('productive');
          }
          setHasOrderToday(true);
          setIsNoOrderMarked(false);
          setNoOrderReason('');
          setIsCheckedOut(true);
          setPhase('completed');
        }
      }).subscribe();
      return () => {
        supabase.removeChannel(channel);
      };
    };
    setupListener();
  }, [visit.retailerId, visit.id, selectedDate, userId]);
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
      return locationMatchOut ?? false ? 'Checked Out (Location match)' : 'Checked Out (Location mismatch)';
    }
    if (phase === 'in-progress') {
      return locationMatchIn ?? false ? 'In Progress (Location match)' : 'In Progress (Location mismatch)';
    }
    if (proceedWithoutCheckIn) {
      return 'Proceeding without Check-in';
    }
    return 'Check-In';
  };
  const toRad = (v: number) => v * Math.PI / 180;
  const distanceMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371000; // meters
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };
  const getPosition = () => new Promise<GeolocationPosition>((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Geolocation not supported'));
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 30000,
      maximumAge: 10000
    });
  });
  const ensureVisit = async (userId: string, retailerId: string, date: string) => {
    const isOnline = navigator.onLine;
    
    // ONLINE MODE: Try to get from database first
    if (isOnline) {
      try {
        // Get the most recent visit (in case of duplicates, use the latest one)
        const {
          data,
          error
        } = await supabase.from('visits').select('id, status, check_in_time, location_match_in, location_match_out, skip_check_in_reason, skip_check_in_time').eq('user_id', userId).eq('retailer_id', retailerId).eq('planned_date', date).order('created_at', {
          ascending: false
        }).limit(1).maybeSingle();
        
        if (error) {
          console.log('ensureVisit select error, falling back to offline:', error);
          // Fall through to offline mode
        } else if (data) {
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
          // Cache the visit for offline use
          await offlineStorage.save(STORES.VISITS, data);
          return data.id;
        } else {
          // No visit exists, create one
          const {
            data: inserted,
            error: insertError
          } = await supabase.from('visits').insert({
            user_id: userId,
            retailer_id: retailerId,
            planned_date: date
          }).select('id').single();
          
          if (insertError) {
            console.log('ensureVisit insert error, falling back to offline:', insertError);
            // Fall through to offline mode
          } else {
            setCurrentVisitId(inserted.id);
            // Cache the new visit for offline use
            await offlineStorage.save(STORES.VISITS, { id: inserted.id, user_id: userId, retailer_id: retailerId, planned_date: date, status: 'planned' });
            return inserted.id;
          }
        }
      } catch (error) {
        console.log('ensureVisit online error, falling back to offline:', error);
        // Fall through to offline mode
      }
    }
    
    // OFFLINE MODE: Check local cache first
    console.log('📵 ensureVisit - Operating in offline mode');
    
    try {
      // Try to find cached visit
      const allVisits = await offlineStorage.getAll(STORES.VISITS);
      const cachedVisit = allVisits.find((v: any) => 
        v.user_id === userId && 
        v.retailer_id === retailerId && 
        v.planned_date === date
      ) as any;
      
      if (cachedVisit) {
        console.log('📵 Found cached visit:', cachedVisit.id);
        setCurrentVisitId(cachedVisit.id);
        if (cachedVisit.check_in_time || cachedVisit.skip_check_in_time) {
          setPhase('in-progress');
          setIsCheckedIn(true);
        }
        if (cachedVisit.location_match_in != null) setLocationMatchIn(cachedVisit.location_match_in);
        if (cachedVisit.location_match_out != null) setLocationMatchOut(cachedVisit.location_match_out);
        if (cachedVisit.skip_check_in_reason || cachedVisit.skip_check_in_time) {
          setProceedWithoutCheckIn(true);
          setSkipCheckInReason(cachedVisit.skip_check_in_reason || 'phone-order');
          setIsCheckedIn(true);
        }
        return cachedVisit.id;
      }
      
      // No cached visit, create a temporary one for offline use
      const tempVisitId = `offline_${userId}_${retailerId}_${date}_${Date.now()}`;
      console.log('📵 Creating temporary offline visit:', tempVisitId);
      
      const tempVisit = {
        id: tempVisitId,
        user_id: userId,
        retailer_id: retailerId,
        planned_date: date,
        status: 'planned',
        created_at: new Date().toISOString(),
        is_offline_created: true
      };
      
      // Save to local cache
      await offlineStorage.save(STORES.VISITS, tempVisit);
      
      // Queue for sync when back online
      await offlineStorage.addToSyncQueue('CREATE_VISIT', {
        user_id: userId,
        retailer_id: retailerId,
        planned_date: date,
        status: 'planned'
      });
      
      setCurrentVisitId(tempVisitId);
      return tempVisitId;
    } catch (offlineError) {
      console.error('📵 Offline ensureVisit error:', offlineError);
      // Last resort: create a temp ID anyway so the flow can continue
      const fallbackId = `temp_${Date.now()}`;
      setCurrentVisitId(fallbackId);
      return fallbackId;
    }
  };
  const handlePhotoCaptured = async (photoBlob: Blob) => {
    try {
      const action = pendingPhotoActionRef.current;
      const checkData = pendingCheckDataRef.current;
      if (!action || !checkData) {
        setShowCameraCapture(false);
        pendingPhotoActionRef.current = null;
        pendingCheckDataRef.current = null;
        return;
      }
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) {
        setShowCameraCapture(false);
        pendingPhotoActionRef.current = null;
        pendingCheckDataRef.current = null;
        return;
      }
      const {
        visitId,
        userId,
        retailerId,
        today,
        timestamp,
        current,
        address,
        match
      } = checkData;

      // Upload photo first
      const path = `${userId}/${visitId}-${action}-${Date.now()}.jpg`;
      const {
        error: uploadError
      } = await supabase.storage.from('visit-photos').upload(path, photoBlob, {
        contentType: 'image/jpeg',
        upsert: false
      });
      if (uploadError) {
        console.error('Photo upload error:', uploadError);
        toast({
          title: 'Photo upload failed',
          description: 'Could not upload photo. Please try again.',
          variant: 'destructive'
        });
        setShowCameraCapture(false);
        pendingPhotoActionRef.current = null;
        pendingCheckDataRef.current = null;
        return;
      }

      // NOW save check-in data with photo
      if (action === 'checkin') {
        // Auto check-out any previous in-progress visits
        await autoCheckOutPreviousVisit(userId, retailerId, today);

        // Update visit with check-in data INCLUDING photo
        const {
          error
        } = await supabase.from('visits').update({
          check_in_time: timestamp,
          check_in_location: current,
          check_in_address: address,
          check_in_photo_url: path,
          location_match_in: match,
          status: 'in-progress'
        }).eq('id', visitId);
        if (error) throw error;

        // Update attendance record with photo
        const {
          error: attendanceError
        } = await supabase.from('attendance').upsert({
          user_id: userId,
          date: today,
          check_in_time: timestamp,
          check_in_location: current,
          check_in_address: address,
          check_in_photo_url: path,
          status: 'present'
        }, {
          onConflict: 'user_id,date'
        });
        if (attendanceError) console.error('Attendance check-in error:', attendanceError);

        // Update UI state
        setPhase('in-progress');
        setLocationMatchIn(match);
        setIsCheckedIn(true);
        setShowCameraCapture(false);
        window.dispatchEvent(new CustomEvent('visitStatusChanged', {
          detail: {
            visitId: visitId,
            status: 'in-progress',
            retailerId: retailerId
          }
        }));
        toast({
          title: 'Check-in successful ✓',
          description: match === false ? 'Location mismatch detected' : 'Visit started successfully'
        });
      }
      pendingPhotoActionRef.current = null;
      pendingCheckDataRef.current = null;
    } catch (err: any) {
      console.error('Photo processing error', err);
      toast({
        title: 'Check-in failed',
        description: err.message || 'Could not complete check-in. Please try again.',
        variant: 'destructive'
      });
      setShowCameraCapture(false);
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
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in meters
  };
  const autoCheckOutPreviousVisit = async (userId: string, currentRetailerId: string, today: string) => {
    try {
      // Get current location for auto check-out
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        });
      });
      const currentLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      };

      // Find any in-progress visit at a different retailer for today
      const {
        data: inProgressVisits
      } = await supabase.from('visits').select('id, retailer_id, check_in_time, updated_at').eq('user_id', userId).eq('planned_date', today).eq('status', 'in-progress').neq('retailer_id', currentRetailerId);
      if (inProgressVisits && inProgressVisits.length > 0) {
        for (const prevVisit of inProgressVisits) {
          console.log('Auto checking out previous visit:', prevVisit.id);

          // Use the visit's last activity time (updated_at) for check-out
          const checkOutTime = prevVisit.updated_at || new Date().toISOString();

          // Check if there are any orders for this visit
          const {
            data: ordersForVisit
          } = await supabase.from('orders').select('id').eq('user_id', userId).eq('retailer_id', prevVisit.retailer_id).eq('status', 'confirmed').gte('created_at', `${today}T00:00:00.000Z`).lte('created_at', `${today}T23:59:59.999Z`).limit(1);
          const finalStatus = ordersForVisit && ordersForVisit.length > 0 ? 'productive' : 'unproductive';

          // Auto check-out the previous visit with location (no photo required)
          await supabase.from('visits').update({
            check_out_time: checkOutTime,
            check_out_location: currentLocation,
            status: finalStatus
          }).eq('id', prevVisit.id);
          console.log(`Auto checked out visit ${prevVisit.id} at ${checkOutTime} with status ${finalStatus}`);

          // Award gamification points for visit completion
          if (finalStatus === 'productive') {
            const { awardPointsForVisitCompletion } = await import('@/utils/gamificationPointsAwarder');
            await awardPointsForVisitCompletion({
              userId,
              retailerId: prevVisit.retailer_id,
              hasOrder: true
            });
          }
        }
      }
    } catch (error) {
      console.error('Error auto checking out previous visit:', error);
    }
  };
  const handleCheckInOut = async (action: 'checkin' | 'checkout') => {
    try {
      console.log(`Starting ${action} process...`);
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: 'Login required',
          description: 'Please sign in to record visits.',
          variant: 'destructive'
        });
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
      let current: {
        latitude: number;
        longitude: number;
      };
      try {
        current = await new Promise<{
          latitude: number;
          longitude: number;
        }>((resolve, reject) => {
          const timeoutId = setTimeout(() => {
            reject(new Error('Location request timed out. Please ensure location services are enabled.'));
          }, 15000);
          navigator.geolocation.getCurrentPosition(position => {
            clearTimeout(timeoutId);
            resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            });
          }, error => {
            clearTimeout(timeoutId);
            let errorMessage = 'Unable to get your location.';
            switch (error.code) {
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
          }, {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0
          });
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

      // Close location modal
      setShowLocationModal(false);

      // For check-out: skip photo and process immediately
      if (action === 'checkout') {
        // Check-out process (no photo required)
        const todayStart = new Date(today);
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(today);
        todayEnd.setHours(23, 59, 59, 999);
        const {
          data: ordersToday
        } = await supabase.from('orders').select('id').eq('user_id', user.id).eq('retailer_id', retailerId).eq('status', 'confirmed').gte('created_at', todayStart.toISOString()).lte('created_at', todayEnd.toISOString()).limit(1);
        const finalStatus = ordersToday && ordersToday.length > 0 ? 'productive' : 'unproductive';

        // Update visit with check-out data (no photo)
        const {
          error
        } = await supabase.from('visits').update({
          check_out_time: timestamp,
          check_out_location: current,
          check_out_address: address,
          location_match_out: match,
          status: finalStatus
        }).eq('id', visitId);
        if (error) throw error;

        // Update attendance with check-out
        const {
          data: attendanceData
        } = await supabase.from('attendance').select('check_in_time').eq('user_id', user.id).eq('date', today).single();
        if (attendanceData?.check_in_time) {
          const checkInTime = new Date(attendanceData.check_in_time);
          const checkOutTime = new Date(timestamp);
          const totalHours = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
          const {
            error: attendanceError
          } = await supabase.from('attendance').update({
            check_out_time: timestamp,
            check_out_location: current,
            check_out_address: address,
            total_hours: totalHours
          }).eq('user_id', user.id).eq('date', today);
          if (attendanceError) console.error('Attendance check-out error:', attendanceError);
        }

        // Check if there are orders for this visit to award points
        const { data: ordersForVisit } = await supabase
          .from('orders')
          .select('id')
          .eq('user_id', user.id)
          .eq('retailer_id', retailerId)
          .eq('status', 'confirmed')
          .gte('created_at', `${today}T00:00:00.000Z`)
          .lte('created_at', `${today}T23:59:59.999Z`)
          .limit(1);
        
        const hasOrder = ordersForVisit && ordersForVisit.length > 0;
        
        // Award gamification points for visit completion
        if (hasOrder) {
          const { awardPointsForVisitCompletion } = await import('@/utils/gamificationPointsAwarder');
          await awardPointsForVisitCompletion({
            userId: user.id,
            retailerId,
            hasOrder: true
          });
        }

        // Update UI state
        setPhase('completed');
        setLocationMatchOut(match);
        setIsCheckedOut(true);
        toast({
          title: 'Checked out successfully',
          description: match === false ? 'Location mismatch detected' : 'Visit completed'
        });
        return;
      }

      // For check-in: require photo with front camera
      pendingPhotoActionRef.current = action;
      pendingCheckDataRef.current = {
        action,
        timestamp,
        current,
        address,
        match,
        visitId,
        userId: user.id,
        retailerId,
        today
      };

      // Open camera capture modal
      setShowCameraCapture(true);
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
    // CRITICAL: Log the retailer we're marking as unproductive to verify correct ID
    console.log('🚫 [NoOrder] Marking visit as unproductive:', {
      reason,
      visitId: visit.id,
      visitRetailerId: visit.retailerId,
      retailerName: visit.retailerName,
      resolvedRetailerId: visit.retailerId || visit.id
    });
    
    try {
      setNoOrderReason(reason);
      setIsNoOrderMarked(true);
      
      // Use getSession() for offline support (reads from localStorage cache)
      const { data: { session } } = await supabase.auth.getSession();
      const currentUserId = session?.user?.id || userId;
      
      if (!currentUserId) {
        toast({
          title: 'Authentication Required',
          description: 'Please sign in to mark visits',
          variant: 'destructive'
        });
        return;
      }
      
      // Use selectedDate if available, otherwise use today's date
      const today = selectedDate || new Date().toISOString().split('T')[0];
      const retailerId = (visit.retailerId || visit.id) as string;
      
      console.log('🚫 [NoOrder] Using retailerId for ensureVisit:', retailerId, 'date:', today);
      
      const visitId = await ensureVisit(currentUserId, retailerId, today);
      setCurrentVisitId(visitId);
      console.log('🚫 [NoOrder] ensureVisit returned visitId:', visitId);

        // Auto check-out when marking as no order
        const checkOutTime = new Date().toISOString();

        // Check connectivity for offline support
        const isOnline = navigator.onLine;
        
        if (isOnline) {
          try {
            // ONLINE: Update visit status to unproductive and store the reason
            const {
              data,
              error
            } = await supabase.from('visits').update({
              status: 'unproductive',
              no_order_reason: reason,
              check_out_time: checkOutTime
            }).eq('id', visitId).select();
            
            if (error) {
              console.error('Error updating visit:', error);
              throw error;
            }
            console.log('Visit updated successfully:', data);

            // Update local state to reflect the change immediately
            setPhase('completed');
            setIsCheckedOut(true);
            setCurrentStatus('unproductive'); // CRITICAL: Update status immediately
            setIsNoOrderMarked(true);
            setNoOrderReason(reason);
            setStatusLoadedFromDB(true); // Prevent prop override
            lastFetchedStatusRef.current = 'unproductive';
            
            // Update visit status cache - this is a FINAL status
            const targetDate = selectedDate && selectedDate.length > 0 ? selectedDate : new Date().toISOString().split('T')[0];
            await visitStatusCache.set(visitId, retailerId, currentUserId, targetDate, 'unproductive', undefined, reason);

            // Mark this specific retailer for targeted refresh
            retailerStatusRegistry.markForRefresh(retailerId);
            window.dispatchEvent(new CustomEvent('visitStatusChanged', {
              detail: {
                visitId,
                status: 'unproductive',
                retailerId
              }
            }));
            
            setShowNoOrderModal(false);
            toast({
              title: "Visit Marked as Unproductive",
              description: `Reason: ${reason.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}`
            });
          } catch (error: any) {
            // If online update fails, fall back to offline mode
            console.warn('Online update failed, falling back to offline:', error);
            await handleOfflineNoOrder();
          }
        } else {
          // OFFLINE: Queue for sync
          await handleOfflineNoOrder();
        }

        async function handleOfflineNoOrder() {
          console.log('📵 Offline mode - queuing no-order update for retailer:', retailerId);
          
          const syncData = {
            visitId,
            retailerId,
            userId: currentUserId,
            noOrderReason: reason,
            checkOutTime,
            plannedDate: today,
            timestamp: new Date().toISOString() // Add timestamp for sync
          };
          console.log('📵 Sync queue data:', JSON.stringify(syncData));
          
          // Save to offline sync queue
          await offlineStorage.addToSyncQueue('UPDATE_VISIT_NO_ORDER', syncData);
          console.log('✅ Added to sync queue successfully');
          // Update local visit in cache - also create if doesn't exist
          const cachedVisit = await offlineStorage.getById(STORES.VISITS, visitId);
          const visitToSave = cachedVisit ? {
            ...(cachedVisit as any),
            status: 'unproductive',
            no_order_reason: reason,
            check_out_time: checkOutTime,
            updated_at: new Date().toISOString()
          } : {
            id: visitId,
            retailer_id: retailerId,
            user_id: currentUserId,
            planned_date: today,
            status: 'unproductive',
            no_order_reason: reason,
            check_out_time: checkOutTime,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          await offlineStorage.save(STORES.VISITS, visitToSave);

          // CRITICAL: Update local state IMMEDIATELY for UI to reflect change
          setPhase('completed');
          setIsCheckedOut(true);
          setCurrentStatus('unproductive'); // Set status immediately
          setIsNoOrderMarked(true);
          setNoOrderReason(reason);
          setStatusLoadedFromDB(true); // Prevent prop override
          lastFetchedStatusRef.current = 'unproductive';
          
          // Update visit status cache - this is a FINAL status (offline)
          const targetDate = selectedDate && selectedDate.length > 0 ? selectedDate : new Date().toISOString().split('T')[0];
          await visitStatusCache.set(visitId, retailerId, currentUserId, targetDate, 'unproductive', undefined, reason);
          console.log('✅ Local state and cache updated to unproductive');

          // Mark this specific retailer for targeted refresh
          retailerStatusRegistry.markForRefresh(retailerId);
          window.dispatchEvent(new CustomEvent('visitStatusChanged', {
            detail: {
              visitId,
              status: 'unproductive',
              retailerId
            }
          }));

          setShowNoOrderModal(false);
          toast({
            title: "📵 No Order Saved Offline",
            description: "Will sync when you're back online"
          });
        }
    } catch (err: any) {
      console.error('Mark unproductive error', err);
      toast({
        title: 'Failed to mark unproductive',
        description: err.message || 'Try again.',
        variant: 'destructive'
      });
    }
  };
  const handleNoOrderClick = () => {
    if (isLocationEnabled && isCheckInMandatory && !isCheckedIn && !proceedWithoutCheckIn && isTodaysVisit) {
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
        description: `Reason: ${noOrderReason.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}`
      });
    } else {
      setShowNoOrderModal(true);
    }
  };
  const handleViewAnalytics = async (visitId: string) => {
    try {
      const {
        data: user
      } = await supabase.auth.getUser();
      if (user.user) {
        // Record analytics view
        await supabase.from('analytics_views').insert({
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
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) {
        setLoadingOrder(false);
        return;
      }
      const retailerId = (visit.retailerId || visit.id) as string;

      // Use selectedDate if provided, otherwise use today's date
      const targetDate = selectedDate ? new Date(selectedDate) : new Date();
      const dayStart = new Date(targetDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(targetDate);
      dayEnd.setHours(23, 59, 59, 999);
      const {
        data: orders
      } = await supabase.from('orders').select('id, created_at, total_amount, is_credit_order, credit_paid_amount').eq('user_id', user.id).eq('retailer_id', retailerId).eq('status', 'confirmed').gte('created_at', dayStart.toISOString()).lte('created_at', dayEnd.toISOString());
      setOrdersTodayList((orders || []) as any);
      if ((orders || []).length > 0) {
        const orderIds = (orders || []).map(o => o.id);
        const {
          data: items
        } = await supabase.from('order_items').select('product_name, quantity, rate, total, order_id').in('order_id', orderIds);

        // Group items by product for a clean summary
        const grouped = new Map<string, {
          product_name: string;
          quantity: number;
          rate: number;
          actualRate: number;
        }>();
        (items || []).forEach(it => {
          const key = it.product_name;
          const existing = grouped.get(key);
          const actualRate = Number(it.total || 0) / Number(it.quantity || 1); // Calculate actual price paid per unit
          if (existing) {
            existing.quantity += Number(it.quantity || 0);
            // Recalculate weighted average of actual rate
            const totalValue = existing.actualRate * (existing.quantity - Number(it.quantity || 0)) + Number(it.total || 0);
            existing.actualRate = totalValue / existing.quantity;
          } else {
            grouped.set(key, {
              product_name: key,
              quantity: Number(it.quantity || 0),
              rate: Number(it.rate || 0),
              // Original rate for reference
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
  return <Card className="shadow-card hover:shadow-xl transition-all duration-300 border-l-4 border-l-primary/30 bg-gradient-to-r from-card to-card/50">
      <CardContent className="p-3 sm:p-4">
        {/* Header - Retailer info and status */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-card-foreground text-sm sm:text-base">
                <button onClick={() => setShowRetailerOverview(true)} className="text-left hover:text-primary transition-colors cursor-pointer underline-offset-4 hover:underline" title="View retailer details">
                  {visit.retailerName}
                </button>
              </h3>
              
              {/* Phone Order Badge - only shown if applicable */}
              {currentLog?.is_phone_order && (
                <span className="flex items-center gap-1 text-xs text-blue-600 font-medium">
                  📞 Phone Order
                </span>
              )}
            </div>
            {visit.retailerId && (
              <div className="mt-2">
                <CreditScoreDisplay retailerId={visit.retailerId} variant="compact" />
              </div>
            )}
          </div>
          <div className="flex sm:flex-col items-start sm:items-end gap-2 sm:gap-1">
            <div className="flex flex-wrap gap-1">
              <Badge className={`${getStatusColor(displayStatus)} text-xs px-2 py-1`}>
                {getStatusText(displayStatus)}
              </Badge>
              {skipCheckInReason === 'phone-order' && <Badge className="bg-blue-500 text-white hover:bg-blue-600 text-xs px-2 py-1">
                  <Phone size={12} className="mr-1" />
                  Phone Order
                </Badge>}
              {isJointSalesVisit && hasJointSalesFeedback && <Badge 
                  className="bg-purple-500 text-white hover:bg-purple-600 text-xs px-2 py-1 cursor-pointer"
                  onClick={(e) => { e.stopPropagation(); setShowJointSalesFeedbackView(true); }}
                >
                  <UserCheck size={12} className="mr-1" />
                  Joint Sales
                </Badge>}
              {!isJointSalesVisit && hasJointSalesFeedback && <Badge 
                  className="bg-purple-500 text-white hover:bg-purple-600 text-xs px-2 py-1 cursor-pointer"
                  onClick={(e) => { e.stopPropagation(); setShowJointSalesFeedbackView(true); }}
                >
                  <UserCheck size={12} className="mr-1" />
                  Joint Visit
                </Badge>}
            </div>
            {hasStockRecords && <Badge className="bg-blue-500 text-white hover:bg-blue-600 text-xs px-2 py-1 cursor-pointer transition-all" variant="secondary" onClick={() => setShowStockDataModal(true)}>
                <Package size={12} className="mr-1" />
                {stockRecordCount} Stock{stockRecordCount !== 1 ? 's' : ''}
              </Badge>}
            <div className="text-xs text-muted-foreground">{visit.retailerCategory}</div>
          </div>
        </div>

        {/* Contact info */}
        <div className="mb-4">
          {pendingAmount > 0 && <div className="mb-3 p-2 bg-warning/10 border border-warning/30 rounded-md space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-0.5">
                  <p className="text-xs sm:text-sm font-medium text-warning flex items-center gap-1">
                    <span>⚠️</span>
                    Pending Amount: ₹{pendingAmount.toLocaleString()}
                  </p>
                  {pendingSinceDate && (
                    <p className="text-[10px] sm:text-xs text-warning/70">
                      Since: {new Date(pendingSinceDate).toLocaleDateString('en-IN', { 
                        day: 'numeric', 
                        month: 'short', 
                        year: 'numeric' 
                      })}
                    </p>
                  )}
                </div>
                <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => setShowPaymentModal(true)}>
                  <IndianRupee className="w-3 h-3" />
                  Make Payment
                </Button>
              </div>
            </div>}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
            <div className="flex items-center gap-1 flex-1 min-w-0">
              <MapPin size={12} className="sm:size-3.5 flex-shrink-0" />
            <a href={`https://www.google.com/maps/search/?api=1&query=${visit.retailerLat && visit.retailerLng ? `${visit.retailerLat},${visit.retailerLng}` : encodeURIComponent(visit.address || '')}`} target="_blank" rel="noopener noreferrer" className="truncate text-primary hover:underline cursor-pointer" onClick={e => e.stopPropagation()} title="Open in Google Maps">
  {visit.address}
            </a>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <a href={`tel:${(visit.phone || '').replace(/\s+/g, '')}`} className="flex items-center gap-1 text-primary hover:underline cursor-pointer" onClick={e => {
              e.stopPropagation();
              const cleaned = (visit.phone || '').replace(/\s+/g, '');
              if (cleaned) window.location.href = `tel:${cleaned}`;
            }} title="Call">
                <Phone size={12} className="sm:size-3.5" />
                <span>{visit.phone}</span>
              </a>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {/* First row - Check In, Order, Feedback, AI */}
          <div className={`grid gap-1.5 sm:gap-2 ${!locationFeatureLoading && isLocationEnabled ? 'grid-cols-4' : 'grid-cols-3'}`}>
            {!locationFeatureLoading && isLocationEnabled && (
              <Button
                size="sm"
                className={`${getLocationBtnClass()} p-1.5 sm:p-2 h-8 sm:h-10 text-xs sm:text-sm flex flex-col items-center gap-0.5`}
                onClick={handleLocationClick}
                title={getLocationBtnTitle()}
              >
                <MapPin size={12} className="sm:size-3.5" />
                <span className="text-xs">Check-In/Out</span>
              </Button>
            )}

            <Button
              variant={hasOrderToday ? "default" : "outline"}
              size="sm"
              className={`p-1.5 sm:p-2 h-8 sm:h-10 text-xs sm:text-sm flex flex-col items-center gap-0.5 ${
                hasOrderToday ? "bg-success text-success-foreground" : ""
              } ${
                (isCheckInMandatory && !isCheckedIn && !proceedWithoutCheckIn && isLocationEnabled) || !isTodaysVisit
                  ? "opacity-50 cursor-not-allowed"
                  : ""
              }`}
              onClick={async () => {
                console.time('⚡ Order button to navigation');
                console.log("Order button clicked - Debug info:", {
                  isCheckInMandatory,
                  isCheckedIn,
                  proceedWithoutCheckIn,
                  isTodaysVisit,
                  selectedDate,
                  currentDate: new Date().toISOString().split("T")[0],
                });

                // Check if it's not today's visit
                if (!isTodaysVisit) {
                  toast({
                    title: "Cannot Place Order",
                    description: "You can only place orders for today's visits. Please select today's date.",
                    variant: "destructive",
                  });
                  return;
                }

                const retailerId = (visit.retailerId || visit.id) as string;

                // When completely offline, allow direct navigation to OrderEntry using offline order flow
                if (typeof navigator !== "undefined" && navigator.onLine === false) {
                  console.log("Offline mode: navigating directly to OrderEntry without ensuring visit", {
                    retailerId,
                  });
                  navigate(
                    `/order-entry?retailerId=${encodeURIComponent(retailerId)}&retailer=${encodeURIComponent(
                      visit.retailerName,
                    )}`,
                  );
                  console.timeEnd('⚡ Order button to navigation');
                  return;
                }

                // Check if check-in is required but not done (only if location feature is enabled)
                if (isLocationEnabled && isCheckInMandatory && !isCheckedIn && !proceedWithoutCheckIn) {
                  toast({
                    title: "Check-in Required",
                    description: "Please check in first to place an order.",
                    variant: "destructive",
                  });
                  return;
                }

                try {
                  const {
                    data: { user },
                  } = await supabase.auth.getUser();

                  if (!user) {
                    toast({
                      title: "Login required",
                      description: "Please sign in to place orders.",
                      variant: "destructive",
                    });
                    return;
                  }

                  const today = new Date().toISOString().split("T")[0];

                  // Navigate immediately for instant feedback
                  const retailerNameEncoded = encodeURIComponent(visit.retailerName);
                  const retailerIdEncoded = encodeURIComponent(retailerId);

                  navigate(
                    `/order-entry?retailerId=${retailerIdEncoded}&retailer=${retailerNameEncoded}`,
                  );
                  console.timeEnd('⚡ Order button to navigation');

                  // In the background (non-blocking), ensure visit exists and cache visitId for future
                  (async () => {
                    try {
                      const {
                        data: { user },
                      } = await supabase.auth.getUser();

                      if (!user) {
                        return;
                      }

                      const today = new Date().toISOString().split("T")[0];
                      const cachedVisitKey = `visit_${user.id}_${retailerId}_${today}`;

                      // If already cached, no need to hit Supabase again
                      if (localStorage.getItem(cachedVisitKey)) {
                        return;
                      }

                      const visitId = await ensureVisit(user.id, retailerId, today);
                      localStorage.setItem(cachedVisitKey, visitId);
                      setCurrentVisitId(visitId);

                      // Optionally update URL with visitId without blocking initial navigation
                      const visitIdEncoded = encodeURIComponent(visitId);
                      navigate(
                        `/order-entry?retailerId=${retailerIdEncoded}&visitId=${visitIdEncoded}&retailer=${retailerNameEncoded}`,
                        { replace: true },
                      );
                    } catch (err) {
                      console.error('Background ensureVisit failed:', err);
                    }

                    // Run tracking in background (still non-blocking for UI)
                    try {
                      await startTracking('order', skipCheckInReason === 'phone-order');
                    } catch (err) {
                      console.error('Background tracking failed:', err);
                    }
                  })();
                } catch (err: any) {
                  console.error("Open order entry error:", err);
                  toast({
                    title: "Unable to open order entry",
                    description: err?.message || "Please try again.",
                    variant: "destructive",
                  });
                }
              }}
              title={
                isLocationEnabled && !isCheckedIn && !proceedWithoutCheckIn
                  ? "Check in first to place order"
                  : `Order${
                      visit.orderValue || hasOrderToday
                        ? ` (₹${visit.orderValue ? visit.orderValue.toLocaleString() : "Order Placed"})`
                        : ""
                    }`
              }
            >
              <ShoppingCart size={12} className="sm:size-3.5" />
              <span className="text-xs">Order</span>
            </Button>

            <Button variant="outline" size="sm" className="p-1.5 sm:p-2 h-8 sm:h-10 text-xs sm:text-sm flex flex-col items-center gap-0.5" onClick={async () => {
            // Start tracking visit time and location
            await startTracking('feedback', skipCheckInReason === 'phone-order');
            setShowFeedbackModal(true);
          }} title="Feedback - Branding, Retailer Feedback & Competition Insights">
              <MessageSquare size={12} className="sm:size-3.5" />
              <span className="text-xs">Feedback</span>
            </Button>

            <Button variant="outline" size="sm" className="p-1.5 sm:p-2 h-8 sm:h-10 text-xs sm:text-sm flex flex-col items-center gap-0.5 border-primary/50 hover:bg-primary/10" onClick={async () => {
            try {
              const {
                data: {
                  user
                }
              } = await supabase.auth.getUser();
              if (!user) {
                toast({
                  title: 'Login required',
                  description: 'Please sign in first.',
                  variant: 'destructive'
                });
                return;
              }
              const today = new Date().toISOString().split('T')[0];
              const retailerId = (visit.retailerId || visit.id) as string;
              const visitId = await ensureVisit(user.id, retailerId, today);
              setCurrentVisitId(visitId);

              // Start tracking visit time and location
              await startTracking('ai', skipCheckInReason === 'phone-order');
              setShowAIInsights(true);
            } catch (err: any) {
              console.error('Open AI insights error', err);
              toast({
                title: 'Unable to open',
                description: err.message || 'Try again.',
                variant: 'destructive'
              });
            }
          }} title="AI Insights - Get personalized visit recommendations">
              <Sparkles size={12} className="sm:size-3.5 text-primary" />
              <span className="text-xs">AI</span>
            </Button>
          </div>

          {(visit.hasOrder || hasOrderToday) && <div className="mt-2 p-2 rounded-lg border border-primary/20 bg-primary/5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {selectedDate ? `${new Date(selectedDate).toDateString() === new Date().toDateString() ? "Today's" : new Date(selectedDate).toLocaleDateString()} Order` : "Today's Order"}
                </span>
                <Button variant="ghost" size="sm" className="h-7" onClick={async () => {
              const next = !orderPreviewOpen;
              setOrderPreviewOpen(next);
              if (next && lastOrderItems.length === 0) {
                await loadLastOrder();
              }
            }}>
                  {orderPreviewOpen ? 'Hide' : 'View'}
                </Button>
              </div>
              
              {orderPreviewOpen && <>
                  {/* Order Summary (All payments) */}
                  <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">Total Amount:</span>
                      <span className="font-semibold">₹{actualOrderValue.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-success">Paid Amount:</span>
                      <span className="font-medium text-success">₹{paidTodayAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-warning">Pending Amount:</span>
                      <span className="font-medium text-warning">₹{creditPendingAmount.toLocaleString()}</span>
                    </div>
                  </div>
                  
                  {/* Order Items (Aggregated from all orders today) */}
                  <div className="mt-2 space-y-1">
                    {loadingOrder && <div className="text-xs text-muted-foreground">Loading...</div>}
                    {!loadingOrder && lastOrderItems.length === 0 && <div className="text-xs text-muted-foreground">No items found.</div>}
                    {!loadingOrder && lastOrderItems.map((it, idx) => <div key={idx} className="flex justify-between items-center text-xs">
                        <span className="truncate pr-2">{it.product_name}</span>
                        <div className="whitespace-nowrap text-right">
                          <div className="flex flex-col">
                            <span className="font-medium">{it.quantity} x ₹{it.actualRate.toFixed(2)}</span>
                            {it.actualRate !== it.rate && <span className="text-xs text-muted-foreground line-through">₹{it.rate.toFixed(2)}</span>}
                          </div>
                        </div>
                      </div>)}
                  </div>
                  
                  {/* Invoice Generation Button */}
                  {lastOrderId && <div className="mt-3 pt-2 border-t">
                      <VisitInvoicePDFGenerator orderId={lastOrderId} customerPhone={visit.phone} className="w-full" />
                    </div>}
                </>}
            </div>}
        </div>

        {/* Camera Capture Modal */}
        <CameraCapture isOpen={showCameraCapture} onClose={() => {
        setShowCameraCapture(false);
        pendingPhotoActionRef.current = null;
        pendingCheckDataRef.current = null;
      }} onCapture={handlePhotoCaptured} title="Check-In Photo" description="Position yourself in the frame and capture your photo" />

        {/* Location Modal */}
        <Dialog open={showLocationModal} onOpenChange={setShowLocationModal}>
          <DialogContent className="w-[95%] max-w-sm mx-auto rounded-lg">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold text-center">Location Options</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-4">
              {isLocationEnabled && !isCheckedIn && isTodaysVisit && <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-sm text-blue-800 dark:text-blue-200">
                  <p className="font-medium mb-1">📍 Location & Camera Required</p>
                  <p className="text-xs">Please allow location and camera access when prompted for check-in.</p>
                </div>}
              {isLocationEnabled && <div className="grid grid-cols-2 gap-2">
                <Button onClick={() => handleCheckInOut('checkin')} className={`w-full h-12 text-base font-medium ${isCheckedIn || !isTodaysVisit ? 'bg-muted text-muted-foreground cursor-not-allowed' : 'bg-primary hover:bg-primary/90'}`} disabled={isCheckedIn || !isTodaysVisit}>
                  <LogIn className="mr-2 h-5 w-5" />
                  {isCheckedIn ? 'Checked In' : 'Check In'}
                </Button>
                <Button onClick={async () => {
                try {
                  const {
                    data: {
                      user
                    }
                  } = await supabase.auth.getUser();
                  if (user) {
                    const today = new Date().toISOString().split('T')[0];
                    const retailerId = visit.retailerId || visit.id;

                    // Auto check-out any previous in-progress visit before phone order
                    await autoCheckOutPreviousVisit(user.id, retailerId, today);
                    const visitId = await ensureVisit(user.id, retailerId, today);

                    // Update visit with phone order reason and set to in-progress
                    await supabase.from('visits').update({
                      status: 'in-progress',
                      skip_check_in_reason: 'phone-order',
                      skip_check_in_time: new Date().toISOString()
                    } as any).eq('id', visitId);

                    // Dispatch event to notify parent components
                    window.dispatchEvent(new CustomEvent('visitStatusChanged', {
                      detail: {
                        visitId,
                        status: 'in-progress',
                        retailerId
                      }
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
                    description: 'You can now record order or no order.'
                  });
                } catch (err: any) {
                  console.error('Phone order error:', err);
                  toast({
                    title: 'Error',
                    description: 'Failed to proceed with phone order.',
                    variant: 'destructive'
                  });
                }
              }} variant={isCheckedIn || !isTodaysVisit ? "outline" : "default"} className={`w-full h-12 text-base font-medium ${isCheckedIn || !isTodaysVisit ? 'bg-muted text-muted-foreground cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600'}`} disabled={isCheckedIn || !isTodaysVisit}>
                    <Phone className="mr-2 h-5 w-5" />
                    Phone Order
                  </Button>
                </div>}
              
              {isLocationEnabled && <Button onClick={() => handleCheckInOut('checkout')} className={`w-full h-12 text-base font-medium ${isCheckedOut ? 'bg-success text-success-foreground hover:bg-success/90 border-success' : !isCheckedIn || !isTodaysVisit ? 'bg-muted text-muted-foreground cursor-not-allowed border-muted' : 'border-primary text-primary hover:bg-primary hover:text-primary-foreground'}`} variant={isCheckedOut ? "default" : "outline"} disabled={!isCheckedIn || isCheckedOut || !isTodaysVisit}>
                  <LogOut className="mr-2 h-5 w-5" />
                  {isCheckedOut ? 'Checked Out' : 'Check Out'}
                </Button>}
              
              {isLocationEnabled && <div className="pt-2 border-t">
                  {!showReasonInput && !proceedWithoutCheckIn && !isCheckedIn && <button onClick={() => setShowReasonInput(true)} className="w-full text-sm text-primary hover:underline text-center py-2">
                    Click here to proceed without Check-in
                  </button>}
                
                {showReasonInput && !proceedWithoutCheckIn && <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Reason for proceeding without check-in:
                      </label>
                      <Select value={skipCheckInReasonType} onValueChange={async value => {
                    setSkipCheckInReasonType(value);
                    // Clear custom reason when changing from "Other" to predefined
                    if (value !== 'other') {
                      setSkipCheckInReason('');
                    }

                    // If internet issue is selected, check speed immediately
                    if (value === 'internet-issue') {
                      toast({
                        title: 'Checking Internet Speed',
                        description: 'Please wait while we verify your connection...'
                      });
                      try {
                        const uploadSpeed = await checkUploadSpeed();
                        if (uploadSpeed >= 4) {
                          toast({
                            title: 'Internet Connection Sufficient',
                            description: `Your upload speed is good enough to proceed with normal check-in (above the 4 Mbps threshold)`,
                            variant: 'destructive',
                            duration: 8000
                          });
                          // Reset selection since internet is sufficient
                          setSkipCheckInReasonType('');
                        } else {
                          toast({
                            title: 'Low Internet Speed Confirmed',
                            description: `Upload speed: ${uploadSpeed.toFixed(2)} Mbps (below 4 Mbps threshold). You can proceed without check-in.`,
                            duration: 6000
                          });
                        }
                      } catch (error) {
                        console.error('Speed test failed:', error);
                        toast({
                          title: 'Speed Test Failed',
                          description: 'Could not verify internet speed. You can still proceed with this reason.',
                          duration: 5000
                        });
                      }
                    }

                    // If photo upload issue is selected, check for upload attempts and errors
                    if (value === 'photo-upload-issue') {
                      toast({
                        title: 'Checking Upload History',
                        description: 'Verifying recent upload attempts...'
                      });
                      try {
                        // First check if user has attempted any uploads in the last 5 minutes
                        const hasAttempts = hasRecentUploadAttempts();
                        if (!hasAttempts) {
                          toast({
                            title: 'No Upload Attempt Detected',
                            description: 'You have not tried to upload any photo in check-in. First try to upload using check-in, then use this option.',
                            variant: 'destructive',
                            duration: 8000
                          });
                          // Reset selection since no upload attempt was made
                          setSkipCheckInReasonType('');
                          return;
                        }

                        // If attempts were made, check for errors
                        const {
                          hasErrors,
                          errorCount,
                          errors
                        } = hasRecentUploadErrors();
                        if (!hasErrors) {
                          toast({
                            title: 'No Upload Issues Detected',
                            description: 'No issue detected with photo upload. Please proceed with normal check-in.',
                            variant: 'destructive',
                            duration: 8000
                          });
                          // Reset selection since no errors found
                          setSkipCheckInReasonType('');
                        } else {
                          toast({
                            title: 'Upload Errors Found',
                            description: `Detected ${errorCount} upload error(s) in recent logs. You can proceed without check-in.`,
                            duration: 6000
                          });
                          console.log('Recent upload errors:', errors);
                        }
                      } catch (error) {
                        console.error('Upload verification failed:', error);
                        toast({
                          title: 'Verification Failed',
                          description: 'Could not verify upload history. You can still proceed with this reason.',
                          duration: 5000
                        });
                      }
                    }
                  }}>
                        <SelectTrigger className="w-full bg-background z-50">
                          <SelectValue placeholder="Select a reason" />
                        </SelectTrigger>
                        <SelectContent className="bg-background z-50">
                          <SelectItem value="internet-issue">Internet issue</SelectItem>
                          <SelectItem value="system-slow">System is slow and not allowing checkin</SelectItem>
                          <SelectItem value="photo-upload-issue">Photo not getting uploaded</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {skipCheckInReasonType === 'other' && <div>
                        <label className="text-sm font-medium mb-2 block">
                          Enter your reason:
                        </label>
                        <textarea value={skipCheckInReason} onChange={e => setSkipCheckInReason(e.target.value)} className="w-full min-h-[80px] p-2 text-sm border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary" placeholder="Enter your reason here..." />
                      </div>}
                    
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => {
                    setShowReasonInput(false);
                    setSkipCheckInReason('');
                    setSkipCheckInReasonType('');
                  }}>
                        Cancel
                      </Button>
                      <Button size="sm" className="flex-1" onClick={async () => {
                    // Get the final reason: use dropdown value if not "other", otherwise use custom text
                    const finalReason = skipCheckInReasonType === 'other' ? skipCheckInReason.trim() : skipCheckInReasonType ? skipCheckInReasonType.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '';
                    if (finalReason) {
                      try {
                        const {
                          data: {
                            user
                          }
                        } = await supabase.auth.getUser();
                        if (user) {
                          const today = new Date().toISOString().split('T')[0];
                          const retailerId = visit.retailerId || visit.id;

                          // Auto check-out any previous in-progress visit before proceeding
                          await autoCheckOutPreviousVisit(user.id, retailerId, today);
                          const visitId = await ensureVisit(user.id, retailerId, today);

                          // Update visit with skip check-in reason and set to in-progress
                          await supabase.from('visits').update({
                            status: 'in-progress',
                            skip_check_in_reason: finalReason,
                            skip_check_in_time: new Date().toISOString()
                          } as any).eq('id', visitId);
                          setProceedWithoutCheckIn(true);
                          setPhase('in-progress');
                          setIsCheckedIn(true);
                          setShowLocationModal(false);
                          setShowReasonInput(false);
                          setSkipCheckInReason('');
                          setSkipCheckInReasonType('');

                          // Dispatch event to notify parent components
                          window.dispatchEvent(new CustomEvent('visitStatusChanged', {
                            detail: {
                              visitId,
                              status: 'in-progress',
                              retailerId
                            }
                          }));
                          toast({
                            title: 'Proceeding without check-in',
                            description: 'You can now access Order and No Order options.'
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
                        description: 'Please select or enter a reason to proceed.',
                        variant: 'destructive'
                      });
                    }
                  }} disabled={!skipCheckInReasonType || skipCheckInReasonType === 'other' && !skipCheckInReason.trim()}>
                        Submit
                      </Button>
                    </div>
                  </div>}
                
                  {proceedWithoutCheckIn && <div className="text-sm text-center py-2 text-muted-foreground">
                      Proceeding without check-in
                    </div>}
                </div>}
            </div>
          </DialogContent>
        </Dialog>

        {/* Modals */}
        <NoOrderModal isOpen={showNoOrderModal} onClose={() => setShowNoOrderModal(false)} onReasonSelect={handleNoOrderReasonSelect} currentReason={noOrderReason} />

         {/* Unified Feedback Modal with Tabs */}
        {showFeedbackModal && feedbackActiveTab === "retailer-feedback" && <RetailerFeedbackModal isOpen={true} onClose={() => { setShowFeedbackModal(false); setFeedbackActiveTab("menu"); }} onBack={() => setFeedbackActiveTab("menu")} visitId={currentVisitId || visit.id} retailerId={(visit.retailerId || visit.id) as string} retailerName={visit.retailerName} />}

        {showFeedbackModal && feedbackActiveTab === "branding" && <BrandingRequestModal isOpen={true} onClose={() => { setShowFeedbackModal(false); setFeedbackActiveTab("menu"); }} onBack={() => setFeedbackActiveTab("menu")} defaultVisitId={currentVisitId} defaultRetailerId={(visit.retailerId || visit.id) as string} defaultPincode={null} />}

        {showFeedbackModal && feedbackActiveTab === "joint-sales-feedback" && <JointSalesFeedbackModal isOpen={true} onClose={() => { setShowFeedbackModal(false); setFeedbackActiveTab("menu"); }} visitId={currentVisitId || visit.id} retailerId={(visit.retailerId || visit.id) as string} retailerName={visit.retailerName} beatPlanId={beatPlanId} managerId={jointSalesMemberId} onFeedbackSubmitted={() => setHasJointSalesFeedback(true)} />}

        {showFeedbackModal && feedbackActiveTab === "competition" && (
          <Dialog open={true} onOpenChange={(open) => {
            if (!open) {
              setShowFeedbackModal(false);
              setFeedbackActiveTab("menu");
            }
          }}>
            <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] p-0 overflow-hidden">
              <div className="bg-gradient-to-br from-red-500/10 via-red-400/5 to-background p-4 border-b">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-lg">
                    <Target className="h-5 w-5 text-red-600" />
                    Competition Data - {visit.retailerName}
                  </DialogTitle>
                </DialogHeader>
              </div>
              <ScrollArea className="max-h-[calc(90vh-80px)] p-4">
                <CompetitionDataForm 
                  retailerId={(visit.retailerId || visit.id) as string} 
                  visitId={currentVisitId || visit.id} 
                  onSave={() => { 
                    setShowFeedbackModal(false); 
                    setFeedbackActiveTab("menu"); 
                  }} 
                />
              </ScrollArea>
            </DialogContent>
          </Dialog>
        )}

         {/* Tab Selector Modal */}
        <Dialog open={showFeedbackModal && !['retailer-feedback', 'branding', 'joint-sales-feedback', 'competition'].includes(feedbackActiveTab)} onOpenChange={open => {
        if (!open) {
          setShowFeedbackModal(false);
          setFeedbackActiveTab("menu");
        }
      }}>
          <DialogContent className="max-w-[95vw] sm:max-w-md p-0 overflow-hidden">
            <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background p-6">
              <DialogHeader className="space-y-3">
                <DialogTitle className="text-xl font-bold text-center">Feedback Options</DialogTitle>
                <div className="text-center">
                  <p className="text-lg font-semibold text-primary">{visit.retailerName}</p>
                  <p className="text-xs text-muted-foreground mt-1">{visit.address}</p>
                </div>
              </DialogHeader>
            </div>
            <div className="p-5 space-y-3">
              <Button 
                variant="outline" 
                className="w-full h-auto py-4 px-4 flex items-center gap-4 hover:bg-primary/5 hover:border-primary/50 transition-all group" 
                onClick={() => setFeedbackActiveTab("retailer-feedback")}
              >
                <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center group-hover:bg-blue-200 dark:group-hover:bg-blue-800/50 transition-colors">
                  <MessageSquare size={22} className="text-blue-600 dark:text-blue-400" />
                </div>
                <div className="text-left flex-1">
                  <div className="font-semibold text-base">Retailer Feedback</div>
                  <div className="text-xs text-muted-foreground">Share feedback about the retailer</div>
                </div>
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full h-auto py-4 px-4 flex items-center gap-4 hover:bg-primary/5 hover:border-primary/50 transition-all group" 
                onClick={() => setFeedbackActiveTab("branding")}
              >
                <div className="h-12 w-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center group-hover:bg-orange-200 dark:group-hover:bg-orange-800/50 transition-colors">
                  <Paintbrush size={22} className="text-orange-600 dark:text-orange-400" />
                </div>
                <div className="text-left flex-1">
                  <div className="font-semibold text-base">Branding Request</div>
                  <div className="text-xs text-muted-foreground">Request branding materials</div>
                </div>
              </Button>
              
              {isJointSalesVisit && (
                <Button 
                  variant="outline" 
                  className="w-full h-auto py-4 px-4 flex items-center gap-4 hover:bg-primary/5 hover:border-primary/50 transition-all group" 
                  onClick={() => setFeedbackActiveTab("joint-sales-feedback")}
                >
                  <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center group-hover:bg-green-200 dark:group-hover:bg-green-800/50 transition-colors">
                    <Users size={22} className="text-green-600 dark:text-green-400" />
                  </div>
                  <div className="text-left flex-1">
                    <div className="font-semibold text-base">Joint Sales Feedback</div>
                    <div className="text-xs text-muted-foreground">Record joint visit feedback</div>
                  </div>
                </Button>
              )}
              
              {!isJointSalesVisit && (
                <Button 
                  variant="outline" 
                  className="w-full h-auto py-4 px-4 flex items-center gap-4 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:border-purple-300 dark:hover:border-purple-700 transition-all group" 
                  onClick={() => setFeedbackActiveTab("joint-sales-feedback")}
                >
                  <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center group-hover:bg-purple-200 dark:group-hover:bg-purple-800/50 transition-colors">
                    <UserCheck size={22} className="text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="text-left flex-1">
                    <div className="font-semibold text-base">Joint Visit Feedback</div>
                    <div className="text-xs text-muted-foreground">Record feedback from joint visit</div>
                  </div>
                </Button>
              )}
              
              <Button 
                variant="outline" 
                className="w-full h-auto py-4 px-4 flex items-center gap-4 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-300 dark:hover:border-red-700 transition-all group" 
                onClick={() => setFeedbackActiveTab("competition")}
              >
                <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center group-hover:bg-red-200 dark:group-hover:bg-red-800/50 transition-colors">
                  <BarChart3 size={22} className="text-red-600 dark:text-red-400" />
                </div>
                <div className="text-left flex-1">
                  <div className="font-semibold text-base">Competition Insight</div>
                  <div className="text-xs text-muted-foreground">Record competitor information</div>
                </div>
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <StockCycleModal isOpen={showStockCycleModal} onClose={() => setShowStockCycleModal(false)} visitId={currentVisitId || visit.id} retailerId={(visit.retailerId || visit.id) as string} retailerName={visit.retailerName} />

        {/* Analytics Modal */}
        <AnalyticsModal isOpen={showAnalyticsModal} onClose={() => setShowAnalyticsModal(false)} visitId={currentVisitId || visit.id} retailerId={(visit.retailerId || visit.id) as string} retailerName={visit.retailerName} onViewDetails={onViewDetails} />

        {/* Stock Data Modal */}
        <StockDataModal isOpen={showStockDataModal} onClose={() => setShowStockDataModal(false)} retailerId={(visit.retailerId || visit.id) as string} retailerName={visit.retailerName} />

        {/* Payment Marking Modal */}
        <PaymentMarkingModal open={showPaymentModal} onOpenChange={setShowPaymentModal} retailerId={(visit.retailerId || visit.id) as string} currentPendingAmount={pendingAmount} onPaymentMarked={() => {
        // Refresh the visit data
        window.dispatchEvent(new CustomEvent('visitStatusChanged'));
      }} />

        {/* Van Sales Modal */}
        {showVanSales && <VanSalesModal open={showVanSales} onOpenChange={setShowVanSales} retailerId={(visit.retailerId || visit.id) as string} visitId={currentVisitId || visit.id} />}

        {/* Retailer Analytics Modal */}
        {showRetailerAnalytics && <RetailerAnalytics isOpen={showRetailerAnalytics} retailer={{
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
      }} onClose={() => setShowRetailerAnalytics(false)} />}

        {/* AI Insights Modal */}
        <VisitAIInsightsModal isOpen={showAIInsights} onClose={() => setShowAIInsights(false)} retailerId={(visit.retailerId || visit.id) as string} retailerName={visit.retailerName} visitId={currentVisitId || visit.id} />
        
        {/* Visit Details Modal */}
        {currentLog && <RetailerVisitDetailsModal open={showVisitDetailsModal} onOpenChange={setShowVisitDetailsModal} retailerName={visit.retailerName} startTime={currentLog.start_time} endTime={currentLog.end_time} timeSpent={timeSpent} distance={trackingDistance} locationStatus={trackingLocationStatus} actionType={currentLog.action_type} isPhoneOrder={currentLog.is_phone_order} logId={currentLog.id} />}
        
        {/* Joint Sales Feedback Modal */}
        {showJointSalesFeedback && (
          <JointSalesFeedbackModal
            isOpen={showJointSalesFeedback}
            onClose={() => setShowJointSalesFeedback(false)}
            retailerId={visit.retailerId || visit.id}
            retailerName={visit.retailerName}
            beatPlanId={beatPlanId}
            visitId={currentVisitId || undefined}
            managerId={jointSalesMemberId}
            onFeedbackSubmitted={() => setHasJointSalesFeedback(true)}
          />
        )}
        
        {/* Joint Sales Feedback View Modal */}
        {showJointSalesFeedbackView && (
          <JointSalesFeedbackViewModal
            isOpen={showJointSalesFeedbackView}
            onClose={() => setShowJointSalesFeedbackView(false)}
            retailerId={visit.retailerId || visit.id}
            retailerName={visit.retailerName}
            feedbackDate={selectedDate || new Date().toISOString().split('T')[0]}
            onEdit={() => {
              setShowJointSalesFeedbackView(false);
              setShowJointSalesFeedback(true);
            }}
            onDeleted={() => {
              setHasJointSalesFeedback(false);
              setShowJointSalesFeedbackView(false);
            }}
          />
        )}
        
        {/* Retailer Overview Modal */}
        {retailerOverviewData && (
          <RetailerDetailModal
            isOpen={showRetailerOverview}
            onClose={() => setShowRetailerOverview(false)}
            retailer={retailerOverviewData}
            onSuccess={() => {}}
          />
        )}
      </CardContent>
    </Card>;
};
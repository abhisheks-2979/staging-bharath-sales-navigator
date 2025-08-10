import { MapPin, Phone, Store, ShoppingCart, XCircle, BarChart3, Check, Users, MessageSquare, Paintbrush } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { toast } from "@/hooks/use-toast";
import { CompetitionInsightModal } from "./CompetitionInsightModal";
import { RetailerFeedbackModal } from "./RetailerFeedbackModal";
import { NoOrderModal } from "./NoOrderModal";
import { supabase } from "@/integrations/supabase/client";
import BrandingRequestModal from "./BrandingRequestModal";

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
}

export const VisitCard = ({ visit, onViewDetails }: VisitCardProps) => {
  const navigate = useNavigate();
  const [showNoOrderModal, setShowNoOrderModal] = useState(false);
  const [noOrderReason, setNoOrderReason] = useState<string>(visit.noOrderReason || "");
  const [showCompetitionModal, setShowCompetitionModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showBrandingModal, setShowBrandingModal] = useState(false);
  const [hasViewedAnalytics, setHasViewedAnalytics] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'in-progress' | 'completed'>(visit.status === 'in-progress' ? 'in-progress' : 'idle');
  const [locationMatchIn, setLocationMatchIn] = useState<boolean | null>(null);
  const [locationMatchOut, setLocationMatchOut] = useState<boolean | null>(null);
  const [currentVisitId, setCurrentVisitId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingPhotoActionRef = useRef<'checkin' | 'checkout' | null>(null);
  
  // Check if user has viewed analytics for this visit
  useEffect(() => {
    const checkAnalyticsView = async () => {
      try {
        const { data: user } = await supabase.auth.getUser();
        if (user.user) {
          const { data, error } = await supabase
            .from('analytics_views')
            .select('id')
            .eq('user_id', user.user.id)
            .eq('visit_id', visit.id)
            .single();
          
          if (data && !error) {
            setHasViewedAnalytics(true);
          }
        }
      } catch (error) {
        console.log('Analytics view check error:', error);
      }
    };

    checkAnalyticsView();
  }, [visit.id]);

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
    if (phase === 'completed') {
      return (locationMatchOut ?? false)
        ? "bg-success text-success-foreground hover:bg-success/90"
        : "bg-destructive text-destructive-foreground hover:bg-destructive/90";
    }
    if (phase === 'in-progress') {
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

  const handleLocationClick = async () => {
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

      if (phase === 'idle') {
        const { error } = await supabase
          .from('visits')
          .update({
            check_in_time: new Date().toISOString(),
            check_in_location: current,
            location_match_in: match,
            status: 'in-progress'
          })
          .eq('id', visitId);
        if (error) throw error;
        setPhase('in-progress');
        setLocationMatchIn(match);
        toast({ title: 'Checked in', description: match === false ? 'Location mismatch' : 'Location verified' });
        pendingPhotoActionRef.current = 'checkin';
        fileInputRef.current?.click();
      } else if (phase === 'in-progress') {
        const { error } = await supabase
          .from('visits')
          .update({
            check_out_time: new Date().toISOString(),
            check_out_location: current,
            location_match_out: match,
            status: 'completed'
          })
          .eq('id', visitId);
        if (error) throw error;
        setPhase('completed');
        setLocationMatchOut(match);
        toast({ title: 'Checked out', description: match === false ? 'Location mismatch' : 'Location verified' });
        pendingPhotoActionRef.current = 'checkout';
        fileInputRef.current?.click();
      }
    } catch (err: any) {
      console.error('Check-in/out error', err);
      toast({ title: 'Location/Permission error', description: err.message || 'Enable GPS and try again.', variant: 'destructive' });
    }
  };
  const handleNoOrderReasonSelect = (reason: string) => {
    setNoOrderReason(reason);
    toast({
      title: "No Order Recorded",
      description: `Reason: ${reason.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}`,
    });
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
          {/* Main action buttons */}
          <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
            <Button 
              size="sm" 
              className={`${getLocationBtnClass()} p-1.5 sm:p-2 h-8 sm:h-10 text-xs sm:text-sm`}
              onClick={handleLocationClick}
              title={getLocationBtnTitle()}
            >
              <MapPin size={14} className="sm:size-4" />
            </Button>
            
            <Button 
              variant={visit.hasOrder ? "default" : "outline"}
              size="sm"
              className={`p-1.5 sm:p-2 h-8 sm:h-10 text-xs sm:text-sm ${visit.hasOrder ? "bg-success text-success-foreground hover:bg-success/90" : ""}`}
              onClick={() => navigate(`/order-entry?visitId=${visit.id}&retailer=${visit.retailerName}`)}
              title={`Order${visit.orderValue ? ` (₹${visit.orderValue.toLocaleString()})` : ""}`}
            >
              <ShoppingCart size={14} className="sm:size-4" />
            </Button>
            
            <Button 
              variant={noOrderReason ? "default" : "outline"}
              size="sm"
              className={`p-1.5 sm:p-2 h-8 sm:h-10 text-xs sm:text-sm ${noOrderReason ? "bg-success text-success-foreground hover:bg-success/90" : ""}`}
              onClick={() => setShowNoOrderModal(true)}
              title={`No-order${noOrderReason ? ` (${noOrderReason.replace(/-/g, ' ')})` : ""}`}
            >
              {noOrderReason ? <Check size={14} className="sm:size-4" /> : <XCircle size={14} className="sm:size-4" />}
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              className={`p-1.5 sm:p-2 h-8 sm:h-10 text-xs sm:text-sm ${
                hasViewedAnalytics ? "bg-success text-success-foreground hover:bg-success/90" : ""
              }`}
              onClick={() => handleViewAnalytics(visit.id)}
              title="Analytics"
            >
              <BarChart3 size={14} className="sm:size-4" />
            </Button>
          </div>

          {/* Secondary action buttons */}
          <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
            <Button 
              variant="outline" 
              size="sm"
              className="p-1.5 sm:p-2 h-8 sm:h-10 text-xs sm:text-sm"
              onClick={() => setShowCompetitionModal(true)}
              title="Competition Insights"
            >
              <Users size={12} className="sm:size-3.5 mr-1" />
              <span className="hidden xs:inline">Competition</span>
              <span className="xs:hidden">Comp</span>
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              className="p-1.5 sm:p-2 h-8 sm:h-10 text-xs sm:text-sm"
              onClick={() => setShowFeedbackModal(true)}
              title="Retailer Feedback"
            >
              <MessageSquare size={12} className="sm:size-3.5 mr-1" />
              <span className="hidden xs:inline">Feedback</span>
              <span className="xs:hidden">Feed</span>
            </Button>
          </div>
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
          visitId={visit.id}
          retailerId={visit.id} // Using visit.id as retailer ID for now
          retailerName={visit.retailerName}
        />

        <RetailerFeedbackModal
          isOpen={showFeedbackModal}
          onClose={() => setShowFeedbackModal(false)}
          visitId={visit.id}
          retailerId={visit.id} // Using visit.id as retailer ID for now
          retailerName={visit.retailerName}
        />
      </CardContent>
    </Card>
  );
};
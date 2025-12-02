import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface VisitLog {
  id: string;
  retailer_id: string;
  start_time: string;
  end_time: string | null;
  time_spent_seconds: number | null;
  distance_meters: number | null;
  location_status: 'at_store' | 'within_range' | 'not_at_store' | 'location_unavailable';
  action_type: 'order' | 'feedback' | 'ai' | 'phone_order';
  is_phone_order: boolean;
}

interface UseRetailerVisitTrackingProps {
  retailerId: string;
  retailerLat?: number;
  retailerLng?: number;
  visitId?: string;
  userId: string;
  selectedDate?: string;
}

// Haversine formula to calculate distance between two coordinates in meters
const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const getLocationStatus = (distance: number | null): 'at_store' | 'within_range' | 'not_at_store' | 'location_unavailable' => {
  if (distance === null) return 'location_unavailable';
  if (distance <= 15) return 'at_store';
  if (distance <= 50) return 'within_range';
  return 'not_at_store';
};

export const useRetailerVisitTracking = ({
  retailerId,
  retailerLat,
  retailerLng,
  visitId,
  userId,
  selectedDate
}: UseRetailerVisitTrackingProps) => {
  const [currentLog, setCurrentLog] = useState<VisitLog | null>(null);
  const [locationStatus, setLocationStatus] = useState<'at_store' | 'within_range' | 'not_at_store' | 'location_unavailable'>('location_unavailable');
  const [timeSpent, setTimeSpent] = useState<number>(0); // in seconds
  const [distance, setDistance] = useState<number | null>(null);
  const currentLogIdRef = useRef<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Format time spent for display
  const formatTimeSpent = useCallback((seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  }, []);

  // Load existing log for today
  useEffect(() => {
    const loadTodayLog = async () => {
      const targetDate = selectedDate || new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('retailer_visit_logs')
        .select('*')
        .eq('user_id', userId)
        .eq('retailer_id', retailerId)
        .eq('visit_date', targetDate)
        .order('start_time', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        const log = data as VisitLog;
        setCurrentLog(log);
        currentLogIdRef.current = log.id;
        
        // Restore distance and location status
        if (log.distance_meters !== null) {
          setDistance(log.distance_meters);
        }
        if (log.location_status) {
          setLocationStatus(log.location_status as 'at_store' | 'within_range' | 'not_at_store' | 'location_unavailable');
        } else {
          // Fallback to location_unavailable when status is missing
          setLocationStatus('location_unavailable');
        }

        // Calculate time spent if still active (no end_time)
        if (!log.end_time) {
          const startTime = new Date(log.start_time).getTime();
          const now = Date.now();
          const spent = Math.floor((now - startTime) / 1000);
          setTimeSpent(spent);
        } else if (log.time_spent_seconds) {
          setTimeSpent(log.time_spent_seconds);
        }
      }
    };

    if (userId && retailerId) {
      loadTodayLog();
    }
  }, [userId, retailerId, selectedDate]);

  // Update time spent every second for active logs
  useEffect(() => {
    if (currentLog && !currentLog.end_time) {
      intervalRef.current = setInterval(() => {
        const startTime = new Date(currentLog.start_time).getTime();
        const now = Date.now();
        const spent = Math.floor((now - startTime) / 1000);
        setTimeSpent(spent);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [currentLog]);

  // Start tracking when action is performed
  const startTracking = useCallback(async (
    actionType: 'order' | 'feedback' | 'ai' | 'phone_order',
    isPhoneOrder: boolean = false
  ) => {
    // First, end any previous active log for different retailer
    const targetDate = selectedDate || new Date().toISOString().split('T')[0];
    
    const { data: previousActiveLogs } = await supabase
      .from('retailer_visit_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('visit_date', targetDate)
      .is('end_time', null)
      .neq('retailer_id', retailerId);

    if (previousActiveLogs && previousActiveLogs.length > 0) {
      const endTime = new Date().toISOString();
      for (const log of previousActiveLogs) {
        const startTime = new Date(log.start_time).getTime();
        const endTimeMs = new Date(endTime).getTime();
        const timeSpentSeconds = Math.floor((endTimeMs - startTime) / 1000);

        await supabase
          .from('retailer_visit_logs')
          .update({
            end_time: endTime,
            time_spent_seconds: timeSpentSeconds
          })
          .eq('id', log.id);
      }
    }

    // If already tracking for this retailer today, update the existing log's
    // end_time to reflect the latest activity time instead of creating a new log.
    if (currentLogIdRef.current) {
      const endTime = new Date().toISOString();
      const { data: logData } = await supabase
        .from('retailer_visit_logs')
        .select('start_time')
        .eq('id', currentLogIdRef.current)
        .single();

      if (logData) {
        const startTimeMs = new Date(logData.start_time).getTime();
        const endTimeMs = new Date(endTime).getTime();
        const timeSpentSeconds = Math.floor((endTimeMs - startTimeMs) / 1000);

        await supabase
          .from('retailer_visit_logs')
          .update({
            end_time: endTime,
            time_spent_seconds: timeSpentSeconds
          })
          .eq('id', currentLogIdRef.current);

        setTimeSpent(timeSpentSeconds);
      }

      // Do not create a new log for the same retailer/date
      return;
    }

    let userLat: number | undefined;
    let userLng: number | undefined;
    let calculatedDistance: number | null = null;
    let status: 'at_store' | 'within_range' | 'not_at_store' | 'location_unavailable' = 'location_unavailable';

    // Get current GPS location
    if (navigator.geolocation) {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000, // Increased timeout to 10 seconds
            maximumAge: 0
          });
        });

        userLat = position.coords.latitude;
        userLng = position.coords.longitude;

        console.log('User location captured:', { userLat, userLng });
        console.log('Retailer location:', { retailerLat, retailerLng });

        // Calculate distance if retailer coordinates are available
        if (retailerLat !== undefined && retailerLng !== undefined && retailerLat !== null && retailerLng !== null) {
          calculatedDistance = calculateDistance(userLat, userLng, retailerLat, retailerLng);
          status = getLocationStatus(calculatedDistance);
          setDistance(calculatedDistance);
          setLocationStatus(status);
          console.log('Location tracking:', { calculatedDistance, status });
        } else {
          console.warn('Retailer coordinates not available:', { retailerLat, retailerLng });
          status = 'location_unavailable';
        }
      } catch (error) {
        console.error('GPS error:', error);
        status = 'location_unavailable';
      }
    } else {
      console.error('Geolocation not supported by browser');
    }

    const startTime = new Date().toISOString();

    // Create new log entry
    const { data, error } = await supabase
      .from('retailer_visit_logs')
      .insert({
        user_id: userId,
        retailer_id: retailerId,
        visit_id: visitId || null,
        start_time: startTime,
        start_latitude: userLat || null,
        start_longitude: userLng || null,
        distance_meters: calculatedDistance,
        location_status: status,
        action_type: actionType,
        is_phone_order: isPhoneOrder,
        visit_date: targetDate
      })
      .select()
      .single();

    if (!error && data) {
      setCurrentLog(data as VisitLog);
      currentLogIdRef.current = data.id;
      setTimeSpent(0);
    }
  }, [userId, retailerId, visitId, retailerLat, retailerLng, selectedDate]);

  // End tracking and calculate time spent
  const endTracking = useCallback(async () => {
    if (!currentLogIdRef.current) return;

    const endTime = new Date().toISOString();
    const { data: logData } = await supabase
      .from('retailer_visit_logs')
      .select('start_time')
      .eq('id', currentLogIdRef.current)
      .single();

    if (logData) {
      const startTime = new Date(logData.start_time).getTime();
      const endTimeMs = new Date(endTime).getTime();
      const timeSpentSeconds = Math.floor((endTimeMs - startTime) / 1000);

      await supabase
        .from('retailer_visit_logs')
        .update({
          end_time: endTime,
          time_spent_seconds: timeSpentSeconds
        })
        .eq('id', currentLogIdRef.current);

      setTimeSpent(timeSpentSeconds);
    }

    // Don't reset currentLogIdRef so we don't create duplicate logs
  }, []);

  // End all active logs on logout
  const endAllActiveLogs = useCallback(async () => {
    const targetDate = selectedDate || new Date().toISOString().split('T')[0];
    const endTime = new Date().toISOString();
    
    const { data: activeLogs } = await supabase
      .from('retailer_visit_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('visit_date', targetDate)
      .is('end_time', null);

    if (activeLogs && activeLogs.length > 0) {
      for (const log of activeLogs) {
        const startTime = new Date(log.start_time).getTime();
        const endTimeMs = new Date(endTime).getTime();
        const timeSpentSeconds = Math.floor((endTimeMs - startTime) / 1000);

        await supabase
          .from('retailer_visit_logs')
          .update({
            end_time: endTime,
            time_spent_seconds: timeSpentSeconds
          })
          .eq('id', log.id);
      }
    }
  }, [userId, selectedDate]);

  return {
    currentLog,
    locationStatus,
    distance,
    timeSpent,
    formattedTimeSpent: formatTimeSpent(timeSpent),
    startTracking,
    endTracking,
    endAllActiveLogs
  };
};

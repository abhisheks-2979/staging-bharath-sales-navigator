import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { offlineStorage, STORES } from '@/lib/offlineStorage';
import { getLocalTodayDate } from '@/utils/dateUtils';

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

// Global storage for last activity time per retailer (persists across hook instances)
const lastActivityTimeByRetailer: Map<string, string> = new Map();

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
  const lastCheckedCoordsRef = useRef<string>('');

  // Calculate location status when retailer has coordinates
  useEffect(() => {
    const checkLocationOnMount = async () => {
      // Skip if no retailer coordinates
      if (!retailerLat || !retailerLng) {
        console.log('📍 No retailer coordinates available:', { retailerLat, retailerLng });
        setLocationStatus('location_unavailable');
        return;
      }
      
      // Create a key to track if we've already checked these exact coordinates
      const coordsKey = `${retailerLat}-${retailerLng}`;
      if (lastCheckedCoordsRef.current === coordsKey && distance !== null) {
        console.log('📍 Already checked these coordinates successfully, skipping');
        return;
      }
      
      console.log('📍 Starting location check for retailer:', { retailerLat, retailerLng, coordsKey });
      
      if (navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 15000,
              maximumAge: 60000 // Allow cached position up to 1 minute
            });
          });

          const userLat = position.coords.latitude;
          const userLng = position.coords.longitude;
          const calculatedDistance = calculateDistance(userLat, userLng, retailerLat, retailerLng);
          const status = getLocationStatus(calculatedDistance);
          
          console.log('📍 Location check complete:', { 
            userLat, 
            userLng, 
            retailerLat, 
            retailerLng, 
            calculatedDistance: Math.round(calculatedDistance), 
            status 
          });
          
          setDistance(calculatedDistance);
          setLocationStatus(status);
          lastCheckedCoordsRef.current = coordsKey;
        } catch (error: any) {
          console.error('📍 GPS error on mount:', error.message || error);
          setLocationStatus('location_unavailable');
          // Don't set lastCheckedCoordsRef on error - allow retry when coordinates change
        }
      } else {
        console.error('📍 Geolocation not supported');
        setLocationStatus('location_unavailable');
      }
    };

    checkLocationOnMount();
  }, [retailerLat, retailerLng, distance]);

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
    // Run timer if we have a log - calculate time from start_time to now
    if (currentLog && currentLog.start_time) {
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

  // Update last activity time for current retailer (call this on any user interaction)
  const updateLastActivity = useCallback(() => {
    if (retailerId) {
      const now = new Date().toISOString();
      lastActivityTimeByRetailer.set(retailerId, now);
      console.log('📍 Updated last activity time for retailer:', retailerId, now);
    }
  }, [retailerId]);

  // Start tracking when action is performed
  const startTracking = useCallback(async (
    actionType: 'order' | 'feedback' | 'ai' | 'phone_order',
    isPhoneOrder: boolean = false
  ) => {
    const targetDate = selectedDate || new Date().toISOString().split('T')[0];
    const isOffline = !navigator.onLine;
    const currentTime = new Date().toISOString();

    // Update last activity time for this retailer immediately
    lastActivityTimeByRetailer.set(retailerId, currentTime);

    // Get current GPS location (works offline)
    let userLat: number | undefined;
    let userLng: number | undefined;
    let calculatedDistance: number | null = null;
    let status: 'at_store' | 'within_range' | 'not_at_store' | 'location_unavailable' = 'location_unavailable';

    if (navigator.geolocation) {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          });
        });

        userLat = position.coords.latitude;
        userLng = position.coords.longitude;

        console.log('📍 User location captured:', { userLat, userLng, isOffline });
        console.log('📍 Retailer location:', { retailerLat, retailerLng });

        // AUTO-CAPTURE: If retailer doesn't have GPS, save user's current location as retailer's location
        if ((!retailerLat || !retailerLng) && userLat && userLng && !isOffline) {
          console.log('📍 Auto-capturing retailer GPS on first visit...');
          try {
            const { error: updateError } = await supabase
              .from('retailers')
              .update({
                latitude: userLat,
                longitude: userLng,
                updated_at: new Date().toISOString()
              })
              .eq('id', retailerId);
            
            if (!updateError) {
              console.log('📍 ✅ Retailer GPS auto-captured successfully:', { userLat, userLng });
              // Status is now "at_store" since we just set the location
              status = 'at_store';
              calculatedDistance = 0;
              setDistance(0);
              setLocationStatus('at_store');
            } else {
              console.error('📍 ❌ Failed to auto-capture retailer GPS:', updateError);
            }
          } catch (autoSaveError) {
            console.error('📍 ❌ Error auto-capturing retailer GPS:', autoSaveError);
          }
        }
        // Calculate distance if retailer coordinates are available
        else if (retailerLat !== undefined && retailerLng !== undefined && retailerLat !== null && retailerLng !== null) {
          calculatedDistance = calculateDistance(userLat, userLng, retailerLat, retailerLng);
          status = getLocationStatus(calculatedDistance);
          setDistance(calculatedDistance);
          setLocationStatus(status);
          console.log('📍 Location tracking:', { calculatedDistance, status });
        } else {
          console.warn('📍 Retailer coordinates not available and offline - cannot auto-capture');
          status = 'location_unavailable';
        }
      } catch (error) {
        console.error('📍 GPS error:', error);
        status = 'location_unavailable';
      }
    }

    const startTime = currentTime;
    const logId = `offline_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const logData = {
      id: logId,
      user_id: userId,
      retailer_id: retailerId,
      visit_id: visitId || null,
      start_time: startTime,
      end_time: startTime, // Set end_time same as start_time initially (updated on each activity)
      start_latitude: userLat || null,
      start_longitude: userLng || null,
      distance_meters: calculatedDistance,
      location_status: status,
      action_type: actionType,
      is_phone_order: isPhoneOrder,
      visit_date: targetDate,
      time_spent_seconds: 0
    };

    if (isOffline) {
      // Store in IndexedDB when offline
      console.log('📍 Storing visit log offline:', logData);
      try {
        await offlineStorage.save(STORES.RETAILER_VISIT_LOGS, logData);
        
        // Add to sync queue for later syncing
        await offlineStorage.addToSyncQueue('CREATE_VISIT_LOG', logData);
        
        setCurrentLog(logData as VisitLog);
        currentLogIdRef.current = logId;
        setTimeSpent(0);
        
        console.log('✅ Visit log stored offline successfully');
      } catch (error) {
        console.error('❌ Failed to store visit log offline:', error);
      }
    } else {
      // Store in Supabase when online
      try {
        // First, end any previous active log for different retailer using their LAST activity time
        const { data: previousActiveLogs } = await supabase
          .from('retailer_visit_logs')
          .select('*')
          .eq('user_id', userId)
          .eq('visit_date', targetDate)
          .is('end_time', null)
          .neq('retailer_id', retailerId);

        if (previousActiveLogs && previousActiveLogs.length > 0) {
          for (const log of previousActiveLogs) {
            // Use stored last activity time for this retailer, or current time as fallback
            const lastActivityTime = lastActivityTimeByRetailer.get(log.retailer_id) || currentTime;
            const startTimeMs = new Date(log.start_time).getTime();
            const endTimeMs = new Date(lastActivityTime).getTime();
            const timeSpentSeconds = Math.max(0, Math.floor((endTimeMs - startTimeMs) / 1000));

            console.log('📍 Ending previous retailer log:', {
              retailerId: log.retailer_id,
              startTime: log.start_time,
              endTime: lastActivityTime,
              timeSpentSeconds
            });

            await supabase
              .from('retailer_visit_logs')
              .update({
                end_time: lastActivityTime,
                time_spent_seconds: timeSpentSeconds
              })
              .eq('id', log.id);
            
            // Clear the stored activity time for that retailer
            lastActivityTimeByRetailer.delete(log.retailer_id);
          }
        }

        // If already tracking for this retailer today, just update last activity time
        if (currentLogIdRef.current && !currentLogIdRef.current.startsWith('offline_')) {
          // Update the end_time to current time (latest activity)
          const { data: existingLog } = await supabase
            .from('retailer_visit_logs')
            .select('start_time')
            .eq('id', currentLogIdRef.current)
            .single();

          if (existingLog) {
            const startTimeMs = new Date(existingLog.start_time).getTime();
            const endTimeMs = new Date(currentTime).getTime();
            const timeSpentSeconds = Math.floor((endTimeMs - startTimeMs) / 1000);

            await supabase
              .from('retailer_visit_logs')
              .update({
                end_time: currentTime,
                time_spent_seconds: timeSpentSeconds
              })
              .eq('id', currentLogIdRef.current);

            setTimeSpent(timeSpentSeconds);
            console.log('📍 Updated existing log with latest activity:', { currentTime, timeSpentSeconds });
          }
          return;
        }

        // Create new log in Supabase
        const { data, error } = await supabase
          .from('retailer_visit_logs')
          .insert({
            user_id: userId,
            retailer_id: retailerId,
            visit_id: visitId || null,
            start_time: startTime,
            end_time: startTime, // Set initial end_time same as start_time
            start_latitude: userLat || null,
            start_longitude: userLng || null,
            distance_meters: calculatedDistance,
            location_status: status,
            action_type: actionType,
            is_phone_order: isPhoneOrder,
            visit_date: targetDate,
            time_spent_seconds: 0
          })
          .select()
          .single();

        if (!error && data) {
          setCurrentLog(data as VisitLog);
          currentLogIdRef.current = data.id;
          setTimeSpent(0);
          console.log('📍 Created new visit log:', data.id);
        }
      } catch (error) {
        console.error('Failed to save visit log online:', error);
      }
    }
  }, [userId, retailerId, visitId, retailerLat, retailerLng, selectedDate]);

  // Record activity (updates end_time to current timestamp)
  const recordActivity = useCallback(async () => {
    if (!currentLogIdRef.current || !userId) return;

    const currentTime = new Date().toISOString();
    
    // Update last activity time
    lastActivityTimeByRetailer.set(retailerId, currentTime);

    const isOffline = !navigator.onLine;

    if (isOffline) {
      // Update in IndexedDB
      try {
        const existingLog = await offlineStorage.getById<any>(STORES.RETAILER_VISIT_LOGS, currentLogIdRef.current);
        if (existingLog) {
          const startTimeMs = new Date(existingLog.start_time).getTime();
          const endTimeMs = new Date(currentTime).getTime();
          const timeSpentSeconds = Math.floor((endTimeMs - startTimeMs) / 1000);

          await offlineStorage.save(STORES.RETAILER_VISIT_LOGS, {
            ...existingLog,
            end_time: currentTime,
            time_spent_seconds: timeSpentSeconds
          });
          setTimeSpent(timeSpentSeconds);
        }
      } catch (error) {
        console.error('Failed to update activity offline:', error);
      }
    } else if (!currentLogIdRef.current.startsWith('offline_')) {
      // Update in Supabase
      try {
        const { data: existingLog } = await supabase
          .from('retailer_visit_logs')
          .select('start_time')
          .eq('id', currentLogIdRef.current)
          .single();

        if (existingLog) {
          const startTimeMs = new Date(existingLog.start_time).getTime();
          const endTimeMs = new Date(currentTime).getTime();
          const timeSpentSeconds = Math.floor((endTimeMs - startTimeMs) / 1000);

          await supabase
            .from('retailer_visit_logs')
            .update({
              end_time: currentTime,
              time_spent_seconds: timeSpentSeconds
            })
            .eq('id', currentLogIdRef.current);

          setTimeSpent(timeSpentSeconds);
        }
      } catch (error) {
        console.error('Failed to update activity online:', error);
      }
    }
  }, [userId, retailerId]);

  // End tracking and calculate time spent
  const endTracking = useCallback(async () => {
    if (!currentLogIdRef.current) return;

    const endTime = lastActivityTimeByRetailer.get(retailerId) || new Date().toISOString();
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
  }, [retailerId]);

  // End all active logs on logout
  const endAllActiveLogs = useCallback(async () => {
    const targetDate = selectedDate || new Date().toISOString().split('T')[0];
    
    const { data: activeLogs } = await supabase
      .from('retailer_visit_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('visit_date', targetDate)
      .is('end_time', null);

    if (activeLogs && activeLogs.length > 0) {
      for (const log of activeLogs) {
        // Use stored last activity time or current time
        const endTime = lastActivityTimeByRetailer.get(log.retailer_id) || new Date().toISOString();
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

  // Function to manually re-check location
  const recheckLocation = useCallback(async () => {
    if (!retailerLat || !retailerLng) {
      console.log('📍 Cannot recheck - no retailer coordinates');
      return;
    }
    
    console.log('📍 Manual location recheck triggered');
    lastCheckedCoordsRef.current = ''; // Reset to force re-check
    
    if (navigator.geolocation) {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0
          });
        });

        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;
        const calculatedDistance = calculateDistance(userLat, userLng, retailerLat, retailerLng);
        const status = getLocationStatus(calculatedDistance);
        
        console.log('📍 Manual recheck complete:', { 
          userLat, 
          userLng, 
          retailerLat, 
          retailerLng, 
          calculatedDistance: Math.round(calculatedDistance), 
          status 
        });
        
        setDistance(calculatedDistance);
        setLocationStatus(status);
        lastCheckedCoordsRef.current = `${retailerLat}-${retailerLng}`;
      } catch (error: any) {
        console.error('📍 GPS error on recheck:', error.message || error);
        setLocationStatus('location_unavailable');
      }
    }
  }, [retailerLat, retailerLng]);

  return {
    currentLog,
    locationStatus,
    distance,
    timeSpent,
    formattedTimeSpent: formatTimeSpent(timeSpent),
    startTracking,
    endTracking,
    endAllActiveLogs,
    recordActivity,
    updateLastActivity,
    recheckLocation
  };
};

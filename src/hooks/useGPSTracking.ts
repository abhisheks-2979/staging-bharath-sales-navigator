import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface GPSPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: Date;
  speed?: number;
  heading?: number;
}

export const useGPSTracking = (userId: string | undefined, date: Date) => {
  const [isTracking, setIsTracking] = useState(false);
  const [positions, setPositions] = useState<GPSPosition[]>([]);
  const [error, setError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      toast.error('GPS not supported');
      return;
    }

    setIsTracking(true);
    setError(null);

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        const gpsData: GPSPosition = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date(),
          speed: position.coords.speed || undefined,
          heading: position.coords.heading || undefined,
        };

        setPositions((prev) => [...prev, gpsData]);

        // Save to database
        if (userId) {
          const { error: dbError } = await supabase.from('gps_tracking').insert({
            user_id: userId,
            latitude: gpsData.latitude,
            longitude: gpsData.longitude,
            accuracy: gpsData.accuracy,
            speed: gpsData.speed,
            heading: gpsData.heading,
            date: date.toISOString().split('T')[0],
          });

          if (dbError) {
            console.error('Error saving GPS data:', dbError);
          }
        }
      },
      (err) => {
        console.error('GPS error:', err);
        setError(err.message);
        toast.error('GPS tracking error: ' + err.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, [userId, date]);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
    toast.success('GPS tracking stopped');
  }, []);

  const loadSavedTracking = useCallback(async () => {
    if (!userId) return;

    const dateStr = date.toISOString().split('T')[0];
    const { data, error: fetchError } = await supabase
      .from('gps_tracking')
      .select('*')
      .eq('user_id', userId)
      .eq('date', dateStr)
      .order('timestamp', { ascending: true });

    if (fetchError) {
      console.error('Error loading GPS data:', fetchError);
      return;
    }

    if (data) {
      setPositions(
        data.map((d) => ({
          latitude: parseFloat(d.latitude as unknown as string),
          longitude: parseFloat(d.longitude as unknown as string),
          accuracy: d.accuracy ? parseFloat(d.accuracy as unknown as string) : 0,
          timestamp: new Date(d.timestamp),
          speed: d.speed ? parseFloat(d.speed as unknown as string) : undefined,
          heading: d.heading ? parseFloat(d.heading as unknown as string) : undefined,
        }))
      );
    }
  }, [userId, date]);

  useEffect(() => {
    loadSavedTracking();
  }, [loadSavedTracking]);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return {
    isTracking,
    positions,
    error,
    startTracking,
    stopTracking,
    loadSavedTracking,
  };
};

import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from './ui/button';
import { MapPin, Loader2, RefreshCw, Clock, Navigation } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';

// Fix default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface CurrentLocationMapProps {
  height?: string;
  userId?: string;
  isViewingOther?: boolean; // True if admin viewing another user
}

export const CurrentLocationMap: React.FC<CurrentLocationMapProps> = ({ 
  height = '500px', 
  userId,
  isViewingOther = false 
}) => {
  const { user } = useAuth();
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [location, setLocation] = useState<{ lat: number; lng: number; accuracy?: number; timestamp?: Date } | null>(null);

  const isCurrentUser = userId === user?.id;

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize map centered on India
    mapRef.current = L.map(mapContainerRef.current, {
      zoomControl: false
    }).setView([20.5937, 78.9629], 5);

    // Add zoom control to bottom right
    L.control.zoom({ position: 'bottomright' }).addTo(mapRef.current);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
    }).addTo(mapRef.current);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, []);

  const updateMapMarker = useCallback((latitude: number, longitude: number, accuracy: number, timestamp: Date) => {
    if (!mapRef.current) return;

    if (markerRef.current) {
      markerRef.current.remove();
    }
    if (circleRef.current) {
      circleRef.current.remove();
    }

    // Custom pulsing marker icon
    const pulsingIcon = L.divIcon({
      className: 'custom-marker',
      html: `
        <div style="position: relative; width: 24px; height: 24px;">
          <div style="position: absolute; width: 24px; height: 24px; background: #3b82f6; border-radius: 50%; opacity: 0.3; animation: pulse 2s infinite;"></div>
          <div style="position: absolute; top: 4px; left: 4px; width: 16px; height: 16px; background: #3b82f6; border: 3px solid white; border-radius: 50%; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>
        </div>
        <style>
          @keyframes pulse {
            0% { transform: scale(1); opacity: 0.3; }
            50% { transform: scale(2); opacity: 0; }
            100% { transform: scale(1); opacity: 0.3; }
          }
        </style>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    markerRef.current = L.marker([latitude, longitude], { icon: pulsingIcon })
      .addTo(mapRef.current);

    mapRef.current.setView([latitude, longitude], 16);

    // Only show accuracy circle if accuracy is reasonable
    if (accuracy <= 150) {
      const displayRadius = Math.min(accuracy, 80);
      circleRef.current = L.circle([latitude, longitude], {
        radius: displayRadius,
        color: '#3b82f6',
        fillColor: '#3b82f6',
        fillOpacity: 0.1,
        weight: 1,
      }).addTo(mapRef.current);
    }

    setLocation({ lat: latitude, lng: longitude, accuracy, timestamp });
  }, []);

  // Get live location from device (for current user)
  const getLiveLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    setLoading(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const timestamp = new Date();
        updateMapMarker(latitude, longitude, accuracy, timestamp);
        setLoading(false);

        // Save to gps_tracking table
        if (user?.id) {
          const today = new Date().toISOString().split('T')[0];
          supabase.from('gps_tracking').insert([{
            user_id: user.id,
            latitude: latitude,
            longitude: longitude,
            accuracy: accuracy,
            timestamp: timestamp.toISOString(),
            date: today
          }]).then(({ error }) => {
            if (error) console.error('Error saving GPS data:', error);
          });
        }
      },
      (error) => {
        console.error('Error getting location:', error);
        setLoading(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            toast.error('Location permission denied. Please enable location access.');
            break;
          case error.POSITION_UNAVAILABLE:
            toast.error('Location information is unavailable.');
            break;
          case error.TIMEOUT:
            toast.error('Location request timed out.');
            break;
          default:
            toast.error('An unknown error occurred while getting location.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  }, [user?.id, updateMapMarker]);

  // Start watching live location
  const startWatchingLocation = useCallback(() => {
    if (!navigator.geolocation || !isCurrentUser) return;

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const timestamp = new Date();
        updateMapMarker(latitude, longitude, accuracy, timestamp);

        // Save to gps_tracking table periodically
        if (user?.id) {
          const today = new Date().toISOString().split('T')[0];
          supabase.from('gps_tracking').insert([{
            user_id: user.id,
            latitude: latitude,
            longitude: longitude,
            accuracy: accuracy,
            timestamp: timestamp.toISOString(),
            date: today
          }]).then(({ error }) => {
            if (error) console.error('Error saving GPS data:', error);
          });
        }
      },
      (error) => {
        console.error('Watch position error:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 5000
      }
    );
  }, [isCurrentUser, user?.id, updateMapMarker]);

  // Fetch location from database (for viewing other users)
  const fetchUserLocation = useCallback(async () => {
    if (!userId) return;

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('gps_tracking')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        console.error('Error fetching location:', error);
        setLoading(false);
        return;
      }

      if (data) {
        const latitude = parseFloat(data.latitude as unknown as string);
        const longitude = parseFloat(data.longitude as unknown as string);
        const accuracy = data.accuracy ? parseFloat(data.accuracy as unknown as string) : 50;
        const timestamp = new Date(data.timestamp);

        updateMapMarker(latitude, longitude, accuracy, timestamp);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching location:', error);
      setLoading(false);
    }
  }, [userId, updateMapMarker]);

  // Initial load and mode setup
  useEffect(() => {
    if (!userId || !mapRef.current) return;

    if (isCurrentUser && !isViewingOther) {
      // For current user, get live location from device
      getLiveLocation();
      if (autoRefresh) {
        startWatchingLocation();
      }
    } else {
      // For viewing other users, fetch from database
      fetchUserLocation();
    }
  }, [userId, isCurrentUser, isViewingOther, getLiveLocation, fetchUserLocation, autoRefresh, startWatchingLocation]);

  // Handle auto-refresh toggle
  useEffect(() => {
    if (!userId) return;

    if (isCurrentUser && !isViewingOther) {
      // For current user, use geolocation watch
      if (autoRefresh) {
        startWatchingLocation();
      } else if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    } else {
      // For other users, use polling
      if (autoRefresh) {
        refreshIntervalRef.current = setInterval(() => {
          fetchUserLocation();
        }, 15000);
      } else if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [autoRefresh, userId, isCurrentUser, isViewingOther, startWatchingLocation, fetchUserLocation]);

  const handleManualRefresh = () => {
    if (isCurrentUser && !isViewingOther) {
      getLiveLocation();
    } else {
      fetchUserLocation();
    }
  };

  const getTimeDifference = (timestamp: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - timestamp.getTime()) / 1000);
    
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const isLocationFresh = (timestamp: Date) => {
    const now = new Date();
    const diffInMinutes = (now.getTime() - timestamp.getTime()) / (1000 * 60);
    return diffInMinutes < 5;
  };

  return (
    <div className="relative rounded-lg overflow-hidden border shadow-sm" style={{ height }}>
      {/* Map Container */}
      <div
        ref={mapContainerRef}
        className="absolute inset-0"
      />

      {/* Floating Info Card - Top - Fixed position */}
      {location && (
        <div className="absolute top-0 left-0 right-0 z-[1000] p-3 pointer-events-none">
          <Card className="bg-background/95 backdrop-blur-sm shadow-lg pointer-events-auto">
            <div className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Navigation className="h-4 w-4 text-primary flex-shrink-0" />
                    <span className="font-medium text-sm truncate">
                      {isCurrentUser && !isViewingOther ? 'Your Live Location' : 'Current Location'}
                    </span>
                    <Badge 
                      variant={location.timestamp && isLocationFresh(location.timestamp) ? "default" : "secondary"}
                      className={`text-xs ${location.timestamp && isLocationFresh(location.timestamp) ? 'bg-green-500' : 'bg-yellow-500'}`}
                    >
                      {location.timestamp && isLocationFresh(location.timestamp) ? 'Live' : 'Stale'}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <p className="font-mono">{location.lat.toFixed(6)}, {location.lng.toFixed(6)}</p>
                    {location.timestamp && (
                      <p className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {getTimeDifference(location.timestamp)} • {format(location.timestamp, 'hh:mm a')}
                      </p>
                    )}
                    {location.accuracy && (
                      <p className="text-muted-foreground/70">±{Math.round(location.accuracy)}m accuracy</p>
                    )}
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="outline"
                  className="h-8 w-8 flex-shrink-0"
                  onClick={handleManualRefresh}
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Floating Controls - Bottom Left - Fixed position */}
      <div className="absolute bottom-0 left-0 z-[1000] p-3 pointer-events-none">
        <Card className="bg-background/95 backdrop-blur-sm shadow-lg pointer-events-auto">
          <div className="p-2 flex items-center gap-2">
            <Switch
              checked={autoRefresh}
              onCheckedChange={setAutoRefresh}
              className="scale-75"
            />
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {isCurrentUser && !isViewingOther ? 'Live Tracking' : 'Auto (15s)'}
            </span>
          </div>
        </Card>
      </div>

      {/* No Location State */}
      {!location && !loading && userId && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-[1000]">
          <div className="text-center p-6">
            <MapPin className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No location data available</p>
            <Button
              size="sm"
              variant="outline"
              className="mt-3"
              onClick={handleManualRefresh}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {isCurrentUser && !isViewingOther ? 'Get My Location' : 'Try Again'}
            </Button>
          </div>
        </div>
      )}

      {/* No User Selected State */}
      {!userId && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-[1000]">
          <div className="text-center p-6">
            <MapPin className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">Select a team member to view location</p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && !location && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-[1000]">
          <div className="text-center p-6">
            <Loader2 className="h-8 w-8 mx-auto mb-3 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              {isCurrentUser && !isViewingOther ? 'Getting your location...' : 'Fetching location...'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

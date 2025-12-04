import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from './ui/button';
import { MapPin, Loader2, RefreshCw, Clock, Navigation } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
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
}

export const CurrentLocationMap: React.FC<CurrentLocationMapProps> = ({ height = '500px', userId }) => {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [location, setLocation] = useState<{ lat: number; lng: number; accuracy?: number; timestamp?: Date } | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize map centered on India
    mapRef.current = L.map(mapContainerRef.current, {
      zoomControl: false // We'll position it ourselves
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
    };
  }, []);

  const fetchUserLocation = async () => {
    if (!userId) {
      return;
    }

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

        const newLocation = { lat: latitude, lng: longitude, accuracy, timestamp };
        setLocation(newLocation);

        if (mapRef.current) {
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
        }
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching location:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId && mapRef.current) {
      fetchUserLocation();
    }
  }, [userId]);

  useEffect(() => {
    if (autoRefresh && userId) {
      fetchUserLocation();
      refreshIntervalRef.current = setInterval(() => {
        fetchUserLocation();
      }, 15000);
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [autoRefresh, userId]);

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

      {/* Floating Info Card - Top */}
      {location && (
        <Card className="absolute top-3 left-3 right-3 z-[1000] bg-background/95 backdrop-blur-sm shadow-lg">
          <div className="p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Navigation className="h-4 w-4 text-primary flex-shrink-0" />
                  <span className="font-medium text-sm truncate">Current Location</span>
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
                onClick={fetchUserLocation}
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
      )}

      {/* Floating Controls - Bottom Left */}
      <Card className="absolute bottom-3 left-3 z-[1000] bg-background/95 backdrop-blur-sm shadow-lg">
        <div className="p-2 flex items-center gap-2">
          <Switch
            checked={autoRefresh}
            onCheckedChange={setAutoRefresh}
            className="scale-75"
          />
          <span className="text-xs text-muted-foreground whitespace-nowrap">Auto (15s)</span>
        </div>
      </Card>

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
              onClick={fetchUserLocation}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
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
            <p className="text-sm text-muted-foreground">Fetching location...</p>
          </div>
        </div>
      )}
    </div>
  );
};

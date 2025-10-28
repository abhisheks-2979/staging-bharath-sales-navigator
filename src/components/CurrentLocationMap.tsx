import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from './ui/button';
import { MapPin, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

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

export const CurrentLocationMap: React.FC<CurrentLocationMapProps> = ({ height = '600px', userId }) => {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number; accuracy?: number; timestamp?: Date } | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize map centered on India
    mapRef.current = L.map(mapContainerRef.current).setView([20.5937, 78.9629], 5);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
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
      toast.error('Please select a user');
      return;
    }

    setLoading(true);

    try {
      // Get the latest GPS location for the selected user
      const { data, error } = await supabase
        .from('gps_tracking')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        console.error('Error fetching location:', error);
        toast.error('No location data found for this user');
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
          // Remove old marker and circle if exists
          if (markerRef.current) {
            markerRef.current.remove();
          }
          if (circleRef.current) {
            circleRef.current.remove();
          }

          // Add new marker with custom icon
          const redIcon = L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
          });

          markerRef.current = L.marker([latitude, longitude], { icon: redIcon })
            .addTo(mapRef.current)
            .bindPopup(
              `<b>Current Location</b><br>` +
              `Lat: ${latitude.toFixed(6)}<br>` +
              `Lng: ${longitude.toFixed(6)}<br>` +
              `Time: ${format(timestamp, 'PPp')}<br>` +
              `Accuracy: ${accuracy.toFixed(0)}m`
            )
            .openPopup();

          // Center map on location
          mapRef.current.setView([latitude, longitude], 15);

          // Add accuracy circle
          circleRef.current = L.circle([latitude, longitude], {
            radius: accuracy,
            color: '#ef4444',
            fillColor: '#ef4444',
            fillOpacity: 0.2,
          }).addTo(mapRef.current);

          toast.success('Location updated');
        }
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching location:', error);
      toast.error('Failed to fetch user location');
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId && mapRef.current) {
      fetchUserLocation();
    }
  }, [userId]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Current Location</h3>
          {location && (
            <div className="text-sm text-muted-foreground">
              <p>Lat: {location.lat.toFixed(6)}, Lng: {location.lng.toFixed(6)}</p>
              {location.timestamp && (
                <p>Last updated: {format(location.timestamp, 'PPp')}</p>
              )}
            </div>
          )}
        </div>
        <Button onClick={fetchUserLocation} disabled={loading || !userId}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Fetching Location...
            </>
          ) : (
            <>
              <MapPin className="mr-2 h-4 w-4" />
              Refresh Location
            </>
          )}
        </Button>
      </div>

      <div
        ref={mapContainerRef}
        style={{ height, width: '100%' }}
        className="rounded-lg border shadow-sm"
      />

      {!location && !loading && (
        <div className="text-center p-8 text-muted-foreground">
          <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>{userId ? 'Click "Refresh Location" to see the latest position' : 'Select a user to view their location'}</p>
        </div>
      )}
    </div>
  );
};

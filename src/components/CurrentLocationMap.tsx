import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from './ui/button';
import { MapPin, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// Fix default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface CurrentLocationMapProps {
  height?: string;
}

export const CurrentLocationMap: React.FC<CurrentLocationMapProps> = ({ height = '600px' }) => {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

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

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    setLoading(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const newLocation = { lat: latitude, lng: longitude };
        setLocation(newLocation);

        if (mapRef.current) {
          // Remove old marker if exists
          if (markerRef.current) {
            markerRef.current.remove();
          }

          // Add new marker
          markerRef.current = L.marker([latitude, longitude])
            .addTo(mapRef.current)
            .bindPopup(`<b>Current Location</b><br>Lat: ${latitude.toFixed(6)}<br>Lng: ${longitude.toFixed(6)}`)
            .openPopup();

          // Center map on location
          mapRef.current.setView([latitude, longitude], 15);

          // Add accuracy circle
          L.circle([latitude, longitude], {
            radius: position.coords.accuracy,
            color: 'blue',
            fillColor: '#3b82f6',
            fillOpacity: 0.2,
          }).addTo(mapRef.current);

          toast.success('Location updated');
        }

        setLoading(false);
      },
      (error) => {
        console.error('Error getting location:', error);
        toast.error('Failed to get current location: ' + error.message);
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Your Current Location</h3>
          {location && (
            <p className="text-sm text-muted-foreground">
              Lat: {location.lat.toFixed(6)}, Lng: {location.lng.toFixed(6)}
            </p>
          )}
        </div>
        <Button onClick={getCurrentLocation} disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Getting Location...
            </>
          ) : (
            <>
              <MapPin className="mr-2 h-4 w-4" />
              Get Current Location
            </>
          )}
        </Button>
      </div>

      <div
        ref={mapContainerRef}
        style={{ height, width: '100%' }}
        className="rounded-lg border shadow-sm"
      />

      {!location && (
        <div className="text-center p-8 text-muted-foreground">
          <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Click "Get Current Location" to see your position on the map</p>
        </div>
      )}
    </div>
  );
};

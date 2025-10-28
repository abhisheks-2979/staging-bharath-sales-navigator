import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface Position {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: Date;
}

interface JourneyMapProps {
  positions: Position[];
  height?: string;
}

// Fix for default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export const JourneyMap: React.FC<JourneyMapProps> = ({ positions, height = '500px' }) => {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || positions.length === 0) return;

    // Initialize map if not already initialized
    if (!mapRef.current) {
      mapRef.current = L.map(containerRef.current).setView(
        [positions[positions.length - 1].latitude, positions[positions.length - 1].longitude],
        13
      );

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapRef.current);
    }

    // Clear existing layers except tile layer
    mapRef.current.eachLayer((layer) => {
      if (!(layer instanceof L.TileLayer)) {
        mapRef.current?.removeLayer(layer);
      }
    });

    // Add journey path
    const pathCoordinates: L.LatLngExpression[] = positions.map((pos) => [
      pos.latitude,
      pos.longitude,
    ]);

    L.polyline(pathCoordinates, {
      color: '#3b82f6',
      weight: 3,
      opacity: 0.7,
    }).addTo(mapRef.current);

    // Create custom red icon for destination
    const redIcon = L.icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });

    // Create blue icon for waypoints
    const blueIcon = L.icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });

    // Add start marker (green/default)
    L.marker([positions[0].latitude, positions[0].longitude])
      .addTo(mapRef.current)
      .bindPopup(`<strong>Start</strong><br/>${positions[0].timestamp.toLocaleTimeString()}`);

    // Add waypoint markers along the route (sample every 5-10 points to avoid clutter)
    const waypointInterval = Math.max(1, Math.floor(positions.length / 10));
    positions.forEach((pos, index) => {
      if (index > 0 && index < positions.length - 1 && index % waypointInterval === 0) {
        L.marker([pos.latitude, pos.longitude], { icon: blueIcon })
          .addTo(mapRef.current!)
          .bindPopup(`<strong>Waypoint</strong><br/>${pos.timestamp.toLocaleTimeString()}`);
      }
    });

    // Add end marker with red icon
    if (positions.length > 1) {
      const lastPos = positions[positions.length - 1];
      L.marker([lastPos.latitude, lastPos.longitude], { icon: redIcon })
        .addTo(mapRef.current!)
        .bindPopup(`<strong>Destination</strong><br/>${lastPos.timestamp.toLocaleTimeString()}`);
    }

    // Fit bounds to show all positions
    const bounds = L.latLngBounds(pathCoordinates as L.LatLngTuple[]);
    mapRef.current.fitBounds(bounds, { padding: [50, 50] });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [positions]);

  if (positions.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-muted rounded-lg" style={{ height }}>
        <p className="text-muted-foreground">No tracking data available</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{ height, width: '100%' }}
      className="rounded-lg overflow-hidden border"
    />
  );
};

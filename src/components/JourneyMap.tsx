import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Card } from './ui/card';
import { Route, MapPin, CheckCircle, Clock } from 'lucide-react';

interface Position {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: Date;
}

interface RetailerLocation {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  visitId: string;
  checkInTime: string | null;
  status: string;
}

interface JourneyMapProps {
  positions: Position[];
  retailers?: RetailerLocation[];
  height?: string;
}

// Fix for default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export const JourneyMap: React.FC<JourneyMapProps> = ({ positions, retailers = [], height = '500px' }) => {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [totalDistance, setTotalDistance] = useState<number>(0);

  // Calculate distance between two points using Haversine formula
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  useEffect(() => {
    if (!containerRef.current) return;
    
    // Show map even if no positions, but need retailers
    if (positions.length === 0 && retailers.length === 0) return;

    // Initialize map if not already initialized
    if (!mapRef.current) {
      // Determine initial center based on available data
      let initialCenter: [number, number] = [20.5937, 78.9629]; // Default to India center
      
      if (retailers.length > 0) {
        initialCenter = [retailers[0].latitude, retailers[0].longitude];
      } else if (positions.length > 0) {
        initialCenter = [positions[positions.length - 1].latitude, positions[positions.length - 1].longitude];
      }
      
      mapRef.current = L.map(containerRef.current).setView(initialCenter, 13);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapRef.current);
    }

    // Clear existing layers except tile layer
    mapRef.current.eachLayer((layer) => {
      if (!(layer instanceof L.TileLayer)) {
        mapRef.current?.removeLayer(layer);
      }
    });

    // Create custom icons for retailer markers
    const createRetailerIcon = (isCompleted: boolean) => {
      return L.icon({
        iconUrl: isCompleted 
          ? 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png'
          : 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });
    };

    // Add retailer markers and route
    if (retailers.length > 0) {
      const retailerCoordinates: L.LatLngExpression[] = retailers.map((retailer) => [
        retailer.latitude,
        retailer.longitude,
      ]);

      // Draw route connecting all retailers
      L.polyline(retailerCoordinates, {
        color: '#8b5cf6',
        weight: 4,
        opacity: 0.8,
        dashArray: '10, 10'
      }).addTo(mapRef.current);

      // Calculate total distance
      let distance = 0;
      for (let i = 0; i < retailers.length - 1; i++) {
        distance += calculateDistance(
          retailers[i].latitude,
          retailers[i].longitude,
          retailers[i + 1].latitude,
          retailers[i + 1].longitude
        );
      }
      setTotalDistance(distance);

      // Add retailer markers
      retailers.forEach((retailer, index) => {
        const isCompleted = retailer.status === 'completed' || retailer.status === 'productive' || retailer.checkInTime !== null;
        const icon = createRetailerIcon(isCompleted);
        
        L.marker([retailer.latitude, retailer.longitude], { icon })
          .addTo(mapRef.current!)
          .bindPopup(`
            <div style="min-width: 200px;">
              <strong style="color: ${isCompleted ? '#22c55e' : '#ef4444'}; font-size: 16px;">
                ${isCompleted ? '✓ ' : ''}${retailer.name}
              </strong>
              <div style="margin-top: 8px; color: #666;">
                <div><strong>Address:</strong> ${retailer.address}</div>
                <div><strong>Status:</strong> ${isCompleted ? 'Completed' : 'Pending'}</div>
                ${retailer.checkInTime ? `<div><strong>Check-in:</strong> ${new Date(retailer.checkInTime).toLocaleTimeString()}</div>` : ''}
                <div><strong>Position:</strong> #${index + 1}</div>
              </div>
            </div>
          `);
      });
    }

    // Add GPS tracking path (if available)
    if (positions.length > 0) {
      const pathCoordinates: L.LatLngExpression[] = positions.map((pos) => [
        pos.latitude,
        pos.longitude,
      ]);

      L.polyline(pathCoordinates, {
        color: '#3b82f6',
        weight: 2,
        opacity: 0.5,
      }).addTo(mapRef.current);

      // Create blue icon for waypoints
      const blueIcon = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        iconSize: [15, 25],
        iconAnchor: [7, 25],
        popupAnchor: [1, -20],
        shadowSize: [25, 25]
      });

      // Add start marker (green/default)
      L.marker([positions[0].latitude, positions[0].longitude], {
        icon: L.icon({
          iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
          iconSize: [20, 33],
          iconAnchor: [10, 33],
          popupAnchor: [1, -28],
          shadowSize: [33, 33]
        })
      })
        .addTo(mapRef.current)
        .bindPopup(`<strong>GPS Start</strong><br/>${positions[0].timestamp.toLocaleTimeString()}`);

      // Add waypoint markers along the route (sample every 10-20 points to avoid clutter)
      const waypointInterval = Math.max(1, Math.floor(positions.length / 10));
      positions.forEach((pos, index) => {
        if (index > 0 && index < positions.length - 1 && index % waypointInterval === 0) {
          L.marker([pos.latitude, pos.longitude], { icon: blueIcon })
            .addTo(mapRef.current!)
            .bindPopup(`<strong>GPS Point</strong><br/>${pos.timestamp.toLocaleTimeString()}`);
        }
      });
    }

    // Fit bounds to show all markers
    const allCoordinates: L.LatLngExpression[] = [];
    
    if (retailers.length > 0) {
      retailers.forEach(r => allCoordinates.push([r.latitude, r.longitude]));
    }
    
    if (positions.length > 0) {
      positions.forEach(p => allCoordinates.push([p.latitude, p.longitude]));
    }
    
    if (allCoordinates.length > 0) {
      const bounds = L.latLngBounds(allCoordinates as L.LatLngTuple[]);
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [positions, retailers]);

  const completedCount = retailers.filter(r => 
    r.status === 'completed' || r.status === 'productive' || r.checkInTime !== null
  ).length;

  if (positions.length === 0 && retailers.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-muted rounded-lg" style={{ height }}>
        <div className="text-center space-y-2">
          <p className="text-muted-foreground">No retailers scheduled for this day</p>
          <p className="text-sm text-muted-foreground">Add retailers to your day plan to see the route map</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{ height, width: '100%' }}
      className="rounded-lg"
    />
  );
};

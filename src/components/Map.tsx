'use client';

import { useEffect, useRef, useState } from 'react';

interface MapMarker {
  id: string;
  business_name: string;
  latitude: number | null;
  longitude: number | null;
}

interface MapProps {
  latitude: number | null;
  longitude: number | null;
  onLocationChange?: (lat: number, lng: number) => void;
  address?: string;
  viewOnly?: boolean;
  markers?: MapMarker[];
  businessName?: string;
}

export default function Map({
  latitude,
  longitude,
  onLocationChange,
  address,
  viewOnly = false,
  markers = [],
  businessName,
}: MapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [markerInstance, setMarkerInstance] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const LRef = useRef<any>(null);
  const markersContainerRef = useRef<any[]>([]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainerRef.current) return;

    let map: any = null;
    let isUnmounted = false;

    // Dynamically import Leaflet
    import('leaflet').then((L) => {
      if (isUnmounted) return;
      LRef.current = L;

      // Fix default marker icon issues in Leaflet
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const defaultLat = latitude || 14.5995; // Default to Manila coordinates or similar
      const defaultLng = longitude || 120.9842;

      // Create map instance
      map = L.map(mapContainerRef.current!).setView([defaultLat, defaultLng], 13);
      setMapInstance(map);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      // Only add a single main marker if we don't have multiple markers
      if (!markers || markers.length === 0) {
        const marker = L.marker([defaultLat, defaultLng], {
          draggable: !viewOnly,
        }).addTo(map);
        
        if (businessName) {
          marker.bindPopup(`<b>${businessName}</b>`).openPopup();
        }
        
        setMarkerInstance(marker);
        
        if (!viewOnly && onLocationChange) {
          marker.on('dragend', () => {
            const position = marker.getLatLng();
            onLocationChange(position.lat, position.lng);
          });
        }
      }
    });

    return () => {
      isUnmounted = true;
      if (map) {
        map.remove();
      }
    };
  }, []);

  // Update multiple markers on the map when the markers array or mapInstance changes
  useEffect(() => {
    if (!mapInstance || !LRef.current || !markers) return;

    const L = LRef.current;
    
    // Clear existing markers
    markersContainerRef.current.forEach((m) => m.remove());
    markersContainerRef.current = [];

    // Add new markers
    markers.forEach((markerData) => {
      if (markerData.latitude && markerData.longitude) {
        const marker = L.marker([markerData.latitude, markerData.longitude])
          .addTo(mapInstance)
          .bindPopup(`<b>${markerData.business_name}</b>`);
        markersContainerRef.current.push(marker);
      }
    });
  }, [markers, mapInstance]);

  // Update map view when coordinates change from parent
  useEffect(() => {
    if (mapInstance && latitude && longitude) {
      mapInstance.setView([latitude, longitude], 14);
      if (markerInstance) {
        markerInstance.setLatLng([latitude, longitude]);
        if (businessName) {
          markerInstance.bindPopup(`<b>${businessName}</b>`).openPopup();
        }
      }
    }
  }, [latitude, longitude, mapInstance, markerInstance, businessName]);

  // Geocode address when changed (for provider registration geocoding)
  useEffect(() => {
    if (viewOnly || !address || !mapInstance || !markerInstance || !onLocationChange) return;

    const delayDebounce = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`
        );
        const data = await response.json();
        if (data && data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lng = parseFloat(data[0].lon);
          onLocationChange(lat, lng);
          mapInstance.setView([lat, lng], 14);
          markerInstance.setLatLng([lat, lng]);
        }
      } catch (error) {
        console.error('Geocoding error:', error);
      } finally {
        setLoading(false);
      }
    }, 1200); // Debounce to prevent hitting osm servers too hard

    return () => clearTimeout(delayDebounce);
  }, [address]);

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-champagne shadow-sm bg-white p-1">
      {loading && (
        <div className="absolute inset-0 bg-white/70 z-30 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs font-medium text-slate-500 font-sans">Locating on map...</span>
          </div>
        </div>
      )}
      <div ref={mapContainerRef} className="w-full h-80 z-10 rounded-xl"></div>
      {!viewOnly && (
        <div className="p-3 bg-slate-50 rounded-b-xl border-t border-champagne/40 text-[11px] text-slate-500 flex items-center gap-1.5 font-sans">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
          Drag the map pin to specify your exact business location if needed.
        </div>
      )}
    </div>
  );
}

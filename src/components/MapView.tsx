import React, { useRef, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { GpsPosition } from '../types';
import './MapView.css';

// You'll need to set your Mapbox token here
// Get one free at https://account.mapbox.com/
mapboxgl.accessToken = 'pk.eyJ1IjoibmF2eC1wd2EiLCJhIjoiY2x5MHN0ZXhwMDFuMjJrcXk1eGU5Zjd1ZCJ9.PLACEHOLDER';

interface MapViewProps {
  position: GpsPosition | null;
}

export const MapView: React.FC<MapViewProps> = ({ position }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    // Initialize map
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [0, 0],
      zoom: 2,
    });

    map.current.addControl(new mapboxgl.NavigationControl());

    return () => {
      map.current?.remove();
    };
  }, []);

  useEffect(() => {
    if (!map.current || !position) return;

    const coords: [number, number] = [position.longitude, position.latitude];

    // Update or create marker
    if (marker.current) {
      marker.current.setLngLat(coords);
    } else {
      marker.current = new mapboxgl.Marker({ color: '#007bff' })
        .setLngLat(coords)
        .addTo(map.current);
    }

    // Center map on position
    map.current.flyTo({
      center: coords,
      zoom: 16,
      duration: 1000,
    });
  }, [position]);

  return <div ref={mapContainer} className="map-container" />;
};

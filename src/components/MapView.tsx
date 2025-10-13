import React, { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { GpsPosition, FixType } from '../types';
import './MapView.css';

// You'll need to set your Mapbox token here
// Get one free at https://account.mapbox.com/
mapboxgl.accessToken = 'pk.eyJ1IjoidmluY2VudGxiIiwiYSI6ImNtZ295enN2czIzcXAya3Iwbng4N2w0NGoifQ.GSPj2FB3DDOtCYJlmLLoaQ';

interface MapViewProps {
  position: GpsPosition | null;
  fixType?: FixType;
}

// Custom Mapbox control: only an icon button, injected in top-right control group
class FollowControl implements mapboxgl.IControl {
  private container: HTMLElement | null = null;
  private button: HTMLButtonElement | null = null;
  private onToggle?: (enabled: boolean) => void;
  private enabled = false;

  constructor(onToggle?: (enabled: boolean) => void) {
    this.onToggle = onToggle;
  }

  onAdd(): HTMLElement {
    this.container = document.createElement('div');
    this.container.className = 'mapboxgl-ctrl mapboxgl-ctrl-group';

    this.button = document.createElement('button');
    this.button.className = 'mapboxgl-ctrl-follow';
    this.button.type = 'button';
    this.button.setAttribute('aria-label', 'Toggle GPS follow mode');
    this.button.setAttribute('aria-pressed', 'false');

    // Use image icons from public folder for on/off states
    const img = document.createElement('img');
    img.alt = '';
    img.width = 18;
    img.height = 18;
    img.src = '/icons/target_red.png';
    this.button.appendChild(img);

    this.button.addEventListener('click', this.toggle.bind(this));
    this.container.appendChild(this.button);

    return this.container;
  }

  onRemove(): void {
    if (this.container && this.container.parentNode) this.container.parentNode.removeChild(this.container);
    this.container = null;
    this.button = null;
  }

  toggle(): void {
    if (this.container && this.container.classList.contains('disabled')) return;
    this.enabled = !this.enabled;
    if (this.button) {
      this.button.setAttribute('aria-pressed', String(this.enabled));
      const imgEl = this.button.querySelector('img');
      if (imgEl) imgEl.src = this.enabled ? '/icons/target_green.png' : '/icons/target_red.png';
      this.button.classList.toggle('mapboxgl-ctrl-follow-active', this.enabled);
    }
    if (this.onToggle) this.onToggle(this.enabled);
  }

  setEnabled(v: boolean) {
    this.enabled = v;
    if (this.button) {
      this.button.setAttribute('aria-pressed', String(this.enabled));
      const imgEl = this.button.querySelector('img');
      if (imgEl) imgEl.src = this.enabled ? '/icons/target_green.png' : '/icons/target_red.png';
      this.button.classList.toggle('mapboxgl-ctrl-follow-active', this.enabled);
    }
  }

  setDisabled(v: boolean) {
    if (this.container) {
      this.container.classList.toggle('disabled', v);
    }
    if (this.button) {
      this.button.disabled = v;
      this.button.setAttribute('aria-disabled', String(v));
    }
  }
}

export const MapView: React.FC<MapViewProps> = ({ position, fixType }) => {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const followControlRef = useRef<FollowControl | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [isFirstPosition, setIsFirstPosition] = useState(true);
  const [followMode, setFollowMode] = useState(false);

  useEffect(() => {
    if (!mapContainer.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [0, 0],
      zoom: 22, // default to max zoom
      maxZoom: 22,
    });

    // Add default navigation control in top-right
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Add our follow control into the same top-right group
    followControlRef.current = new FollowControl((enabled) => setFollowMode(enabled));
    map.current.addControl(followControlRef.current, 'top-right');

    // Create source & layers when style is loaded
    map.current.on('load', () => {
      if (!map.current) return;

      map.current.addSource('gps-point', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [0, 0] },
          properties: {}
        }
      });

      map.current.addLayer({
        id: 'gps-point',
        type: 'circle',
        source: 'gps-point',
        layout: { visibility: 'none' },
        paint: {
          'circle-radius': 8,
          'circle-color': '#007bff',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
          'circle-opacity': 0.95
        }
      });

      map.current.addLayer({
        id: 'gps-accuracy',
        type: 'circle',
        source: 'gps-point',
        layout: { visibility: 'none' },
        paint: {
          'circle-radius': 20,
          'circle-color': '#007bff',
          'circle-opacity': 0.12,
          'circle-stroke-width': 1,
          'circle-stroke-color': '#007bff',
          'circle-stroke-opacity': 0.3
        }
      });

      setMapLoaded(true);
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Update gps point and handle centering logic
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const coords: [number, number] = position ? [position.longitude, position.latitude] : [0, 0];
    const src = map.current.getSource('gps-point') as mapboxgl.GeoJSONSource | undefined;
    if (src) {
      src.setData({ type: 'Feature', geometry: { type: 'Point', coordinates: coords }, properties: {} });
    }

    if (position) {
      if (map.current.getLayer('gps-point')) {
        try { map.current.setLayoutProperty('gps-point', 'visibility', 'visible'); } catch (e) { }
      }
      if (map.current.getLayer('gps-accuracy')) {
        try { map.current.setLayoutProperty('gps-accuracy', 'visibility', 'visible'); } catch (e) { }
      }

      if (isFirstPosition) {
        const maxZ = typeof map.current.getMaxZoom === 'function' ? map.current.getMaxZoom() : 22;
        map.current.flyTo({ center: coords, zoom: maxZ, duration: 1000 });
        setIsFirstPosition(false);
      } else if (followMode) {
        // center without changing zoom
        map.current.easeTo({ center: coords, duration: 500 });
      }
    } else {
      if (map.current.getLayer('gps-point')) {
        try { map.current.setLayoutProperty('gps-point', 'visibility', 'none'); } catch (e) { }
      }
      if (map.current.getLayer('gps-accuracy')) {
        try { map.current.setLayoutProperty('gps-accuracy', 'visibility', 'none'); } catch (e) { }
      }
    }
  }, [position, mapLoaded, isFirstPosition, followMode]);

  // Update point color based on fixType
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Colors mapping selon NMEA GGA:
    // NO_FIX (0) -> grey
    // GPS (1) -> grey
    // DGPS (2) -> orange
    // PPS (3) -> purple
    // RTK_FIXED (4) -> green
    // RTK_FLOAT (5) -> blue
    // DEAD_RECKONING (6) -> yellow
    let color = '#6c757d'; // grey default for NO_FIX / GPS
    if (fixType === FixType.RTK_FIXED) color = '#28a745'; // green
    else if (fixType === FixType.RTK_FLOAT) color = '#007bff'; // blue
    else if (fixType === FixType.PPS) color = '#6f42c1'; // purple for PPS
    else if (fixType === FixType.DGPS) color = '#ff8c00'; // orange for DGPS
    else if (fixType === FixType.DEAD_RECKONING) color = '#ffc107'; // yellow for dead reckoning

    try {
      if (map.current.getLayer('gps-point')) {
        map.current.setPaintProperty('gps-point', 'circle-color', color);
      }
      if (map.current.getLayer('gps-accuracy')) {
        // accuracy circle more translucent
        map.current.setPaintProperty('gps-accuracy', 'circle-color', color);
        map.current.setPaintProperty('gps-accuracy', 'circle-stroke-color', color);
      }
    } catch (e) {
      // ignore errors when style not ready
    }
  }, [fixType, mapLoaded]);

  // Update accuracy circle radius (in pixels) according to fix type and current zoom/latitude
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const updateAccuracy = () => {
      if (!map.current) return;
      if (!position) return;

      const zoom = map.current.getZoom();
      const lat = position.latitude;

      // meters per pixel at given latitude and zoom
      const metersPerPixel = 156543.03392 * Math.cos(lat * Math.PI / 180) / Math.pow(2, zoom);

      let meters = 5.0; // default for GPS 5m
      if (fixType === FixType.RTK_FIXED) meters = 0.02; // 2 cm
      else if (fixType === FixType.RTK_FLOAT) meters = 0.5; // 50 cm
      else if (fixType === FixType.PPS) meters = 1.0; // 1 m
      else if (fixType === FixType.DGPS) meters = 1.0; // 1 m
      else if (fixType === FixType.DEAD_RECKONING) meters = 10.0; // 10 m

      let pixels = meters / metersPerPixel;
      if (!isFinite(pixels) || pixels <= 0) pixels = 1;
      // ensure at least 1 pixel visible
      pixels = Math.max(1, Math.round(pixels));

      try {
        if (map.current.getLayer('gps-accuracy')) {
          map.current.setPaintProperty('gps-accuracy', 'circle-radius', pixels);
        }
      } catch (e) {
        // ignore
      }
    };

    // initial
    updateAccuracy();
    // update when zoom or move changes
    map.current.on('zoom', updateAccuracy);
    map.current.on('move', updateAccuracy);

    return () => {
      if (map.current) {
        map.current.off('zoom', updateAccuracy);
        map.current.off('move', updateAccuracy);
      }
    };
  }, [position, fixType, mapLoaded]);

  // keep control button state in sync when followMode changes from React side
  useEffect(() => {
    if (followControlRef.current) followControlRef.current.setEnabled(followMode);
  }, [followMode]);

  // disable follow control when there's no GPS position
  useEffect(() => {
    if (followControlRef.current) followControlRef.current.setDisabled(!position);
  }, [position]);

  return (
    <div className="map-view">
      <div ref={mapContainer} className="map-container" />
      <div className="map-legend">
        <div className={`legend-item ${fixType === FixType.RTK_FIXED ? 'active' : ''}`}>
          <span className="legend-dot green"></span>
          <span>RTK Fixed</span>
        </div>
        <div className={`legend-item ${fixType === FixType.RTK_FLOAT ? 'active' : ''}`}>
          <span className="legend-dot blue"></span>
          <span>RTK Float</span>
        </div>
        <div className={`legend-item ${fixType === FixType.DGPS ? 'active' : ''}`}>
          <span className="legend-dot orange"></span>
          <span>DGNSS</span>
        </div>
        <div className={`legend-item ${(fixType === FixType.NO_FIX || fixType === FixType.GPS) ? 'active' : ''}`}>
          <span className="legend-dot grey"></span>
          <span>GNSS</span>
        </div>
        <div className={`legend-item ${fixType === FixType.DEAD_RECKONING ? 'active' : ''}`}>
          <span className="legend-dot yellow"></span>
          <span>Dead Reckoning</span>
        </div>
      </div>
    </div>
  );
};

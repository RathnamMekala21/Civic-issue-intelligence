import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

export default function GISMap({
  issues = [],
  center = [16.8432, 80.9985],
  selectedLocation = null,
  onLocationSelect = null,
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const selectedPinLayerRef = useRef(null);

  // Initialize Map once
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current).setView(center, 14);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      // Markers layer for issues
      const markersLayer = L.layerGroup().addTo(map);
      markersLayerRef.current = markersLayer;

      // Layer for user-selected pin
      const selectedPinLayer = L.layerGroup().addTo(map);
      selectedPinLayerRef.current = selectedPinLayer;

      // Click event for selecting location
      map.on('click', (e) => {
        if (onLocationSelect) {
          onLocationSelect(e.latlng.lat, e.latlng.lng);
        }
      });

      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update selected location pin
  useEffect(() => {
    if (!selectedPinLayerRef.current || !mapInstanceRef.current) return;

    selectedPinLayerRef.current.clearLayers();

    if (selectedLocation && !isNaN(selectedLocation.lat) && !isNaN(selectedLocation.lon)) {
      const pinIcon = L.divIcon({
        className: 'selected-pin',
        html: `
          <div style="position: relative;">
            <div style="
              background: #38bdf8;
              width: 22px;
              height: 22px;
              border-radius: 50%;
              border: 3px solid #ffffff;
              box-shadow: 0 0 16px #38bdf8;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-size: 10px;
              font-weight: 900;
            ">★</div>
          </div>
        `,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });

      const marker = L.marker([selectedLocation.lat, selectedLocation.lon], { icon: pinIcon })
        .bindPopup(`
          <div style="font-family: inherit; font-size: 12px; color: #0f172a; padding: 2px;">
            <strong style="color: #0284c7; font-size: 13px;">📍 Selected Issue Location</strong><br/>
            <span>Lat: <b>${selectedLocation.lat.toFixed(4)}</b>, Lon: <b>${selectedLocation.lon.toFixed(4)}</b></span><br/>
            <small style="color: #64748b;">(Click anywhere on map to reposition)</small>
          </div>
        `)
        .openPopup();

      selectedPinLayerRef.current.addLayer(marker);
    }
  }, [selectedLocation]);

  // Update markers for all reported issues
  useEffect(() => {
    if (!markersLayerRef.current || !mapInstanceRef.current) return;

    markersLayerRef.current.clearLayers();

    issues.forEach((issue) => {
      const lat = parseFloat(issue.latitude);
      const lon = parseFloat(issue.longitude);
      if (isNaN(lat) || isNaN(lon)) return;

      const isResolved = issue.status === 'Resolved';
      const isCritical = (issue.urgency_label || '').includes('CRITICAL');
      const color = isResolved ? '#10b981' : isCritical ? '#ef4444' : '#f59e0b';

      const customIcon = L.divIcon({
        className: 'custom-pin',
        html: `<div style="
          background: ${color};
          width: 18px;
          height: 18px;
          border-radius: 50%;
          border: 2px solid white;
          box-shadow: 0 0 10px ${color};
        "></div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });

      const popupContent = `
        <div style="font-family: inherit; font-size: 12px; color: #0f172a; min-width: 170px;">
          <strong style="color: ${color}; font-size: 13px;">${issue.ticket_id}</strong><br/>
          <strong>${issue.title}</strong><br/>
          <span style="color: #64748b;">📍 ${issue.address || 'Dharmajigudem'}</span><br/>
          <span>Priority: <b>${issue.priority_score || 5}/10</b></span><br/>
          <span>Status: <b>${issue.status}</b></span>
        </div>
      `;

      const marker = L.marker([lat, lon], { icon: customIcon }).bindPopup(popupContent);
      markersLayerRef.current.addLayer(marker);
    });
  }, [issues]);

  return (
    <div className="card overflow-hidden">
      <div className="card-title flex justify-between items-center flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span>🗺️ Interactive GIS Spatial Ward Map</span>
        </div>
        <div className="text-[11px] bg-[rgba(56,189,248,0.12)] border border-[rgba(56,189,248,0.3)] text-[#38bdf8] px-2.5 py-1 rounded-full font-medium">
          👆 Click map to select location
        </div>
      </div>

      <div
        ref={mapContainerRef}
        style={{ height: '350px', width: '100%', borderRadius: '10px', cursor: 'crosshair' }}
      ></div>

      <div className="flex gap-4 mt-3 text-xs text-[#8899bb] flex-wrap justify-between items-center">
        <div className="flex gap-4 flex-wrap">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]"></span> Critical / High
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]"></span> Medium / Assigned
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]"></span> AI Verified &amp; Resolved
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[#38bdf8] text-[11px] font-semibold">
          <span className="w-2.5 h-2.5 rounded-full bg-[#38bdf8] animate-pulse"></span> Selected Target Pin
        </div>
      </div>
    </div>
  );
}

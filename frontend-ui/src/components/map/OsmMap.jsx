import React from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// Default center: Purok 2 Community Cluster
const DEFAULT_CENTER = [14.6766, 120.5422];
const DEFAULT_ZOOM = 17;

export default function OsmMap({
  center = DEFAULT_CENTER,
  zoom = DEFAULT_ZOOM,
  children,
  className = "h-[450px] w-full"
}) {
  return (
    <div className={`relative rounded-control overflow-hidden border border-slate-200 shadow-sm z-0 ${className}`}>
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=cb1_2des_1_5b92e80a785d8e242b3ca977"
          maxZoom={21}
          maxNativeZoom={19}
        />

        {children}
      </MapContainer>
    </div>
  );
}
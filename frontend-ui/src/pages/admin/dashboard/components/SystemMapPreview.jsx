// Live map card: real Leaflet map of the monitored nodes with a floating detail tile.
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Map as MapIcon, ChevronRight } from 'lucide-react';
import { adminApi } from '../../../../api/admin_api';
import { GridNode } from '../../network-map/models/GridNode';
import { useTelemetryStore } from '../../../../stores/useTelemetryStore';
import 'leaflet/dist/leaflet.css';

const CENTER = [14.6766, 120.5422];

function FitBounds({ nodes }) {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 120);
    return () => clearTimeout(t);
  }, [map]);
  useEffect(() => {
    const coords = nodes.map((n) => [n.lat, n.lng]);
    if (coords.length > 1) map.fitBounds(L.latLngBounds(coords), { padding: [40, 40], maxZoom: 18 });
    else if (coords.length === 1) map.setView(coords[0], 17);
  }, [map, nodes]);
  return null;
}

const STATE = {
  leak: { color: '#b42318', label: 'Leak' },
  warn: { color: '#b45309', label: 'Maintenance' },
  ok: { color: '#0f766e', label: 'Normal' },
};

export default function SystemMapPreview() {
  const [rawNodes, setRawNodes] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const rtdbNodes = useTelemetryStore((s) => s.nodes);
  const leakHypotheses = useTelemetryStore((s) => s.leakHypotheses);

  useEffect(() => {
    let alive = true;
    adminApi
      .getNodes()
      .then((res) => {
        if (alive && res?.success && Array.isArray(res.data?.nodes)) setRawNodes(res.data.nodes);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const nodes = useMemo(() => rawNodes.map((n, i) => new GridNode(n, i)).filter((n) => n.hasValidCoordinates()), [rawNodes]);

  const stateOf = (n) => {
    const leak = leakHypotheses?.[n.id]?.classification === 'LEAK' || n.isLeaking();
    if (leak) return 'leak';
    const status = rtdbNodes?.[n.id]?.status || n.status;
    if (status === 'MAINTENANCE') return 'warn';
    return 'ok';
  };

  const selected = nodes.find((n) => n.id === selectedId) || nodes.find((n) => stateOf(n) === 'leak') || nodes[0];
  const flow = selected ? Number(rtdbNodes?.[selected.id]?.telemetry?.flow_rate_lpm) : NaN;
  const selState = selected ? STATE[stateOf(selected)] : null;

  return (
    <section className="aq-card aq-card-flush relative min-h-[420px] flex flex-col">
      <div className="absolute top-4 left-4 right-4 z-[500] flex items-center justify-between pointer-events-none">
        <span className="aq-chip pointer-events-auto cursor-default">
          <MapIcon className="w-4 h-4 stroke-[1.75]" /> System map
        </span>
        <Link to="/network-map" className="aq-chip pointer-events-auto focus-visible:ring-2 focus-visible:ring-[#0c4a6e]">
          Open map <ChevronRight className="w-4 h-4 stroke-[1.75]" />
        </Link>
      </div>

      <div className="absolute inset-0">
        <MapContainer center={CENTER} zoom={16} zoomControl={false} scrollWheelZoom={false} attributionControl={false} className="h-full w-full">
          <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" maxZoom={21} />
          <FitBounds nodes={nodes} />
          {nodes.map((n) => {
            const st = STATE[stateOf(n)];
            const isSel = selected && selected.id === n.id;
            return (
              <CircleMarker
                key={n.id}
                center={[n.lat, n.lng]}
                radius={isSel ? 9 : 7}
                pathOptions={{ color: '#ffffff', weight: 2.5, fillColor: st.color, fillOpacity: 1 }}
                eventHandlers={{ click: () => setSelectedId(n.id) }}
              />
            );
          })}
        </MapContainer>
      </div>

      {selected && (
        <div className="absolute left-4 right-4 bottom-4 z-[500] bg-white border border-line rounded-card shadow-soft p-4 sm:max-w-[420px]">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="font-semibold text-slate-900 truncate">{selected.label}</div>
              <div className="text-[0.8125rem] text-slate-600 font-mono">{selected.id}</div>
            </div>
            <Link to="/network-map" className="aq-chip shrink-0">Details</Link>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3">
            <div className="rounded-tile bg-[#eef4f8] px-3 py-2">
              <div className="text-[0.8125rem] text-slate-600">State</div>
              <div className="text-sm font-semibold flex items-center gap-1.5" style={{ color: selState.color }}>
                <span className="aq-dot" style={{ background: selState.color }} />{selState.label}
              </div>
            </div>
            <div className="rounded-tile bg-[#eef4f8] px-3 py-2">
              <div className="text-[0.8125rem] text-slate-600">Flow</div>
              <div className="text-sm font-semibold text-slate-900 tabular-nums">{isNaN(flow) ? 'No data' : `${flow.toFixed(2)} L/min`}</div>
            </div>
            <div className="rounded-tile bg-[#eef4f8] px-3 py-2">
              <div className="text-[0.8125rem] text-slate-600">Cluster</div>
              <div className="text-sm font-semibold text-slate-900 truncate">{selected.cluster}</div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

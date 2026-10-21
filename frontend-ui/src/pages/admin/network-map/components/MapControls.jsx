// frontend-ui/src/pages/admin/network-map/components/MapControls.jsx
import React from 'react';
import { Crosshair, Network as NetworkIcon, Layers } from 'lucide-react';

export default function MapControls({
  onRecenter,
  showPipes,
  onTogglePipes,
  mapLayer,
  onToggleLayer
}) {
  return (
    <div className="absolute bottom-8 right-6 z-30 flex flex-col gap-2 select-none">
      <div className="aq-surface rounded-card p-1 border border-line shadow-soft flex flex-col gap-1">
        
        {/* Recenter View on Sector 03 */}
        <button
          type="button"
          onClick={onRecenter}
          className="p-2.5 rounded-control hover:bg-black/[0.05] text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
          title="Recenter Map on Sector 03"
        >
          <Crosshair className="h-4 w-4" />
        </button>

        {/* Toggle Hydraulic Pipe Conduits */}
        <button
          type="button"
          onClick={onTogglePipes}
          className={`p-2.5 rounded-control transition-colors cursor-pointer ${
 showPipes ? 'bg-slate-100 text-[#0c4a6e] font-semibold': 'hover:bg-black/[0.05] text-slate-600'
 }`}
          title={showPipes ? 'Hide Hydraulic Conduits' : 'Show Hydraulic Conduits'}
        >
          <NetworkIcon className="h-4 w-4" />
        </button>

        {/* Layer Style Switcher (Standard vs. Satellite) */}
        <button
          type="button"
          onClick={onToggleLayer}
          className={`p-2.5 rounded-control transition-colors cursor-pointer ${
 mapLayer === 'satellite'? 'bg-slate-100 text-[#0c4a6e]': 'hover:bg-black/[0.05] text-slate-600'
 }`}
          title="Toggle Satellite / Standard Map"
        >
          <Layers className="h-4 w-4" />
        </button>

      </div>
    </div>
  );
}
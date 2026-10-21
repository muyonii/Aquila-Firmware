// frontend-ui/src/pages/admin/network-map/components/ProvisionNodeDrawer.jsx
import React from 'react';
import { X, RefreshCw, MapPin, Hash } from 'lucide-react';

export default function ProvisionNodeDrawer({
  isOpen,
  draftNode,
  onDraftChange,
  nodes,
  onCancel,
  onCommit,
  submitting
}) {
  if (!isOpen || !draftNode) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onCommit();
  };

  return (
    <aside
      className="absolute top-6 bottom-6 right-6 w-full sm:w-[380px] z-40 bg-white rounded-card border border-line shadow-soft p-6 flex flex-col justify-between select-none font-sans overflow-hidden animate-in slide-in-from-right duration-200"
      onClick={(e) => e.stopPropagation()}
    >
      {/* 1. Header & Auto-Assigned Node ID Badge */}
      <div className="space-y-3 pb-3 border-b border-black/[0.05]">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900 tracking-tight">Add Water Meter</h3>
            <p className="text-[0.8125rem] text-slate-600">Register new tap and pipe connection.</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 rounded-full hover:bg-black/[0.05] text-slate-600 hover:text-slate-800 transition-colors cursor-pointer"
            title="Cancel (Esc)"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Automatic Sequential Node ID Pill */}
        <div className="flex items-center justify-between px-3 py-1.5 rounded-control bg-slate-100/80 border border-slate-200/60 text-[0.8125rem]">
          <span className="text-slate-600 font-medium flex items-center gap-1.5">
            <Hash className="h-3 w-3 text-slate-600" />
            <span>Assigned Meter ID</span>
          </span>
          <span className="font-mono font-semibold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs">
            {draftNode.suggestedId}
          </span>
        </div>
      </div>

      {/* 2. Structured Inset Cards */}
      <form onSubmit={handleSubmit} className="space-y-3.5 my-auto text-[0.8125rem]">
        
        {/* Inset Card 1: Consumer Identity & Street Location */}
        <div className="aq-surface rounded-card p-4 border border-line shadow-2xs space-y-3">
          
          {/* Household Name */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-700 block text-[0.8125rem] ">
              1. Household / Consumer Name
            </label>
            <input
              type="text"
              required
              autoFocus
              value={draftNode?.householdName ?? ''}
              onChange={(e) => onDraftChange({ ...draftNode, householdName: e.target.value })}
              placeholder="e.g. Santos Family"
              className="w-full bg-white focus:bg-white border border-slate-200/80 focus:border-slate-800 rounded-control px-3 py-2 text-[0.8125rem] text-slate-900 outline-none transition-all placeholder-slate-500 shadow-2xs"
            />
          </div>

          {/* Manual Street Location */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-700 block text-[0.8125rem] ">
              2. Street Location / Landmark
            </label>
            <input
              type="text"
              required
              value={draftNode?.streetLocation ?? ''}
              onChange={(e) => onDraftChange({ ...draftNode, streetLocation: e.target.value })}
              placeholder="e.g. P. Paterno St., near bridge"
              className="w-full bg-white focus:bg-white border border-slate-200/80 focus:border-slate-800 rounded-control px-3 py-2 text-[0.8125rem] text-slate-900 outline-none transition-all placeholder-slate-500 shadow-2xs"
            />
          </div>

          {/* Parent Feeder Pipe */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-700 block text-[0.8125rem] ">
                3. Supplied By Pipe Line
              </label>
              <span className="text-[0.8125rem] text-[#0c4a6e] font-medium">Draws pipe link</span>
            </div>
            <select
              value={draftNode?.parentId || ''}
              onChange={(e) => onDraftChange({ ...draftNode, parentId: e.target.value })}
              className="w-full bg-white focus:bg-white border border-slate-200/80 focus:border-slate-800 rounded-control px-3 py-2 text-[0.8125rem] text-slate-900 outline-none transition-all cursor-pointer shadow-2xs"
            >
              <option value="">None (Primary Feeder)</option>
              {nodes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.id} — {n.label}
                </option>
              ))}
            </select>
          </div>

        </div>

        {/* Inset Card 2: Map Pin Confirmation & Hardware */}
        <div className="aq-surface rounded-card p-4 border border-line shadow-2xs space-y-3">
          
          <div className="flex items-center justify-between text-[0.8125rem]">
            <div className="flex items-center gap-1.5 font-semibold text-slate-800">
              <MapPin className="h-3.5 w-3.5 text-[#0c4a6e]" />
              <span>Map Pin Coordinates</span>
            </div>
            <span className="font-mono text-[0.8125rem] text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
              {draftNode.lat.toFixed(4)}, {draftNode.lng.toFixed(4)}
            </span>
          </div>
          <p className="text-[10.5px] text-slate-600">
            Click anywhere on the map to reposition this pin.
          </p>

          {/* Hardware Segmented Picker */}
          <div className="pt-1">
            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-200/50 rounded-control select-none">
              <button
                type="button"
                onClick={() => onDraftChange({ ...draftNode, isPhysical: true })}
                className={`py-1.5 rounded-lg text-center transition-all cursor-pointer text-[0.8125rem] font-medium ${
 draftNode.isPhysical
 ? 'bg-white text-slate-900 shadow-xs font-semibold'
 : 'text-slate-600 hover:text-slate-900'
 }`}
              >
                Physical ESP32
              </button>
              <button
                type="button"
                onClick={() => onDraftChange({ ...draftNode, isPhysical: false })}
                className={`py-1.5 rounded-lg text-center transition-all cursor-pointer text-[0.8125rem] font-medium ${
 !draftNode.isPhysical
 ? 'bg-white text-slate-900 shadow-xs font-semibold'
 : 'text-slate-600 hover:text-slate-900'
 }`}
              >
                Simulation Node
              </button>
            </div>
          </div>

        </div>

        {/* Footer Buttons */}
        <div className="pt-2 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-control text-[0.8125rem] font-semibold text-slate-600 hover:text-slate-900 hover:bg-black/[0.04] transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2.5 rounded-control bg-[#18181b] hover:bg-black text-white text-[0.8125rem] font-semibold shadow-xs transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
          >
            {submitting ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              'Add Meter'
            )}
          </button>
        </div>

      </form>

      {/* Footer */}
      <div className="pt-2 border-t border-black/[0.05] text-[10.5px] text-slate-600 text-center font-mono">
        Draft Mode • Not saved until you click Add Meter
      </div>
    </aside>
  );
}
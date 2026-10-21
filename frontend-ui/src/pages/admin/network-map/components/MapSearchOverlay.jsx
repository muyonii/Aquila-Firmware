import React from 'react';
import { Search, X } from 'lucide-react';

export default function MapSearchOverlay({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  totalNodes,
  leakCount,
  nodes = [],
  selectedNodeId = null,
  onSelectNode,
  disabled = false
}) {
  return (
    <div
      className={`absolute top-6 left-6 z-30 flex flex-col gap-2.5 max-w-sm w-full select-none transition-opacity duration-200 ${
 disabled ? 'opacity-40 pointer-events-none': 'opacity-100'
 }`}
    >
      {/* Search Input */}
      <div className="aq-surface rounded-card p-2 border border-line shadow-soft flex items-center gap-2">
        <Search className="h-4 w-4 text-slate-600 ml-2 shrink-0 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search household, node ID, or street..."
          className="w-full bg-transparent text-[0.8125rem] text-slate-900 outline-none placeholder:text-[#86868b] py-1"
        />
        {search && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="p-1 rounded-full text-slate-600 hover:text-[#1d1d1f] cursor-pointer"
            title="Clear search"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Status Filter Tabs */}
      <div className="self-start inline-flex p-1 bg-white rounded-control border border-line shadow-soft text-[0.8125rem]">
        {[
          { id: 'all', label: `All Meters (${totalNodes})` },
          { id: 'leak', label: `Leaks (${leakCount})` },
          { id: 'maintenance', label: 'Maintenance' }
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onStatusFilterChange(tab.id)}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
 statusFilter === tab.id
 ? 'bg-[#0c4a6e] text-white font-semibold shadow-xs'
 : 'text-slate-600 hover:text-[#1d1d1f] font-medium'
 }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Quick-Jump Node Pill Strip (Shows all filtered nodes) */}
      {nodes.length > 0 && (
        <div className="aq-surface rounded-card p-2 border border-line shadow-soft flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none]">
          {nodes.map((n) => {
            const isSelected = selectedNodeId === n.id;
            const dotColor = n.isLeaking()
              ? 'bg-rose-500 animate-ping'
              : n.isMaintenance()
              ? 'bg-amber-500'
              : 'bg-emerald-500';

            return (
              <button
                key={n.id}
                type="button"
                onClick={() => onSelectNode && onSelectNode(n)}
                className={`px-2.5 py-1 rounded-lg text-[0.8125rem] font-mono font-semibold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
 isSelected
 ? 'bg-[#0c4a6e] text-white shadow-2xs'
 : 'bg-slate-100/80 hover:bg-slate-200/70 text-slate-700'
 }`}
                title={`${n.label} (${n.locationName})`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                <span>{n.id.replace('NODE-', '')}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
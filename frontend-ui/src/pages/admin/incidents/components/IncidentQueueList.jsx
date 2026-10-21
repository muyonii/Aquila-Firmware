// frontend-ui/src/pages/admin/incidents/components/IncidentQueueList.jsx
import React from 'react';
import { Droplets, ChevronRight, ShieldCheck } from 'lucide-react';

export default function IncidentQueueList({ incidents, selectedId, onSelect, activeStage }) {
  if (incidents.length === 0) {
    return (
      <div className="aq-surface rounded-card p-8 border border-line text-center space-y-2 select-none my-auto">
        <ShieldCheck className="h-6 w-6 text-slate-600 mx-auto" />
        <h4 className="text-[0.8125rem] font-semibold text-slate-800">
          {activeStage === 'needs_dispatch'
            ? 'Zero Unassigned Leaks'
            : activeStage === 'verifying'
            ? 'No Tickets in Quiet Observation'
            : 'No Resolved History Recorded'}
        </h4>
        <p className="text-[0.8125rem] text-slate-600 max-w-xs mx-auto">
          {activeStage === 'needs_dispatch'
            ? 'All water pipe lines in Sector 03 are running normally with no open alarms.'
            : 'Tickets appear here as plumbers service pipes and submit repairs.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {incidents.map((inc) => {
        const isSelected = selectedId === inc.id;
        const sevBadge = inc.getSeverityBadgeProps();
        const statBadge = inc.getStatusBadgeProps();

        return (
          <div
            key={inc.id}
            onClick={() => onSelect(inc)}
            className={`p-3.5 rounded-card border transition-all duration-150 cursor-pointer select-none ${
 isSelected
 ? 'bg-[#0c4a6e]/[0.06] border-[#0c4a6e]/35 shadow-xs'
 : 'aq-surface border-line hover:bg-white hover:border-slate-200'
 }`}
          >
            {/* Row 1: Priority + Household Name + Elapsed Time */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 overflow-hidden">
                <span className={`px-2 py-0.5 rounded text-[0.8125rem] font-mono border ${sevBadge.className}`}>
                  {sevBadge.label}
                </span>

                <span className={`text-[0.8125rem] truncate ${isSelected ? 'font-semibold text-slate-900': 'font-semibold text-slate-800'}`}>
                  {inc.householdLabel}
                </span>
              </div>

              <span className={`text-[0.8125rem] font-mono shrink-0 ${isSelected ? 'text-slate-600 font-medium': 'text-slate-600'}`}>
                {inc.getElapsedTime()}
              </span>
            </div>

            {/* Row 2: Node location & Type */}
            <div className="flex items-center justify-between mt-1.5 text-[0.8125rem]">
              <span className="text-[0.8125rem] text-slate-600 font-mono">
                {inc.nodeId} • {inc.purokCluster}
              </span>
              <span className="text-slate-600 font-medium text-[0.8125rem]">
                {inc.getReadableType()}
              </span>
            </div>

            {/* Row 3: Live Flow Velocity & Status Pill */}
            <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-black/[0.04] text-[0.8125rem]">
              <div className="flex items-center gap-1.5 font-mono text-[0.8125rem] text-slate-800">
                <Droplets className="h-3 w-3 text-slate-600" />
                <span className="font-semibold">{inc.flowRateLpm.toFixed(2)} L/min</span>
                <span className="text-slate-600 font-normal">leak rate</span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className={`px-2 py-0.5 rounded text-[0.8125rem] border ${statBadge.className}`}>
                  {statBadge.label}
                </span>
                <ChevronRight className={`h-3 w-3 ${isSelected ? 'text-[#0c4a6e]': 'text-slate-300'}`} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
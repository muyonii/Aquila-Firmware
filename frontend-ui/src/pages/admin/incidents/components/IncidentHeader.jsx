// frontend-ui/src/pages/admin/incidents/components/IncidentHeader.jsx
import React from 'react';
import { Plus } from 'lucide-react';

/**
 * IncidentHeader Component
 * Displays the OS-style breadcrumb title and the primary button to log citizen complaints.
 */
export default function IncidentHeader({ onLogComplaintClick }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      {/* Breadcrumb Title & Single-Sentence Subtitle */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 flex items-center gap-2">
          <span className="text-slate-600 font-medium">Operations</span>
          <span className="text-slate-600 font-normal text-xl select-none">›</span>
          <span>Incidents</span>
        </h1>
        <p className="text-sm text-slate-600">
          Triage pipeline ruptures, dispatch plumbers, and track automated repair checks.
        </p>
      </div>

      {/* Primary Action Button (Apple Dark Graphite Pill) */}
      <button
        type="button"
        onClick={onLogComplaintClick}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-control bg-[#18181b] hover:bg-black text-white text-[0.8125rem] font-semibold shadow-xs transition-all active:scale-95 cursor-pointer self-start sm:self-auto"
      >
        <Plus className="h-4 w-4 stroke-[2.5]" />
        <span>Log Citizen Complaint</span>
      </button>
    </div>
  );
}
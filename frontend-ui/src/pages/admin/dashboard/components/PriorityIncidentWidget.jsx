// frontend-ui/src/pages/admin/dashboard/components/PriorityIncidentWidget.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';

export default function PriorityIncidentWidget({ incidents = [] }) {
  const openIncidents = incidents.filter((i) => i.status === 'OPEN').slice(0, 4);

  const severityColor = (severity) =>
    severity === 'P1' ? '#b42318' : severity === 'P2' ? '#b45309' : '#4a5b67';

  return (
    <section className="aq-card">
      <div className="aq-card-head">
        <h2 className="aq-card-title">
          <span className="aq-icon"><AlertTriangle className="w-[18px] h-[18px] stroke-[1.75]" /></span>
          Priority incidents
        </h2>
        <Link to="/incidents" className="aq-chip focus-visible:ring-2 focus-visible:ring-[#0c4a6e]">View all</Link>
      </div>

      {openIncidents.length > 0 ? (
        <ul className="space-y-3">
          {openIncidents.map((inc) => {
            const severity = inc.severity_level || 'P1';
            const typeLabel = (inc.incident_type || 'Leak detected').replace('_', ' ');
            return (
              <li key={inc.incident_id || inc.id} className="aq-tile flex items-start justify-between gap-4">
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900 truncate">
                      {inc.household_label || inc.node_id || 'Household branch'}
                    </span>
                    <span className="text-sm text-slate-700 flex items-center gap-1.5 shrink-0">
                      <span className="aq-dot" style={{ background: severityColor(severity) }} />
                      {severity}
                    </span>
                  </div>
                  <div className="text-sm text-slate-600">
                    <span className="font-mono text-slate-700">{inc.node_id}</span>
                    <span> · </span>
                    <span className="capitalize">{typeLabel}</span>
                  </div>
                </div>
                <div className="text-right shrink-0 space-y-0.5">
                  <div className="text-sm text-slate-600">{inc.created_at || 'Just now'}</div>
                  <Link to="/incidents" className="text-sm font-semibold text-[#0c4a6e] hover:underline">
                    Dispatch
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="aq-tile text-sm text-slate-600 text-center py-6">
          No open incidents. All work orders are dispatched or closed.
        </div>
      )}
    </section>
  );
}

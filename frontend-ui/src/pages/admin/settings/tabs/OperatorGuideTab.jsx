// frontend-ui/src/pages/admin/settings/tabs/OperatorGuideTab.jsx
import React from 'react';

export default function OperatorGuideTab() {
  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Operator Quick Guide</h2>
        <p className="text-[0.8125rem] text-slate-600 mt-0.5">Essential protocols for handling system alarms during emergencies.</p>
      </div>

      <div className="aq-surface rounded-card p-5 border border-slate-200/80 shadow-xs space-y-4">
        <h3 className="text-[0.8125rem] font-semibold text-slate-900 ">3-Step Emergency Checklist</h3>
        <div className="space-y-3 text-[0.8125rem] text-slate-600 leading-relaxed">
          <div className="flex items-start gap-2.5">
            <span className="font-semibold text-slate-900 bg-slate-100 rounded-full h-5 w-5 flex items-center justify-center shrink-0">1</span>
            <p><strong>Acknowledge Incident:</strong> When a P1 leak alert appears, inspect the node identifier and affected household street branch.</p>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="font-semibold text-slate-900 bg-slate-100 rounded-full h-5 w-5 flex items-center justify-center shrink-0">2</span>
            <p><strong>Dispatch Field Plumber:</strong> Assign the ticket to an active technician via the Dispatch button to inspect physical pipe couplings.</p>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="font-semibold text-slate-900 bg-slate-100 rounded-full h-5 w-5 flex items-center justify-center shrink-0">3</span>
            <p><strong>15-Minute Observation:</strong> After repair submission, AQUILA automatically observes quiescent flow (&le;0.05 L/min) for 15 minutes before closing the ticket.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
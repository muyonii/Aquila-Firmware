// frontend-ui/src/pages/admin/incidents/components/IncidentStageButtons.jsx
import React from 'react';

export default function IncidentStageButtons({ activeStage, onStageChange, counts }) {
  const stages = [
    {
      id: 'needs_dispatch',
      label: 'Needs Dispatch',
      count: counts.needsDispatch,
      badgeColor: counts.needsDispatch > 0 ? 'bg-rose-500' : 'bg-slate-300'
    },
    {
      id: 'verifying',
      label: '15m Verification',
      count: counts.inVerification,
      badgeColor: counts.inVerification > 0 ? 'bg-indigo-500' : 'bg-slate-300'
    },
    {
      id: 'resolved',
      label: 'Resolved',
      count: counts.resolved,
      badgeColor: 'bg-slate-400'
    }
  ];

  return (
    <div className="p-1 bg-slate-200/60 rounded-control border border-slate-300/40 select-none flex gap-1">
      {stages.map((s) => {
        const isActive = activeStage === s.id;

        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onStageChange(s.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-[11.5px] transition-all cursor-pointer ${
 isActive
 ? 'bg-white text-slate-900 font-semibold shadow-xs'
 : 'text-slate-600 hover:text-slate-900 hover:bg-white/40 font-medium'
 }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${s.badgeColor}`} />
            <span className="truncate">{s.label}</span>
            <span className="text-[0.8125rem] font-mono opacity-60 shrink-0">({s.count})</span>
          </button>
        );
      })}
    </div>
  );
}
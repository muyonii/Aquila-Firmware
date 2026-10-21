import React from 'react';
import { ShieldAlert, AlertTriangle, Activity } from 'lucide-react';

/**
 * ActionCard Component (INV-01)
 * Renders non-actuating operational directives for human operators and plumbers.
 * @param {string} title - Action card heading
 * @param {string} priority - Priority tier ('P1', 'P2', 'P3')
 * @param {string} directive - Human operator instructions
 */
export default function ActionCard({
  title = "Incident Work Order",
  priority = "P1",
  directive = "Inspect pipe junction for pressure variations."
}) {
  const isP1 = priority === 'P1';
  const isP2 = priority === 'P2';

  const getTheme = () => {
    if (isP1) return {
      leftBorder: 'border-l-4 border-l-rose-600',
      dotColor: 'text-rose-600',
    };
    if (isP2) return {
      leftBorder: 'border-l-4 border-l-amber-600',
      dotColor: 'text-amber-600',
    };
    return {
      leftBorder: 'border-l-4 border-l-[#0c4a6e]',
      dotColor: 'text-slate-600',
    };
  };

  const theme = getTheme();

  return (
    <div className={`p-4 rounded-md border border-slate-200 ${theme.leftBorder} space-y-2`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-slate-700">
          MAS Advisory Directive (INV-01)
        </span>
        <span className={`flex items-center gap-1.5 text-sm ${theme.dotColor}`}>
          <span aria-hidden="true">●</span>
          <span className="text-slate-700">{priority} Priority</span>
        </span>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
        <p className="text-sm text-slate-600 mt-1 leading-relaxed bg-slate-50 p-3 rounded-md border border-slate-200">
          {directive}
        </p>
      </div>
    </div>
  );
}
// frontend-ui/src/pages/admin/users/components/UserKpiCards.jsx
import React from 'react';

export default function UserKpiCards({ kpis }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Metric 1 */}
      <div className="aq-surface rounded-card p-4 border border-line shadow-soft space-y-1">
        <span className="text-[0.8125rem] font-semibold text-slate-600 block">
          Total Users
        </span>
        <div className="text-2xl font-semibold text-slate-900">{kpis.total}</div>
        <span className="text-[0.8125rem] text-slate-600">Registered accounts</span>
      </div>

      {/* Metric 2 */}
      <div className="aq-surface rounded-card p-4 border border-line shadow-soft space-y-1">
        <span className="text-[0.8125rem] font-semibold text-slate-600 block">
          Bound Households
        </span>
        <div className="text-2xl font-semibold text-slate-900">{kpis.boundCount}</div>
        <span className="text-[0.8125rem] text-slate-600">
          {kpis.unboundCount > 0 ? (
            <span className="text-slate-600 font-medium">{kpis.unboundCount} unassigned meter(s)</span>
          ) : (
            '100% meters linked'
          )}
        </span>
      </div>

      {/* Metric 3 */}
      <div className="aq-surface rounded-card p-4 border border-line shadow-soft space-y-1">
        <span className="text-[0.8125rem] font-semibold text-slate-600 block">
          Field Plumbers
        </span>
        <div className="text-2xl font-semibold text-slate-900">{kpis.techs}</div>
        <span className="text-[0.8125rem] text-slate-600 font-medium">Available for dispatch</span>
      </div>

      {/* Metric 4 */}
      <div className="aq-surface rounded-card p-4 border border-line shadow-soft space-y-1">
        <span className="text-[0.8125rem] font-semibold text-slate-600 block">
          Administrators
        </span>
        <div className="text-2xl font-semibold text-slate-900">{kpis.admins}</div>
        <span className="text-[0.8125rem] text-slate-600 font-medium">Protected governance</span>
      </div>
    </div>
  );
}
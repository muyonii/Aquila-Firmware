// frontend-ui/src/pages/admin/reports/components/LeakLossView.jsx
import React from 'react';

export default function LeakLossView({ data }) {
  const summary = data?.leak_loss_summary || {
    total_leaks_detected: 0,
    false_alarms_dismissed: 0,
    estimated_water_lost_liters: 0,
    estimated_cubic_meters_lost: 0,
    mean_time_to_repair_minutes: 0
  };
  const incidents = data?.incidents || [];

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      
      {/* 4 KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="aq-surface rounded-card p-4 border border-line shadow-soft space-y-1">
          <span className="text-[0.8125rem] font-semibold text-slate-600 block">Total Leaks Detected</span>
          <div className="text-2xl font-semibold text-slate-900">{summary.total_leaks_detected}</div>
          <span className="text-[0.8125rem] text-slate-600">Confirmed structural ruptures</span>
        </div>

        <div className="aq-surface rounded-card p-4 border border-line shadow-soft space-y-1">
          <span className="text-[0.8125rem] font-semibold text-slate-600 block">Estimated Water Lost</span>
          <div className="text-2xl font-semibold text-slate-900">{summary.estimated_cubic_meters_lost} m³</div>
          <span className="text-[0.8125rem] text-slate-600">({summary.estimated_water_lost_liters} Liters)</span>
        </div>

        <div className="aq-surface rounded-card p-4 border border-line shadow-soft space-y-1">
          <span className="text-[0.8125rem] font-semibold text-slate-600 block">False Alarms Dismissed</span>
          <div className="text-2xl font-semibold text-slate-900">{summary.false_alarms_dismissed}</div>
          <span className="text-[0.8125rem] text-slate-600">Filtered transient anomalies</span>
        </div>

        <div className="aq-surface rounded-card p-4 border border-line shadow-soft space-y-1">
          <span className="text-[0.8125rem] font-semibold text-slate-600 block">Mean Time to Repair</span>
          <div className="text-2xl font-semibold text-slate-900">{summary.mean_time_to_repair_minutes} min</div>
          <span className="text-[0.8125rem] text-slate-600">Average response duration</span>
        </div>
      </div>

      {/* Incident Log Table */}
      <div className="aq-surface rounded-card border border-line shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-black/[0.05] text-[0.8125rem] font-semibold text-slate-600 ">
                <th className="py-3 px-4 pl-6">Node & Household</th>
                <th className="py-3 px-4">Incident Type</th>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Detected At</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4 pr-6 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.03]">
              {incidents.map((inc) => (
                <tr key={inc.incident_id} className="hover:bg-black/[0.02] transition-colors">
                  <td className="py-3.5 px-4 pl-6">
                    <span className="font-semibold text-[0.8125rem] text-slate-900 block">{inc.household_label}</span>
                    <span className="text-[0.8125rem] text-slate-600 font-mono">{inc.node_id}</span>
                  </td>
                  <td className="py-3.5 px-4 text-[0.8125rem] font-medium text-slate-700">{inc.incident_type}</td>
                  <td className="py-3.5 px-4 text-[0.8125rem]">
                    <span className="px-2 py-0.5 rounded text-[0.8125rem] font-semibold bg-slate-100 text-slate-800 font-mono">
                      {inc.severity_level}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-[0.8125rem] font-mono text-slate-600">{inc.detected_at}</td>
                  <td className="py-3.5 px-4 font-mono text-[0.8125rem] text-slate-700">{inc.duration_minutes} mins</td>
                  <td className="py-3.5 px-4 pr-6 text-right">
                    <span className="px-2.5 py-0.5 rounded-md text-[10.5px] font-medium bg-black/[0.04] text-slate-700 border border-black/[0.06]">
                      {inc.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
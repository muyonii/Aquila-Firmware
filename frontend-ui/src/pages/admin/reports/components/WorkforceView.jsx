import React, { useMemo } from 'react';

export default function WorkforceView({ data }) {
  const technicians = data?.technicians || [];

  const { totalDispatches, passRate } = useMemo(() => {
    let assigned = 0;
    let verified = 0;
    let failed = 0;

    technicians.forEach((t) => {
      assigned += Number(t.total_assigned || 0);
      verified += Number(t.completed_verified || 0);
      failed += Number(t.failed_inspections || 0);
    });

    const totalEvaluated = verified + failed;
    const rate = totalEvaluated > 0 ? ((verified / totalEvaluated) * 100).toFixed(1) : '100.0';

    return {
      totalDispatches: assigned,
      passRate: `${rate}%`
    };
  }, [technicians]);

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      
      {/* Workforce Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="aq-surface rounded-card p-4 border border-line shadow-soft space-y-1">
          <span className="text-[0.8125rem] font-semibold text-slate-600 block">
            On-Duty Plumbers
          </span>
          <div className="text-2xl font-semibold text-slate-900">{technicians.length}</div>
          <span className="text-[0.8125rem] text-slate-600">Active maintenance personnel</span>
        </div>

        <div className="aq-surface rounded-card p-4 border border-line shadow-soft space-y-1">
          <span className="text-[0.8125rem] font-semibold text-slate-600 block">
            Total Dispatches Handled
          </span>
          <div className="text-2xl font-semibold text-slate-900">{totalDispatches}</div>
          <span className="text-[0.8125rem] text-slate-600">Work orders assigned</span>
        </div>

        <div className="aq-surface rounded-card p-4 border border-line shadow-soft space-y-1">
          <span className="text-[0.8125rem] font-semibold text-slate-600 block">
            Verification Success Rate
          </span>
          <div className="text-2xl font-semibold text-emerald-700">{passRate}</div>
          <span className="text-[0.8125rem] text-slate-600">15-minute quiet verification pass</span>
        </div>
      </div>

      {/* Technician Performance Table */}
      <div className="aq-surface rounded-card border border-line shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-black/[0.05] text-[0.8125rem] font-semibold text-slate-600 ">
                <th className="py-3 px-4 pl-6">Technician Name</th>
                <th className="py-3 px-4">Total Assigned</th>
                <th className="py-3 px-4">Verified Closures</th>
                <th className="py-3 px-4">Failed Inspections</th>
                <th className="py-3 px-4 pr-6 text-right">In Progress</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.03]">
              {technicians.map((tech) => (
                <tr key={tech.user_id} className="hover:bg-black/[0.02] transition-colors">
                  <td className="py-3.5 px-4 pl-6 font-semibold text-[0.8125rem] text-slate-900">
                    {tech.technician_name}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[0.8125rem] text-slate-800">
                    {tech.total_assigned}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[0.8125rem] font-semibold text-emerald-700">
                    {tech.completed_verified}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[0.8125rem] text-rose-600">
                    {tech.failed_inspections}
                  </td>
                  <td className="py-3.5 px-4 pr-6 text-right font-mono text-[0.8125rem] text-slate-600">
                    {tech.in_progress}
                  </td>
                </tr>
              ))}
              {technicians.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-[0.8125rem] text-slate-600">
                    No technician records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
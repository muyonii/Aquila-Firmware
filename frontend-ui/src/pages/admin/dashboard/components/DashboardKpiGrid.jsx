import React from 'react';
import { Link } from 'react-router-dom';
import { Activity, Droplets, ClipboardList, Users, ChevronRight } from 'lucide-react';
import { useSettings } from '../../settings/core/SettingsManager';

function KpiCard({ to, icon: Icon, label, children, sub, footer }) {
  return (
    <div className="aq-card flex flex-col">
      <div className="flex items-center gap-3">
        <span className="aq-icon"><Icon className="w-[18px] h-[18px] stroke-[1.75]" /></span>
        <span className="aq-label">{label}</span>
      </div>
      <div className="mt-4 flex-1">
        <div className="text-[2rem] leading-tight font-semibold text-slate-900 tabular-nums">{children}</div>
        <p className="text-sm text-slate-600 mt-1">{sub}</p>
      </div>
      <Link to={to} className="aq-foot focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0c4a6e]">
        <span>{footer}</span>
        <ChevronRight className="w-4 h-4 stroke-[1.75]" />
      </Link>
    </div>
  );
}

export function DashboardKpiGrid({ summary, kpis }) {
  const prefs = useSettings();
  const totalLiters = Number(summary.community24hLiters || 0);
  const totalM3 = (totalLiters / 1000.0).toFixed(3);
  const primaryVolumeDisplay =
    prefs.volumeUnit === 'liters' ? `${totalLiters.toFixed(1)} L` : `${totalM3} m³`;
  const secondaryVolumeDisplay =
    prefs.volumeUnit === 'liters' ? `${totalM3} m³ total draw` : `${totalLiters.toFixed(1)} L total draw`;

  const hasLeaks = kpis.activeLeaks > 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
      <KpiCard
        to="/incidents"
        icon={Activity}
        label="Network status"
        sub={
          hasLeaks
            ? `${kpis.activeLeaks} active ${kpis.activeLeaks === 1 ? 'leak' : 'leaks'} across ${summary.totalNodes} nodes`
            : `No active leaks across ${summary.totalNodes} nodes`
        }
        footer="View incidents"
      >
        <span className={hasLeaks ? 'text-rose-700' : 'text-emerald-700'}>
          {hasLeaks ? 'Attention' : 'Good'}
        </span>
      </KpiCard>

      <KpiCard
        to="/reports"
        icon={Droplets}
        label="24h community usage"
        sub={secondaryVolumeDisplay}
        footer="View usage report"
      >
        {primaryVolumeDisplay}
      </KpiCard>

      <KpiCard
        to="/incidents"
        icon={ClipboardList}
        label="Pending work orders"
        sub="Waiting for dispatch"
        footer="Open work orders"
      >
        {kpis.pendingTickets}
      </KpiCard>

      <KpiCard
        to="/users"
        icon={Users}
        label="On-duty plumbers"
        sub="Ready for field dispatch"
        footer="View team"
      >
        {kpis.onDutyTechs}
      </KpiCard>
    </div>
  );
}

import React from 'react';
import { Download, RefreshCw, Database, Calendar } from 'lucide-react';

export default function ReportsHeader({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onExport,
  onRefresh,
  onCompactNow,
  loading,
  compacting
}) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 flex items-center gap-2">
          <span className="text-slate-600 font-medium">Reports</span>
          <span className="text-slate-600 font-normal text-xl select-none">›</span>
          <span>Overview</span>
        </h1>
        <p className="text-sm text-slate-600">
          Official regulatory audits for water equity, non-revenue water (NRW) leak loss, workforce, and legal audit logs.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto">
        {/* Date Range Filter Pill */}
        <div className="flex items-center gap-1.5 bg-white px-3 py-2 rounded-control border border-slate-200 text-[0.8125rem] shadow-2xs">
          <Calendar className="w-3.5 h-3.5 text-slate-600 shrink-0" />
          <input
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="bg-transparent font-mono text-[0.8125rem] text-slate-700 outline-none cursor-pointer"
          />
          <span className="text-slate-300">→</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="bg-transparent font-mono text-[0.8125rem] text-slate-700 outline-none cursor-pointer"
          />
        </div>

        {/* Sync / Compact Live Firebase Telemetry to SQL */}
        <button
          type="button"
          onClick={onCompactNow}
          disabled={compacting}
          className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-control bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-[0.8125rem] font-semibold transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
          title="Compact live Firebase telemetry into MySQL hourly_summary now"
        >
          <Database className={`h-3.5 w-3.5 text-[#0369a1] ${compacting ? 'animate-bounce': ''}`} />
          <span>{compacting ? 'Syncing SQL...' : 'Sync Live Telemetry'}</span>
        </button>

        {/* Refresh Button */}
        <button
          type="button"
          onClick={onRefresh}
          className="p-2.5 rounded-control bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 transition-colors cursor-pointer shadow-2xs"
          title="Refresh Reports"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin': ''}`} />
        </button>

        {/* Export CSV Button */}
        <button
          type="button"
          onClick={onExport}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-control bg-[#0c4a6e] hover:bg-[#075985] text-white text-[0.8125rem] font-semibold shadow-xs transition-all active:scale-95 cursor-pointer"
        >
          <Download className="h-4 w-4 stroke-[2]" />
          <span>Export CSV</span>
        </button>
      </div>
    </div>
  );
}
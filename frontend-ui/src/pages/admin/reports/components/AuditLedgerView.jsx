import React, { useState, useMemo } from 'react';
import { ShieldCheck, Search, Lock } from 'lucide-react';

export default function AuditLedgerView({ logs = [] }) {
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');

  const uniqueActions = useMemo(() => {
    const set = new Set(logs.map((l) => l.action_taken).filter(Boolean));
    return ['ALL', ...Array.from(set)];
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((l) => {
      if (actionFilter !== 'ALL' && l.action_taken !== actionFilter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        l.action_taken?.toLowerCase().includes(q) ||
        l.performed_by_name?.toLowerCase().includes(q) ||
        l.remarks?.toLowerCase().includes(q) ||
        l.incident_id?.toLowerCase().includes(q) ||
        l.client_ip?.toLowerCase().includes(q)
      );
    });
  }, [logs, search, actionFilter]);

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      
      {/* INV-06 Legal Immutability Notice */}
      <div className="aq-surface rounded-card p-5 border border-line shadow-soft flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-control bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-900">
                Immutable Legal Audit Ledger (Table 3.12)
              </h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[0.8125rem] font-mono font-semibold bg-slate-900 text-white">
                <Lock className="w-2.5 h-2.5" /> INV-06 Protected
              </span>
            </div>
            <p className="text-[0.8125rem] text-slate-600 mt-0.5 leading-relaxed">
              Protected by MySQL <code className="font-mono text-slate-700">BEFORE UPDATE</code> and <code className="font-mono text-slate-700">BEFORE DELETE</code> triggers (<code className="font-mono text-slate-700">SQLSTATE 45000</code>). Records cannot be altered or erased.
            </p>
          </div>
        </div>

        <div className="text-right shrink-0">
          <span className="text-[0.8125rem] font-semibold text-slate-600 block">
            Logged Entries
          </span>
          <span className="text-2xl font-semibold font-mono text-slate-900">
            {filteredLogs.length}
          </span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-2.5 h-3.5 w-3.5 text-slate-600 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search actor, action, ticket UUID, or remarks..."
            className="w-full bg-white border border-slate-200 focus:border-slate-900 rounded-control pl-9 pr-4 py-2 text-[0.8125rem] text-slate-900 outline-none shadow-2xs"
          />
        </div>

        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="bg-white border border-slate-200 focus:border-slate-900 rounded-control px-3.5 py-2 text-[0.8125rem] font-mono text-slate-800 outline-none cursor-pointer shadow-2xs"
        >
          {uniqueActions.map((act) => (
            <option key={act} value={act}>
              {act === 'ALL' ? 'All Actions' : act}
            </option>
          ))}
        </select>
      </div>

      {/* Audit Log Table */}
      <div className="aq-surface rounded-card border border-line shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-black/[0.05] text-[0.8125rem] font-semibold text-slate-600 ">
                <th className="py-3 px-4 pl-6">Log ID</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Actor &amp; Role</th>
                <th className="py-3 px-4">Action Executed</th>
                <th className="py-3 px-4">Remarks / Context</th>
                <th className="py-3 px-4 pr-6 text-right">Client IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.03] text-[0.8125rem]">
              {filteredLogs.map((log) => (
                <tr key={log.log_id} className="hover:bg-black/[0.02] transition-colors">
                  <td className="py-3.5 px-4 pl-6 font-mono font-semibold text-slate-600">
                    #{log.log_id}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-600 whitespace-nowrap">
                    {log.logged_at}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-semibold text-slate-900 block">
                      {log.performed_by_name || `User #${log.performed_by}`}
                    </span>
                    <span className="text-[0.8125rem] font-mono text-slate-600">
                      {log.performed_by_role || 'system'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded font-mono text-[10.5px] font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                      {log.action_taken}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 max-w-md">
                    <span className="block truncate" title={log.remarks}>
                      {log.remarks || '—'}
                    </span>
                    {log.incident_id && (
                      <span className="text-[0.8125rem] font-mono text-[#0369a1] block mt-0.5">
                        Ticket: {log.incident_id}
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 pr-6 text-right font-mono text-slate-600">
                    {log.client_ip}
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-[0.8125rem] text-slate-600">
                    No audit records match your filter.
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
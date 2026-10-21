// frontend-ui/src/pages/admin/users/components/UserFilterBar.jsx
import React from 'react';
import { Search, X } from 'lucide-react';

export default function UserFilterBar({
  roleFilter,
  onRoleFilterChange,
  search,
  onSearchChange,
  counts
}) {
  const tabs = [
    { id: 'all', label: `All (${counts.total})` },
    { id: 'resident', label: `Residents (${counts.residents})` },
    { id: 'technician', label: `Plumbers (${counts.techs})` },
    { id: 'admin', label: `Admins (${counts.admins})` }
  ];

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      {/* Apple Recessed Segmented Role Picker */}
      <div className="inline-flex p-1 bg-slate-200/60 rounded-control border border-slate-300/40 select-none overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onRoleFilterChange(tab.id)}
            className={`px-3.5 py-1.5 rounded-lg text-[0.8125rem] transition-all cursor-pointer whitespace-nowrap ${
 roleFilter === tab.id
 ? 'bg-white text-slate-900 font-semibold shadow-[0_1px_2.5px_rgba(0,0,0,0.12)]'
 : 'text-slate-600 hover:text-[#1d1d1f] hover:bg-white/40 font-medium'
 }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Apple Search Pill */}
      <div className="relative w-full sm:w-72">
        <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-600 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search name, email, or meter ID..."
          className="w-full bg-white focus:bg-white text-[0.8125rem] text-slate-900 pl-8 pr-7 py-2 rounded-control border border-black/[0.08] focus:border-[#0369a1] outline-none transition-all placeholder:text-[#86868b] shadow-2xs"
        />
        {search && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="absolute right-2.5 top-2 p-0.5 rounded-full text-slate-600 hover:text-[#1d1d1f] cursor-pointer"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}
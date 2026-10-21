import React from 'react';

export default function ReportsTabBar({ activeTab, onChange }) {
  const tabs = [
    { id: 'equity', label: '1. Household Equity & Volume' },
    { id: 'leaks', label: '2. Non-Revenue Water (NRW) Audit' },
    { id: 'workforce', label: '3. Workforce Performance' },
    { id: 'audit', label: '4. Immutable Audit Ledger (INV-06)' }
  ];

  return (
    <div className="inline-flex p-1 bg-slate-200/60 rounded-control border border-slate-300/40 select-none overflow-x-auto max-w-full">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`px-4 py-2 rounded-lg text-[0.8125rem] transition-all cursor-pointer whitespace-nowrap ${
 activeTab === tab.id
 ? 'bg-white text-slate-900 font-semibold shadow-[0_1px_2.5px_rgba(0,0,0,0.12)]'
 : 'text-slate-600 hover:text-slate-900 hover:bg-white/40 font-medium'
 }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
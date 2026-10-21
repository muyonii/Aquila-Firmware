// frontend-ui/src/pages/admin/settings/components/SettingsSubNav.jsx
import React, { useState } from 'react';
import { Search, X } from 'lucide-react';

export default function SettingsSubNav({ registry, activeTabId, onSelectTab }) {
  const [search, setSearch] = useState('');
  const groups = registry.getGroups(search);

  return (
    <aside className="w-64 shrink-0 py-6 px-3.5 select-none flex flex-col justify-between h-full bg-slate-50">
      <div className="space-y-5">
        
        {/* macOS / Vercel Search Pill */}
        <div className="px-1">
          <div className="relative flex items-center">
            <Search className="absolute left-3 h-3.5 w-3.5 text-slate-600 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search settings..."
              className="w-full bg-slate-200/50 hover:bg-slate-200/70 focus:bg-white text-[13px] text-slate-900 pl-8 pr-7 py-1.5 rounded-lg outline-none border border-transparent focus:border-slate-300 focus:shadow-xs transition-all placeholder-slate-500"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 p-0.5 rounded-full text-slate-600 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* Categories List (Custom Scrollbar, No Ugly Windows Arrows) */}
        <nav className="space-y-5 overflow-y-auto max-h-[calc(100vh-140px)] pr-1.5 [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full">
          {groups.map(({ group, items }) => (
            <div key={group} className="space-y-1">
              {/* Group Header (Stripe/Apple tracked-out style) */}
              <div className="px-3 pb-1 text-[0.8125rem] font-semibold text-slate-600 tracking-[0.06em] ">
                {group}
              </div>

              {/* Text Rows (Vercel 34px Pill Style) */}
              <div className="space-y-0.5">
                {items.map((tab) => {
                  const isActive = activeTabId === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => onSelectTab(tab.id)}
                      className={`w-full flex items-center justify-between px-3 h-9 rounded-lg text-[13px] transition-all duration-150 cursor-pointer text-left ${
 isActive
 ? 'bg-slate-200/80 text-slate-900 font-semibold shadow-2xs'
 : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 font-normal'
 }`}
                    >
                      <span className="truncate">{tab.label}</span>
                      
                      {/* Subtle Active Indicator Dot (Optional subtle anchor) */}
                      {isActive && (
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-900 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {groups.length === 0 && (
            <div className="py-8 text-center text-[0.8125rem] text-slate-600">
              No matching settings found.
            </div>
          )}
        </nav>
      </div>
    </aside>
  );
}
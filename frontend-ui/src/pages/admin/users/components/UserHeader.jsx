// frontend-ui/src/pages/admin/users/components/UserHeader.jsx
import React from 'react';
import { Plus } from 'lucide-react';

export default function UserHeader({ onAddUserClick }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 flex items-center gap-2">
          <span className="text-slate-600 font-medium">Directory</span>
          <span className="text-slate-600 font-normal text-xl select-none">›</span>
          <span>Users</span>
        </h1>
        <p className="text-sm text-slate-600">
          Manage accounts, roles, and assigned household water meters.
        </p>
      </div>

      <button
        type="button"
        onClick={onAddUserClick}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-control bg-[#18181b] hover:bg-black text-white text-[0.8125rem] font-semibold shadow-xs transition-all active:scale-95 cursor-pointer self-start sm:self-auto"
      >
        <Plus className="h-4 w-4 stroke-[2.5]" />
        <span>Add New User</span>
      </button>
    </div>
  );
}
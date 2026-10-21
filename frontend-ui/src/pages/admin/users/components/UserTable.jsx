import React from 'react';
import { ChevronRight, Clock, CheckCircle2 } from 'lucide-react';

export default function UserTable({ users, selectedUserId, onSelectUser }) {
  const getRoleLabel = (role) => {
    switch (role) {
      case 'admin':
        return 'Administrator';
      case 'technician':
        return 'Field Plumber';
      case 'resident':
        return 'Resident';
      default:
        return role;
    }
  };

  return (
    <div className="aq-surface rounded-card border border-line shadow-soft overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-black/[0.05] text-[0.8125rem] font-semibold text-slate-600 ">
              <th className="py-3 px-4 pl-6">User Profile</th>
              <th className="py-3 px-4">Role</th>
              <th className="py-3 px-4">Meter Assignment</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 pr-6 text-right">Dossier</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/[0.03]">
            {users.map((u) => {
              const isSelected = selectedUserId === u.user_id;
              const isPending = u.role === 'resident' && u.approval_status === 'PENDING';
              const isInactive = Number(u.is_active) === 0;
              const initials = u.full_name
                ? u.full_name
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()
                : 'U';

              return (
                <tr
                  key={u.user_id}
                  onClick={() => onSelectUser(u)}
                  className={`group transition-colors duration-150 cursor-pointer ${
 isSelected ? 'bg-sky-50/70': 'hover:bg-black/[0.02]'
 }`}
                >
                  {/* User Profile */}
                  <td className="py-3.5 px-4 pl-6">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-slate-900 text-white font-semibold text-[0.8125rem] flex items-center justify-center shrink-0 aspect-square shadow-2xs">
                        {initials}
                      </div>
                      <div className="overflow-hidden">
                        <span className="font-semibold text-[0.8125rem] text-slate-900 block truncate">
                          {u.full_name}
                        </span>
                        <span className="text-[0.8125rem] text-slate-600 font-mono block truncate">
                          {u.email}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Role Pill */}
                  <td className="py-3.5 px-4">
                    <span className="px-2.5 py-0.5 rounded-md text-[10.5px] font-medium bg-black/[0.04] text-slate-700 border border-black/[0.06]">
                      {getRoleLabel(u.role)}
                    </span>
                  </td>

                  {/* Meter Assignment */}
                  <td className="py-3.5 px-4 text-[0.8125rem]">
                    {u.role === 'resident' ? (
                      u.assigned_node_id ? (
                        <div className="flex items-center gap-1.5 font-mono text-[0.8125rem] text-slate-800">
                          <span className="font-semibold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                            {u.assigned_node_id}
                          </span>
                          <span className="text-slate-600 truncate max-w-[160px]">
                            {u.household_label || 'Linked Meter'}
                          </span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10.5px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                          Unassigned
                        </span>
                      )
                    ) : (
                      <span className="text-slate-600 text-[0.8125rem] font-medium">
                        Global Cluster Access
                      </span>
                    )}
                  </td>

                  {/* Account & Meter Approval Status */}
                  <td className="py-3.5 px-4 text-[0.8125rem]">
                    {isInactive ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                        Suspended
                      </span>
                    ) : isPending ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                        <Clock className="w-3 h-3" /> Pending Approval
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" /> Active
                      </span>
                    )}
                  </td>

                  {/* Inspect Link */}
                  <td className="py-3.5 px-4 pr-6 text-right">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectUser(u);
                      }}
                      className="inline-flex items-center gap-1 text-[0.8125rem] text-slate-600 group-hover:text-slate-900 font-medium transition-colors cursor-pointer"
                    >
                      <span>Inspect</span>
                      <ChevronRight className="h-3 w-3 stroke-[2] text-slate-600 group-hover:text-slate-800" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {users.length === 0 && (
          <div className="py-12 text-center text-[0.8125rem] text-slate-600">
            No accounts match the current filter or search criteria.
          </div>
        )}
      </div>
    </div>
  );
}
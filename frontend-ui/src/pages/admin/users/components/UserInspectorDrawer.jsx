import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Droplets,
  Wrench,
  KeyRound,
  Trash2,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Save
} from 'lucide-react';
import { useTelemetryStore } from '../../../../stores/useTelemetryStore';

export default function UserInspectorDrawer({
  user,
  nodes = [],
  adminCount,
  onClose,
  onUpdateUser,
  onApproveMeter,
  onResetPassword,
  onDeleteUser
}) {
  const [role, setRole] = useState(user?.role || 'resident');
  const [assignedNodeId, setAssignedNodeId] = useState(user?.assigned_node_id || 'NODE-B1-001');
  const [isActive, setIsActive] = useState(Boolean(user?.is_active ?? true));
  const [saving, setSaving] = useState(false);

  // Pull live Firebase telemetry for the resident's assigned node
  const nodeState = useTelemetryStore((state) =>
    user?.assigned_node_id ? state.getNode(user.assigned_node_id) : null
  );

  useEffect(() => {
    if (user) {
      setRole(user.role || 'resident');
      setAssignedNodeId(user.assigned_node_id || nodes[0]?.node_id || 'NODE-B1-001');
      setIsActive(Boolean(user.is_active ?? true));
    }
  }, [user, nodes]);

  if (!user) return null;

  const liveFlow = Number(nodeState?.telemetry?.flow_rate_lpm ?? 0).toFixed(2);
  const liveOdometer = Number(nodeState?.telemetry?.cumulative_liters ?? 0).toFixed(1);
  const liveM3 = (Number(liveOdometer) / 1000).toFixed(3);
  const isDisadvantaged = Boolean(nodeState?.fairness?.is_disadvantaged);

  const initials = user.full_name
    ? user.full_name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'U';

  const formatRole = (r) => {
    switch (r) {
      case 'admin':
        return 'Administrator';
      case 'technician':
        return 'Field Technician';
      case 'resident':
        return 'Resident Consumer';
      default:
        return r;
    }
  };

  const handleSaveChanges = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onUpdateUser(user.user_id, {
        role,
        assigned_node_id: role === 'resident' ? assignedNodeId : null,
        is_active: isActive
      });
    } finally {
      setSaving(false);
    }
  };

  const drawerContent = (
    <aside
      className="fixed inset-y-0 top-0 bottom-0 right-0 h-[100dvh] w-full sm:w-[420px] z-[100] m-0 rounded-none rounded-l-2xl bg-white border-l border-line shadow-[-16px_0_48px_-8px_rgba(0,0,0,0.12)] px-6 pt-5 pb-6 overflow-y-auto flex flex-col justify-between select-none animate-in slide-in-from-right duration-200 font-sans"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="space-y-5">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-1 border-b border-black/[0.05]">
          <span className="text-[0.8125rem] font-mono font-semibold text-slate-600 ">
            User Dossier &amp; Governance
          </span>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-black/[0.05] text-slate-600 hover:text-slate-800 transition-colors cursor-pointer"
            title="Close (Esc)"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* User Identity Hero */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-slate-900 text-white font-semibold text-base flex items-center justify-center shrink-0 aspect-square shadow-sm">
            {initials}
          </div>
          <div className="overflow-hidden">
            <h3 className="text-base font-semibold text-slate-900 truncate leading-tight">
              {user.full_name}
            </h3>
            <p className="text-[0.8125rem] text-slate-600 font-mono truncate mt-0.5">
              {user.email}
            </p>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="px-2.5 py-0.5 rounded-md text-[10.5px] font-medium bg-black/[0.04] text-slate-700 border border-black/[0.06]">
                {formatRole(user.role)}
              </span>
              {user.approval_status === 'PENDING' && (
                <span className="px-2 py-0.5 rounded-md text-[0.8125rem] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                  Pending Meter Approval
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Pending Approval Banner (RA 10173 One-Click Approve/Reject) */}
        {user.role === 'resident' && user.approval_status === 'PENDING' && (
          <div className="p-4 bg-amber-50/90 border border-amber-200 rounded-card space-y-3">
            <div>
              <span className="text-[0.8125rem] font-semibold text-amber-900 block">
                Meter Binding Approval Required
              </span>
              <p className="text-[0.8125rem] text-amber-800 mt-0.5 leading-relaxed">
                This resident requested access to meter <strong className="font-mono">{user.assigned_node_id}</strong> without a Bill PIN. Approve to unlock their portal under RA 10173.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onApproveMeter(user.user_id, 'approve')}
                className="flex-1 py-2 rounded-control bg-emerald-600 hover:bg-emerald-700 text-white text-[0.8125rem] font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Approve Meter</span>
              </button>
              <button
                type="button"
                onClick={() => onApproveMeter(user.user_id, 'reject')}
                className="px-3 py-2 rounded-control bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 text-[0.8125rem] font-semibold flex items-center justify-center gap-1 cursor-pointer"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Reject</span>
              </button>
            </div>
          </div>
        )}

        {/* Role & Meter Assignment Editor (PUT /api/v1/users/{id}) */}
        <form
          onSubmit={handleSaveChanges}
          className="bg-canvas rounded-card p-4 border border-slate-200/80 space-y-3 text-[0.8125rem]"
        >
          <span className="text-[10.5px] font-semibold text-slate-600 block">
            Role &amp; Meter Assignment
          </span>

          <div className="space-y-1">
            <label className="font-semibold text-slate-700 block">System Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full bg-white border border-slate-200 focus:border-slate-900 rounded-control px-3 py-2 text-[0.8125rem] text-slate-900 outline-none cursor-pointer"
            >
              <option value="resident">Resident Consumer (Tenant Isolated)</option>
              <option value="technician">Field Technician (Plumber)</option>
              <option value="admin">System Administrator</option>
            </select>
          </div>

          {role === 'resident' && (
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 block">
                Assigned Water Meter (RA 10173)
              </label>
              <select
                value={assignedNodeId}
                onChange={(e) => setAssignedNodeId(e.target.value)}
                className="w-full bg-white border border-slate-200 focus:border-slate-900 rounded-control px-3 py-2 text-[0.8125rem] font-mono text-slate-900 outline-none cursor-pointer"
              >
                {nodes.map((n) => (
                  <option key={n.node_id} value={n.node_id}>
                    {n.node_id} — {n.household_label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-slate-900 accent-slate-900 cursor-pointer"
              />
              <span className="text-[0.8125rem] font-medium text-slate-700">Account Active</span>
            </label>

            <button
              type="submit"
              disabled={saving}
              className="px-3.5 py-1.5 rounded-control bg-[#0c4a6e] hover:bg-[#075985] text-white text-[0.8125rem] font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-2xs"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>

        {/* Live Telemetry Preview for Resident */}
        {user.role === 'resident' && (
          <div className="aq-surface rounded-card p-4 border border-slate-200/70 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[0.8125rem] font-semibold text-slate-800 flex items-center gap-1.5">
                <Droplets className="h-3.5 w-3.5 text-[#0369a1]" />
                <span>Live Meter Telemetry</span>
              </span>
              <span className="text-[0.8125rem] text-emerald-700 font-mono bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                Firebase RTDB
              </span>
            </div>

            <div className="space-y-2 text-[0.8125rem] pt-1">
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Meter Node</span>
                <span className="font-mono font-semibold text-slate-900">
                  {user.assigned_node_id || 'Unassigned'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Instantaneous Flow</span>
                <span className="font-mono font-semibold text-[#0369a1]">{liveFlow} L/min</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Cumulative Odometer</span>
                <span className="font-mono text-slate-800">
                  {liveOdometer} L ({liveM3} m³)
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Fairness Status</span>
                <span
                  className={`font-semibold ${
 isDisadvantaged ? 'text-amber-600': 'text-emerald-700'
 }`}
                >
                  {isDisadvantaged ? 'Deficit Warning' : 'Equitable Share'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Security & Danger Zone Actions */}
        <div className="aq-surface rounded-card p-4 border border-slate-200/70 space-y-1">
          <span className="text-[10.5px] font-semibold text-slate-600 block px-1 pb-1">
            Security Actions
          </span>

          <button
            type="button"
            onClick={() => onResetPassword(user.user_id)}
            className="w-full flex items-center justify-between p-2.5 rounded-control hover:bg-black/[0.03] text-[0.8125rem] text-slate-700 transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-2.5">
              <KeyRound className="h-3.5 w-3.5 text-slate-600" />
              <span>Reset password to default (Password123!)</span>
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
          </button>

          <button
            type="button"
            onClick={() => onDeleteUser(user.user_id, user.role)}
            disabled={user.role === 'admin' && adminCount <= 1}
            className="w-full flex items-center justify-between p-2.5 rounded-control hover:bg-rose-50/60 text-[0.8125rem] text-slate-600 hover:text-rose-600 transition-colors cursor-pointer text-left disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-2.5">
              <Trash2 className="h-3.5 w-3.5 text-slate-600" />
              <span>Delete account</span>
            </div>
            <span className="text-[0.8125rem] text-slate-600">
              {user.role === 'admin' && adminCount <= 1 ? 'Sole Admin Protected' : 'Permanent'}
            </span>
          </button>
        </div>

      </div>

      {/* Footer */}
      <div className="pt-4 text-[0.8125rem] text-slate-600 font-mono text-center border-t border-black/[0.05]">
        Registered {user.created_at?.slice(0, 10) || '2026-09-01'}
      </div>
    </aside>
  );

  return typeof document !== 'undefined'
    ? createPortal(drawerContent, document.body)
    : drawerContent;
}
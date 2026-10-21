import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';
import { ShieldAlert, Clock, LogOut } from 'lucide-react';

/**
 * ProtectedRoute Component
 * Enforces authentication, 3-tier RBAC, and RA 10173 resident approval binding.
 * @param {Array<string>} allowedRoles - Optional list of permitted roles ['admin', 'technician', 'resident']
 */
export default function ProtectedRoute({ allowedRoles = [] }) {
  const { isAuthenticated, user, logout } = useAuthStore();

  // 1. Not Authenticated -> Redirect to Login
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // 2. Role-Based Access Control (RBAC) Check
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    // Smart redirect based on their actual role
    if (user.role === 'admin') return <Navigate to="/dashboard" replace />;
    if (user.role === 'technician') return <Navigate to="/tasks" replace />;
    if (user.role === 'resident') return <Navigate to="/usage" replace />;
    return <Navigate to="/login" replace />;
  }

  // 3. Resident Approval & Meter Binding Guard (RA 10173 Compliance)
  if (user.role === 'resident' && user.approval_status !== 'APPROVED') {
    return (
      <div className="min-h-screen bg-[#f4f5f8] flex items-center justify-center p-6 font-sans select-none">
        <div className="max-w-md w-full bg-white/90 backdrop-blur-xl rounded-3xl p-8 shadow-[0_24px_64px_-12px_rgba(0,0,0,0.12)] border border-white/90 text-center space-y-6">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center mx-auto shadow-xs">
            <Clock className="w-7 h-7 animate-pulse" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Meter Assignment Pending</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Hello <strong className="text-slate-800">{user.full_name}</strong>, your resident account has been verified via OTP, but your household water meter (<strong className="text-slate-800 font-mono">{user.assigned_node_id || 'Unassigned'}</strong>) is currently awaiting BAWASA Administrator approval.
            </p>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/70 text-xs text-slate-600 space-y-1 text-left">
            <strong className="block font-bold text-slate-800">RA 10173 Privacy Notice:</strong>
            <p className="text-[11px] text-slate-500">
              To protect community water distribution records, consumption telemetry is strictly restricted to verified property occupants.
            </p>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => logout()}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out & Return Later</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // All checks passed -> Render child layout or page
  return <Outlet />;
}
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';
import { useTaskStore } from '../../stores/useTaskStore';
import { useTelemetryStore } from '../../stores/useTelemetryStore';
import PasswordCard from '../../components/portal/PasswordCard';
import {
  Card,
  IconTile,
  LivePill,
  StatTile,
  initials
} from '../../components/portal/ui';
import { Power, LogOut, Smartphone } from 'lucide-react';

export default function ProfilePage() {
  const { user, logout } = useAuthStore();
  const { isOnDuty, toggleDutyStatus, tasks } = useTaskStore();
  const isConnected = useTelemetryStore((state) => state.isConnected);
  const navigate = useNavigate();

  const activeTasksCount = tasks.filter(
    (t) => t.status === 'DISPATCHED' || t.status === 'REPAIR_FAILED'
  ).length;
  const verifyingCount = tasks.filter(
    (t) => t.status === 'PENDING_VERIFICATION'
  ).length;
  const completedCount = tasks.filter(
    (t) => t.status === 'CLOSED_VERIFIED'
  ).length;

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* 1. Identity Card */}
      <Card className="p-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-14 h-14 rounded-card bg-slate-900 text-white flex items-center justify-center font-semibold text-lg shrink-0 ring-2 ring-white/90">
            {initials(user?.full_name)}
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-slate-900 leading-tight truncate">
              {user?.full_name}
            </h1>
            <p className="text-[0.8125rem] text-slate-600 truncate">{user?.email}</p>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="text-[0.8125rem] font-mono font-semibold text-amber-800 bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded-md ">
                Field Technician
              </span>
              <span className="text-[0.8125rem] text-slate-600 font-mono">
                ID #{user?.user_id}
              </span>
              {user?.phone_number && (
                <span className="inline-flex items-center gap-1 text-[0.8125rem] font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                  <Smartphone className="w-3 h-3" /> {user.phone_number}
                </span>
              )}
            </div>
          </div>
        </div>
        <LivePill connected={isConnected} />
      </Card>

      {/* 2. Duty Status */}
      <Card
        className={`p-5 ${
 isOnDuty ? '!bg-emerald-50/70 !border-emerald-200': ''
 }`}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <IconTile icon={Power} tone={isOnDuty ? 'emerald' : 'slate'} />
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-slate-900">
                {isOnDuty ? 'You are on duty' : 'You are off duty'}
              </h3>
              <p className="text-[0.8125rem] text-slate-600 mt-0.5">
                {isOnDuty
                  ? 'Ready to receive emergency dispatches & SMS work orders.'
                  : 'Emergency dispatches will not alert your device.'}
              </p>
            </div>
          </div>

          <button
            onClick={toggleDutyStatus}
            role="switch"
            aria-checked={isOnDuty}
            aria-label="Toggle duty status"
            className={`relative w-14 h-8 rounded-full shrink-0 transition cursor-pointer ${
 isOnDuty ? 'bg-emerald-500': 'bg-slate-300'
 }`}
          >
            <span
              className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow transition-all ${
 isOnDuty ? 'left-7': 'left-1'
 }`}
            />
          </button>
        </div>
      </Card>

      {/* 3. Shift Workload Snapshot (3 Tiles) */}
      <div className="grid grid-cols-3 gap-3">
        <StatTile label="To Do" value={activeTasksCount} hint="Assigned" />
        <StatTile
          label="Verifying"
          value={verifyingCount}
          hint="15m check"
          tone="sky"
        />
        <StatTile
          label="Completed"
          value={completedCount}
          hint="Verified closed"
          tone="emerald"
        />
      </div>

      {/* 4. Password Card */}
      <PasswordCard />

      {/* 5. Sign Out */}
      <button
        onClick={handleLogout}
        className="w-full min-h-[48px] aq-surface hover:bg-rose-50 text-rose-600 font-semibold text-sm rounded-card border border-slate-200 hover:border-rose-200 transition flex items-center justify-center gap-2 cursor-pointer"
      >
        <LogOut className="w-4 h-4" />
        <span>Sign out</span>
      </button>
    </div>
  );
}
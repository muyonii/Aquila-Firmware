import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';
import { useTelemetryStore } from '../stores/useTelemetryStore';
import { rtdbSubscription } from '../firebase/rtdb_subscription';
import { Droplet, AlertCircle, History, User, LogOut } from 'lucide-react';
import { AmbientWash, Brand, initials } from '../components/portal/ui';

const NAV_ITEMS = [
  { name: 'Water Usage', short: 'Usage', path: '/usage', icon: Droplet },
  { name: 'Report Issue', short: 'Report', path: '/my-reports', icon: AlertCircle },
  { name: 'History', short: 'History', path: '/history', icon: History },
  { name: 'Settings', short: 'Account', path: '/account', icon: User }
];

export default function ResidentLayout() {
  const { user, logout } = useAuthStore();
  const isConnected = useTelemetryStore((state) => state.isConnected);
  const getNode = useTelemetryStore((state) => state.getNode);
  const navigate = useNavigate();

  const assignedNode = user?.assigned_node_id;

  // 1-second clock to evaluate 45s meter liveness accurately
  const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const timer = setInterval(
      () => setNowSec(Math.floor(Date.now() / 1000)),
      1000
    );
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (assignedNode) {
      rtdbSubscription.subscribeConnectionStatus();
      rtdbSubscription.subscribeResidentNode(assignedNode);
      rtdbSubscription.subscribeBlackboardHypotheses();
    }
    return () => {
      rtdbSubscription.unsubscribeAll();
    };
  }, [assignedNode]);

  const nodeState = getNode(assignedNode);
  const rawTs = Number(nodeState?.telemetry?.timestamp || 0);
  const ts = rawTs > 1e11 ? Math.floor(rawTs / 1000) : rawTs;
  const isMeterStreaming = ts > 0 && Math.max(0, nowSec - ts) <= 45;

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen flex flex-col bg-canvas text-slate-800 font-sans relative">
      <AmbientWash />

      {/* Top bar */}
      <header className="h-16 bg-white border-b border-line px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40">
        <Brand
          suffix={
            <span className="hidden sm:inline text-[0.8125rem] font-semibold text-slate-600 bg-white border border-line rounded-full px-2.5 py-0.5">
              Resident
            </span>
          }
        />

        {/* Desktop navigation */}
        <nav className="hidden md:flex items-center gap-1" aria-label="Primary">
          {NAV_ITEMS.map(({ name, path, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3.5 py-2 rounded-full text-[0.9375rem] font-medium transition-colors focus-visible:ring-2 focus-visible:ring-[#0c4a6e] ${
 isActive
 ? 'bg-[#e6f0f6] text-ink font-semibold'
 : 'text-slate-700 hover:text-ink hover:bg-[#eef4f8]'
 }`
              }
            >
              <Icon className="w-[18px] h-[18px] stroke-[1.75]" />
              <span>{name}</span>
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2.5">
          {/* Meter Stream Status — dot + label */}
          <span
            className="inline-flex items-center gap-1.5 text-sm font-semibold"
            title={
              isMeterStreaming
                ? `Meter ${assignedNode} is actively streaming`
                : `Meter ${assignedNode} has no packet in the last 45s`
            }
          >
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
 isMeterStreaming ? 'bg-emerald-600': isConnected ? 'bg-slate-400': 'bg-rose-600'
 }`}
            />
            <span className={isMeterStreaming ? 'text-emerald-700' : isConnected ? 'text-slate-600' : 'text-rose-700'}>
              {isMeterStreaming ? 'Meter Live' : isConnected ? 'Meter Idle' : 'Offline'}
            </span>
          </span>

          <div
            className="hidden sm:flex w-9 h-9 rounded-full bg-white border border-line text-ink font-semibold text-[0.8125rem] items-center justify-center"
            title={user?.full_name}
          >
            {initials(user?.full_name)}
          </div>
          <button
            onClick={handleLogout}
            title="Sign out"
            aria-label="Sign out"
            className="p-2 rounded-control text-slate-600 hover:text-rose-700 hover:bg-[#eef4f8] transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-rose-600"
          >
            <LogOut className="w-[18px] h-[18px] stroke-[1.75]" />
          </button>
        </div>
      </header>

      {/* Page content */}
      <main className="relative z-10 flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 pb-28 md:pb-8">
        <Outlet />
      </main>

      {/* Mobile bottom navigation */}
      <nav
        aria-label="Primary"
        className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white border-t border-line rounded-t-card shadow-soft pb-[env(safe-area-inset-bottom)]"
      >
        <div className="h-16 grid grid-cols-4">
          {NAV_ITEMS.map(({ short, path, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              className="flex flex-col items-center justify-center gap-1 focus-visible:outline-none"
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`w-12 h-7 rounded-full flex items-center justify-center transition-colors ${
 isActive ? 'bg-[#0c4a6e] text-white': 'text-slate-600'
 }`}
                  >
                    <Icon className="w-[18px] h-[18px] stroke-[1.75]" />
                  </span>
                  <span
                    className={`text-[0.8125rem] ${
 isActive
 ? 'font-semibold text-[#0c4a6e]'
 : 'font-medium text-slate-600'
 }`}
                  >
                    {short}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
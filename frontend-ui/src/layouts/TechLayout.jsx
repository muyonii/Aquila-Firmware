import React, { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';
import { useTaskStore } from '../stores/useTaskStore';
import { rtdbSubscription } from '../firebase/rtdb_subscription';
import { notificationApi } from '../api/notification_api';
import { Wrench, MapPin, User, LogOut, Bell, CheckCheck } from 'lucide-react';
import { AmbientWash, Brand, initials } from '../components/portal/ui';

const NAV_ITEMS = [
  { to: '/tasks', label: 'My Tasks', icon: Wrench, hasCount: true },
  { to: '/map', label: 'Field Map', icon: MapPin },
  { to: '/profile', label: 'Profile', icon: User }
];

export default function TechLayout() {
  const { user, logout } = useAuthStore();
  const { tasks, fetchMyTasks, isOnDuty, toggleDutyStatus } = useTaskStore();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef(null);

  // Subscribe to Firebase RTDB + Poll tasks & dispatch notifications
  const loadNotifications = async () => {
    try {
      const res = await notificationApi.getNotifications(false);
      if (res?.success && res.data) {
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unread_count || 0);
      }
    } catch {}
  };

  useEffect(() => {
    rtdbSubscription.subscribeConnectionStatus();
    rtdbSubscription.subscribeAllNodes();
    rtdbSubscription.subscribeBlackboardHypotheses();
    fetchMyTasks().catch(() => {});
    loadNotifications();

    const interval = setInterval(() => {
      fetchMyTasks().catch(() => {});
      loadNotifications();
    }, 15000);

    return () => {
      clearInterval(interval);
      rtdbSubscription.unsubscribeAll();
    };
  }, [fetchMyTasks]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) {
        setBellOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotifClick = async (n) => {
    if (!n.is_read) {
      try {
        await notificationApi.markAsRead(n.notification_id);
        loadNotifications();
      } catch {}
    }
    setBellOpen(false);
    if (n.incident_id) {
      navigate(`/tasks/${n.incident_id}`);
    } else {
      navigate('/tasks');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      loadNotifications();
    } catch {}
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const actionableCount = tasks.filter(
    (t) => t.status === 'DISPATCHED' || t.status === 'REPAIR_FAILED'
  ).length;
  const isMapRoute = pathname.startsWith('/map');

  return (
    <div className="min-h-screen flex flex-col bg-canvas text-slate-800 font-sans relative">
      {!isMapRoute && <AmbientWash />}

      {/* Top bar */}
      <header className="h-16 bg-white border-b border-line px-4 flex items-center justify-between sticky top-0 z-40">
        <Brand
          suffix={
            <span className="hidden sm:inline text-[0.8125rem] font-semibold text-slate-600 bg-white border border-line rounded-full px-2.5 py-0.5">
              Field
            </span>
          }
        />

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1" aria-label="Primary">
          {NAV_ITEMS.map(({ to, label, icon: Icon, hasCount }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3.5 py-2 rounded-full text-[0.9375rem] font-medium transition-colors focus-visible:ring-2 focus-visible:ring-[#0c4a6e] ${
 isActive
 ? 'bg-[#e6f0f6] text-ink font-semibold'
 : 'text-slate-700 hover:text-ink hover:bg-[#eef4f8]'
 }`
              }
            >
              <Icon className="w-[18px] h-[18px] stroke-[1.75]" />
              <span>{label}</span>
              {hasCount && actionableCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-rose-600 shrink-0" />
              )}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleDutyStatus}
            title="Click to toggle On/Off duty status"
            className={`inline-flex items-center gap-2 h-9 px-3.5 rounded-full border text-sm font-semibold transition cursor-pointer focus-visible:ring-2 focus-visible:ring-[#0c4a6e] ${
 isOnDuty
 ? 'bg-white text-emerald-700 border-emerald-500 hover:bg-emerald-50'
 : 'bg-white text-slate-700 border-line hover:bg-[#f4f8fb]'
 }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
 isOnDuty ? 'bg-emerald-600': 'bg-slate-500'
 }`}
            />
            {isOnDuty ? 'On duty' : 'Off duty'}
          </button>

          {/* Technician Dispatch Notification Bell */}
          <div className="relative" ref={bellRef}>
            <button
              type="button"
              onClick={() => setBellOpen(!bellOpen)}
              className="aq-icon !rounded-full relative hover:bg-[#f4f8fb] transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[#0c4a6e]"
              title="Dispatch Notifications"
            >
              <Bell className="w-[18px] h-[18px] stroke-[1.75]" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-rose-600 ring-2 ring-white" />
              )}
            </button>

            {bellOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-card border border-line shadow-soft z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-line flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-900">
                    Dispatch Alerts ({unreadCount})
                  </span>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={handleMarkAllRead}
                      className="text-[0.8125rem] font-semibold text-[#0c4a6e] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <CheckCheck className="w-3.5 h-3.5" /> Read all
                    </button>
                  )}
                </div>
                <div className="max-h-72 overflow-y-auto divide-y divide-line">
                  {notifications.length === 0 ? (
                    <div className="py-6 text-center text-[0.8125rem] text-slate-600">
                      No dispatch alerts yet.
                    </div>
                  ) : (
                    notifications.slice(0, 10).map((n) => (
                      <button
                        key={n.notification_id}
                        type="button"
                        onClick={() => handleNotifClick(n)}
                        className={`w-full p-3 text-left hover:bg-slate-50 transition-colors cursor-pointer ${
 !n.is_read ? 'bg-[#eef4f8]': ''
 }`}
                      >
                        <div className="text-sm font-semibold text-slate-900 truncate">
                          {n.title}
                        </div>
                        <p className="text-sm text-slate-600 line-clamp-2 mt-0.5">
                          {n.message}
                        </p>
                        <span className="text-[0.8125rem] font-mono text-slate-600 mt-1 block">
                          {n.created_at}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

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
      <main
        className={`relative z-10 flex-1 w-full ${
 isMapRoute ? '': 'p-4 pb-28 md:pb-10'
 }`}
      >
        <Outlet />
      </main>

      {/* Mobile bottom tab bar */}
      <nav
        aria-label="Primary"
        className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white border-t border-line rounded-t-card shadow-soft pb-[env(safe-area-inset-bottom)]"
      >
        <div className="h-16 grid grid-cols-3 max-w-2xl mx-auto">
          {NAV_ITEMS.map(({ to, label, icon: Icon, hasCount }) => (
            <NavLink
              key={to}
              to={to}
              className="flex flex-col items-center justify-center gap-1 focus-visible:outline-none"
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`relative w-14 h-7 rounded-full flex items-center justify-center transition-colors ${
 isActive ? 'bg-[#0c4a6e] text-white': 'text-slate-600'
 }`}
                  >
                    <Icon className="w-[18px] h-[18px] stroke-[1.75]" />
                    {hasCount && actionableCount > 0 && (
                      <span className="absolute -top-1 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-700 text-white text-[0.8125rem] font-semibold flex items-center justify-center ring-2 ring-white">
                        {actionableCount}
                      </span>
                    )}
                  </span>
                  <span
                    className={`text-[0.8125rem] ${
 isActive
 ? 'font-semibold text-[#0c4a6e]'
 : 'font-medium text-slate-600'
 }`}
                  >
                    {label}
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
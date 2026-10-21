import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, AlertTriangle, Wrench, Info, ShieldAlert } from 'lucide-react';
import { notificationApi } from '../../../../api/notification_api';
import { useTelemetryStore } from '../../../../stores/useTelemetryStore';
import { useSettings } from '../../settings/core/SettingsManager';

export default function DashboardHeader({ user }) {
  const navigate = useNavigate();
  const prefs = useSettings();
  const isConnected = useTelemetryStore((state) => state.isConnected);

  const [currentTime, setCurrentTime] = useState(new Date());
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef(null);

  // Live Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Poll System Notifications (Table 3.13)
  const loadNotifications = async () => {
    try {
      const res = await notificationApi.getNotifications(false);
      if (res?.success && res.data) {
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unread_count || 0);
      }
    } catch {
      // Non-blocking if offline
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

  // Close popover on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) {
        setBellOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkRead = async (notif) => {
    if (!notif.is_read) {
      try {
        await notificationApi.markAsRead(notif.notification_id);
        loadNotifications();
      } catch {}
    }
    setBellOpen(false);
    if (notif.incident_id) {
      navigate('/incidents');
    } else if (notif.title?.includes('APPROVAL')) {
      navigate('/users');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      loadNotifications();
    } catch {}
  };

  const adminName = user?.first_name || user?.full_name?.split(' ')[0] || 'System Admin';
  const hour = currentTime.getHours();
    const greeting =
      prefs.language === 'fil'
        ? hour < 12
          ? 'Magandang umaga'
          : hour < 18
          ? 'Magandang hapon'
          : 'Magandang gabi'
        : hour < 12
        ? 'Good morning'
        : hour < 18
        ? 'Good afternoon'
        : 'Good evening';

  const formattedDate =
    currentTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
    ', ' +
    currentTime.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: prefs.clockFormat !== '24h'
    });

  const getNotifIcon = (type) => {
    if (type?.includes('BURST') || type?.includes('FAILED')) {
      return <ShieldAlert className="w-4 h-4 text-rose-700 shrink-0 mt-0.5 stroke-[1.75]" />;
    }
    if (type?.includes('DISPATCH')) {
      return <Wrench className="w-4 h-4 text-slate-600 shrink-0 mt-0.5 stroke-[1.75]" />;
    }
    if (type?.includes('EQUITY') || type?.includes('FAULT')) {
      return <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5 stroke-[1.75]" />;
    }
    return <Info className="w-4 h-4 text-slate-600 shrink-0 mt-0.5 stroke-[1.75]" />;
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      {/* Left: greeting + title */}
      <div>
        <p className="text-sm text-slate-600">
          {greeting}, {adminName}
        </p>
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Dashboard</h1>
      </div>

      {/* Right: status chip + bell */}
      <div className="flex items-center gap-3">
        <span className="aq-chip cursor-default">
          <span className="aq-dot" style={{ background: isConnected ? '#0f766e' : '#b45309' }} aria-hidden="true" />
          <span>{isConnected ? 'Online' : 'Connecting'}</span>
          <span className="text-slate-600">· 15s pulse · {formattedDate}</span>
        </span>

        <div className="relative" ref={bellRef}>
          <button
            type="button"
            onClick={() => setBellOpen(!bellOpen)}
            className="aq-icon !rounded-full hover:bg-[#f4f8fb] transition-colors cursor-pointer relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0c4a6e]"
            title="System Notifications"
            aria-label="System Notifications"
          >
            <Bell className="w-[18px] h-[18px] stroke-[1.75]" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-rose-600 border-2 border-white" />
            )}
          </button>

          {bellOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-card border border-line shadow-soft z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-line flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-900">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="text-[0.8125rem] text-slate-600">
                      ({unreadCount} unread)
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="text-[0.8125rem] font-semibold text-[#0c4a6e] hover:underline cursor-pointer"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-line">
                {notifications.length === 0 ? (
                  <div className="py-8 px-4 text-center text-sm text-slate-600">
                    No system notifications.
                  </div>
                ) : (
                  notifications.slice(0, 12).map((n) => (
                    <button
                      key={n.notification_id}
                      type="button"
                      onClick={() => handleMarkRead(n)}
                      className={`w-full p-3.5 text-left flex items-start gap-3 hover:bg-slate-50 transition-colors cursor-pointer ${
                        !n.is_read ? 'bg-slate-50' : ''
                      }`}
                    >
                      {getNotifIcon(n.notification_type)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-sm truncate ${!n.is_read ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>
                            {n.title}
                          </span>
                          {!n.is_read && <span className="w-1.5 h-1.5 rounded-full bg-[#0c4a6e] shrink-0" />}
                        </div>
                        <p className="text-[0.8125rem] text-slate-600 line-clamp-2 mt-0.5 leading-relaxed">
                          {n.message}
                        </p>
                        <span className="text-[0.8125rem] text-slate-600 mt-1 block">
                          {n.created_at}
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
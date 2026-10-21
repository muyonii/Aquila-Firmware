// frontend-ui/src/layouts/AdminLayout.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  AlertTriangle,
  Network,
  BarChart3,
  Users,
  Settings,
  LogOut,
  PanelLeft,
  Activity,
  Droplets
} from 'lucide-react';
import { useAuthStore } from '../stores/useAuthStore';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/incidents', label: 'Incidents', icon: AlertTriangle, hasBadge: true },
  { to: '/network-map', label: 'Network Map', icon: Network },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/users', label: 'Users', icon: Users },
  { to: '/inspector', label: 'System Inspector', icon: Activity },
];

const FOOTER_NAV = [{ to: '/settings', label: 'Settings', icon: Settings }];

const navClass = (isExpanded) => ({ isActive }) =>
  `group flex items-center gap-3 rounded-control px-3 py-2.5 text-[0.9375rem] transition-colors focus-visible:ring-2 focus-visible:ring-[#0c4a6e] focus-visible:outline-none ${
    isActive
      ? 'bg-white text-ink font-semibold shadow-soft border border-line'
      : 'border border-transparent text-slate-700 hover:text-ink hover:bg-white/70 font-medium'
  } ${!isExpanded ? 'justify-center px-0' : ''}`;

export default function AdminLayout() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  // Mode: 'expanded' | 'collapsed' | 'hover'
  const [sidebarMode, setSidebarMode] = useState(() => {
    return localStorage.getItem('aquila_sidebar_mode') || 'expanded';
  });

  const [isHovered, setIsHovered] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const popoverRef = useRef(null);

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setPopoverOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectMode = (mode) => {
    setSidebarMode(mode);
    localStorage.setItem('aquila_sidebar_mode', mode);
    setPopoverOpen(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // State calculations
  const isExpanded = sidebarMode === 'expanded' || (sidebarMode === 'hover' && isHovered);
  const isHoverOverlay = sidebarMode === 'hover' && isHovered;
  const spacerWidthClass = sidebarMode === 'expanded' ? 'w-64' : 'w-20';

  const userInitials = user?.full_name
    ? user.full_name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : 'BA';

  return (
    <div className="min-h-screen bg-canvas flex font-sans">
      
      {/* =====================================================================
          1. STRUCTURAL SPACER (Handles layout reflow vs static spacing)
          ===================================================================== */}
      <div className={`h-screen shrink-0 transition-[width] duration-300 ease-out select-none ${spacerWidthClass}`}>
        
        {/* Clean Solid Sidebar */}
        <aside
          onMouseEnter={() => sidebarMode === 'hover' && setIsHovered(true)}
          onMouseLeave={() => sidebarMode === 'hover' && setIsHovered(false)}
          className={`fixed top-0 left-0 h-screen transition-[width,box-shadow] duration-200 ease-out z-40 flex flex-col justify-between select-none
            bg-[#e9f0f4] border-r border-line text-slate-800
            ${isExpanded ? 'w-64' : 'w-20'}
            ${isHoverOverlay ? 'shadow-soft' : ''}
          `}
        >
          {/* Top: Logo & Navigation */}
          <div className="relative z-10">
            {/* Logo Row */}
            <div className="h-16 px-4 flex items-center">
              <Link
                to="/dashboard"
                className={`flex items-center gap-2.5 transition-opacity hover:opacity-85 focus-visible:ring-2 focus-visible:ring-[#0c4a6e] rounded-control p-1 ${
                  !isExpanded ? 'mx-auto' : ''
                }`}
                title="AQUILA"
              >
                <Droplets className="h-5 w-5 text-[#0c4a6e] shrink-0 stroke-[1.75]" />
                {isExpanded && (
                  <span className="font-semibold text-lg text-[#0c4a6e] tracking-tight">
                    AQUILA
                  </span>
                )}
              </Link>
            </div>

            {/* Navigation Links */}
            <nav className="px-3 py-2 space-y-1 overflow-y-auto max-h-[calc(100vh-260px)] [scrollbar-width:none]">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    title={!isExpanded ? item.label : undefined}
                    className={navClass(isExpanded)}
                  >
                    <Icon className="h-[18px] w-[18px] shrink-0 stroke-[1.75]" />
                    {isExpanded && (
                      <div className="flex items-center justify-between flex-1 truncate">
                        <span className="truncate">{item.label}</span>
                        {item.hasBadge && (
                          <span className="h-2 w-2 rounded-full bg-amber-600 shrink-0" aria-hidden="true" />
                        )}
                      </div>
                    )}
                  </NavLink>
                );
              })}
            </nav>
          </div>

          {/* Bottom: User Profile & View Control (plain row separated by rule) */}
          <div className="p-3 relative z-10 shrink-0 space-y-1" ref={popoverRef}>
            {FOOTER_NAV.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  title={!isExpanded ? item.label : undefined}
                  className={navClass(isExpanded)}
                >
                  <Icon className="h-[18px] w-[18px] shrink-0 stroke-[1.75]" />
                  {isExpanded && <span className="truncate">{item.label}</span>}
                </NavLink>
              );
            })}
            <div className="border-t border-line pt-3 mt-2" />
            
            {/* Popover Menu */}
            {popoverOpen && (
              <div className="absolute bottom-16 left-3 w-52 bg-white border border-line rounded-tile shadow-soft p-1.5 text-sm space-y-0.5 z-50">
                <div className="px-2.5 py-1 text-[0.8125rem] text-slate-600">
                  Sidebar view
                </div>

                {[
                  { id: 'expanded', label: 'Expanded' },
                  { id: 'collapsed', label: 'Collapsed' },
                  { id: 'hover', label: 'Expand on hover' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => selectMode(opt.id)}
                    className="w-full flex items-center justify-between px-2.5 py-2 rounded-control text-left text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <span className="text-sm">{opt.label}</span>
                    {sidebarMode === opt.id && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#0c4a6e]" />
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Plain User Row (no card inside a card) */}
            {isExpanded ? (
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <div className="w-9 h-9 rounded-full bg-white border border-line text-ink font-semibold text-[0.8125rem] flex items-center justify-center shrink-0">
                    {userInitials}
                  </div>
                  <div className="overflow-hidden">
                    <div className="text-[0.9375rem] font-semibold text-slate-900 truncate leading-tight">
                      {user?.full_name || 'System Admin'}
                    </div>
                    <div className="text-[0.8125rem] text-slate-600 truncate mt-0.5">
                      {user?.email || 'admin@bawasa.gov.ph'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setPopoverOpen(!popoverOpen)}
                    className="p-2 rounded-control text-slate-600 hover:text-slate-900 hover:bg-white transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[#0c4a6e]"
                    title="Sidebar control"
                  >
                    <PanelLeft className="h-[18px] w-[18px] stroke-[1.75]" />
                  </button>

                  <button
                    type="button"
                    onClick={handleLogout}
                    title="Sign Out"
                    className="p-2 rounded-control text-slate-600 hover:text-rose-700 hover:bg-white transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-rose-600"
                  >
                    <LogOut className="h-[18px] w-[18px] stroke-[1.75]" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 py-1">
                <div
                  className="w-9 h-9 rounded-full bg-white border border-line text-ink font-semibold text-[0.8125rem] flex items-center justify-center shrink-0"
                  title={user?.full_name || 'System Admin'}
                >
                  {userInitials}
                </div>

                <button
                  type="button"
                  onClick={() => setPopoverOpen(!popoverOpen)}
                  className="p-2 rounded-control text-slate-600 hover:text-slate-900 hover:bg-white transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[#0c4a6e]"
                  title="Sidebar control"
                >
                  <PanelLeft className="h-[18px] w-[18px] stroke-[1.75]" />
                </button>

                <button
                  type="button"
                  onClick={handleLogout}
                  title="Sign Out"
                  className="p-2 rounded-control text-slate-600 hover:text-rose-700 hover:bg-white transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-rose-600"
                >
                  <LogOut className="h-[18px] w-[18px] stroke-[1.75]" />
                </button>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* =====================================================================
          5. MAIN VIEWPORT CONTENT
          ===================================================================== */}
      <main className="aq-admin flex-1 overflow-y-auto min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}
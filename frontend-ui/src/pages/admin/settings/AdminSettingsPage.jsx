import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  User,
  Bell,
  Sun,
  Globe,
  BookOpen,
  FileCheck,
  Info,
  ShieldAlert
} from 'lucide-react';

import { useAuthStore } from '../../../stores/useAuthStore';
import { adminApi } from '../../../api/admin_api';
import { TabRegistry, TabDefinition } from './core/TabRegistry';
import { settingsManager } from './core/SettingsManager';
import SettingsSubNav from './components/SettingsSubNav';
import UnsavedChangesBar from './components/UnsavedChangesBar';

// Tabs
import ProfileTab from './tabs/ProfileTab';
import NotificationsTab from './tabs/NotificationsTab';
import AppearanceTab from './tabs/AppearanceTab';
import RegionalTab from './tabs/RegionalTab';
import SopDirectivesTab from './tabs/SopDirectivesTab';
import FieldOperationsGuideTab from './tabs/FieldOperationsGuideTab';
import AdminManualTab from './tabs/AdminManualTab';
import AboutTab from './tabs/AboutTab';

export default function AdminSettingsPage() {
  const navigate = useNavigate();
  const { user, restoreSession } = useAuthStore();

  const registry = useMemo(() => {
    const reg = new TabRegistry();

    // Group 1: Preferences
    reg.register(
      new TabDefinition({
        id: 'profile',
        label: 'My Profile',
        group: 'PREFERENCES',
        icon: User,
        keywords: ['name', 'phone', 'password', 'account'],
        component: ProfileTab
      })
    );
    reg.register(
      new TabDefinition({
        id: 'notifications',
        label: 'Alerts & Sound',
        group: 'PREFERENCES',
        icon: Bell,
        keywords: ['siren', 'push', 'sound', 'email'],
        component: NotificationsTab
      })
    );
    reg.register(
      new TabDefinition({
        id: 'appearance',
        label: 'Text Size & Display',
        group: 'PREFERENCES',
        icon: Sun,
        keywords: ['theme', 'font', 'scale', 'dark', 'contrast'],
        component: AppearanceTab
      })
    );
    reg.register(
      new TabDefinition({
        id: 'regional',
        label: 'Time & Language',
        group: 'PREFERENCES',
        icon: Globe,
        keywords: ['clock', 'liters', 'tagalog', 'units'],
        component: RegionalTab
      })
    );
    reg.register(
      new TabDefinition({
        id: 'sop-directives',
        label: 'SOP Action Cards',
        group: 'PREFERENCES',
        icon: ShieldAlert,
        keywords: ['sop', 'action card', 'directives', 'templates', 'plumber'],
        component: SopDirectivesTab
      })
    );

    // Group 2: Documentation & Guides
    reg.register(
      new TabDefinition({
        id: 'field-guide',
        label: 'Field Operations Guide',
        group: 'HELP & DOCUMENTATION',
        icon: BookOpen,
        keywords: ['leaks', 'verify', 'pipes', 'battery'],
        component: FieldOperationsGuideTab
      })
    );
    reg.register(
      new TabDefinition({
        id: 'admin-manual',
        label: 'Administration Manual',
        group: 'HELP & DOCUMENTATION',
        icon: FileCheck,
        keywords: ['users', 'meters', 'reports', 'complaints'],
        component: AdminManualTab
      })
    );

    // Group 3: System
    reg.register(
      new TabDefinition({
        id: 'about',
        label: 'System Health Check',
        group: 'SYSTEM',
        icon: Info,
        keywords: ['version', 'status', 'bpsu', 'mysql', 'firebase'],
        component: AboutTab
      })
    );

    return reg;
  }, []);

  const [activeTabId, setActiveTabId] = useState(() => registry.getDefaultTabId());
  const [isDirty, setIsDirty] = useState(() => settingsManager.isDirty());
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  useEffect(() => {
    const unsubscribe = settingsManager.subscribe((state) => {
      setIsDirty(state.isDirty);
    });
    return () => unsubscribe();
  }, []);

  const handleExit = () => {
    if (isDirty) {
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 600);
      return;
    }
    navigate('/dashboard');
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleExit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDirty]);

  // Save both visual/regional preferences AND user profile changes to MySQL
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const firstName = settingsManager.get('firstName');
      const lastName = settingsManager.get('lastName');
      const phone = settingsManager.get('emergencyPhone');

      settingsManager.saveDraft();

      if (user?.user_id && firstName && lastName) {
        await adminApi.updateUser(user.user_id, {
          first_name: firstName,
          last_name: lastName,
          phone_number: phone,
          role: user.role
        });
        await restoreSession();
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 1500);
    } catch (err) {
      console.warn('[AdminSettingsPage] Profile sync notice:', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    settingsManager.resetDraft();
  };

  const activeTab = registry.getTab(activeTabId);
  const ActiveComponent = activeTab?.component;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-50/50 via-[#f4f5f8] to-[#edf0f5] select-none text-slate-800">
      
      {/* 1. LEFT SUB-NAV */}
      <div className="bg-white border-r border-slate-200/50 shrink-0 h-full">
        <SettingsSubNav
          registry={registry}
          activeTabId={activeTabId}
          onSelectTab={setActiveTabId}
        />
      </div>

      {/* 2. CENTER READING STAGE */}
      <div className="flex-1 overflow-y-auto h-full px-6 sm:px-12 pt-10 pb-40 flex justify-center [scrollbar-width:thin]">
        <div className="w-full max-w-[760px] pb-16">
          {typeof ActiveComponent === 'function' ? (
            <div className="">
              <ActiveComponent />
            </div>
          ) : (
            <div className="aq-surface rounded-card p-6 border border-rose-200">
              <p className="text-[0.8125rem] text-rose-700 font-semibold">
                Tab failed to load: {activeTabId}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 3. RIGHT ESCAPE PILLAR */}
      <div className="fixed top-6 right-8 flex flex-col items-center gap-1.5 z-50">
        <button
          type="button"
          onClick={handleExit}
          className="group relative h-9 w-9 rounded-full bg-white hover:bg-white border border-slate-200/70 shadow-xs flex items-center justify-center text-slate-600 hover:text-slate-900 hover:scale-105 active:scale-95 transition-all cursor-pointer"
          title="Return to Dashboard (Esc)"
        >
          <X className="h-4 w-4 stroke-[2]" />
        </button>

        <span className="px-1.5 py-0.5 rounded text-[0.8125rem] font-mono font-semibold bg-white border border-slate-200/80 text-slate-600 shadow-2xs pointer-events-none">
          ESC
        </span>
      </div>

      {/* 4. FLOATING SAVE CAPSULE */}
      <UnsavedChangesBar
        isDirty={isDirty}
        isShaking={isShaking}
        isSaving={isSaving}
        saveSuccess={saveSuccess}
        onReset={handleReset}
        onSave={handleSave}
      />

    </div>
  );
}
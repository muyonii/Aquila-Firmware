// frontend-ui/src/pages/admin/settings/tabs/NotificationsTab.jsx
import React, { useState } from 'react';
import AppleToggle from '../components/AppleToggle';
import { settingsManager } from '../core/SettingsManager';

export default function NotificationsTab() {
  const [alarmSound, setAlarmSound] = useState(() => settingsManager.get('alarmSound'));
  const [browserPush, setBrowserPush] = useState(() => settingsManager.get('browserPush'));
  const [dailyDigest, setDailyDigest] = useState(() => settingsManager.get('dailyDigest'));

  const toggle = (key, val, setter) => {
    setter(val);
    settingsManager.setDraft(key, val);
  };

  const handleTestSiren = () => {
    settingsManager.playTestChime();
  };

  const handleTestNotification = () => {
    if (!('Notification' in window)) {
      alert('This browser does not support desktop notifications.');
      return;
    }
    Notification.requestPermission().then((perm) => {
      if (perm === 'granted') {
        new Notification('AQUILA Test Alert', {
          body: 'Desktop notifications are active for pipe leaks.'
        });
      } else {
        alert('Notification permission was blocked in browser settings.');
      }
    });
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      <div>
        <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900 flex items-center gap-2">
        <span>Alerts & sound</span>
        </h2>
        <p className="text-sm text-slate-600">
        Choose how and when you get notified during leak emergencies.
        </p>
      </div>

      <div className="bg-white rounded-control p-5 border border-black/[0.06] shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-4">
        {/* Siren Sound */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h3 className="text-[0.8125rem] font-semibold text-slate-900">Critical Leak Sound Siren</h3>
            <p className="text-[0.8125rem] text-slate-600">Play an audible alert chime when a severe P1 pipe rupture is flagged.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleTestSiren}
              className="text-[0.8125rem] font-semibold text-[#0c4a6e] hover:underline cursor-pointer"
            >
              Test Siren
            </button>
            <AppleToggle checked={alarmSound} onChange={(v) => toggle('alarmSound', v, setAlarmSound)} />
          </div>
        </div>

        {/* Desktop Popups */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h3 className="text-[0.8125rem] font-semibold text-slate-900">Desktop Push Popups</h3>
            <p className="text-[0.8125rem] text-slate-600">Show alert boxes on your screen even when AQUILA is minimized.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleTestNotification}
              className="text-[0.8125rem] font-semibold text-[#0c4a6e] hover:underline cursor-pointer"
            >
              Send Test Alert
            </button>
            <AppleToggle checked={browserPush} onChange={(v) => toggle('browserPush', v, setBrowserPush)} />
          </div>
        </div>

        {/* Daily Digest */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h3 className="text-[0.8125rem] font-semibold text-slate-900">Daily Morning Water Loss Report</h3>
            <p className="text-[0.8125rem] text-slate-600">Send a 6:00 AM email summarizing community water loss.</p>
          </div>
          <AppleToggle checked={dailyDigest} onChange={(v) => toggle('dailyDigest', v, setDailyDigest)} />
        </div>
      </div>
    </div>
  );
}
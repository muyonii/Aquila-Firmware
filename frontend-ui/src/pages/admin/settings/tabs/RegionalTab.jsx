import React, { useState } from 'react';
import { settingsManager } from '../core/SettingsManager';

export default function RegionalTab() {
  const [volumeUnit, setVolumeUnit] = useState(() => settingsManager.get('volumeUnit'));
  const [clockFormat, setClockFormat] = useState(() => settingsManager.get('clockFormat'));
  const [language, setLanguage] = useState(() => settingsManager.get('language'));

  const select = (key, val, setter) => {
    setter(val);
    settingsManager.setDraft(key, val);
  };

  const handleReset = () => {
    if (confirm('Restore regional defaults to Liters, 12-Hour AM/PM, and English?')) {
      settingsManager.resetRegional();
      setVolumeUnit('liters');
      setClockFormat('12h');
      setLanguage('en');
    }
  };

  const now = new Date();
  const formattedTime = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: clockFormat === '12h'
  });

  const sampleVolume =
    volumeUnit === 'm3' ? '1.194 m³ (Cubic Meters)' : '1,193.5 Liters (L)';

  const sampleGreeting =
    language === 'fil'
      ? 'Magandang araw! Lahat ng tubo sa Purok 2 ay normal na dumadaloy.'
      : 'Good day! All conduits in Purok 2 are flowing normally.';

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      <div>
        <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900">
           {language === 'fil' ? 'Oras, Yunit at Wika' : 'Units & Regional'}
        </h2>
        <p className="text-sm text-slate-600">
          {language === 'fil'
            ? 'Piliin ang sukatan ng tubig, format ng oras, at wika ng sistema.'
            : 'Choose measurement units, time formats, and language.'}
        </p>
      </div>

      <div className="bg-white rounded-control p-5 border border-black/[0.06] shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-4">
        {/* Water Units */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-[0.8125rem] font-semibold text-slate-900">Water Volume Unit</h3>
            <p className="text-[0.8125rem] text-slate-600">
              Primary unit displayed on dashboard KPIs.
            </p>
          </div>
          <div className="flex rounded-lg bg-slate-50 p-0.5 text-[0.8125rem] font-medium">
            {[
              { id: 'liters', label: 'Liters (L)' },
              { id: 'm3', label: 'Cubic Meters (m³)' }
            ].map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => select('volumeUnit', u.id, setVolumeUnit)}
                className={`px-3 py-1 rounded-md cursor-pointer transition-colors ${
 volumeUnit === u.id
 ? 'bg-white text-slate-900 shadow-xs font-semibold'
 : 'text-slate-600'
 }`}
              >
                {u.label}
              </button>
            ))}
          </div>
        </div>

        {/* Clock */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-[0.8125rem] font-semibold text-slate-900">Clock Format</h3>
            <p className="text-[0.8125rem] text-slate-600">
              Standard 12-hour AM/PM or 24-hour military clock.
            </p>
          </div>
          <div className="flex rounded-lg bg-slate-50 p-0.5 text-[0.8125rem] font-medium">
            {[
              { id: '12h', label: '12-Hour (2:30 PM)' },
              { id: '24h', label: '24-Hour (14:30)' }
            ].map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => select('clockFormat', c.id, setClockFormat)}
                className={`px-3 py-1 rounded-md cursor-pointer transition-colors ${
 clockFormat === c.id
 ? 'bg-white text-slate-900 shadow-xs font-semibold'
 : 'text-slate-600'
 }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Language */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-[0.8125rem] font-semibold text-slate-900">Language</h3>
            <p className="text-[0.8125rem] text-slate-600">
              Community terminology mode.
            </p>
          </div>
          <div className="flex rounded-lg bg-slate-50 p-0.5 text-[0.8125rem] font-medium">
            {[
              { id: 'en', label: 'English' },
              { id: 'fil', label: 'Filipino / Tagalog' }
            ].map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => select('language', l.id, setLanguage)}
                className={`px-3 py-1 rounded-md cursor-pointer transition-colors ${
 language === l.id
 ? 'bg-white text-slate-900 shadow-xs font-semibold'
 : 'text-slate-600'
 }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        {/* Live Regional Formatting Preview */}
        <div className="p-4 rounded-control bg-slate-50 border border-black/[0.04] space-y-2 text-[0.8125rem]">
          <div className="text-[0.8125rem] font-semibold text-slate-600">
            Live Regional Output Preview
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-slate-800">
            <span>Clock: <strong>{formattedTime}</strong></span>
            <span>Volume: <strong>{sampleVolume}</strong></span>
          </div>
          <p className="text-slate-600 italic pt-1 border-t border-black/[0.04]">
            &ldquo;{sampleGreeting}&rdquo;
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleReset}
          className="text-[0.8125rem] text-slate-600 hover:text-[#1d1d1f] underline cursor-pointer"
        >
          Restore Regional Defaults
        </button>
      </div>
    </div>
  );
}
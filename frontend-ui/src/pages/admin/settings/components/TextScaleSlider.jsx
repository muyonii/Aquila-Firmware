// frontend-ui/src/pages/admin/settings/components/TextScaleSlider.jsx
import React from 'react';

export default function TextScaleSlider({ value, onChange }) {
  const getScaleLabel = (v) => {
    if (v <= 90) return 'Compact';
    if (v <= 105) return 'Default (Normal)';
    if (v <= 118) return 'Comfortable';
    return 'Large';
  };

  return (
    <div className="space-y-4">
      {/* iOS-Style Typography Slider */}
      <div className="flex items-center gap-4">
        <span className="text-[0.8125rem] font-semibold text-slate-600 select-none">A</span>
        
        <input
          type="range"
          min="85"
          max="130"
          step="5"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full accent-[#0c4a6e] cursor-pointer h-1.5 bg-[#e5e5ea] rounded-lg appearance-none"
        />

        <span className="text-lg font-semibold text-slate-900 select-none">A</span>
      </div>

      <div className="flex items-center justify-between text-[0.8125rem] text-slate-600">
        <span>Scale: <strong className="text-slate-900 font-semibold">{value}%</strong></span>
        <span>{getScaleLabel(value)}</span>
      </div>

      {/* Dynamic Live Preview Box */}
      <div className="p-3.5 rounded-control bg-slate-50 border border-black/[0.04]">
        <div className="text-[0.8125rem] font-semibold text-slate-600 mb-1">
          Live Reading Preview
        </div>
        <p
          style={{ fontSize: `${(13 * value) / 100}px` }}
          className="text-slate-900 font-medium leading-relaxed transition-all"
        >
          NODE-B1-002: Santos Family • Current flow: 3.42 L/min (All nominal)
        </p>
      </div>
    </div>
  );
}
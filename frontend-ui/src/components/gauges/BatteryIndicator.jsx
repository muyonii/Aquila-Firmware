import React from 'react';
import { Battery, BatteryLow, AlertTriangle } from 'lucide-react';

export default function BatteryIndicator({ voltage = 4.10 }) {
  const safeVolts = Number(voltage) || 0;
  const isLow = safeVolts < 3.35;
  const isCritical = safeVolts < 3.20;

  // Map cell voltage: 3.0V (0%) to 4.2V (100%)
  const percentage = Math.max(0, Math.min(100, Math.round(((safeVolts - 3.0) / (4.2 - 3.0)) * 100)));

  const dotColor = isCritical ? 'text-rose-600' : isLow ? 'text-amber-600' : 'text-emerald-600';

  return (
    <span className={`inline-flex items-center gap-1.5 text-sm font-semibold ${isCritical ? 'text-rose-700': isLow ? 'text-amber-700': 'text-emerald-700'}`}>
      <span className={dotColor} aria-hidden="true">●</span>
      <span className="font-mono">{safeVolts.toFixed(2)}V</span>
      <span className="text-slate-600 text-[0.8125rem] font-normal">({percentage}%)</span>
    </span>
  );
}
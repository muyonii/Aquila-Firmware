import React from 'react';

/**
 * StatusBadge — dot + plain text label (no filled pill).
 * Use: <StatusBadge status="OPEN" />
 */
export default function StatusBadge({ status = 'OPEN', className = '' }) {
  const normalized = (status || '').toUpperCase();

  const dotColor = {
    // Priorities
    P1: 'text-rose-600',
    P2: 'text-amber-600',
    P3: 'text-slate-600',
    // Work Order Lifecycle
    OPEN: 'text-rose-600',
    DISPATCHED: 'text-sky-600',
    PENDING_VERIFICATION: 'text-amber-600',
    CLOSED_VERIFIED: 'text-emerald-600',
    REPAIR_FAILED: 'text-rose-600',
    CANCELLED: 'text-slate-600',
    // Node States
    ACTIVE: 'text-emerald-600',
    MAINTENANCE: 'text-amber-600',
    INACTIVE: 'text-slate-600',
    OFFLINE: 'text-slate-600',
  }[normalized] || 'text-slate-600';

  const label = normalized.replace(/_/g, ' ');

  return (
    <span className={`inline-flex items-center gap-1.5 text-sm ${className}`}>
      <span className={dotColor} aria-hidden="true">●</span>
      <span className="text-slate-700">{label}</span>
    </span>
  );
}
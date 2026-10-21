import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, Droplets } from 'lucide-react';

/* =========================================================================
   Shared UI primitives for the Resident + Technician portals.
   Pattern: soft water-blue system (tinted 16px cards, white tiles,
   one soft shadow, neutral icon chips). Tokens live in index.css (.aq-*).
   ========================================================================= */

export const cardClass = 'aq-card';

export const inputClass =
  'w-full bg-white border border-[#74899b] text-slate-900 px-3.5 py-2.5 min-h-[44px] rounded-control text-base outline-none transition placeholder:text-slate-600 focus:border-[#0c4a6e] focus:ring-2 focus:ring-[#0c4a6e]/25 focus-visible:ring-2 focus-visible:ring-[#0c4a6e]';

const btnBase =
  'inline-flex items-center justify-center gap-2 h-10 px-4 rounded-control text-sm font-semibold transition disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ';
export const btnPrimary = `${btnBase} bg-[linear-gradient(180deg,#0f5c85,#0c4a6e)] hover:brightness-110 text-white focus-visible:ring-[#0c4a6e]`;
export const btnSecondary = `${btnBase} bg-white hover:bg-[#f4f8fb] text-slate-800 border border-line focus-visible:ring-[#0c4a6e]`;
export const btnDanger = `${btnBase} bg-rose-700 hover:bg-rose-800 text-white focus-visible:ring-rose-700`;
export const btnAccent = btnPrimary;

export function Card({ className = '', children, ...rest }) {
  return (
    <div className={`${cardClass} ${className}`} {...rest}>
      {children}
    </div>
  );
}

/** Neutral icon chip: white, hairline border. `tone` is accepted but ignored (color is reserved for state). */
export function IconTile({ icon: Icon, className = '' }) {
  if (!Icon) return null;
  return (
    <span className={`aq-icon ${className}`}>
      <Icon className="w-[18px] h-[18px] stroke-[1.75]" />
    </span>
  );
}

/** Small section label above a page title */
export function Eyebrow({ children, className = '' }) {
  return <div className={`text-sm text-slate-600 ${className}`}>{children}</div>;
}

/** Form field label */
export function Label({ children, className = '' }) {
  return <span className={`text-sm font-semibold text-slate-800 block ${className}`}>{children}</span>;
}

const TONES = {
  sky:     { alert: 'bg-sky-50 text-sky-950 border-sky-300',     icon: AlertCircle },
  amber:   { alert: 'bg-amber-50 text-amber-950 border-amber-300', icon: AlertTriangle },
  emerald: { alert: 'bg-emerald-50 text-emerald-900 border-emerald-300', icon: CheckCircle2 },
  rose:    { alert: 'bg-rose-50 text-rose-900 border-rose-300',   icon: AlertCircle },
  indigo:  { alert: 'bg-slate-50 text-slate-900 border-slate-300', icon: Info },
  slate:   { alert: 'bg-slate-50 text-slate-900 border-slate-300', icon: Info },
};

export function Alert({ tone = 'rose', icon, children, action, className = '' }) {
  const Icon = icon || TONES[tone].icon;
  return (
    <div role="alert" className={`p-3.5 rounded-tile border text-sm flex items-start gap-2.5 ${TONES[tone].alert} ${className}`}>
      <Icon className="w-[18px] h-[18px] mt-0.5 shrink-0 stroke-[1.75]" />
      <div className="flex-1 min-w-0">{children}</div>
      {action}
    </div>
  );
}

export function PageHeader({ title, subtitle, right }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="space-y-1 min-w-0">
        <h1 className="text-[1.5rem] font-semibold text-slate-900 tracking-tight leading-tight">{title}</h1>
        {subtitle && <p className="text-sm text-slate-600 leading-relaxed">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

/** KPI card: label, large value, one-line hint */
export function StatTile({ label, value, unit, hint, loading = false }) {
  return (
    <div className="aq-card !p-4 flex flex-col justify-between">
      <span className="text-sm text-slate-600">{label}</span>
      <div className="text-[1.75rem] leading-tight font-semibold text-slate-900 tabular-nums my-1.5">
        {loading ? '—' : value}
        {unit && <span className="text-sm font-semibold text-slate-600 ml-1.5">{unit}</span>}
      </div>
      {hint && <p className="text-sm text-slate-600">{hint}</p>}
    </div>
  );
}

export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse bg-[#dbe7ef] rounded-tile ${className}`} />;
}

/** Calm empty state: title, optional body and action. No large decorative icon. */
export function EmptyState({ title, body, action }) {
  return (
    <div className="py-8 px-5 text-center">
      <p className="text-base font-semibold text-slate-900">{title}</p>
      {body && <p className="text-sm text-slate-600 mt-1 max-w-md mx-auto">{body}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

/** Live status — dot + label, no pill */
export function LivePill({ connected }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-semibold">
      <span className={`w-2 h-2 rounded-full shrink-0 ${connected ? 'bg-emerald-600' : 'bg-slate-500'}`} />
      <span className={connected ? 'text-emerald-700' : 'text-slate-600'}>
        {connected ? 'Live' : 'Offline'}
      </span>
    </span>
  );
}

export function Brand({ suffix }) {
  return (
    <span className="flex items-center gap-2.5">
      <Droplets className="w-5 h-5 text-[#0c4a6e] shrink-0 stroke-[1.75]" />
      <span className="font-semibold text-lg text-[#0c4a6e] tracking-tight">AQUILA</span>
      {suffix}
    </span>
  );
}

/** No ambient gradient wash */
export function AmbientWash() {
  return null;
}

export function initials(name = '') {
  return (
    name.split(' ').filter(Boolean).map((n) => n[0]).slice(0, 2).join('').toUpperCase() || 'AQ'
  );
}

/** "12 min ago" style label. Returns null for unparseable input. */
export function timeAgo(ts) {
  if (!ts) return null;
  const then = new Date(String(ts).replace(' ', 'T')).getTime();
  if (Number.isNaN(then)) return null;
  const secs = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (secs < 60) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs > 1 ? 's' : ''} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

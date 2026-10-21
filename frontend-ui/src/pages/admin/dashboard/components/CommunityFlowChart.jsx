import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Activity } from 'lucide-react';
import { useTelemetryStore } from '../../../../stores/useTelemetryStore';
import { adminApi } from '../../../../api/admin_api';
import { useSettings } from '../../settings/core/SettingsManager';

const SAMPLE_MS = 5000;
const MAX_SAMPLES = 60; // 5 minutes of history
const LAYER_COLORS = ['#0c4a6e', '#3b82a6', '#7fb3cc', '#bcd8e6']; // bottom -> top
const W = 600;
const H = 220;

function niceMax(v) {
  if (v <= 1) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / pow;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * pow;
}

function LiveFlowArea({ nodes }) {
  const [samples, setSamples] = useState([]);
  const [hoverIdx, setHoverIdx] = useState(null);
  const boxRef = useRef(null);

  // Record a rolling window of real telemetry readings
  useEffect(() => {
    const take = () => {
      const current = useTelemetryStore.getState().nodes || {};
      const byNode = {};
      Object.entries(current).forEach(([id, n]) => {
        const q = Number(n?.telemetry?.flow_rate_lpm);
        if (!isNaN(q)) byNode[id] = q;
      });
      setSamples((prev) => [...prev, { t: Date.now(), byNode }].slice(-MAX_SAMPLES));
    };
    take();
    const timer = setInterval(take, SAMPLE_MS);
    return () => clearInterval(timer);
  }, []);

  const model = useMemo(() => {
    const peaks = {};
    samples.forEach((s) =>
      Object.entries(s.byNode).forEach(([id, q]) => {
        peaks[id] = Math.max(peaks[id] || 0, q);
      })
    );
    const top = Object.entries(peaks)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([id]) => id);
    const layerDefs = [...top.map((id) => ({ id, label: id })), { id: '__other', label: 'Other nodes' }];

    const rows = samples.map((s) => {
      const vals = top.map((id) => s.byNode[id] || 0);
      const other = Object.entries(s.byNode)
        .filter(([id]) => !top.includes(id))
        .reduce((a, [, q]) => a + q, 0);
      return [...vals, other];
    });
    const totals = rows.map((r) => r.reduce((a, b) => a + b, 0));
    const max = niceMax(Math.max(0, ...totals));
    return { layerDefs, rows, totals, max };
  }, [samples]);

  const n = samples.length;
  const hasStream = nodes > 0;
  const x = (i) => (n <= 1 ? 0 : (i / (n - 1)) * W);
  const y = (v) => H - (v / model.max) * H;

  // Build stacked area paths (bottom layer first)
  const paths = model.layerDefs.map((_, li) => {
    if (n < 2) return null;
    const upper = model.rows.map((r, i) => y(r.slice(0, li + 1).reduce((a, b) => a + b, 0)));
    const lower = model.rows.map((r, i) => y(r.slice(0, li).reduce((a, b) => a + b, 0)));
    const top = upper.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${v.toFixed(1)}`).join(' ');
    const bottom = lower
      .map((v, i) => `L ${x(n - 1 - i).toFixed(1)} ${lower[n - 1 - i].toFixed(1)}`)
      .join(' ');
    return `${top} ${bottom} Z`;
  });

  const handleMove = (e) => {
    if (n < 2 || !boxRef.current) return;
    const rect = boxRef.current.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    setHoverIdx(Math.round(ratio * (n - 1)));
  };

  const gridLevels = [0, 0.25, 0.5, 0.75, 1];
  const hover = hoverIdx !== null && n > 1 ? hoverIdx : null;

  if (!hasStream) {
    return (
      <div className="h-[260px] flex items-center justify-center text-sm text-slate-600 text-center px-6">
        No live telemetry yet. Start the hardware rig or the simulator and readings will appear here.
      </div>
    );
  }

  return (
    <div>
      <div className="flex">
        {/* Y axis labels */}
        <div className="relative w-12 shrink-0 text-[0.8125rem] text-slate-600 tabular-nums" style={{ height: H }}>
          {gridLevels.map((g) => (
            <span
              key={g}
              className="absolute right-2 -translate-y-1/2"
              style={{ top: `${(1 - g) * 100}%` }}
            >
              {(model.max * g).toFixed(model.max < 5 ? 1 : 0)}
            </span>
          ))}
        </div>

        <div
          ref={boxRef}
          className="relative flex-1"
          style={{ height: H }}
          onMouseMove={handleMove}
          onMouseLeave={() => setHoverIdx(null)}
        >
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 w-full h-full overflow-visible" role="img" aria-label="Stacked area chart of live community flow in litres per minute over the last five minutes">
            {gridLevels.map((g) => (
              <line key={g} x1="0" x2={W} y1={y(model.max * g)} y2={y(model.max * g)} stroke="#c9d6df" strokeDasharray="4 5" vectorEffect="non-scaling-stroke" />
            ))}
            {[...paths].reverse().map((d, ri) => {
              const li = paths.length - 1 - ri;
              return d ? <path key={li} d={d} fill={LAYER_COLORS[li % 4]} fillOpacity="0.92" /> : null;
            })}
            {hover !== null && (
              <line x1={x(hover)} x2={x(hover)} y1="0" y2={H} stroke="#0f1f2b" strokeWidth="1" vectorEffect="non-scaling-stroke" />
            )}
          </svg>

          {n < 2 && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-600">
              Collecting live readings…
            </div>
          )}

          {hover !== null && (
            <div
              className="absolute z-10 top-2 bg-white border border-line rounded-tile shadow-soft px-3 py-2 text-[0.8125rem] pointer-events-none min-w-[150px]"
              style={{ left: `${(hover / (n - 1)) * 100}%`, transform: hover > n / 2 ? 'translateX(calc(-100% - 10px))' : 'translateX(10px)' }}
            >
              <div className="text-slate-600 mb-1">{new Date(samples[hover].t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' })}</div>
              {[...model.layerDefs].map((l, li) => ({ l, li })).reverse().map(({ l, li }) => (
                <div key={l.id} className="flex items-center justify-between gap-4">
                  <span className="flex items-center gap-2 text-slate-800">
                    <span className="w-2.5 h-2.5 rounded-[3px]" style={{ background: LAYER_COLORS[li % 4] }} />
                    {l.label}
                  </span>
                  <span className="font-semibold tabular-nums text-slate-900">{model.rows[hover][li].toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="flex justify-between text-[0.8125rem] text-slate-600 pl-12 pt-2">
        <span>{n > 1 ? `${Math.max(1, Math.round(((n - 1) * SAMPLE_MS) / 60000))} min ago` : ''}</span>
        <span>Now · L/min</span>
      </div>
    </div>
  );
}

function UsageByNode() {
  const prefs = useSettings();
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    adminApi
      .getConsumptionReport()
      .then((res) => {
        if (!alive) return;
        if (res?.success) setRows(res.data?.household_breakdown || []);
        else setError(true);
      })
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, []);

  if (error) return <div className="h-[260px] flex items-center justify-center text-sm text-slate-600">Could not load the consumption report.</div>;
  if (!rows) return <div className="h-[260px] flex items-center justify-center text-sm text-slate-600">Loading consumption…</div>;
  if (rows.length === 0) return <div className="h-[260px] flex items-center justify-center text-sm text-slate-600">No consumption recorded for the last 30 days.</div>;

  const top = rows.slice(0, 7);
  const max = Math.max(1, ...top.map((r) => Number(r.total_liters) || 0));
  const fmt = (l) => (prefs.volumeUnit === 'liters' ? `${Number(l).toFixed(1)} L` : `${(Number(l) / 1000).toFixed(3)} m³`);

  return (
    <ul className="space-y-3 pt-1">
      {top.map((r) => {
        const v = Number(r.total_liters) || 0;
        return (
          <li key={r.node_id} className="grid grid-cols-[minmax(0,10rem)_1fr_5.5rem] items-center gap-3 text-sm">
            <span className="truncate text-slate-800" title={r.household_label}>{r.household_label || r.node_id}</span>
            <span className="h-2.5 rounded-full bg-[#dbe7ef] overflow-hidden">
              <span className="block h-full rounded-full bg-[#3b82a6]" style={{ width: `${Math.max(2, (v / max) * 100)}%` }} />
            </span>
            <span className="text-right font-semibold text-slate-900 tabular-nums">{fmt(v)}</span>
          </li>
        );
      })}
    </ul>
  );
}

export default function CommunityFlowChart() {
  const nodes = useTelemetryStore((state) => state.nodes);
  const [tab, setTab] = useState('live');

  const { totalFlowLpm, activeStreamCount } = useMemo(() => {
    let sum = 0;
    let count = 0;
    Object.values(nodes || {}).forEach((n) => {
      const q = Number(n?.telemetry?.flow_rate_lpm);
      if (!isNaN(q)) {
        sum += q;
        count++;
      }
    });
    return { totalFlowLpm: sum, activeStreamCount: count };
  }, [nodes]);

  return (
    <section className="aq-card">
      <div className="aq-card-head">
        <h2 className="aq-card-title">
          <span className="aq-icon"><Activity className="w-[18px] h-[18px] stroke-[1.75]" /></span>
          Community flow
        </h2>
        <span className="text-sm text-slate-600">
          Now {totalFlowLpm.toFixed(2)} L/min · {activeStreamCount} nodes reporting
        </span>
      </div>

      <div role="tablist" className="flex border-b border-line mb-4">
        <button type="button" role="tab" aria-selected={tab === 'live'} onClick={() => setTab('live')} className="aq-tab">
          Live flow (L/min)
        </button>
        <button type="button" role="tab" aria-selected={tab === 'usage'} onClick={() => setTab('usage')} className="aq-tab">
          Usage by node, 30 days
        </button>
      </div>

      {tab === 'live' ? <LiveFlowArea nodes={activeStreamCount} /> : <UsageByNode />}
    </section>
  );
}

import React from 'react';
import { Link } from 'react-router-dom';
import { Network } from 'lucide-react';
import { useTelemetryStore } from '../../../../stores/useTelemetryStore';

export default function PurokNodeOverview({ nodes = [] }) {
  const rtdbNodes = useTelemetryStore((state) => state.nodes);
  const leakHypotheses = useTelemetryStore((state) => state.leakHypotheses);

  const getNodeStatus = (n) => {
    const nodeId = n.node_id;
    const leak = leakHypotheses?.[nodeId];
    const rtdbStatus = rtdbNodes?.[nodeId]?.status || n.status;
    const flow = Number(rtdbNodes?.[nodeId]?.telemetry?.flow_rate_lpm ?? 0);

    if (leak?.classification === 'LEAK') {
      return {
        label: `Leak (${flow.toFixed(1)} L/min)`,
        dotColor: 'text-rose-600'
      };
    }
    if (rtdbStatus === 'MAINTENANCE') {
      return {
        label: 'Maintenance',
        dotColor: 'text-amber-600'
      };
    }
    if (leak?.classification === 'SUSPICIOUS') {
      return {
        label: 'Suspicious flow',
        dotColor: 'text-amber-600'
      };
    }
    return {
      label: flow > 0 ? `${flow.toFixed(2)} L/min` : 'Normal',
      dotColor: 'text-emerald-600'
    };
  };

  return (
    <section className="aq-card">
      <div className="aq-card-head">
        <h2 className="aq-card-title">
          <span className="aq-icon"><Network className="w-[18px] h-[18px] stroke-[1.75]" /></span>
          Purok 2 node overview
        </h2>
        <Link to="/network-map" className="aq-chip focus-visible:ring-2 focus-visible:ring-[#0c4a6e]">
          Open map
        </Link>
      </div>

      <div className="aq-tile !p-0 divide-y divide-line overflow-hidden">
        {nodes.slice(0, 6).map((n) => {
          const status = getNodeStatus(n);
          return (
            <Link
              to="/network-map"
              key={n.node_id}
              className="px-4 py-3 flex items-center justify-between text-left hover:bg-[#f4f8fb] transition-colors"
            >
              <div className="min-w-0 pr-3">
                <span className="font-semibold text-sm text-slate-900 block truncate">
                  {n.household_label || n.node_id}
                </span>
                <span className="text-[0.8125rem] font-mono text-slate-600">{n.node_id}</span>
              </div>
              <span className="text-sm text-slate-700 flex items-center gap-1.5 shrink-0">
                <span className={status.dotColor} aria-hidden="true">●</span>
                <span>{status.label}</span>
              </span>
            </Link>
          );
        })}
        {nodes.length === 0 && (
          <div className="px-4 py-6 text-sm text-slate-600 text-center">No nodes registered yet.</div>
        )}
      </div>
    </section>
  );
}

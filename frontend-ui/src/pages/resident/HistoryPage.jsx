import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/useAuthStore';
import { residentApi } from '../../api/resident_api';
import {
  Alert,
  Card,
  EmptyState,
  Eyebrow,
  Label,
  Skeleton,
  StatTile,
} from '../../components/portal/ui';
import { Calendar, TrendingUp, Table, AlertTriangle, RefreshCw, Droplet } from 'lucide-react';

export default function HistoryPage() {
  const user = useAuthStore((state) => state.user);
  const assignedNodeId = user?.assigned_node_id;

  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(!!assignedNodeId);
  const [error, setError] = useState(null);
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    async function fetchHistory() {
      try {
        setIsLoading(true);
        const res = await residentApi.getMyWater();
        setData(res.data);
        setError(null);
      } catch (err) {
        setError(err.response?.data?.error?.message || 'Failed to fetch usage history.');
      } finally {
        setIsLoading(false);
      }
    }

    if (assignedNodeId) fetchHistory();
  }, [assignedNodeId, reloadKey]);

  const history = data?.history || [];
  const bars = history.slice(-24);
  const totalLiters = Number(data?.total_24h_liters) || 0;
  const totalM3 = Number(data?.total_24h_m3) || totalLiters / 1000;

  // Peak hour & averages
  const peakRecord = history.reduce((prev, curr) => {
    return Number(curr.total_volume_liters) > Number(prev?.total_volume_liters || 0) ? curr : prev;
  }, null);
  const avgHourlyLiters = history.length > 0 ? totalLiters / history.length : 0;
  const maxBarValue = Math.max(...history.map((h) => Number(h.total_volume_liters) || 0), 10);

  const formatHour = (ts) => {
    if (!ts) return '--:--';
    const parts = ts.split(' ');
    return parts[1] ? parts[1].slice(0, 5) : ts;
  };

  const axisLabels = bars.length
    ? [0, Math.floor((bars.length - 1) / 2), bars.length - 1].map((i) => formatHour(bars[i]?.hour_timestamp))
    : [];
  const selected = selectedIdx != null ? bars[selectedIdx] : null;

  return (
    <div className="space-y-5">
      {/* 1. Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <Eyebrow>Consumption</Eyebrow>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Usage history</h1>
          <p className="text-[0.8125rem] text-slate-600 font-medium">
            Hourly totals for meter <span className="font-mono text-slate-700">{assignedNodeId || 'Unassigned'}</span>
          </p>
        </div>
        <div className="inline-flex items-center gap-2 text-[0.8125rem] text-slate-600 bg-white border border-line ring-1 ring-black/[0.03] px-3.5 py-2 rounded-control font-medium">
          <Calendar className="w-3.5 h-3.5 text-slate-600" />
          <span>Last 24 hours</span>
        </div>
      </div>

      {!assignedNodeId ? (
        <Card>
          <EmptyState
            icon={Droplet}
            tone="amber"
            title="No water meter linked yet"
            body="History appears here once BAWASA assigns a meter to your account."
          />
        </Card>
      ) : error ? (
        <Alert
          tone="rose"
          action={
            <button onClick={() => setReloadKey((k) => k + 1)} className="inline-flex items-center gap-1 text-[0.8125rem] font-semibold underline shrink-0">
              <RefreshCw className="w-3 h-3" /> Retry
            </button>
          }
        >
          {error}
        </Alert>
      ) : (
        <>
          {/* 2. Summary tiles */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatTile label="Total used" value={totalLiters.toFixed(1)} unit="L" hint="Past 24 hours" loading={isLoading} />
            <StatTile label="Billing volume" value={totalM3.toFixed(3)} unit="m³" hint="1 m³ = 1,000 L" tone="sky" loading={isLoading} />
            <StatTile
              label="Busiest hour"
              value={peakRecord ? formatHour(peakRecord.hour_timestamp) : '--:--'}
              hint={peakRecord ? `${Number(peakRecord.total_volume_liters).toFixed(1)} L used` : 'No data yet'}
              tone="amber"
              loading={isLoading}
            />
            <StatTile label="Hourly average" value={avgHourlyLiters.toFixed(1)} unit="L/hr" tone="emerald" loading={isLoading} />
          </div>

          {/* 3. Hourly chart */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-sky-600" /> Hourly usage
              </h3>
              <div className="flex items-center gap-3 text-[0.8125rem] text-slate-600">
                <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-sky-500" />Usage</span>
                <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-rose-500" />Leak flagged</span>
              </div>
            </div>

            {isLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : bars.length === 0 ? (
              <EmptyState
                icon={TrendingUp}
                tone="slate"
                title="No hourly data yet"
                body="Your first hourly summary appears after your meter completes a full hour of readings."
              />
            ) : (
              <div>
                {/* Readout for tapped / hovered bar (works on touch screens) */}
                <div className="h-6 mb-1 text-[0.8125rem] font-mono text-slate-600">
                  {selected ? (
                    <>
                      <span className="font-semibold text-slate-900">{formatHour(selected.hour_timestamp)}</span>
                      <span className="text-slate-300"> • </span>
                      {Number(selected.total_volume_liters).toFixed(1)} L
                      <span className="text-slate-300"> • </span>
                      peak {Number(selected.peak_flow_rate_lpm).toFixed(2)} LPM
                    </>
                  ) : (
                    <span className="text-slate-600 font-sans">Tap a bar to see that hour</span>
                  )}
                </div>

                <div className="relative">
                  {/* Gridlines */}
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none" aria-hidden="true">
                    {[maxBarValue, maxBarValue / 2, 0].map((v, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="w-9 text-right text-[0.8125rem] font-mono text-slate-600">{v.toFixed(0)}</span>
                        <div className="flex-1 border-t border-dashed border-black/[0.06]" />
                      </div>
                    ))}
                  </div>

                  <div className="relative h-44 pl-11 flex items-end gap-1">
                    {bars.map((row, idx) => {
                      const liters = Number(row.total_volume_liters) || 0;
                      const heightPercent = Math.max(3, Math.round((liters / maxBarValue) * 100));
                      const hasLeak = Number(row.leak_flag_count) > 0;
                      const isSel = selectedIdx === idx;
                      const isPeak = peakRecord && row === peakRecord;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setSelectedIdx(isSel ? null : idx)}
                          onMouseEnter={() => setSelectedIdx(idx)}
                          aria-label={`${formatHour(row.hour_timestamp)}: ${liters.toFixed(1)} liters`}
                          className="flex-1 min-w-0 h-full flex items-end group focus:outline-none"
                        >
                          <div
                            className={`w-full rounded-t transition ${
 hasLeak ? 'bg-rose-500': isSel || isPeak ? 'bg-slate-900': 'bg-sky-500 group-hover:bg-sky-600'
 } ${isSel ? 'ring-2 ring-slate-900/20': ''}`}
                            style={{ height: `${heightPercent}%` }}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-between text-[0.8125rem] font-mono text-slate-600 pl-11 pt-2">
                  {axisLabels.map((l, i) => <span key={i}>{l}</span>)}
                </div>
                <p className="text-[0.8125rem] text-slate-600 mt-2 pl-11">Liters per hour. Darkest bar marks your busiest hour.</p>
              </div>
            )}
          </Card>

          {/* 4. Detail records */}
          <Card className="overflow-hidden">
            <div className="p-4 border-b border-black/[0.05] flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Table className="w-4 h-4 text-slate-600" /> Hourly records
              </h3>
              <span className="text-[0.8125rem] text-slate-600 font-mono">{history.length} records</span>
            </div>

            {isLoading ? (
              <div className="p-4 space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : history.length === 0 ? (
              <p className="p-8 text-center text-[0.8125rem] text-slate-600">No records yet.</p>
            ) : (
              <>
                {/* Mobile: compact list */}
                <ul className="md:hidden divide-y divide-black/[0.05]">
                  {[...history].reverse().map((row) => (
                    <li key={row.summary_id || row.hour_timestamp} className="p-4 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-mono font-semibold text-slate-900">{row.hour_timestamp}</div>
                        <div className="text-[0.8125rem] text-slate-600 mt-0.5 font-mono">
                          peak {Number(row.peak_flow_rate_lpm).toFixed(2)} LPM
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-mono font-semibold text-sky-700">{Number(row.total_volume_liters).toFixed(2)} L</div>
                        {Number(row.leak_flag_count) > 0 && (
                          <span className="inline-flex items-center gap-1 text-[0.8125rem] text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full font-semibold mt-1">
                            <AlertTriangle className="w-3 h-3" /> {row.leak_flag_count} flagged
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>

                {/* Desktop: table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-[0.8125rem]">
                    <thead className="bg-slate-50 border-b border-black/[0.05]">
                      <tr className="text-slate-600">
                        {['Hour', 'Volume', 'Peak flow', 'Meter reading', 'Alerts'].map((h, i) => (
                          <th key={h} className={`p-3 text-[0.8125rem] font-semibold ${i === 0 ? 'pl-4': ''} ${i === 4 ? 'pr-4 text-right': ''}`}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/[0.05] text-slate-700">
                      {history.map((row) => (
                        <tr key={row.summary_id || row.hour_timestamp} className="hover:bg-slate-50/60 transition">
                          <td className="p-3 pl-4 font-mono font-medium text-slate-900">{row.hour_timestamp}</td>
                          <td className="p-3 font-mono font-semibold text-sky-700">{Number(row.total_volume_liters).toFixed(2)} L</td>
                          <td className="p-3 font-mono">{Number(row.peak_flow_rate_lpm).toFixed(2)} LPM</td>
                          <td className="p-3 font-mono text-slate-600">{Number(row.cumulative_meter_reading || 0).toFixed(1)} L</td>
                          <td className="p-3 pr-4 text-right">
                            {Number(row.leak_flag_count) > 0 ? (
                              <span className="inline-flex items-center gap-1 text-[0.8125rem] text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full font-semibold">
                                <AlertTriangle className="w-3 h-3" /> {row.leak_flag_count}
                              </span>
                            ) : (
                              <span className="text-[0.8125rem] text-slate-600">None</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

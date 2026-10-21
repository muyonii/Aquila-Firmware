import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';
import { useTelemetryStore } from '../../stores/useTelemetryStore';
import { residentApi } from '../../api/resident_api';

import SvgNeedleGauge from '../../components/gauges/SvgNeedleGauge';
import FlowSparkline from '../../components/gauges/FlowSparkline';
import BatteryIndicator from '../../components/gauges/BatteryIndicator';
import {
  Alert,
  Card,
  Eyebrow,
  IconTile,
  Label,
  Skeleton,
  btnAccent,
  btnDanger
} from '../../components/portal/ui';

import {
  Droplets,
  Gauge,
  ArrowRight,
  Activity,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Waves,
  RefreshCw,
  Wrench
} from 'lucide-react';

export default function WaterUsagePage() {
  const user = useAuthStore((state) => state.user);
  const assignedNodeId = user?.assigned_node_id;

  const { getNode } = useTelemetryStore();
  const nodeState = getNode(assignedNodeId);
  const telemetry = nodeState?.telemetry;
  const history = nodeState?.history || [];
  const leakHypothesis = nodeState?.leak;
  const fairnessHypothesis = nodeState?.fairness;

  const [coldData, setColdData] = useState(null);
  const [isLoadingCold, setIsLoadingCold] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  // 1-second clock to evaluate 45s telemetry staleness accurately
  const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const timer = setInterval(
      () => setNowSec(Math.floor(Date.now() / 1000)),
      1000
    );
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadWaterData() {
      try {
        setIsLoadingCold(true);
        const res = await residentApi.getMyWater();
        if (isMounted) {
          setColdData(res.data);
          setFetchError(null);
        }
      } catch (err) {
        if (isMounted) {
          setFetchError(
            err.response?.data?.error?.message ||
              'Failed to load household summary.'
          );
        }
      } finally {
        if (isMounted) setIsLoadingCold(false);
      }
    }

    if (assignedNodeId) loadWaterData();
    return () => {
      isMounted = false;
    };
  }, [assignedNodeId, reloadKey]);

  // Evaluate 45-second stale cutoff (Rule INV-04)
  const rawTs = Number(telemetry?.timestamp || 0);
  const ts = rawTs > 1e11 ? Math.floor(rawTs / 1000) : rawTs;
  const isFresh = ts > 0 && Math.max(0, nowSec - ts) <= 45;
  const isStale = !isFresh;

  // Only show live flow if packet is fresh (<= 45s); otherwise clamp gauge to 0.00
  const currentFlowLpm = isFresh ? Number(telemetry?.flow_rate_lpm) || 0.0 : 0.0;
  const totalLiters24h = Number(coldData?.total_24h_liters) || 0.0;
  const totalCubicMeters24h =
    Number(coldData?.total_24h_m3) || totalLiters24h / 1000;
  const batteryVolts = Number(telemetry?.battery_voltage) || 4.12;

  const isMaintenance =
    nodeState?.status === 'MAINTENANCE' ||
    coldData?.node_status === 'MAINTENANCE';
  const isCriticalLeak = isFresh && leakHypothesis?.classification === 'LEAK';
  const isSuspicious =
    isFresh && leakHypothesis?.classification === 'SUSPICIOUS';
  const isEquityDeficit =
    isFresh && Boolean(fairnessHypothesis?.is_disadvantaged);

  // Household Baseline Profile (Table 3.5)
  const baselineDailyLiters =
    Number(coldData?.baseline_profile?.mean_daily_volume_liters) || 350.0;
  const baselinePercent = Math.min(
    100,
    Math.round((totalLiters24h / baselineDailyLiters) * 100)
  );

  const firstName =
    user?.first_name || user?.full_name?.split(' ')[0] || 'Resident';
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const getSupplyStatus = () => {
    if (isMaintenance) {
      return {
        label: 'Technician servicing your line (Maintenance Mode)',
        description:
          'A BAWASA field plumber is currently working on your water meter or street branch. Automated leak alarms are temporarily paused.',
        wrap: 'bg-amber-50/90 border-amber-200 text-amber-950',
        tone: 'amber',
        icon: Wrench
      };
    }
    if (isCriticalLeak) {
      return {
        label: 'Possible leak detected at your property',
        description:
          'Water has been flowing continuously at high velocity. Check faucets, toilet tanks, and the area around your meter box.',
        wrap: 'bg-rose-50/90 border-rose-200 text-rose-950',
        tone: 'rose',
        icon: ShieldAlert,
        showReport: true
      };
    }
    if (isSuspicious) {
      return {
        label: 'Unusual continuous water draw noticed',
        description:
          'Your meter has been running without a pause. Please check if a tap or toilet flapper was left open.',
        wrap: 'bg-amber-50/90 border-amber-200 text-amber-950',
        tone: 'amber',
        icon: AlertTriangle,
        showReport: true
      };
    }
    if (isEquityDeficit) {
      return {
        label: 'Low water supply pressure detected in your zone',
        description:
          'Your household is receiving less water than the neighborhood average. BAWASA has been notified to check upstream valves.',
        wrap: 'bg-sky-50/90 border-sky-200 text-sky-950',
        tone: 'sky',
        icon: AlertTriangle
      };
    }
    if (isStale) {
      return {
        label: 'Meter sensor is idle (No active stream >45s)',
        description:
          'Your 24-hour billing history below is up to date. Real-time needle readings resume automatically when the sensor transmits.',
        wrap: 'bg-slate-100/90 border-slate-200 text-slate-800',
        tone: 'slate',
        icon: Activity
      };
    }
    if (currentFlowLpm > 0.05) {
      return {
        label: 'Water is running',
        description:
          'Normal household water use is currently being measured at your meter.',
        wrap: 'bg-sky-50/80 border-sky-200 text-sky-900',
        tone: 'sky',
        icon: Activity
      };
    }
    return {
      label: 'All clear — Pipe is quiescent',
      description:
        'Supply pressure is normal and no water is currently running through your meter.',
      wrap: 'bg-emerald-50/80 border-emerald-200 text-emerald-900',
      tone: 'emerald',
      icon: CheckCircle2
    };
  };

  const status = getSupplyStatus();
  const StatusIcon = status.icon;
  const iconColor = {
    rose: 'text-rose-600',
    amber: 'text-amber-600',
    sky: 'text-sky-600',
    emerald: 'text-emerald-600',
    slate: 'text-slate-600'
  }[status.tone];

  const flowClass = isStale
    ? 'Meter Idle (>45s)'
    : currentFlowLpm <= 0.05
    ? 'Still (0.00 LPM)'
    : currentFlowLpm <= 4.5
    ? 'Normal use'
    : 'High flow';

  const flowChip = isStale
    ? 'bg-slate-100 text-slate-600 border-slate-200'
    : currentFlowLpm <= 0.05
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : currentFlowLpm <= 4.5
    ? 'bg-sky-50 text-sky-700 border-sky-200'
    : 'bg-amber-50 text-amber-800 border-amber-200';

  if (!assignedNodeId) {
    return (
      <Card className="p-8 text-center max-w-md mx-auto mt-6">
        <IconTile
          icon={AlertTriangle}
          tone="amber"
          className="w-12 h-12 rounded-card mx-auto"
        />
        <h2 className="text-base font-semibold text-slate-900 mt-3">
          No water meter linked yet
        </h2>
        <p className="text-[0.8125rem] text-slate-600 mt-1">
          Your account isn&apos;t connected to a meter. Please contact your BAWASA administrator to get it assigned.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {/* 1. Greeting + Household Identity */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <Eyebrow>{coldData?.purok_cluster || 'Purok 2'} Cluster</Eyebrow>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            {greeting}, {firstName}
          </h1>
          <p className="text-[0.8125rem] text-slate-600 font-medium">
            {coldData?.household_label || 'Household meter'}{' '}
            <span className="text-slate-300">•</span>{' '}
            <span className="font-mono font-semibold text-slate-700">
              {assignedNodeId}
            </span>
            {coldData?.location_name && (
              <>
                {' '}
                <span className="text-slate-300">•</span>{' '}
                <span>{coldData.location_name}</span>
              </>
            )}
          </p>
        </div>
        <BatteryIndicator voltage={batteryVolts} />
      </div>

      {/* 2. Supply Status Banner */}
      <div className={`p-4 sm:p-5 rounded-card border ${status.wrap}`} role="status">
        <div className="flex items-start gap-3.5">
          <StatusIcon className={`w-6 h-6 mt-0.5 shrink-0 ${iconColor}`} />
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold">{status.label}</h2>
            <p className="text-sm opacity-90 mt-0.5">{status.description}</p>
          </div>
        </div>
        {status.showReport && (
          <Link
            to="/my-reports"
            className={`${btnDanger} w-full sm:w-auto mt-4`}
          >
            <span>Report this leak</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        )}
      </div>

      {fetchError && (
        <Alert
          tone="amber"
          action={
            <button
              onClick={() => setReloadKey((k) => k + 1)}
              className="inline-flex items-center gap-1 text-[0.8125rem] font-semibold underline shrink-0"
            >
              <RefreshCw className="w-3 h-3" /> Retry
            </button>
          }
        >
          {fetchError} Live readings below still work.
        </Alert>
      )}

      {/* 3. Live Gauge & 24h Volume + Baseline Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Live Flow Card */}
        <Card className="p-5 flex flex-col">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <IconTile icon={Gauge} tone="sky" />
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Live flow</h3>
                <p className="text-[0.8125rem] text-slate-600">
                  15-second sensor cadence (45s timeout)
                </p>
              </div>
            </div>
            <span
              className={`text-[0.8125rem] font-semibold px-2.5 py-1 rounded-full border ${flowChip}`}
            >
              {flowClass}
            </span>
          </div>

          <div className="py-4 flex justify-center">
            <SvgNeedleGauge
              value={currentFlowLpm}
              max={10.0}
              size={230}
              label="Liters per minute"
            />
          </div>

          <div className="mt-auto pt-3 border-t border-black/[0.05]">
            <div className="flex items-center justify-between text-[0.8125rem] mb-1.5">
              <Label>Recent session trend</Label>
              <span className="text-slate-600 font-mono">
                {history.length} readings
              </span>
            </div>
            <div className="w-full flex justify-center">
              <FlowSparkline
                data={history}
                height={42}
                isLeak={isCriticalLeak}
              />
            </div>
          </div>
        </Card>

        {/* 24h Volume & Household Baseline Comparison (Table 3.5) */}
        <Card className="p-5 flex flex-col">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <IconTile icon={Waves} tone="indigo" />
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Last 24 hours
                </h3>
                <p className="text-[0.8125rem] text-slate-600">
                  Compacted hourly totals from your meter
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 space-y-3 flex-1">
            <div className="p-4 rounded-control bg-slate-50 border border-black/[0.04]">
              <Label>Water used (24h)</Label>
              {isLoadingCold ? (
                <Skeleton className="h-9 w-32 mt-2" />
              ) : (
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-semibold text-slate-900 font-mono">
                    {totalLiters24h.toFixed(1)}
                  </span>
                  <span className="text-sm font-semibold text-slate-600">
                    liters
                  </span>
                </div>
              )}

              {/* Maynilad-Style Daily Baseline Progress Bar (Table 3.5) */}
              {!isLoadingCold && (
                <div className="mt-3 pt-2.5 border-t border-slate-200/70 space-y-1.5">
                  <div className="flex justify-between text-[0.8125rem]">
                    <span className="text-slate-600">
                      vs. Household Daily Average ({baselineDailyLiters.toFixed(0)} L)
                    </span>
                    <span className="font-mono font-semibold text-slate-700">
                      {baselinePercent}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
 baselinePercent > 95
 ? 'bg-amber-500'
 : 'bg-[#0369a1]'
 }`}
                      style={{ width: `${baselinePercent}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 rounded-control bg-sky-50/70 border border-sky-100">
              <Label className="!text-sky-700">Billing volume</Label>
              {isLoadingCold ? (
                <Skeleton className="h-8 w-28 mt-2" />
              ) : (
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-semibold text-sky-900 font-mono">
                    {totalCubicMeters24h.toFixed(3)}
                  </span>
                  <span className="text-[0.8125rem] font-semibold text-sky-700">m³</span>
                </div>
              )}
              <p className="text-[0.8125rem] text-sky-800/70 mt-1">
                1 m³ = 1,000 liters. BAWASA billing is calculated per cubic meter.
              </p>
            </div>
          </div>

          <Link
            to="/history"
            className="mt-4 inline-flex items-center gap-1.5 text-[0.8125rem] font-semibold text-slate-600 hover:text-slate-900 self-start"
          >
            See hourly breakdown <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </Card>
      </div>

      {/* 4. Report an Issue CTA */}
      <div className="bg-slate-900 text-white p-5 rounded-card flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex items-start gap-3">
          <Droplets className="w-5 h-5 text-sky-400 mt-0.5 shrink-0" />
          <div>
            <h4 className="text-sm font-semibold">Having a water problem?</h4>
            <p className="text-[0.8125rem] text-slate-600 mt-0.5 max-w-sm">
              Report a leak, low pressure, or meter concern and a BAWASA technician will be dispatched.
            </p>
          </div>
        </div>
        <Link to="/my-reports" className={`${btnAccent} w-full sm:w-auto`}>
          <span>Report an issue</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
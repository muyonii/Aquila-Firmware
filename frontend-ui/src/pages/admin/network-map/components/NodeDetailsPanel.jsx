// frontend-ui/src/pages/admin/network-map/components/NodeDetailsPanel.jsx
import React, { useState, useEffect } from 'react';
import {
  X,
  Wrench,
  Droplets,
  Battery,
  Activity,
  Radio,
  Wifi,
  WifiOff,
  Scale,
  RefreshCw
} from 'lucide-react';

const FIREBASE_URL =
  import.meta.env.VITE_FIREBASE_DATABASE_URL ||
  'https://aquila-system-default-rtdb.asia-southeast1.firebasedatabase.app';

export default function NodeDetailsPanel({ node, onClose, onToggleMaintenance }) {
  if (!node) return null;

  const [telemetry, setTelemetry] = useState(null);
  const [leakHypothesis, setLeakHypothesis] = useState(null);
  const [fairnessHypothesis, setFairnessHypothesis] = useState(null);
  const [loadingTelemetry, setLoadingTelemetry] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // 1. Fetch Real-Time Firebase Snapshots (Telemetry + Agent Blackboard)
  const fetchLiveTelemetry = async () => {
    try {
      const [telemRes, leakRes, fairRes] = await Promise.all([
        fetch(`${FIREBASE_URL}/nodes/${node.id}/telemetry.json`),
        fetch(`${FIREBASE_URL}/blackboard/hypotheses/leak/${node.id}.json`),
        fetch(`${FIREBASE_URL}/blackboard/hypotheses/fairness/${node.id}.json`)
      ]);

      const [telemData, leakData, fairData] = await Promise.all([
        telemRes.json(),
        leakRes.json(),
        fairRes.json()
      ]);

      setTelemetry(telemData);
      setLeakHypothesis(leakData);
      setFairnessHypothesis(fairData);
    } catch (err) {
      console.warn('[NodeDetailsPanel] Failed fetching live Firebase telemetry:', err);
    } finally {
      setLoadingTelemetry(false);
    }
  };

  // Poll Firebase every 3 seconds while panel is open
  useEffect(() => {
    setLoadingTelemetry(true);
    fetchLiveTelemetry();
    const interval = setInterval(fetchLiveTelemetry, 3000);
    return () => clearInterval(interval);
  }, [node.id]);

  // 2. Computed Real Telemetry Metrics
  const now = Math.floor(Date.now() / 1000);
  const packetAge = telemetry?.timestamp ? now - telemetry.timestamp : null;
  const isOnline = packetAge !== null && packetAge <= 45; // 45s stale threshold
  const flowRate = typeof telemetry?.flow_rate_lpm === 'number' ? telemetry.flow_rate_lpm : 0.0;
  const totalLiters = typeof telemetry?.cumulative_liters === 'number' ? telemetry.cumulative_liters : 0.0;
  const totalM3 = (totalLiters / 1000.0).toFixed(3);
  const batteryVolts = typeof telemetry?.battery_voltage === 'number' ? telemetry.battery_voltage : null;
  const isLowBattery = batteryVolts !== null && batteryVolts <= 3.35;

  const handleMaintenanceClick = async () => {
    setIsUpdatingStatus(true);
    await onToggleMaintenance(node);
    setIsUpdatingStatus(false);
  };

  return (
    <aside
      className="absolute top-6 bottom-6 right-6 w-full sm:w-[380px] z-40 bg-white rounded-card border border-line shadow-soft p-6 overflow-y-auto flex flex-col justify-between select-none font-sans animate-in slide-in-from-right duration-200 [scrollbar-width:thin]"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="space-y-5">
        
        {/* Header Lockup */}
        <div className="flex items-center justify-between pb-2 border-b border-black/[0.05]">
          <span className="text-[0.8125rem] font-mono font-semibold text-slate-600 flex items-center gap-1.5">
            <Radio className="h-3 w-3 text-[#0c4a6e]" />
            <span>Live Node Telemetry</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-black/[0.05] text-slate-600 hover:text-slate-800 transition-colors cursor-pointer"
            title="Close (Esc)"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Node Title & Hardware Identification */}
        <div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
 node.isLeaking()
 ? 'bg-rose-500 animate-ping'
 : node.isMaintenance()
 ? 'bg-amber-500'
 : 'bg-emerald-500'
 }`}
              />
              <h3 className="text-base font-semibold text-slate-900 leading-tight">
                {node.label}
              </h3>
            </div>
            
            {/* Live Connection Light */}
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[0.8125rem] font-mono font-semibold ${
 isOnline
 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
 : 'bg-slate-100 text-slate-600 border border-slate-200'
 }`}
            >
              {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              <span>{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
            </span>
          </div>

          <p className="text-[0.8125rem] font-mono text-slate-600 mt-1">
            {node.id} • {node.cluster}
          </p>
        </div>

        {/* Inset Card 1: Live Sensor Stream (Firebase RTDB) */}
        <div className="aq-surface rounded-card p-4 border border-line shadow-2xs space-y-3">
          <div className="flex items-center justify-between text-[0.8125rem]">
            <span className="font-semibold text-slate-800 flex items-center gap-1.5">
              <Droplets className="h-3.5 w-3.5 text-[#0c4a6e]" />
              <span>Real-Time Sensor Flow</span>
            </span>
            {packetAge !== null && (
              <span className="text-[0.8125rem] font-mono text-slate-600">
                {packetAge}s ago
              </span>
            )}
          </div>

          {loadingTelemetry ? (
            <div className="py-4 text-center text-[0.8125rem] text-slate-600 flex items-center justify-center gap-2">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              <span>Connecting to Firebase stream...</span>
            </div>
          ) : telemetry ? (
            <div className="space-y-2 text-[0.8125rem]">
              {/* Instantaneous Flow Velocity */}
              <div className="flex justify-between items-center py-1 border-b border-black/[0.04]">
                <span className="text-slate-600">Flow Velocity</span>
                <span className="font-mono font-semibold text-slate-900">
                  {flowRate.toFixed(2)} L/min
                </span>
              </div>

              {/* Odometer Consumption */}
              <div className="flex justify-between items-center py-1 border-b border-black/[0.04]">
                <span className="text-slate-600">Total Odometer</span>
                <span className="font-mono font-semibold text-slate-800">
                  {totalLiters.toFixed(1)} L ({totalM3} m³)
                </span>
              </div>

              {/* Battery Voltage */}
              {batteryVolts !== null && (
                <div className="flex justify-between items-center py-1 border-b border-black/[0.04]">
                  <span className="text-slate-600 flex items-center gap-1">
                    <Battery className={`h-3 w-3 ${isLowBattery ? 'text-rose-500': 'text-slate-600'}`} />
                    <span>Battery Voltage</span>
                  </span>
                  <span
                    className={`font-mono font-semibold ${
 isLowBattery ? 'text-rose-600 font-semibold': 'text-slate-800'
 }`}
                  >
                    {batteryVolts.toFixed(2)} V {isLowBattery && '(Low Battery)'}
                  </span>
                </div>
              )}

              {/* Provenance */}
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-600">Sensor Provenance</span>
                <span className="font-medium text-slate-700">
                  {telemetry.is_simulated ? 'Software Simulator' : 'Physical ESP32 Turbine'}
                </span>
              </div>
            </div>
          ) : (
            <div className="py-3 text-center text-[0.8125rem] text-slate-600">
              No telemetry packet broadcast yet.
            </div>
          )}
        </div>

        {/* Inset Card 2: AI Multi-Agent Hypotheses (Blackboard) */}
        <div className="aq-surface rounded-card p-4 border border-line shadow-2xs space-y-2.5 text-[0.8125rem]">
          <span className="font-semibold text-slate-800 block text-[0.8125rem] ">
            Agent Intelligence (Blackboard)
          </span>

          <div className="space-y-2">
            {/* Leak Agent Classification */}
            <div className="flex justify-between items-center py-1 border-b border-black/[0.04]">
              <span className="text-slate-600 flex items-center gap-1">
                <Activity className="h-3 w-3 text-slate-600" />
                <span>Leak Classification</span>
              </span>
              <span
                className={`font-semibold ${
 leakHypothesis?.classification === 'LEAK'
 ? 'text-rose-600 font-semibold'
 : leakHypothesis?.classification === 'SUSPICIOUS'
 ? 'text-amber-600'
 : 'text-emerald-700'
 }`}
              >
                {leakHypothesis?.classification || 'NORMAL'}
              </span>
            </div>

            {/* Fairness Agent RDI Score */}
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-600 flex items-center gap-1">
                <Scale className="h-3 w-3 text-slate-600" />
                <span>Fairness Share (RDI)</span>
              </span>
              <span
                className={`font-mono font-semibold ${
 fairnessHypothesis?.is_disadvantaged
 ? 'text-amber-600 font-semibold'
 : 'text-slate-800'
 }`}
              >
                {fairnessHypothesis?.rdi_score
                  ? `${fairnessHypothesis.rdi_score} ${fairnessHypothesis.is_disadvantaged ? '(Deficit)' : '(Fair)'}`
                  : '1.00 (Equitable)'}
              </span>
            </div>
          </div>
        </div>

        {/* Inset Card 3: Pipe Line Feeder & GPS */}
        <div className="aq-surface rounded-card p-4 border border-line shadow-2xs space-y-2 text-[0.8125rem]">
          <div className="flex justify-between items-center">
            <span className="text-slate-600">Parent Feeder Pipe</span>
            <span className="font-mono text-[#0c4a6e] font-semibold">
              {node.parentId || 'Primary Feeder Header'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-600">GPS Coordinates</span>
            <span className="font-mono text-slate-700">
              {node.lat.toFixed(4)}, {node.lng.toFixed(4)}
            </span>
          </div>
        </div>

        {/* Operational Maintenance Mode Toggle */}
        <div className="pt-1">
          <button
            type="button"
            onClick={handleMaintenanceClick}
            disabled={isUpdatingStatus}
            className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-control text-[0.8125rem] font-semibold transition-all cursor-pointer disabled:opacity-50 ${
 node.isMaintenance()
 ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
 : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200'
 }`}
          >
            {isUpdatingStatus ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Wrench className="h-3.5 w-3.5" />
            )}
            <span>
              {node.isMaintenance()
                ? 'Restore to Active Streaming'
                : 'Set to Maintenance Mode'}
            </span>
          </button>
          <p className="text-[0.8125rem] text-slate-600 mt-2 text-center leading-normal">
            Switching to Maintenance silences AI alerts while plumbers service pipe fittings.
          </p>
        </div>

      </div>

      {/* Footer */}
      <div className="pt-4 border-t border-black/[0.05] text-[10.5px] text-slate-600 text-center font-mono">
        Registered: {node.installedAt}
      </div>
    </aside>
  );
}
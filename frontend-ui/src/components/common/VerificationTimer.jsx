import React, { useState, useEffect } from 'react';
import { useTaskStore } from '../../stores/useTaskStore';
import { useTelemetryStore } from '../../stores/useTelemetryStore';
import { THRESHOLDS } from '../../config/thresholds';
import { Clock, CheckCircle2, AlertTriangle, Activity, RefreshCw } from 'lucide-react';

/**
 * VerificationTimer Component (Rule BR-07)
 * Monitors 15-minute post-repair quiescent flow and provides a demo fast-track trigger.
 */
export default function VerificationTimer({ 
  taskId, 
  nodeId, 
  pendingSince,
  onStatusChange 
}) {
  const checkVerification = useTaskStore((state) => state.checkVerification);
  const nodeState = useTelemetryStore((state) => state.getNode(nodeId));
  const currentFlow = Number(nodeState?.telemetry?.flow_rate_lpm) || 0.0;

  const totalWindow = THRESHOLDS.REPAIR_VERIFICATION_SECONDS || 900; // 15-minute window
  const quiescentFloor = THRESHOLDS.QUIESCENT_FLOW_FLOOR_LPM || 0.05; // 0.05 LPM seal floor
  const mechanicalFloor = THRESHOLDS.MECHANICAL_SENSOR_FLOOR_LPM || 1.0; // 1.0 LPM burst floor

  const calculateElapsed = () => {
    if (!pendingSince) return 0;
    const sinceEpoch = Math.floor(new Date(pendingSince).getTime() / 1000);
    const nowEpoch = Math.floor(Date.now() / 1000);
    return Math.max(0, nowEpoch - sinceEpoch);
  };

  const [elapsed, setElapsed] = useState(calculateElapsed());
  const [isEvaluating, setIsEvaluating] = useState(false);

  // 1. Tick 1 second timer locally
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const remaining = Math.max(0, totalWindow - elapsed);
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const progressPercent = Math.min(100, Math.round((elapsed / totalWindow) * 100));

  // 2. Verification Evaluator Action (Supports Demo Fast-Track)
  const handleEvaluateFlow = async (forceTimeWarp = false) => {
    setIsEvaluating(true);
    try {
      // If clicking "Verify Now", simulate that 900 seconds have elapsed
      const evalElapsed = forceTimeWarp ? 900 : elapsed;

      const res = await checkVerification(taskId, {
        current_flow_rate_lpm: currentFlow,
        elapsed_seconds: evalElapsed
      });

      if (res?.status && res.status !== 'PENDING_VERIFICATION') {
        if (onStatusChange) onStatusChange(res.status);
      }
    } catch (err) {
      console.error('[Evaluation Error]:', err.message);
    } finally {
      setIsEvaluating(false);
    }
  };

  // Auto-evaluate when time expires or if a burst occurs
  useEffect(() => {
    if (currentFlow >= mechanicalFloor) handleEvaluateFlow(false);
    if (elapsed >= totalWindow) handleEvaluateFlow(false);
  }, [currentFlow, elapsed]);

  const isQuiescent = currentFlow <= quiescentFloor;
  const isBurst = currentFlow >= mechanicalFloor;

  return (
    <div className="bg-white p-5 rounded-md border border-slate-200 space-y-4 font-sans select-none">
      
      {/* Header Bar + Demo Fast-Track Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Clock className="w-4 h-4 text-slate-600 shrink-0 stroke-[1.75]" />
          <div>
            <h4 className="text-sm font-semibold text-slate-900">Post-Repair Verification (BR-07)</h4>
            <p className="text-sm text-slate-600">15-minute quiescent line observation window</p>
          </div>
        </div>

        {/* Demo Fast-Track Button */}
        <button
          type="button"
          onClick={() => handleEvaluateFlow(true)}
          disabled={isEvaluating}
          className="inline-flex items-center gap-1.5 h-8 px-3 text-sm font-semibold text-[#0c4a6e] hover:text-[#075985] bg-white hover:bg-slate-50 rounded-md border border-slate-300 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[#0c4a6e]"
          title="Simulate 15-minute passage for thesis demonstration"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isEvaluating ? 'animate-spin': ''}`} />
          <span>Verify Now (Demo)</span>
        </button>
      </div>

      {/* Counter & Flow — flat dark row */}
      <div className="border border-slate-200 rounded-md bg-slate-50 p-4 flex items-center justify-between">
        <div>
          <span className="text-sm text-slate-600 block">Observation Timer</span>
          <span className="text-[32px] leading-tight font-semibold font-mono tabular-nums text-slate-900">
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </span>
        </div>
        <div className="text-right">
          <span className="text-sm text-slate-600 block">Observed Flow</span>
          <span className={`text-[32px] leading-tight font-semibold font-mono tabular-nums ${
 isBurst ? 'text-rose-600': isQuiescent ? 'text-emerald-600': 'text-amber-600'
 }`}>
            {currentFlow.toFixed(2)} <span className="text-sm font-semibold text-slate-600">LPM</span>
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5">
        <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#0c4a6e] transition-all duration-1000 ease-linear"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex justify-between text-[0.8125rem] text-slate-600 font-mono">
          <span>0m (Start)</span>
          <span>{progressPercent}% Elapsed</span>
          <span>15m (Auto-Close)</span>
        </div>
      </div>

      {/* Status Messages */}
      {isBurst ? (
        <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-md text-sm text-rose-900 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold block">Verification Warning: Flow Recurrent (&ge; {mechanicalFloor} LPM)</span>
            <p className="text-sm leading-relaxed text-rose-800 mt-0.5">
              Flow came back during the observation window. Re-check the seal and submit again.
            </p>
          </div>
        </div>
      ) : isQuiescent ? (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-md text-sm text-emerald-900 flex items-center gap-2">
          <span className="text-emerald-600" aria-hidden="true">●</span>
          <span>Flow quiescent (&le; {quiescentFloor} LPM) — pipe seal holding.</span>
        </div>
      ) : (
        <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-md text-sm text-amber-900 flex items-center gap-2">
          <span className="text-amber-600" aria-hidden="true">●</span>
          <span>Active flow detected ({currentFlow.toFixed(2)} LPM) — awaiting quiescent floor.</span>
        </div>
      )}
    </div>
  );
}
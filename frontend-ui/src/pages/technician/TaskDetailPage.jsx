import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ref, set } from 'firebase/database';
import { rtdb } from '../../firebase/firebase_config';
import { useTaskStore } from '../../stores/useTaskStore';
import { useTelemetryStore } from '../../stores/useTelemetryStore';
import { rtdbSubscription } from '../../firebase/rtdb_subscription';

import ActionCard from '../../components/common/ActionCard';
import StatusBadge from '../../components/common/StatusBadge';
import VerificationTimer from '../../components/common/VerificationTimer';
import BatteryIndicator from '../../components/gauges/BatteryIndicator';
import {
  Alert,
  Card,
  IconTile,
  Label,
  Skeleton,
  btnAccent,
  btnPrimary,
  btnSecondary,
  inputClass
} from '../../components/portal/ui';

import {
  ArrowLeft,
  Navigation,
  CheckCircle2,
  Wrench,
  AlertTriangle,
  Droplets,
  Check,
  ShieldCheck,
  MapPin,
  History,
  Lock
} from 'lucide-react';

const SAFETY_ISOLATION_CHECKS = [
  {
    id: 'verify_meter',
    label: 'Located meter box & verified physical node ID tag'
  },
  {
    id: 'close_valve',
    label: 'Closed local upstream isolation gate valve to stop water loss (INV-01)'
  },
  {
    id: 'expose_pipe',
    label: 'Depressurized line & exposed damaged pipe coupling / fitting'
  }
];

const COMMON_REPAIR_ACTIONS = [
  'Replaced 3/4" PVC elbow coupling',
  'Tightened brass water meter union',
  'Excavated & clamped subterranean lateral rupture',
  'Replaced gate valve packing seal',
  'Purged sediment blockage from meter chamber'
];

const WORKFLOW_STEPS = [
  '1. En Route',
  '2. On-Site & Isolated',
  '3. Repair Logged',
  '4. 15m Verification',
  '5. Verified Closed'
];

export default function TaskDetailPage() {
  const { id } = useParams();

  const {
    activeTask,
    fetchTaskDetails,
    arriveOnSite,
    submitRepair,
    isLoading,
    error
  } = useTaskStore();
  const { getNode } = useTelemetryStore();

  // Stage 2 & 3 Local Workbench State
  const [arriving, setArriving] = useState(false);
  const [checkedSafety, setCheckedSafety] = useState(() => {
    try {
      const saved = localStorage.getItem(`aquila_safety_${id}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [repairNotes, setRepairNotes] = useState('');
  const [selectedActions, setSelectedActions] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [sealingPipe, setSealingPipe] = useState(false);

  // 1-second clock to evaluate 45s telemetry staleness
  const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const timer = setInterval(
      () => setNowSec(Math.floor(Date.now() / 1000)),
      1000
    );
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchTaskDetails(id).catch(() => {});
  }, [id, fetchTaskDetails]);

  useEffect(() => {
    if (activeTask?.node_id) {
      rtdbSubscription.subscribeResidentNode(activeTask.node_id);
    }
  }, [activeTask?.node_id]);

  const nodeState = getNode(activeTask?.node_id);
  const rawTs = Number(nodeState?.telemetry?.timestamp || 0);
  const ts = rawTs > 1e11 ? Math.floor(rawTs / 1000) : rawTs;
  const isTelemetryFresh = ts > 0 && Math.max(0, nowSec - ts) <= 45;
  const currentFlow = isTelemetryFresh
    ? Number(nodeState?.telemetry?.flow_rate_lpm) || 0.0
    : 0.0;
  const batteryVolts = Number(nodeState?.telemetry?.battery_voltage) || 4.12;

  const isPendingVerification = activeTask?.status === 'PENDING_VERIFICATION';
  const isClosedVerified = activeTask?.status === 'CLOSED_VERIFIED';
  const isFailed = activeTask?.status === 'REPAIR_FAILED';
  const isOnSite =
    activeTask?.node_status === 'MAINTENANCE' ||
    nodeState?.status === 'MAINTENANCE' ||
    isFailed ||
    checkedSafety.length > 0;
  const allSafetyChecked =
    checkedSafety.length === SAFETY_ISOLATION_CHECKS.length;

  // Determine current 5-stage progress index (1 to 5)
  const currentStageIndex = isClosedVerified
    ? 5
    : isPendingVerification
    ? 4
    : allSafetyChecked
    ? 3
    : isOnSite
    ? 2
    : 1;

  // Stage 1 -> Stage 2: Arrive On-Site & Switch Node to MAINTENANCE
  const handleArriveOnSite = async () => {
    setArriving(true);
    try {
      await arriveOnSite(id);
      await fetchTaskDetails(id);
    } catch (err) {
      alert(err.message || 'Failed to check in on-site.');
    } finally {
      setArriving(false);
    }
  };

  // Toggle Stage 2 Safety Isolation Checkboxes
  const toggleSafetyCheck = (checkId) => {
    const exists = checkedSafety.includes(checkId);
    const next = exists
      ? checkedSafety.filter((c) => c !== checkId)
      : [...checkedSafety, checkId];
    setCheckedSafety(next);
    localStorage.setItem(`aquila_safety_${id}`, JSON.stringify(next));
  };

  // Simulate Physical Pipe Clamping (Sets flow to 0.02 LPM in Firebase for 15-min Verification)
  const handleSimulatePipeSeal = async () => {
    if (!activeTask?.node_id) return;
    setSealingPipe(true);
    const now = Math.floor(Date.now() / 1000);
    const nodeId = activeTask.node_id;
    try {
      await Promise.all([
        set(ref(rtdb, `nodes/${nodeId}/telemetry`), {
          node_id: nodeId,
          packet_sequence: Date.now(),
          timestamp: now,
          flow_rate_lpm: 0.02,
          cumulative_liters: Number(
            nodeState?.telemetry?.cumulative_liters || 1540.5
          ),
          battery_voltage: 4.12,
          is_simulated: true
        }),
        set(ref(rtdb, `blackboard/hypotheses/leak/${nodeId}`), {
          node_id: nodeId,
          classification: 'NORMAL',
          academic_classification: 'NORMAL_CONSUMPTION',
          academic_term: 'Sub-Threshold Quiescent Flow',
          display_name: 'Normal Usage',
          leak_probability: 0.05,
          flow_rate_lpm: 0.02,
          timestamp: now
        })
      ]);
      setNowSec(now);
    } catch (err) {
      console.warn('[TaskDetail] Failed to simulate pipe seal:', err.message);
    } finally {
      setSealingPipe(false);
    }
  };

  const toggleAction = (actionText) => {
    const exists = selectedActions.includes(actionText);
    const updated = exists
      ? selectedActions.filter((a) => a !== actionText)
      : [...selectedActions, actionText];
    setSelectedActions(updated);
    setRepairNotes(updated.join('. ') + (updated.length ? '.' : ''));
  };

  const handleSubmitRepair = async (e) => {
    e.preventDefault();
    if (!repairNotes.trim()) {
      setSubmitError('Please describe the repair you performed.');
      return;
    }
    if (!confirming) {
      setSubmitError(null);
      setConfirming(true);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await submitRepair(id, repairNotes);
      localStorage.removeItem(`aquila_safety_${id}`);
      setConfirming(false);
      await fetchTaskDetails(id);
    } catch (err) {
      setSubmitError(err.message || 'Failed to submit repair.');
      setConfirming(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading && !activeTask) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto">
        <Skeleton className="h-10 w-28" />
        <Skeleton className="h-28 w-full rounded-card" />
        <Skeleton className="h-40 w-full rounded-card" />
      </div>
    );
  }

  if (error || !activeTask) {
    return (
      <Card className="p-8 text-center max-w-md mx-auto space-y-3">
        <IconTile
          icon={AlertTriangle}
          tone="rose"
          className="w-12 h-12 rounded-card mx-auto"
        />
        <h3 className="text-sm font-semibold text-slate-900">
          {error || 'Work order not found'}
        </h3>
        <Link to="/tasks" className={`${btnSecondary} inline-flex`}>
          Back to queue
        </Link>
      </Card>
    );
  }

  const mapsUrl =
    activeTask.latitude && activeTask.longitude
      ? `https://www.google.com/maps/dir/?api=1&destination=${activeTask.latitude},${activeTask.longitude}`
      : null;

  const flowTone = !isTelemetryFresh
    ? {
        text: 'text-slate-600',
        chip: 'bg-slate-100 text-slate-600 border-slate-200',
        label: 'Sensor Offline (>45s)'
      }
    : currentFlow <= 0.05
    ? {
        text: 'text-emerald-600',
        chip: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        label: 'Pipe is still (Quiescent)'
      }
    : currentFlow < 1.0
    ? {
        text: 'text-amber-600',
        chip: 'bg-amber-50 text-amber-800 border-amber-200',
        label: 'Water moving'
      }
    : {
        text: 'text-rose-600',
        chip: 'bg-rose-50 text-rose-700 border-rose-200',
        label: 'High leak flow'
      };

  const statusHistory = activeTask.status_history || [];

  return (
    <div className="space-y-4 max-w-2xl mx-auto font-sans select-none">
      {/* 1. Top Navigation & Status Badges */}
      <div className="flex items-center justify-between">
        <Link to="/tasks" className={`${btnSecondary} !min-h-[40px] px-3.5`}>
          <ArrowLeft className="w-4 h-4" />
          <span>Queue</span>
        </Link>
        <div className="flex items-center gap-1.5 flex-wrap">
          <StatusBadge status={activeTask.severity_level} />
          <StatusBadge status={activeTask.status} />
          {isOnSite && !isPendingVerification && !isClosedVerified && (
            <span className="px-2 py-0.5 rounded-full text-[0.8125rem] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
              MAINTENANCE MODE
            </span>
          )}
        </div>
      </div>

      {/* 2. Target Meter & Location Card */}
      <Card className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[0.8125rem] font-mono font-semibold text-sky-700 bg-sky-50 border border-sky-100 px-2 py-0.5 rounded-md ">
                {activeTask.purok_cluster || 'Purok 2'} Cluster
              </span>
              <span className="text-[0.8125rem] font-mono font-semibold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                {activeTask.node_id}
              </span>
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900 pt-1">
              {activeTask.household_label || activeTask.node_id}
            </h1>
            <p className="text-[0.8125rem] text-slate-600">
              {activeTask.location_name || 'Purok 2 Distribution Line'}{' '}
              <span className="text-slate-300">•</span>{' '}
              {activeTask.is_physical ? 'Physical ESP32 Rig' : 'Digital Twin Node'}
            </p>
          </div>
          <BatteryIndicator voltage={batteryVolts} />
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <Link
            to={`/map?focus=${activeTask.node_id}`}
            className={`${btnSecondary} w-full`}
          >
            <MapPin className="w-4 h-4 text-[#0369a1]" />
            <span>Trace Pipe on Map</span>
          </Link>
          {mapsUrl && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`${btnPrimary} w-full`}
            >
              <Navigation className="w-4 h-4 text-sky-400" />
              <span>Google Maps GPS</span>
            </a>
          )}
        </div>
      </Card>

      {/* 3. 5-Stage Progress Stepper */}
      <Card className="px-4 py-4">
        <ol className="grid grid-cols-5 gap-1" aria-label="Work order progress">
          {WORKFLOW_STEPS.map((label, i) => {
            const n = i + 1;
            const done = currentStageIndex > n || (isClosedVerified && n === 5);
            const current = currentStageIndex === n;
            return (
              <li
                key={label}
                className="flex flex-col items-center text-center gap-1.5"
              >
                <div className="flex items-center w-full">
                  <span
                    className={`flex-1 h-0.5 ${
 i === 0
 ? 'opacity-0'
 : currentStageIndex >= n
 ? 'bg-slate-900'
 : 'bg-slate-200'
 }`}
                  />
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[0.8125rem] font-semibold shrink-0 ${
 done
 ? 'bg-slate-900 text-white'
 : current
 ? `bg-white text-slate-900 border-2 ${
                            isFailed ? 'border-rose-500' : 'border-slate-900'
                          } ring-4 ${
                            isFailed ? 'ring-rose-100' : 'ring-sky-100'
                          }`
 : 'bg-white text-slate-600 border-2 border-slate-200'
 }`}
                  >
                    {done ? <Check className="w-3 h-3" /> : n}
                  </span>
                  <span
                    className={`flex-1 h-0.5 ${
 i === WORKFLOW_STEPS.length - 1
 ? 'opacity-0'
 : currentStageIndex > n
 ? 'bg-slate-900'
 : 'bg-slate-200'
 }`}
                  />
                </div>
                <span
                  className={`text-[0.8125rem] leading-tight ${
 current
 ? 'font-semibold text-slate-900'
 : 'font-medium text-slate-600'
 }`}
                >
                  {label}
                </span>
              </li>
            );
          })}
        </ol>
      </Card>

      {/* 4. MAS Advisory Directive (INV-01) */}
      <ActionCard
        title={
          activeTask.action_card_title ||
          activeTask.display_name ||
          activeTask.incident_type
        }
        priority={activeTask.severity_level}
        directive={activeTask.action_directive || activeTask.repair_notes}
      />

      {/* 5. Live Pipe Flow & Seal Test Card */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <IconTile icon={Droplets} tone="sky" />
            <div className="min-w-0">
              <h4 className="text-sm font-semibold text-slate-900">
                Live Pipe Flow Sensor
              </h4>
              <p className="text-[0.8125rem] text-slate-600">
                Must read &le; 0.05 LPM once gate valve &amp; pipe seal are tight
              </p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="leading-none">
              <span className={`text-2xl font-semibold font-mono ${flowTone.text}`}>
                {isTelemetryFresh ? currentFlow.toFixed(2) : '—'}
              </span>
              <span className="text-[0.8125rem] text-slate-600 font-medium ml-1">
                LPM
              </span>
            </div>
            <span
              className={`inline-block mt-1.5 text-[0.8125rem] font-semibold px-2 py-0.5 rounded-full border ${flowTone.chip}`}
            >
              {flowTone.label}
            </span>
          </div>
        </div>

        {/* Field Test Helper: Clamp Pipe & Broadcast Quiescent Flow */}
        {(!isTelemetryFresh || currentFlow > 0.05) && !isClosedVerified && (
          <div className="pt-2.5 border-t border-black/[0.04] flex items-center justify-between gap-2">
            <span className="text-[0.8125rem] text-slate-600">
              {!isTelemetryFresh
                ? 'Simulate physical pipe clamp & quiescent sensor stream?'
                : 'Pipe is still flowing. Simulate clamping pipe to 0.02 LPM?'}
            </span>
            <button
              type="button"
              onClick={handleSimulatePipeSeal}
              disabled={sealingPipe}
              className="px-3 py-1.5 rounded-control bg-emerald-600 hover:bg-emerald-700 text-white text-[0.8125rem] font-semibold flex items-center gap-1.5 cursor-pointer shrink-0 shadow-2xs"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>
                {sealingPipe
                  ? 'Clamping...'
                  : 'Clamp Pipe to 0.02 LPM (Demo)'}
              </span>
            </button>
          </div>
        )}
      </Card>

      {/* =====================================================================
          STAGE 1 GATE: ARRIVE ON-SITE & ENABLE MAINTENANCE MODE
          ===================================================================== */}
      {!isOnSite && !isPendingVerification && !isClosedVerified && (
        <Card className="p-5 space-y-4 !border-sky-200 bg-sky-50/40">
          <div className="space-y-1">
            <span className="text-[0.8125rem] font-mono font-semibold text-[#0369a1]">
              Stage 1 • Field Arrival Protocol
            </span>
            <h3 className="text-base font-semibold text-slate-900">
              Have you arrived at {activeTask.node_id}?
            </h3>
            <p className="text-[0.8125rem] text-slate-600 leading-relaxed">
              Checking in on-site automatically switches meter{' '}
              <strong className="font-mono">{activeTask.node_id}</strong> to{' '}
              <strong>Maintenance Mode</strong> (Protocol 05) to silence false AI alarms while you service the pipe.
            </p>
          </div>

          <button
            type="button"
            onClick={handleArriveOnSite}
            disabled={arriving}
            className={`${btnPrimary} w-full min-h-[50px] !bg-[#0c4a6e] hover:!bg-[#075985] cursor-pointer`}
          >
            <MapPin className="w-4 h-4 text-sky-300" />
            <span>
              {arriving
                ? 'Enabling Maintenance Mode...'
                : 'Arrive On-Site & Start Inspection'}
            </span>
          </button>
        </Card>
      )}

      {/* =====================================================================
          STAGE 2 & 3 WORKBENCH: SAFETY ISOLATION CHECKLIST + REPAIR LOG
          ===================================================================== */}
      {isOnSite && !isPendingVerification && !isClosedVerified && (
        <div className="space-y-4">
          {/* Stage 2: Mandatory 3-Point Isolation Checklist */}
          <Card className="p-5 space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[0.8125rem] font-mono font-semibold text-amber-700">
                  Stage 2 • Valve &amp; Site Isolation (INV-01)
                </span>
                <h3 className="text-sm font-semibold text-slate-900 mt-0.5">
                  Pre-Repair Safety Checklist
                </h3>
              </div>
              <span className="text-[0.8125rem] font-mono font-semibold text-slate-600">
                {checkedSafety.length}/{SAFETY_ISOLATION_CHECKS.length} Done
              </span>
            </div>

            <div className="space-y-2">
              {SAFETY_ISOLATION_CHECKS.map((item) => {
                const isChecked = checkedSafety.includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleSafetyCheck(item.id)}
                    className={`w-full p-3 rounded-control border text-left text-[0.8125rem] font-medium flex items-center gap-3 transition cursor-pointer ${
 isChecked
 ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950 font-semibold'
 : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
 }`}
                  >
                    <span
                      className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
 isChecked
 ? 'bg-emerald-600 border-emerald-600 text-white'
 : 'bg-white border-slate-300'
 }`}
                    >
                      {isChecked && <Check className="w-3.5 h-3.5" />}
                    </span>
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Stage 3: Physical Repair Log (Unlocks once Stage 2 Isolation is checked) */}
          <Card
            className={`p-5 space-y-5 transition-opacity ${
 !allSafetyChecked ? 'opacity-60': 'opacity-100'
 }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <IconTile icon={Wrench} tone="slate" />
                <div>
                  <span className="text-[0.8125rem] font-mono font-semibold text-slate-600">
                    Stage 3 • Field Remediation
                  </span>
                  <h3 className="text-sm font-semibold text-slate-900">
                    {isFailed ? 'Re-log your repair' : 'Document physical repair'}
                  </h3>
                </div>
              </div>
              {!allSafetyChecked && (
                <span className="inline-flex items-center gap-1 text-[0.8125rem] font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                  <Lock className="w-3 h-3" /> Complete Stage 2 first
                </span>
              )}
            </div>

            {submitError && <Alert tone="rose">{submitError}</Alert>}

            {isFailed && (
              <Alert tone="amber" icon={AlertTriangle}>
                <strong>Last verification failed.</strong> Flow returned during the 15-minute observation window. Re-tighten the coupling and submit again.
              </Alert>
            )}

            <fieldset disabled={!allSafetyChecked} className="space-y-4">
              <div>
                <Label className="mb-2">
                  Standardized Repair Actions (tap all that apply)
                </Label>
                <div className="grid grid-cols-1 gap-2">
                  {COMMON_REPAIR_ACTIONS.map((action) => {
                    const isSelected = selectedActions.includes(action);
                    return (
                      <button
                        key={action}
                        type="button"
                        role="checkbox"
                        aria-checked={isSelected}
                        onClick={() => {
                          toggleAction(action);
                          setConfirming(false);
                        }}
                        className={`min-h-[46px] px-3.5 py-2.5 rounded-control border text-left text-[0.8125rem] font-medium flex items-center gap-3 transition active:scale-[0.99] cursor-pointer ${
 isSelected
 ? 'bg-slate-900 text-white border-slate-900'
 : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
 }`}
                      >
                        <span
                          className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
 isSelected
 ? 'bg-white text-slate-900 border-white'
 : 'border-slate-300'
 }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                        </span>
                        {action}
                      </button>
                    );
                  })}
                </div>
              </div>

              <form onSubmit={handleSubmitRepair} className="space-y-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="repair-notes"
                    className="block text-[0.8125rem] font-semibold text-slate-700"
                  >
                    Technician Field Remarks &amp; Parts Used
                  </label>
                  <textarea
                    id="repair-notes"
                    rows={3}
                    required
                    value={repairNotes}
                    onChange={(e) => {
                      setRepairNotes(e.target.value);
                      setConfirming(false);
                    }}
                    placeholder="Describe parts replaced, seal test outcome, and any follow-up notes..."
                    className={`${inputClass} resize-none`}
                  />
                </div>

                {/* Pre-Submission Seal Sanity Warning */}
                {isTelemetryFresh && currentFlow > 0.05 && (
                  <Alert tone="amber" icon={AlertTriangle}>
                    <strong>Warning: Pipe is still flowing ({currentFlow.toFixed(2)} LPM).</strong>{' '}
                    Ensure the coupling is sealed (or tap <em>&ldquo;Clamp Pipe to 0.02 LPM&rdquo;</em> above) so the 15-minute verification passes!
                  </Alert>
                )}

                {confirming && (
                  <Alert tone="sky" icon={CheckCircle2}>
                    Submitting restores <strong>{activeTask.node_id}</strong> to{' '}
                    <strong>ACTIVE</strong> mode and starts the{' '}
                    <strong>15-minute quiescent verification timer</strong> (Rule BR-07).
                  </Alert>
                )}

                <div className="flex gap-2">
                  {confirming && (
                    <button
                      type="button"
                      onClick={() => setConfirming(false)}
                      className={`${btnSecondary} min-h-[50px]`}
                    >
                      Back
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={
                      !allSafetyChecked || isSubmitting || !repairNotes.trim()
                    }
                    className={`${
 confirming ? btnAccent : btnPrimary
 } flex-1 min-h-[50px] cursor-pointer disabled:opacity-50`}
                  >
                    {isSubmitting ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : confirming ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Confirm &amp; Start 15m Verification</span>
                      </>
                    ) : (
                      <span>Submit Repair &amp; Restore Active Mode</span>
                    )}
                  </button>
                </div>
              </form>
            </fieldset>
          </Card>
        </div>
      )}

      {/* =====================================================================
          STAGE 4: 15-MINUTE QUIESCENT FLOW VERIFICATION (RULE BR-07)
          ===================================================================== */}
      {isPendingVerification && (
        <VerificationTimer
          taskId={id}
          nodeId={activeTask.node_id}
          pendingSince={
            activeTask.pending_verification_since || activeTask.detected_at
          }
          onStatusChange={() => fetchTaskDetails(id).catch(() => {})}
        />
      )}

      {/* =====================================================================
          STAGE 5: VERIFIED CLOSED CERTIFICATE
          ===================================================================== */}
      {isClosedVerified && (
        <div className="bg-emerald-50/90 border border-emerald-200 p-6 rounded-card text-center space-y-2 shadow-xs">
          <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
          <h3 className="text-base font-semibold text-emerald-950">
            Work Order Verified &amp; Closed
          </h3>
          <p className="text-[0.8125rem] text-emerald-800 max-w-sm mx-auto leading-relaxed">
            Flow remained quiescent (&le; 0.05 LPM) across the 15-minute closed-loop verification window (Rule BR-07).
          </p>
          {activeTask.resolved_at && (
            <span className="inline-block text-[0.8125rem] text-emerald-700 font-mono pt-1">
              Verified at {activeTask.resolved_at}
            </span>
          )}
          <div className="pt-3">
            <Link to="/tasks" className={`${btnPrimary} inline-flex`}>
              Return to Task Queue
            </Link>
          </div>
        </div>
      )}

      {/* =====================================================================
          STATE MACHINE AUDIT TRAIL (TABLE 3.10: incident_status_history)
          ===================================================================== */}
      {statusHistory.length > 0 && (
        <Card className="p-4 space-y-2.5">
          <span className="text-[0.8125rem] font-semibold text-slate-900 flex items-center gap-1.5">
            <History className="w-3.5 h-3.5 text-slate-600" />
            <span>Work Order Audit Trail ({statusHistory.length} steps)</span>
          </span>
          <div className="space-y-1.5">
            {statusHistory.map((h) => (
              <div
                key={h.history_id}
                className="p-2.5 bg-slate-50 rounded-control border border-slate-200/60 flex items-center justify-between text-[0.8125rem]"
              >
                <div>
                  <span className="font-mono font-semibold text-slate-800">
                    {h.previous_status ? `${h.previous_status} → ` : ''}
                    {h.new_status}
                  </span>
                  {h.changed_by_name && (
                    <span className="text-slate-600 ml-1.5">
                      by {h.changed_by_name}
                    </span>
                  )}
                </div>
                <span className="font-mono text-[0.8125rem] text-slate-600">
                  {h.created_at}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
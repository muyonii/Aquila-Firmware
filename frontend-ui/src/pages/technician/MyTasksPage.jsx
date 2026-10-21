import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import StatusBadge from '../../components/common/StatusBadge';
import { useTaskStore } from '../../stores/useTaskStore';
import {
  Alert,
  Card,
  EmptyState,
  Eyebrow,
  Skeleton,
  btnPrimary,
  btnSecondary,
  timeAgo
} from '../../components/portal/ui';
import {
  AlertTriangle,
  MapPin,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  Timer,
  Wrench,
  ShieldAlert,
  Hand
} from 'lucide-react';

const SEVERITY_WEIGHT = { P1: 0, P2: 1, P3: 2 };
const STATUS_WEIGHT = {
  REPAIR_FAILED: 0,
  DISPATCHED: 1,
  OPEN: 2,
  PENDING_VERIFICATION: 3,
  CLOSED_VERIFIED: 4
};

export default function MyTasksPage() {
  const navigate = useNavigate();
  const {
    tasks,
    fetchMyTasks,
    claimTask,
    isLoading,
    error,
    isOnDuty
  } = useTaskStore();

  const [filterStatus, setFilterStatus] = useState('ACTIONABLE');
  const [claimingId, setClaimingId] = useState(null);

  useEffect(() => {
    fetchMyTasks().catch(() => {});
  }, [fetchMyTasks]);

  const counts = {
    ACTIONABLE: tasks.filter(
      (t) => t.status === 'DISPATCHED' || t.status === 'REPAIR_FAILED'
    ).length,
    OPEN: tasks.filter((t) => t.status === 'OPEN').length,
    PENDING_VERIFICATION: tasks.filter(
      (t) => t.status === 'PENDING_VERIFICATION'
    ).length,
    CLOSED_VERIFIED: tasks.filter((t) => t.status === 'CLOSED_VERIFIED').length
  };

  // Auto-switch to OPEN calls if plumber has 0 assigned tasks but there is an unassigned OPEN leak!
  useEffect(() => {
    if (counts.ACTIONABLE === 0 && counts.OPEN > 0 && filterStatus === 'ACTIONABLE') {
      setFilterStatus('OPEN');
    }
  }, [counts.ACTIONABLE, counts.OPEN]);

  const FILTERS = [
    { key: 'ACTIONABLE', label: 'My To-Do', count: counts.ACTIONABLE },
    { key: 'OPEN', label: 'Open Calls', count: counts.OPEN },
    {
      key: 'PENDING_VERIFICATION',
      label: 'Verifying (15m)',
      count: counts.PENDING_VERIFICATION
    },
    {
      key: 'CLOSED_VERIFIED',
      label: 'Completed',
      count: counts.CLOSED_VERIFIED
    }
  ];

  const filteredTasks = tasks
    .filter((t) => {
      if (filterStatus === 'ACTIONABLE') {
        return t.status === 'DISPATCHED' || t.status === 'REPAIR_FAILED';
      }
      return t.status === filterStatus;
    })
    .slice()
    .sort(
      (a, b) =>
        (SEVERITY_WEIGHT[a.severity_level] ?? 9) -
          (SEVERITY_WEIGHT[b.severity_level] ?? 9) ||
        (STATUS_WEIGHT[a.status] ?? 9) - (STATUS_WEIGHT[b.status] ?? 9)
    );

  const handleClaim = async (incidentId) => {
    setClaimingId(incidentId);
    try {
      await claimTask(incidentId);
      navigate(`/tasks/${incidentId}`);
    } catch (err) {
      alert(err.message || 'Could not claim work order.');
    } finally {
      setClaimingId(null);
    }
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* 1. Header + Refresh Button */}
      <div className="flex items-end justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <Eyebrow>Field Operations</Eyebrow>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Work Orders
          </h1>
          <p className="text-[0.8125rem] text-slate-600 font-medium">
            {counts.ACTIONABLE} assigned to you{' '}
            <span className="text-slate-300">•</span>{' '}
            {counts.OPEN} open call{counts.OPEN !== 1 ? 's' : ''}{' '}
            <span className="text-slate-300">•</span>{' '}
            {counts.CLOSED_VERIFIED} completed
          </p>
        </div>

        <button
          onClick={() => fetchMyTasks().catch(() => {})}
          disabled={isLoading}
          aria-label="Refresh work orders"
          className="w-10 h-10 rounded-control bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center justify-center active:scale-95 transition cursor-pointer shadow-2xs"
          title="Refresh Queue"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin': ''}`} />
        </button>
      </div>

      {!isOnDuty && (
        <Alert tone="amber">
          You are currently <strong>off duty</strong>. Tap the status pill in the top bar to go back on duty.
        </Alert>
      )}

      {/* 2. Stage Filter Tabs */}
      <div
        className="flex gap-1 bg-white border border-black/[0.05] p-1 rounded-control overflow-x-auto [scrollbar-width:none]"
        role="tablist"
      >
        {FILTERS.map((f) => {
          const active = filterStatus === f.key;
          return (
            <button
              key={f.key}
              role="tab"
              aria-selected={active}
              onClick={() => setFilterStatus(f.key)}
              className={`flex-1 min-h-[40px] px-3 rounded-lg text-[0.8125rem] font-semibold transition shrink-0 flex items-center justify-center gap-1.5 cursor-pointer ${
 active
 ? 'bg-slate-900 text-white shadow-sm'
 : 'text-slate-600 hover:text-slate-900'
 }`}
            >
              <span>{f.label}</span>
              <span
                className={`text-[0.8125rem] font-mono px-1.5 rounded-full ${
 active
 ? 'bg-white text-white'
 : f.key === 'OPEN'&& f.count > 0
 ? 'bg-rose-100 text-rose-700 font-semibold'
 : 'bg-slate-100 text-slate-600'
 }`}
              >
                {f.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 3. Work Order Feed */}
      {isLoading && tasks.length === 0 ? (
        <div className="space-y-3">
          <Skeleton className="h-44 w-full rounded-card" />
          <Skeleton className="h-44 w-full rounded-card" />
        </div>
      ) : error ? (
        <Alert
          tone="rose"
          action={
            <button
              onClick={() => fetchMyTasks().catch(() => {})}
              className="text-[0.8125rem] font-semibold underline shrink-0"
            >
              Retry
            </button>
          }
        >
          {error}
        </Alert>
      ) : filteredTasks.length === 0 ? (
        <Card>
          <EmptyState
            icon={CheckCircle2}
            title={
              filterStatus === 'ACTIONABLE'
                ? "You're all caught up"
                : filterStatus === 'OPEN'
                ? 'No unassigned open calls'
                : filterStatus === 'PENDING_VERIFICATION'
                ? 'No repairs in 15-min verification'
                : 'No completed jobs yet'
            }
            body={
              filterStatus === 'ACTIONABLE' && counts.OPEN > 0
                ? `There ${counts.OPEN === 1 ? 'is 1 unassigned open call' : `are ${counts.OPEN} unassigned open calls`} in Purok 2 waiting to be claimed.`
                : 'No work orders in this stage right now.'
            }
            action={
              filterStatus === 'ACTIONABLE' && counts.OPEN > 0 ? (
                <button
                  onClick={() => setFilterStatus('OPEN')}
                  className={btnPrimary}
                >
                  View {counts.OPEN} Open Call{counts.OPEN !== 1 ? 's' : ''}
                </button>
              ) : null
            }
          />
        </Card>
      ) : (
        <ul className="space-y-3">
          {filteredTasks.map((task) => {
            const isP1 = task.severity_level === 'P1';
            const isOpenUnassigned = task.status === 'OPEN';
            const isPendingVerif = task.status === 'PENDING_VERIFICATION';
            const isFailed = task.status === 'REPAIR_FAILED';
            const isCompleted = task.status === 'CLOSED_VERIFIED';
            const isOnsiteMaint =
              task.status === 'DISPATCHED' &&
              task.node_status === 'MAINTENANCE';

            const accent = isCompleted
              ? 'bg-emerald-500'
              : isFailed || isP1
              ? 'bg-rose-500'
              : isPendingVerif
              ? 'bg-sky-500'
              : 'bg-amber-500';

            const ago = timeAgo(task.detected_at);

            return (
              <li key={task.incident_id}>
                <Card className="relative overflow-hidden">
                  <span
                    className={`absolute left-0 top-0 bottom-0 w-1.5 ${accent}`}
                    aria-hidden="true"
                  />
                  <div className="p-4 pl-5 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <StatusBadge status={task.severity_level} />
                        <StatusBadge status={task.status} />
                        {isOnsiteMaint && (
                          <span className="px-2 py-0.5 rounded-full text-[0.8125rem] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                            On-Site (Maint. Mode)
                          </span>
                        )}
                      </div>
                      <span className="text-[0.8125rem] text-slate-600 font-mono">
                        #{task.incident_id.slice(0, 8)}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base font-semibold text-slate-900 leading-snug">
                        {task.household_label || task.node_id}
                      </h3>

                      <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 text-[0.8125rem] text-slate-600 mt-1">
                        <span className="inline-flex items-center gap-1 font-medium">
                          <MapPin className="w-3.5 h-3.5 text-slate-600" />
                          {task.location_name || task.purok_cluster || 'Purok 2'}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="font-mono font-semibold text-slate-700">
                          {task.node_id}
                        </span>
                        {ago && (
                          <>
                            <span className="text-slate-300">•</span>
                            <span>{ago}</span>
                          </>
                        )}
                      </div>

                      {/* SOP Directive Preview */}
                      <div className="mt-2.5 p-2.5 rounded-control bg-slate-50 border border-black/[0.04] text-[0.8125rem] text-slate-700 flex items-start gap-2">
                        <ShieldAlert className="w-4 h-4 text-[#0369a1] shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <span className="font-semibold text-slate-900 block">
                            {task.display_name ||
                              task.action_card_title ||
                              task.incident_type}
                          </span>
                          <p className="text-[0.8125rem] text-slate-600 line-clamp-2 mt-0.5">
                            {task.action_directive || task.repair_notes}
                          </p>
                        </div>
                      </div>
                    </div>

                    {isFailed && (
                      <div className="flex items-center gap-1.5 text-[0.8125rem] font-semibold text-rose-700 bg-rose-50 px-3 py-2 rounded-control border border-rose-200">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>
                          Verification failed: Flow returned during 15m check. Re-inspect pipe seal.
                        </span>
                      </div>
                    )}

                    <div className="flex items-stretch gap-2 pt-1">
                      <Link
                        to={`/map?focus=${task.node_id}`}
                        className={`${btnSecondary} shrink-0 px-3.5`}
                      >
                        <MapPin className="w-4 h-4 text-[#0369a1]" />
                        <span>Field Map</span>
                      </Link>

                      {isOpenUnassigned ? (
                        <button
                          type="button"
                          onClick={() => handleClaim(task.incident_id)}
                          disabled={claimingId === task.incident_id}
                          className={`${btnPrimary} flex-1 min-h-[48px] !bg-[#0c4a6e] hover:!bg-[#075985] cursor-pointer`}
                        >
                          <Hand className="w-4 h-4 text-sky-300" />
                          <span>
                            {claimingId === task.incident_id
                              ? 'Claiming...'
                              : 'Accept & Claim Work Order'}
                          </span>
                        </button>
                      ) : (
                        <Link
                          to={`/tasks/${task.incident_id}`}
                          className={`${
 isPendingVerif || isCompleted
 ? btnSecondary
 : btnPrimary
 } flex-1 min-h-[48px]`}
                        >
                          {isPendingVerif ? (
                            <Timer className="w-4 h-4 text-sky-600" />
                          ) : isCompleted ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Wrench className="w-4 h-4 text-sky-400" />
                          )}
                          <span>
                            {isCompleted
                              ? 'View Completion Record'
                              : isPendingVerif
                              ? 'View 15m Verification Timer'
                              : isOnsiteMaint
                              ? 'Continue On-Site Repair'
                              : 'Open Guided Workbench'}
                          </span>
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      )}
                    </div>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
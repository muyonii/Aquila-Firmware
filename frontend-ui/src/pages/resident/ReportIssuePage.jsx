import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/useAuthStore';
import { residentApi } from '../../api/resident_api';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import {
  Alert,
  Card,
  EmptyState,
  Eyebrow,
  Skeleton,
  btnPrimary,
  btnSecondary,
  inputClass,
  timeAgo,
} from '../../components/portal/ui';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Plus,
  FileText,
  Droplets,
  GaugeCircle,
  Gauge,
  Check,
  RefreshCw,
} from 'lucide-react';

// Plain-language categories. Severity is derived from the category, matching the
// P1/P2/P3 labels the form used to show in its dropdown.
const CATEGORIES = [
  {
    value: 'CRITICAL_LEAK',
    severity: 'P1',
    title: 'Leak or burst pipe',
    desc: 'Visible water, a leaking joint or standing water near the meter',
    icon: Droplets,
  },
  {
    value: 'FAIRNESS_DEFICIT',
    severity: 'P2',
    title: 'No water or low pressure',
    desc: 'Taps are dry, trickling, or the supply was interrupted',
    icon: GaugeCircle,
  },
  {
    value: 'SUSPICIOUS_USAGE',
    severity: 'P3',
    title: 'Meter looks wrong',
    desc: 'Meter keeps running with all taps off, or readings seem too high',
    icon: Gauge,
  },
];

const QUICK_NOTES = [
  'Water is leaking near the meter box.',
  'No water since this morning.',
  'Meter is running while all taps are off.',
];

const MAX_NOTES = 500;

const STEPS = [
  { stage: 1, label: 'Reported', desc: 'We got your request' },
  { stage: 2, label: 'Dispatched', desc: 'Technician assigned' },
  { stage: 3, label: 'Verifying', desc: '15-min flow check' },
  { stage: 4, label: 'Resolved', desc: 'Leak confirmed fixed' },
];

const STAGE_MESSAGE = {
  1: 'We received your report. A dispatcher will assign a technician shortly.',
  2: 'A technician has been assigned and is on the way to your area.',
  3: 'Repair is done. We are watching your meter for 15 minutes to confirm the problem is fixed.',
  4: 'All done. Your meter confirmed the repair.',
};

const PRIORITY_LABEL = { P1: 'Urgent', P2: 'High', P3: 'Normal' };

export default function ReportIssuePage() {
  const user = useAuthStore((state) => state.user);
  const assignedNodeId = user?.assigned_node_id;

  const [incidents, setIncidents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // New ticket modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [formSuccess, setFormSuccess] = useState(null);

  const [formData, setFormData] = useState({
    incident_type: 'CRITICAL_LEAK',
    severity_level: 'P1',
    complaint_notes: '',
  });

  const loadIncidents = async () => {
    try {
      setIsLoading(true);
      const res = await residentApi.getMyIncidents();
      setIncidents(res.data || []);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load tickets.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (assignedNodeId) loadIncidents();
    else setIsLoading(false);
  }, [assignedNodeId]);

  const selectCategory = (cat) =>
    setFormData((f) => ({ ...f, incident_type: cat.value, severity_level: cat.severity }));

  const addQuickNote = (note) =>
    setFormData((f) => {
      if (f.complaint_notes.includes(note)) return f;
      const next = f.complaint_notes ? `${f.complaint_notes.trim()} ${note}` : note;
      return { ...f, complaint_notes: next.slice(0, MAX_NOTES) };
    });

  const openModal = () => {
    setFormError(null);
    setFormSuccess(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.complaint_notes.trim()) {
      setFormError('Please describe the problem so the technician knows what to look for.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      await residentApi.reportIssue({
        node_id: assignedNodeId,
        incident_type: formData.incident_type,
        severity_level: formData.severity_level,
        complaint_notes: formData.complaint_notes,
      });

      setFormSuccess('Your service request has been sent to BAWASA.');
      setFormData({ incident_type: 'CRITICAL_LEAK', severity_level: 'P1', complaint_notes: '' });
      loadIncidents();
      setTimeout(() => {
        setIsModalOpen(false);
        setFormSuccess(null);
      }, 1800);
    } catch (err) {
      setFormError(
        err.response?.data?.error?.message ||
          'Could not send your report. Please check your connection and try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeTicket = incidents.find((i) =>
    ['OPEN', 'DISPATCHED', 'PENDING_VERIFICATION'].includes(i.status)
  );

  const getProgressStage = (status) => {
    switch (status) {
      case 'OPEN': return 1;
      case 'DISPATCHED': return 2;
      case 'PENDING_VERIFICATION': return 3;
      case 'CLOSED_VERIFIED': return 4;
      default: return 1;
    }
  };

  const currentStage = activeTicket ? getProgressStage(activeTicket.status) : 0;
  const progressPct = ((currentStage - 1) / (STEPS.length - 1)) * 100;

  return (
    <div className="space-y-5">
      {/* 1. Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <Eyebrow>Service Requests</Eyebrow>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Report an issue</h1>
          <p className="text-[0.8125rem] text-slate-600 font-medium">
            Meter <span className="font-mono text-slate-700">{assignedNodeId || 'Unassigned'}</span>
            <span className="text-slate-300"> • </span>
            Track repairs or send a new request
          </p>
        </div>
        <button
          onClick={openModal}
          disabled={!assignedNodeId}
          className={`${btnPrimary} hidden sm:inline-flex`}
        >
          <Plus className="w-4 h-4" />
          <span>New report</span>
        </button>
      </div>

      {/* 2. Active ticket tracker */}
      {activeTicket && (
        <Card className="p-5 sm:p-6 space-y-5 !border-sky-200">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <span className="text-[0.8125rem] font-mono font-semibold text-sky-700 bg-sky-50 border border-sky-100 px-2 py-0.5 rounded-md ">
                Active request
              </span>
              <h3 className="text-base font-semibold text-slate-900 mt-2">
                {activeTicket.action_card_title || activeTicket.incident_type}
              </h3>
              <p className="text-[0.8125rem] text-slate-600 mt-0.5">
                <span className="font-mono">#{activeTicket.incident_id.slice(0, 8)}</span>
                {timeAgo(activeTicket.detected_at) && <> • Reported {timeAgo(activeTicket.detected_at)}</>}
              </p>
            </div>
            <span
              className={`text-[0.8125rem] font-semibold px-2.5 py-1 rounded-full shrink-0 ${
 activeTicket.severity_level === 'P1'? 'bg-rose-100 text-rose-700': 'bg-amber-100 text-amber-800'
 }`}
            >
              {PRIORITY_LABEL[activeTicket.severity_level] || 'Normal'}
            </span>
          </div>

          {/* Stepper with connector line */}
          <ol className="relative grid grid-cols-4" aria-label="Repair progress">
            <div className="absolute top-4 left-[12.5%] right-[12.5%] h-0.5 bg-slate-200" aria-hidden="true">
              <div className="h-full bg-slate-900 transition-all duration-700" style={{ width: `${progressPct}%` }} />
            </div>
            {STEPS.map((step) => {
              const passed = currentStage >= step.stage;
              const current = currentStage === step.stage;
              return (
                <li key={step.stage} className="relative flex flex-col items-center text-center" aria-current={current ? 'step' : undefined}>
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-[0.8125rem] font-semibold transition ${
 passed ? 'bg-slate-900 text-white': 'bg-white text-slate-600 border-2 border-slate-200'
 } ${current ? 'ring-4 ring-sky-100': ''}`}
                  >
                    {passed ? <Check className="w-4 h-4" /> : step.stage}
                  </div>
                  <span className={`text-[0.8125rem] font-semibold mt-2 ${current ? 'text-slate-900': 'text-slate-600'}`}>{step.label}</span>
                  <span className="text-[0.8125rem] text-slate-600 hidden sm:block">{step.desc}</span>
                </li>
              );
            })}
          </ol>

          <div className="p-3.5 bg-sky-50/70 border border-sky-100 rounded-control text-sm text-sky-900">
            {STAGE_MESSAGE[currentStage]}
          </div>

          {activeTicket.action_directive && (
            <div className="p-3.5 bg-slate-50 rounded-control border border-black/[0.04] text-[0.8125rem] text-slate-600">
              <strong className="text-slate-800">Note from BAWASA:</strong> {activeTicket.action_directive}
            </div>
          )}
        </Card>
      )}

      {/* 3. Ticket history */}
      <Card className="p-5">
        <h3 className="text-sm font-semibold text-slate-900 mb-1 flex items-center gap-2">
          <FileText className="w-4 h-4 text-slate-600" />
          <span>Request history</span>
        </h3>

        {isLoading ? (
          <div className="space-y-3 pt-3">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : error ? (
          <Alert
            tone="rose"
            className="mt-3"
            action={
              <button onClick={loadIncidents} className="inline-flex items-center gap-1 text-[0.8125rem] font-semibold underline shrink-0">
                <RefreshCw className="w-3 h-3" /> Retry
              </button>
            }
          >
            {error}
          </Alert>
        ) : incidents.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="No requests yet"
            body="You haven't reported any problems. If something looks wrong with your water, send a report and we'll take it from there."
            action={
              assignedNodeId && (
                <button onClick={openModal} className={btnSecondary}>
                  <Plus className="w-4 h-4" /> New report
                </button>
              )
            }
          />
        ) : (
          <ul className="divide-y divide-black/[0.05]">
            {incidents.map((t) => (
              <li key={t.incident_id} className="py-3.5 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-slate-800">{t.action_card_title || t.incident_type}</span>
                    <span className="text-[0.8125rem] font-mono text-slate-600">#{t.incident_id.slice(0, 8)}</span>
                  </div>
                  <p className="text-[0.8125rem] text-slate-600 mt-0.5 line-clamp-2">{t.repair_notes || 'No additional notes yet.'}</p>
                  <p className="text-[0.8125rem] text-slate-600 mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {t.detected_at}
                  </p>
                </div>
                <StatusBadge status={t.status} className="shrink-0" />
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Mobile floating action button */}
      {assignedNodeId && (
        <button
          onClick={openModal}
          aria-label="New report"
          className="sm:hidden fixed right-4 bottom-24 z-40 h-14 pl-4 pr-5 rounded-full bg-slate-900 text-white shadow-soft flex items-center gap-2 text-sm font-semibold active:scale-95 transition"
        >
          <Plus className="w-5 h-5" /> New report
        </button>
      )}

      {/* 4. Report modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="What's the problem?" maxWidth="max-w-lg">
        {formSuccess ? (
          <div className="py-8 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h4 className="text-base font-semibold text-slate-900 mt-3">Report sent</h4>
            <p className="text-[0.8125rem] text-slate-600 mt-1">{formSuccess} You can follow its progress on this page.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {formError && <Alert tone="rose" icon={AlertCircle}>{formError}</Alert>}

            <fieldset className="space-y-2">
              <legend className="text-[0.8125rem] font-semibold text-slate-700 mb-2">Issue type</legend>
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const selected = formData.incident_type === cat.value;
                return (
                  <label
                    key={cat.value}
                    className={`flex items-start gap-3 p-3.5 rounded-control border cursor-pointer transition ${
 selected ? 'border-slate-900 bg-slate-50 ring-4 ring-slate-900/5': 'border-slate-200 hover:border-slate-300'
 }`}
                  >
                    <input
                      type="radio"
                      name="incident_type"
                      value={cat.value}
                      checked={selected}
                      onChange={() => selectCategory(cat)}
                      className="sr-only"
                    />
                    <div
                      className={`w-9 h-9 rounded-control flex items-center justify-center shrink-0 ${
 selected ? 'bg-slate-900 text-white': 'bg-slate-100 text-slate-600'
 }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-slate-900">{cat.title}</div>
                      <div className="text-[0.8125rem] text-slate-600 mt-0.5">{cat.desc}</div>
                    </div>
                    {selected && <Check className="w-4 h-4 text-slate-900 mt-1 shrink-0" />}
                  </label>
                );
              })}
            </fieldset>

            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <label htmlFor="complaint_notes" className="text-[0.8125rem] font-semibold text-slate-700">Tell us more</label>
                <span className="text-[0.8125rem] font-mono text-slate-600">
                  {formData.complaint_notes.length}/{MAX_NOTES}
                </span>
              </div>
              <textarea
                id="complaint_notes"
                rows={4}
                required
                maxLength={MAX_NOTES}
                value={formData.complaint_notes}
                onChange={(e) => setFormData({ ...formData, complaint_notes: e.target.value })}
                placeholder="Where is it happening and since when? (e.g. standing water around the meter box since this morning)"
                className={`${inputClass} resize-none`}
              />
              <div className="flex flex-wrap gap-1.5">
                {QUICK_NOTES.map((note) => (
                  <button
                    key={note}
                    type="button"
                    onClick={() => addQuickNote(note)}
                    className="text-[0.8125rem] px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 transition"
                  >
                    + {note.replace(/\.$/, '')}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setIsModalOpen(false)} className={`${btnSecondary} flex-1`}>
                Cancel
              </button>
              <button type="submit" disabled={isSubmitting || !formData.complaint_notes.trim()} className={`${btnPrimary} flex-[2]`}>
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  'Send report'
                )}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

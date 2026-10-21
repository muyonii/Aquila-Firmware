// frontend-ui/src/pages/admin/incidents/components/LogComplaintModal.jsx
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, RefreshCw, MapPin, MessageSquare, AlertCircle } from 'lucide-react';

export default function LogComplaintModal({
  isOpen,
  onClose,
  nodes = [],
  onSubmit,
  submitting
}) {
  const [form, setForm] = useState({
    node_id: '',
    incident_type: 'CRITICAL_LEAK',
    severity_level: 'P1',
    complaint_notes: ''
  });

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/35 select-none font-sans animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Frosted Glass macOS Sheet */}
      <div
        className="w-full max-w-md aq-surface rounded-card p-7 shadow-soft border border-line space-y-5 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Soft Ambient Light Glow */}

        {/* 1. Header Lockup (Clean, No Line Breaker) */}
        <div className="flex items-start justify-between relative z-10">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 tracking-tight">Log Citizen Complaint</h3>
            <p className="text-[0.8125rem] text-slate-600 mt-0.5">Record a walk-in leak or low-water report from a resident.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-600 hover:text-slate-800 hover:bg-black/[0.04] transition-colors cursor-pointer shrink-0"
            title="Close (Esc)"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 2. Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4 text-[0.8125rem] relative z-10">
          
          {/* Apple Inset Grouped Card */}
          <div className="bg-[#f5f5f7]/80 rounded-card p-4 border border-black/[0.04] space-y-3.5">
            
            {/* Affected Location / Household */}
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 block text-[0.8125rem] ">
                Affected Household / Meter Location
              </label>
              <div className="relative">
                <select
                  required
                  value={form.node_id}
                  onChange={(e) => setForm({ ...form, node_id: e.target.value })}
                  className="w-full bg-white focus:bg-white border border-slate-200/80 focus:border-slate-800 rounded-control px-3.5 py-2.5 text-[0.8125rem] text-slate-900 outline-none transition-all cursor-pointer shadow-2xs"
                >
                  <option value="">Select affected meter location...</option>
                  {nodes.map((n) => (
                    <option key={n.node_id || n.id} value={n.node_id || n.id}>
                      {n.node_id || n.id} — {n.household_label || n.label} ({n.purok_cluster || n.cluster})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Resident Statement */}
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 block text-[0.8125rem] ">
                Resident Statement / Problem Details
              </label>
              <textarea
                required
                rows={3}
                value={form.complaint_notes}
                onChange={(e) => setForm({ ...form, complaint_notes: e.target.value })}
                placeholder="e.g. Resident reported water pooling near front meter box along the road."
                className="w-full bg-white focus:bg-white border border-slate-200/80 focus:border-slate-800 rounded-control px-3.5 py-2.5 text-[0.8125rem] text-slate-900 outline-none transition-all resize-none placeholder-slate-500 shadow-2xs leading-relaxed"
              />
            </div>

            {/* Severity Level: Apple Recessed Segmented Tray */}
            <div className="space-y-1.5 pt-0.5">
              <label className="font-semibold text-slate-700 block text-[0.8125rem] ">
                Reported Urgency
              </label>
              <div className="grid grid-cols-2 gap-1 p-1 bg-slate-200/50 rounded-control select-none">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, severity_level: 'P1', incident_type: 'CRITICAL_LEAK' })}
                  className={`py-2 rounded-lg text-center transition-all cursor-pointer text-[0.8125rem] font-medium ${
 form.severity_level === 'P1'
 ? 'bg-white text-slate-900 shadow-xs font-semibold'
 : 'text-slate-600 hover:text-slate-900'
 }`}
                >
                  Urgent Leak (P1)
                </button>

                <button
                  type="button"
                  onClick={() => setForm({ ...form, severity_level: 'P3', incident_type: 'SUSPICIOUS_USAGE' })}
                  className={`py-2 rounded-lg text-center transition-all cursor-pointer text-[0.8125rem] font-medium ${
 form.severity_level === 'P3'
 ? 'bg-white text-slate-900 shadow-xs font-semibold'
 : 'text-slate-600 hover:text-slate-900'
 }`}
                >
                  Minor / Trickle (P3)
                </button>
              </div>
            </div>

          </div>

          {/* 3. Action Controls */}
          <div className="pt-1 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-control text-[0.8125rem] font-semibold text-slate-600 hover:text-slate-900 hover:bg-black/[0.04] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-control bg-[#18181b] hover:bg-black text-white text-[0.8125rem] font-semibold shadow-xs transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
            >
              {submitting ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Creating Ticket...</span>
                </>
              ) : (
                'Create Incident Ticket'
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : modalContent;
}
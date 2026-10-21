export class IncidentModel {
  constructor(data = {}) {
    this.id = data.incident_id || '';
    this.nodeId = data.node_id || '';
    this.householdLabel = data.household_label || 'Unnamed Household';
    this.locationName = data.location_name || '';
    this.purokCluster = data.purok_cluster || 'Purok 2';
    this.type = data.incident_type || 'CRITICAL_LEAK';
    this.severity = data.severity_level || 'P1';
    this.status = data.status || 'OPEN';
    this.displayName = data.display_name || data.incident_display_name || 'Sudden Pipe Rupture';
    this.academicTerm = data.academic_term || 'High-Velocity Laminar Pipe Burst';
    this.actionTitle = data.action_card_title || this.displayName || 'Suspected Pipe Rupture';
    this.actionDirective =
      data.action_directive || `Inspect conduit branch at ${this.nodeId}. Check meter couplings.`;
    this.technicianId = data.assigned_technician_id || null;
    this.technicianName = data.assigned_technician_name || null;
    this.detectedAt = data.detected_at || new Date().toISOString();
    this.verifiedAt = data.verified_at || null;
    this.pendingVerificationSince = data.pending_verification_since || null;
    this.resolvedAt = data.resolved_at || null;
    this.repairNotes = data.repair_notes || '';

    this.flowRateLpm =
      data.flow_rate_lpm !== undefined
        ? Number(data.flow_rate_lpm)
        : this.severity === 'P1'
        ? 4.82
        : this.severity === 'P2'
        ? 1.45
        : 0.85;
  }

  isCritical() {
    return this.severity === 'P1';
  }

  isOpen() {
    return this.status === 'OPEN';
  }

  isFailed() {
    return this.status === 'REPAIR_FAILED';
  }

  needsAction() {
    return this.status === 'OPEN' || this.status === 'REPAIR_FAILED';
  }

  isDispatched() {
    return this.status === 'DISPATCHED';
  }

  isVerifying() {
    return this.status === 'PENDING_VERIFICATION';
  }

  isInFieldOrVerifying() {
    return this.status === 'DISPATCHED' || this.status === 'PENDING_VERIFICATION';
  }

  isResolved() {
    return this.status === 'CLOSED_VERIFIED' || this.status === 'CANCELLED';
  }

  getReadableType() {
    if (this.displayName) return this.displayName;
    switch (this.type) {
      case 'CRITICAL_LEAK':
        return 'Pipe Rupture';
      case 'FAIRNESS_DEFICIT':
        return 'Low Water Deficit';
      case 'SUSPICIOUS_USAGE':
        return 'Suspicious Draw';
      default:
        return this.type;
    }
  }

  getElapsedTime() {
    if (!this.detectedAt) return 'Just now';
    const past = new Date(String(this.detectedAt).replace(' ', 'T')).getTime();
    if (isNaN(past)) return 'Recent';
    const diffSec = Math.max(0, Math.floor((Date.now() - past) / 1000));
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  }

  getSeverityBadgeProps() {
    switch (this.severity) {
      case 'P1':
        return {
          label: 'P1 Urgent',
          className: 'bg-rose-50 text-rose-700 border-rose-200 font-bold'
        };
      case 'P2':
        return {
          label: 'P2 Deficit',
          className: 'bg-amber-50 text-amber-800 border-amber-200 font-semibold'
        };
      case 'P3':
        return {
          label: 'P3 Minor',
          className: 'bg-sky-50 text-sky-700 border-sky-200 font-medium'
        };
      default:
        return {
          label: this.severity,
          className: 'bg-black/[0.03] text-slate-600 border-black/[0.06]'
        };
    }
  }

  getStatusBadgeProps() {
    switch (this.status) {
      case 'OPEN':
        return {
          label: 'Needs Dispatch',
          className: 'bg-amber-50 text-amber-800 border-amber-200 font-semibold'
        };
      case 'DISPATCHED':
        return {
          label: 'Plumber Dispatched',
          className: 'bg-sky-50 text-sky-700 border-sky-200 font-semibold'
        };
      case 'PENDING_VERIFICATION':
        return {
          label: '15m Verification Active',
          className: 'bg-indigo-50 text-indigo-800 border-indigo-200 font-semibold'
        };
      case 'CLOSED_VERIFIED':
        return {
          label: 'Resolved (Verified)',
          className: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold'
        };
      case 'REPAIR_FAILED':
        return {
          label: 'Repair Failed',
          className: 'bg-rose-50 text-rose-800 border-rose-200 font-bold'
        };
      case 'CANCELLED':
        return {
          label: 'Dismissed',
          className: 'bg-black/[0.02] text-slate-400 border-black/[0.04]'
        };
      default:
        return {
          label: this.status,
          className: 'bg-black/[0.03] text-slate-600 border-black/[0.06]'
        };
    }
  }
}
// frontend-ui/src/pages/admin/incidents/core/IncidentManager.js

import { adminApi } from '../../../../api/admin_api';
import { IncidentModel } from './IncidentModel';

const FALLBACK_INCIDENTS = [
  {
    incident_id: 'inc-b1-001',
    node_id: 'NODE-B1-003',
    household_label: 'Household 03 (Reyes Family)',
    purok_cluster: 'Purok 2',
    incident_type: 'CRITICAL_LEAK',
    severity_level: 'P1',
    action_card_title: 'Suspected Sub-Surface Pipe Rupture',
    action_directive: 'Dispatch maintenance technician to inspect conduit branch at NODE-B1-003. Check meter coupling.',
    assigned_technician_id: null,
    assigned_technician_name: null,
    detected_at: '2026-10-14 19:45:00',
    status: 'OPEN',
    repair_notes: ''
  },
  {
    incident_id: 'inc-b1-002',
    node_id: 'NODE-B1-002',
    household_label: 'Household 02 (Santos Family)',
    purok_cluster: 'Purok 2',
    incident_type: 'CRITICAL_LEAK',
    severity_level: 'P1',
    action_card_title: 'Suspected Sub-Surface Pipe Rupture',
    action_directive: 'Inspect main road supply branch at NODE-B1-002.',
    assigned_technician_id: 2,
    assigned_technician_name: 'Juan Plumber (Field Tech)',
    detected_at: '2026-10-14 18:30:00',
    status: 'DISPATCHED',
    repair_notes: ''
  },
  {
    incident_id: 'inc-b1-003',
    node_id: 'NODE-B1-001',
    household_label: 'Household 01 (Physical Testbed)',
    purok_cluster: 'Purok 2',
    incident_type: 'CRITICAL_LEAK',
    severity_level: 'P1',
    action_card_title: 'Pipe Coupling Replacement',
    action_directive: 'Observe flow sensor quietness for 15 minutes post-clamp.',
    assigned_technician_id: 2,
    assigned_technician_name: 'Juan Plumber (Field Tech)',
    detected_at: '2026-10-14 17:00:00',
    pending_verification_since: '2026-10-14 17:50:00',
    status: 'PENDING_VERIFICATION',
    repair_notes: 'Coupling tightened. Monitoring quiet flow.'
  }
];

export class IncidentManager {
  static #instance = null;

  constructor() {
    if (IncidentManager.#instance) {
      return IncidentManager.#instance;
    }
    this.incidents = [...FALLBACK_INCIDENTS].map((i) => new IncidentModel(i));
    this.technicians = [];
    this.nodes = [];
    IncidentManager.#instance = this;
  }

  static getInstance() {
    if (!IncidentManager.#instance) {
      IncidentManager.#instance = new IncidentManager();
    }
    return IncidentManager.#instance;
  }

  async loadAll() {
    try {
      const [incRes, techRes, nodesRes] = await Promise.all([
        adminApi.getIncidents(),
        adminApi.getUsers('technician'),
        adminApi.getNodes()
      ]);

      if (incRes?.success && Array.isArray(incRes.data)) {
        this.incidents = incRes.data.map((i) => new IncidentModel(i));
      }
      if (techRes?.success && Array.isArray(techRes.data?.users)) {
        this.technicians = techRes.data.users;
      }
      if (nodesRes?.success && Array.isArray(nodesRes.data?.nodes)) {
        this.nodes = nodesRes.data.nodes;
      }
    } catch (err) {
      console.warn('[IncidentManager] Backend API unavailable, utilizing local mock fallback.', err);
    }

    return {
      incidents: [...this.incidents],
      technicians: [...this.technicians],
      nodes: [...this.nodes]
    };
  }

  computeKpis(list = this.incidents) {
    const needsDispatch = list.filter((i) => i.isOpen()).length;
    const inVerification = list.filter((i) => i.isVerifying()).length;
    const deployedTechs = list.filter((i) => i.isDispatched()).length;
    const resolvedToday = list.filter((i) => i.isResolved()).length;

    return {
      needsDispatch,
      inVerification,
      deployedTechs,
      resolvedToday,
      total: list.length
    };
  }

  async dispatch(incidentId, technicianId) {
    const res = await adminApi.dispatchTechnician(incidentId, technicianId);
    await this.loadAll();
    return res;
  }

  async dismiss(incidentId, reason) {
    const res = await adminApi.cancelIncident(incidentId, reason);
    await this.loadAll();
    return res;
  }

  async createComplaint(payload) {
    const res = await adminApi.createManualIncident(payload);
    await this.loadAll();
    return res;
  }

  async getIncidentDetailsWithAudit(incidentId) {
    try {
      const res = await adminApi.getIncidentDetails(incidentId);
      return res?.data || null;
    } catch {
      return null;
    }
  }
}

export const incidentManager = IncidentManager.getInstance();
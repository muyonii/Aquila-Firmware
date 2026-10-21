// frontend-ui/src/pages/admin/dashboard/core/DashboardManager.js
import { adminApi } from '../../../../api/admin_api';

export class DashboardManager {
  static #instance = null;

  constructor() {
    if (DashboardManager.#instance) {
      return DashboardManager.#instance;
    }
    DashboardManager.#instance = this;
  }

  static getInstance() {
    if (!DashboardManager.#instance) {
      DashboardManager.#instance = new DashboardManager();
    }
    return DashboardManager.#instance;
  }

  async fetchDashboardData() {
    try {
      const res = await adminApi.getClusterSummary();
      if (res?.success && res.data) {
        return {
          totalNodes: res.data.total_nodes ?? 9,
          community24hLiters: res.data.community_24h_liters ?? 1193.5,
          nodes: res.data.nodes ?? [],
          incidentBreakdown: res.data.incident_breakdown ?? [],
          systemStatus: res.data.system_status ?? 'OPERATIONAL'
        };
      }
    } catch (err) {
      console.warn('[DashboardManager] Backend API unavailable, utilizing local mock fallback.', err);
    }

    // Fallback Mock Data for development
    return {
      totalNodes: 9,
      community24hLiters: 1193.5,
      nodes: [
        { node_id: 'NODE-B1-001', household_label: 'Household 01 (Physical Testbed)', purok_cluster: 'Purok 2', status: 'ACTIVE' },
        { node_id: 'NODE-B1-002', household_label: 'Household 02 (Santos Family)', purok_cluster: 'Purok 2', status: 'ACTIVE' },
        { node_id: 'NODE-B1-003', household_label: 'Household 03 (Reyes Family)', purok_cluster: 'Purok 2', status: 'ACTIVE' },
        { node_id: 'NODE-B1-004', household_label: 'Household 04 (Cruz Family)', purok_cluster: 'Purok 2', status: 'ACTIVE' },
        { node_id: 'NODE-B1-005', household_label: 'Household 05 (Bautista Family)', purok_cluster: 'Purok 2', status: 'ACTIVE' },
        { node_id: 'NODE-B1-006', household_label: 'Household 06 (Mendoza Family)', purok_cluster: 'Purok 2', status: 'ACTIVE' }
      ],
      incidentBreakdown: [
        { status: 'OPEN', severity_level: 'P1', total: 3 }
      ],
      systemStatus: 'OPERATIONAL'
    };
  }
}

export const dashboardManager = DashboardManager.getInstance();
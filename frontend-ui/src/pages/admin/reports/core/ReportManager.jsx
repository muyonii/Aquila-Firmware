// frontend-ui/src/pages/admin/reports/core/ReportManager.js
import { adminApi } from '../../../../api/admin_api';

export class ReportManager {
  static #instance = null;

  constructor() {
    if (ReportManager.#instance) {
      return ReportManager.#instance;
    }
    ReportManager.#instance = this;
  }

  static getInstance() {
    if (!ReportManager.#instance) {
      ReportManager.#instance = new ReportManager();
    }
    return ReportManager.#instance;
  }

  async fetchAll(params = {}) {
    try {
      const [consumptionRes, leaksRes, maintenanceRes] = await Promise.all([
        adminApi.getConsumptionReport(params),
        adminApi.getLeakLossReport(params),
        adminApi.getMaintenanceReport(params)
      ]);

      return {
        consumption: consumptionRes?.success ? consumptionRes.data : null,
        leaks: leaksRes?.success ? leaksRes.data : null,
        maintenance: maintenanceRes?.success ? maintenanceRes.data : null
      };
    } catch (err) {
      console.warn('[ReportManager] Backend reports API unavailable, using simulated mock fallback.', err);
      return this.getMockFallback();
    }
  }

  async exportCsv(type = 'consumption') {
    try {
      await adminApi.downloadReportCsv(type);
    } catch (err) {
      alert('Failed to stream CSV file export from server.');
    }
  }

  getMockFallback() {
    return {
      consumption: {
        community_summary: {
          total_community_liters: 1193.5,
          total_cubic_meters: 1.194,
          community_mean_daily_liters: 2.96,
          disadvantaged_nodes_count: 1
        },
        household_breakdown: [
          { node_id: 'NODE-B1-001', household_label: 'Household 01 (Physical Testbed)', purok_cluster: 'Purok 2', total_liters: 450.0, total_cubic_meters: 0.45, mean_daily_liters: 15.0, peak_flow_rate_lpm: 3.42, rdi_score: 1.13, equity_status: 'NORMAL' },
          { node_id: 'NODE-B1-002', household_label: 'Household 02 (Santos Family)', purok_cluster: 'Purok 2', total_liters: 161.0, total_cubic_meters: 0.161, mean_daily_liters: 5.19, peak_flow_rate_lpm: 0.0, rdi_score: 0.40, equity_status: 'DISADVANTAGED' },
          { node_id: 'NODE-B1-003', household_label: 'Household 03 (Reyes Family)', purok_cluster: 'Purok 2', total_liters: 582.5, total_cubic_meters: 0.582, mean_daily_liters: 18.79, peak_flow_rate_lpm: 4.10, rdi_score: 1.46, equity_status: 'HIGH_CONSUMER' }
        ]
      },
      leaks: {
        leak_loss_summary: {
          total_leaks_detected: 2,
          false_alarms_dismissed: 1,
          estimated_water_lost_liters: 1530.0,
          estimated_cubic_meters_lost: 1.53,
          mean_time_to_repair_minutes: 38.5
        },
        incidents: [
          { incident_id: 'inc-01', node_id: 'NODE-B1-003', household_label: 'Household 03', incident_type: 'CRITICAL_LEAK', severity_level: 'P1', status: 'CLOSED_VERIFIED', detected_at: '2026-10-01 02:15:00', resolved_at: '2026-10-01 03:00:00', duration_minutes: 45 }
        ]
      },
      maintenance: {
        technicians: [
          { user_id: 2, technician_name: 'Juan Plumber (Field Tech)', total_assigned: 14, completed_verified: 12, failed_inspections: 2, in_progress: 0 }
        ]
      }
    };
  }
}

export const reportManager = ReportManager.getInstance();
import { axiosClient } from './axios_client';
import { API_ENDPOINTS } from '../config/api_config';

export const adminApi = {
  // 1. Analytics & Summary
  async getClusterSummary() {
    const response = await axiosClient.get(API_ENDPOINTS.ANALYTICS.SUMMARY);
    return response.data;
  },

  // 2. Incident Work Orders
  async getIncidents() {
    const response = await axiosClient.get(API_ENDPOINTS.INCIDENTS.BASE);
    return response.data;
  },

  async getIncidentDetails(incidentId) {
    const response = await axiosClient.get(`${API_ENDPOINTS.INCIDENTS.BASE}/${incidentId}`);
    return response.data;
  },

  async createManualIncident(payload) {
    const response = await axiosClient.post(API_ENDPOINTS.INCIDENTS.BASE, payload);
    return response.data;
  },

  async dispatchTechnician(incidentId, technicianId) {
    const response = await axiosClient.post(API_ENDPOINTS.INCIDENTS.DISPATCH(incidentId), {
      technician_id: Number(technicianId)
    });
    return response.data;
  },

  async cancelIncident(incidentId, cancellationReason) {
    const response = await axiosClient.patch(API_ENDPOINTS.INCIDENTS.CANCEL(incidentId), {
      cancellation_reason: cancellationReason
    });
    return response.data;
  },

  // 3. Infrastructure Water Meters & DAG Nodes
  async getNodes() {
    const response = await axiosClient.get(API_ENDPOINTS.NODES.BASE);
    return response.data;
  },

  async createNode(nodeData) {
    const response = await axiosClient.post(API_ENDPOINTS.NODES.BASE, nodeData);
    return response.data;
  },

  async updateNode(nodeId, updateData) {
    const response = await axiosClient.put(API_ENDPOINTS.NODES.BY_ID(nodeId), updateData);
    return response.data;
  },

  async deleteNode(nodeId) {
    const response = await axiosClient.delete(API_ENDPOINTS.NODES.BY_ID(nodeId));
    return response.data;
  },

  // 4. Reports & CSV Export
  async getConsumptionReport(params = {}) {
    const response = await axiosClient.get(API_ENDPOINTS.REPORTS.CONSUMPTION, { params });
    return response.data;
  },

  async getLeakLossReport(params = {}) {
    const response = await axiosClient.get(API_ENDPOINTS.REPORTS.LEAKS, { params });
    return response.data;
  },

  async getMaintenanceReport() {
    const response = await axiosClient.get(API_ENDPOINTS.REPORTS.MAINTENANCE);
    return response.data;
  },

  async downloadReportCsv(type = 'consumption') {
    const response = await axiosClient.get(`${API_ENDPOINTS.REPORTS.EXPORT_CSV}?type=${type}`, {
      responseType: 'blob'
    });

    const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', `AQUILA_${type.toUpperCase()}_REPORT_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
  },

  // 5. User Management & Governance
  async getUsers(role = null) {
    const params = role ? { role } : {};
    const response = await axiosClient.get(API_ENDPOINTS.USERS.BASE, { params });
    return response.data;
  },

  async getPendingApprovals() {
    const response = await axiosClient.get(API_ENDPOINTS.USERS.PENDING_APPROVALS);
    return response.data;
  },

  async approveResidentMeter(userId, action = 'approve') {
    const response = await axiosClient.patch(API_ENDPOINTS.USERS.APPROVE_METER(userId), { action });
    return response.data;
  },

  async createUser(userData) {
    const response = await axiosClient.post(API_ENDPOINTS.USERS.BASE, userData);
    return response.data;
  },

  async updateUser(userId, userData) {
    const response = await axiosClient.put(API_ENDPOINTS.USERS.BY_ID(userId), userData);
    return response.data;
  },

  async deleteUser(userId) {
    const response = await axiosClient.delete(API_ENDPOINTS.USERS.BY_ID(userId));
    return response.data;
  },

  // 6. Immutable Audit Trail Ledger (INV-06)
  async getAuditLogs() {
    const response = await axiosClient.get(API_ENDPOINTS.AUDIT_LOGS.BASE);
    return response.data;
  }
};
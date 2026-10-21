import { adminApi } from './admin_api';

export const incidentApi = {
  getIncidents: adminApi.getIncidents,
  getIncidentDetails: adminApi.getIncidentDetails,
  createManualIncident: adminApi.createManualIncident,
  dispatchTechnician: adminApi.dispatchTechnician,
  cancelIncident: adminApi.cancelIncident
};
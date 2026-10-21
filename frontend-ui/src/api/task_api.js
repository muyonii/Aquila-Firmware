import { axiosClient } from './axios_client';
import { API_ENDPOINTS } from '../config/api_config';

export const taskApi = {
  async getMyTasks() {
    const response = await axiosClient.get(API_ENDPOINTS.TASKS.BASE);
    return response.data;
  },

  async getTaskDetails(taskId) {
    const response = await axiosClient.get(API_ENDPOINTS.TASKS.BY_ID(taskId));
    return response.data;
  },

  async arriveOnSite(taskId) {
    const response = await axiosClient.patch(`/tasks/${taskId}/arrive`);
    return response.data;
  },

  async submitRepair(taskId, repairNotes) {
    const response = await axiosClient.patch(API_ENDPOINTS.TASKS.REPAIR(taskId), {
      repair_notes: repairNotes
    });
    return response.data;
  },

  async verifyFlow(taskId, evalData = {}) {
    const response = await axiosClient.post(API_ENDPOINTS.INCIDENTS.VERIFY_FLOW(taskId), evalData);
    return response.data;
  },
  
  async claimTask(taskId) {
    const response = await axiosClient.post(`/tasks/${taskId}/claim`);
    return response.data;
  },
};
import { axiosClient } from './axios_client';
import { API_ENDPOINTS } from '../config/api_config';

export const residentApi = {
  async getMyWater() {
    const response = await axiosClient.get(API_ENDPOINTS.RESIDENT.MY_WATER);
    return response.data;
  },

  async getMyIncidents() {
    const response = await axiosClient.get(API_ENDPOINTS.INCIDENTS.BASE);
    return response.data;
  },

  async reportIssue(payload) {
    const response = await axiosClient.post(API_ENDPOINTS.RESIDENT.CONCERN, payload);
    return response.data;
  }
};
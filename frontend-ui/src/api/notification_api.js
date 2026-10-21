import { axiosClient } from './axios_client';
import { API_ENDPOINTS } from '../config/api_config';

export const notificationApi = {
  async getNotifications(unreadOnly = false) {
    const params = unreadOnly ? { unread: 'true' } : {};
    const response = await axiosClient.get(API_ENDPOINTS.NOTIFICATIONS.BASE, { params });
    return response.data;
  },

  async markAsRead(notificationId) {
    const response = await axiosClient.patch(API_ENDPOINTS.NOTIFICATIONS.READ(notificationId));
    return response.data;
  },

  async markAllAsRead() {
    const response = await axiosClient.patch(API_ENDPOINTS.NOTIFICATIONS.READ_ALL);
    return response.data;
  }
};
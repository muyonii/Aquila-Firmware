import { axiosClient } from './axios_client';
import { API_ENDPOINTS } from '../config/api_config';

export const authApi = {
  /**
   * 1. Authenticate user with credentials and retrieve JWT + Refresh token
   */
  async login(email, password, remember = true) {
    const response = await axiosClient.post(API_ENDPOINTS.AUTH.LOGIN, {
      email,
      password,
      remember
    });
    return response.data;
  },

  /**
   * 2. Authenticate or Provision via Google Account
   */
  async googleLogin(payload) {
    const body = typeof payload === 'string' ? { email: payload } : payload;
    const response = await axiosClient.post('/auth/google', body);
    return response.data;
  },

  /**
   * 3. Register a new Resident Account & bind water meter (Table 3.1 & 3.4)
   */
  async register(formData) {
    const response = await axiosClient.post(API_ENDPOINTS.AUTH.REGISTER, formData);
    return response.data;
  },

  /**
   * 4. Request 6-digit OTP code (Table 3.4)
   */
  async requestOtp(userId, channel, target) {
    const response = await axiosClient.post(API_ENDPOINTS.AUTH.REQUEST_OTP, {
      user_id: userId,
      channel,
      target
    });
    return response.data;
  },

  /**
   * 5. Verify 6-digit OTP code (Table 3.4)
   */
  async verifyOtp(userId, channel, code) {
    const response = await axiosClient.post(API_ENDPOINTS.AUTH.VERIFY_OTP, {
      user_id: userId,
      channel,
      code
    });
    return response.data;
  },

  /**
   * 6. Request Password Recovery Token (Table 3.2)
   */
  async forgotPassword(email) {
    const response = await axiosClient.post(API_ENDPOINTS.AUTH.FORGOT_PASSWORD, { email });
    return response.data;
  },

  /**
   * 7. Complete Password Reset using Token (Table 3.2)
   */
  async resetPassword(token, newPassword) {
    const response = await axiosClient.post(API_ENDPOINTS.AUTH.RESET_PASSWORD, {
      token,
      new_password: newPassword
    });
    return response.data;
  },

  /**
   * 8. Restore user session using stored JWT
   */
  async getMe() {
    const response = await axiosClient.get(API_ENDPOINTS.AUTH.ME);
    return response.data;
  },

  /**
   * 9. Revoke Refresh Token Session (Table 3.3)
   */
  async logout(refreshToken) {
    const response = await axiosClient.post(API_ENDPOINTS.AUTH.LOGOUT, {
      refresh_token: refreshToken
    });
    return response.data;
  },

  /**
   * 10. Change user password
   */
  async changePassword(currentPassword, newPassword) {
    const response = await axiosClient.post(API_ENDPOINTS.AUTH.CHANGE_PASSWORD, {
      current_password: currentPassword,
      new_password: newPassword
    });
    return response.data;
  }
};
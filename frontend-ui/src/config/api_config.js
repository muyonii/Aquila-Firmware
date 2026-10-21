export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    REFRESH: '/auth/refresh',
    LOGOUT: '/auth/logout',
    ME: '/auth/me',
    CHANGE_PASSWORD: '/auth/change-password',
    REQUEST_OTP: '/auth/request-otp',
    VERIFY_OTP: '/auth/verify-otp',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password'
  },
  ANALYTICS: {
    SUMMARY: '/analytics/summary'
  },
  INCIDENTS: {
    BASE: '/incidents',
    DISPATCH: (id) => `/incidents/${id}/dispatch`,
    CANCEL: (id) => `/incidents/${id}/cancel`,
    VERIFY_FLOW: (id) => `/incidents/${id}/verify-flow`
  },
  NODES: {
    BASE: '/nodes',
    BY_ID: (id) => `/nodes/${id}`
  },
  TASKS: {
    BASE: '/tasks',
    BY_ID: (id) => `/tasks/${id}`,
    REPAIR: (id) => `/tasks/${id}/repair`
  },
  RESIDENT: {
    MY_WATER: '/resident/my-water',
    CONCERN: '/resident/concern'
  },
  REPORTS: {
    CONSUMPTION: '/reports/consumption',
    LEAKS: '/reports/leaks',
    MAINTENANCE: '/reports/maintenance',
    EXPORT_CSV: '/reports/export'
  },
  USERS: {
    BASE: '/users',
    BY_ID: (id) => `/users/${id}`,
    PENDING_APPROVALS: '/users/pending-approvals',
    APPROVE_METER: (id) => `/users/${id}/approve-meter`
  },
  AUDIT_LOGS: {
    BASE: '/audit-logs'
  },
  NOTIFICATIONS: {
    BASE: '/notifications',
    READ: (id) => `/notifications/${id}/read`,
    READ_ALL: '/notifications/read-all'
  }
};
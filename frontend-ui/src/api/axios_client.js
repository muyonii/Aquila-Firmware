import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1/aquila-system/backend-api/public/api/v1';

export const axiosClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  timeout: 10000
});

// 1. Request Interceptor: Attach JWT Bearer Token
axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('aquila_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 2. Response Interceptor: Silent 401 Token Refresh & Fallback Logout
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response && error.response.status === 401) {
      const errCode = error.response.data?.error?.code;
      const isLoginRoute = error.config.url.includes('/auth/login');

      // If token expired and we haven't tried refreshing yet
      if (errCode === 'TOKEN_EXPIRED' && !originalRequest._retry && !isLoginRoute) {
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          }).then(token => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return axiosClient(originalRequest);
          }).catch(err => Promise.reject(err));
        }

        originalRequest._retry = true;
        isRefreshing = true;

        const refreshToken = localStorage.getItem('aquila_refresh_token');

        if (!refreshToken) {
          isRefreshing = false;
          localStorage.clear();
          window.location.replace('/login');
          return Promise.reject(error);
        }

        try {
          const res = await axios.post(`${baseURL}/auth/refresh`, {
            refresh_token: refreshToken
          });

          if (res.data?.success && res.data?.data?.token) {
            const newToken = res.data.data.token;
            localStorage.setItem('aquila_token', newToken);
            axiosClient.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
            originalRequest.headers['Authorization'] = `Bearer ${newToken}`;

            processQueue(null, newToken);
            isRefreshing = false;
            return axiosClient(originalRequest);
          }
        } catch (refreshErr) {
          processQueue(refreshErr, null);
          isRefreshing = false;
          localStorage.clear();
          window.location.replace('/login');
          return Promise.reject(refreshErr);
        }
      }

      // Hard logout if unauthorized and not login route
      if (!isLoginRoute) {
        localStorage.clear();
        window.location.replace('/login');
      }
    }
    return Promise.reject(error);
  }
);
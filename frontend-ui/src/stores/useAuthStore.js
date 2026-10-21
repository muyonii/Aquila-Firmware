import { create } from 'zustand';
import { authApi } from '../api/auth_api';

const getSavedUser = () => {
  try {
    const raw = localStorage.getItem('aquila_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const useAuthStore = create((set, get) => ({
  user: getSavedUser(),
  token: localStorage.getItem('aquila_token') || null,
  refreshToken: localStorage.getItem('aquila_refresh_token') || null,
  isAuthenticated: !!localStorage.getItem('aquila_token'),
  isLoading: false,
  error: null,

  /**
   * 1. Standard Email & Password Login
   */
  login: async (email, password, remember = true) => {
    set({ isLoading: true, error: null });
    try {
      const res = await authApi.login(email, password, remember);
      if (res?.success && res.data) {
        const { token, refresh_token, user } = res.data;

        localStorage.setItem('aquila_token', token);
        if (refresh_token) {
          localStorage.setItem('aquila_refresh_token', refresh_token);
        }
        localStorage.setItem('aquila_user', JSON.stringify(user));

        set({
          user,
          token,
          refreshToken: refresh_token || null,
          isAuthenticated: true,
          isLoading: false
        });
        return { success: true, user };
      }
      throw new Error(res?.error?.message || 'Authentication failed.');
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.message || 'Invalid email or password.';
      set({ error: msg, isLoading: false });
      return { success: false, error: msg };
    }
  },

  /**
   * 2. Real Google OAuth 2.0 Sign-In
   * Accepts { access_token } from Google popup (or { email, full_name } fallback)
   */
  googleLogin: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      const res = await authApi.googleLogin(payload);
      if (res?.success && res.data) {
        // If this is a brand-new Google user, return needsOnboarding so LoginPage shows Meter Selection!
        if (res.data.needs_onboarding) {
          set({ isLoading: false });
          return {
            success: true,
            needsOnboarding: true,
            googleProfile: res.data.google_profile
          };
        }

        const { token, refresh_token, user } = res.data;

        localStorage.setItem('aquila_token', token);
        if (refresh_token) {
          localStorage.setItem('aquila_refresh_token', refresh_token);
        }
        localStorage.setItem('aquila_user', JSON.stringify(user));

        set({
          user,
          token,
          refreshToken: refresh_token || null,
          isAuthenticated: true,
          isLoading: false
        });
        return { success: true, user };
      }
      throw new Error(res?.error?.message || 'Google authentication failed.');
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.message || 'Google sign-in failed.';
      set({ error: msg, isLoading: false });
      return { success: false, error: msg };
    }
  },

  /**
   * 3. Register Action (Smart Resident Signup & Google Progressive Onboarding)
   */
  register: async (formData) => {
    set({ isLoading: true, error: null });
    try {
      const res = await authApi.register(formData);
      if (res?.success && res.data) {
        // If registered via Google OAuth, backend issues token & user immediately
        if (res.data.token && res.data.user) {
          const { token, refresh_token, user } = res.data;
          localStorage.setItem('aquila_token', token);
          if (refresh_token) {
            localStorage.setItem('aquila_refresh_token', refresh_token);
          }
          localStorage.setItem('aquila_user', JSON.stringify(user));

          set({
            user,
            token,
            refreshToken: refresh_token || null,
            isAuthenticated: true,
            isLoading: false
          });
        } else {
          set({ isLoading: false });
        }
        return { success: true, data: res.data };
      }
      throw new Error(res?.error?.message || 'Registration failed.');
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.message || 'Registration failed.';
      set({ error: msg, isLoading: false });
      return { success: false, error: msg };
    }
  },

  /**
   * 4. Session Restore on App Boot (GET /auth/me)
   */
  restoreSession: async () => {
    const token = localStorage.getItem('aquila_token');
    if (!token) {
      set({ isAuthenticated: false, user: null });
      return;
    }

    set({ isLoading: true });
    try {
      const res = await authApi.getMe();
      if (res?.success && res.data) {
        localStorage.setItem('aquila_user', JSON.stringify(res.data));
        set({
          user: res.data,
          token,
          isAuthenticated: true,
          isLoading: false
        });
      } else {
        get().logout();
      }
    } catch (err) {
      console.warn('[AuthStore] Session restore failed:', err.message);
      get().logout();
    }
  },

  /**
   * 5. Logout Action
   */
  logout: async () => {
    const rToken = localStorage.getItem('aquila_refresh_token');
    try {
      if (rToken) {
        await authApi.logout(rToken);
      }
    } catch (err) {
      // Non-blocking
    } finally {
      localStorage.removeItem('aquila_token');
      localStorage.removeItem('aquila_refresh_token');
      localStorage.removeItem('aquila_user');
      set({
        user: null,
        token: null,
        refreshToken: null,
        isAuthenticated: false,
        error: null
      });
    }
  },

  clearError: () => set({ error: null })
}));
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  Eye,
  EyeOff
} from 'lucide-react';

import { useAuthStore } from '../../stores/useAuthStore';
import AuthSplitLayout from '../../components/auth/AuthSplitLayout';

const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  '95256524119-jt186hoqfiom7qhr4jl7de6l7522deet.apps.googleusercontent.com';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, googleLogin, isLoading, error: storeError, clearError } = useAuthStore();

  const [email, setEmail] = useState(
    () => location.state?.email || localStorage.getItem('aquila_remember_email') || ''
  );
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const [localError, setLocalError] = useState('');
  const [successMsg, setSuccessMsg] = useState(location.state?.successMsg || '');

  const googleTokenClientRef = useRef(null);

  const routeByUserRole = (user) => {
    if (!user) return;
    if (user.role === 'admin') navigate('/dashboard', { replace: true });
    else if (user.role === 'technician') navigate('/tasks', { replace: true });
    else if (user.role === 'resident') navigate('/usage', { replace: true });
    else navigate('/', { replace: true });
  };

  // Initialize Official Google OAuth 2.0 Popup Client
  useEffect(() => {
    const initGoogleClient = () => {
      if (window.google?.accounts?.oauth2) {
        googleTokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: 'openid email profile',
          callback: async (tokenResponse) => {
            if (tokenResponse?.access_token) {
              const res = await googleLogin({ access_token: tokenResponse.access_token });
              if (res.success) {
                if (res.needsOnboarding && res.googleProfile) {
                  // Redirect to /register with pre-filled Google profile!
                  navigate('/register', {
                    state: { googleProfile: res.googleProfile }
                  });
                } else if (res.user) {
                  routeByUserRole(res.user);
                }
              } else {
                setLocalError(res.error || 'Google authentication failed.');
              }
            }
          }
        });
      }
    };

    if (window.google?.accounts?.oauth2) {
      initGoogleClient();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = initGoogleClient;
    document.body.appendChild(script);
  }, [googleLogin, navigate]);

  const handleSignIn = async (e) => {
    e.preventDefault();
    setLocalError('');
    setSuccessMsg('');
    clearError();

    const cleanEmail = email.trim().toLowerCase();
    if (rememberMe) {
      localStorage.setItem('aquila_remember_email', cleanEmail);
    } else {
      localStorage.removeItem('aquila_remember_email');
    }

    const res = await login(cleanEmail, password, rememberMe);
    if (res.success && res.user) {
      routeByUserRole(res.user);
    } else if (!res.success) {
      setLocalError(res.error || 'Invalid email or password.');
    }
  };

  const handleGoogleClick = () => {
    setLocalError('');
    setSuccessMsg('');
    clearError();

    if (googleTokenClientRef.current) {
      googleTokenClientRef.current.requestAccessToken({ prompt: 'select_account' });
    } else {
      setLocalError('Google Sign-In is initializing. Please try again in a moment.');
    }
  };

  const activeError = localError || storeError;

  return (
    <AuthSplitLayout>
      <div className="space-y-6 animate-in fade-in duration-150">
        
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-[#0c4a6e] tracking-tight">
            Welcome back
          </h1>
          <p className="text-sm text-slate-500">
            Welcome back! Please enter your details.
          </p>
        </div>

        {/* Status Alerts */}
        {activeError && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
            <span>{activeError}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-start gap-2.5">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSignIn} className="space-y-4">
          {/* Email Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="w-full bg-white border border-slate-300 focus:border-[#0c4a6e] focus:ring-4 focus:ring-[#0c4a6e]/10 text-slate-900 px-3.5 py-2.5 rounded-xl text-sm outline-none transition-all placeholder:text-slate-400"
            />
          </div>

          {/* Password Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white border border-slate-300 focus:border-[#0c4a6e] focus:ring-4 focus:ring-[#0c4a6e]/10 text-slate-900 pl-3.5 pr-10 py-2.5 rounded-xl text-sm outline-none transition-all placeholder:text-slate-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Remember for 30 days & Forgot password */}
          <div className="flex items-center justify-between pt-0.5">
            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-[#0c4a6e] focus:ring-[#0c4a6e] cursor-pointer accent-[#0c4a6e]"
              />
              <span className="text-xs font-medium text-slate-600">
                Remember for 30 days
              </span>
            </label>

            <Link
              to="/forgot-password"
              state={{ email }}
              className="text-xs font-semibold text-[#0c4a6e] hover:text-[#0284c7] hover:underline"
            >
              Forgot password
            </Link>
          </div>

          {/* Primary Sign In Button (Deep Sky-900 / #0c4a6e) */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#0c4a6e] hover:bg-[#075985] text-white font-semibold text-sm py-2.5 px-4 rounded-xl shadow-xs transition-all active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            {isLoading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Signing in...</span>
              </>
            ) : (
              <span>Sign in</span>
            )}
          </button>

          {/* Sign in with Google Button */}
          <button
            type="button"
            onClick={handleGoogleClick}
            disabled={isLoading}
            className="w-full bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm py-2.5 px-4 rounded-xl border border-slate-300 shadow-2xs transition-all active:scale-[0.99] flex items-center justify-center gap-2.5 cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
              />
            </svg>
            <span>Sign in with Google</span>
          </button>
        </form>

        {/* Sign Up Link */}
        <p className="text-center text-xs text-slate-500">
          Don&apos;t have an account?{' '}
          <Link
            to="/register"
            className="font-semibold text-[#0c4a6e] hover:text-[#0284c7] hover:underline"
          >
            Sign up
          </Link>
        </p>
      </div>
    </AuthSplitLayout>
  );
}
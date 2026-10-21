import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  RefreshCw,
  ArrowLeft,
  Check,
  Circle
} from 'lucide-react';
import { authApi } from '../../api/auth_api';
import AuthSplitLayout from '../../components/auth/AuthSplitLayout';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const tokenFromUrl = searchParams.get('token') || '';
  const emailFromUrl = searchParams.get('email') || '';

  const [token, setToken] = useState(tokenFromUrl);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const hasMinLength = newPassword.length >= 8;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const strengthScore = [hasMinLength, hasUpper, hasNumber, passwordsMatch].filter(Boolean).length;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!token.trim()) {
      setError('Reset token is missing. Please click the link directly from your Gmail email.');
      return;
    }
    if (!hasMinLength) {
      setError('New password must be at least 8 characters long.');
      return;
    }
    if (!passwordsMatch) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.resetPassword(token.trim(), newPassword);
      if (res?.success) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/login', {
            replace: true,
            state: {
              email: emailFromUrl,
              successMsg: 'Your password has been updated! Please sign in.'
            }
          });
        }, 2000);
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Invalid or expired password reset link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthSplitLayout>
      <div className="space-y-6 animate-in fade-in duration-150">
        <div className="w-11 h-11 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
          <KeyRound className="w-5 h-5 text-sky-400" />
        </div>

        {success ? (
          <div className="space-y-4">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 space-y-1">
              <div className="flex items-center gap-2 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>Password reset successful!</span>
              </div>
              <p className="text-xs text-emerald-700 pl-7">
                Your AQUILA password has been updated. Redirecting you to sign in...
              </p>
            </div>
            <Link
              to="/login"
              className="w-full bg-slate-900/95 hover:bg-slate-800 text-white font-semibold text-sm py-2.5 px-4 rounded-xl shadow-xs transition-all flex items-center justify-center"
            >
              Continue to Sign in
            </Link>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="space-y-1.5">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Set new password
              </h1>
              <p className="text-xs text-slate-500">
                {emailFromUrl ? (
                  <>Resetting password for <strong className="text-slate-800">{emailFromUrl}</strong></>
                ) : (
                  'Your new password must be at least 8 characters long.'
                )}
              </p>
            </div>

            {error && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {!tokenFromUrl && (
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Reset Token
                  </label>
                  <input
                    type="text"
                    required
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="Paste reset token from email"
                    className="w-full font-mono text-xs bg-slate-50 border border-slate-300 focus:border-slate-900 px-3.5 py-2.5 rounded-xl outline-none"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  New password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-white border border-slate-300 focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 text-slate-900 pl-3.5 pr-10 py-2.5 rounded-xl text-sm outline-none"
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

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Confirm password
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white border border-slate-300 focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 text-slate-900 px-3.5 py-2.5 rounded-xl text-sm outline-none"
                />
              </div>

              <div className="space-y-2 pt-1">
                <div className="grid grid-cols-4 gap-1.5">
                  {[1, 2, 3, 4].map((bar) => (
                    <div
                      key={bar}
                      className={`h-1.5 rounded-full transition-colors ${
                        strengthScore >= bar
                          ? strengthScore <= 2
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                          : 'bg-slate-200'
                      }`}
                    />
                  ))}
                </div>
                <ul className="space-y-1 text-xs text-slate-500">
                  <li className={`flex items-center gap-1.5 ${hasMinLength ? 'text-emerald-700 font-medium' : ''}`}>
                    {hasMinLength ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Circle className="w-3 h-3 text-slate-300" />}
                    At least 8 characters
                  </li>
                  <li className={`flex items-center gap-1.5 ${passwordsMatch ? 'text-emerald-700 font-medium' : ''}`}>
                    {passwordsMatch ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Circle className="w-3 h-3 text-slate-300" />}
                    Passwords match
                  </li>
                </ul>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-slate-900/95 hover:bg-slate-800 text-white font-semibold text-sm py-2.5 px-4 rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Updating password...</span>
                  </>
                ) : (
                  <span>Reset password</span>
                )}
              </button>
            </form>

            <Link
              to="/login"
              className="w-full inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 pt-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to sign in</span>
            </Link>
          </div>
        )}
      </div>
    </AuthSplitLayout>
  );
}
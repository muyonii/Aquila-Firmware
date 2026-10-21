import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  KeyRound,
  RefreshCw,
  ArrowLeft,
  ExternalLink
} from 'lucide-react';

import { authApi } from '../../api/auth_api';
import AuthSplitLayout from '../../components/auth/AuthSplitLayout';

export default function ForgotPasswordPage() {
  const location = useLocation();
  const [email, setEmail] = useState(location.state?.email || '');
  const [sent, setSent] = useState(false);
  const [demoResetUrl, setDemoResetUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setDemoResetUrl(null);
    setLoading(true);

    try {
      const res = await authApi.forgotPassword(email.trim());
      if (res?.success) {
        if (res.data?.demo_reset_url) {
          setDemoResetUrl(res.data.demo_reset_url);
        }
        setSent(true);
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to send password reset email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthSplitLayout>
      {!sent ? (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="w-11 h-11 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
            <KeyRound className="w-5 h-5 text-sky-400" />
          </div>

          <div className="space-y-1.5">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Forgot password?
            </h1>
            <p className="text-xs text-slate-500">
              No worries, enter your email and we&apos;ll send you reset instructions.
            </p>
          </div>

          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
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
                className="w-full bg-white border border-slate-300 focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 px-3.5 py-2.5 rounded-xl text-sm outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900/95 hover:bg-slate-800 text-white font-semibold text-sm py-2.5 px-4 rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Sending reset link...</span>
                </>
              ) : (
                <span>Send reset link</span>
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
      ) : (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>

          <div className="space-y-1.5">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Check your email
            </h1>
            <p className="text-xs text-slate-500 leading-relaxed">
              We sent a password reset link from <strong>ja.alijasmin@gmail.com</strong> to{' '}
              <strong className="text-slate-800">{email}</strong>.
            </p>
          </div>

          <a
            href="https://mail.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-slate-900/95 hover:bg-slate-800 text-white font-semibold text-sm py-2.5 px-4 rounded-xl shadow-xs transition-all flex items-center justify-center gap-2"
          >
            <span>Open Gmail Inbox</span>
            <ExternalLink className="w-4 h-4" />
          </a>

          {demoResetUrl && (
            <div className="p-3.5 bg-[#f4f5f8] border border-slate-200 rounded-xl text-[11px] text-slate-600 space-y-1">
              <span className="font-bold text-slate-800 block">Direct Reset Link:</span>
              <a href={demoResetUrl} className="text-[#0284c7] underline break-all">
                {demoResetUrl}
              </a>
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setSent(false)}
              className="font-semibold text-[#0284c7] hover:text-slate-900 hover:underline cursor-pointer"
            >
              Try another email
            </button>
            <Link
              to="/login"
              className="inline-flex items-center gap-1 font-semibold text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>Back to sign in</span>
            </Link>
          </div>
        </div>
      )}
    </AuthSplitLayout>
  );
}
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  ShieldCheck,
  ExternalLink,
  ArrowLeft
} from 'lucide-react';

import { useAuthStore } from '../../stores/useAuthStore';
import { authApi } from '../../api/auth_api';
import AuthSplitLayout from '../../components/auth/AuthSplitLayout';

export default function VerifyOtpPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuthStore();

  const pendingUser = location.state || null;

  const [otpDigits, setOtpDigits] = useState(() => {
    const demo = pendingUser?.demoOtp || '';
    return demo.length === 6 ? demo.split('') : ['', '', '', '', '', ''];
  });
  const otpInputRefs = useRef([]);

  const [resendCooldown, setResendCooldown] = useState(60);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState(
    pendingUser?.target
      ? `We sent a 6-digit verification code to ${pendingUser.target}.`
      : ''
  );

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  if (!pendingUser?.userId) {
    return <Navigate to="/register" replace />;
  }

  const handleOtpChange = (index, val) => {
    const clean = val.replace(/[^0-9]/g, '');
    if (!clean) {
      const next = [...otpDigits];
      next[index] = '';
      setOtpDigits(next);
      return;
    }
    const digit = clean.slice(-1);
    const next = [...otpDigits];
    next[index] = digit;
    setOtpDigits(next);

    if (index < 5 && otpInputRefs.current[index + 1]) {
      otpInputRefs.current[index + 1].focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
    if (pasted.length > 0) {
      const next = ['', '', '', '', '', ''];
      for (let i = 0; i < 6; i++) {
        next[i] = pasted[i] || '';
      }
      setOtpDigits(next);
      const focusIdx = Math.min(5, pasted.length);
      otpInputRefs.current[focusIdx]?.focus();
    }
  };

  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    const code = otpDigits.join('');
    if (code.length < 6) {
      setError('Please enter all 6 digits of your verification code.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await authApi.verifyOtp(pendingUser.userId, pendingUser.channel, code);
      if (res?.success) {
        if (pendingUser.email && pendingUser.password) {
          const loginRes = await login(pendingUser.email, pendingUser.password, true);
          if (loginRes.success) {
            navigate('/usage', { replace: true });
            return;
          }
        }
        navigate('/login', {
          replace: true,
          state: {
            email: pendingUser.email,
            successMsg: 'Email verified! You can now sign in.'
          }
        });
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Invalid or expired 6-digit verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setError('');
    setLoading(true);
    try {
      const res = await authApi.requestOtp(pendingUser.userId, pendingUser.channel, pendingUser.target);
      const newDemo = res?.data?.demo_otp;
      if (newDemo && newDemo.length === 6) {
        setOtpDigits(newDemo.split(''));
      }
      setResendCooldown(60);
      setSuccessMsg(`A fresh 6-digit verification code was sent to ${pendingUser.target}.`);
    } catch {
      setError('Failed to resend verification code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthSplitLayout>
      <div className="space-y-6 animate-in fade-in duration-150">
        
        <Link
          to="/register"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </Link>

        <div className="w-11 h-11 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
          <ShieldCheck className="w-5 h-5 text-sky-400" />
        </div>

        <div className="space-y-1.5">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Check your Gmail
          </h1>
          <p className="text-xs text-slate-500 leading-relaxed">
            Enter the 6-digit security code we sent to{' '}
            <strong className="text-slate-800">{pendingUser.target}</strong>.
          </p>
        </div>

        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && !error && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-start gap-2.5">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleVerifySubmit} className="space-y-5">
          <div className="grid grid-cols-6 gap-2" onPaste={handleOtpPaste}>
            {otpDigits.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => (otpInputRefs.current[idx] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpChange(idx, e.target.value)}
                onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                className="w-full h-12 text-center font-mono text-lg font-bold text-slate-900 bg-white border border-slate-300 focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 rounded-xl outline-none transition-all"
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900/95 hover:bg-slate-800 text-white font-semibold text-sm py-2.5 px-4 rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Verifying...</span>
              </>
            ) : (
              <span>Verify & Continue</span>
            )}
          </button>
        </form>

        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={handleResend}
            disabled={loading || resendCooldown > 0}
            className="font-semibold text-[#0284c7] hover:text-slate-900 disabled:text-slate-400 hover:underline cursor-pointer"
          >
            {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Click to resend'}
          </button>

          <a
            href="https://mail.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-semibold text-slate-600 hover:text-slate-900"
          >
            <span>Open Gmail</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

      </div>
    </AuthSplitLayout>
  );
}
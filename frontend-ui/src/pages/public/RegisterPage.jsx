import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  AlertCircle,
  RefreshCw,
  ArrowLeft,
  Eye,
  EyeOff,
  Droplets,
  ShieldCheck
} from 'lucide-react';

import { useAuthStore } from '../../stores/useAuthStore';
import AuthSplitLayout from '../../components/auth/AuthSplitLayout';

const AVAILABLE_METERS = [
  { id: 'NODE-B1-001', label: 'NODE-B1-001 — Household 01 (Bougainvillea St.)' },
  { id: 'NODE-B1-002', label: 'NODE-B1-002 — Household 02 (Rosal Ext.)' },
  { id: 'NODE-B1-003', label: 'NODE-B1-003 — Household 03 (Sampaguita St.)' },
  { id: 'NODE-B1-004', label: 'NODE-B1-004 — Household 04 (Daycare Terminal)' },
  { id: 'NODE-B1-005', label: 'NODE-B1-005 — Household 05 (Ilang-Ilang Lane)' },
  { id: 'NODE-B1-006', label: 'NODE-B1-006 — Household 06 (Sitio Riverside 1)' },
  { id: 'NODE-B1-007', label: 'NODE-B1-007 — Household 07 (Sitio Riverside 2)' },
  { id: 'NODE-B1-008', label: 'NODE-B1-008 — Household 08 (Elevated Ridge A)' },
  { id: 'NODE-B1-009', label: 'NODE-B1-009 — Household 09 (Elevated Ridge B)' }
];

export default function RegisterPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { register, isLoading, error: storeError, clearError } = useAuthStore();

  const googleProfile = location.state?.googleProfile || null;

  const [step, setStep] = useState(googleProfile ? 2 : 1);
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');

  const [form, setForm] = useState({
    first_name: googleProfile?.first_name || '',
    last_name: googleProfile?.last_name || '',
    email: googleProfile?.email || '',
    phone_number: '+63917',
    password: googleProfile
      ? 'GoogleOAuth_' + Math.random().toString(36).slice(2, 10) + '!'
      : '',
    assigned_node_id: 'NODE-B1-001',
    meter_pin: 'BAWASA2026',
    channel: 'email',
    google_verified: !!googleProfile
  });

  const handleNextStep = (e) => {
    e.preventDefault();
    setLocalError('');
    clearError();

    if (form.password.length < 8) {
      setLocalError('Password must be at least 8 characters long.');
      return;
    }
    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    clearError();

    const res = await register(form);
    if (res.success && res.data) {
      // If Google already verified their email, backend issues a live JWT session immediately!
      if (res.data.token && res.data.user) {
        navigate('/usage', { replace: true });
        return;
      }

      // Otherwise, navigate to the dedicated /verify-otp page!
      navigate('/verify-otp', {
        state: {
          userId: res.data.user_id,
          email: form.email,
          password: form.password,
          channel: form.channel,
          target: form.channel === 'email' ? form.email : form.phone_number,
          demoOtp: res.data.otp_dispatch?.demo_otp || ''
        }
      });
    } else {
      setLocalError(res.error || 'Could not complete registration.');
    }
  };

  const activeError = localError || storeError;

  return (
    <AuthSplitLayout>
      <div className="space-y-5 animate-in fade-in duration-150">
        
        {/* Top Back Navigation */}
        {step === 2 && !googleProfile ? (
          <button
            type="button"
            onClick={() => setStep(1)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to account details</span>
          </button>
        ) : (
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to sign in</span>
          </Link>
        )}

        {/* Header */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {googleProfile ? `Welcome, ${form.first_name}!` : 'Create an account'}
            </h1>
            {!googleProfile && (
              <span className="text-[11px] font-mono font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full">
                Step {step} / 2
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">
            {googleProfile
              ? `Link your verified Google account (${form.email}) to your BAWASA water meter.`
              : step === 1
              ? 'Enter your household occupant details and Gmail address.'
              : 'Select your assigned BAWASA household water meter (RA 10173).'}
          </p>
        </div>

        {/* Error Alert */}
        {activeError && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
            <span>{activeError}</span>
          </div>
        )}

        {/* STEP 1: PERSONAL & LOGIN DETAILS */}
        {step === 1 ? (
          <form onSubmit={handleNextStep} className="space-y-3.5">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">First name</label>
                <input
                  type="text"
                  required
                  value={form.first_name}
                  onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                  placeholder="Maria"
                  className="w-full bg-white border border-slate-300 focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 px-3.5 py-2.5 rounded-xl text-sm outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">Last name</label>
                <input
                  type="text"
                  required
                  value={form.last_name}
                  onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                  placeholder="Dela Cruz"
                  className="w-full bg-white border border-slate-300 focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 px-3.5 py-2.5 rounded-xl text-sm outline-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">Email address</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="yourname@gmail.com"
                className="w-full bg-white border border-slate-300 focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 px-3.5 py-2.5 rounded-xl text-sm outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">Mobile phone</label>
              <input
                type="tel"
                required
                value={form.phone_number}
                onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
                placeholder="+639171234567"
                className="w-full bg-white border border-slate-300 focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 px-3.5 py-2.5 rounded-xl text-sm outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="At least 8 characters"
                  className="w-full bg-white border border-slate-300 focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 pl-3.5 pr-10 py-2.5 rounded-xl text-sm outline-none"
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

            <button
              type="submit"
              className="w-full bg-slate-900/95 hover:bg-slate-800 text-white font-semibold text-sm py-2.5 px-4 rounded-xl shadow-xs transition-all cursor-pointer mt-2"
            >
              Continue to Meter Binding
            </button>
          </form>
        ) : (
          /* STEP 2: HOUSEHOLD METER SELECTION & CLAIM PIN */
          <form onSubmit={handleSubmit} className="space-y-4">
            {googleProfile && (
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">Mobile phone</label>
                <input
                  type="tel"
                  required
                  value={form.phone_number}
                  onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
                  placeholder="+639171234567"
                  className="w-full bg-white border border-slate-300 focus:border-slate-900 px-3.5 py-2.5 rounded-xl text-sm outline-none"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Droplets className="w-3.5 h-3.5 text-[#0284c7]" />
                <span>Assigned Household Water Meter</span>
              </label>
              <select
                value={form.assigned_node_id}
                onChange={(e) => setForm({ ...form, assigned_node_id: e.target.value })}
                className="w-full bg-white border border-slate-300 focus:border-slate-900 px-3.5 py-2.5 rounded-xl text-xs text-slate-900 outline-none cursor-pointer"
              >
                {AVAILABLE_METERS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Meralco-Style Meter Claim PIN Card */}
            <div className="p-4 bg-[#f4f5f8] border border-slate-200/80 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800">
                  BAWASA Bill Claim PIN (Optional)
                </label>
                <span className="text-[10px] font-mono font-semibold text-[#0284c7] bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                  Instant Link
                </span>
              </div>
              <input
                type="text"
                value={form.meter_pin}
                onChange={(e) => setForm({ ...form, meter_pin: e.target.value })}
                placeholder="BAWASA2026 (or leave blank for Admin Queue)"
                className="w-full bg-white border border-slate-300 focus:border-slate-900 px-3 py-2 rounded-xl text-xs font-mono outline-none"
              />
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Keep <strong>BAWASA2026</strong> for instant meter binding, or clear it to demonstrate the <strong>RA 10173 Pending Admin Approval</strong> screen.
              </p>
            </div>

            <div className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-xl flex items-start gap-2 text-[11px] text-slate-600">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                By creating an account, you agree to household telemetry isolation under <strong>RA 10173 (Data Privacy Act)</strong>.
              </span>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-slate-900/95 hover:bg-slate-800 text-white font-semibold text-sm py-2.5 px-4 rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>{googleProfile ? 'Completing setup...' : 'Sending 6-Digit OTP...'}</span>
                </>
              ) : (
                <span>{googleProfile ? 'Complete Setup & Enter Portal' : 'Create Account & Send OTP'}</span>
              )}
            </button>
          </form>
        )}

        <p className="text-center text-xs text-slate-500 pt-1">
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-semibold text-[#0284c7] hover:text-slate-900 hover:underline"
          >
            Sign in
          </Link>
        </p>

      </div>
    </AuthSplitLayout>
  );
}
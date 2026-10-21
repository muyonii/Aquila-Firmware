import React, { useState } from 'react';
import { Eye, EyeOff, KeyRound, Lock, Check, Circle } from 'lucide-react';
import { authApi } from '../../api/auth_api';
import { Alert, Card, IconTile, btnPrimary, inputClass } from './ui';

/**
 * Shared change-password card (Resident Settings + Technician Profile).
 * Same API call as before: authApi.changePassword(current, next).
 */
export default function PasswordCard() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [show, setShow] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const longEnough = newPassword.length >= 8;
  const matches = newPassword.length > 0 && newPassword === confirmPassword;
  const canSubmit = currentPassword && longEnough && matches && !isSubmitting;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!longEnough) return setErrorMsg('New password must be at least 8 characters long.');
    if (!matches) return setErrorMsg('New password and confirmation do not match.');

    try {
      setIsSubmitting(true);
      await authApi.changePassword(currentPassword, newPassword);
      setSuccessMsg('Your password has been updated.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setErrorMsg(err.response?.data?.error?.message || 'Failed to update password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const Rule = ({ ok, children }) => (
    <li className={`flex items-center gap-1.5 text-[0.8125rem] ${ok ? 'text-emerald-700': 'text-slate-600'}`}>
      {ok ? <Check className="w-3.5 h-3.5" /> : <Circle className="w-3 h-3" />}
      {children}
    </li>
  );

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center gap-3">
        <IconTile icon={KeyRound} tone="slate" />
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Password</h3>
          <p className="text-[0.8125rem] text-slate-600">Change the password you use to sign in</p>
        </div>
      </div>

      {errorMsg && <Alert tone="rose">{errorMsg}</Alert>}
      {successMsg && <Alert tone="emerald">{successMsg}</Alert>}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1.5">
          <label htmlFor="pw-current" className="block text-[0.8125rem] font-semibold text-slate-700">Current password</label>
          <input
            id="pw-current"
            type={show ? 'text' : 'password'}
            autoComplete="current-password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className={inputClass}
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between">
            <label htmlFor="pw-new" className="block text-[0.8125rem] font-semibold text-slate-700">New password</label>
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="inline-flex items-center gap-1 text-[0.8125rem] text-slate-600 hover:text-slate-800"
            >
              {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {show ? 'Hide' : 'Show'}
            </button>
          </div>
          <input
            id="pw-new"
            type={show ? 'text' : 'password'}
            autoComplete="new-password"
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className={inputClass}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="pw-confirm" className="block text-[0.8125rem] font-semibold text-slate-700">Confirm new password</label>
          <input
            id="pw-confirm"
            type={show ? 'text' : 'password'}
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={inputClass}
          />
        </div>

        <ul className="space-y-1 pt-1">
          <Rule ok={longEnough}>At least 8 characters</Rule>
          <Rule ok={matches}>Both passwords match</Rule>
        </ul>

        <button type="submit" disabled={!canSubmit} className={`${btnPrimary} w-full`}>
          {isSubmitting ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Lock className="w-4 h-4" />
              <span>Update password</span>
            </>
          )}
        </button>
      </form>
    </Card>
  );
}

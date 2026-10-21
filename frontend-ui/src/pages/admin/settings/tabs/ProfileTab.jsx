import React, { useState } from 'react';
import { useAuthStore } from '../../../../stores/useAuthStore';
import { adminApi } from '../../../../api/admin_api';
import { authApi } from '../../../../api/auth_api';
import { settingsManager } from '../core/SettingsManager';
import {
  Shield,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Lock,
  Save
} from 'lucide-react';

export default function ProfileTab() {
  const { user, restoreSession } = useAuthStore();

  const defaultFullName = user?.full_name || 'BAWASA System Admin';
  const nameParts = defaultFullName.split(' ');

  const [firstName, setFirstName] = useState(
    () => user?.first_name || settingsManager.get('firstName', nameParts[0] || 'Admin')
  );
  const [lastName, setLastName] = useState(
    () =>
      user?.last_name ||
      settingsManager.get(
        'lastName',
        nameParts.length > 1 ? nameParts[nameParts.length - 1] : 'Officer'
      )
  );
  const [nickname, setNickname] = useState(() => settingsManager.get('nickname', 'Admin'));
  const [phone, setPhone] = useState(
    () => user?.phone_number || settingsManager.get('emergencyPhone', '+639170000001')
  );

  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState(null);
  const [profileErr, setProfileErr] = useState(null);

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState(null);
  const [pwErr, setPwErr] = useState(null);

  const handleFieldChange = (key, value, setter) => {
    setter(value);
    settingsManager.setDraft(key, value);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileMsg(null);
    setProfileErr(null);
    setProfileSaving(true);

    try {
      settingsManager.saveDraft();
      if (user?.user_id) {
        await adminApi.updateUser(user.user_id, {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone_number: phone.trim(),
          role: user.role
        });
        await restoreSession();
      }
      setProfileMsg('Profile details saved to database.');
    } catch (err) {
      setProfileErr(
        err.response?.data?.error?.message || 'Failed to update profile in database.'
      );
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwMsg(null);
    setPwErr(null);

    if (newPassword.length < 8) {
      setPwErr('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwErr('New password and confirmation do not match.');
      return;
    }

    setPwSaving(true);
    try {
      await authApi.changePassword(currentPassword, newPassword);
      setPwMsg('Your password has been updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPwErr(err.response?.data?.error?.message || 'Current password is incorrect.');
    } finally {
      setPwSaving(false);
    }
  };

  const initials =
    `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase() || 'A';
  const displayTitle = nickname
    ? `${firstName} ${lastName} (${nickname})`
    : `${firstName} ${lastName}`;

  return (
    <div className="space-y-6 pb-28 sm:pb-36 animate-in fade-in duration-150">
      
      <div>
        <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900">
          My Account
        </h2>
        <p className="text-sm text-slate-600">
          Manage your personal details and login credentials.
        </p>
      </div>

      {/* Card 1: Profile Banner & Personal Details */}
      <form
        onSubmit={handleSaveProfile}
        className="aq-surface rounded-card border border-line shadow-soft overflow-hidden"
      >
        <div className="h-28 bg-[#0c4a6e] relative" />

        <div className="px-6 pb-6 relative space-y-4">
          <div className="flex justify-between items-end -mt-12">
            <div className="w-24 h-24 rounded-full border-4 border-white bg-[#18181b] text-white font-semibold text-2xl flex items-center justify-center shadow-soft shrink-0">
              {initials}
            </div>

            <span className="px-2.5 py-1 rounded-full text-[0.8125rem] font-semibold bg-sky-50 text-sky-700 border border-sky-200 flex items-center gap-1.5">
              <Shield className="h-3 w-3" />
              <span>System Administrator</span>
            </span>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-slate-900 leading-tight">
              {displayTitle}
            </h3>
            <p className="text-[0.8125rem] text-slate-600 font-mono mt-0.5">
              {user?.email || 'admin@bawasa.gov.ph'}
            </p>
          </div>

          {profileMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-control text-[0.8125rem] text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{profileMsg}</span>
            </div>
          )}

          {profileErr && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-control text-[0.8125rem] text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{profileErr}</span>
            </div>
          )}

          <div className="bg-slate-50 rounded-control p-4 border border-slate-200/60 space-y-3.5">
            <div>
              <span className="text-[0.8125rem] font-semibold text-slate-600 block">
                DISPLAY NAME / NICKNAME
              </span>
              <input
                type="text"
                value={nickname}
                onChange={(e) => handleFieldChange('nickname', e.target.value, setNickname)}
                placeholder="Nickname"
                className="w-full bg-transparent text-[0.8125rem] font-semibold text-slate-800 outline-none border-b border-transparent focus:border-[#0369a1] transition-all py-0.5"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200/50">
              <div>
                <span className="text-[0.8125rem] font-semibold text-slate-600 block">
                  FIRST NAME
                </span>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) =>
                    handleFieldChange('firstName', e.target.value, setFirstName)
                  }
                  className="w-full bg-transparent text-[0.8125rem] font-semibold text-slate-800 outline-none border-b border-transparent focus:border-[#0369a1] transition-all py-0.5"
                />
              </div>
              <div>
                <span className="text-[0.8125rem] font-semibold text-slate-600 block">
                  LAST NAME
                </span>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) =>
                    handleFieldChange('lastName', e.target.value, setLastName)
                  }
                  className="w-full bg-transparent text-[0.8125rem] font-semibold text-slate-800 outline-none border-b border-transparent focus:border-[#0369a1] transition-all py-0.5"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200/50">
              <span className="text-[0.8125rem] font-semibold text-slate-600 block">
                EMAIL ADDRESS
              </span>
              <span className="text-[0.8125rem] font-mono text-slate-600 block py-0.5">
                {user?.email || 'admin@bawasa.gov.ph'}
              </span>
            </div>

            <div className="pt-2 border-t border-slate-200/50">
              <span className="text-[0.8125rem] font-semibold text-slate-600 block">
                EMERGENCY PHONE NUMBER
              </span>
              <input
                type="tel"
                value={phone}
                onChange={(e) =>
                  handleFieldChange('emergencyPhone', e.target.value, setPhone)
                }
                placeholder="+63 917 000 0001"
                className="w-full bg-transparent text-[0.8125rem] font-semibold text-slate-800 outline-none border-b border-transparent focus:border-[#0369a1] transition-all py-0.5"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={profileSaving}
              className="px-4 py-2 rounded-control bg-[#0c4a6e] hover:bg-[#075985] text-white text-[0.8125rem] font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
            >
              {profileSaving ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span>{profileSaving ? 'Saving...' : 'Save Profile'}</span>
            </button>
          </div>
        </div>
      </form>

      {/* Card 2: Working Password & Authentication Form */}
      <form
        onSubmit={handleChangePassword}
        className="aq-surface rounded-card p-6 border border-line shadow-soft space-y-4"
      >
        <div>
          <h3 className="text-[0.8125rem] font-semibold text-slate-900 ">
            Password and Authentication
          </h3>
          <p className="text-[0.8125rem] text-slate-600 mt-0.5">
            Update your administrator security password below.
          </p>
        </div>

        {pwMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-control text-[0.8125rem] text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{pwMsg}</span>
          </div>
        )}

        {pwErr && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-control text-[0.8125rem] text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{pwErr}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            type="password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Current password"
            className="w-full bg-slate-50 border border-slate-200/80 rounded-control px-3.5 py-2.5 text-[0.8125rem] text-slate-800 outline-none focus:border-[#0369a1]"
          />
          <input
            type="password"
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="New password (min 8 chars)"
            className="w-full bg-slate-50 border border-slate-200/80 rounded-control px-3.5 py-2.5 text-[0.8125rem] text-slate-800 outline-none focus:border-[#0369a1]"
          />
          <input
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            className="w-full bg-slate-50 border border-slate-200/80 rounded-control px-3.5 py-2.5 text-[0.8125rem] text-slate-800 outline-none focus:border-[#0369a1]"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={pwSaving}
            className="px-4 py-2 rounded-control bg-slate-900 hover:bg-slate-800 text-white text-[0.8125rem] font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
          >
            {pwSaving ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Lock className="w-3.5 h-3.5" />
            )}
            <span>{pwSaving ? 'Updating...' : 'Update Password'}</span>
          </button>
        </div>
      </form>

    </div>
  );
}
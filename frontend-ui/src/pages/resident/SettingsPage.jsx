import React from 'react';
import { useAuthStore } from '../../stores/useAuthStore';
import PasswordCard from '../../components/portal/PasswordCard';
import {
  Card,
  Eyebrow,
  IconTile,
  Label,
  initials
} from '../../components/portal/ui';
import {
  ShieldCheck,
  Droplet,
  User,
  Mail,
  Smartphone,
  CheckCircle2
} from 'lucide-react';

export default function SettingsPage() {
  const user = useAuthStore((state) => state.user);

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <Eyebrow>Account</Eyebrow>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Settings
        </h1>
        <p className="text-[0.8125rem] text-slate-600 font-medium">
          Your household details, verified contact channels, and sign-in security
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
        {/* Household Profile & RA 10173 Isolation */}
        <Card className="p-5 space-y-5">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-card bg-slate-900 text-white font-semibold text-base flex items-center justify-center shrink-0 ring-2 ring-white/90">
              {initials(user?.full_name)}
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-slate-900 truncate">
                {user?.full_name}
              </h2>
              <p className="text-[0.8125rem] text-slate-600 truncate">{user?.email}</p>
            </div>
          </div>

          <dl className="space-y-3.5">
            <div className="flex items-center justify-between gap-3 p-3 rounded-control bg-slate-50 border border-slate-200/60">
              <div className="flex items-center gap-3">
                <IconTile icon={Droplet} tone="sky" />
                <div>
                  <Label>Assigned Water Meter</Label>
                  <dd className="font-mono font-semibold text-sm text-slate-900 mt-0.5">
                    {user?.assigned_node_id || 'Not assigned yet'}
                  </dd>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 text-[0.8125rem] font-mono font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="w-3 h-3" /> {user?.approval_status || 'APPROVED'}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3 p-3 rounded-control bg-slate-50 border border-slate-200/60">
              <div className="flex items-center gap-3 min-w-0">
                <IconTile icon={Mail} tone="slate" />
                <div className="min-w-0">
                  <Label>Email Channel</Label>
                  <dd className="text-[0.8125rem] font-mono text-slate-800 truncate mt-0.5">
                    {user?.email}
                  </dd>
                </div>
              </div>
              <span className="text-[0.8125rem] font-mono font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full shrink-0">
                Verified
              </span>
            </div>

            {user?.phone_number && (
              <div className="flex items-center justify-between gap-3 p-3 rounded-control bg-slate-50 border border-slate-200/60">
                <div className="flex items-center gap-3">
                  <IconTile icon={Smartphone} tone="slate" />
                  <div>
                    <Label>Mobile SMS Channel</Label>
                    <dd className="text-[0.8125rem] font-mono text-slate-800 mt-0.5">
                      {user.phone_number}
                    </dd>
                  </div>
                </div>
                <span className="text-[0.8125rem] font-mono font-semibold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-full">
                  Registered
                </span>
              </div>
            )}

            <div className="flex items-center gap-3 px-1">
              <IconTile icon={User} tone="slate" />
              <div>
                <Label>Account Role</Label>
                <dd className="mt-1">
                  <span className="text-[0.8125rem] font-mono font-semibold text-sky-700 bg-sky-50 border border-sky-100 px-2 py-0.5 rounded-md ">
                    {user?.role} Consumer
                  </span>
                </dd>
              </div>
            </div>
          </dl>

          {/* RA 10173 privacy notice */}
          <div className="p-3.5 bg-emerald-50/60 border border-emerald-100 rounded-control flex items-start gap-2.5 text-[0.8125rem] text-slate-600">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <p>
              Your water data is strictly isolated under{' '}
              <strong className="text-slate-800">
                RA 10173 (Data Privacy Act of 2012)
              </strong>
              . Only your account can view telemetry and billing records for{' '}
              <strong className="font-mono text-slate-800">
                {user?.assigned_node_id}
              </strong>
              .
            </p>
          </div>
        </Card>

        <PasswordCard />
      </div>
    </div>
  );
}
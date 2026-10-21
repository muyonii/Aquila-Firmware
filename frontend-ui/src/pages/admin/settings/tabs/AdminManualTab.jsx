// frontend-ui/src/pages/admin/settings/tabs/AdminManualTab.jsx
import React from 'react';
import { 
  UserPlus, 
  PlusSquare, 
  FileText, 
  Download,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet
} from 'lucide-react';

const SECTIONS = [
  { id: 'man-users', label: '1. Users & Roles' },
  { id: 'man-meters', label: '2. Registering Meters' },
  { id: 'man-walkin', label: '3. Walk-In Complaints' },
  { id: 'man-reports', label: '4. Council Reports' }
];

export default function AdminManualTab() {
  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="space-y-8 pb-32 sm:pb-40 animate-in fade-in duration-150">
      
      {/* Documentation Page Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900 flex items-center gap-2">
            <span>Administration</span>
        </h2>
        <p className="text-sm text-slate-600">
            Rules for adding user accounts, registering meters, and downloading reports.
        </p>
      </div>

      {/* Sticky Table of Contents Quick Jump Bar */}
      <div className="sticky top-0 z-20 py-2.5 -my-2.5 bg-[#f4f5f8]/90 flex flex-wrap gap-1.5 select-none">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => scrollTo(s.id)}
            className="px-3 py-1.5 rounded-lg text-[0.8125rem] font-medium bg-white hover:bg-white text-slate-600 hover:text-slate-900 border border-slate-200/70 shadow-2xs transition-all cursor-pointer"
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="space-y-6">

        {/* ===================================================================
            SECTION 1: USER ROLES & ACCESS CONTROL
            =================================================================== */}
        <section id="man-users" className="aq-surface rounded-card p-7 border border-line shadow-soft space-y-5 scroll-mt-14">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              <h3 className="text-sm font-semibold text-slate-900">1. Adding Users & Access Roles</h3>
            </div>
            <span className="px-2.5 py-0.5 rounded text-[0.8125rem] font-semibold bg-blue-50 text-blue-700 border border-blue-200 ">
              Governance
            </span>
          </div>

          <div className="space-y-3.5">
            {/* Resident Card */}
            <div className="p-4 bg-slate-50 rounded-control space-y-2 text-[0.8125rem]">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-900 text-[0.8125rem]">👤 Resident (Household Consumer)</span>
                <span className="px-2 py-0.5 rounded text-[0.8125rem] font-semibold bg-white border border-slate-200 text-slate-600">
                  Consumer Access
                </span>
              </div>
              <p className="text-slate-600 leading-relaxed">Can only view their assigned home meter volume and report local leaks.</p>
              
              <div className="p-3 bg-white rounded-lg space-y-1 text-slate-700 border border-slate-100">
                <p>✅ <strong>Required Inputs:</strong> Full Name, Email, Password (min. 8 characters).</p>
                <p className="text-amber-800 font-semibold">
                  ⚠️ Mandatory Rule (RA 10173): You MUST select an Assigned Meter Node. Residents can never see neighbors' water consumption.
                </p>
              </div>
            </div>

            {/* Field Technician Card */}
            <div className="p-4 bg-slate-50 rounded-control space-y-2 text-[0.8125rem]">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-900 text-[0.8125rem]">🔧 Field Technician (Plumber)</span>
                <span className="px-2 py-0.5 rounded text-[0.8125rem] font-semibold bg-white border border-slate-200 text-slate-600">
                  Maintenance Access
                </span>
              </div>
              <p className="text-slate-600 leading-relaxed">Inspects pipe coordinates, accepts dispatches, and submits repair notes.</p>
              <div className="p-3 bg-white rounded-lg text-slate-700 border border-slate-100">
                <p>✅ <strong>Required Inputs:</strong> Full Name, Email, Password. Leave Assigned Meter <strong>BLANK</strong> (Technicians service all nodes).</p>
              </div>
            </div>

            {/* Admin Card */}
            <div className="p-4 bg-slate-50 rounded-control space-y-2 text-[0.8125rem]">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-900 text-[0.8125rem]">🛡️ System Administrator</span>
                <span className="px-2 py-0.5 rounded text-[0.8125rem] font-semibold bg-white border border-slate-200 text-slate-600">
                  Full Authority
                </span>
              </div>
              <p className="text-slate-600 leading-relaxed">Full system governance, node provisioning, and reporting exports.</p>
              <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-lg text-amber-900">
                <p className="font-semibold">⚠️ Safety Guardrail (Last-Admin Protection):</p>
                <p className="text-[0.8125rem] mt-0.5">The software will reject deleting or demoting the last remaining administrator account to prevent accidental utility lockouts.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ===================================================================
            SECTION 2: REGISTERING NEW METERS
            =================================================================== */}
        <section id="man-meters" className="aq-surface rounded-card p-7 border border-line shadow-soft space-y-5 scroll-mt-14">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <h3 className="text-sm font-semibold text-slate-900">2. Registering New Water Meters (Nodes)</h3>
            </div>
            <span className="px-2.5 py-0.5 rounded text-[0.8125rem] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 ">
              Infrastructure
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-[0.8125rem]">
            <div className="p-4 bg-slate-50 rounded-control space-y-2">
              <h4 className="font-semibold text-slate-900 text-[0.8125rem]">Required Details:</h4>
              <ul className="space-y-1 text-slate-600">
                <li>• <strong>Household Label:</strong> e.g., "Santos Family" or "Purok 2 Tap".</li>
                <li>• <strong>Purok Sector:</strong> e.g., "Purok 2" (used to calculate fairness).</li>
                <li>• <strong>Parent Pipe Node:</strong> Upstream line feeding this tap.</li>
              </ul>
            </div>

            <div className="p-4 bg-slate-50 rounded-control space-y-2">
              <h4 className="font-semibold text-slate-900 text-[0.8125rem]">Optional Parameters:</h4>
              <ul className="space-y-1 text-slate-600">
                <li>• <strong>GPS Coordinates:</strong> Places a pin on the map.</li>
                <li>• <strong>Physical vs. Simulated:</strong> Check physical if using an actual ESP32 sensor.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ===================================================================
            SECTION 3: WALK-IN COMPLAINTS
            =================================================================== */}
        <section id="man-walkin" className="aq-surface rounded-card p-7 border border-line shadow-soft space-y-5 scroll-mt-14">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              <h3 className="text-sm font-semibold text-slate-900">3. Logging Walk-In Resident Complaints</h3>
            </div>
            <span className="px-2.5 py-0.5 rounded text-[0.8125rem] font-semibold bg-amber-50 text-amber-700 border border-amber-200 ">
              Citizen Intake
            </span>
          </div>

          <div className="p-4 bg-slate-50 rounded-control space-y-2 text-[0.8125rem] text-slate-700">
            <p className="text-slate-600">When an elder or resident reports a leak at the Barangay Hall:</p>
            <div className="space-y-1 pt-1">
              <p><strong>Step 1:</strong> Open <em>Incidents</em> and click <strong>"+ Manual Report"</strong>.</p>
              <p><strong>Step 2:</strong> Select the affected Household or Street meter node.</p>
              <p><strong>Step 3:</strong> Record the citizen statement (e.g. <em>"Standing water near meter box"</em>).</p>
              <p><strong>Step 4:</strong> Select severity: <strong>P1 Red</strong> if spraying water; <strong>P3 Yellow</strong> if slow trickle.</p>
              <p><strong>Step 5:</strong> Click <strong>Create Ticket</strong> and dispatch an on-call plumber.</p>
            </div>
          </div>
        </section>

        {/* ===================================================================
            SECTION 4: EXPORTING COUNCIL REPORTS
            =================================================================== */}
        <section id="man-reports" className="aq-surface rounded-card p-7 border border-line shadow-soft space-y-5 scroll-mt-14">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <span className="h-2 w-2 rounded-full bg-slate-700" />
              <h3 className="text-sm font-semibold text-slate-900">4. Exporting Reports for Council Meetings</h3>
            </div>
            <span className="px-2.5 py-0.5 rounded text-[0.8125rem] font-semibold bg-slate-100 text-slate-700 border border-slate-200 ">
              Auditing & CSV
            </span>
          </div>

          <div className="space-y-3 text-[0.8125rem] text-slate-600">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="p-3.5 bg-slate-50 rounded-control space-y-1">
                <strong className="text-slate-900 block font-semibold">1. Consumption & Equity Report:</strong>
                <p>Shows every family's Liters and Cubic Meters ($m^3$) consumed, and flags supply deficits.</p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-control space-y-1">
                <strong className="text-slate-900 block font-semibold">2. Leak Loss Report:</strong>
                <p>Calculates total water lost to pipe leaks and average plumber repair response times.</p>
              </div>
            </div>

            <p className="pt-1">
              <strong>How to Download:</strong> Open <em>Reports</em> $\rightarrow$ Select date range $\rightarrow$ Click <strong>Export CSV</strong>. Opens cleanly in Microsoft Excel or Google Sheets.
            </p>
          </div>
        </section>

      </div>
    </div>
  );
}
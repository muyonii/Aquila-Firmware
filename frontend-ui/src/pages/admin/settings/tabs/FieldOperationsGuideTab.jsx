// frontend-ui/src/pages/admin/settings/tabs/FieldOperationsGuideTab.jsx
import React, { useState } from 'react';
import { 
  AlertTriangle, 
  CheckCircle, 
  Network, 
  Droplet, 
  BatteryCharging,
  ArrowRight,
  ShieldAlert,
  Clock,
  GitBranch,
  Layers,
  Wrench
} from 'lucide-react';

const SECTIONS = [
  { id: 'sec-leaks', label: '1. Leak Response' },
  { id: 'sec-verify', label: '2. 15-Min Fix Check' },
  { id: 'sec-trace', label: '3. Pipe Tracing' },
  { id: 'sec-water', label: '4. Low Water' },
  { id: 'sec-meter', label: '5. Battery Swaps' }
];

export default function FieldOperationsGuideTab() {
  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="space-y-8 pb-32 sm:pb-40 animate-in fade-in duration-150">
      
      {/* Documentation Page Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900 flex items-center gap-2">
        <span>Field operations</span>
        </h2>
        <p className="text-sm text-slate-600">
        Procedures for responding to leaks, checking repairs, and servicing meters.
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
            SECTION 1: WHEN A PIPE LEAKS
            =================================================================== */}
        <section id="sec-leaks" className="aq-surface rounded-card p-7 border border-line shadow-soft space-y-5 scroll-mt-14">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              <h3 className="text-sm font-semibold text-slate-900">Protocol 01: When a Pipe Leaks</h3>
            </div>
            <span className="px-2.5 py-0.5 rounded text-[0.8125rem] font-semibold bg-rose-50 text-rose-700 border border-rose-200 ">
              High Priority
            </span>
          </div>

          {/* 1. What Happened */}
          <div className="space-y-1.5">
            <h4 className="text-[0.8125rem] font-semibold text-slate-800 flex items-center gap-1.5">
              <span>1. What Happened?</span>
            </h4>
            <p className="text-[0.8125rem] text-slate-600 leading-relaxed">
              The detection agent noticed water running continuously with near-zero variance. Real households experience pauses when taps are closed; continuous flat flow over several minutes indicates a physical structural rupture.
            </p>
          </div>

          {/* 2. What to do (Numbered Cards) */}
          <div className="space-y-2">
            <h4 className="text-[0.8125rem] font-semibold text-slate-800 ">2. What Should I Do?</h4>
            <div className="space-y-2 text-[0.8125rem]">
              <div className="p-3 bg-slate-50 rounded-control flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-semibold text-[0.8125rem] flex items-center justify-center shrink-0 mt-0.5">1</span>
                <div>
                  <strong className="text-slate-900 block font-semibold">Inspect Meter & Location:</strong>
                  <span className="text-slate-600">Open the <em>Incidents</em> table and verify which household branch or Purok node triggered the alarm.</span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-control flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-semibold text-[0.8125rem] flex items-center justify-center shrink-0 mt-0.5">2</span>
                <div>
                  <strong className="text-slate-900 block font-semibold">Dispatch Field Plumber:</strong>
                  <span className="text-slate-600">Click the <strong>Dispatch</strong> button on the ticket, assign an on-call technician, and relay the street location.</span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-control flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-semibold text-[0.8125rem] flex items-center justify-center shrink-0 mt-0.5">3</span>
                <div>
                  <strong className="text-slate-900 block font-semibold">Field Ground Check:</strong>
                  <span className="text-slate-600">Technician inspects physical pipe joints, valve boxes, and checks for damp soil or surface pooling.</span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Color Meaning Reference Box */}
          <div className="p-4 bg-slate-50 rounded-control border border-slate-100 space-y-2">
            <h4 className="text-[0.8125rem] font-semibold text-slate-800 ">Incident Severity Meanings:</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[0.8125rem]">
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200/80">
                <span className="font-semibold text-rose-800 block text-[0.8125rem]">🔴 Red (P1 Urgent)</span>
                <p className="text-[0.8125rem] text-rose-700 mt-0.5">Severe structural pipe rupture. Dispatch plumber immediately.</p>
              </div>
              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200/80">
                <span className="font-semibold text-amber-800 block text-[0.8125rem]">🟡 Yellow (P3 Warning)</span>
                <p className="text-[0.8125rem] text-amber-700 mt-0.5">Small steady trickle or running toilet fixture. Monitor draw.</p>
              </div>
              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200/80">
                <span className="font-semibold text-emerald-800 block text-[0.8125rem]">🟢 Green (Normal)</span>
                <p className="text-[0.8125rem] text-emerald-700 mt-0.5">Flow fluctuating stably with natural domestic pauses.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ===================================================================
            SECTION 2: 15-MINUTE VERIFICATION RULE
            =================================================================== */}
        <section id="sec-verify" className="aq-surface rounded-card p-7 border border-line shadow-soft space-y-5 scroll-mt-14">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <span className="h-2 w-2 rounded-full bg-sky-500" />
              <h3 className="text-sm font-semibold text-slate-900">Protocol 02: Checking if a Repair Worked</h3>
            </div>
            <span className="px-2.5 py-0.5 rounded text-[0.8125rem] font-semibold bg-sky-50 text-sky-700 border border-sky-200 ">
              Rule BR-07
            </span>
          </div>

          <div className="space-y-1.5">
            <h4 className="text-[0.8125rem] font-semibold text-slate-800 ">How Closed-Loop Verification Operates:</h4>
            <p className="text-[0.8125rem] text-slate-600 leading-relaxed">
              When a plumber replaces a pipe fitting and clicks <em>"Submit Repair"</em>, you do not need to manually mark the ticket as closed. The system automatically places the ticket into <strong>Pending Verification</strong> and monitors the flow sensor for a strict 15-minute countdown.
            </p>
          </div>

          {/* Two Outcome Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
            <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-control space-y-1.5">
              <div className="flex items-center gap-1.5 text-emerald-800 font-semibold text-[0.8125rem]">
                <CheckCircle className="h-4 w-4" />
                <span>Ticket Closes Verified (Success)</span>
              </div>
              <p className="text-[0.8125rem] text-emerald-700 leading-relaxed">
                If the flow remains completely quiet (flow rate &le; 0.05 L/min) for the full 15 minutes (900 seconds), the software automatically resolves and closes the ticket.
              </p>
            </div>

            <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-control space-y-1.5">
              <div className="flex items-center gap-1.5 text-amber-800 font-semibold text-[0.8125rem]">
                <AlertTriangle className="h-4 w-4" />
                <span>Ticket Flags Repair Failed</span>
              </div>
              <p className="text-[0.8125rem] text-amber-700 leading-relaxed">
                If recurrent water flow bursts (&ge; 1.0 L/min) are detected during the 15-minute window, the repair failed. The ticket turns orange so you can recall the plumber.
              </p>
            </div>
          </div>
        </section>

        {/* ===================================================================
            SECTION 3: TRACING THE PIPE LINES
            =================================================================== */}
        <section id="sec-trace" className="aq-surface rounded-card p-7 border border-line shadow-soft space-y-5 scroll-mt-14">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <span className="h-2 w-2 rounded-full bg-indigo-500" />
              <h3 className="text-sm font-semibold text-slate-900">Protocol 03: Tracing the Pipe Lines</h3>
            </div>
            <span className="px-2.5 py-0.5 rounded text-[0.8125rem] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 ">
              Network Hierarchy
            </span>
          </div>

          <div className="space-y-1.5">
            <h4 className="text-[0.8125rem] font-semibold text-slate-800 ">Parent-Child Conduit Logic:</h4>
            <p className="text-[0.8125rem] text-slate-600 leading-relaxed">
              Water travels from primary distribution mains (parents) into household junction lines (children). On the <em>Network Map</em>, parent-child links show which lines supply which homes.
            </p>
          </div>

          <div className="p-4 bg-indigo-50/60 border border-indigo-200/70 rounded-control space-y-2 text-[0.8125rem] text-indigo-900">
            <strong className="block text-[0.8125rem] text-indigo-950 font-semibold">Rule BR-06: Upstream Leak Suppression</strong>
            <p className="text-[0.8125rem] leading-relaxed">
              If an upstream main feeder (e.g. <code>NODE-B1-002</code>) ruptures, homes connected downstream will lose pressure. The coordinator agent automatically <strong>silences false downstream alarms</strong> to stop duplicate tickets and directs you to repair the broken main feeder first.
            </p>
          </div>
        </section>

        {/* ===================================================================
            SECTION 4: LOW WATER IN NEIGHBORHOODS
            =================================================================== */}
        <section id="sec-water" className="aq-surface rounded-card p-7 border border-line shadow-soft space-y-5 scroll-mt-14">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <span className="h-2 w-2 rounded-full bg-teal-500" />
              <h3 className="text-sm font-semibold text-slate-900">Protocol 04: Low Water in Neighborhoods</h3>
            </div>
            <span className="px-2.5 py-0.5 rounded text-[0.8125rem] font-semibold bg-teal-50 text-teal-700 border border-teal-200 ">
              Distribution Equity
            </span>
          </div>

          <div className="space-y-3 text-[0.8125rem] text-slate-600 leading-relaxed">
            <div className="p-3.5 bg-slate-50 rounded-control space-y-1">
              <strong className="text-slate-900 block font-semibold">1. Fairness Deficit Alerts:</strong>
              <p>When a home receives less than 70% of the water volume their street neighbors are getting, the agent flags an equitable distribution deficit. Inspect intermediate street gate valves for throttle clogs.</p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-control space-y-1">
              <strong className="text-slate-900 block font-semibold">2. Municipal Drought Override:</strong>
              <p>During dry season reservoir drops where total community allocation falls below 50 Liters per home per day, the system automatically silences deficit alarms so you are not flooded with false warnings.</p>
            </div>
          </div>
        </section>

        {/* ===================================================================
            SECTION 5: CHANGING METER BATTERIES
            =================================================================== */}
        <section id="sec-meter" className="aq-surface rounded-card p-7 border border-line shadow-soft space-y-5 scroll-mt-14">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              <h3 className="text-sm font-semibold text-slate-900">Protocol 05: Changing Meter Batteries & Safe Repairs</h3>
            </div>
            <span className="px-2.5 py-0.5 rounded text-[0.8125rem] font-semibold bg-amber-50 text-amber-700 border border-amber-200 ">
              Hardware Protocol
            </span>
          </div>

          <div className="space-y-2 text-[0.8125rem] text-slate-600 leading-relaxed">
            <p>To service physical meter enclosures without triggering false leak alerts:</p>
            
            <div className="space-y-2 pt-1">
              <div className="p-3 bg-slate-50 rounded-control">
                <p><strong>Step 1 (Set Maintenance Mode):</strong> Open <em>Network Map</em>, click the node, and switch status from <strong>Active</strong> to <strong>Maintenance</strong>. This immediately silences cloud AI detection for that meter.</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-control">
                <p><strong>Step 2 (Battery Replacement):</strong> Unscrew the enclosure and replace the 18650 lithium cell (required when cell potential drops under 3.35 V).</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-control">
                <p><strong>Step 3 (Re-activate):</strong> Close the waterproof lid and toggle status back to <strong>Active</strong>. Real-time streaming resumes immediately.</p>
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
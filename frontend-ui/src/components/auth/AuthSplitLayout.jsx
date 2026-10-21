import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import DotGrid from '../ui/DotGrid';
import ParticleText from '../ui/ParticleText';

/**
 * Shared 50/50 Split-Screen Layout matching AdminLayout.jsx's exact palette
 */
export default function AuthSplitLayout({ children }) {
  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#f4f5f8] text-slate-800 font-sans selection:bg-slate-900 selection:text-white">
      
      {/* =====================================================================
          LEFT HALF (50%): AQUILA INTERACTIVE PARTICLE STAGE + ADMIN WASH
          ===================================================================== */}
      <div className="relative w-full lg:w-1/2 bg-white/75 backdrop-blur-2xl border-b lg:border-b-0 lg:border-r border-white/80 flex flex-col justify-between min-h-[340px] lg:min-h-screen overflow-hidden select-none p-8 sm:p-12">
        
        {/* Admin Sidebar's Signature 40% Ambient Sky-Blue Wash at Bottom */}
        <div className="absolute inset-x-0 bottom-0 h-[45%] bg-gradient-to-t from-sky-400/25 via-sky-300/10 to-transparent pointer-events-none z-0" />

        {/* Interactive DotGrid Backdrop */}
        <div className="absolute inset-0 opacity-75 pointer-events-none z-0">
          <DotGrid
            dotSize={2.5}
            gap={30}
            baseColor="#7dd3fc"
            activeColor="#0369a1"
            proximity={130}
            shockRadius={0}
            resistance={150}
          />
        </div>

        {/* Center Interactive Particle Typography */}
        <div className="relative z-10 w-full flex-1 min-h-[260px] lg:min-h-[70vh] flex items-center justify-center my-auto">
          <ParticleText
            text={"A Q\nU I\nL A"}
            color="#0c4a6e"
            highlightColor="#0284c7"
            trigger="none"
            fitContainer={true}
            fontWeight={900}
            fontFamily='"Plus Jakarta Sans", sans-serif'
            particleSize={5}
            density={6.5}
            glow={false}
            pointerRepel={55}
            repelRadius={105}
            className="w-full h-full"
          />
        </div>
      </div>

      {/* =====================================================================
          RIGHT HALF (50%): CLEAN AUTHENTICATION STAGE + TOP-RIGHT HOME BUTTON
          ===================================================================== */}
      <div className="relative w-full lg:w-1/2 bg-white flex flex-col justify-center items-center px-6 sm:px-14 lg:px-20 xl:px-28 py-16 lg:py-0 min-h-screen overflow-y-auto">
        
        {/* Top-Right "Back to Landing Page" Button */}
        <div className="absolute top-6 right-6 sm:top-8 sm:right-10 z-20">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100/80 hover:bg-[#0c4a6e] text-slate-700 hover:text-white border border-slate-200/80 text-xs font-semibold transition-all shadow-2xs active:scale-95"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Home</span>
          </Link>
        </div>

        {/* Subtle bottom sky wash echoing the Admin sidebar */}
        <div className="absolute inset-x-0 bottom-0 h-[25%] bg-gradient-to-t from-sky-300/10 via-transparent to-transparent pointer-events-none" />

        <div className="relative z-10 w-full max-w-[400px] my-auto py-6">
          {children}
        </div>
      </div>

    </div>
  );
}
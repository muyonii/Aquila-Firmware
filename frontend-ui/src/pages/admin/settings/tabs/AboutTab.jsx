import React, { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { axiosClient } from '../../../../api/axios_client';
import { useTelemetryStore } from '../../../../stores/useTelemetryStore';
import { rtdbSubscription } from '../../../../firebase/rtdb_subscription';

export default function AboutTab() {
  const [health, setHealth] = useState(null);
  const [dbReachable, setDbReachable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000));

  const isConnected = useTelemetryStore((state) => state.isConnected);
  const nodes = useTelemetryStore((state) => state.nodes);
  const getSystemHealth = useTelemetryStore((state) => state.getSystemHealth);

  useEffect(() => {
    rtdbSubscription.subscribeConnectionStatus();
    rtdbSubscription.subscribeAllNodes();
    rtdbSubscription.subscribeHeartbeats();

    const timer = setInterval(() => {
      setNowSec(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const checkHealth = async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get('/system/health');
      if (res.data?.success && res.data.data) {
        setHealth(res.data.data);
        setDbReachable(res.data.data.database_mysql?.status === 'HEALTHY');
      } else {
        setDbReachable(false);
      }
    } catch {
      setDbReachable(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  // Check if Physical Testbed Node 01 is actually streaming (packet <= 45s old)
  const node01Telem = nodes?.['NODE-B1-001']?.telemetry;
  const node01Ts = Number(node01Telem?.timestamp || 0);
  const normalizedTs = node01Ts > 1e11 ? Math.floor(node01Ts / 1000) : node01Ts;
  const node01Age = normalizedTs > 0 ? Math.max(0, nowSec - normalizedTs) : null;
  const isNode01Streaming = node01Age !== null && node01Age <= 45;

  // Check MAS Watchdog
  const masHealth = getSystemHealth(nowSec);

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 tracking-tight">
            System Status &amp; Credits
          </h2>
          <p className="text-[0.8125rem] text-slate-600">
            Live architectural health and research provenance.
          </p>
        </div>
        <button
          type="button"
          onClick={checkHealth}
          className="px-3 py-1.5 rounded-control bg-white border border-slate-200 text-[0.8125rem] font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer shadow-2xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin': ''}`} />
          <span>Run Health Check</span>
        </button>
      </div>

      <div className="bg-white rounded-control p-5 border border-black/[0.06] shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-4">
        <h3 className="text-[0.8125rem] font-semibold text-slate-900">
          Live Architecture Diagnostics
        </h3>

        <div className="space-y-2 text-[0.8125rem]">
          {/* 1. Firebase Cloud Hot Store */}
          <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg">
            <span>Firebase Cloud Hot Store (Singapore)</span>
            <span
              className={`font-semibold font-mono ${
 isConnected ? 'text-emerald-700': 'text-rose-600'
 }`}
            >
              ● {isConnected ? 'Connected (WebSocket Live)' : 'Disconnected'}
            </span>
          </div>

          {/* 2. MySQL 8.0 Relational Core */}
          <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg">
            <span>MySQL 8.0 Relational Core (+08:00 PST)</span>
            <span
              className={`font-semibold font-mono ${
 loading
 ? 'text-slate-600'
 : dbReachable
 ? 'text-emerald-700'
 : 'text-rose-600'
 }`}
            >
              ● {loading ? 'Checking...' : dbReachable ? 'Connected (Healthy)' : 'Unreachable'}
            </span>
          </div>

          {/* 3. Physical Testbed Node 01 (45s Stale Cutoff) */}
          <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg">
            <span>Physical Testbed Node 01 (15.0s Pulse)</span>
            <span
              className={`font-semibold font-mono ${
 isNode01Streaming ? 'text-emerald-700': 'text-slate-600'
 }`}
            >
              ● {isNode01Streaming ? `Streaming (${node01Age}s ago)` : 'Offline (No Pulse >45s)'}
            </span>
          </div>

          {/* 4. MAS Multi-Agent Watchdog (30s Cutoff) */}
          <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg">
            <span>MAS Multi-Agent Engine (30.0s Watchdog)</span>
            <span
              className={`font-semibold font-mono ${
 masHealth.isHealthy
 ? 'text-emerald-700'
 : masHealth.healthyCount > 0
 ? 'text-amber-600'
 : 'text-rose-600'
 }`}
            >
              ● {masHealth.overallStatus} ({masHealth.healthyCount}/{masHealth.totalCount} Agents Active)
            </span>
          </div>
        </div>

        <div className="pt-2 text-[0.8125rem] text-slate-600 space-y-1">
          <p>
            <strong>Platform:</strong> {health?.system_name || 'AQUILA Decision Support System'} v{health?.version || '2.3.0'}
          </p>
          <p>
            <strong>Academic Home:</strong> Bataan Peninsula State University (BPSU) Main Campus
          </p>
          <p>
            <strong>Partner Utility:</strong> Barangay Water and Sanitation Association (BAWASA) Sector 03
          </p>
        </div>
      </div>
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { ref, set } from 'firebase/database';
import { rtdb } from '../../firebase/firebase_config';
import { useTelemetryStore } from '../../stores/useTelemetryStore';
import {
  Cpu,
  CheckCircle2,
  AlertTriangle,
  Wifi,
  WifiOff,
  Activity
} from 'lucide-react';

export default function AgentHeartbeatBar() {
  function formatElapsedAge(sec) {
    if (sec === null || sec === undefined) return 'no signal';
    if (sec < 60) return `${sec}s ago`;
    if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
    if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
    return `${Math.floor(sec / 86400)}d ago`;
  }
  const isConnected = useTelemetryStore((state) => state.isConnected);
  const heartbeats = useTelemetryStore((state) => state.heartbeats);
  const getSystemHealth = useTelemetryStore((state) => state.getSystemHealth);

  // 1-second live watchdog ticker so ageSeconds updates every second even if agents stop sending
  const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000));
  const [pulsing, setPulsing] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setNowSec(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Re-evaluate system health every second against the 30s circuit breaker
  const systemHealth = getSystemHealth(nowSec);
  const agents = Object.values(systemHealth.agentDetails || {});

  // Manual Heartbeat Ping (Useful when testing UI without the Python agent daemon running)
  const handleSendHeartbeatPulse = async () => {
    setPulsing(true);
    const ts = Math.floor(Date.now() / 1000);
    try {
      await Promise.all([
        set(ref(rtdb, 'blackboard/heartbeats/CMP-LDA-01'), {
          agent_id: 'CMP-LDA-01',
          status: 'HEALTHY',
          timestamp: ts
        }),
        set(ref(rtdb, 'blackboard/heartbeats/CMP-FEA-01'), {
          agent_id: 'CMP-FEA-01',
          status: 'HEALTHY',
          timestamp: ts
        }),
        set(ref(rtdb, 'blackboard/heartbeats/CMP-CA-01'), {
          agent_id: 'CMP-CA-01',
          status: 'HEALTHY',
          timestamp: ts
        })
      ]);
      setNowSec(ts);
    } catch (err) {
      console.warn('[Watchdog] Failed to write heartbeat pulse:', err.message);
    } finally {
      setPulsing(false);
    }
  };

  return (
    <div
      className="aq-card !py-3 !px-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-sm"
      title="30.0s circuit breaker cutoff (FR-DSS-03) · 15.0s deliberation cycle"
    >
      <div className="flex items-center gap-x-5 gap-y-1 flex-wrap">
        <span className="font-semibold text-slate-900">Agents</span>

        {agents.map((agent) => {
          const ageText = formatElapsedAge(agent.ageSeconds);
          const statusLabel = agent.isAlive ? 'active' : 'offline';
          return (
            <span key={agent.id} className="text-slate-700 flex items-center gap-2">
              <span className="aq-dot" style={{ background: agent.isAlive ? '#0f766e' : '#b42318' }} aria-hidden="true" />
              <span>{agent.short} {statusLabel} · {ageText}</span>
            </span>
          );
        })}

        {!systemHealth.isHealthy && (
          <span className={`font-medium ${systemHealth.overallStatus === 'DEGRADED' ? 'text-amber-800' : 'text-rose-800'}`}>
            {systemHealth.overallStatus === 'DEGRADED'
              ? `Degraded: ${systemHealth.healthyCount}/${systemHealth.totalCount} agents active`
              : 'Monitoring offline (>30s timeout)'}
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={handleSendHeartbeatPulse}
        disabled={pulsing}
        className="aq-btn-secondary !h-9"
        title="Broadcast a 30-second heartbeat pulse to Firebase"
      >
        {pulsing ? 'Pulsing...' : 'Pulse agents'}
      </button>
    </div>
  );
}

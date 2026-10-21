import React, { useState, useEffect, useMemo } from 'react';
import { ref, onValue, set } from 'firebase/database';
import { rtdb } from '../../firebase/firebase_config';
import { adminApi } from '../../api/admin_api';
import { axiosClient } from '../../api/axios_client';
import { Activity, Radio, RefreshCw, Zap } from 'lucide-react';

export default function SystemInspectorPage() {
  const [sqlNodes, setSqlNodes] = useState([]);
  const [fbNodes, setFbNodes] = useState({});
  const [hypotheses, setHypotheses] = useState({ leak: {}, fairness: {} });
  const [activeIncidents, setActiveIncidents] = useState({});
  const [heartbeats, setHeartbeats] = useState({});
  const [selectedNode, setSelectedNode] = useState('NODE-B1-001');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionStatus, setActionStatus] = useState('');

  // 1-second live clock to evaluate 30s Agent Watchdog & 45s Node Stale Timeout
  const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const timer = setInterval(() => {
      setNowSec(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Load canonical node list from MySQL + Subscribe to Firebase Hot Store
  useEffect(() => {
    adminApi
      .getNodes()
      .then((res) => {
        if (res?.success && Array.isArray(res.data?.nodes)) {
          setSqlNodes(res.data.nodes);
        }
      })
      .catch(() => {});

    const nodesRef = ref(rtdb, 'nodes');
    const hypRef = ref(rtdb, 'blackboard/hypotheses');
    const incRef = ref(rtdb, 'blackboard/incidents/active');
    const hbRef = ref(rtdb, 'blackboard/heartbeats');

    const unsubNodes = onValue(nodesRef, (snap) => setFbNodes(snap.val() || {}));
    const unsubHyp = onValue(hypRef, (snap) =>
      setHypotheses(snap.val() || { leak: {}, fairness: {} })
    );
    const unsubInc = onValue(incRef, (snap) => setActiveIncidents(snap.val() || {}));
    const unsubHb = onValue(hbRef, (snap) => setHeartbeats(snap.val() || {}));

    return () => {
      unsubNodes();
      unsubHyp();
      unsubInc();
      unsubHb();
    };
  }, []);

  const allNodeIds = useMemo(() => {
    const setIds = new Set([
      ...sqlNodes.map((n) => n.node_id),
      ...Object.keys(fbNodes)
    ]);
    if (setIds.size === 0) {
      return [
        'NODE-B1-001',
        'NODE-B1-002',
        'NODE-B1-003',
        'NODE-B1-004',
        'NODE-B1-005',
        'NODE-B1-006',
        'NODE-B1-007',
        'NODE-B1-008',
        'NODE-B1-009'
      ];
    }
    return Array.from(setIds).sort();
  }, [sqlNodes, fbNodes]);

  // Helper: Check if a node's telemetry packet is fresh (<= 45s old)
  const isNodeTelemetryFresh = (nodeId) => {
    const telem = fbNodes[nodeId]?.telemetry;
    if (!telem || !telem.timestamp) return false;
    const rawTs = Number(telem.timestamp);
    const ts = rawTs > 1e11 ? Math.floor(rawTs / 1000) : rawTs;
    return Math.max(0, nowSec - ts) <= 45;
  };

  // Decision Justification Engine (The "Why")
  const getJustificationTrace = (nodeId) => {
    const nodeData = fbNodes[nodeId] || {};
    const telemetry = nodeData.telemetry || {};
    const leakHyp = hypotheses.leak?.[nodeId] || {};
    const fairHyp = hypotheses.fairness?.[nodeId] || {};
    const activeInc = Object.values(activeIncidents).find((i) => i.node_id === nodeId);
    const isFresh = isNodeTelemetryFresh(nodeId);

    const q = typeof telemetry.flow_rate_lpm === 'number' ? telemetry.flow_rate_lpm : 0;
    const prob =
      typeof leakHyp.leak_probability === 'number' ? leakHyp.leak_probability : 0;
    const classif = leakHyp.classification || 'NORMAL';
    const acadTerm = leakHyp.academic_term || 'Stochastic High-Variance Demand';
    const rdi = typeof fairHyp.rdi_score === 'number' ? fairHyp.rdi_score : 1.0;

    if (!isFresh) {
      return {
        badge: 'bg-slate-100 text-slate-600 border-slate-300',
        status: 'SENSOR OFFLINE (STALE TELEMETRY >45s)',
        rule: 'Packet age > 45.0s stale telemetry cutoff (Rule INV-04 / EXC-01).',
        directive:
          'No active telemetry stream from this node. Start the hardware rig or simulator, or use the Demo Control Hub below.',
        academicTerm: 'Telemetry Stream Timeout (Disconnection)'
      };
    }

    if (activeInc) {
      return {
        badge: 'bg-rose-100 text-rose-800 border-rose-200',
        status: `ACTIVE INCIDENT: ${activeInc.display_name || activeInc.incident_type}`,
        rule:
          activeInc.academic_classification === 'TOPOLOGICAL_MASS_DEFICIT'
            ? 'ΔQ = Q_parent - ∑ Q_children > 1.5 LPM Mass Balance Tolerance'
            : `Probability ${(prob * 100).toFixed(1)}% >= 40% threshold. Duration >= 30s.`,
        directive:
          activeInc.recommendation?.action_directive || 'Inspect node immediately.',
        academicTerm: activeInc.academic_term || 'High-Velocity Laminar Pipe Burst'
      };
    }

    if (classif === 'LEAK') {
      return {
        badge: 'bg-rose-100 text-rose-800 border-rose-200',
        status: `CONFIRMED LEAK (${leakHyp.display_name || 'Pipe Rupture'})`,
        rule: `Probability ${(prob * 100).toFixed(1)}% >= 40% threshold. Flow: ${q.toFixed(2)} LPM.`,
        directive:
          'Continuous laminar discharge detected. Close local gate valve and inspect pipe union.',
        academicTerm: acadTerm
      };
    }

    if (classif === 'SUSPICIOUS') {
      return {
        badge: 'bg-amber-100 text-amber-800 border-amber-200',
        status: 'SUSPICIOUS DRAW (Watchlist)',
        rule: `Probability ${(prob * 100).toFixed(1)}% >= 40%, unpaused draw (${q.toFixed(2)} LPM).`,
        directive:
          'Inspect domestic fixtures for leaking toilet flapper valves or open garden taps.',
        academicTerm: 'Zero-Flow Invariant Violation'
      };
    }

    if (fairHyp.is_disadvantaged) {
      return {
        badge: 'bg-purple-100 text-purple-800 border-purple-200',
        status: 'FAIRNESS DEFICIT (Low Water Supply)',
        rule: `Rawlsian RDI: ${rdi.toFixed(2)} < 0.70 community mean cutoff.`,
        directive:
          'Household receiving significantly less water than neighborhood average. Check upstream valve.',
        academicTerm: 'Rawlsian Relative Deprivation Deficit'
      };
    }

    if (q < 1.0) {
      return {
        badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        status: 'NORMAL (Impeller Floor Clamp)',
        rule: `Flow (${q.toFixed(2)} LPM) < 1.0 LPM mechanical sensor floor (Rule EXC-02).`,
        directive:
          'Water velocity is quiescent or below meter spinning threshold. Clamped to 5% prob.',
        academicTerm: 'Sub-Threshold Quiescent Flow'
      };
    }

    return {
      badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      status: 'NORMAL CONSUMPTION',
      rule: `Flow (${q.toFixed(2)} LPM) matches domestic usage profile. Probability: ${(prob * 100).toFixed(1)}% < 40%.`,
      directive:
        'Dynamic high-variance flow consistent with normal household usage (showering/tap).',
      academicTerm: 'Stochastic High-Variance Demand'
    };
  };

  // Interactive Demo Scenario Injectors
  const handleInjectScenario = async (type) => {
    setActionLoading(true);
    const now = Math.floor(Date.now() / 1000);

    try {
      await Promise.all([
        set(ref(rtdb, 'blackboard/heartbeats/CMP-LDA-01'), {
          agent_id: 'CMP-LDA-01',
          status: 'HEALTHY',
          timestamp: now
        }),
        set(ref(rtdb, 'blackboard/heartbeats/CMP-FEA-01'), {
          agent_id: 'CMP-FEA-01',
          status: 'HEALTHY',
          timestamp: now
        }),
        set(ref(rtdb, 'blackboard/heartbeats/CMP-CA-01'), {
          agent_id: 'CMP-CA-01',
          status: 'HEALTHY',
          timestamp: now
        })
      ]);

      if (type === 'BURST') {
        const target = 'NODE-B1-002';
        await Promise.all([
          set(ref(rtdb, `nodes/${target}/telemetry`), {
            node_id: target,
            packet_sequence: Date.now(),
            timestamp: now,
            flow_rate_lpm: 18.5,
            cumulative_liters: 1540.2,
            battery_voltage: 4.08,
            is_simulated: true
          }),
          set(ref(rtdb, `blackboard/hypotheses/leak/${target}`), {
            node_id: target,
            classification: 'LEAK',
            academic_classification: 'HIGH_VELOCITY_BURST',
            academic_term: 'High-Velocity Laminar Pipe Burst',
            display_name: 'Sudden Pipe Rupture',
            leak_probability: 0.96,
            flow_rate_lpm: 18.5,
            duration_minutes: 15,
            timestamp: now
          }),
          adminApi.createManualIncident({
            node_id: target,
            incident_type: 'CRITICAL_LEAK',
            severity_level: 'P1',
            complaint_notes: 'Automated MAS Detection: High-velocity pipe burst (18.50 LPM) on NODE-B1-002.'
          })
        ]);
        setSelectedNode(target);
        setActionStatus('🚨 Injected P1 Pipe Burst on NODE-B1-002 (18.50 LPM + MySQL Ticket Created)');
      } else if (type === 'TOILET') {
        const target = 'NODE-B1-005';
        await Promise.all([
          set(ref(rtdb, `nodes/${target}/telemetry`), {
            node_id: target,
            packet_sequence: Date.now(),
            timestamp: now,
            flow_rate_lpm: 2.15,
            cumulative_liters: 1220.0,
            battery_voltage: 4.12,
            is_simulated: true
          }),
          set(ref(rtdb, `blackboard/hypotheses/leak/${target}`), {
            node_id: target,
            classification: 'SUSPICIOUS',
            academic_classification: 'ZERO_FLOW_INVARIANT',
            academic_term: 'Zero-Flow Invariant Violation',
            display_name: 'Continuous Fixture Leak',
            leak_probability: 0.68,
            flow_rate_lpm: 2.15,
            duration_minutes: 32,
            timestamp: now
          }),
          adminApi.createManualIncident({
            node_id: target,
            incident_type: 'SUSPICIOUS_USAGE',
            severity_level: 'P3',
            complaint_notes: 'Automated MAS Detection: Continuous unpaused fixture draw (2.15 LPM) on NODE-B1-005.'
          })
        ]);
        setSelectedNode(target);
        setActionStatus('🚽 Injected Running Toilet Fixture Leak on NODE-B1-005 (2.15 LPM + Ticket Created)');
      } else if (type === 'EQUITY') {
        const target = 'NODE-B1-008';
        await Promise.all([
          set(ref(rtdb, `nodes/${target}/telemetry`), {
            node_id: target,
            packet_sequence: Date.now(),
            timestamp: now,
            flow_rate_lpm: 0.45,
            cumulative_liters: 810.0,
            battery_voltage: 4.05,
            is_simulated: true
          }),
          set(ref(rtdb, `blackboard/hypotheses/fairness/${target}`), {
            node_id: target,
            rdi_score: 0.42,
            delta_liters: 45.0,
            community_mean_liters: 110.0,
            is_disadvantaged: true,
            timestamp: now
          }),
          adminApi.createManualIncident({
            node_id: target,
            incident_type: 'FAIRNESS_DEFICIT',
            severity_level: 'P2',
            complaint_notes: 'Automated MAS Detection: Rawlsian RDI Deficit (RDI = 0.42 < 0.70) on NODE-B1-008.'
          })
        ]);
        setSelectedNode(target);
        setActionStatus('⚖️ Injected Rawlsian Equity Deficit on NODE-B1-008 (RDI = 0.42)');
      } else if (type === 'RESET_NORMAL') {
        const resetPromises = allNodeIds.flatMap((id) => [
          set(ref(rtdb, `nodes/${id}/telemetry`), {
            node_id: id,
            packet_sequence: Date.now(),
            timestamp: now,
            flow_rate_lpm: 0.0,
            cumulative_liters: 1500.0,
            battery_voltage: 4.15,
            is_simulated: id !== 'NODE-B1-001'
          }),
          set(ref(rtdb, `blackboard/hypotheses/leak/${id}`), {
            node_id: id,
            classification: 'NORMAL',
            academic_classification: 'NORMAL_CONSUMPTION',
            academic_term: 'Stochastic High-Variance Demand',
            display_name: 'Normal Usage',
            leak_probability: 0.05,
            flow_rate_lpm: 0.0,
            timestamp: now
          }),
          set(ref(rtdb, `blackboard/hypotheses/fairness/${id}`), {
            node_id: id,
            rdi_score: 1.0,
            delta_liters: 110.0,
            community_mean_liters: 110.0,
            is_disadvantaged: false,
            timestamp: now
          })
        ]);
        await Promise.all(resetPromises);
        setActionStatus('✅ Broadcast fresh 45s telemetry pulse for all nodes (0.00 LPM, RDI 1.00).');
      } else if (type === 'SQL_COMPACT') {
        const res = await axiosClient.post('/reports/compact-now');
        setActionStatus(`💾 SQL Compaction Completed: ${res.data?.message || 'OK'}`);
      } else if (type === 'HEARTBEATS') {
        setActionStatus('💓 All 3 MAS Agent Heartbeats (LDA, FEA, CA) pulsed for 30 seconds.');
      }
      setNowSec(now);
    } catch (err) {
      setActionStatus(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const selectedNodeData = fbNodes[selectedNode] || {};
  const selectedTelem = selectedNodeData.telemetry || {};
  const selectedProfile = selectedNodeData.profile || {};
  const selectedIsFresh = isNodeTelemetryFresh(selectedNode);
  const trace = getJustificationTrace(selectedNode);

  // Real 30-second Watchdog Evaluation (NO || 3 fallback!)
  const monitoredIds = ['CMP-LDA-01', 'CMP-FEA-01', 'CMP-CA-01'];
  const healthyAgentsCount = monitoredIds.filter((id) => {
    const pulse = heartbeats[id];
    if (!pulse || pulse.status !== 'HEALTHY' || !pulse.timestamp) return false;
    const rawTs = Number(pulse.timestamp);
    const ts = rawTs > 1e11 ? Math.floor(rawTs / 1000) : rawTs;
    return Math.max(0, nowSec - ts) <= 30;
  }).length;

  const watchdogStatus =
    healthyAgentsCount === 3
      ? 'HEALTHY'
      : healthyAgentsCount > 0
      ? 'DEGRADED'
      : 'OFFLINE (TIMEOUT >30s)';

  const watchdogColor =
    healthyAgentsCount === 3
      ? 'text-emerald-600'
      : healthyAgentsCount > 0
      ? 'text-amber-600'
      : 'text-rose-600';

  return (
    <div className="min-h-full bg-canvas text-slate-900 p-6 sm:p-10 space-y-6 select-none font-sans">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/[0.05] pb-6">
        <div>
          <div className="text-[0.8125rem] font-mono font-semibold text-slate-600 flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5 text-[#0369a1]" />
            <span>Multi-Agent System Inspector</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 mt-1">
            System Control &amp; Diagnostic Hub
          </h1>
          <p className="text-[0.8125rem] text-slate-600">
            Real-time multi-agent brain state, mathematical decision justification, and interactive scenario control.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-white px-3.5 py-2 rounded-control border border-line shadow-2xs text-right">
            <div className="text-[0.8125rem] font-semibold text-slate-600 ">
              Engine Watchdog (30s Cutoff)
            </div>
            <div className={`text-[0.8125rem] font-mono font-semibold ${watchdogColor}`}>
              ● {watchdogStatus} ({healthyAgentsCount}/3 Agents)
            </div>
          </div>
        </div>
      </div>

      {/* Main 12-Column Diagnostic Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left: Live Node Telemetry & AI Brain Matrix (7 Cols) */}
        <div className="lg:col-span-7 aq-surface rounded-card border border-line shadow-soft p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-black/[0.05] pb-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Radio className="h-4 w-4 text-[#0369a1]" />
                <span>Live Node Telemetry &amp; AI Brain Matrix</span>
              </h3>
              <p className="text-[0.8125rem] text-slate-600 mt-0.5">
                Click any row to inspect decision trace math.
              </p>
            </div>
            <span className="text-[0.8125rem] font-mono font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
              {allNodeIds.length} Nodes Registered
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-[0.8125rem] border-collapse">
              <thead>
                <tr className="border-b border-black/[0.05] text-[0.8125rem] font-semibold text-slate-600 ">
                  <th className="py-2.5 px-3">Node</th>
                  <th className="py-2.5 px-3">Flow (L/m)</th>
                  <th className="py-2.5 px-3">Leak Prob</th>
                  <th className="py-2.5 px-3">RDI Share</th>
                  <th className="py-2.5 px-3">Classification</th>
                  <th className="py-2.5 px-3 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.03]">
                {allNodeIds.map((nodeId) => {
                  const nodeData = fbNodes[nodeId] || {};
                  const telem = nodeData.telemetry || {};
                  const leak = hypotheses.leak?.[nodeId] || {};
                  const fair = hypotheses.fairness?.[nodeId] || {};
                  const isFresh = isNodeTelemetryFresh(nodeId);

                  const flow = isFresh ? Number(telem.flow_rate_lpm || 0) : 0.0;
                  const prob = isFresh ? Number(leak.leak_probability ?? 0.05) * 100 : 0.0;
                  const rdi = Number(fair.rdi_score ?? 1.0);
                  const isSelected = selectedNode === nodeId;

                  return (
                    <tr
                      key={nodeId}
                      onClick={() => setSelectedNode(nodeId)}
                      className={`cursor-pointer transition-colors ${
 isSelected ? 'bg-sky-50/80 font-semibold': 'hover:bg-black/[0.02]'
 }`}
                    >
                      <td className="py-3 px-3 font-mono font-semibold text-slate-900">
                        {nodeId}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-800">
                        {flow.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 font-mono">
                        <span className={prob >= 40 ? 'text-rose-600 font-semibold' : 'text-slate-600'}>
                          {prob.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono">
                        <span
                          className={
                            fair.is_disadvantaged ? 'text-amber-600 font-semibold' : 'text-slate-600'
                          }
                        >
                          {rdi.toFixed(2)}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        {!isFresh ? (
                          <span className="px-2 py-0.5 rounded text-[0.8125rem] font-semibold border bg-slate-100 text-slate-600 border-slate-200">
                            Sensor Offline
                          </span>
                        ) : (
                          <span
                            className={`px-2 py-0.5 rounded text-[0.8125rem] font-semibold border ${
 leak.classification === 'LEAK'
 ? 'bg-rose-50 text-rose-700 border-rose-200'
 : leak.classification === 'SUSPICIOUS'
 ? 'bg-amber-50 text-amber-700 border-amber-200'
 : fair.is_disadvantaged
 ? 'bg-purple-50 text-purple-700 border-purple-200'
 : 'bg-emerald-50 text-emerald-700 border-emerald-200'
 }`}
                          >
                            {fair.is_disadvantaged
                              ? 'LOW WATER (RDI)'
                              : leak.display_name || leak.classification || 'Normal Usage'}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right text-slate-600">
                        {isSelected ? '👉' : '🔍'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Decision Justification & Interactive Demo Control Hub (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          <div className="aq-surface rounded-card border border-line shadow-soft p-5 space-y-4">
            <div className="border-b border-black/[0.05] pb-3 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Decision Justification Trace
                </h3>
                <p className="text-[0.8125rem] text-slate-600 mt-0.5">
                  Target Node:{' '}
                  <strong className="text-slate-900 font-mono">{selectedNode}</strong>
                </p>
              </div>
              <span className="text-[0.8125rem] font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                Rule Inspector
              </span>
            </div>

            <div className={`p-3 rounded-control border text-[0.8125rem] ${trace.badge}`}>
              <div className="font-semibold ">{trace.status}</div>
            </div>

            <div className="p-3 bg-slate-50 rounded-control border border-slate-200/60 space-y-1">
              <span className="text-[0.8125rem] font-semibold text-slate-600 block">
                Academic Literature Term
              </span>
              <span className="text-[0.8125rem] font-semibold text-slate-800 italic block">
                {trace.academicTerm}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-control border border-slate-200/60 space-y-1">
              <span className="text-[0.8125rem] font-semibold text-slate-600 block">
                Mathematical Rule Trigger
              </span>
              <p className="text-[0.8125rem] font-mono text-slate-700 leading-relaxed">{trace.rule}</p>
            </div>

            <div className="p-3 bg-slate-50 rounded-control border border-slate-200/60 space-y-1">
              <span className="text-[0.8125rem] font-semibold text-slate-600 block">
                Field Action Directive
              </span>
              <p className="text-[0.8125rem] text-slate-700 leading-relaxed font-medium">
                {trace.directive}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[0.8125rem] font-mono pt-1">
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/50">
                <span className="text-[0.8125rem] text-slate-600 block font-sans ">
                  Instantaneous Flow
                </span>
                <span className="font-semibold text-slate-900">
                  {selectedIsFresh ? `${(selectedTelem.flow_rate_lpm || 0).toFixed(2)} LPM` : '0.00 LPM (Offline)'}
                </span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/50">
                <span className="text-[0.8125rem] text-slate-600 block font-sans ">
                  Night Base Baseline
                </span>
                <span className="font-semibold text-slate-900">
                  {(selectedProfile.expected_night_flow_lpm || 0.05).toFixed(2)} LPM
                </span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/50">
                <span className="text-[0.8125rem] text-slate-600 block font-sans ">
                  Cumulative Odometer
                </span>
                <span className="font-semibold text-slate-900">
                  {(selectedTelem.cumulative_liters || 0).toFixed(1)} L
                </span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/50">
                <span className="text-[0.8125rem] text-slate-600 block font-sans ">
                  Typical Max Duration
                </span>
                <span className="font-semibold text-slate-900">
                  {(selectedProfile.typical_max_duration_mins || 20).toFixed(0)} Mins
                </span>
              </div>
            </div>
          </div>

          {/* Interactive Demo Control Hub */}
          <div className="aq-surface rounded-card border border-line shadow-soft p-5 space-y-3">
            <div className="border-b border-black/[0.05] pb-2.5 flex justify-between items-center">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" />
                <span>Interactive Demo Control Hub</span>
              </h3>
              {actionLoading && (
                <RefreshCw className="h-3.5 w-3.5 animate-spin text-slate-600" />
              )}
            </div>

            {actionStatus && (
              <div className="p-2.5 rounded-lg bg-sky-50 border border-sky-200 text-[0.8125rem] text-sky-800 font-mono">
                {actionStatus}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 text-[0.8125rem]">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleInjectScenario('BURST')}
                className="p-2.5 rounded-control bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 font-semibold transition-all cursor-pointer text-left"
              >
                🚨 Inject Pipe Burst (B1-002)
              </button>

              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleInjectScenario('TOILET')}
                className="p-2.5 rounded-control bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-semibold transition-all cursor-pointer text-left"
              >
                🚽 Inject Running Toilet (B1-005)
              </button>

              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleInjectScenario('EQUITY')}
                className="p-2.5 rounded-control bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 font-semibold transition-all cursor-pointer text-left"
              >
                ⚖️ Inject Equity Deficit (B1-008)
              </button>

              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleInjectScenario('SQL_COMPACT')}
                className="p-2.5 rounded-control bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 font-semibold transition-all cursor-pointer text-left"
              >
                💾 Force SQL Compaction
              </button>

              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleInjectScenario('HEARTBEATS')}
                className="p-2.5 rounded-control bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 font-semibold transition-all cursor-pointer text-left"
              >
                💓 Sync Agent Heartbeats
              </button>

              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleInjectScenario('RESET_NORMAL')}
                className="p-2.5 rounded-control bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-semibold transition-all cursor-pointer text-left"
              >
                🔄 Broadcast Normal Stream
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
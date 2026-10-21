import { create } from 'zustand';
import { THRESHOLDS } from '../config/thresholds';

const STALE_TIMEOUT_SEC = THRESHOLDS.STALE_TELEMETRY_TIMEOUT_SECONDS;
const LOW_BATTERY_VOLTS = THRESHOLDS.LOW_BATTERY_THRESHOLD_VOLTS;
const HEARTBEAT_TIMEOUT_SEC = THRESHOLDS.CIRCUIT_BREAKER_TIMEOUT_SECONDS;
const MAX_HISTORY_POINTS = 20;

export const useTelemetryStore = create((set, get) => ({
  // 1. Hot Store State
  isConnected: false,
  nodes: {},               // { [nodeId]: { status, telemetry: { flow_rate_lpm, cumulative_liters, ... } } }
  leakHypotheses: {},      // { [nodeId]: { classification, leak_probability, flow_rate_lpm, ... } }
  fairnessHypotheses: {},  // { [nodeId]: { rdi_score, delta_liters, is_disadvantaged, ... } }
  heartbeats: {},          // { [agentId]: { status, timestamp } }
  telemetryHistory: {},    // { [nodeId]: [{ timestamp, flow }] } rolling 20-point sparkline buffer
  lastUpdated: null,

  // 2. Realtime Stream Actions
  setConnectionStatus: (isConnected) => set({ isConnected }),

  /**
   * Update nodes and append fresh packets to sparkline history buffer
   */
  setNodesData: (incomingNodes) => {
    const prevHistory = get().telemetryHistory;
    const updatedHistory = { ...prevHistory };

    Object.entries(incomingNodes).forEach(([nodeId, nodeData]) => {
      const telemetry = nodeData?.telemetry;
      if (!telemetry || typeof telemetry.flow_rate_lpm !== 'number') return;

      const currentFlow = telemetry.flow_rate_lpm;
      const packetTime = telemetry.timestamp || Math.floor(Date.now() / 1000);

      const nodeHistory = updatedHistory[nodeId] ? [...updatedHistory[nodeId]] : [];
      const lastEntry = nodeHistory[nodeHistory.length - 1];

      // Append only if timestamp is fresh
      if (!lastEntry || lastEntry.timestamp !== packetTime) {
        nodeHistory.push({ timestamp: packetTime, flow: currentFlow });
        if (nodeHistory.length > MAX_HISTORY_POINTS) {
          nodeHistory.shift();
        }
        updatedHistory[nodeId] = nodeHistory;
      }
    });

    set({
      nodes: incomingNodes,
      telemetryHistory: updatedHistory,
      lastUpdated: Date.now()
    });
  },

  /**
   * Update single node telemetry (used for Resident tenant isolation)
   */
  setSingleNodeData: (nodeId, nodeData) => {
    const prevNodes = get().nodes;
    const prevHistory = get().telemetryHistory;

    const telemetry = nodeData?.telemetry;
    const nodeHistory = prevHistory[nodeId] ? [...prevHistory[nodeId]] : [];

    if (telemetry && typeof telemetry.flow_rate_lpm === 'number') {
      const currentFlow = telemetry.flow_rate_lpm;
      const packetTime = telemetry.timestamp || Math.floor(Date.now() / 1000);
      const lastEntry = nodeHistory[nodeHistory.length - 1];

      if (!lastEntry || lastEntry.timestamp !== packetTime) {
        nodeHistory.push({ timestamp: packetTime, flow: currentFlow });
        if (nodeHistory.length > MAX_HISTORY_POINTS) nodeHistory.shift();
      }
    }

    set({
      nodes: { ...prevNodes, [nodeId]: nodeData },
      telemetryHistory: { ...prevHistory, [nodeId]: nodeHistory },
      lastUpdated: Date.now()
    });
  },

  setLeakHypotheses: (leakHypotheses) => set({ leakHypotheses }),

  setFairnessHypotheses: (fairnessHypotheses) => set({ fairnessHypotheses }),

  setHeartbeats: (heartbeats) => set({ heartbeats }),

  resetTelemetryStore: () =>
    set({
      isConnected: false,
      nodes: {},
      leakHypotheses: {},
      fairnessHypotheses: {},
      heartbeats: {},
      telemetryHistory: {},
      lastUpdated: null
    }),

  // 3. Computed Selectors

  /**
   * Returns complete telemetry and AI hypothesis state for a given node ID
   */
  getNode: (nodeId) => {
    const state = get();
    const node = state.nodes[nodeId] || null;
    return {
      nodeId,
      status: node?.status || 'INACTIVE',
      telemetry: node?.telemetry || null,
      leak: state.leakHypotheses[nodeId] || null,
      fairness: state.fairnessHypotheses[nodeId] || null,
      history: state.telemetryHistory[nodeId] || []
    };
  },

  /**
   * Checks if node telemetry packet is stale (> 45 seconds old)
   */
  isNodeStale: (nodeId) => {
    const telemetry = get().nodes[nodeId]?.telemetry;
    if (!telemetry || !telemetry.timestamp) return true;
    const nowEpoch = Math.floor(Date.now() / 1000);
    return nowEpoch - telemetry.timestamp > STALE_TIMEOUT_SEC;
  },

  /**
   * Checks if battery potential is below low-voltage threshold (3.35V)
   */
  isLowBattery: (nodeId) => {
    const telemetry = get().nodes[nodeId]?.telemetry;
    if (!telemetry || typeof telemetry.battery_voltage !== 'number') return false;
    return telemetry.battery_voltage < LOW_BATTERY_VOLTS;
  },

  /**
   * Evaluates MAS Multi-Agent System health against the 30-second circuit breaker (FR-DSS-03)
   * @param {number} [referenceNowSec] - Current Unix epoch in seconds (passed from 1s ticker)
   */
  getSystemHealth: (referenceNowSec) => {
    const heartbeats = get().heartbeats || {};
    const nowEpoch = referenceNowSec || Math.floor(Date.now() / 1000);

    const monitoredAgents = [
      { id: 'CMP-LDA-01', short: 'LDA', name: 'Leak Detection Agent' },
      { id: 'CMP-FEA-01', short: 'FEA', name: 'Fairness Equity Agent' },
      { id: 'CMP-CA-01',  short: 'CA',  name: 'Coordinator Agent' }
    ];

    let healthyCount = 0;
    const degradedAgents = [];
    const agentDetails = {};

    monitoredAgents.forEach((agent) => {
      const pulse = heartbeats[agent.id];
      let rawTs = Number(pulse?.timestamp || 0);
      // Normalize if timestamp was written in milliseconds
      if (rawTs > 1e11) {
        rawTs = Math.floor(rawTs / 1000);
      }

      const hasTimestamp = rawTs > 0;
      const ageSeconds = hasTimestamp ? Math.max(0, nowEpoch - rawTs) : null;
      const isFresh = ageSeconds !== null && ageSeconds <= HEARTBEAT_TIMEOUT_SEC;
      const isStatusHealthy = pulse?.status === 'HEALTHY';
      const isAlive = Boolean(isFresh && isStatusHealthy);

      if (isAlive) {
        healthyCount++;
      } else {
        degradedAgents.push(agent.id);
      }

      agentDetails[agent.id] = {
        ...agent,
        isAlive,
        status: !hasTimestamp
          ? 'NO_SIGNAL'
          : !isFresh
          ? 'STALE_TIMEOUT'
          : pulse?.status || 'UNKNOWN',
        ageSeconds,
        lastTimestamp: rawTs || null
      };
    });

    const overallStatus =
      healthyCount === monitoredAgents.length
        ? 'HEALTHY'
        : healthyCount > 0
        ? 'DEGRADED'
        : 'OFFLINE';

    return {
      isHealthy: healthyCount === monitoredAgents.length,
      overallStatus,
      healthyCount,
      totalCount: monitoredAgents.length,
      timeoutThresholdSec: HEARTBEAT_TIMEOUT_SEC,
      degradedAgents,
      agentDetails
    };
  }
}));
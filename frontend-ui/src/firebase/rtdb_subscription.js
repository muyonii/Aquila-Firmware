import { ref, onValue, off } from 'firebase/database';
import { rtdb } from './firebase_config';
import { useTelemetryStore } from '../stores/useTelemetryStore';

// Active listener registry for clean memory management
const activeListeners = new Map();

export const rtdbSubscription = {
  /**
   * Monitor WebSocket connection status (.info/connected)
   */
  subscribeConnectionStatus() {
    if (activeListeners.has('connection_status')) return;

    const connectedRef = ref(rtdb, '.info/connected');
    const callback = onValue(connectedRef, (snap) => {
      const isConnected = !!snap.val();
      useTelemetryStore.getState().setConnectionStatus(isConnected);
    });

    activeListeners.set('connection_status', { ref: connectedRef, callback });
  },

  /**
   * Subscribe to ALL nodes telemetry (/nodes) for Admin and Technician views
   */
  subscribeAllNodes() {
    if (activeListeners.has('all_nodes')) return;

    const nodesRef = ref(rtdb, 'nodes');
    const callback = onValue(nodesRef, (snapshot) => {
      const data = snapshot.val() || {};
      useTelemetryStore.getState().setNodesData(data);
    }, (error) => {
      console.error('[RTDB Error] Failed to stream /nodes:', error.message);
    });

    activeListeners.set('all_nodes', { ref: nodesRef, callback });
  },

  /**
   * Subscribe to a SINGLE assigned household meter (/nodes/{nodeId}) for Resident view
   */
  subscribeResidentNode(nodeId) {
    if (!nodeId) return;
    const key = `resident_node_${nodeId}`;
    if (activeListeners.has(key)) return;

    const nodeRef = ref(rtdb, `nodes/${nodeId}`);
    const callback = onValue(nodeRef, (snapshot) => {
      const data = snapshot.val() || null;
      if (data) {
        useTelemetryStore.getState().setSingleNodeData(nodeId, data);
      }
    }, (error) => {
      console.error(`[RTDB Error] Failed to stream node ${nodeId}:`, error.message);
    });

    activeListeners.set(key, { ref: nodeRef, callback });
  },

  /**
   * Subscribe to MAS Blackboard Hypotheses (/blackboard/hypotheses)
   */
  subscribeBlackboardHypotheses() {
    if (activeListeners.has('leak_hypotheses')) return;

    const leakRef = ref(rtdb, 'blackboard/hypotheses/leak');
    const leakCallback = onValue(leakRef, (snapshot) => {
      const data = snapshot.val() || {};
      useTelemetryStore.getState().setLeakHypotheses(data);
    });
    activeListeners.set('leak_hypotheses', { ref: leakRef, callback: leakCallback });

    const fairnessRef = ref(rtdb, 'blackboard/hypotheses/fairness');
    const fairnessCallback = onValue(fairnessRef, (snapshot) => {
      const data = snapshot.val() || {};
      useTelemetryStore.getState().setFairnessHypotheses(data);
    });
    activeListeners.set('fairness_hypotheses', { ref: fairnessRef, callback: fairnessCallback });
  },

  /**
   * Subscribe to Agent Watchdog Heartbeats (/blackboard/heartbeats)
   */
  subscribeHeartbeats() {
    if (activeListeners.has('heartbeats')) return;

    const heartbeatsRef = ref(rtdb, 'blackboard/heartbeats');
    const callback = onValue(heartbeatsRef, (snapshot) => {
      const data = snapshot.val() || {};
      useTelemetryStore.getState().setHeartbeats(data);
    });

    activeListeners.set('heartbeats', { ref: heartbeatsRef, callback });
  },

  /**
   * Unsubscribe ALL active listeners on logout to prevent memory leaks
   */
  unsubscribeAll() {
    activeListeners.forEach(({ ref }) => {
      off(ref);
    });
    activeListeners.clear();
  }
};
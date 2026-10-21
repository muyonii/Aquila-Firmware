import { SYNTHETIC_NODES } from '../../config/topology_nodes.js';

/**
 * NodeStateManager
 *
 * Manages in-memory state for all virtual and physical nodes in the harness:
 * - Odometer accumulation: cumulative_liters += (q / 60) * elapsedSeconds
 * - Packet sequence increments
 * - Hardware Takeover / Fallback Watchdog for NODE-B1-001
 */
export class NodeStateManager {
    constructor() {
        this.states = {};
        this.initStates();
    }

    initStates() {
        const initialOdometerBase = 1200.0;
        let index = 0;

        for (const node of SYNTHETIC_NODES) {
            this.states[node.node_id] = {
                node_id: node.node_id,
                household_label: node.household_label,
                is_physical: node.is_physical,
                packet_sequence: 1,
                cumulative_liters: initialOdometerBase + (index * 150.0),
                current_flow_lpm: 0.0,
                effective_std: 0.02,
                last_hardware_packet_at: 0,
                is_hardware_active: false,
                active_scenario_override: null
            };
            index++;
        }
    }

    /**
     * Updates flow rate and accumulates cumulative odometer liters
     */
    updateNodeFlow(nodeId, flowRateLpm, effectiveStd, elapsedSeconds = 15) {
        const state = this.states[nodeId];
        if (!state) return null;

        // If hardware ESP32 is actively driving Node 1, skip virtual accumulation
        if (state.is_physical && state.is_hardware_active) {
            return state;
        }

        const validFlow = Math.max(0.0, Math.min(45.0, flowRateLpm));
        const deltaLiters = (validFlow / 60.0) * elapsedSeconds;

        state.current_flow_lpm = parseFloat(validFlow.toFixed(2));
        state.effective_std = parseFloat(Math.max(0.02, effectiveStd).toFixed(3));
        state.cumulative_liters = parseFloat((state.cumulative_liters + deltaLiters).toFixed(2));
        state.packet_sequence += 1;

        return state;
    }

    /**
     * Hardware Fallback Watchdog: Records when physical ESP32 speaks
     */
    registerHardwareHeartbeat(nodeId, telemetryPacket) {
        const state = this.states[nodeId];
        if (!state) return;

        state.last_hardware_packet_at = Date.now();
        state.is_hardware_active = true;
        state.current_flow_lpm = telemetryPacket.flow_rate_lpm;
        state.cumulative_liters = telemetryPacket.cumulative_liters;
        state.packet_sequence = telemetryPacket.packet_sequence;
    }

    /**
     * Checks if physical hardware has gone silent (> 30s) and needs virtual fallback
     */
    evaluateHardwareFallback(timeoutMs = 30000) {
        const now = Date.now();
        for (const state of Object.values(this.states)) {
            if (state.is_physical && state.is_hardware_active) {
                if (now - state.last_hardware_packet_at > timeoutMs) {
                    console.warn(`⚠️ [NodeStateManager] Physical ESP32 (${state.node_id}) silent for > 30s. Engaging Virtual Fallback.`);
                    state.is_hardware_active = false;
                }
            }
        }
    }

    /**
     * Simulates physical meter replacement / odometer reset
     */
    resetOdometer(nodeId, newReading = 10.0) {
        const state = this.states[nodeId];
        if (state) {
            state.cumulative_liters = newReading;
        }
    }

    getState(nodeId) {
        return this.states[nodeId] || null;
    }

    getAllStates() {
        return this.states;
    }
}
import { SETTINGS } from '../../config/settings.js';

/**
 * FirebaseStreamer
 *
 * Atomically publishes real-time node telemetry to Firebase RTDB (/nodes.json).
 * Honors TelemetryContract.js (6 required fields, no battery) and
 * implements Chaos Engineering packet-loss injection.
 */
export class FirebaseStreamer {
    constructor(databaseUrl = SETTINGS.FIREBASE_DB_URL) {
        this.dbUrl = databaseUrl.replace(/\/+$/, '');
        this.timeoutMs = SETTINGS.NETWORK_TIMEOUT_MS || 4000;
    }

    /**
     * Publishes a tick state for all nodes to Firebase in 1 atomic HTTP PATCH request
     *
     * @param {Object} tickResults - Map of nodeId -> node state from ScenarioEngine
     * @param {Object} scenarioEngine - Reference to ScenarioEngine for chaos checking
     */
    async streamTick(tickResults, scenarioEngine) {
        const now = Math.floor(Date.now() / 1000);
        const multiLocationPatch = {};
        let sentCount = 0;
        let droppedCount = 0;

        for (const [nodeId, state] of Object.entries(tickResults)) {
            // Chaos Engineering Check: Simulate random packet loss if Chaos Mode is ON
            if (scenarioEngine && scenarioEngine.shouldDropPacket()) {
                droppedCount++;
                continue; // Skip this node's telemetry for this tick
            }

            // Do not publish virtual telemetry for physical hardware if real ESP32 is actively streaming
            if (state.is_physical && state.is_hardware_active) {
                continue;
            }

            // 6-Field Telemetry Payload (Strictly matching TelemetryContract.js)
            multiLocationPatch[`${nodeId}/telemetry`] = {
                node_id: nodeId,
                packet_sequence: state.packet_sequence,
                timestamp: now,
                flow_rate_lpm: state.current_flow_lpm,
                cumulative_liters: state.cumulative_liters,
                is_simulated: !state.is_physical
            };

            sentCount++;
        }

        if (Object.keys(multiLocationPatch).length === 0) {
            return { sentCount: 0, droppedCount };
        }

        // Execute atomic multi-location PATCH to /nodes.json
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

        try {
            const url = `${this.dbUrl}/nodes.json`;
            const response = await fetch(url, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(multiLocationPatch),
                signal: controller.signal
            });

            if (!response.ok) {
                console.warn(`⚠️ [FirebaseStreamer] HTTP ${response.status} returned by Firebase RTDB`);
                return { sentCount: 0, droppedCount, error: response.status };
            }

            return { sentCount, droppedCount, success: true };

        } catch (error) {
            if (error.name === 'AbortError') {
                console.warn(`⚠️ [FirebaseStreamer] Stream request timed out after ${this.timeoutMs}ms`);
            } else {
                console.warn(`⚠️ [FirebaseStreamer] Stream failed: ${error.message}`);
            }
            return { sentCount: 0, droppedCount, error: error.message };
        } finally {
            clearTimeout(timeoutId);
        }
    }
}
import { SCENARIO_PRESETS } from './ScenarioPresets.js';
import { FlowGenerator } from '../core/FlowGenerator.js';
import { SETTINGS } from '../../config/settings.js';

/**
 * ScenarioEngine
 *
 * State machine orchestrating interactive demo presets, time-warp scaling,
 * and Chaos Engineering packet-loss simulation.
 */
export class ScenarioEngine {
    constructor(nodeStateManager) {
        this.stateManager = nodeStateManager;
        this.activePreset = SCENARIO_PRESETS.NORMAL_DIURNAL;
        this.isAccelerated = false;
        this.isChaosMode = false;
        this.chaosPacketLossRate = SETTINGS.DEFAULT_CHAOS_PACKET_LOSS_RATE || 0.20;
        this.simulatedHourOverride = null;
    }

    /**
     * Switches the active scenario preset by ID or shortcut key
     */
    setPreset(presetKeyOrId) {
        const found = Object.values(SCENARIO_PRESETS).find(
            p => p.id === presetKeyOrId || p.key === presetKeyOrId
        );

        if (found) {
            this.activePreset = found;
            this.simulatedHourOverride = found.forced_hour !== undefined ? found.forced_hour : null;
            console.log(`\n🎬 [ScenarioEngine] Activated Preset [${found.key}]: ${found.title}`);
            return found;
        }

        console.warn(`⚠️ [ScenarioEngine] Unknown preset key: ${presetKeyOrId}`);
        return null;
    }

    /**
     * Toggles Accelerated Demo Mode (250ms ticks = fast 24h cycle)
     */
    toggleAcceleration() {
        this.isAccelerated = !this.isAccelerated;
        console.log(`\n⏩ [ScenarioEngine] Accelerated Mode: ${this.isAccelerated ? 'ENABLED (250ms ticks)' : 'DISABLED (15s ticks)'}`);
        return this.isAccelerated;
    }

    /**
     * Toggles Chaos Mode (injects 20% random packet loss)
     */
    toggleChaosMode() {
        this.isChaosMode = !this.isChaosMode;
        console.log(`\n💥 [ScenarioEngine] Chaos Mode (20% Packet Loss): ${this.isChaosMode ? 'ENABLED' : 'DISABLED'}`);
        return this.isChaosMode;
    }

    /**
     * Chaos Engineering Check: Evaluates whether this packet should be dropped
     */
    shouldDropPacket() {
        if (!this.isChaosMode) return false;
        return Math.random() < this.chaosPacketLossRate;
    }

    /**
     * Calculates current simulated hour of day (0-23)
     */
    getCurrentSimulatedHour() {
        if (this.simulatedHourOverride !== null) {
            return this.simulatedHourOverride;
        }
        return new Date().getHours();
    }

    /**
     * Tick Step: Computes new flow values for all nodes according to active preset
     */
    evaluateTick(elapsedSeconds = 15) {
        this.stateManager.evaluateHardwareFallback();

        const currentHour = this.getCurrentSimulatedHour();
        const overrides = this.activePreset.overrides || {};
        const globalMultiplier = this.activePreset.global_multiplier || 1.0;
        const allStates = this.stateManager.getAllStates();
        const tickResults = {};

        for (const [nodeId, state] of Object.entries(allStates)) {
            // Check if node has a specific scenario override
            const override = overrides[nodeId];

            let flowRateLpm = 0.0;
            let effectiveStd = 0.02;

            if (override && override.lock_flow) {
                flowRateLpm = override.flow_rate_lpm;
                effectiveStd = override.effective_std;
            } else {
                // Generate normal diurnal flow
                const diurnal = FlowGenerator.generateDiurnalFlow(currentHour);
                flowRateLpm = diurnal.flow_rate_lpm * globalMultiplier;
                effectiveStd = diurnal.effective_std;
            }

            // Update state and accumulate odometer
            const updatedState = this.stateManager.updateNodeFlow(
                nodeId, 
                flowRateLpm, 
                effectiveStd, 
                elapsedSeconds
            );

            tickResults[nodeId] = updatedState;
        }

        return tickResults;
    }

    getActivePreset() {
        return this.activePreset;
    }
}
import { BaseAgent } from '../core/BaseAgent.js';
import { RandomForestModel } from '../models/RandomForestModel.js';
import { SETTINGS, getCurrentSystemHour } from '../../config/settings.js';
import { LEAK_TAXONOMY } from '../contracts/LeakTaxonomy.js';

/**
 * LeakDetectionAgent (CMP-LDA-01)
 *
 * Senses instantaneous flow telemetry from the Firebase Blackboard,
 * computes rolling statistics (mean, variance, sustained duration),
 * applies zero-flow hangover hysteresis to withstand transient packet drops,
 * evaluates flow against household-specific behavioral baselines and the
 * in-memory Random Forest Classifier, and publishes dual-layer leak hypotheses.
 */
export class LeakDetectionAgent extends BaseAgent {
    constructor(blackboard) {
        super("CMP-LDA-01", blackboard);
        // Tracks { [nodeId]: { buffer: number[], activeSince: number|null, zeroSince: number|null } }
        this.history = {}; 
    }

    async sense() {
        return await this.blackboard.fetchAllNodesTelemetry();
    }

    async deliberate(nodesData) {
        const decisions = [];
        const now = Math.floor(Date.now() / 1000);
        // Uses timezone-aware helper (defaulting to Asia/Manila / UTC+8)
        const currentHour = typeof getCurrentSystemHour === 'function' 
            ? getCurrentSystemHour() 
            : new Date().getHours();
        
        const staleTimeout = SETTINGS.STALE_TELEMETRY_TIMEOUT_SECONDS || 45;
        const quiescentFloor = SETTINGS.QUIESCENT_FLOW_FLOOR_LPM || 0.05;
        const zeroHangoverSec = SETTINGS.ZERO_FLOW_HANGOVER_SECONDS || 30;

        for (const [nodeId, data] of Object.entries(nodesData)) {
            const status = (data.status || 'ACTIVE').toUpperCase();

            // 1. Alarm Suppression: MAINTENANCE, INACTIVE, FAULT, or DECOMMISSIONED
            if (status === 'MAINTENANCE' || status === 'INACTIVE' || status === 'FAULT' || status === 'DECOMMISSIONED') {
                if (this.history[nodeId]) {
                    this.history[nodeId] = null;
                }
                decisions.push({
                    node_id: nodeId,
                    classification: status,
                    academic_classification: status,
                    academic_term: `System Status: ${status}`,
                    display_name: `System in ${status}`,
                    leak_probability: 0.0,
                    flow_rate_lpm: 0.0,
                    duration_minutes: 0.0,
                    timestamp: now
                });
                continue;
            }

            const telemetry = data.telemetry;
            if (!telemetry) continue;

            // 2. Stale Telemetry Watchdog (> 45s without fresh packet)
            const packetAge = now - (telemetry.timestamp || 0);
            if (packetAge > staleTimeout) {
                if (this.history[nodeId]) {
                    this.history[nodeId] = null;
                }
                decisions.push({
                    node_id: nodeId,
                    classification: "OFFLINE",
                    academic_classification: "OFFLINE",
                    academic_term: "Telemetry Transmission Failure",
                    display_name: "Sensor Offline",
                    leak_probability: 0.0,
                    flow_rate_lpm: 0.0,
                    duration_minutes: 0.0,
                    timestamp: now
                });
                continue;
            }

            const q = typeof telemetry.flow_rate_lpm === 'number' ? telemetry.flow_rate_lpm : 0.0;

            if (!this.history[nodeId]) {
                this.history[nodeId] = {
                    activeSince: null,
                    zeroSince: null,
                    buffer: []
                };
            }

            const h = this.history[nodeId];

            // 3. Zero-Flow Hangover Hysteresis
            // Prevents 1-2 second sensor packet dropouts from wiping ongoing leak counters
            if (q > quiescentFloor) {
                h.zeroSince = null;
                if (!h.activeSince) {
                    h.activeSince = now;
                }
                h.buffer.push(q);
                if (h.buffer.length > 20) {
                    h.buffer.shift();
                }
            } else {
                if (h.activeSince) {
                    if (!h.zeroSince) {
                        h.zeroSince = now;
                    }
                    const zeroElapsed = now - h.zeroSince;
                    if (zeroElapsed >= zeroHangoverSec) {
                        // Confirmed true shutoff: sustained quiescent state for >= 30 seconds
                        h.activeSince = null;
                        h.buffer = [];
                        h.zeroSince = null;
                    }
                } else {
                    h.buffer = [];
                    h.zeroSince = null;
                }
            }

            const durationSec = h.activeSince ? Math.max(0, now - h.activeSince) : 0;
            const durationMin = durationSec / 60;

            // 4. Feature Engineering: Rolling mean and effective standard deviation
            let effectiveStd = 0.5;
            let mean = q;
            if (Array.isArray(h.buffer) && h.buffer.length > 1) {
                const numericBuffer = h.buffer.map(x => (typeof x === 'number' ? x : (x.q || 0.0)));
                mean = numericBuffer.reduce((a, b) => a + b, 0) / numericBuffer.length;
                const variance = numericBuffer.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / numericBuffer.length;
                effectiveStd = Math.max(Math.sqrt(variance), 0.02);
            }

            // 5. Machine Learning Inference via Random Forest Ensemble
            const features = [q, mean, effectiveStd, durationMin, currentHour];
            let leakProb = RandomForestModel.predictProbability(features);

            // 6. Dynamic Household-Specific Behavioral Profiling
            // Pulls baseline metrics from /nodes/{id}/profile (with defaults for unprofiled nodes)
            const profile = data.profile || {};
            const expectedNightFlow = typeof profile.expected_night_flow_lpm === 'number' 
                ? profile.expected_night_flow_lpm 
                : 0.05;
            const typicalMaxDuration = typeof profile.typical_max_duration_mins === 'number' 
                ? profile.typical_max_duration_mins 
                : 20.0;

            // Dynamic thresholds derived from this house's personal usage fingerprint
            const dynamicContinuousCeiling = Math.max(30.0, typicalMaxDuration * 2.0); // 2x normal maximum draw
            const dynamicNightFloor = expectedNightFlow + 0.50;                        // Night baseline + tolerance

            // 7. Tiered Industrial Classification & Dual-Layer Taxonomy
            let classification = "NORMAL";
            let taxonomy = LEAK_TAXONOMY.TIER_5_NORMAL;

            // TIER 1A: Catastrophic Rupture (High-Velocity Laminar Burst)
            if ((q >= 15.0 && durationSec >= 60) || (q >= 2.5 && effectiveStd <= 0.15 && durationSec >= 30)) {
                classification = "LEAK";
                taxonomy = LEAK_TAXONOMY.TIER_1A_BURST;
                leakProb = Math.max(leakProb, 0.95);
            }
            // TIER 2: Profile-Driven Zero-Flow Invariant (Unpaused draw exceeding 2x normal duration)
            else if (durationMin >= dynamicContinuousCeiling && q >= (SETTINGS.MECHANICAL_SENSOR_FLOOR_LPM || 1.0)) {
                classification = "LEAK";
                taxonomy = LEAK_TAXONOMY.TIER_2_ZERO_FLOW;
                leakProb = Math.max(leakProb, 0.90);
            }
           // Tier 3: Profile-Driven Nocturnal MNF (Physical floor clamped)
            const minMeasurableNightFloor = Math.max(dynamicNightFloor, SETTINGS.MECHANICAL_SENSOR_FLOOR_LPM || 1.0);
            if (currentHour >= 1 && currentHour <= 4 && durationMin >= 10.0 && q >= minMeasurableNightFloor && effectiveStd <= 0.20) {
                classification = "LEAK";
                taxonomy = LEAK_TAXONOMY.TIER_3_MNF;
                leakProb = Math.max(leakProb, 0.85);
            }
            // TIER 4: Suspicious Early Anomaly (Elevated ML likelihood pending confirmation window)
            else if (leakProb >= SETTINGS.LEAK_PROBABILITY_THRESHOLD) {
                if (durationSec >= 30) {
                    classification = "LEAK";
                    taxonomy = LEAK_TAXONOMY.TIER_1A_BURST;
                } else {
                    classification = "SUSPICIOUS";
                    taxonomy = LEAK_TAXONOMY.TIER_4_SUSPICIOUS;
                }
            }

            decisions.push({
                node_id: nodeId,
                classification: classification,                        // Maps to MySQL ENUM & Coordinator logic
                academic_classification: taxonomy.code,                // Academic taxonomy code
                academic_term: taxonomy.academic_term,                 // Academic literature label for thesis
                display_name: taxonomy.display_name,                   // Plain-English label for UI/plumbers
                severity_level: taxonomy.severity,
                leak_probability: parseFloat(leakProb.toFixed(3)),
                flow_rate_lpm: q,
                duration_minutes: parseFloat(durationMin.toFixed(1)),
                timestamp: now
            });
        }

        return decisions;
    }

    async act(decisions) {
        for (const d of decisions) {
            await this.blackboard.writeHypothesis('leak', d.node_id, d);
        }
    }
}
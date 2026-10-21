import { BaseAgent } from '../core/BaseAgent.js';
import { SETTINGS } from '../../config/settings.js';

/**
 * FairnessEvaluationAgent (CMP-FEA-01)
 *
 * Evaluates water distribution equity across households using a Hybrid
 * Profile-Aware Rawlsian Index:
 *   1. Macro-Level: Rawlsian Relative Deprivation Index (RDI = Delta_i / Mean_community)
 *   2. Micro-Level: Personal Baseline Deficit (Compares against household's own profile)
 *
 * Refinements Implemented:
 *   - Configurable deficit threshold (SETTINGS.PERSONAL_DEFICIT_THRESHOLD)
 *   - Cold-boot baseline hydration from blackboard state
 *   - Meter rollover and hardware replacement guard
 */
export class FairnessEvaluationAgent extends BaseAgent {
    constructor(blackboard, windowSeconds = null) {
        super("CMP-FEA-01", blackboard);
        this.volumeHistory = {}; // Tracks { [nodeId]: [{ timestamp, liters }] }
        this.windowSeconds = windowSeconds || SETTINGS.FAIRNESS_WINDOW_SECONDS || 86400; // Default 24h
        this.minWarmupSeconds = 30; // Minimum 30s observation before firing alerts
        this.isHydrated = false;    // Tracks if cold-boot state has been restored
    }

    /**
     * Cold-Boot Hydration: Restores node baseline history from the Firebase Hot Store
     * so restarting the server does not cause a 30-second blindspot or calculation volatility.
     */
    async hydrateFromBlackboard(nodesData) {
        try {
            if (!this.blackboard || typeof this.blackboard.fetchHypotheses !== 'function') {
                return;
            }

            const priorHypotheses = await this.blackboard.fetchHypotheses('fairness');
            if (!priorHypotheses || Object.keys(priorHypotheses).length === 0) {
                return;
            }

            const now = Math.floor(Date.now() / 1000);
            const staleTimeout = SETTINGS.STALE_TELEMETRY_TIMEOUT_SECONDS || 45;

            for (const [nodeId, hyp] of Object.entries(priorHypotheses)) {
                if (!hyp || typeof hyp.delta_liters !== 'number' || typeof hyp.elapsed_seconds !== 'number') {
                    continue;
                }

                // Only restore if the hypothesis is fresh
                const age = now - (hyp.timestamp || 0);
                if (age > staleTimeout) {
                    continue;
                }

                const currentLiters = nodesData[nodeId]?.telemetry?.cumulative_liters;
                if (typeof currentLiters === 'number' && hyp.elapsed_seconds > 0) {
                    const estimatedBaselineTime = Math.max(0, (hyp.timestamp || now) - hyp.elapsed_seconds);
                    const estimatedBaselineLiters = Math.max(0.0, currentLiters - hyp.delta_liters);

                    this.volumeHistory[nodeId] = [
                        { timestamp: estimatedBaselineTime, liters: estimatedBaselineLiters }
                    ];
                }
            }

            const restoredCount = Object.keys(this.volumeHistory).length;
            if (restoredCount > 0) {
                console.log(`✔ [FEA] Cold-boot hydration: Restored baseline history for ${restoredCount} nodes.`);
            }
        } catch (error) {
            console.warn(`⚠️ [FEA] Cold-boot hydration skipped: ${error.message}`);
        }
    }

    async sense() {
        const nodesData = await this.blackboard.fetchAllNodesTelemetry();

        // Perform cold-boot hydration on initial run if history is empty
        if (!this.isHydrated && Object.keys(this.volumeHistory).length === 0) {
            await this.hydrateFromBlackboard(nodesData);
            this.isHydrated = true;
        }

        return nodesData;
    }

    async deliberate(nodesData) {
        const now = Math.floor(Date.now() / 1000);
        const nodeDeltas = {};
        const nodeElapsed = {};
        let totalCommunityDelta = 0;
        let activeCount = 0;
        const staleTimeout = SETTINGS.STALE_TELEMETRY_TIMEOUT_SECONDS || 45;

        for (const [nodeId, data] of Object.entries(nodesData)) {
            const status = (data.status || 'ACTIVE').toUpperCase();

            // 1. Alarm Suppression: Purge historical buffer and ignore non-active nodes
            if (status !== 'ACTIVE') {
                delete this.volumeHistory[nodeId];
                continue;
            }

            const telemetry = data.telemetry;
            if (!telemetry || typeof telemetry.cumulative_liters !== 'number') {
                continue;
            }

            // 2. Stale Telemetry Watchdog (> 45s without fresh packet)
            const packetAge = now - (telemetry.timestamp || 0);
            if (packetAge > staleTimeout) {
                delete this.volumeHistory[nodeId];
                continue;
            }

            const currentLiters = telemetry.cumulative_liters;

            if (!this.volumeHistory[nodeId]) {
                this.volumeHistory[nodeId] = [];
            }

            const history = this.volumeHistory[nodeId];

            // 3. Meter Rollover / Replacement Guard
            if (history.length > 0 && currentLiters < history[0].liters) {
                this.volumeHistory[nodeId] = [{ timestamp: now, liters: currentLiters }];
            } else {
                history.push({ timestamp: now, liters: currentLiters });
            }

            // Prune history older than the evaluation window
            while (history.length > 1 && (now - history[0].timestamp) > this.windowSeconds) {
                history.shift();
            }

            // Bound memory buffer to a maximum of 1,000 snapshots per node
            if (history.length > 1000) {
                const baseline = history[0];
                this.volumeHistory[nodeId] = [baseline, ...history.slice(-999)];
            }

            const baseline = this.volumeHistory[nodeId][0];
            const elapsed = Math.max(0, now - baseline.timestamp);
            const deltaLiters = Math.max(0.0, currentLiters - baseline.liters);

            nodeDeltas[nodeId] = deltaLiters;
            nodeElapsed[nodeId] = elapsed;
            totalCommunityDelta += deltaLiters;
            activeCount++;
        }

        if (activeCount === 0) {
            return [];
        }

        // 4. Determine community elapsed observation window & mean
        const communityMeanDelta = totalCommunityDelta / activeCount;
        const avgElapsedSeconds = Object.values(nodeElapsed).reduce((a, b) => a + b, 0) / activeCount;

        // 5. Warm-up Guard: Suppress alerts until baseline reaches minWarmupSeconds
        const isWarmingUp = avgElapsedSeconds < this.minWarmupSeconds;

        // 6. Time-Normalized 24-Hour Municipal Shortage Guard (Rule BR-05)
        const timeFactor = this.windowSeconds / Math.max(avgElapsedSeconds, 1);
        const projectedDailyLiters = communityMeanDelta * timeFactor;
        const shortageOverride = !isWarmingUp && 
            (projectedDailyLiters < SETTINGS.MUNICIPAL_SHORTAGE_FLOOR_LPD) && 
            (totalCommunityDelta > 0);

        const decisions = [];
        // Refinement 1: Use configurable deficit cutoff
        const personalDeficitCutoff = SETTINGS.PERSONAL_DEFICIT_THRESHOLD || 0.60;

        // 7. Profile-Aware Deprivation Evaluation
        for (const [nodeId, delta] of Object.entries(nodeDeltas)) {
            // A. Macro Community Metric: Rawlsian Relative Deprivation Index (RDI)
            const rdi = communityMeanDelta > 0 ? delta / (communityMeanDelta + 0.0001) : 1.0;
            const communityDeficit = rdi < SETTINGS.RDI_DISADVANTAGE_CUTOFF;

            // B. Micro Household Metric: Personal Baseline Deviation Guard
            const nodeProfile = nodesData[nodeId]?.profile || {};
            const hasPersonalProfile = typeof nodeProfile.mean_daily_volume_liters === 'number' && nodeProfile.mean_daily_volume_liters > 0;
            
            let personalDeficit = true;
            if (hasPersonalProfile) {
                const expectedVolumeThisWindow = (nodeProfile.mean_daily_volume_liters / timeFactor);
                // Flag personal deficit only if volume is below configurable threshold (60%) of typical intake
                personalDeficit = delta < (expectedVolumeThisWindow * personalDeficitCutoff);
            }

            // Household is genuinely disadvantaged if:
            // 1. System is not warming up AND
            // 2. No municipal shortage override is active AND
            // 3. Community RDI is below 0.70 cutoff AND
            // 4. Usage dropped below their personal baseline (or unprofiled fallback)
            const isDisadvantaged = !isWarmingUp && !shortageOverride && communityDeficit && personalDeficit;

            decisions.push({
                node_id: nodeId,
                rdi_score: parseFloat(rdi.toFixed(3)),
                delta_liters: parseFloat(delta.toFixed(2)),
                community_mean_liters: parseFloat(communityMeanDelta.toFixed(2)),
                projected_daily_mean_liters: parseFloat(projectedDailyLiters.toFixed(2)),
                is_disadvantaged: isDisadvantaged,
                override_active: shortageOverride,
                is_warming_up: isWarmingUp,
                personal_baseline_verified: hasPersonalProfile,
                elapsed_seconds: Math.round(nodeElapsed[nodeId] || 0),
                timestamp: now
            });
        }

        return decisions;
    }

    async act(decisions) {
        for (const d of decisions) {
            await this.blackboard.writeHypothesis('fairness', d.node_id, d);
        }
    }
}
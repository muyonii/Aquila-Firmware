import { SETTINGS } from '../../config/settings.js';

/**
 * Heartbeat & Liveness Watchdog Service (FR-DSS-03)
 *
 * Continuously monitors agent execution timestamps in the Firebase Blackboard.
 * If any analytical or coordination agent (LDA, FEA, CA) fails to publish a heartbeat
 * within the 30-second circuit breaker threshold, it flags the system as DEGRADED.
 */
export class HeartbeatMonitor {
    /**
     * @param {Object} blackboardService - Shared Firebase Blackboard service
     * @param {number} [timeoutThresholdSec=30.0] - Circuit breaker tripping threshold
     */
    constructor(blackboardService, timeoutThresholdSec = SETTINGS.CIRCUIT_BREAKER_TIMEOUT_SEC || 30.0) {
        this.blackboard = blackboardService;
        this.timeoutThreshold = timeoutThresholdSec;
        this.bootTime = Math.floor(Date.now() / 1000);
        this.bootGracePeriodSec = 15; // 15-second warm-up allowance
        this.agentStatuses = {};
        this.monitoredAgents = ['CMP-LDA-01', 'CMP-FEA-01', 'CMP-CA-01'];
    }

    /**
     * Evaluates the operational liveness of all agents and publishes
     * a master system health record to the Firebase Blackboard.
     *
     * @returns {Promise<{systemHealthy: boolean, degradedAgents: string[], statuses: Object, timestamp: number}>}
     */
    async checkLiveness() {
        const now = Math.floor(Date.now() / 1000);
        let heartbeats = {};

        // 1. Fetch live heartbeats from Firebase Hot Store
        try {
            const res = await this.blackboard._request('/blackboard/heartbeats.json');
            heartbeats = res || {};
        } catch (error) {
            console.error('[HeartbeatMonitor] Watchdog could not reach Firebase:', error.message);
            // Defend against complete network blackout (trip circuit breaker safely)
            return {
                systemHealthy: false,
                degradedAgents: ['ALL_OFFLINE_FIREBASE_UNREACHABLE'],
                statuses: this.monitoredAgents.reduce((acc, id) => ({ ...acc, [id]: 'UNREACHABLE' }), {}),
                timestamp: now
            };
        }

        const degraded = [];
        // Grace period: allow 15 seconds on initial boot so agents can send their first pulse
        const isSystemWarmingUp = (now - this.bootTime) < this.bootGracePeriodSec;

        // 2. Audit each monitored agent (LDA, FEA, CA)
        for (const agentId of this.monitoredAgents) {
            const pulse = heartbeats[agentId];

            if (!pulse || !pulse.timestamp) {
                // If system is warming up, do not prematurely sound alarms
                if (isSystemWarmingUp) {
                    this.agentStatuses[agentId] = 'WARMING_UP';
                    continue;
                }
                this.agentStatuses[agentId] = 'UNREGISTERED';
                degraded.push(agentId);
                continue;
            }

            // Guard against slight clock skew between local computer and NTP server
            const elapsed = Math.max(0, now - pulse.timestamp);

            // If an agent stopped pulsing for > 30s or reported DEGRADED, flag it
            if (elapsed > this.timeoutThreshold || pulse.status === 'DEGRADED') {
                this.agentStatuses[agentId] = 'DEGRADED';
                degraded.push(agentId);
                console.warn(`⚠️ [HeartbeatMonitor] Agent ${agentId} is DEGRADED! (Pulse age: ${elapsed}s > ${this.timeoutThreshold}s limit)`);
            } else {
                this.agentStatuses[agentId] = 'HEALTHY';
            }
        }

        const systemHealthy = degraded.length === 0;

        // 3. Publish master health status to Firebase for the React UI header
        if (this.blackboard && typeof this.blackboard._request === 'function') {
            try {
                await this.blackboard._request('/blackboard/system_health.json', {
                    method: 'PUT',
                    body: JSON.stringify({
                        overall_status: systemHealthy ? 'HEALTHY' : 'DEGRADED',
                        degraded_agents: degraded,
                        agent_count: this.monitoredAgents.length,
                        active_count: this.monitoredAgents.length - degraded.length,
                        last_audit_timestamp: now
                    })
                });
            } catch (syncErr) {
                // Non-blocking fallback: network hiccups during health sync won't crash the cycle
            }
        }

        return {
            systemHealthy,
            degradedAgents: degraded,
            statuses: this.agentStatuses,
            timestamp: now
        };
    }

    /**
     * Checks if a specific agent is healthy
     * @param {string} agentId
     */
    isAgentHealthy(agentId) {
        return this.agentStatuses[agentId] === 'HEALTHY';
    }
}
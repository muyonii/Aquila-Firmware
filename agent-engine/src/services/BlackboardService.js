import { SETTINGS } from '../../config/settings.js';

/**
 * BlackboardService
 *
 * Resilient HTTP bridge to the Firebase Realtime Database Hot Store.
 * Encapsulates read/write operations for telemetry, hypotheses, DAG edges,
 * active incidents, and heartbeats with timeout budgets and automatic retries.
 */
export class BlackboardService {
    /**
     * @param {string} databaseUrl - Base Firebase RTDB endpoint
     */
    constructor(databaseUrl = SETTINGS.FIREBASE_DB_URL) {
        this.dbUrl = databaseUrl.replace(/\/+$/, '');
        this.timeoutMs = SETTINGS.NETWORK_TIMEOUT_MS || 5000;
        this.maxRetries = 2; // Up to 2 retries on network/server errors
    }

    /**
     * Executes HTTP requests with strict timeouts and exponential retry backoff
     * @private
     */
    async _request(endpoint, options = {}, attempt = 1) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

        try {
            const url = `${this.dbUrl}${endpoint}`;
            const res = await fetch(url, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    ...(options.headers || {})
                },
                signal: controller.signal
            });

            if (!res.ok) {
                // Retry on server-side errors (500, 502, 503)
                if (res.status >= 500 && attempt <= this.maxRetries) {
                    const delay = attempt * 300;
                    await new Promise(r => setTimeout(r, delay));
                    return this._request(endpoint, options, attempt + 1);
                }
                throw new Error(`Firebase HTTP ${res.status} on ${endpoint}`);
            }

            return await res.json();
        } catch (error) {
            if (error.name === 'AbortError') {
                if (attempt <= this.maxRetries) {
                    return this._request(endpoint, options, attempt + 1);
                }
                throw new Error(`Firebase request timed out after ${this.timeoutMs}ms on ${endpoint}`);
            }

            // Retry on socket hangs/network dropouts
            if (attempt <= this.maxRetries) {
                await new Promise(r => setTimeout(r, attempt * 300));
                return this._request(endpoint, options, attempt + 1);
            }
            throw error;
        } finally {
            clearTimeout(timeoutId);
        }
    }

    /**
     * Senses all node telemetry snapshots (/nodes.json)
     * @returns {Promise<Object>} Map of nodeId -> node data
     */
    async fetchAllNodesTelemetry() {
        try {
            const data = await this._request('/nodes.json');
            return data || {};
        } catch (error) {
            console.error('[BlackboardService] Failed fetching nodes telemetry:', error.message);
            return {};
        }
    }

    /**
     * Writes an analytical hypothesis produced by LDA or FEA
     * @param {'leak' | 'fairness'} type
     * @param {string} nodeId
     * @param {Object} data
     */
    async writeHypothesis(type, nodeId, data) {
        try {
            await this._request(`/blackboard/hypotheses/${type}/${nodeId}.json`, {
                method: 'PUT',
                body: JSON.stringify(data)
            });
        } catch (error) {
            console.error(`[BlackboardService] Failed writing ${type} hypothesis for ${nodeId}:`, error.message);
        }
    }

    /**
     * Clears an active hypothesis from the blackboard (e.g. when leak is verified resolved)
     * @param {'leak' | 'fairness'} type
     * @param {string} nodeId
     */
    async clearHypothesis(type, nodeId) {
        try {
            await this._request(`/blackboard/hypotheses/${type}/${nodeId}.json`, {
                method: 'DELETE'
            });
        } catch (error) {
            console.error(`[BlackboardService] Failed clearing ${type} hypothesis for ${nodeId}:`, error.message);
        }
    }

    /**
     * Senses active hypotheses of a specific category from the Blackboard
     * @param {'leak' | 'fairness'} type
     * @returns {Promise<Object>} Map of nodeId -> hypothesis
     */
    async fetchHypotheses(type) {
        try {
            const data = await this._request(`/blackboard/hypotheses/${type}.json`);
            return data || {};
        } catch (error) {
            console.error(`[BlackboardService] Failed fetching ${type} hypotheses:`, error.message);
            return {};
        }
    }

    /**
     * Writes active incident ticket to Firebase for real-time frontend dashboard sync
     * Complies strictly with cloud-config/database.rules.json
     * @param {string} incidentId
     * @param {Object} incidentData
     */
    async writeActiveIncident(incidentId, incidentData) {
        try {
            await this._request(`/blackboard/incidents/active/${incidentId}.json`, {
                method: 'PUT',
                body: JSON.stringify({
                    node_id: incidentData.node_id,
                    incident_type: incidentData.incident_type,
                    severity_level: incidentData.severity_level,
                    academic_classification: incidentData.academic_classification || 'TOPOLOGICAL_MASS_DEFICIT',
                    academic_term: incidentData.academic_term || 'Topological Mass Balance Deficit',
                    display_name: incidentData.display_name || 'Mainline Pipe Loss',
                    detected_at: incidentData.detected_at || new Date().toISOString(),
                    recommendation: incidentData.recommendation || {}
                })
            });
        } catch (error) {
            console.error(`[BlackboardService] Failed syncing active incident ${incidentId}:`, error.message);
        }
    }

    /**
     * Removes active incident ticket from Firebase once closed or cancelled
     * @param {string} incidentId
     */
    async removeActiveIncident(incidentId) {
        try {
            await this._request(`/blackboard/incidents/active/${incidentId}.json`, {
                method: 'DELETE'
            });
        } catch (error) {
            console.error(`[BlackboardService] Failed removing active incident ${incidentId}:`, error.message);
        }
    }

    /**
     * Fetches DAG edge relationships (/dag/edges.json)
     * @returns {Promise<Object>}
     */
    async fetchDagEdges() {
        try {
            const data = await this._request('/dag/edges.json');
            return data || {};
        } catch (error) {
            return {};
        }
    }

    /**
     * Emits agent liveness heartbeat to the watchdog workspace
     * Validates status against database.rules.json ('HEALTHY' | 'DEGRADED')
     * @param {string} agentId - e.g. "CMP-LDA-01"
     * @param {'HEALTHY' | 'DEGRADED'} status
     */
    async updateHeartbeat(agentId, status = 'HEALTHY') {
        const validStatus = status === 'DEGRADED' ? 'DEGRADED' : 'HEALTHY';
        try {
            await this._request(`/blackboard/heartbeats/${agentId}.json`, {
                method: 'PUT',
                body: JSON.stringify({
                    agent_id: agentId,
                    status: validStatus,
                    timestamp: Math.floor(Date.now() / 1000)
                })
            });
        } catch (error) {
            console.error(`[BlackboardService] Failed updating heartbeat for ${agentId}:`, error.message);
        }
    }
}
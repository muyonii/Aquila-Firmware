import { BaseAgent } from '../core/BaseAgent.js';
import { RecommendationAgent } from './RecommendationAgent.js';
import { SETTINGS } from '../../config/settings.js';
import { LEAK_TAXONOMY } from '../contracts/LeakTaxonomy.js';

export class CoordinatorAgent extends BaseAgent {
    constructor(blackboard, webhookDispatcher) {
        super("CMP-CA-01", blackboard);
        this.dispatcher = webhookDispatcher;
        this.dagMap = {};
        this.nodeMetadata = {};
        this.lastDagSync = 0;
        this.dagSyncTtlMs = 60000;
        this.hasDegradedTopology = false;

        this.defaultBootstrapDag = {
            'NODE-B1-002': 'NODE-B1-001',
            'NODE-B1-003': 'NODE-B1-001',
            'NODE-B1-004': 'NODE-B1-002',
            'NODE-B1-005': 'NODE-B1-002',
            'NODE-B1-006': 'NODE-B1-003',
            'NODE-B1-007': 'NODE-B1-003',
            'NODE-B1-008': 'NODE-B1-004',
            'NODE-B1-009': 'NODE-B1-004',
            'NODE-B1-010': 'NODE-B1-005'
        };
    }

    async syncDagHierarchy() {
        const now = Date.now();
        const hasExistingCache = Object.keys(this.dagMap).length > 0;

        if (now - this.lastDagSync < this.dagSyncTtlMs && hasExistingCache) return;

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), SETTINGS.NETWORK_TIMEOUT_MS || 5000);

            const res = await fetch(SETTINGS.NODE_API_URL, {
                headers: {
                    'Accept': 'application/json',
                    'X-Aquila-Internal-Key': SETTINGS.WEBHOOK_SECRET
                },
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const payload = await res.json();
            if (payload?.success && payload?.data) {
                const freshMap = {};
                const freshMetadata = {};

                if (Array.isArray(payload.data.nodes)) {
                    for (const node of payload.data.nodes) {
                        freshMetadata[node.node_id] = {
                            location_name: node.location_name || null,
                            household_label: node.household_label || null
                        };
                        if (node.parent_node_id) freshMap[node.node_id] = node.parent_node_id;
                    }
                }

                // Coordinator Agent builds its in-memory graph from pipeline_dag_edge
                if (Array.isArray(payload.data.edges)) {
                    for (const edge of payload.data.edges) {
                        if (edge.upstream_node_id && edge.downstream_node_id) {
                            // Child -> Parent mapping for recursive DAG traversal
                            freshMap[edge.downstream_node_id] = edge.upstream_node_id;
                        }
                    }
                }

                this.dagMap = freshMap;
                this.nodeMetadata = freshMetadata;
                this.lastDagSync = now;
                this.hasDegradedTopology = false;
            }
        } catch (err) {
            this.hasDegradedTopology = true;
            if (!hasExistingCache) {
                this.dagMap = { ...this.defaultBootstrapDag };
            }
        }
    }

    evaluateMassBalance(rawTelemetry) {
        const conduitIncidents = [];
        const parentToChildren = {};

        for (const [childId, parentId] of Object.entries(this.dagMap)) {
            if (!parentId) continue;
            if (!parentToChildren[parentId]) parentToChildren[parentId] = [];
            parentToChildren[parentId].push(childId);
        }

        for (const [parentId, children] of Object.entries(parentToChildren)) {
            const parentFlow = rawTelemetry[parentId]?.telemetry?.flow_rate_lpm;
            if (typeof parentFlow !== 'number' || parentFlow <= 1.0) continue;

            let totalChildrenFlow = 0;
            let allReporting = true;

            for (const childId of children) {
                const childFlow = rawTelemetry[childId]?.telemetry?.flow_rate_lpm;
                if (typeof childFlow === 'number') {
                    totalChildrenFlow += childFlow;
                } else {
                    allReporting = false;
                    break;
                }
            }

            if (!allReporting) continue;

            const deltaQ = parentFlow - totalChildrenFlow;
            const tolerance = SETTINGS.MASS_BALANCE_TOLERANCE_LPM || 1.5;

            if (deltaQ > tolerance) {
                const locName = this.nodeMetadata[parentId]?.location_name || parentId;
                const taxonomy = LEAK_TAXONOMY.TIER_1B_MASS_BALANCE;

                conduitIncidents.push({
                    node_id: parentId,
                    incident_type: taxonomy.db_incident_type,
                    severity_level: taxonomy.severity,
                    academic_classification: taxonomy.code,
                    academic_term: taxonomy.academic_term,
                    display_name: taxonomy.display_name,
                    detected_at: new Date().toISOString(),
                    recommendation: RecommendationAgent.generateActionCard(
                        taxonomy.code,
                        parentId,
                        taxonomy.severity,
                        locName,
                        { deltaQ, children }
                    )
                });
            }
        }

        return conduitIncidents;
    }

    findUpstreamLeak(nodeId, leakHypotheses, activeConduitBreaches = []) {
        const visited = new Set();
        let currentParent = this.dagMap[nodeId];

        while (currentParent) {
            if (visited.has(currentParent)) break;
            visited.add(currentParent);

            // 1. Direct meter leak on parent
            if (leakHypotheses[currentParent]?.classification === 'LEAK') {
                return currentParent;
            }

            // 2. Mainline conduit breach on parent branch
            if (activeConduitBreaches.some(b => b.node_id === currentParent)) {
                return currentParent;
            }

            currentParent = this.dagMap[currentParent];
        }

        return null;
    }

    async sense() {
        await this.syncDagHierarchy();
        const rawTelemetry = await this.blackboard.fetchAllNodesTelemetry();
        const leakHypotheses = await this.blackboard.fetchHypotheses('leak');
        const fairnessHypotheses = await this.blackboard.fetchHypotheses('fairness');
        return { leakHypotheses, fairnessHypotheses, rawTelemetry };
    }

    async deliberate({ leakHypotheses, fairnessHypotheses, rawTelemetry }) {
        const incidents = [];
        const nowIso = new Date().toISOString();

        // 1. Process Mass Balance Invariant
        const conduitBreaches = (rawTelemetry && Object.keys(rawTelemetry).length > 0)
            ? this.evaluateMassBalance(rawTelemetry)
            : [];
        incidents.push(...conduitBreaches);

        // 2. Process Machine Learning & Statistical Hypotheses
        for (const [nodeId, leak] of Object.entries(leakHypotheses)) {
            if (incidents.some(inc => inc.node_id === nodeId)) continue;

            const locName = this.nodeMetadata[nodeId]?.location_name || null;
            const academicCode = leak.academic_classification || (leak.classification === 'LEAK' ? 'HIGH_VELOCITY_BURST' : 'PRE_CONVERGENCE_ANOMALY');

            if (leak.classification === 'LEAK') {
                incidents.push({
                    node_id: nodeId,
                    incident_type: 'CRITICAL_LEAK',
                    severity_level: leak.severity_level || 'P1',
                    academic_classification: academicCode,
                    academic_term: leak.academic_term || 'High-Velocity Laminar Pipe Burst',
                    display_name: leak.display_name || 'Sudden Pipe Rupture',
                    detected_at: nowIso,
                    recommendation: RecommendationAgent.generateActionCard(academicCode, nodeId, leak.severity_level || 'P1', locName)
                });
            } else if (leak.classification === 'SUSPICIOUS') {
                incidents.push({
                    node_id: nodeId,
                    incident_type: 'SUSPICIOUS_USAGE',
                    severity_level: 'P3',
                    academic_classification: academicCode,
                    academic_term: leak.academic_term || 'Stochastic Pre-Convergence Anomaly',
                    display_name: leak.display_name || 'Unusual Water Draw',
                    detected_at: nowIso,
                    recommendation: RecommendationAgent.generateActionCard(academicCode, nodeId, 'P3', locName)
                });
            }
        }

        // 3. Process Fairness with Upstream & Self-Rupture Suppression
        for (const [nodeId, fair] of Object.entries(fairnessHypotheses)) {
            if (fair.is_disadvantaged) {
                const locName = this.nodeMetadata[nodeId]?.location_name || null;

                if (leakHypotheses[nodeId]?.classification === 'LEAK') continue;

                const leakingParent = this.findUpstreamLeak(nodeId, leakHypotheses, conduitBreaches);
                if (!leakingParent) {
                    incidents.push({
                        node_id: nodeId,
                        incident_type: 'FAIRNESS_DEFICIT',
                        severity_level: 'P2',
                        academic_classification: 'RAWLSIAN_RDI_DEFICIT',
                        academic_term: 'Rawlsian Relative Deprivation Deficit',
                        display_name: 'Low Water Supply',
                        detected_at: nowIso,
                        recommendation: RecommendationAgent.generateActionCard('FAIRNESS_DEFICIT', nodeId, 'P2', locName)
                    });
                }
            }
        }

        return incidents;
    }

    async act(incidents) {
        const currentActiveNodeIds = new Set(incidents.map(i => i.node_id));

        // 1. Dispatch active incidents to MySQL and sync to Firebase
        for (const incident of incidents) {
            let dispatchResult = null;
            if (this.dispatcher && typeof this.dispatcher.dispatchIncident === 'function') {
                // Pass incident directly as 1st arg, eventType as 2nd arg
                dispatchResult = await this.dispatcher.dispatchIncident(incident, 'INCIDENT_DETECTED');
            }

            if (this.blackboard && typeof this.blackboard.writeActiveIncident === 'function') {
                const incidentId = dispatchResult?.data?.incident_id || `INC-${incident.node_id}`;
                await this.blackboard.writeActiveIncident(incidentId, incident);
            }
        }

        // 2. Reconciliation: Handle cleared incidents when water flow normalizes
        if (this.blackboard && typeof this.blackboard._request === 'function') {
            try {
                const existingActive = await this.blackboard._request('/blackboard/incidents/active.json');
                if (existingActive && typeof existingActive === 'object') {
                    for (const [incId, incData] of Object.entries(existingActive)) {
                        const nodeId = incData?.node_id;
                        
                        // If node is no longer in the active deliberated list, flow has normalized
                        if (nodeId && !currentActiveNodeIds.has(nodeId)) {
                            console.log(`✔ [Coordinator] Flow normalized on ${nodeId}. Dispatching INCIDENT_CLEARED event.`);
                            
                            // Send INCIDENT_CLEARED event directly
                            if (this.dispatcher && typeof this.dispatcher.dispatchIncident === 'function') {
                                await this.dispatcher.dispatchIncident({
                                    node_id: nodeId,
                                    incident_id: incId
                                }, 'INCIDENT_CLEARED');
                            }

                            // Remove active banner from Firebase RTDB
                            await this.blackboard.removeActiveIncident(incId);
                        }
                    }
                }
            } catch (err) {
                // Non-blocking cleanup guard
            }
        }
    }

    async executeCycle() {
        try {
            const inputs = await this.sense();
            if (inputs) {
                const decision = await this.deliberate(inputs);
                if (decision && decision.length > 0) {
                    await this.act(decision);
                }
            }
            await this.postHeartbeat(this.hasDegradedTopology ? "DEGRADED" : "HEALTHY");
        } catch (error) {
            console.error(`[${this.agentId}] Cycle Execution Error:`, error.message);
            await this.postHeartbeat("DEGRADED");
        }
    }
}
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { CoordinatorAgent } from '../../src/agents/CoordinatorAgent.js';

describe('CoordinatorAgent (Recursive DAG Arbitration & Mass Balance)', () => {
    const mockBlackboard = {};
    const mockDispatcher = { dispatchIncident: async () => {} };

    test('findUpstreamLeak: Correctly detects direct leaking parent', () => {
        const ca = new CoordinatorAgent(mockBlackboard, mockDispatcher);
        ca.dagMap = { 'NODE-B1-002': 'NODE-B1-001' };

        const leakHypotheses = {
            'NODE-B1-001': { classification: 'LEAK' }
        };

        const upstream = ca.findUpstreamLeak('NODE-B1-002', leakHypotheses);
        assert.equal(upstream, 'NODE-B1-001');
    });

    test('findUpstreamLeak: Traverses multi-tier ancestor branch (Grandparent leak)', () => {
        const ca = new CoordinatorAgent(mockBlackboard, mockDispatcher);
        ca.dagMap = {
            'NODE-B1-004': 'NODE-B1-002',
            'NODE-B1-008': 'NODE-B1-004'
        };

        const leakHypotheses = {
            'NODE-B1-002': { classification: 'LEAK' },
            'NODE-B1-004': { classification: 'NORMAL' }
        };

        const upstream = ca.findUpstreamLeak('NODE-B1-008', leakHypotheses);
        assert.equal(upstream, 'NODE-B1-002');
    });

    test('evaluateMassBalance (Fix 3): Inflow minus Outflows exceeding tolerance spawns P1 incident', () => {
        const ca = new CoordinatorAgent(mockBlackboard, mockDispatcher);
        // Topology: Node 1 feeds Node 2 and Node 3
        ca.dagMap = {
            'NODE-B1-002': 'NODE-B1-001',
            'NODE-B1-003': 'NODE-B1-001'
        };
        ca.nodeMetadata = {
            'NODE-B1-001': { location_name: 'Main Reservoir Line' }
        };

        // Node 1 supplies 15.0 LPM, but Node 2 and Node 3 only receive 5.0 LPM combined (10.0 LPM escaping!)
        const rawTelemetry = {
            'NODE-B1-001': { telemetry: { flow_rate_lpm: 15.0 } },
            'NODE-B1-002': { telemetry: { flow_rate_lpm: 3.0 } },
            'NODE-B1-003': { telemetry: { flow_rate_lpm: 2.0 } }
        };

        const breaches = ca.evaluateMassBalance(rawTelemetry);

        assert.equal(breaches.length, 1);
        assert.equal(breaches[0].node_id, 'NODE-B1-001');
        assert.equal(breaches[0].incident_type, 'CRITICAL_LEAK');
        assert.equal(breaches[0].severity_level, 'P1');
        assert.ok(breaches[0].recommendation.action_directive.includes('Hydraulic imbalance of 10.0 LPM'));
    });

    test('BR-06: Deliberation suppresses fairness deficit when induced by upstream leak', async () => {
        const ca = new CoordinatorAgent(mockBlackboard, mockDispatcher);
        ca.dagMap = {
            'NODE-B1-004': 'NODE-B1-002'
        };

        const leakHypotheses = {
            'NODE-B1-002': { classification: 'LEAK' }
        };
        const fairnessHypotheses = {
            'NODE-B1-004': { is_disadvantaged: true }
        };

        const incidents = await ca.deliberate({ leakHypotheses, fairnessHypotheses, rawTelemetry: {} });

        // Should only spawn 1 incident (the P1 CRITICAL_LEAK for 002) and suppress 004
        assert.equal(incidents.length, 1);
        assert.equal(incidents[0].node_id, 'NODE-B1-002');
        assert.equal(incidents[0].incident_type, 'CRITICAL_LEAK');
        assert.equal(incidents[0].severity_level, 'P1');
    });

    test('Deliberation creates P2 incident for genuine uninduced fairness deficit', async () => {
        const ca = new CoordinatorAgent(mockBlackboard, mockDispatcher);
        ca.dagMap = { 'NODE-B1-004': 'NODE-B1-002' };

        const leakHypotheses = {};
        const fairnessHypotheses = {
            'NODE-B1-004': { is_disadvantaged: true }
        };

        const incidents = await ca.deliberate({ leakHypotheses, fairnessHypotheses, rawTelemetry: {} });
        assert.equal(incidents.length, 1);
        assert.equal(incidents[0].node_id, 'NODE-B1-004');
        assert.equal(incidents[0].incident_type, 'FAIRNESS_DEFICIT');
        assert.equal(incidents[0].severity_level, 'P2');
        assert.ok(incidents[0].recommendation.action_directive.includes('Check water pressure'));
    });

    test('Cycle-Defense: Circular parent references do not enter infinite loops', () => {
        const ca = new CoordinatorAgent(mockBlackboard, mockDispatcher);
        ca.dagMap = {
            'NODE-B1-001': 'NODE-B1-002',
            'NODE-B1-002': 'NODE-B1-001'
        };

        const leakHypotheses = {
            'NODE-B1-003': { classification: 'LEAK' }
        };

        const upstream = ca.findUpstreamLeak('NODE-B1-001', leakHypotheses);
        assert.equal(upstream, null);
    });

    test('Resilient Caching: Preserves existing topology cache on network failure', async () => {
        const ca = new CoordinatorAgent(mockBlackboard, mockDispatcher);
        ca.dagMap = {
            'NODE-B1-050': 'NODE-B1-049',
            'NODE-B1-049': 'NODE-B1-001'
        };
        ca.lastDagSync = 0;

        const originalFetch = globalThis.fetch;
        globalThis.fetch = async () => { throw new Error('Connection refused'); };

        try {
            await ca.syncDagHierarchy();
            assert.equal(ca.dagMap['NODE-B1-050'], 'NODE-B1-049');
            assert.equal(ca.hasDegradedTopology, true);
        } finally {
            globalThis.fetch = originalFetch;
        }
    });

    test('Deliberation creates P3 incident for SUSPICIOUS flow anomaly', async () => {
        const ca = new CoordinatorAgent(mockBlackboard, mockDispatcher);
        ca.dagMap = { 'NODE-B1-002': 'NODE-B1-001' };

        const leakHypotheses = {
            'NODE-B1-002': { classification: 'SUSPICIOUS' }
        };
        const fairnessHypotheses = {};

        const incidents = await ca.deliberate({ leakHypotheses, fairnessHypotheses, rawTelemetry: {} });
        
        assert.equal(incidents.length, 1);
        assert.equal(incidents[0].node_id, 'NODE-B1-002');
        assert.equal(incidents[0].incident_type, 'SUSPICIOUS_USAGE');
        assert.equal(incidents[0].severity_level, 'P3');
    });

    test('Self-Rupture Rule: Deliberation suppresses fairness deficit on leaking node itself', async () => {
        const ca = new CoordinatorAgent(mockBlackboard, mockDispatcher);
        ca.dagMap = { 'NODE-B1-002': 'NODE-B1-001' };

        const leakHypotheses = {
            'NODE-B1-002': { classification: 'LEAK' }
        };
        const fairnessHypotheses = {
            'NODE-B1-002': { is_disadvantaged: true }
        };

        const incidents = await ca.deliberate({ leakHypotheses, fairnessHypotheses, rawTelemetry: {} });

        assert.equal(incidents.length, 1);
        assert.equal(incidents[0].node_id, 'NODE-B1-002');
        assert.equal(incidents[0].incident_type, 'CRITICAL_LEAK');
    });
});
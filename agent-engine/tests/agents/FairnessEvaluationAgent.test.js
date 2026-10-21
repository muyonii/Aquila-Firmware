import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { FairnessEvaluationAgent } from '../../src/agents/FairnessEvaluationAgent.js';

describe('FairnessEvaluationAgent (Rawlsian Equity & Profile Baselines)', () => {
    test('Calculates RDI and flags disadvantaged households below 0.70 community mean', async () => {
        const fea = new FairnessEvaluationAgent({}, 86400);

        const nodesData = {
            'NODE-B1-001': {
                status: 'ACTIVE',
                telemetry: { cumulative_liters: 100.0, timestamp: Math.floor(Date.now() / 1000) }
            },
            'NODE-B1-002': {
                status: 'ACTIVE',
                telemetry: { cumulative_liters: 1000.0, timestamp: Math.floor(Date.now() / 1000) }
            }
        };

        const baselineTime = Math.floor(Date.now() / 1000) - 86400;
        fea.volumeHistory['NODE-B1-001'] = [{ timestamp: baselineTime, liters: 0.0 }];
        fea.volumeHistory['NODE-B1-002'] = [{ timestamp: baselineTime, liters: 0.0 }];

        const decisions = await fea.deliberate(nodesData);
        const node1Decision = decisions.find(d => d.node_id === 'NODE-B1-001');
        const node2Decision = decisions.find(d => d.node_id === 'NODE-B1-002');

        assert.equal(node1Decision.is_disadvantaged, true);
        assert.equal(node2Decision.is_disadvantaged, false);
    });

    test('Personal Baseline Guard: Suppresses false deficit on naturally low-consuming households', async () => {
        const fea = new FairnessEvaluationAgent({}, 86400);

        // Node 1 is an elderly 1-person household that normally uses 100 L/day
        // Node 2 is a large family that uses 1000 L/day
        const nodesData = {
            'NODE-B1-001': {
                status: 'ACTIVE',
                telemetry: { cumulative_liters: 100.0, timestamp: Math.floor(Date.now() / 1000) },
                profile: { mean_daily_volume_liters: 100.0 } // Expected volume matches current intake!
            },
            'NODE-B1-002': {
                status: 'ACTIVE',
                telemetry: { cumulative_liters: 1000.0, timestamp: Math.floor(Date.now() / 1000) },
                profile: { mean_daily_volume_liters: 1000.0 }
            }
        };

        const baselineTime = Math.floor(Date.now() / 1000) - 86400;
        fea.volumeHistory['NODE-B1-001'] = [{ timestamp: baselineTime, liters: 0.0 }];
        fea.volumeHistory['NODE-B1-002'] = [{ timestamp: baselineTime, liters: 0.0 }];

        const decisions = await fea.deliberate(nodesData);
        const node1Decision = decisions.find(d => d.node_id === 'NODE-B1-001');

        // Node 1 has RDI < 0.70, but their intake matches their personal baseline -> NOT disadvantaged!
        assert.equal(node1Decision.rdi_score < 0.70, true);
        assert.equal(node1Decision.personal_baseline_verified, true);
        assert.equal(node1Decision.is_disadvantaged, false, 'Small home matching baseline must not be flagged');
    });

    test('Cold-Boot Hydration: Restores volume history from blackboard hypotheses', async () => {
        const now = Math.floor(Date.now() / 1000);
        const mockBlackboard = {
            fetchAllNodesTelemetry: async () => ({
                'NODE-B1-001': {
                    status: 'ACTIVE',
                    telemetry: { cumulative_liters: 2050.0, timestamp: now }
                }
            }),
            fetchHypotheses: async () => ({
                'NODE-B1-001': {
                    node_id: 'NODE-B1-001',
                    delta_liters: 50.0,
                    elapsed_seconds: 7200, // 2 hours
                    timestamp: now - 5
                }
            })
        };

        const fea = new FairnessEvaluationAgent(mockBlackboard, 86400);

        // Initially unhydrated
        assert.equal(Object.keys(fea.volumeHistory).length, 0);

        // Run sense() which triggers cold-boot hydration
        await fea.sense();

        // History must be restored: baseline reading = 2050 - 50 = 2000L
        assert.ok(fea.volumeHistory['NODE-B1-001'] !== undefined);
        assert.equal(fea.volumeHistory['NODE-B1-001'][0].liters, 2000.0);
        assert.equal(fea.isHydrated, true);
    });

    test('BR-05: Municipal Shortage Guard suspends individual flags when projected mean < 50 LPD', async () => {
        const fea = new FairnessEvaluationAgent({}, 86400);

        const nodesData = {
            'NODE-B1-001': {
                status: 'ACTIVE',
                telemetry: { cumulative_liters: 10.0, timestamp: Math.floor(Date.now() / 1000) }
            },
            'NODE-B1-002': {
                status: 'ACTIVE',
                telemetry: { cumulative_liters: 20.0, timestamp: Math.floor(Date.now() / 1000) }
            }
        };

        const baselineTime = Math.floor(Date.now() / 1000) - 86400;
        fea.volumeHistory['NODE-B1-001'] = [{ timestamp: baselineTime, liters: 0.0 }];
        fea.volumeHistory['NODE-B1-002'] = [{ timestamp: baselineTime, liters: 0.0 }];

        const decisions = await fea.deliberate(nodesData);
        for (const decision of decisions) {
            assert.equal(decision.override_active, true);
            assert.equal(decision.is_disadvantaged, false);
        }
    });

    test('Ignores nodes flagged as MAINTENANCE and purges their historical buffer', async () => {
        const fea = new FairnessEvaluationAgent({});
        const nodesData = {
            'NODE-B1-001': {
                status: 'MAINTENANCE',
                telemetry: { cumulative_liters: 5.0, timestamp: Math.floor(Date.now() / 1000) }
            },
            'NODE-B1-002': {
                status: 'ACTIVE',
                telemetry: { cumulative_liters: 100.0, timestamp: Math.floor(Date.now() / 1000) }
            }
        };

        fea.volumeHistory['NODE-B1-001'] = [{ timestamp: Math.floor(Date.now() / 1000) - 86400, liters: 0.0 }];
        fea.volumeHistory['NODE-B1-002'] = [{ timestamp: Math.floor(Date.now() / 1000) - 86400, liters: 0.0 }];

        const decisions = await fea.deliberate(nodesData);
        assert.equal(decisions.length, 1);
        assert.equal(decisions[0].node_id, 'NODE-B1-002');
        assert.equal(fea.volumeHistory['NODE-B1-001'], undefined);
    });

    test('Warm-up Guard: Suppresses alerts during cold boot (elapsed < 30s)', async () => {
        const fea = new FairnessEvaluationAgent({});
        const now = Math.floor(Date.now() / 1000);

        const nodesData = {
            'NODE-B1-001': {
                status: 'ACTIVE',
                telemetry: { cumulative_liters: 0.1, timestamp: now }
            },
            'NODE-B1-002': {
                status: 'ACTIVE',
                telemetry: { cumulative_liters: 1.0, timestamp: now }
            }
        };

        const decisions = await fea.deliberate(nodesData);
        for (const decision of decisions) {
            assert.equal(decision.is_warming_up, true);
            assert.equal(decision.is_disadvantaged, false);
            assert.equal(decision.override_active, false);
        }
    });
});
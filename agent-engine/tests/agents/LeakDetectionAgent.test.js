import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { LeakDetectionAgent } from '../../src/agents/LeakDetectionAgent.js';

describe('LeakDetectionAgent (Sensing & Deliberation Lifecycle)', () => {
    test('Maintenance Mode: Actively clears blackboard with neutral status', async () => {
        const lda = new LeakDetectionAgent({});
        const now = Math.floor(Date.now() / 1000);

        const nodesData = {
            'NODE-B1-002': {
                status: 'MAINTENANCE',
                telemetry: { flow_rate_lpm: 3.5, timestamp: now }
            }
        };

        const decisions = await lda.deliberate(nodesData);
        assert.equal(decisions.length, 1);
        assert.equal(decisions[0].node_id, 'NODE-B1-002');
        assert.equal(decisions[0].classification, 'MAINTENANCE', 'Must publish MAINTENANCE status');
        assert.equal(decisions[0].leak_probability, 0.0);
    });

    test('Fault Mode: Hardware fault suppresses alarms and publishes FAULT classification', async () => {
        const lda = new LeakDetectionAgent({});
        const now = Math.floor(Date.now() / 1000);

        const nodesData = {
            'NODE-B1-003': {
                status: 'FAULT',
                telemetry: { flow_rate_lpm: 4.8, timestamp: now }
            }
        };

        const decisions = await lda.deliberate(nodesData);
        assert.equal(decisions.length, 1);
        assert.equal(decisions[0].node_id, 'NODE-B1-003');
        assert.equal(decisions[0].classification, 'FAULT', 'Must publish FAULT classification');
        assert.equal(decisions[0].leak_probability, 0.0);
    });

    test('Stale Telemetry Watchdog: Marks node OFFLINE if packet age > 45s', async () => {
        const lda = new LeakDetectionAgent({});
        const now = Math.floor(Date.now() / 1000);

        const nodesData = {
            'NODE-B1-002': {
                status: 'ACTIVE',
                telemetry: { flow_rate_lpm: 2.5, timestamp: now - 50 } // 50s old (> 45s threshold)
            }
        };

        const decisions = await lda.deliberate(nodesData);
        assert.equal(decisions.length, 1);
        assert.equal(decisions[0].classification, 'OFFLINE');
        assert.equal(decisions[0].leak_probability, 0.0);
    });

    test('Early-Stage Anomaly (< 30s): Classifies flow as SUSPICIOUS', async () => {
        const lda = new LeakDetectionAgent({});
        const now = Math.floor(Date.now() / 1000);

        const nodesData = {
            'NODE-B1-002': {
                status: 'ACTIVE',
                telemetry: { flow_rate_lpm: 3.42, timestamp: now }
            }
        };

        lda.history['NODE-B1-002'] = {
            activeSince: now - 10,
            zeroSince: null,
            buffer: [3.42, 3.40, 3.43]
        };

        const decisions = await lda.deliberate(nodesData);
        assert.equal(decisions.length, 1);
        assert.equal(decisions[0].classification, 'SUSPICIOUS', 'Bursts < 30s must be classified as SUSPICIOUS');
        assert.ok(decisions[0].leak_probability >= 0.40);
    });

    test('Sustained Rupture (Tier 1 >= 30s): Classifies continuous flow as LEAK', async () => {
        const lda = new LeakDetectionAgent({});
        const now = Math.floor(Date.now() / 1000);

        const nodesData = {
            'NODE-B1-002': {
                status: 'ACTIVE',
                telemetry: { flow_rate_lpm: 3.42, timestamp: now }
            }
        };

        lda.history['NODE-B1-002'] = {
            activeSince: now - 35,
            zeroSince: null,
            buffer: [3.42, 3.40, 3.43, 3.41]
        };

        const decisions = await lda.deliberate(nodesData);
        assert.equal(decisions.length, 1);
        assert.equal(decisions[0].classification, 'LEAK', 'Bursts >= 30s must be classified as LEAK');
        assert.ok(decisions[0].leak_probability >= 0.40);
    });

    test('Zero-Flow Invariant (Tier 2): Continuous unpaused draw >= 60 minutes triggers LEAK', async () => {
        const lda = new LeakDetectionAgent({});
        const now = Math.floor(Date.now() / 1000);

        const nodesData = {
            'NODE-B1-002': {
                status: 'ACTIVE',
                telemetry: { flow_rate_lpm: 1.80, timestamp: now }
            }
        };

        lda.history['NODE-B1-002'] = {
            activeSince: now - (65 * 60), // 65 minutes active
            zeroSince: null,
            buffer: [1.80, 1.82, 1.79]
        };

        const decisions = await lda.deliberate(nodesData);
        assert.equal(decisions[0].classification, 'LEAK', 'Unpaused flow >= 60m must classify as LEAK');
        assert.ok(decisions[0].leak_probability >= 0.90);
    });

    test('Zero Hangover Hysteresis (Fix 4): Brief 0.0 LPM packet drop does NOT wipe activeSince', async () => {
        const lda = new LeakDetectionAgent({});
        const now = Math.floor(Date.now() / 1000);

        lda.history['NODE-B1-002'] = {
            activeSince: now - 40,
            zeroSince: null,
            buffer: [3.40, 3.42]
        };

        // 1-second packet drop to 0.0 LPM
        const nodesData = {
            'NODE-B1-002': {
                status: 'ACTIVE',
                telemetry: { flow_rate_lpm: 0.0, timestamp: now }
            }
        };

        await lda.deliberate(nodesData);

        // Memory must remain intact because zero has not lasted 30 continuous seconds
        assert.ok(lda.history['NODE-B1-002'].activeSince !== null, 'activeSince must not be wiped by brief 0 LPM drop');
    });
});
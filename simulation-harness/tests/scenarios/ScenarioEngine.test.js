import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { NodeStateManager } from '../../src/core/NodeStateManager.js';
import { ScenarioEngine } from '../../src/scenarios/ScenarioEngine.js';
import { SCENARIO_PRESETS } from '../../src/scenarios/ScenarioPresets.js';

describe('ScenarioEngine (Presets, Overrides & Chaos Testing)', () => {
    test('Activates preset by shortcut key correctly', () => {
        const manager = new NodeStateManager();
        const engine = new ScenarioEngine(manager);

        const activated = engine.setPreset('2'); // Key '2' = SUDDEN_BURST
        assert.equal(activated.id, 'SUDDEN_BURST');
        assert.equal(engine.getActivePreset().id, 'SUDDEN_BURST');
    });

    test('SUDDEN_BURST preset locks Node B1-002 flow to 18.0 LPM', () => {
        const manager = new NodeStateManager();
        const engine = new ScenarioEngine(manager);

        engine.setPreset('SUDDEN_BURST');
        const results = engine.evaluateTick(15);

        assert.equal(results['NODE-B1-002'].current_flow_lpm, 18.0);
        assert.equal(results['NODE-B1-002'].effective_std, 0.03);
    });

    test('NOCTURNAL_SEEP preset forces hour to 02:00 AM', () => {
        const manager = new NodeStateManager();
        const engine = new ScenarioEngine(manager);

        engine.setPreset('NOCTURNAL_SEEP');
        assert.equal(engine.getCurrentSimulatedHour(), 2);
    });

    test('Chaos Mode packet loss decision evaluates probabilistically', () => {
        const manager = new NodeStateManager();
        const engine = new ScenarioEngine(manager);

        assert.equal(engine.shouldDropPacket(), false); // Chaos disabled by default

        engine.toggleChaosMode(); // Enable Chaos Mode (20% drop rate)

        let dropCount = 0;
        const totalRuns = 1000;
        for (let i = 0; i < totalRuns; i++) {
            if (engine.shouldDropPacket()) dropCount++;
        }

        // 20% rate over 1000 runs should land roughly between 150 and 250 drops
        assert.ok(dropCount >= 140 && dropCount <= 260, `Expected ~200 drops, got ${dropCount}`);
    });
});
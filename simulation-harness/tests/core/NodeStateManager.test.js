import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { NodeStateManager } from '../../src/core/NodeStateManager.js';

describe('NodeStateManager (Odometer Math & Hardware Fallback)', () => {
    test('Initializes 9 nodes matching synthetic configuration', () => {
        const manager = new NodeStateManager();
        const states = manager.getAllStates();
        assert.equal(Object.keys(states).length, 9);
        assert.equal(states['NODE-B1-001'].is_physical, true);
        assert.equal(states['NODE-B1-002'].is_physical, false);
    });

    test('Accumulates odometer correctly: ΔL = (Q / 60) * elapsedSeconds', () => {
        const manager = new NodeStateManager();
        const initialOdometer = manager.getState('NODE-B1-002').cumulative_liters;

        // Flow at 12.0 LPM for 15 seconds = 3.0 Liters added
        const updated = manager.updateNodeFlow('NODE-B1-002', 12.0, 0.05, 15);

        assert.equal(updated.current_flow_lpm, 12.0);
        assert.equal(updated.cumulative_liters, parseFloat((initialOdometer + 3.0).toFixed(2)));
        assert.equal(updated.packet_sequence, 2);
    });

    test('Hardware Fallback Watchdog engages when ESP32 goes silent for > 30s', () => {
        const manager = new NodeStateManager();
        const node1 = manager.getState('NODE-B1-001');

        // Simulate physical hardware transmitting
        manager.registerHardwareHeartbeat('NODE-B1-001', {
            flow_rate_lpm: 4.5,
            cumulative_liters: 2000.0,
            packet_sequence: 99
        });

        assert.equal(node1.is_hardware_active, true);

        // Manually backdate heartbeat timestamp to 35 seconds ago
        node1.last_hardware_packet_at = Date.now() - 35000;

        manager.evaluateHardwareFallback(30000);

        // Watchdog must disengage hardware mode and enable virtual fallback
        assert.equal(node1.is_hardware_active, false);
    });

    test('Reset Odometer properly handles simulated meter swap', () => {
        const manager = new NodeStateManager();
        manager.resetOdometer('NODE-B1-003', 15.0);
        assert.equal(manager.getState('NODE-B1-003').cumulative_liters, 15.0);
    });
});
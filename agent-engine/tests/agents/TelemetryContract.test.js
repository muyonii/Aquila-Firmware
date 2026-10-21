import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { TelemetryContract } from '../../src/contracts/TelemetryContract.js';

describe('TelemetryContract (Validation & Boundary Integrity)', () => {
    test('Valid telemetry packet without battery passes validation', () => {
        const validPacket = {
            node_id: 'NODE-B1-001',
            packet_sequence: 142,
            timestamp: 1727500000,
            flow_rate_lpm: 3.42,
            cumulative_liters: 1540.20,
            is_simulated: false
        };
        assert.equal(TelemetryContract.validate(validPacket), true);
    });

    test('Missing required field fails validation', () => {
        const invalidPacket = {
            node_id: 'NODE-B1-001',
            timestamp: 1727500000,
            flow_rate_lpm: 3.42
            // Missing packet_sequence, cumulative_liters, is_simulated
        };
        assert.equal(TelemetryContract.validate(invalidPacket), false);
    });

    test('Flow rate exceeding hydraulic capacity (> 45 LPM) fails validation', () => {
        const invalid = {
            node_id: 'NODE-B1-001',
            packet_sequence: 1,
            timestamp: 1727500000,
            flow_rate_lpm: 46.5,
            cumulative_liters: 100.0,
            is_simulated: false
        };
        assert.equal(TelemetryContract.validate(invalid), false);
    });

    test('Negative cumulative liters fails validation', () => {
        const invalid = {
            node_id: 'NODE-B1-001',
            packet_sequence: 1,
            timestamp: 1727500000,
            flow_rate_lpm: 3.42,
            cumulative_liters: -0.5,
            is_simulated: false
        };
        assert.equal(TelemetryContract.validate(invalid), false);
    });
});
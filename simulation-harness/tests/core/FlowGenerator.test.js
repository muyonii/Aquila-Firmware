import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { FlowGenerator } from '../../src/core/FlowGenerator.js';

describe('FlowGenerator (Waveforms & Archetypes)', () => {
    test('Diurnal nocturnal window (02:00 AM) defaults to quiescent or minimal flow', () => {
        for (let i = 0; i < 20; i++) {
            const sample = FlowGenerator.generateDiurnalFlow(2);
            assert.ok(sample.flow_rate_lpm >= 0.0 && sample.flow_rate_lpm <= 2.0);
            assert.ok(sample.effective_std >= 0.02);
        }
    });

    test('Burst Archetype generates high velocity with flat variance', () => {
        const burst = FlowGenerator.generateBurst();
        assert.ok(burst.flow_rate_lpm >= 16.0 && burst.flow_rate_lpm <= 28.0);
        assert.ok(burst.effective_std <= 0.08); // Laminar flat variance
    });

    test('Running Toilet Archetype generates low continuous flow with dead-flat variance', () => {
        const toilet = FlowGenerator.generateRunningToilet();
        assert.ok(toilet.flow_rate_lpm >= 1.5 && toilet.flow_rate_lpm <= 3.0);
        assert.ok(toilet.effective_std <= 0.04);
    });
});
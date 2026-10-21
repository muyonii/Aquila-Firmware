import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { IAgent } from '../../src/contracts/IAgent.js';

describe('IAgent Contract Verification', () => {
    test('Valid agent instance passes validation', () => {
        const mockAgent = {
            agentId: 'CMP-TEST-01',
            sense: async () => {},
            deliberate: async () => {},
            act: async () => {},
            executeCycle: async () => {},
            postHeartbeat: async () => {}
        };

        assert.equal(IAgent.validate(mockAgent), true);
    });

    test('Throws TypeError if agent is null or not an object', () => {
        assert.throws(() => IAgent.validate(null), /requires an active class instance/);
        assert.throws(() => IAgent.validate('string'), /requires an active class instance/);
    });

    test('Throws TypeError if agentId is missing or empty', () => {
        const invalidAgent = {
            agentId: '',
            sense: () => {},
            deliberate: () => {},
            act: () => {},
            executeCycle: () => {},
            postHeartbeat: () => {}
        };

        assert.throws(() => IAgent.validate(invalidAgent), /Missing or invalid 'agentId'/);
    });

    test('Throws TypeError if an SDA method is missing', () => {
        const incompleteAgent = {
            agentId: 'CMP-TEST-02',
            sense: () => {},
            deliberate: () => {},
            // Missing act()
            executeCycle: () => {},
            postHeartbeat: () => {}
        };

        assert.throws(() => IAgent.validate(incompleteAgent), /Missing 'act\(\)' implementation/);
    });
});
/**
 * Formal Interface Contract for Autonomous Agents (IAgent)
 *
 * Verifies at runtime that any analytical or coordination agent (LDA, FEA, CA)
 * strictly provides the mandatory Sense-Deliberate-Act (SDA) methods,
 * canonical agent identification, and watchdog heartbeat capabilities.
 */
export class IAgent {
    /**
     * Mandatory methods required for the Sense-Deliberate-Act cycle
     */
    static REQUIRED_METHODS = ['sense', 'deliberate', 'act', 'executeCycle', 'postHeartbeat'];

    /**
     * Validates that an agent instance satisfies the IAgent contract.
     *
     * @param {Object} agentInstance
     * @throws {TypeError} if any contract invariant is violated
     * @returns {boolean} true if strictly compliant
     */
    static validate(agentInstance) {
        if (!agentInstance || typeof agentInstance !== 'object') {
            throw new TypeError("IAgent contract validation requires an active class instance.");
        }

        // 1. Structural Identity Check: Must have a non-empty canonical agent ID (e.g. 'CMP-LDA-01')
        if (typeof agentInstance.agentId !== 'string' || agentInstance.agentId.trim() === '') {
            throw new TypeError(
                `Class ${agentInstance.constructor.name} violates IAgent contract: Missing or invalid 'agentId' string.`
            );
        }

        // 2. Behavioral Method Checks: Must implement all SDA lifecycle methods
        for (const method of this.REQUIRED_METHODS) {
            if (typeof agentInstance[method] !== 'function') {
                throw new TypeError(
                    `Class ${agentInstance.constructor.name} violates IAgent contract: Missing '${method}()' implementation.`
                );
            }
        }

        return true;
    }
}
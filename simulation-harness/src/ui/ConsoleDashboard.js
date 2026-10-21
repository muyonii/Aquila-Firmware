/**
 * ConsoleDashboard
 *
 * Renders an ANSI terminal UI for live demonstration and testing.
 * Features flow sparklines, state indicators, and keyboard shortcuts.
 */
export class ConsoleDashboard {
    static generateSparkline(flowRateLpm) {
        if (flowRateLpm <= 0.05) return '      ';
        if (flowRateLpm < 2.0)  return '  ▃   ';
        if (flowRateLpm < 5.0)  return '  ▃▅  ';
        if (flowRateLpm < 10.0) return ' ▃▅▇ ';
        return '▃▅▇█▇';
    }

    static render(scenarioEngine, streamResult = {}) {
        const preset = scenarioEngine.getActivePreset();
        const states = scenarioEngine.stateManager.getAllStates();
        const isAccelerated = scenarioEngine.isAccelerated;
        const isChaos = scenarioEngine.isChaosMode;
        const currentHour = scenarioEngine.getCurrentSimulatedHour();

        // Clear terminal screen and move cursor to top-left
        process.stdout.write('\x1Bc');

        console.log('========================================================================================');
        console.log(' AQUILA Digital Twin Simulation Harness (CMP-SIM-01)');
        console.log(' Target Hot Store : ' + scenarioEngine.stateManager.states['NODE-B1-001'] ? 'Connected' : 'Disconnected');
        console.log(' Simulated Hour   : ' + String(currentHour).padStart(2, '0') + ':00 PST | Cadence: ' + (isAccelerated ? '250ms (Accelerated ⏩)' : '15s (Real-Time ⏱️)'));
        console.log(' Active Preset    : [' + preset.key + '] ' + preset.title);
        console.log(' Chaos Mode       : ' + (isChaos ? 'ENABLED (20% Packet Loss 💥)' : 'Disabled'));
        console.log('========================================================================================');

        console.log(
            'Node ID'.padEnd(13) + ' | ' +
            'Household Label'.padEnd(28) + ' | ' +
            'Flow (LPM)'.padEnd(11) + ' | ' +
            'StdDev (σ)'.padEnd(10) + ' | ' +
            'Odometer (L)'.padEnd(13) + ' | ' +
            'Sparkline'
        );
        console.log('----------------------------------------------------------------------------------------');

        for (const [nodeId, state] of Object.entries(states)) {
            const flowStr = String(state.current_flow_lpm.toFixed(2)).padStart(6) + ' L/m';
            const stdStr  = String(state.effective_std.toFixed(3)).padStart(6);
            const odoStr  = String(state.cumulative_liters.toFixed(1)).padStart(8) + ' L';
            const spark   = this.generateSparkline(state.current_flow_lpm);
            
            let tag = state.is_physical ? (state.is_hardware_active ? '[HW Live]' : '[HW Failover]') : '[Virtual]';

            console.log(
                nodeId.padEnd(13) + ' | ' +
                (state.household_label.slice(0, 25) + '..').padEnd(28) + ' | ' +
                flowStr.padEnd(11) + ' | ' +
                stdStr.padEnd(10) + ' | ' +
                odoStr.padEnd(13) + ' | ' +
                spark + ' ' + tag
            );
        }

        console.log('----------------------------------------------------------------------------------------');
        console.log(' [1-7] Presets: 1:Normal  2:Burst  3:MainLine  4:Toilet  5:NightMNF  6:Fairness  7:Drought');
        console.log(' [A] Toggle Time-Warp Speed  |  [C] Toggle Chaos Mode  |  [R] Reset Odometer  |  [Q] Quit');
        console.log('========================================================================================');

        if (streamResult.droppedCount > 0) {
            console.log(`💥 [Chaos Alert] Dropped ${streamResult.droppedCount} telemetry packets this tick.`);
        }
    }
}
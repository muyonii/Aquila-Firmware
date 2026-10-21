/**
 * ScenarioPresets
 *
 * Predefined physical event presets for live thesis demonstrations and stress testing.
 */
export const SCENARIO_PRESETS = {
    // Preset 1: Standard 24h diurnal demand profile across all households
    NORMAL_DIURNAL: {
        id: 'NORMAL_DIURNAL',
        key: '1',
        title: 'Normal Diurnal Demand',
        description: 'Standard household water usage (morning peak, midday lull, evening peak, quiet night).',
        overrides: {}
    },

    // Preset 2: Catastrophic pipe burst on a single household branch (P1)
    SUDDEN_BURST: {
        id: 'SUDDEN_BURST',
        key: '2',
        title: 'Sudden Pipe Rupture (Node B1-002)',
        description: 'Simulates an instant 18.0 LPM pipe rupture with flat laminar variance on NODE-B1-002.',
        overrides: {
            'NODE-B1-002': { flow_rate_lpm: 18.0, effective_std: 0.03, lock_flow: true }
        }
    },

    // Preset 3: Topological Mass Balance Discrepancy (Mainline Pipe Loss)
    MAINLINE_CONDUIT_LOSS: {
        id: 'MAINLINE_CONDUIT_LOSS',
        key: '3',
        title: 'Mainline Pipe Loss (Parent B1-001 vs Children)',
        description: 'Parent B1-001 supplies 18.0 LPM, but downstream children consume only 6.0 LPM (12.0 LPM underground loss).',
        overrides: {
            'NODE-B1-001': { flow_rate_lpm: 18.0, effective_std: 0.04, lock_flow: true },
            'NODE-B1-002': { flow_rate_lpm: 3.5, effective_std: 0.25, lock_flow: true },
            'NODE-B1-003': { flow_rate_lpm: 2.5, effective_std: 0.30, lock_flow: true }
        }
    },

    // Preset 4: Zero-Flow Invariant Violation (Running Toilet Flapper > 60 min)
    RUNNING_TOILET: {
        id: 'RUNNING_TOILET',
        key: '4',
        title: 'Running Toilet Flapper (Node B1-005)',
        description: 'Continuous unbroken 1.8 LPM trickle on NODE-B1-005 lasting past the 60-minute duration ceiling.',
        overrides: {
            'NODE-B1-005': { flow_rate_lpm: 1.8, effective_std: 0.02, lock_flow: true }
        }
    },

    // Preset 5: IWA Minimum Night Flow Anomaly (02:00 AM Nocturnal Seepage)
    NOCTURNAL_SEEP: {
        id: 'NOCTURNAL_SEEP',
        key: '5',
        title: 'Nocturnal Minimum Night Flow Leak (Node B1-003)',
        description: 'Forces simulated hour to 02:00 AM; NODE-B1-003 maintains an elevated 2.2 LPM laminar draw.',
        forced_hour: 2,
        overrides: {
            'NODE-B1-003': { flow_rate_lpm: 2.2, effective_std: 0.03, lock_flow: true }
        }
    },

    // Preset 6: Rawlsian Water Equity Deficit (Elevated Terminal Node Starved)
    FAIRNESS_DEFICIT: {
        id: 'FAIRNESS_DEFICIT',
        key: '6',
        title: 'Rawlsian Water Equity Deficit (Node B1-008)',
        description: 'Terminal Node B1-008 receives only 0.3 LPM while lower homes consume 8.0 LPM.',
        overrides: {
            'NODE-B1-002': { flow_rate_lpm: 8.0, effective_std: 0.35, lock_flow: true },
            'NODE-B1-004': { flow_rate_lpm: 8.0, effective_std: 0.35, lock_flow: true },
            'NODE-B1-008': { flow_rate_lpm: 0.3, effective_std: 0.40, lock_flow: true }
        }
    },

    // Preset 7: Town-Wide Drought / Reservoir Shortage (BR-05 Shortage Override)
    MUNICIPAL_DROUGHT: {
        id: 'MUNICIPAL_DROUGHT',
        key: '7',
        title: 'Municipal Drought / Reservoir Shortage',
        description: 'Town-wide water supply drops below WHO 50 LPD floor; triggers BR-05 shortage override.',
        global_multiplier: 0.08
    }
};
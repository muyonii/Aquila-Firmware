/**
 * Formal Leak Classification Taxonomy
 * 
 * Bridges terminology with operational field titles.
 */
export const LEAK_TAXONOMY = {
    TIER_1A_BURST: {
        code: 'HIGH_VELOCITY_BURST',
        display_name: 'Sudden Pipe Rupture',
        academic_term: 'High-Velocity Laminar Pipe Burst',
        db_incident_type: 'CRITICAL_LEAK',
        severity: 'P1'
    },
    TIER_1B_MASS_BALANCE: {
        code: 'TOPOLOGICAL_MASS_DEFICIT',
        display_name: 'Mainline Pipe Loss',
        academic_term: 'Topological Mass Balance Deficit',
        db_incident_type: 'CRITICAL_LEAK',
        severity: 'P1'
    },
    TIER_2_ZERO_FLOW: {
        code: 'ZERO_FLOW_INVARIANT',
        display_name: 'Continuous Fixture Leak',
        academic_term: 'Zero-Flow Invariant Violation',
        db_incident_type: 'CRITICAL_LEAK',
        severity: 'P2'
    },
    TIER_3_MNF: {
        code: 'NOCTURNAL_MNF_ANOMALY',
        display_name: 'Nighttime Baseflow Leak',
        academic_term: 'Nocturnal Minimum Night Flow (MNF) Anomaly',
        db_incident_type: 'CRITICAL_LEAK',
        severity: 'P2'
    },
    TIER_4_SUSPICIOUS: {
        code: 'PRE_CONVERGENCE_ANOMALY',
        display_name: 'Unusual Water Draw',
        academic_term: 'Stochastic Pre-Convergence Anomaly',
        db_incident_type: 'SUSPICIOUS_USAGE',
        severity: 'P3'
    },
    TIER_5_NORMAL: {
        code: 'NORMAL_DEMAND',
        display_name: 'Normal Usage',
        academic_term: 'Stochastic High-Variance Demand',
        db_incident_type: null,
        severity: null
    }
};
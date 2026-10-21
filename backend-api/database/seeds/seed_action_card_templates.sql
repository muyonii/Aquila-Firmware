-- =============================================================================
-- Seed: Standard Action Card Templates & Taxonomy Catalog
-- =============================================================================

INSERT INTO `action_card_templates` 
(`template_id`, `incident_type`, `severity_level`, `academic_classification`, `academic_term`, `display_name`, `action_card_title`, `action_directive`) 
VALUES
-- 1. Tier 1A: Burst Rupture
(1, 'CRITICAL_LEAK', 'P1', 'HIGH_VELOCITY_BURST', 'High-Velocity Laminar Pipe Burst', 'Sudden Pipe Rupture', 'Catastrophic Pipe Rupture', 'Urgent: High-velocity pipe rupture detected. Inspect meter box, pipeline fittings, and ground surface immediately. Close the local isolation gate valve to stop water loss and patch or clamp the damaged PVC/HDPE conduit.'),

-- 2. Tier 1B: Topological Mass Balance Conduit Loss
(2, 'CRITICAL_LEAK', 'P1', 'TOPOLOGICAL_MASS_DEFICIT', 'Topological Mass Balance Deficit', 'Mainline Pipe Loss', 'Conduit Mass Discrepancy', 'Hydraulic imbalance detected: Upstream inflow significantly exceeds the aggregate consumption of downstream branch meters. Inspect main distribution conduit feeding downstream branch nodes for concealed underground fractures.'),

-- 3. Tier 2: Continuous Internal Fixture Leak
(3, 'CRITICAL_LEAK', 'P2', 'ZERO_FLOW_INVARIANT', 'Zero-Flow Invariant Violation', 'Continuous Fixture Leak', 'Unpaused Internal Draw', 'Continuous unpaused water draw detected exceeding twice the normal household duration ceiling. Inspect domestic fixtures for leaking toilet flapper valves, open garden taps, or cracked secondary service lines.'),

-- 4. Tier 3: Minimum Night Flow Anomaly
(4, 'CRITICAL_LEAK', 'P2', 'NOCTURNAL_MNF_ANOMALY', 'Nocturnal Minimum Night Flow Anomaly', 'Nighttime Baseflow Leak', 'Nocturnal MNF Seepage', 'Abnormal flow detected during minimum night window (01:00-04:30 AM). Inspect for sub-surface pipe weeping, storage cistern float valve failure, or compromised service connections.'),

-- 5. Tier 4: Suspicious Early-Stage Anomaly
(5, 'SUSPICIOUS_USAGE', 'P3', 'PRE_CONVERGENCE_ANOMALY', 'Stochastic Pre-Convergence Anomaly', 'Unusual Water Draw', 'Early Anomaly Warning', 'Continuous water draw detected pending statistical convergence. Verify with resident whether high water draw is intentional (e.g., drum filling or tank replenishment) before dispatching field technicians.'),

-- 6. Tier 5: Rawlsian Relative Deprivation Equity Deficit
(6, 'FAIRNESS_DEFICIT', 'P2', 'RAWLSIAN_RDI_DEFICIT', 'Rawlsian Relative Deprivation Deficit', 'Low Water Supply', 'Community Equity Deficit', 'Check water pressure at household meter. Household is receiving significantly less water than neighboring cluster homes (RDI < 0.70). Inspect supply line for partial blockages, check if upstream isolation valve is partially closed, or test for air locks.')

ON DUPLICATE KEY UPDATE 
    `action_card_title` = VALUES(`action_card_title`),
    `action_directive` = VALUES(`action_directive`);
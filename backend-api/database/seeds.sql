-- =============================================================================
-- AQUILA SYSTEM: COMPLETE 13-TABLE TOPOLOGICAL SEED DATA
-- Default User Password for all accounts: Password123!
-- =============================================================================

USE `aquila_db`;

SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------------------------------
-- 1. Table 3.9: ACTION_CARD_TEMPLATES (6 Standard SOP Templates)
-- -----------------------------------------------------------------------------
INSERT INTO `action_card_templates` 
(`template_id`, `incident_type`, `severity_level`, `academic_classification`, `academic_term`, `display_name`, `action_card_title`, `action_directive`) 
VALUES
(1, 'CRITICAL_LEAK', 'P1', 'HIGH_VELOCITY_BURST', 'High-Velocity Laminar Pipe Burst', 'Sudden Pipe Rupture', 'Catastrophic Pipe Rupture', 'Urgent: High-velocity pipe rupture detected. Close local gate valve immediately and clamp damaged pipe.'),
(2, 'CRITICAL_LEAK', 'P1', 'TOPOLOGICAL_MASS_DEFICIT', 'Topological Mass Balance Deficit', 'Mainline Pipe Loss', 'Conduit Mass Discrepancy', 'Inflow exceeds downstream branch meters. Inspect main transmission conduit for underground fractures.'),
(3, 'CRITICAL_LEAK', 'P2', 'ZERO_FLOW_INVARIANT', 'Zero-Flow Invariant Violation', 'Continuous Fixture Leak', 'Unpaused Internal Draw', 'Continuous unpaused draw detected. Inspect domestic fixtures for leaking toilet flappers or open taps.'),
(4, 'CRITICAL_LEAK', 'P2', 'NOCTURNAL_MNF_ANOMALY', 'Nocturnal Minimum Night Flow Anomaly', 'Nighttime Baseflow Leak', 'Nocturnal MNF Seepage', 'Abnormal flow observed during 01:00-04:30 AM window. Inspect cistern valves or pipe weeping.'),
(5, 'SUSPICIOUS_USAGE', 'P3', 'PRE_CONVERGENCE_ANOMALY', 'Stochastic Pre-Convergence Anomaly', 'Unusual Water Draw', 'Early Anomaly Warning', 'Continuous water draw detected pending statistical convergence. Verify with resident.'),
(6, 'FAIRNESS_DEFICIT', 'P2', 'RAWLSIAN_RDI_DEFICIT', 'Rawlsian Relative Deprivation Deficit', 'Low Water Supply', 'Community Equity Deficit', 'Check pressure: Household is receiving significantly less water than neighbors (RDI < 0.70).')
ON DUPLICATE KEY UPDATE `display_name` = VALUES(`display_name`);

-- -----------------------------------------------------------------------------
-- 2. Table 3.6: MONITORING_NODE (Physical Rig + 8 Synthetic Feeder Nodes)
-- -----------------------------------------------------------------------------
INSERT INTO `monitoring_node` 
(`node_id`, `household_label`, `location_name`, `purok_cluster`, `parent_node_id`, `latitude`, `longitude`, `coordinates`, `is_physical`, `installation_date`, `status`, `device_token`, `meter_claim_key_hash`) 
VALUES
('NODE-B1-001', 'Household 01 (Physical Testbed)', 'Lot 14 Blk 2, Bougainvillea St., Purok 2', 'Purok 2', NULL,          14.6778000, 120.5412000, ST_PointFromText('POINT(120.5412000 14.6778000)'), 1, '2026-09-01', 'ACTIVE', 'dev_token_001', 'b625ca4e963e6e8e81561570bbd8a261882bf4e1e07504ee88339b168f1ff796'),
('NODE-B1-002', 'Household 02 (Santos Family)',     'Lot 18 Blk 2, Rosal Ext., Purok 2',          'Purok 2', 'NODE-B1-001', 14.6772000, 120.5422000, ST_PointFromText('POINT(120.5422000 14.6772000)'), 0, '2026-09-01', 'ACTIVE', 'dev_token_002', 'c5a0db8f4955b248a30f785b2e9e802a4bf78345c22530188efb8b24874b2102'),
('NODE-B1-003', 'Household 03 (Reyes Family)',      'Corner Sampaguita St. & Main Road, Purok 2', 'Purok 2', 'NODE-B1-001', 14.6766000, 120.5415000, ST_PointFromText('POINT(120.5415000 14.6766000)'), 0, '2026-09-01', 'ACTIVE', 'dev_token_003', NULL),
('NODE-B1-004', 'Household 04 (Cruz Family)',       'Purok 2 Water Terminal Near Daycare',        'Purok 2', 'NODE-B1-002', 14.6761000, 120.5430000, ST_PointFromText('POINT(120.5430000 14.6761000)'), 0, '2026-09-01', 'ACTIVE', 'dev_token_004', NULL),
('NODE-B1-005', 'Household 05 (Bautista Family)',   'Blk 5 Lot 9, Ilang-Ilang Lane, Purok 2',    'Purok 2', 'NODE-B1-002', 14.6769000, 120.5436000, ST_PointFromText('POINT(120.5436000 14.6769000)'), 0, '2026-09-01', 'ACTIVE', 'dev_token_005', NULL),
('NODE-B1-006', 'Household 06 (Mendoza Family)',    'Sitio Riverside Tap 1, Purok 2',            'Purok 2', 'NODE-B1-003', 14.6756000, 120.5411000, ST_PointFromText('POINT(120.5411000 14.6756000)'), 0, '2026-09-01', 'ACTIVE', 'dev_token_006', NULL),
('NODE-B1-007', 'Household 07 (Garcia Family)',     'Sitio Riverside Tap 2, Purok 2',            'Purok 2', 'NODE-B1-003', 14.6750000, 120.5421000, ST_PointFromText('POINT(120.5421000 14.6750000)'), 0, '2026-09-01', 'ACTIVE', 'dev_token_007', NULL),
('NODE-B1-008', 'Household 08 (Navarro Family)',    'Elevated Ridge Zone A, Purok 2',             'Purok 2', 'NODE-B1-004', 14.6754000, 120.5442000, ST_PointFromText('POINT(120.5442000 14.6754000)'), 0, '2026-09-01', 'ACTIVE', 'dev_token_008', NULL),
('NODE-B1-009', 'Household 09 (Elevated Terminal)','Elevated Ridge Zone B Terminal, Purok 2',    'Purok 2', 'NODE-B1-004', 14.6748000, 120.5452000, ST_PointFromText('POINT(120.5452000 14.6748000)'), 0, '2026-09-01', 'ACTIVE', 'dev_token_009', NULL)
ON DUPLICATE KEY UPDATE `household_label` = VALUES(`household_label`);

-- -----------------------------------------------------------------------------
-- 3. Table 3.1: USER_ACCOUNT (3-Tier RBAC Demo Accounts)
-- -----------------------------------------------------------------------------
INSERT INTO `user_account` 
(`user_id`, `first_name`, `middle_name`, `last_name`, `email`, `password_hash`, `phone_number`, `emergency_contact`, `role`, `assigned_node_id`, `is_active`, `approval_status`, `email_verified_at`, `phone_verified_at`, `terms_accepted_at`) 
VALUES
(1, 'System', 'Admin', 'Officer', 'admin@bawasa.gov.ph', '$2y$10$TKh8H1.PfQx37YgCzwiKb.KjNyWgaHb9cbcoQgdIVFlYg7B77UdFm', '+639170000001', 'BAWASA Emergency Line', 'admin', NULL, 1, 'APPROVED', NOW(), NOW(), NOW()),
(2, 'Juan', 'Santos', 'Plumber', 'technician@bawasa.gov.ph', '$2y$10$TKh8H1.PfQx37YgCzwiKb.KjNyWgaHb9cbcoQgdIVFlYg7B77UdFm', '+639170000002', 'BAWASA Dispatch Hub', 'technician', NULL, 1, 'APPROVED', NOW(), NOW(), NOW()),
(3, 'Maria', 'Dela', 'Cruz', 'resident1@gmail.com', '$2y$10$TKh8H1.PfQx37YgCzwiKb.KjNyWgaHb9cbcoQgdIVFlYg7B77UdFm', '+639170000003', 'Barangay Office', 'resident', 'NODE-B1-001', 1, 'APPROVED', NOW(), NOW(), NOW()),
(4, 'Pedro', 'Mendoza', 'Santos', 'santos.family@gmail.com', '$2y$10$TKh8H1.PfQx37YgCzwiKb.KjNyWgaHb9cbcoQgdIVFlYg7B77UdFm', '+639170000004', 'Barangay Office', 'resident', 'NODE-B1-002', 1, 'APPROVED', NOW(), NOW(), NOW()),
(5, 'Ana', 'Reyes', 'Bautista', 'reyes.family@gmail.com', '$2y$10$TKh8H1.PfQx37YgCzwiKb.KjNyWgaHb9cbcoQgdIVFlYg7B77UdFm', '+639170000005', 'Barangay Office', 'resident', 'NODE-B1-003', 1, 'APPROVED', NOW(), NOW(), NOW())
ON DUPLICATE KEY UPDATE `email` = VALUES(`email`);

-- -----------------------------------------------------------------------------
-- 4. Table 3.2: PASSWORD_RESET (Demo Expired Reset Token)
-- -----------------------------------------------------------------------------
INSERT INTO `password_reset` (`reset_id`, `user_id`, `reset_token`, `ip_address`, `is_used`, `expires_at`, `created_at`) VALUES
(1, 3, 'f8a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2', '127.0.0.1', 1, NOW() - INTERVAL 1 HOUR, NOW() - INTERVAL 2 HOUR)
ON DUPLICATE KEY UPDATE `is_used` = VALUES(`is_used`);

-- -----------------------------------------------------------------------------
-- 5. Table 3.3: USER_SESSIONS (Demo Active Sessions)
-- -----------------------------------------------------------------------------
INSERT INTO `user_sessions` (`session_id`, `user_id`, `refresh_token`, `ip_address`, `user_agent`, `expires_at`, `created_at`) VALUES
(1, 1, 'demo_admin_refresh_token_777', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', NOW() + INTERVAL 30 DAY, NOW()),
(2, 2, 'demo_tech_refresh_token_888', '127.0.0.1', 'AQUILA Mobile Dispatch Android App', NOW() + INTERVAL 30 DAY, NOW())
ON DUPLICATE KEY UPDATE `expires_at` = VALUES(`expires_at`);

-- -----------------------------------------------------------------------------
-- 6. Table 3.4: VERIFICATION_CODES (Demo Verification Record)
-- -----------------------------------------------------------------------------
INSERT INTO `verification_codes` (`id`, `user_id`, `channel`, `target`, `code`, `expires_at`, `created_at`) VALUES
(1, 3, 'email', 'resident1@gmail.com', '482910', NOW() + INTERVAL 10 MINUTE, NOW())
ON DUPLICATE KEY UPDATE `code` = VALUES(`code`);

-- -----------------------------------------------------------------------------
-- 7. Table 3.5: HOUSEHOLD_PROFILE (Baseline Fingerprints)
-- -----------------------------------------------------------------------------
INSERT INTO `household_profile` (`node_id`, `expected_night_flow_lpm`, `typical_max_duration_mins`, `mean_daily_volume_liters`) VALUES
('NODE-B1-001', 0.02, 12.0, 310.00),
('NODE-B1-002', 0.05, 15.0, 420.00),
('NODE-B1-003', 0.01, 10.0, 290.00),
('NODE-B1-004', 0.03, 18.0, 380.00),
('NODE-B1-005', 0.02, 14.0, 340.00),
('NODE-B1-006', 0.04, 16.0, 410.00),
('NODE-B1-007', 0.01, 12.0, 300.00),
('NODE-B1-008', 0.02, 15.0, 350.00),
('NODE-B1-009', 0.05, 20.0, 450.00)
ON DUPLICATE KEY UPDATE `expected_night_flow_lpm` = VALUES(`expected_night_flow_lpm`);

-- -----------------------------------------------------------------------------
-- 8. Table 3.7: PIPELINE_DAG_EDGE (Conduit Topology Tree)
-- -----------------------------------------------------------------------------
INSERT INTO `pipeline_dag_edge` (`upstream_node_id`, `downstream_node_id`, `pipe_diameter_mm`, `pipe_material`, `length_meters`) VALUES
('NODE-B1-001', 'NODE-B1-002', 32.00, 'PVC', 45.50),
('NODE-B1-001', 'NODE-B1-003', 32.00, 'PVC', 62.00),
('NODE-B1-002', 'NODE-B1-004', 25.00, 'PVC', 38.20),
('NODE-B1-002', 'NODE-B1-005', 25.00, 'PVC', 41.00),
('NODE-B1-003', 'NODE-B1-006', 25.00, 'PVC', 55.00),
('NODE-B1-003', 'NODE-B1-007', 25.00, 'PVC', 51.30),
('NODE-B1-004', 'NODE-B1-008', 20.00, 'HDPE', 72.80),
('NODE-B1-004', 'NODE-B1-009', 20.00, 'HDPE', 80.40)
ON DUPLICATE KEY UPDATE `pipe_diameter_mm` = VALUES(`pipe_diameter_mm`);

-- -----------------------------------------------------------------------------
-- 9. Table 3.8: HOURLY_SUMMARY (Past 24 Hours Historical Telemetry)
-- -----------------------------------------------------------------------------
INSERT INTO `hourly_summary` (`node_id`, `hour_timestamp`, `total_volume_liters`, `peak_flow_rate_lpm`, `leak_flag_count`, `cumulative_meter_reading`)
SELECT 
    n.node_id,
    DATE_SUB(NOW(), INTERVAL seq.hr HOUR) as hr_time,
    ROUND(RAND() * 35 + 10, 2) as vol,
    ROUND(RAND() * 4 + 2, 2) as peak,
    0 as flags,
    ROUND(1000 + (RAND() * 500), 2) as meter
FROM `monitoring_node` n
JOIN (
    SELECT 0 AS hr UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION 
    SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION 
    SELECT 10 UNION SELECT 11 UNION SELECT 12 UNION SELECT 13 UNION SELECT 14 UNION 
    SELECT 15 UNION SELECT 16 UNION SELECT 17 UNION SELECT 18 UNION SELECT 19 UNION 
    SELECT 20 UNION SELECT 21 UNION SELECT 22 UNION SELECT 23
) seq
ON TRUE
ON DUPLICATE KEY UPDATE `total_volume_liters` = VALUES(`total_volume_liters`);

-- -----------------------------------------------------------------------------
-- 10. Table 3.11: INCIDENT_TICKET (Demo Work Orders)
-- -----------------------------------------------------------------------------
INSERT INTO `incident_ticket` 
(`incident_id`, `node_id`, `template_id`, `assigned_technician_id`, `status`, `detected_at`, `verified_at`, `pending_verification_since`, `resolved_at`, `repair_notes`) 
VALUES
('33333333-3333-4333-8333-333333333331', 'NODE-B1-001', 1, 2, 'CLOSED_VERIFIED', NOW() - INTERVAL 2 DAY, NOW() - INTERVAL 1 DAY, NULL, NOW() - INTERVAL 1 DAY, '[Technician Notes]: Replaced cracked PVC elbow coupling. Flow verified quiescent.'),
('33333333-3333-4333-8333-333333333332', 'NODE-B1-002', 1, 2, 'DISPATCHED', NOW() - INTERVAL 2 HOUR, NULL, NULL, NULL, '[Automated Directive]: High-velocity pipe rupture detected.'),
('33333333-3333-4333-8333-333333333333', 'NODE-B1-008', 6, NULL, 'OPEN', NOW() - INTERVAL 30 MINUTE, NULL, NULL, NULL, '[Automated Recommendation]: Terminal line receiving significantly less water than neighbors.')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);

-- -----------------------------------------------------------------------------
-- 11. Table 3.10: INCIDENT_STATUS_HISTORY (State Machine Progression Audit)
-- -----------------------------------------------------------------------------
INSERT INTO `incident_status_history` (`history_id`, `incident_id`, `previous_status`, `new_status`, `changed_by_user_id`, `notes`, `created_at`) VALUES
(1, '33333333-3333-4333-8333-333333333331', NULL, 'OPEN', 1, 'Automated detection: High-Velocity Laminar Pipe Burst', NOW() - INTERVAL 2 DAY),
(2, '33333333-3333-4333-8333-333333333331', 'OPEN', 'DISPATCHED', 1, 'Dispatched to Juan Plumber', NOW() - INTERVAL 36 HOUR),
(3, '33333333-3333-4333-8333-333333333331', 'DISPATCHED', 'PENDING_VERIFICATION', 2, 'Clamped PVC coupling', NOW() - INTERVAL 25 HOUR),
(4, '33333333-3333-4333-8333-333333333331', 'PENDING_VERIFICATION', 'CLOSED_VERIFIED', 1, 'Auto-verified quiescent flow for 15 minutes', NOW() - INTERVAL 1 DAY),
(5, '33333333-3333-4333-8333-333333333332', NULL, 'OPEN', 1, 'Automated detection: Sudden Pipe Rupture', NOW() - INTERVAL 2 HOUR),
(6, '33333333-3333-4333-8333-333333333332', 'OPEN', 'DISPATCHED', 1, 'Dispatched to Juan Plumber', NOW() - INTERVAL 1 HOUR),
(7, '33333333-3333-4333-8333-333333333333', NULL, 'OPEN', 1, 'Automated detection: Rawlsian Relative Deprivation Deficit', NOW() - INTERVAL 30 MINUTE)
ON DUPLICATE KEY UPDATE `notes` = VALUES(`notes`);

-- -----------------------------------------------------------------------------
-- 12. Table 3.12: AUDIT_LOG_ENTRY (Legal System Action Ledger)
-- -----------------------------------------------------------------------------
INSERT INTO `audit_log_entry` (`log_id`, `incident_id`, `performed_by`, `action_taken`, `client_ip`, `remarks`, `logged_at`) VALUES
(1, NULL, 1, 'SYSTEM_BOOT', '127.0.0.1', 'AQUILA Governance Core initialized.', NOW() - INTERVAL 3 DAY),
(2, '33333333-3333-4333-8333-333333333331', 1, 'TICKET_DISPATCHED', '127.0.0.1', 'Dispatched technician ID 2 to NODE-B1-001', NOW() - INTERVAL 36 HOUR),
(3, '33333333-3333-4333-8333-333333333331', 2, 'REPAIR_SUBMITTED', '127.0.0.1', 'Replaced cracked PVC elbow coupling.', NOW() - INTERVAL 25 HOUR),
(4, '33333333-3333-4333-8333-333333333331', 1, 'REPAIR_CLOSED_VERIFIED', '127.0.0.1', 'Quiescent flow verified for 900 seconds.', NOW() - INTERVAL 1 DAY)
ON DUPLICATE KEY UPDATE `action_taken` = VALUES(`action_taken`);

-- -----------------------------------------------------------------------------
-- 13. Table 3.13: SYSTEM_NOTIFICATION (Web & SMS Alerts)
-- -----------------------------------------------------------------------------
INSERT INTO `system_notification` (`notification_id`, `user_id`, `incident_id`, `channel`, `notification_type`, `title`, `message`, `is_read`, `sms_status`, `created_at`) VALUES
(1, 1, '33333333-3333-4333-8333-333333333332', 'IN_APP', 'CRITICAL_BURST_ALERT', 'CRITICAL BURST: Meter NODE-B1-002', 'High-velocity pipe rupture detected on meter NODE-B1-002.', 0, 'NOT_APPLICABLE', NOW() - INTERVAL 2 HOUR),
(2, 2, '33333333-3333-4333-8333-333333333332', 'IN_APP', 'WORK_ORDER_DISPATCHED', 'WORK ORDER DISPATCHED: NODE-B1-002', 'You have been assigned to repair work order on node NODE-B1-002.', 0, 'NOT_APPLICABLE', NOW() - INTERVAL 1 HOUR),
(3, 2, '33333333-3333-4333-8333-333333333332', 'SMS', 'WORK_ORDER_DISPATCHED', '[SMS] WORK ORDER DISPATCHED: NODE-B1-002', 'You have been assigned to repair work order on node NODE-B1-002.', 0, 'SENT', NOW() - INTERVAL 1 HOUR)
ON DUPLICATE KEY UPDATE `title` = VALUES(`title`);

SET FOREIGN_KEY_CHECKS = 1;
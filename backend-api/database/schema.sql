-- =============================================================================
-- AQUILA SYSTEM: COMPLETE 13-TABLE RELATIONAL SCHEMA & VIEWS (CHAPTER III)
-- =============================================================================

SET FOREIGN_KEY_CHECKS = 0;
DROP VIEW IF EXISTS `v_node_profile_overview`;
DROP VIEW IF EXISTS `v_community_daily_kpis`;
DROP VIEW IF EXISTS `v_active_incident_queue`;

DROP TABLE IF EXISTS `system_notification`;
DROP TABLE IF EXISTS `audit_log_entry`;
DROP TABLE IF EXISTS `incident_status_history`;
DROP TABLE IF EXISTS `incident_ticket`;
DROP TABLE IF EXISTS `action_card_templates`;
DROP TABLE IF EXISTS `hourly_summary`;
DROP TABLE IF EXISTS `pipeline_dag_edge`;
DROP TABLE IF EXISTS `household_profile`;
DROP TABLE IF EXISTS `monitoring_node`;
DROP TABLE IF EXISTS `verification_codes`;
DROP TABLE IF EXISTS `user_sessions`;
DROP TABLE IF EXISTS `password_reset`;
DROP TABLE IF EXISTS `user_account`;
SET FOREIGN_KEY_CHECKS = 1;

-- -----------------------------------------------------------------------------
-- 1. Table 3.6: MONITORING_NODE
-- -----------------------------------------------------------------------------
CREATE TABLE `monitoring_node` (
    `node_id` VARCHAR(20) NOT NULL PRIMARY KEY COMMENT 'Canonical ID (e.g. NODE-B1-001)',
    `household_label` VARCHAR(100) NOT NULL COMMENT 'Household identifier',
    `location_name` VARCHAR(255) NOT NULL COMMENT 'Physical street address / landmark',
    `purok_cluster` VARCHAR(50) NOT NULL DEFAULT 'Purok 2' COMMENT 'Municipal zone cluster',
    `parent_node_id` VARCHAR(20) NULL DEFAULT NULL,
    `latitude` DECIMAL(10, 7) NULL DEFAULT NULL,
    `longitude` DECIMAL(10, 7) NULL DEFAULT NULL,
    `coordinates` POINT NULL DEFAULT NULL,
    `is_physical` TINYINT(1) UNSIGNED NOT NULL DEFAULT 0 COMMENT '1=Physical ESP32, 0=Simulated',
    `installation_date` DATE NOT NULL,
    `status` ENUM('ACTIVE', 'INACTIVE', 'MAINTENANCE', 'FAULT', 'DECOMMISSIONED') NOT NULL DEFAULT 'ACTIVE' COMMENT 'Lifecycle state',
    `device_token` VARCHAR(64) NULL DEFAULT NULL,
    `meter_claim_key_hash` VARCHAR(64) NULL DEFAULT NULL,
    `claim_failed_attempts` TINYINT(1) UNSIGNED NOT NULL DEFAULT 0,
    `claim_locked_until` DATETIME NULL DEFAULT NULL,
    `last_heartbeat` DATETIME NULL DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_node_parent` FOREIGN KEY (`parent_node_id`) REFERENCES `monitoring_node`(`node_id`) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX `idx_node_status` (`status`),
    INDEX `idx_node_parent` (`parent_node_id`),
    INDEX `idx_node_cluster` (`purok_cluster`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 2. Table 3.1: USER_ACCOUNT
-- -----------------------------------------------------------------------------
CREATE TABLE `user_account` (
    `user_id` INT(10) UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `first_name` VARCHAR(50) NOT NULL,
    `middle_name` VARCHAR(50) NULL DEFAULT NULL,
    `last_name` VARCHAR(50) NOT NULL,
    `full_name` VARCHAR(155) GENERATED ALWAYS AS (
        TRIM(CONCAT(`first_name`, ' ', COALESCE(CONCAT(`middle_name`, ' '), ''), `last_name`))
    ) STORED,
    `email` VARCHAR(100) NOT NULL UNIQUE,
    `email_verified_at` DATETIME NULL DEFAULT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `phone_number` VARCHAR(30) NULL UNIQUE,
    `phone_verified_at` DATETIME NULL DEFAULT NULL,
    `emergency_contact` VARCHAR(150) NULL DEFAULT NULL,
    `role` ENUM('admin', 'technician', 'resident') NOT NULL DEFAULT 'resident',
    `terms_accepted_at` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
    `assigned_node_id` VARCHAR(20) NULL DEFAULT NULL,
    `is_active` TINYINT(1) UNSIGNED NOT NULL DEFAULT 1,
    `approval_status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'APPROVED',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_user_assigned_node` FOREIGN KEY (`assigned_node_id`) REFERENCES `monitoring_node`(`node_id`) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX `idx_user_role` (`role`),
    INDEX `idx_user_fullname` (`full_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 3. Table 3.2: PASSWORD_RESET
-- -----------------------------------------------------------------------------
CREATE TABLE `password_reset` (
    `reset_id` BIGINT(20) UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT(10) UNSIGNED NOT NULL,
    `reset_token` VARCHAR(255) NOT NULL,
    `ip_address` VARCHAR(45) NOT NULL,
    `is_used` TINYINT(1) UNSIGNED NOT NULL DEFAULT 0,
    `expires_at` DATETIME NOT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_reset_user` FOREIGN KEY (`user_id`) REFERENCES `user_account`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX `idx_reset_token` (`reset_token`),
    INDEX `idx_reset_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 4. Table 3.3: USER_SESSIONS
-- -----------------------------------------------------------------------------
CREATE TABLE `user_sessions` (
    `session_id` BIGINT(20) UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT(10) UNSIGNED NOT NULL,
    `refresh_token` VARCHAR(255) NOT NULL UNIQUE,
    `ip_address` VARCHAR(45) NOT NULL,
    `user_agent` VARCHAR(255) NULL DEFAULT NULL,
    `expires_at` DATETIME NOT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_session_user` FOREIGN KEY (`user_id`) REFERENCES `user_account`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX `idx_session_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 5. Table 3.4: VERIFICATION_CODES
-- -----------------------------------------------------------------------------
CREATE TABLE `verification_codes` (
    `id` BIGINT(20) UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT(10) UNSIGNED NOT NULL,
    `channel` ENUM('email', 'whatsapp', 'sms') NOT NULL,
    `target` VARCHAR(100) NOT NULL,
    `code` VARCHAR(64) NOT NULL,
    `expires_at` DATETIME NOT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_verif_user` FOREIGN KEY (`user_id`) REFERENCES `user_account`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX `idx_user_channel_expires` (`user_id`, `channel`, `expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 6. Table 3.5: HOUSEHOLD_PROFILE
-- -----------------------------------------------------------------------------
CREATE TABLE `household_profile` (
    `profile_id` INT(10) UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `node_id` VARCHAR(20) NOT NULL UNIQUE,
    `expected_night_flow_lpm` DECIMAL(5, 2) UNSIGNED NOT NULL DEFAULT 0.00,
    `typical_max_duration_mins` DECIMAL(6, 2) UNSIGNED NOT NULL DEFAULT 15.00,
    `mean_daily_volume_liters` DECIMAL(10, 2) UNSIGNED NOT NULL DEFAULT 350.00,
    `last_profiled_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_profile_node` FOREIGN KEY (`node_id`) REFERENCES `monitoring_node`(`node_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 7. Table 3.7: PIPELINE_DAG_EDGE
-- -----------------------------------------------------------------------------
CREATE TABLE `pipeline_dag_edge` (
    `edge_id` INT(10) UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `upstream_node_id` VARCHAR(20) NOT NULL,
    `downstream_node_id` VARCHAR(20) NOT NULL,
    `pipe_diameter_mm` DECIMAL(6, 2) UNSIGNED NOT NULL DEFAULT 25.00,
    `pipe_material` VARCHAR(30) NOT NULL DEFAULT 'PVC',
    `length_meters` DECIMAL(8, 2) UNSIGNED NULL DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_dag_upstream` FOREIGN KEY (`upstream_node_id`) REFERENCES `monitoring_node`(`node_id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_dag_downstream` FOREIGN KEY (`downstream_node_id`) REFERENCES `monitoring_node`(`node_id`) ON DELETE CASCADE ON UPDATE CASCADE,
    UNIQUE KEY `uk_dag_edge` (`upstream_node_id`, `downstream_node_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 8. Table 3.8: HOURLY_SUMMARY
-- -----------------------------------------------------------------------------
CREATE TABLE `hourly_summary` (
    `summary_id` BIGINT(20) UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `node_id` VARCHAR(20) NOT NULL,
    `hour_timestamp` DATETIME NOT NULL,
    `total_volume_liters` DECIMAL(10, 2) UNSIGNED NOT NULL DEFAULT 0.00,
    `peak_flow_rate_lpm` DECIMAL(5, 2) UNSIGNED NOT NULL DEFAULT 0.00,
    `leak_flag_count` INT(10) UNSIGNED NOT NULL DEFAULT 0,
    `cumulative_meter_reading` DECIMAL(12, 2) UNSIGNED NOT NULL DEFAULT 0.00,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_summary_node` FOREIGN KEY (`node_id`) REFERENCES `monitoring_node`(`node_id`) ON DELETE CASCADE ON UPDATE CASCADE,
    UNIQUE KEY `uk_node_hour` (`node_id`, `hour_timestamp`),
    INDEX `idx_timestamp` (`hour_timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 9. Table 3.9: ACTION_CARD_TEMPLATES
-- -----------------------------------------------------------------------------
CREATE TABLE `action_card_templates` (
    `template_id` INT(10) UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `incident_type` ENUM('CRITICAL_LEAK', 'FAIRNESS_DEFICIT', 'SUSPICIOUS_USAGE') NOT NULL,
    `severity_level` ENUM('P1', 'P2', 'P3') NOT NULL,
    `academic_classification` VARCHAR(50) NOT NULL DEFAULT 'HIGH_VELOCITY_BURST',
    `academic_term` VARCHAR(100) NOT NULL DEFAULT 'High-Velocity Laminar Pipe Burst',
    `display_name` VARCHAR(100) NOT NULL DEFAULT 'Sudden Pipe Rupture',
    `action_card_title` VARCHAR(100) NULL DEFAULT NULL,
    `action_directive` TEXT NULL DEFAULT NULL,
    UNIQUE KEY `uk_template_taxonomy` (`incident_type`, `severity_level`, `academic_classification`),
    INDEX `idx_type_severity` (`incident_type`, `severity_level`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 10. Table 3.11: INCIDENT_TICKET
-- -----------------------------------------------------------------------------
CREATE TABLE `incident_ticket` (
    `incident_id` VARCHAR(36) NOT NULL PRIMARY KEY,
    `node_id` VARCHAR(20) NOT NULL,
    `template_id` INT(10) UNSIGNED NOT NULL DEFAULT 1,
    `assigned_technician_id` INT(10) UNSIGNED NULL DEFAULT NULL,
    `status` ENUM('OPEN', 'DISPATCHED', 'PENDING_VERIFICATION', 'CLOSED_VERIFIED', 'REPAIR_FAILED', 'CANCELLED') NOT NULL DEFAULT 'OPEN',
    `detected_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `verified_at` DATETIME NULL DEFAULT NULL,
    `pending_verification_since` DATETIME NULL DEFAULT NULL,
    `resolved_at` DATETIME NULL DEFAULT NULL,
    `repair_notes` TEXT NULL DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_ticket_node` FOREIGN KEY (`node_id`) REFERENCES `monitoring_node`(`node_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `fk_ticket_template` FOREIGN KEY (`template_id`) REFERENCES `action_card_templates`(`template_id`) ON UPDATE CASCADE,
    CONSTRAINT `fk_ticket_tech` FOREIGN KEY (`assigned_technician_id`) REFERENCES `user_account`(`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX `idx_status_node` (`status`, `node_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 11. Table 3.10: INCIDENT_STATUS_HISTORY
-- -----------------------------------------------------------------------------
CREATE TABLE `incident_status_history` (
    `history_id` BIGINT(20) UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `incident_id` VARCHAR(36) NOT NULL,
    `previous_status` VARCHAR(30) NULL DEFAULT NULL,
    `new_status` VARCHAR(30) NOT NULL,
    `changed_by_user_id` INT(10) UNSIGNED NULL DEFAULT NULL,
    `notes` TEXT NULL DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_history_ticket` FOREIGN KEY (`incident_id`) REFERENCES `incident_ticket`(`incident_id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_history_user` FOREIGN KEY (`changed_by_user_id`) REFERENCES `user_account`(`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX `idx_incident_history` (`incident_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 12. Table 3.12: AUDIT_LOG_ENTRY & INV-06 Database Triggers
-- -----------------------------------------------------------------------------
CREATE TABLE `audit_log_entry` (
    `log_id` BIGINT(20) UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `incident_id` VARCHAR(36) NULL DEFAULT NULL,
    `performed_by` INT(10) UNSIGNED NOT NULL,
    `action_taken` VARCHAR(50) NOT NULL,
    `client_ip` VARCHAR(45) NOT NULL,
    `remarks` TEXT NULL DEFAULT NULL,
    `logged_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_audit_incident` FOREIGN KEY (`incident_id`) REFERENCES `incident_ticket`(`incident_id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `fk_audit_user` FOREIGN KEY (`performed_by`) REFERENCES `user_account`(`user_id`) ON UPDATE CASCADE,
    INDEX `idx_performed_by` (`performed_by`),
    INDEX `idx_logged_at` (`logged_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TRIGGER IF EXISTS `trg_audit_prevent_update`;
CREATE TRIGGER `trg_audit_prevent_update`
BEFORE UPDATE ON `audit_log_entry`
FOR EACH ROW
BEGIN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INV-06 Violation: AUDIT LOG ENTRIES ARE STRICTLY IMMUTABLE AND CANNOT BE UPDATED';
END;

DROP TRIGGER IF EXISTS `trg_audit_prevent_delete`;
CREATE TRIGGER `trg_audit_prevent_delete`
BEFORE DELETE ON `audit_log_entry`
FOR EACH ROW
BEGIN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INV-06 Violation: AUDIT LOG ENTRIES CANNOT BE DELETED UNDER INV-06';
END;

-- -----------------------------------------------------------------------------
-- 13. Table 3.13: SYSTEM_NOTIFICATION
-- -----------------------------------------------------------------------------
CREATE TABLE `system_notification` (
    `notification_id` BIGINT(20) UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT(10) UNSIGNED NOT NULL,
    `incident_id` VARCHAR(36) NULL DEFAULT NULL,
    `channel` ENUM('IN_APP', 'SMS') NOT NULL DEFAULT 'IN_APP',
    `notification_type` ENUM('CRITICAL_BURST_ALERT', 'WORK_ORDER_DISPATCHED', 'REPAIR_FAILED_ALERT', 'SENSOR_FAULT_ALERT', 'EQUITY_DEFICIT_ALERT', 'SYSTEM_UPDATE') NOT NULL,
    `title` VARCHAR(150) NOT NULL,
    `message` TEXT NOT NULL,
    `is_read` TINYINT(1) UNSIGNED NOT NULL DEFAULT 0,
    `sms_status` ENUM('NOT_APPLICABLE', 'PENDING', 'SENT', 'FAILED') NOT NULL DEFAULT 'NOT_APPLICABLE',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `read_at` DATETIME NULL DEFAULT NULL,
    CONSTRAINT `fk_notif_user` FOREIGN KEY (`user_id`) REFERENCES `user_account`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_notif_incident` FOREIGN KEY (`incident_id`) REFERENCES `incident_ticket`(`incident_id`) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX `idx_user_read` (`user_id`, `is_read`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- CQRS READ VIEWS
-- =============================================================================

CREATE VIEW `v_active_incident_queue` AS 
SELECT 
    `i`.`incident_id` AS `incident_id`, 
    `i`.`node_id` AS `node_id`, 
    `t`.`incident_type` AS `incident_type`, 
    `t`.`severity_level` AS `severity_level`, 
    `t`.`academic_classification` AS `academic_classification`, 
    `t`.`display_name` AS `incident_display_name`, 
    `t`.`action_card_title` AS `action_card_title`, 
    `t`.`action_directive` AS `action_directive`, 
    `i`.`status` AS `status`, 
    `i`.`detected_at` AS `detected_at`, 
    `i`.`pending_verification_since` AS `pending_verification_since`, 
    timestampdiff(MINUTE,`i`.`detected_at`,current_timestamp()) AS `open_duration_minutes`, 
    `n`.`household_label` AS `household_label`, 
    `n`.`location_name` AS `location_name`, 
    `n`.`purok_cluster` AS `purok_cluster`, 
    `n`.`latitude` AS `latitude`, 
    `n`.`longitude` AS `longitude`, 
    `u`.`full_name` AS `assigned_technician_name`, 
    `u`.`phone_number` AS `technician_phone` 
FROM (((`incident_ticket` `i` 
    join `action_card_templates` `t` on(`i`.`template_id` = `t`.`template_id`)) 
    join `monitoring_node` `n` on(`i`.`node_id` = `n`.`node_id`)) 
    left join `user_account` `u` on(`i`.`assigned_technician_id` = `u`.`user_id`)) 
WHERE `i`.`status` in ('OPEN','DISPATCHED','PENDING_VERIFICATION');

CREATE VIEW `v_community_daily_kpis` AS 
SELECT 
    cast(`hourly_summary`.`hour_timestamp` as date) AS `summary_date`, 
    count(distinct `hourly_summary`.`node_id`) AS `active_nodes_count`, 
    sum(`hourly_summary`.`total_volume_liters`) AS `total_daily_liters`, 
    round(sum(`hourly_summary`.`total_volume_liters`) / 1000, 3) AS `total_daily_cubic_meters`, 
    avg(`hourly_summary`.`peak_flow_rate_lpm`) AS `average_peak_flow_lpm`, 
    sum(`hourly_summary`.`leak_flag_count`) AS `total_leak_flags` 
FROM `hourly_summary` 
GROUP BY cast(`hourly_summary`.`hour_timestamp` as date);

CREATE VIEW `v_node_profile_overview` AS 
SELECT 
    `n`.`node_id` AS `node_id`, 
    `n`.`household_label` AS `household_label`, 
    `n`.`location_name` AS `location_name`, 
    `n`.`purok_cluster` AS `purok_cluster`, 
    `n`.`parent_node_id` AS `parent_node_id`, 
    `n`.`status` AS `status`, 
    `n`.`is_physical` AS `is_physical`, 
    `p`.`expected_night_flow_lpm` AS `expected_night_flow_lpm`, 
    `p`.`typical_max_duration_mins` AS `typical_max_duration_mins`, 
    `p`.`mean_daily_volume_liters` AS `mean_daily_volume_liters`, 
    `p`.`last_profiled_at` AS `last_profiled_at` 
FROM (`monitoring_node` `n` 
    left join `household_profile` `p` on(`n`.`node_id` = `p`.`node_id`));
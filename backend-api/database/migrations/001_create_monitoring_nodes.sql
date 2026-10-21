-- =============================================================================
-- Migration 001: Create monitoring_node (Chapter III, Table 3.6)
-- Root entity for ESP32 Physical Testbed and Simulated Community Water Meters
-- =============================================================================

CREATE TABLE IF NOT EXISTS `monitoring_node` (
    `node_id` VARCHAR(20) NOT NULL,
    `household_label` VARCHAR(100) NOT NULL,
    `location_name` VARCHAR(255) NOT NULL,
    `purok_cluster` VARCHAR(50) NOT NULL DEFAULT 'Purok 2',
    `parent_node_id` VARCHAR(20) NULL DEFAULT NULL,
    `latitude` DECIMAL(10, 7) NULL DEFAULT NULL,
    `longitude` DECIMAL(10, 7) NULL DEFAULT NULL,
    `coordinates` POINT NULL DEFAULT NULL,
    `is_physical` TINYINT(1) NOT NULL DEFAULT 0,
    `installation_date` DATE NOT NULL,
    `status` ENUM('ACTIVE', 'FAULT', 'DECOMMISSIONED', 'MAINTENANCE') NOT NULL DEFAULT 'ACTIVE',
    `device_token` VARCHAR(64) NULL DEFAULT NULL,
    `last_heartbeat` DATETIME NULL DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (`node_id`),
    CONSTRAINT `fk_monitoring_node_parent` 
        FOREIGN KEY (`parent_node_id`) 
        REFERENCES `monitoring_node` (`node_id`) 
        ON DELETE SET NULL 
        ON UPDATE CASCADE,
    INDEX `idx_node_status` (`status`),
    INDEX `idx_node_parent` (`parent_node_id`),
    INDEX `idx_node_purok` (`purok_cluster`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
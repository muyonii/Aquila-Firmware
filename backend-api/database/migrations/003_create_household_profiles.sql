-- =============================================================================
-- Migration 003: Create household_profile (Chapter III, Table 3.5)
-- Micro-DMA Behavioral Fingerprint & Calibrated Baseline Thresholds
-- =============================================================================

CREATE TABLE IF NOT EXISTS `household_profile` (
    `profile_id` INT(10) UNSIGNED AUTO_INCREMENT,
    `node_id` VARCHAR(20) NOT NULL,
    `expected_night_flow_lpm` DECIMAL(5, 2) UNSIGNED NOT NULL DEFAULT 0.00,
    `typical_max_duration_mins` DECIMAL(6, 2) UNSIGNED NOT NULL DEFAULT 15.00,
    `mean_daily_volume_liters` DECIMAL(10, 2) UNSIGNED NOT NULL DEFAULT 350.00,
    `last_profiled_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`profile_id`),
    CONSTRAINT `uk_household_profile_node` UNIQUE (`node_id`),
    CONSTRAINT `fk_profile_monitoring_node` 
        FOREIGN KEY (`node_id`) 
        REFERENCES `monitoring_node` (`node_id`) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,
    INDEX `idx_profile_night_flow` (`expected_night_flow_lpm`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
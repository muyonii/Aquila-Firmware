-- =============================================================================
-- Migration 005: Create hourly_summary (Chapter III, Table 3.8)
-- CQRS Historical Reporting Archive & Consumption Data Warehousing Layer
-- =============================================================================

CREATE TABLE IF NOT EXISTS `hourly_summary` (
    `summary_id` BIGINT(20) UNSIGNED AUTO_INCREMENT,
    `node_id` VARCHAR(20) NOT NULL,
    `hour_timestamp` DATETIME NOT NULL,
    `total_volume_liters` DECIMAL(10, 2) UNSIGNED NOT NULL DEFAULT 0.00,
    `peak_flow_rate_lpm` DECIMAL(5, 2) UNSIGNED NOT NULL DEFAULT 0.00,
    `leak_flag_count` INT(10) UNSIGNED NOT NULL DEFAULT 0,
    `cumulative_meter_reading` DECIMAL(12, 2) UNSIGNED NOT NULL DEFAULT 0.00,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`summary_id`),
    CONSTRAINT `uk_node_hour_compaction` UNIQUE (`node_id`, `hour_timestamp`),
    CONSTRAINT `fk_summary_monitoring_node` 
        FOREIGN KEY (`node_id`) 
        REFERENCES `monitoring_node` (`node_id`) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,
    INDEX `idx_summary_timestamp` (`hour_timestamp`),
    INDEX `idx_summary_node_time` (`node_id`, `hour_timestamp` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- =============================================================================
-- Migration 010: Create incident_ticket (Chapter III, Table 3.11)
-- Anomaly Lifecycle Management, Technician Dispatch & Closed-Loop Verification
-- =============================================================================

CREATE TABLE IF NOT EXISTS `incident_ticket` (
    `incident_id` VARCHAR(36) NOT NULL,
    `node_id` VARCHAR(20) NOT NULL,
    `template_id` INT(10) UNSIGNED NOT NULL DEFAULT 1,
    `assigned_technician_id` INT(10) UNSIGNED NULL DEFAULT NULL,
    `status` ENUM(
        'OPEN', 
        'DISPATCHED', 
        'PENDING_VERIFICATION', 
        'CLOSED_VERIFIED', 
        'REPAIR_FAILED', 
        'CANCELLED'
    ) NOT NULL DEFAULT 'OPEN',
    `detected_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `verified_at` DATETIME NULL DEFAULT NULL,
    `pending_verification_since` DATETIME NULL DEFAULT NULL,
    `resolved_at` DATETIME NULL DEFAULT NULL,
    `repair_notes` TEXT NULL DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (`incident_id`),
    CONSTRAINT `fk_ticket_node` 
        FOREIGN KEY (`node_id`) 
        REFERENCES `monitoring_node` (`node_id`) 
        ON DELETE RESTRICT 
        ON UPDATE CASCADE,
    CONSTRAINT `fk_ticket_template` 
        FOREIGN KEY (`template_id`) 
        REFERENCES `action_card_templates` (`template_id`) 
        ON DELETE RESTRICT 
        ON UPDATE CASCADE,
    CONSTRAINT `fk_ticket_technician` 
        FOREIGN KEY (`assigned_technician_id`) 
        REFERENCES `user_account` (`user_id`) 
        ON DELETE SET NULL 
        ON UPDATE CASCADE,
    INDEX `idx_ticket_status` (`status`),
    INDEX `idx_ticket_node` (`node_id`),
    INDEX `idx_ticket_tech` (`assigned_technician_id`),
    INDEX `idx_ticket_detected` (`detected_at` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
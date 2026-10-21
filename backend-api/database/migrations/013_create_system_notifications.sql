-- =============================================================================
-- Migration 013: Create system_notification (Chapter III, Table 3.13)
-- Real-Time Web Alerting, SMS Dispatch Gateways & In-App Read Receipt Tracking
-- =============================================================================

CREATE TABLE IF NOT EXISTS `system_notification` (
    `notification_id` BIGINT(20) UNSIGNED AUTO_INCREMENT,
    `user_id` INT(10) UNSIGNED NOT NULL,
    `incident_id` VARCHAR(36) NULL DEFAULT NULL,
    `channel` ENUM('IN_APP', 'SMS') NOT NULL DEFAULT 'IN_APP',
    `notification_type` ENUM(
        'BURST_ALERT', 
        'DISPATCH_NOTICE', 
        'FAULT_ALARM', 
        'EQUITY_WARNING', 
        'SYSTEM_UPDATE'
    ) NOT NULL,
    `title` VARCHAR(150) NOT NULL,
    `message` TEXT NOT NULL,
    `is_read` TINYINT(1) NOT NULL DEFAULT 0,
    `sms_status` ENUM(
        'NOT_APPLICABLE', 
        'QUEUED', 
        'SENT', 
        'FAILED'
    ) NOT NULL DEFAULT 'NOT_APPLICABLE',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `read_at` DATETIME NULL DEFAULT NULL,

    PRIMARY KEY (`notification_id`),
    CONSTRAINT `fk_notification_user` 
        FOREIGN KEY (`user_id`) 
        REFERENCES `user_account` (`user_id`) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,
    CONSTRAINT `fk_notification_incident` 
        FOREIGN KEY (`incident_id`) 
        REFERENCES `incident_ticket` (`incident_id`) 
        ON DELETE SET NULL 
        ON UPDATE CASCADE,
    INDEX `idx_notif_user_unread` (`user_id`, `is_read`, `created_at` DESC),
    INDEX `idx_notif_incident` (`incident_id`),
    INDEX `idx_notif_sms_queue` (`channel`, `sms_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
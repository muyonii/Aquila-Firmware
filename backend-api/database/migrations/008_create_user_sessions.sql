-- =============================================================================
-- Migration 008: Create user_sessions (Chapter III, Table 3.3)
-- Multi-Device Tracking, Active Session Governance & JWT Refresh Token Layer
-- =============================================================================

CREATE TABLE IF NOT EXISTS `user_sessions` (
    `session_id` BIGINT(20) UNSIGNED AUTO_INCREMENT,
    `user_id` INT(10) UNSIGNED NOT NULL,
    `refresh_token` VARCHAR(255) NOT NULL,
    `ip_address` VARCHAR(45) NOT NULL,
    `user_agent` VARCHAR(255) NULL DEFAULT NULL,
    `expires_at` DATETIME NOT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`session_id`),
    CONSTRAINT `uk_session_refresh_token` UNIQUE (`refresh_token`),
    CONSTRAINT `fk_sessions_user` 
        FOREIGN KEY (`user_id`) 
        REFERENCES `user_account` (`user_id`) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,
    INDEX `idx_sessions_user_lookup` (`user_id`, `expires_at`),
    INDEX `idx_sessions_expiration` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
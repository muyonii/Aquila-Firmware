-- =============================================================================
-- Migration 007: Create password_reset (Chapter III, Table 3.2)
-- Cryptographic Token Invalidation, Credential Recovery & Replay Defense Layer
-- =============================================================================

CREATE TABLE IF NOT EXISTS `password_reset` (
    `reset_id` BIGINT(20) UNSIGNED AUTO_INCREMENT,
    `user_id` INT(10) UNSIGNED NOT NULL,
    `reset_token` VARCHAR(255) NOT NULL,
    `ip_address` VARCHAR(45) NOT NULL,
    `is_used` TINYINT(1) NOT NULL DEFAULT 0,
    `expires_at` DATETIME NOT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`reset_id`),
    CONSTRAINT `fk_password_reset_user` 
        FOREIGN KEY (`user_id`) 
        REFERENCES `user_account` (`user_id`) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,
    INDEX `idx_reset_token` (`reset_token`),
    INDEX `idx_reset_user_lookup` (`user_id`, `is_used`, `expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- =============================================================================
-- Migration 009: Create verification_codes (Chapter III, Table 3.4)
-- Multi-Channel OTP Verification & Contact Channel Proofing Layer
-- =============================================================================

CREATE TABLE IF NOT EXISTS `verification_codes` (
    `id` BIGINT(20) UNSIGNED AUTO_INCREMENT,
    `user_id` INT(10) UNSIGNED NOT NULL,
    `channel` ENUM('email', 'whatsapp', 'sms') NOT NULL,
    `target` VARCHAR(100) NOT NULL,
    `code` VARCHAR(64) NOT NULL,
    `expires_at` DATETIME NOT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    CONSTRAINT `fk_verification_user` 
        FOREIGN KEY (`user_id`) 
        REFERENCES `user_account` (`user_id`) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,
    INDEX `idx_verif_lookup` (`user_id`, `channel`, `expires_at`),
    INDEX `idx_verif_target` (`target`, `code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
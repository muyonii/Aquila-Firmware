-- =============================================================================
-- Migration 006: Create user_account (Chapter III, Table 3.1)
-- 3-Tier RBAC, Contact Verification & Tenant Privacy Layer (RA 10173)
-- =============================================================================

CREATE TABLE IF NOT EXISTS `user_account` (
    `user_id` INT(10) UNSIGNED AUTO_INCREMENT,
    `first_name` VARCHAR(50) NOT NULL,
    `middle_name` VARCHAR(50) NULL DEFAULT NULL,
    `last_name` VARCHAR(50) NOT NULL,
    `full_name` VARCHAR(155) GENERATED ALWAYS AS (
        TRIM(CONCAT(`first_name`, ' ', COALESCE(CONCAT(`middle_name`, ' '), ''), `last_name`))
    ) STORED,
    `email` VARCHAR(100) NOT NULL,
    `email_verified_at` DATETIME NULL DEFAULT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `phone_number` VARCHAR(30) NULL DEFAULT NULL,
    `phone_verified_at` DATETIME NULL DEFAULT NULL,
    `emergency_contact` VARCHAR(150) NULL DEFAULT NULL,
    `role` ENUM('admin', 'technician', 'resident') NOT NULL DEFAULT 'resident',
    `terms_accepted_at` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
    `assigned_node_id` VARCHAR(20) NULL DEFAULT NULL,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (`user_id`),
    CONSTRAINT `uk_user_email` UNIQUE (`email`),
    CONSTRAINT `uk_user_phone` UNIQUE (`phone_number`),
    CONSTRAINT `fk_user_assigned_node` 
        FOREIGN KEY (`assigned_node_id`) 
        REFERENCES `monitoring_node` (`node_id`) 
        ON DELETE SET NULL 
        ON UPDATE CASCADE,
    INDEX `idx_user_role` (`role`),
    INDEX `idx_user_fullname` (`full_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
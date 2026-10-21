-- =============================================================================
-- Migration 012: Create audit_log_entry (Chapter III, Table 3.12)
-- Immutable Append-Only Legal Audit Ledger & INV-06 Database Triggers
-- =============================================================================

CREATE TABLE IF NOT EXISTS `audit_log_entry` (
    `log_id` BIGINT(20) UNSIGNED AUTO_INCREMENT,
    `incident_id` VARCHAR(36) NULL DEFAULT NULL,
    `performed_by` INT(10) UNSIGNED NOT NULL,
    `action_taken` VARCHAR(50) NOT NULL,
    `client_ip` VARCHAR(45) NOT NULL,
    `remarks` TEXT NULL DEFAULT NULL,
    `logged_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`log_id`),
    CONSTRAINT `fk_audit_incident_ticket` 
        FOREIGN KEY (`incident_id`) 
        REFERENCES `incident_ticket` (`incident_id`) 
        ON DELETE SET NULL 
        ON UPDATE CASCADE,
    CONSTRAINT `fk_audit_user_account` 
        FOREIGN KEY (`performed_by`) 
        REFERENCES `user_account` (`user_id`) 
        ON DELETE RESTRICT 
        ON UPDATE CASCADE,
    INDEX `idx_audit_performed_by` (`performed_by`),
    INDEX `idx_audit_incident` (`incident_id`),
    INDEX `idx_audit_timestamp` (`logged_at` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- Database Invariant INV-06: Database Triggers Revoking UPDATE and DELETE
-- =============================================================================

DROP TRIGGER IF EXISTS `trg_audit_prevent_update`;
CREATE TRIGGER `trg_audit_prevent_update`
BEFORE UPDATE ON `audit_log_entry`
FOR EACH ROW
BEGIN
    SIGNAL SQLSTATE '45000' 
    SET MESSAGE_TEXT = 'INV-06 Violation: AUDIT LOG ENTRIES ARE STRICTLY IMMUTABLE AND CANNOT BE UPDATED';
END;

DROP TRIGGER IF EXISTS `trg_audit_prevent_delete`;
CREATE TRIGGER `trg_audit_prevent_delete`
BEFORE DELETE ON `audit_log_entry`
FOR EACH ROW
BEGIN
    SIGNAL SQLSTATE '45000' 
    SET MESSAGE_TEXT = 'INV-06 Violation: AUDIT LOG ENTRIES CANNOT BE DELETED UNDER INV-06';
END;
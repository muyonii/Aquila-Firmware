-- =============================================================================
-- Migration 002: Create action_card_templates (Chapter III, Table 3.9)
-- Predefined DSS Knowledge Base, Action Cards, and Scientific Engineering Nomenclature
-- =============================================================================

CREATE TABLE IF NOT EXISTS `action_card_templates` (
    `template_id` INT(10) UNSIGNED AUTO_INCREMENT,
    `incident_type` ENUM('CRITICAL_LEAK', 'FAIRNESS_DEFICIT', 'SUSPICIOUS_USAGE') NOT NULL,
    `severity_level` ENUM('P1', 'P2', 'P3') NOT NULL,
    `academic_classification` VARCHAR(50) NOT NULL DEFAULT 'HIGH_VELOCITY_BURST',
    `academic_term` VARCHAR(100) NOT NULL,
    `display_name` VARCHAR(100) NOT NULL DEFAULT 'Sudden Pipe Rupture',
    `action_card_title` VARCHAR(100) NULL DEFAULT NULL,
    `action_directive` TEXT NULL DEFAULT NULL,

    PRIMARY KEY (`template_id`),
    UNIQUE KEY `uk_template_taxonomy` (`incident_type`, `severity_level`, `academic_classification`),
    INDEX `idx_template_lookup` (`incident_type`, `severity_level`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
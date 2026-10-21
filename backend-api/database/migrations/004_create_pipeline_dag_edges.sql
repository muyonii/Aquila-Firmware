-- =============================================================================
-- Migration 004: Create pipeline_dag_edge (Chapter III, Table 3.7)
-- Hydraulic Flow Direction & Topological Conduit Graph (DAG)
-- =============================================================================

CREATE TABLE IF NOT EXISTS `pipeline_dag_edge` (
    `edge_id` INT(10) UNSIGNED AUTO_INCREMENT,
    `upstream_node_id` VARCHAR(20) NOT NULL,
    `downstream_node_id` VARCHAR(20) NOT NULL,
    `pipe_diameter_mm` DECIMAL(6, 2) UNSIGNED NOT NULL DEFAULT 25.00,
    `pipe_material` VARCHAR(30) NOT NULL DEFAULT 'PVC',
    `length_meters` DECIMAL(8, 2) UNSIGNED NULL DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`edge_id`),
    CONSTRAINT `uk_dag_conduit_edge` UNIQUE (`upstream_node_id`, `downstream_node_id`),
    CONSTRAINT `fk_edge_upstream_node` 
        FOREIGN KEY (`upstream_node_id`) 
        REFERENCES `monitoring_node` (`node_id`) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,
    CONSTRAINT `fk_edge_downstream_node` 
        FOREIGN KEY (`downstream_node_id`) 
        REFERENCES `monitoring_node` (`node_id`) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,
    INDEX `idx_edge_upstream` (`upstream_node_id`),
    INDEX `idx_edge_downstream` (`downstream_node_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
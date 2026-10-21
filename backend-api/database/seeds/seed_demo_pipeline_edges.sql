-- =============================================================================
-- Seed: Community Hydraulic DAG Topography (Purok 2 Distribution Tree)
-- =============================================================================

INSERT INTO `pipeline_dag_edge` 
(`upstream_node_id`, `downstream_node_id`, `pipe_diameter_mm`, `pipe_material`, `length_meters`) 
VALUES
-- Main Feeders from Central Reservoir (NODE-B1-001, 32mm PVC)
('NODE-B1-001', 'NODE-B1-002', 32.00, 'PVC', 45.50),
('NODE-B1-001', 'NODE-B1-003', 32.00, 'PVC', 62.00),

-- Branch Lines from Secondary Hubs (25mm PVC)
('NODE-B1-002', 'NODE-B1-004', 25.00, 'PVC', 38.20),
('NODE-B1-002', 'NODE-B1-005', 25.00, 'PVC', 41.00),
('NODE-B1-003', 'NODE-B1-006', 25.00, 'PVC', 55.00),
('NODE-B1-003', 'NODE-B1-007', 25.00, 'PVC', 51.30),

-- Terminal Conduits to Elevated Perimeter (20mm HDPE)
('NODE-B1-004', 'NODE-B1-008', 20.00, 'HDPE', 72.80),
('NODE-B1-004', 'NODE-B1-009', 20.00, 'HDPE', 80.40)

ON DUPLICATE KEY UPDATE 
    `pipe_diameter_mm` = VALUES(`pipe_diameter_mm`),
    `pipe_material`    = VALUES(`pipe_material`),
    `length_meters`    = VALUES(`length_meters`);
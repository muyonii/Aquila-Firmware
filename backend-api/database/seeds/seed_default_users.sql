-- =============================================================================
-- Seed: Default 3-Tier Demonstration Users (@gmail.com)
-- Password for all accounts: Password123!
-- Tip: Replace these 3 @gmail.com addresses with your own real Gmail accounts!
-- =============================================================================

INSERT INTO `user_account` 
(`user_id`, `first_name`, `middle_name`, `last_name`, `email`, `password_hash`, `role`, `assigned_node_id`, `is_active`, `approval_status`, `email_verified_at`, `terms_accepted_at`) 
VALUES
(1, 'System', 'Admin', 'Officer', 'aquila.admin@gmail.com', '$2y$10$TKh8H1.PfQx37YgCzwiKb.KjNyWgaHb9cbcoQgdIVFlYg7B77UdFm', 'admin', NULL, 1, 'APPROVED', NOW(), NOW()),
(2, 'Juan', 'Santos', 'Plumber', 'aquila.tech@gmail.com', '$2y$10$TKh8H1.PfQx37YgCzwiKb.KjNyWgaHb9cbcoQgdIVFlYg7B77UdFm', 'technician', NULL, 1, 'APPROVED', NOW(), NOW()),
(3, 'Maria', 'Dela', 'Cruz', 'resident1@gmail.com', '$2y$10$TKh8H1.PfQx37YgCzwiKb.KjNyWgaHb9cbcoQgdIVFlYg7B77UdFm', 'resident', 'NODE-B1-001', 1, 'APPROVED', NOW(), NOW())
ON DUPLICATE KEY UPDATE 
    `email` = VALUES(`email`),
    `approval_status` = VALUES(`approval_status`);
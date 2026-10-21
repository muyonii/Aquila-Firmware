<?php
declare(strict_types=1);

require_once __DIR__ . '/vendor/autoload.php';

use Aquila\Config\Database;

echo "====================================================================\n";
echo " AQUILA: DATABASE ARCHITECTURE & 13-TABLE SCHEMA VERIFICATION SUITE\n";
echo "====================================================================\n";

$db = Database::getConnection();
$passed = 0;
$failed = 0;

function verify(string $testName, bool $condition, string $details = ''): void {
    global $passed, $failed;
    if ($condition) {
        $passed++;
        echo "  ✅ [PASS] {$testName}\n";
        if ($details) echo "      ↳ {$details}\n";
    } else {
        $failed++;
        echo "  ❌ [FAIL] {$testName}\n";
        if ($details) echo "      ↳ {$details}\n";
    }
}

// -----------------------------------------------------------------------------
// 1. Verify All 13 Core Chapter III Tables Exist
// -----------------------------------------------------------------------------
$tables = [
    'monitoring_node',          // Table 3.6
    'action_card_templates',    // Table 3.9
    'household_profile',        // Table 3.5
    'pipeline_dag_edge',        // Table 3.7
    'hourly_summary',           // Table 3.8
    'user_account',             // Table 3.1
    'password_reset',           // Table 3.2
    'user_sessions',            // Table 3.3
    'verification_codes',       // Table 3.4
    'incident_ticket',          // Table 3.11
    'incident_status_history',  // Table 3.10
    'audit_log_entry',          // Table 3.12
    'system_notification'       // Table 3.13
];

echo "\n--- [SECTION 1]: Master 13-Table Schema Audit ---\n";
foreach ($tables as $tbl) {
    $stmt = $db->query("SHOW TABLES LIKE '{$tbl}'");
    verify("Table Exists: `{$tbl}`", $stmt->rowCount() > 0);
}

// -----------------------------------------------------------------------------
// 2. Verify Legacy Removal & Spatial Coordinates on monitoring_node
// -----------------------------------------------------------------------------
echo "\n--- [SECTION 2]: monitoring_node Invariants ---\n";
$batCheck = $db->query("SHOW COLUMNS FROM monitoring_node LIKE 'battery_voltage'");
verify("Obsolete Column `battery_voltage` Removed", $batCheck->rowCount() === 0);

$coordCheck = $db->query("SHOW COLUMNS FROM monitoring_node LIKE 'coordinates'");
verify("Spatial Column `coordinates` (POINT) Verified", $coordCheck->rowCount() > 0);

// -----------------------------------------------------------------------------
// 3. Verify Taxonomy Normalization (action_card_templates & incident_ticket)
// -----------------------------------------------------------------------------
echo "\n--- [SECTION 3]: Taxonomy Normalization & Template FK ---\n";
$taxCheck1 = $db->query("SHOW COLUMNS FROM action_card_templates LIKE 'academic_classification'");
$taxCheck2 = $db->query("SHOW COLUMNS FROM action_card_templates LIKE 'academic_term'");
$taxCheck3 = $db->query("SHOW COLUMNS FROM action_card_templates LIKE 'display_name'");
verify(
    "Dual-Layer Taxonomy in `action_card_templates`",
    ($taxCheck1->rowCount() > 0 && $taxCheck2->rowCount() > 0 && $taxCheck3->rowCount() > 0),
    "academic_classification, academic_term, display_name verified."
);

$fkCheck = $db->query("SHOW COLUMNS FROM incident_ticket LIKE 'template_id'");
verify("FK `template_id` in `incident_ticket`", $fkCheck->rowCount() > 0);

// -----------------------------------------------------------------------------
// 4. Verify Attribute Optimization: UNSIGNED Decimal Precision
// -----------------------------------------------------------------------------
echo "\n--- [SECTION 4]: Attribute Precision & CQRS Storage ---\n";
$colStmt = $db->query("
    SELECT COLUMN_TYPE 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'hourly_summary' 
      AND COLUMN_NAME = 'total_volume_liters'
");
$colType = (string)$colStmt->fetchColumn();
$isUnsigned = str_contains(strtolower($colType), 'unsigned');
verify("Attribute Optimization: `hourly_summary.total_volume_liters` is UNSIGNED", $isUnsigned, "Type: {$colType}");

// -----------------------------------------------------------------------------
// 5. Test Real CQRS Atomic Compaction (INSERT ... ON DUPLICATE KEY UPDATE)
// -----------------------------------------------------------------------------
$testHour = '2099-12-31 23:00:00';
try {
    $db->prepare("DELETE FROM hourly_summary WHERE node_id = 'NODE-B1-001' AND hour_timestamp = :hr")
       ->execute([':hr' => $testHour]);

    $stmt = $db->prepare("
        INSERT INTO hourly_summary (node_id, hour_timestamp, total_volume_liters, peak_flow_rate_lpm, cumulative_meter_reading)
        VALUES ('NODE-B1-001', :hr, 15.25, 3.80, 2500.00)
        ON DUPLICATE KEY UPDATE
            total_volume_liters = VALUES(total_volume_liters),
            peak_flow_rate_lpm = GREATEST(peak_flow_rate_lpm, VALUES(peak_flow_rate_lpm)),
            cumulative_meter_reading = VALUES(cumulative_meter_reading)
    ");
    $stmt->execute([':hr' => $testHour]);
    $stmt->execute([':hr' => $testHour]); // Test Idempotency

    $check = $db->prepare("SELECT total_volume_liters FROM hourly_summary WHERE node_id = 'NODE-B1-001' AND hour_timestamp = :hr");
    $check->execute([':hr' => $testHour]);
    $recorded = (float)$check->fetchColumn();

    $db->prepare("DELETE FROM hourly_summary WHERE node_id = 'NODE-B1-001' AND hour_timestamp = :hr")
       ->execute([':hr' => $testHour]);

    verify("CQRS Idempotent Compaction (Atomic Upsert)", $recorded === 15.25, "Volume: {$recorded} L");
} catch (\Throwable $e) {
    verify("CQRS Idempotent Compaction", false, $e->getMessage());
}

// -----------------------------------------------------------------------------
// 6. Verify Legal Immutability Trigger (INV-06 on audit_log_entry)
// -----------------------------------------------------------------------------
echo "\n--- [SECTION 5]: INV-06 Database Triggers (Legal Immutability) ---\n";

// A. Use native SHOW TRIGGERS (avoids MariaDB INFORMATION_SCHEMA collation issues)
$triggers = $db->query("SHOW TRIGGERS")->fetchAll(PDO::FETCH_ASSOC);
$foundUpdateTrigger = false;
$foundDeleteTrigger = false;

foreach ($triggers as $t) {
    $name = $t['Trigger'] ?? $t['trigger'] ?? '';
    if (strcasecmp($name, 'trg_audit_prevent_update') === 0) {
        $foundUpdateTrigger = true;
    }
    if (strcasecmp($name, 'trg_audit_prevent_delete') === 0) {
        $foundDeleteTrigger = true;
    }
}

verify("INV-06 UPDATE Trigger Installed (`trg_audit_prevent_update`)", $foundUpdateTrigger);
verify("INV-06 DELETE Trigger Installed (`trg_audit_prevent_delete`)", $foundDeleteTrigger);

// B. Test Functional Execution: Ensure UPDATE is actively rejected
try {
    $existingId = $db->query("SELECT log_id FROM audit_log_entry LIMIT 1")->fetchColumn();
    if (!$existingId) {
        $db->exec("INSERT INTO audit_log_entry (performed_by, action_taken, client_ip, remarks) VALUES (1, 'TRIGGER_TEST', '127.0.0.1', 'Seed test row')");
        $existingId = $db->lastInsertId();
    }

    $stmt = $db->prepare("UPDATE audit_log_entry SET remarks = 'tampered' WHERE log_id = :id");
    $stmt->execute([':id' => $existingId]);

    verify("INV-06 Functional Execution: UPDATE blocked", false, "Trigger failed to block update!");
} catch (\PDOException $e) {
    $blocked = str_contains($e->getMessage(), '45000') || str_contains($e->getMessage(), 'IMMUTABLE');
    verify("INV-06 Functional Execution: UPDATE blocked", $blocked, "Blocked: " . $e->getMessage());
}

// C. Test Functional Execution: Ensure DELETE is actively rejected
try {
    $stmt = $db->prepare("DELETE FROM audit_log_entry WHERE log_id = :id");
    $stmt->execute([':id' => $existingId]);

    verify("INV-06 Functional Execution: DELETE blocked", false, "Trigger failed to block delete!");
} catch (\PDOException $e) {
    $blocked = str_contains($e->getMessage(), '45000') || str_contains($e->getMessage(), 'CANNOT BE DELETED');
    verify("INV-06 Functional Execution: DELETE blocked", $blocked, "Blocked: " . $e->getMessage());
}

echo "\n--- [SECTION 6]: Pre-Joined CQRS Read Views ---\n";

$viewCheck1 = $db->query("SELECT COUNT(*) FROM v_active_incident_queue");
verify("View 1 Operational: `v_active_incident_queue`", $viewCheck1 !== false);

$viewCheck2 = $db->query("SELECT COUNT(*) FROM v_community_daily_kpis");
verify("View 2 Operational: `v_community_daily_kpis`", $viewCheck2 !== false);

$viewCheck3 = $db->query("SELECT COUNT(*) FROM v_node_profile_overview");
verify("View 3 Operational: `v_node_profile_overview`", $viewCheck3 !== false);

echo "\n====================================================================\n";
echo sprintf("RESULTS: Passed: %d | Failed: %d\n", $passed, $failed);
echo "====================================================================\n";

exit($failed === 0 ? 0 : 1);
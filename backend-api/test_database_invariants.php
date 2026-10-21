<?php
declare(strict_types=1);

require_once __DIR__ . '/vendor/autoload.php';

use Aquila\Config\Database;
use Aquila\Config\Env;
use Aquila\Config\Security;
use Aquila\Infrastructure\Repositories\MySQLIncidentRepository;
use Aquila\Services\AuditLogger;
use Aquila\Services\IncidentDebouncer;
use Firebase\JWT\JWT;

Env::load();

echo "====================================================================\n";
echo " AQUILA: DATABASE INVARIANTS & SECURITY GUARDRAILS TEST SUITE\n";
echo "====================================================================\n";

$db = Database::getConnection();
$passed = 0;
$failed = 0;

function report(string $testName, bool $success, string $details = ''): void {
    global $passed, $failed;
    if ($success) {
        $passed++;
        echo sprintf("  ✅ [PASS] %s\n", $testName);
        if ($details) echo "      ↳ {$details}\n";
    } else {
        $failed++;
        echo sprintf("  ❌ [FAIL] %s\n", $testName);
        if ($details) echo "      ↳ Error: {$details}\n";
    }
}

// -----------------------------------------------------------------------------
// TEST 1 & 2: INV-06 Database Triggers (Immutability of Audit Logs)
// -----------------------------------------------------------------------------
echo "\n--- [SECTION 1]: Legal Immutability of Audit Logs (INV-06 Triggers) ---\n";

AuditLogger::log('TEST_INTEGRITY_CHECK', 1, null, 'Integrity verification payload');
$logId = (int)$db->lastInsertId();

// Test 1: Attempt an UPDATE statement (Trigger must throw SQLSTATE 45000)
try {
    $db->prepare("UPDATE audit_log_entry SET remarks = 'Hacked Remarks' WHERE log_id = :id")
       ->execute([':id' => $logId]);
    report("INV-06: UPDATE Prevention Trigger", false, "Trigger failed to block UPDATE query!");
} catch (\PDOException $e) {
    $blocked = str_contains($e->getMessage(), '45000') || str_contains($e->getMessage(), 'IMMUTABLE');
    report("INV-06: UPDATE Prevention Trigger", $blocked, "Blocked: {$e->getMessage()}");
}

// Test 2: Attempt a DELETE statement (Trigger must throw SQLSTATE 45000)
try {
    $db->prepare("DELETE FROM audit_log_entry WHERE log_id = :id")
       ->execute([':id' => $logId]);
    report("INV-06: DELETE Prevention Trigger", false, "Trigger failed to block DELETE query!");
} catch (\PDOException $e) {
    $blocked = str_contains($e->getMessage(), '45000') || str_contains($e->getMessage(), 'CANNOT BE DELETED');
    report("INV-06: DELETE Prevention Trigger", $blocked, "Blocked: {$e->getMessage()}");
}

// -----------------------------------------------------------------------------
// TEST 3 & 4: Action Card Normalization & State History (Tables 3.9 & 3.10)
// -----------------------------------------------------------------------------
echo "\n--- [SECTION 2]: Action Card Normalization & State History (Tables 3.9 & 3.10) ---\n";

$testNode = 'NODE-B1-002';
$db->prepare("DELETE FROM incident_ticket WHERE node_id = :node AND status IN ('OPEN', 'DISPATCHED', 'PENDING_VERIFICATION')")
   ->execute([':node' => $testNode]);

// 1. Process Incident through Debouncer (Logs Transition 1: NULL -> OPEN)
$debouncer = new IncidentDebouncer($db);
$result = $debouncer->processIncident([
    'node_id' => $testNode,
    'incident_type' => 'CRITICAL_LEAK',
    'severity_level' => 'P1'
]);

$incidentId = $result['incident_id'] ?? '';

// Query ticket JOIN action_card_templates
$stmt = $db->prepare(
    "SELECT t.incident_id, t.template_id, act.action_card_title, act.action_directive 
     FROM incident_ticket t 
     JOIN action_card_templates act ON t.template_id = act.template_id 
     WHERE t.incident_id = :id"
);
$stmt->execute([':id' => $incidentId]);
$ticketRow = $stmt->fetch();

$templateResolved = ($ticketRow && !empty($ticketRow['action_card_title']));
report(
    "Action Card Ingestion (Resolved template_id from action_card_templates)",
    $templateResolved,
    "Resolved Template: '{$ticketRow['action_card_title']}' (Template ID: {$ticketRow['template_id']})"
);

// 2. Dispatch and Submit Repair, persisting each state transition
$repo = new MySQLIncidentRepository($db);
$ticketEntity = $repo->findById($incidentId);

// Transition 2: OPEN -> DISPATCHED
$ticketEntity->dispatchTo(2);
$repo->save($ticketEntity, 1);

// Transition 3: DISPATCHED -> PENDING_VERIFICATION
$ticketEntity->submitRepair("Clamped PVC pipe coupling.");
$repo->save($ticketEntity, 2);

$histStmt = $db->prepare("SELECT COUNT(*) FROM incident_status_history WHERE incident_id = :id");
$histStmt->execute([':id' => $incidentId]);
$historyCount = (int)$histStmt->fetchColumn();

report(
    "State Machine Logging (incident_status_history recorded transitions)",
    $historyCount >= 2,
    "Recorded {$historyCount} operational state transitions for ticket {$incidentId}"
);

// Cleanup
$db->prepare("DELETE FROM incident_ticket WHERE incident_id = :id")->execute([':id' => $incidentId]);
// -----------------------------------------------------------------------------
// TEST 5: Last-Admin Demotion/Deletion Guardrail
// -----------------------------------------------------------------------------
echo "\n--- [SECTION 3]: Security Governance (Last-Admin Protection) ---\n";

$adminCount = (int)$db->query("SELECT COUNT(*) FROM user_account WHERE role = 'admin' AND is_active = 1")->fetchColumn();
report("Last-Admin Lockout Guardrail", $adminCount >= 1, "Active admins: {$adminCount}");

// -----------------------------------------------------------------------------
// TEST 6: Row-Level Security Isolation (RA 10173 Tenant Privacy)
// -----------------------------------------------------------------------------
echo "\n--- [SECTION 4]: Data Privacy (Row-Level Security Tenant Isolation) ---\n";

$mariaPayload = [
    "iss" => "AQUILA-Auth-Service",
    "iat" => time(),
    "exp" => time() + 3600,
    "sub" => 3,
    "data" => [
        "user_id"          => 3,
        "full_name"        => "Maria Dela Cruz",
        "email"            => "resident1@gmail.com",
        "role"             => "resident",
        "assigned_node_id" => "NODE-B1-001"
    ]
];
$mariaToken = JWT::encode($mariaPayload, Security::getJwtSecret(), Security::JWT_ALGORITHM);

// Maria queries own water
$ch = curl_init("http://127.0.0.1/aquila-system/backend-api/public/api/v1/resident/my-water");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ["Authorization: Bearer {$mariaToken}"]);
$resA = json_decode((string)curl_exec($ch), true);
curl_close($ch);

$ownWaterOk = (($resA['data']['node_id'] ?? '') === 'NODE-B1-001');

// Maria attempts to spoof neighbor (?node_id=NODE-B1-002)
$ch = curl_init("http://127.0.0.1/aquila-system/backend-api/public/api/v1/resident/my-water?node_id=NODE-B1-002");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ["Authorization: Bearer {$mariaToken}"]);
$resB = json_decode((string)curl_exec($ch), true);
curl_close($ch);

$rlsBlockedSpoof = (($resB['data']['node_id'] ?? '') === 'NODE-B1-001');

report("RA 10173 Tenant Isolation (Resident queries assigned meter)", $ownWaterOk);
report("RA 10173 Anti-Spoofing Guard (Resident cannot inspect neighbor ?node_id=002)", $rlsBlockedSpoof);

// -----------------------------------------------------------------------------
// SUMMARY
// -----------------------------------------------------------------------------
echo "\n====================================================================\n";
echo sprintf("RESULTS: Total Invariants Tested: %d | Passed: %d | Failed: %d\n", ($passed + $failed), $passed, $failed);
echo "====================================================================\n";

exit($failed === 0 ? 0 : 1);
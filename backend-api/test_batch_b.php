<?php
declare(strict_types=1);

require_once __DIR__ . '/vendor/autoload.php';

use Aquila\Config\AppConfig;
use Aquila\Config\Database;

echo "===============================================================\n";
echo " AQUILA BATCH B (OPERATIONAL & DECISION SUPPORT) AUDIT\n";
echo "===============================================================\n";

function runTest(string $name, string $url, string $method = 'GET', array $headers = [], ?string $body = null, int $expectedCode = 200): ?array {
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    if ($body !== null) curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
    if (!empty($headers)) curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    
    $res = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    $passed = ($httpCode === $expectedCode);
    $icon = $passed ? "✅ [PASS]" : "❌ [FAIL]";
    echo sprintf("%-12s | HTTP %d (Expected %d) | %s\n", $icon, $httpCode, $expectedCode, $name);
    
    if (!$passed && $res) {
        echo "   ↳ Response: " . substr((string)$res, 0, 150) . "\n";
    }

    return json_decode((string)$res, true);
}

$db = Database::getConnection();
$adminEmail = $db->query("SELECT email FROM user_account WHERE role = 'admin' AND is_active = 1 ORDER BY user_id ASC LIMIT 1")->fetchColumn() ?: 'admin@bawasa.gov.ph';
$techRow    = $db->query("SELECT user_id, email FROM user_account WHERE role = 'technician' AND is_active = 1 ORDER BY user_id ASC LIMIT 1")->fetch();
$techEmail  = $techRow['email'] ?? 'technician@bawasa.gov.ph';
$techId     = (int)($techRow['user_id'] ?? 2);

// 1. Login as Admin
$login = runTest('Admin Login', 'http://127.0.0.1/aquila-system/backend-api/public/api/v1/auth/login', 'POST', ['Content-Type: application/json'], json_encode(['email'=>$adminEmail, 'password'=>'Password123!']));
$adminToken = $login['data']['token'] ?? '';
$authHeader = ['Authorization: Bearer ' . $adminToken, 'Content-Type: application/json'];

// 2. Log Manual Citizen Complaint (POST /api/v1/incidents)
$manual = runTest('Manual Complaint Logging', 'http://127.0.0.1/aquila-system/backend-api/public/api/v1/incidents', 'POST', $authHeader, json_encode([
    'node_id'         => 'NODE-B1-004',
    'incident_type'   => 'CRITICAL_LEAK',
    'severity_level'  => 'P1',
    'complaint_notes' => 'Resident reported surface puddle near meter box.'
]), 201);
$ticketId = $manual['data']['incident_id'] ?? '';

// 3. Inspect Incident Details + State Machine Progression
$details = runTest('Get Incident Details + Status History', "http://127.0.0.1/aquila-system/backend-api/public/api/v1/incidents/{$ticketId}", 'GET', $authHeader);
$historyCount = count($details['data']['status_history'] ?? []);
echo "   ↳ Initial status history transitions logged: {$historyCount}\n";

// 4. Dispatch Technician
runTest('Dispatch Technician', "http://127.0.0.1/aquila-system/backend-api/public/api/v1/incidents/{$ticketId}/dispatch", 'POST', $authHeader, json_encode(['technician_id' => $techId]));

// 5. Submit Repair by Technician (Transitions DISPATCHED -> PENDING_VERIFICATION)
$techLogin = runTest('Technician Login', 'http://127.0.0.1/aquila-system/backend-api/public/api/v1/auth/login', 'POST', ['Content-Type: application/json'], json_encode(['email'=>$techEmail, 'password'=>'Password123!']));
$techToken = $techLogin['data']['token'] ?? '';
$techHeader = ['Authorization: Bearer ' . $techToken, 'Content-Type: application/json'];

// 5a. Technician Arrives On-Site (Sets Node to MAINTENANCE)
runTest('Technician Arrives On-Site (/arrive)', "http://127.0.0.1/aquila-system/backend-api/public/api/v1/tasks/{$ticketId}/arrive", 'PATCH', $techHeader);

// 5b. Technician Submits Repair (Restores Node to ACTIVE & starts 15m timer)
runTest('Technician Submits Repair (/repair)', "http://127.0.0.1/aquila-system/backend-api/public/api/v1/tasks/{$ticketId}/repair", 'PATCH', $techHeader, json_encode([
    'repair_notes' => 'Clamped 1/2-inch service pipe coupling.'
]));

// 6. Test Quiescent Flow Evaluator (Auto-Closes ticket to CLOSED_VERIFIED)
$windowSec = AppConfig::getRepairVerificationSeconds();
runTest('Quiescent Flow Evaluator (Auto-Close)', "http://127.0.0.1/aquila-system/backend-api/public/api/v1/incidents/{$ticketId}/verify-flow", 'POST', $authHeader, json_encode([
    'current_flow_rate_lpm' => 0.02,
    'elapsed_seconds'       => $windowSec
]));

// 7. Verify Final Status Progression Log (Table 3.10)
$finalCheck = runTest('Verify Final Audit Trail', "http://127.0.0.1/aquila-system/backend-api/public/api/v1/incidents/{$ticketId}", 'GET', $authHeader);
$finalHistory = count($finalCheck['data']['status_history'] ?? []);
echo "   ↳ Complete lifecycle transitions in incident_status_history: {$finalHistory} steps\n";

// Cleanup
$db->prepare("DELETE FROM incident_ticket WHERE incident_id = :id")->execute([':id' => $ticketId]);

echo "===============================================================\n";
echo " BATCH B AUDIT COMPLETE\n";
echo "===============================================================\n";
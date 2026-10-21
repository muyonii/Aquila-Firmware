<?php
declare(strict_types=1);

require_once __DIR__ . '/vendor/autoload.php';

use Aquila\Config\Database;

echo "===============================================================\n";
echo " AQUILA BATCH C (REPORTING & ANALYTICS) VERIFICATION SUITE\n";
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

// 1. Login as Admin
$login = runTest('Admin Login', 'http://127.0.0.1/aquila-system/backend-api/public/api/v1/auth/login', 'POST', ['Content-Type: application/json'], json_encode(['email'=>$adminEmail, 'password'=>'Password123!']));
$adminToken = $login['data']['token'] ?? '';
$authHeader = ['Authorization: Bearer ' . $adminToken, 'Content-Type: application/json'];

// 2. Consumption & Distributive Equity Report (Table 3.8 & RDI)
$consumption = runTest('Report: Consumption & Equity', 'http://127.0.0.1/aquila-system/backend-api/public/api/v1/reports/consumption', 'GET', $authHeader);
$nodeCount = count($consumption['data']['household_breakdown'] ?? []);
echo "   ↳ Households Processed: {$nodeCount} | Total Community Volume: " . ($consumption['data']['community_summary']['total_community_liters'] ?? 0) . " L\n";

// 3. NRW Leak Loss Report
$leaks = runTest('Report: NRW & Physical Leak Loss', 'http://127.0.0.1/aquila-system/backend-api/public/api/v1/reports/leaks', 'GET', $authHeader);
echo "   ↳ Leaks Detected: " . ($leaks['data']['leak_loss_summary']['total_leaks_detected'] ?? 0) . " | Estimated Water Lost: " . ($leaks['data']['leak_loss_summary']['estimated_water_lost_liters'] ?? 0) . " L\n";

// 4. Technician Maintenance Performance
runTest('Report: Technician Maintenance Stats', 'http://127.0.0.1/aquila-system/backend-api/public/api/v1/reports/maintenance', 'GET', $authHeader);

// 5. Immutable Audit Logs (Table 3.12)
runTest('Report: Immutable Audit Ledger (INV-06)', 'http://127.0.0.1/aquila-system/backend-api/public/api/v1/audit-logs', 'GET', $authHeader);

// 6. Direct CSV Stream Export
$ch = curl_init('http://127.0.0.1/aquila-system/backend-api/public/api/v1/reports/export?type=consumption');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Bearer ' . $adminToken]);
$csvContent = (string)curl_exec($ch);
$csvHttp = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

$csvPassed = ($csvHttp === 200 && str_contains($csvContent, 'Node ID') && str_contains($csvContent, 'Total Liters'));
echo sprintf("%-12s | HTTP %d | Streamed CSV File Download (%d bytes)\n", $csvPassed ? "✅ [PASS]" : "❌ [FAIL]", $csvHttp, strlen($csvContent));

// 7. Security Guard: Reject Unauthenticated Request
runTest('Security: Unauthorized Access Blocked', 'http://127.0.0.1/aquila-system/backend-api/public/api/v1/reports/consumption', 'GET', [], null, 401);

echo "===============================================================\n";
echo " BATCH C AUDIT COMPLETE\n";
echo "===============================================================\n";
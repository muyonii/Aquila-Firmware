<?php
declare(strict_types=1);

require_once __DIR__ . '/vendor/autoload.php';

use Aquila\Config\Database;
use Aquila\Config\Env;
use Aquila\Config\Security;

Env::load();

echo "===============================================================\n";
echo " AQUILA BACKEND API COMPREHENSIVE VERIFICATION SUITE\n";
echo "===============================================================\n";

function testApi(string $name, string $url, string $method = 'GET', array $headers = [], ?string $body = null, int $expectedCode = 200): ?array {
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    if ($body !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
    }
    if (!empty($headers)) {
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    }
    
    $res = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    $passed = ($httpCode === $expectedCode);
    $icon = $passed ? "✅ [PASS]" : "❌ [FAIL]";
    echo sprintf("%-12s | HTTP %d (Expected %d) | %s\n", $icon, $httpCode, $expectedCode, $name);
    
    if (!$passed && $res) {
        echo "   ↳ Response: " . substr((string)$res, 0, 180) . "\n";
    }

    return json_decode((string)$res, true);
}

// 1. Database Connection & Dynamic Test Account Resolution
$db = null;
$adminEmail = 'admin@bawasa.gov.ph';
$techEmail  = 'technician@bawasa.gov.ph';
$resEmail   = 'resident1@gmail.com';
$testPass   = 'Password123!';
$backupHashes = [];

try {
    $db = Database::getConnection();
    echo "✅ [PASS]     | MySQL 8.0 Connection Established (aquila_db)\n";

    // Dynamically resolve active accounts by role from user_account
    $adminRow = $db->query("SELECT user_id, email, password_hash FROM user_account WHERE role = 'admin' AND is_active = 1 ORDER BY user_id ASC LIMIT 1")->fetch();
    $techRow  = $db->query("SELECT user_id, email, password_hash FROM user_account WHERE role = 'technician' AND is_active = 1 ORDER BY user_id ASC LIMIT 1")->fetch();
    $resRow   = $db->query("SELECT user_id, email, password_hash FROM user_account WHERE role = 'resident' AND is_active = 1 ORDER BY user_id ASC LIMIT 1")->fetch();

    $tempHash = password_hash($testPass, PASSWORD_BCRYPT);

    if ($adminRow) {
        $adminEmail = $adminRow['email'];
        $backupHashes[$adminRow['user_id']] = $adminRow['password_hash'];
    }
    if ($techRow) {
        $techEmail = $techRow['email'];
        $backupHashes[$techRow['user_id']] = $techRow['password_hash'];
    }
    if ($resRow) {
        $resEmail = $resRow['email'];
        $backupHashes[$resRow['user_id']] = $resRow['password_hash'];
    }

    // Ensure known test password during test execution
    $upd = $db->prepare("UPDATE user_account SET password_hash = :h WHERE user_id = :id");
    foreach ($backupHashes as $uid => $_) {
        $upd->execute([':h' => $tempHash, ':id' => $uid]);
    }
} catch (Exception $e) {
    echo "❌ [FAIL]     | Database Connection Failed: " . $e->getMessage() . "\n";
    exit(1);
}

// 2. Health Endpoint
testApi('Health Check Endpoint', 'http://127.0.0.1/aquila-system/backend-api/public/');

// 3. Admin Authentication (JWT + Refresh Token)
$login = testApi(
    "Admin Login ({$adminEmail})", 
    'http://127.0.0.1/aquila-system/backend-api/public/api/v1/auth/login', 
    'POST', 
    ['Content-Type: application/json'], 
    json_encode(['email' => $adminEmail, 'password' => $testPass])
);
$adminToken = $login['data']['token'] ?? '';
$refreshToken = $login['data']['refresh_token'] ?? '';

// 3b. Test Refresh Token Rotation (Table 3.3: user_sessions)
testApi(
    'JWT Refresh Token Rotation (/auth/refresh)', 
    'http://127.0.0.1/aquila-system/backend-api/public/api/v1/auth/refresh', 
    'POST', 
    ['Content-Type: application/json'], 
    json_encode(['refresh_token' => $refreshToken])
);

// 4. Technician Authentication
$techLogin = testApi(
    "Technician Login ({$techEmail})", 
    'http://127.0.0.1/aquila-system/backend-api/public/api/v1/auth/login', 
    'POST', 
    ['Content-Type: application/json'], 
    json_encode(['email' => $techEmail, 'password' => $testPass])
);
$techToken = $techLogin['data']['token'] ?? '';

// 5. Resident Authentication
$resLogin = testApi(
    "Resident Login ({$resEmail})", 
    'http://127.0.0.1/aquila-system/backend-api/public/api/v1/auth/login', 
    'POST', 
    ['Content-Type: application/json'], 
    json_encode(['email' => $resEmail, 'password' => $testPass])
);
$resToken = $resLogin['data']['token'] ?? '';

// 6. HMAC Webhook Ingestion (Positive Authenticated Test)
$time = time();
$webhookPayload = json_encode([
    'event_type' => 'INCIDENT_DETECTED',
    'timestamp' => $time,
    'payload' => [
        'node_id' => 'NODE-B1-003',
        'incident_type' => 'CRITICAL_LEAK',
        'severity_level' => 'P1',
        'recommendation' => ['title' => 'Sudden Pipe Rupture', 'action_directive' => 'Check valve at Node 03']
    ]
]);

$secret = Security::getWebhookSecret();
$sig = hash_hmac('sha256', $time . '.' . $webhookPayload, $secret);

testApi(
    'HMAC Webhook Ingestion: Valid Signature', 
    'http://127.0.0.1/aquila-system/backend-api/public/api/v1/webhooks/incident', 
    'POST', 
    [
        'Content-Type: application/json', 
        'X-Aquila-Timestamp: ' . $time, 
        'X-Aquila-Signature: ' . $sig
    ], 
    $webhookPayload
);

// 6b. Security Guard: Forged HMAC Signature Rejection (Must be HTTP 403)
testApi(
    'Security Guard: Forged HMAC Signature Rejection', 
    'http://127.0.0.1/aquila-system/backend-api/public/api/v1/webhooks/incident', 
    'POST', 
    [
        'Content-Type: application/json', 
        'X-Aquila-Timestamp: ' . $time, 
        'X-Aquila-Signature: ' . 'forged_deadbeef_signature_000000000000'
    ], 
    $webhookPayload,
    403
);

// 7. Admin List Incidents (Joined action_card_templates)
testApi(
    'Admin List Incidents (Bearer JWT)', 
    'http://127.0.0.1/aquila-system/backend-api/public/api/v1/incidents', 
    'GET', 
    ['Authorization: Bearer ' . $adminToken]
);

// 8. Technician Task Queue
testApi(
    'Technician Task Queue (Bearer JWT)', 
    'http://127.0.0.1/aquila-system/backend-api/public/api/v1/tasks', 
    'GET', 
    ['Authorization: Bearer ' . $techToken]
);

// 9. Resident Row-Level Security
testApi(
    'Resident Awareness RLS (/my-water)', 
    'http://127.0.0.1/aquila-system/backend-api/public/api/v1/resident/my-water', 
    'GET', 
    ['Authorization: Bearer ' . $resToken]
);

// 10. Cluster Analytics KPI Summary
testApi(
    'Cluster Analytics KPI Summary', 
    'http://127.0.0.1/aquila-system/backend-api/public/api/v1/analytics/summary', 
    'GET', 
    ['Authorization: Bearer ' . $adminToken]
);

// 11. Notification Center (Table 3.13)
testApi(
    'Notification Center: Fetch Web Alerts', 
    'http://127.0.0.1/aquila-system/backend-api/public/api/v1/notifications', 
    'GET', 
    ['Authorization: Bearer ' . $adminToken]
);

// 12. Security Negative Test: Unauthorized Request without Token (Must be HTTP 401)
testApi(
    'Security Guard: Missing Token Rejection', 
    'http://127.0.0.1/aquila-system/backend-api/public/api/v1/incidents', 
    'GET', 
    [], 
    null, 
    401
);

echo "===============================================================\n";
echo " BACKEND AUDIT COMPLETE\n";
echo "===============================================================\n";
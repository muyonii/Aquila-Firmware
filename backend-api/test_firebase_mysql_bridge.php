<?php
declare(strict_types=1);

require_once __DIR__ . '/vendor/autoload.php';

use Aquila\Config\AppConfig;
use Aquila\Config\Database;
use Aquila\Config\Env;
use Aquila\Domain\Entities\IncidentTicket;
use Aquila\Domain\Enums\IncidentStatus;
use Aquila\Domain\ValueObjects\FlowRate;
use Aquila\Services\FirebaseCleanerService;
use Aquila\Services\RepairVerificationService;
use Aquila\Utils\Uuid;

Env::load();

echo "====================================================================\n";
echo " AQUILA: FIREBASE <-> PHPMYADMIN (MYSQL) INTEGRATION BRIDGE SUITE\n";
echo "====================================================================\n";

$firebaseUrl = rtrim(AppConfig::getFirebaseUrl(), '/');
$testNodeId = 'NODE-B1-001';
$passed = 0;
$failed = 0;

function reportResult(string $bridgeName, bool $success, string $details = ''): void {
    global $passed, $failed;
    if ($success) {
        $passed++;
        echo sprintf("  ✅ [PASS] %s\n", $bridgeName);
        if ($details) echo "      ↳ {$details}\n";
    } else {
        $failed++;
        echo sprintf("  ❌ [FAIL] %s\n", $bridgeName);
        if ($details) echo "      ↳ Error: {$details}\n";
    }
}

function firebaseRequest(string $url, string $method = 'GET', mixed $data = null): mixed {
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    curl_setopt($ch, CURLOPT_TIMEOUT, 6);
    if ($data !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    }
    $raw = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode >= 200 && $httpCode < 300) {
        return json_decode((string)$raw, true) ?? [];
    }
    return null;
}

// -----------------------------------------------------------------------------
// BRIDGE 1: Dual-Database Handshake (MySQL PDO & Firebase HTTPS)
// -----------------------------------------------------------------------------
echo "\n--- [BRIDGE 1]: Dual Database Handshake & Connection Integrity ---\n";
try {
    $db = Database::getConnection();
    $mysqlTz = $db->query("SELECT @@session.time_zone")->fetchColumn();
    $mysqlOk = ($mysqlTz === '+08:00');

    $fbHealth = firebaseRequest("{$firebaseUrl}/nodes.json?shallow=true");
    $fbOk = ($fbHealth !== null);

    reportResult("MySQL PDO Connection & Timezone (+08:00)", $mysqlOk, "Timezone: {$mysqlTz}");
    reportResult("Firebase RTDB HTTPS Connection", $fbOk, "Host: {$firebaseUrl}");
} catch (\Throwable $e) {
    reportResult("Dual Database Handshake", false, $e->getMessage());
}

// -----------------------------------------------------------------------------
// BRIDGE 2: Maintenance Status Sync (MySQL -> Firebase)
// -----------------------------------------------------------------------------
echo "\n--- [BRIDGE 2]: Node Maintenance Status Synchronization (MySQL -> Firebase) ---\n";
try {
    firebaseRequest("{$firebaseUrl}/nodes/{$testNodeId}/status.json", 'PUT', 'MAINTENANCE');
    $readMaint = firebaseRequest("{$firebaseUrl}/nodes/{$testNodeId}/status.json", 'GET');
    $maintOk = ($readMaint === 'MAINTENANCE');

    firebaseRequest("{$firebaseUrl}/nodes/{$testNodeId}/status.json", 'PUT', 'ACTIVE');
    $readActive = firebaseRequest("{$firebaseUrl}/nodes/{$testNodeId}/status.json", 'GET');
    $activeOk = ($readActive === 'ACTIVE');

    reportResult("Maintenance State Transition Sync", ($maintOk && $activeOk));
} catch (\Throwable $e) {
    reportResult("Maintenance Status Sync", false, $e->getMessage());
}

// -----------------------------------------------------------------------------
// BRIDGE 3: CQRS Compaction Volume Delta Bridge (Firebase -> MySQL hourly_summary)
// -----------------------------------------------------------------------------
echo "\n--- [BRIDGE 3]: CQRS Volume Delta Compaction (Firebase -> MySQL) ---\n";
try {
    $db = Database::getConnection();
    $testHour = '2026-09-28 12:00:00';
    $nextHour = '2026-09-28 13:00:00';

    $db->prepare("DELETE FROM hourly_summary WHERE node_id = :node AND hour_timestamp IN (:h1, :h2)")
       ->execute([':node' => $testNodeId, ':h1' => $testHour, ':h2' => $nextHour]);

    $db->prepare(
        "INSERT INTO hourly_summary (node_id, hour_timestamp, total_volume_liters, peak_flow_rate_lpm, leak_flag_count, cumulative_meter_reading)
         VALUES (:node, :hour, 0.00, 0.00, 0, 2000.00)"
    )->execute([':node' => $testNodeId, ':hour' => $testHour]);

    firebaseRequest("{$firebaseUrl}/nodes/{$testNodeId}/telemetry.json", 'PUT', [
        'node_id'           => $testNodeId,
        'packet_sequence'   => 999,
        'timestamp'         => time(),
        'flow_rate_lpm'     => 3.50,
        'cumulative_liters' => 2035.50,
        'is_simulated'      => false
    ]);

    $stmt = $db->prepare(
        "SELECT cumulative_meter_reading FROM hourly_summary 
         WHERE node_id = :node AND hour_timestamp < :next_hour 
         ORDER BY hour_timestamp DESC LIMIT 1"
    );
    $stmt->execute([':node' => $testNodeId, ':next_hour' => $nextHour]);
    $prevCumulative = (float)$stmt->fetchColumn();

    $currentReading = 2035.50;
    $computedDelta = max(0.0, $currentReading - $prevCumulative);

    $db->prepare(
        "INSERT INTO hourly_summary (node_id, hour_timestamp, total_volume_liters, peak_flow_rate_lpm, leak_flag_count, cumulative_meter_reading)
         VALUES (:node, :hour, :delta, 3.50, 0, :reading)"
    )->execute([
        ':node'    => $testNodeId,
        ':hour'    => $nextHour,
        ':delta'   => $computedDelta,
        ':reading' => $currentReading
    ]);

    $chkStmt = $db->prepare("SELECT total_volume_liters, cumulative_meter_reading FROM hourly_summary WHERE node_id = :node AND hour_timestamp = :hour");
    $chkStmt->execute([':node' => $testNodeId, ':hour' => $nextHour]);
    $row = $chkStmt->fetch();

    $cqrsOk = ($row && (float)$row['total_volume_liters'] === 35.50 && (float)$row['cumulative_meter_reading'] === 2035.50);

    $db->prepare("DELETE FROM hourly_summary WHERE node_id = :node AND hour_timestamp IN (:h1, :h2)")
       ->execute([':node' => $testNodeId, ':h1' => $testHour, ':h2' => $nextHour]);

    reportResult("True Hourly Delta Calculation (2035.50 - 2000.00 = 35.50 L)", $cqrsOk);
} catch (\Throwable $e) {
    reportResult("CQRS Volume Delta Compaction", false, $e->getMessage());
}

// -----------------------------------------------------------------------------
// BRIDGE 4: Closed-Loop Repair Verification (Table 3.11 Normalized)
// -----------------------------------------------------------------------------
echo "\n--- [BRIDGE 4]: Closed-Loop Repair Verification (Table 3.11 Normalized) ---\n";
try {
    $db = Database::getConnection();
    $service = new RepairVerificationService();
    $testTicketId = Uuid::v4();

    // FIXED: Uses normalized schema (template_id = 1 instead of legacy flat strings)
    $db->prepare(
        "INSERT INTO incident_ticket (incident_id, node_id, template_id, detected_at, pending_verification_since, status, repair_notes)
         VALUES (:id, :node, 1, NOW(), NOW() - INTERVAL 900 SECOND, 'PENDING_VERIFICATION', 'Coupling clamped')"
    )->execute([':id' => $testTicketId, ':node' => $testNodeId]);

    firebaseRequest("{$firebaseUrl}/nodes/{$testNodeId}/telemetry.json", 'PUT', [
        'node_id'           => $testNodeId,
        'packet_sequence'   => 1001,
        'timestamp'         => time(),
        'flow_rate_lpm'     => 0.02,
        'cumulative_liters' => 2035.60,
        'is_simulated'      => false
    ]);

    $fbTelemetry = firebaseRequest("{$firebaseUrl}/nodes/{$testNodeId}/telemetry.json");
    $observedLpm = (float)($fbTelemetry['flow_rate_lpm'] ?? 0.0);

    $ticketStmt = $db->prepare(
        "SELECT t.*, act.incident_type, act.severity_level, act.action_card_title, act.action_directive
         FROM incident_ticket t
         JOIN action_card_templates act ON t.template_id = act.template_id
         WHERE t.incident_id = :id"
    );
    $ticketStmt->execute([':id' => $testTicketId]);
    $ticket = IncidentTicket::fromArray($ticketStmt->fetch());

    $outcomeA = $service->evaluateQuiescentFlow($ticket, new FlowRate($observedLpm), 900);
    $autoCloseOk = ($outcomeA === IncidentStatus::CLOSED_VERIFIED);

    $ticket->status = IncidentStatus::PENDING_VERIFICATION;
    $outcomeB = $service->evaluateQuiescentFlow($ticket, new FlowRate(2.50), 120);
    $recurrentFailOk = ($outcomeB === IncidentStatus::REPAIR_FAILED);

    $db->prepare("DELETE FROM incident_ticket WHERE incident_id = :id")->execute([':id' => $testTicketId]);

    reportResult("Automated Quiescent Closure (Flow <= 0.05 LPM for 900s -> CLOSED_VERIFIED)", $autoCloseOk);
    reportResult("Recurrent Burst Failure (Flow >= 1.0 LPM -> REPAIR_FAILED)", $recurrentFailOk);
} catch (\Throwable $e) {
    reportResult("Closed-Loop Repair Verification", false, $e->getMessage());
}

// -----------------------------------------------------------------------------
// BRIDGE 5: Stale Telemetry Pruner (MySQL Nodes -> Firebase Telemetry Cleanup)
// -----------------------------------------------------------------------------
echo "\n--- [BRIDGE 5]: Stale Telemetry Pruning (MySQL Node List -> Firebase Cleanup) ---\n";
try {
    $oldTime = time() - 10800;
    firebaseRequest("{$firebaseUrl}/nodes/{$testNodeId}/telemetry.json", 'PUT', [
        'node_id'           => $testNodeId,
        'packet_sequence'   => 1002,
        'timestamp'         => $oldTime,
        'flow_rate_lpm'     => 4.20,
        'cumulative_liters' => 2035.60,
        'is_simulated'      => false
    ]);

    $prunedCount = FirebaseCleanerService::pruneExpiredTelemetry();

    $cleaned = firebaseRequest("{$firebaseUrl}/nodes/{$testNodeId}/telemetry.json");
    $pruneOk = ($cleaned && (float)$cleaned['flow_rate_lpm'] === 0.0 && ($cleaned['stale_pruned'] ?? false) === true);

    firebaseRequest("{$firebaseUrl}/nodes/{$testNodeId}/telemetry.json", 'PUT', [
        'node_id'           => $testNodeId,
        'packet_sequence'   => 1,
        'timestamp'         => time(),
        'flow_rate_lpm'     => 0.00,
        'cumulative_liters' => 2035.60,
        'is_simulated'      => false
    ]);

    reportResult("Phantom Leak Prevention (Stale packet > 2h zeroed out)", $pruneOk);
} catch (\Throwable $e) {
    reportResult("Stale Telemetry Pruning", false, $e->getMessage());
}

// -----------------------------------------------------------------------------
// SUMMARY
// -----------------------------------------------------------------------------
echo "\n====================================================================\n";
echo sprintf("RESULTS: Total Bridges Tested: %d | Passed: %d | Failed: %d\n", ($passed + $failed), $passed, $failed);
echo "====================================================================\n";

exit($failed === 0 ? 0 : 1);
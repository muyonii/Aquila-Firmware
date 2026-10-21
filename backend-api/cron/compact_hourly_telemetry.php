<?php
declare(strict_types=1);

require_once __DIR__ . '/../vendor/autoload.php';

use Aquila\Config\AppConfig;
use Aquila\Config\Database;
use Aquila\Config\Env;
use Aquila\Domain\Entities\IncidentTicket;
use Aquila\Domain\Enums\IncidentStatus;
use Aquila\Domain\ValueObjects\FlowRate;
use Aquila\Infrastructure\Repositories\MySQLIncidentRepository;
use Aquila\Services\AuditLogger;
use Aquila\Services\FirebaseCleanerService;
use Aquila\Services\NotificationDispatchService;
use Aquila\Services\RepairVerificationService;

Env::load();
date_default_timezone_set(AppConfig::TIMEZONE);

$db = Database::getConnection();
$incidentRepo = new MySQLIncidentRepository($db);
$verificationService = new RepairVerificationService();
$notifService = new NotificationDispatchService($db);
$firebaseUrl = rtrim(AppConfig::getFirebaseUrl(), '/');
$currentHourTimestamp = date('Y-m-d H:00:00');

echo "[" . date('Y-m-d H:i:s') . "] Starting AQUILA CQRS Compaction & Auto-Verification Worker...\n";

if (!function_exists('fetchFirebaseData')) {
    function fetchFirebaseData(string $url): ?array {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 5,
            CURLOPT_SSL_VERIFYPEER => false
        ]);
        $raw = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode >= 200 && $httpCode < 300 && $raw) {
            return json_decode((string)$raw, true) ?? null;
        }
        return null;
    }
}

// =============================================================================
// SECTION 1: HOURLY VOLUME DELTA COMPACTION (Table 3.8: hourly_summary)
// =============================================================================
$nodesStmt = $db->query("SELECT node_id FROM monitoring_node WHERE status = 'ACTIVE'");
$activeNodes = $nodesStmt->fetchAll(PDO::FETCH_ASSOC);

$compactedCount = 0;

foreach ($activeNodes as $node) {
    $nodeId = $node['node_id'];

    $telemetry = fetchFirebaseData("{$firebaseUrl}/nodes/{$nodeId}/telemetry.json");
    if (!$telemetry || !isset($telemetry['cumulative_liters'])) {
        continue;
    }

    $currentCumulativeLiters = (float)($telemetry['cumulative_liters'] ?? 0.0);
    $observedFlowRate        = (float)($telemetry['flow_rate_lpm'] ?? 0.0);

    $prevStmt = $db->prepare(
        "SELECT cumulative_meter_reading 
         FROM hourly_summary 
         WHERE node_id = :node_id AND hour_timestamp < :current_hour 
         ORDER BY hour_timestamp DESC 
         LIMIT 1"
    );
    $prevStmt->execute([
        ':node_id'      => $nodeId, 
        ':current_hour' => $currentHourTimestamp
    ]);
    $prevCumulative = $prevStmt->fetchColumn();

    if ($prevCumulative !== false) {
        $prevVal = (float)$prevCumulative;
        $hourlyDeltaVolume = ($currentCumulativeLiters >= $prevVal) 
            ? ($currentCumulativeLiters - $prevVal) 
            : $currentCumulativeLiters;
    } else {
        $hourlyDeltaVolume = 0.0;
    }

    $hourStart = date('Y-m-d H:i:s', strtotime($currentHourTimestamp) - 3600);
    $leakCountStmt = $db->prepare(
        "SELECT COUNT(*) 
         FROM incident_ticket t
         JOIN action_card_templates act ON t.template_id = act.template_id
         WHERE t.node_id = :node_id 
           AND act.incident_type = 'CRITICAL_LEAK' 
           AND t.detected_at >= :hour_start 
           AND t.detected_at < :hour_end"
    );
    $leakCountStmt->execute([
        ':node_id'    => $nodeId,
        ':hour_start' => $hourStart,
        ':hour_end'   => $currentHourTimestamp
    ]);
    $leakFlags = (int)$leakCountStmt->fetchColumn();

    $upsertStmt = $db->prepare(
        "INSERT INTO hourly_summary (
             node_id, 
             hour_timestamp, 
             total_volume_liters, 
             peak_flow_rate_lpm, 
             leak_flag_count, 
             cumulative_meter_reading
         ) VALUES (
             :node_id, 
             :hour, 
             :liters, 
             :peak, 
             :leaks, 
             :meter_reading
         )
         ON DUPLICATE KEY UPDATE
             total_volume_liters      = VALUES(total_volume_liters),
             peak_flow_rate_lpm       = GREATEST(peak_flow_rate_lpm, VALUES(peak_flow_rate_lpm)),
             leak_flag_count          = VALUES(leak_flag_count),
             cumulative_meter_reading = VALUES(cumulative_meter_reading)"
    );

    $upsertStmt->execute([
        ':node_id'       => $nodeId,
        ':hour'          => $currentHourTimestamp,
        ':liters'        => round($hourlyDeltaVolume, 2),
        ':peak'          => round($observedFlowRate, 2),
        ':leaks'         => $leakFlags,
        ':meter_reading' => round($currentCumulativeLiters, 2)
    ]);

    $compactedCount++;
}

// =============================================================================
// SECTION 2: AUTOMATED POST-REPAIR VERIFICATION (Table 3.10 & Rule BR-07)
// =============================================================================
$pendingStmt = $db->query(
    "SELECT t.*, act.incident_type, act.severity_level, act.academic_classification, act.display_name
     FROM incident_ticket t
     JOIN action_card_templates act ON t.template_id = act.template_id
     WHERE t.status = 'PENDING_VERIFICATION'"
);
$pendingTickets = $pendingStmt->fetchAll(PDO::FETCH_ASSOC);

$nowTime = time();
$autoClosedCount = 0;

foreach ($pendingTickets as $ticketRow) {
    $ticket = IncidentTicket::fromArray($ticketRow);
    $nodeId = $ticket->nodeId;

    $telemetry = fetchFirebaseData("{$firebaseUrl}/nodes/{$nodeId}/telemetry.json");
    $currentFlowLpm = (float)($telemetry['flow_rate_lpm'] ?? 0.0);

    $sinceTime = !empty($ticket->pendingVerificationSince) 
        ? strtotime($ticket->pendingVerificationSince) 
        : strtotime($ticket->detectedAt);
    
    $elapsedSeconds = max(0, $nowTime - $sinceTime);

    $outcome = $verificationService->evaluateQuiescentFlow(
        $ticket, 
        new FlowRate($currentFlowLpm), 
        $elapsedSeconds
    );

    if ($outcome !== IncidentStatus::PENDING_VERIFICATION) {
        $incidentRepo->save($ticket, 1);

        if ($outcome === IncidentStatus::CLOSED_VERIFIED) {
            $notifService->notifyRepairSuccess($ticket);
        } elseif ($outcome === IncidentStatus::REPAIR_FAILED) {
            $notifService->notifyRepairFailed($ticket);
        }

        $ch = curl_init("{$firebaseUrl}/blackboard/incidents/active/{$ticket->incidentId}.json");
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'DELETE');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_exec($ch);
        curl_close($ch);

        AuditLogger::log(
            'REPAIR_' . $ticket->status->value,
            1,
            $ticket->incidentId,
            "Auto-verification: {$ticket->status->value} on {$nodeId} (Flow: {$currentFlowLpm} LPM, Elapsed: {$elapsedSeconds}s)"
        );

        echo "  ✔ Auto-Verification Completed for Ticket {$ticket->incidentId} on {$nodeId}: Outcome = {$ticket->status->value}\n";
        $autoClosedCount++;
    }
}

// =============================================================================
// SECTION 3: STALE TELEMETRY PRUNER (INV-04) & TOKEN HOUSEKEEPING
// =============================================================================
$pruned          = FirebaseCleanerService::pruneExpiredTelemetry();
$expiredOtps     = (new \Aquila\Infrastructure\Repositories\MySQLVerificationCodeRepository($db))->purgeExpired();
$expiredSessions = (new \Aquila\Infrastructure\Repositories\MySQLUserSessionRepository($db))->purgeExpired();

echo "[" . date('Y-m-d H:i:s') . "] Compaction & Verification Worker finished successfully.\n";
echo "  ↳ Compacted Nodes   : {$compactedCount}\n";
echo "  ↳ Auto-Verified     : {$autoClosedCount} tickets\n";
echo "  ↳ Stale Pruned      : {$pruned} nodes\n";
echo "  ↳ Expired OTPs      : {$expiredOtps}\n";
echo "  ↳ Expired Sessions  : {$expiredSessions}\n";
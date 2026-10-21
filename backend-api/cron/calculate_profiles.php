<?php
declare(strict_types=1);

require_once __DIR__ . '/../vendor/autoload.php';

use Aquila\Config\AppConfig;
use Aquila\Config\Database;
use Aquila\Config\Env;

Env::load();
date_default_timezone_set(AppConfig::TIMEZONE);

$db = Database::getConnection();
$firebaseUrl = rtrim(AppConfig::getFirebaseUrl(), '/');

echo "[" . date('Y-m-d H:i:s') . "] Running Hybrid Micro-DMA Profiler...\n";

$nodes = $db->query("SELECT node_id FROM monitoring_node WHERE status = 'ACTIVE'")->fetchAll(PDO::FETCH_COLUMN);

foreach ($nodes as $nodeId) {
    // 1. Expected Nocturnal Minimum (IWA MNF Baseline: 01:00 AM - 04:30 AM over past 14 days)
    $nightStmt = $db->prepare("
        SELECT COALESCE(AVG(peak_flow_rate_lpm), 0.05) as night_flow
        FROM hourly_summary
        WHERE node_id = :node_id
          AND HOUR(hour_timestamp) BETWEEN 1 AND 4
          AND hour_timestamp >= NOW() - INTERVAL 14 DAY
    ");
    $nightStmt->execute([':node_id' => $nodeId]);
    $expectedNightFlow = round((float)$nightStmt->fetchColumn(), 2);

    // 2. Mean Daily Volume (Liters/Day)
    $volStmt = $db->prepare("
        SELECT COALESCE(SUM(total_volume_liters) / NULLIF(COUNT(DISTINCT DATE(hour_timestamp)), 0), 350.0) as daily_mean
        FROM hourly_summary
        WHERE node_id = :node_id
          AND hour_timestamp >= NOW() - INTERVAL 14 DAY
    ");
    $volStmt->execute([':node_id' => $nodeId]);
    $meanDailyVolume = round((float)$volStmt->fetchColumn(), 2);

    // 3. Typical Max Duration: Normal continuous use ceiling (bounded 15m to 45m)
    $typicalMaxDuration = min(45.0, max(15.0, round($meanDailyVolume / 20.0, 1)));

    // 4. Upsert into MySQL household_profile (Table 3.5)
    $upsert = $db->prepare("
        INSERT INTO household_profile (
            node_id, expected_night_flow_lpm, typical_max_duration_mins, mean_daily_volume_liters, last_profiled_at
        ) VALUES (
            :node_id, :night_flow, :max_dur, :daily_vol, NOW()
        )
        ON DUPLICATE KEY UPDATE
            expected_night_flow_lpm   = VALUES(expected_night_flow_lpm),
            typical_max_duration_mins = VALUES(typical_max_duration_mins),
            mean_daily_volume_liters  = VALUES(mean_daily_volume_liters),
            last_profiled_at          = NOW()
    ");
    $upsert->execute([
        ':node_id'    => $nodeId,
        ':night_flow' => $expectedNightFlow,
        ':max_dur'    => $typicalMaxDuration,
        ':daily_vol'  => $meanDailyVolume
    ]);

    // 5. Push profile to Firebase Hot Store (/nodes/{id}/profile.json)
    $profilePayload = json_encode([
        'expected_night_flow_lpm'   => $expectedNightFlow,
        'typical_max_duration_mins' => $typicalMaxDuration,
        'mean_daily_volume_liters'  => $meanDailyVolume,
        'last_profiled_at'          => time()
    ]);

    $ch = curl_init("{$firebaseUrl}/nodes/{$nodeId}/profile.json");
    curl_setopt_array($ch, [
        CURLOPT_CUSTOMREQUEST  => 'PUT',
        CURLOPT_POSTFIELDS     => $profilePayload,
        CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 3
    ]);
    curl_exec($ch);
    curl_close($ch);

    echo "  ✔ Profiled {$nodeId}: NightBase={$expectedNightFlow} LPM | MaxDuration={$typicalMaxDuration}m | Daily={$meanDailyVolume} L\n";
}

echo "[" . date('Y-m-d H:i:s') . "] Hybrid Profiling Complete & Synced to Firebase.\n";
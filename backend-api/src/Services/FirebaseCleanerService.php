<?php
declare(strict_types=1);

namespace Aquila\Services;

use Aquila\Config\AppConfig;
use Aquila\Config\Database;
use PDO;

class FirebaseCleanerService
{
    /**
     * Scans Firebase RTDB and flags or resets stale telemetry older than TTL (INV-04)
     */
    public static function pruneExpiredTelemetry(): int
    {
        $firebaseUrl = rtrim(AppConfig::getFirebaseUrl(), '/');
        $db = Database::getConnection();

        // Query normalized lowercase table
        $stmt = $db->query("SELECT node_id FROM monitoring_node");
        $nodes = $stmt->fetchAll(PDO::FETCH_COLUMN);

        $now = time();
        $ttlSeconds = AppConfig::TELEMETRY_TTL_SECONDS; // 7200s (2 hours)
        $prunedCount = 0;

        foreach ($nodes as $nodeId) {
            $telemetryUrl = "{$firebaseUrl}/nodes/{$nodeId}/telemetry.json";

            $ch = curl_init($telemetryUrl);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 5);
            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($httpCode !== 200 || !$response) {
                continue;
            }

            $telemetry = json_decode((string)$response, true);
            if (!$telemetry || !isset($telemetry['timestamp'])) {
                continue;
            }

            $packetAge = $now - (int)$telemetry['timestamp'];

            // Zero out flow rate if telemetry is stale (>2 hours) to prevent phantom leaks
            if ($packetAge > $ttlSeconds && (float)($telemetry['flow_rate_lpm'] ?? 0.0) > 0.0) {
                $patchUrl = "{$firebaseUrl}/nodes/{$nodeId}/telemetry.json";
                $patchData = json_encode([
                    'flow_rate_lpm' => 0.0,
                    'stale_pruned'  => true,
                    'pruned_at'     => $now
                ]);

                $patchCh = curl_init($patchUrl);
                curl_setopt($patchCh, CURLOPT_CUSTOMREQUEST, 'PATCH');
                curl_setopt($patchCh, CURLOPT_POSTFIELDS, $patchData);
                curl_setopt($patchCh, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
                curl_setopt($patchCh, CURLOPT_RETURNTRANSFER, true);
                curl_setopt($patchCh, CURLOPT_TIMEOUT, 5);
                curl_exec($patchCh);
                curl_close($patchCh);

                $prunedCount++;
            }
        }

        return $prunedCount;
    }
}
<?php
declare(strict_types=1);

require_once __DIR__ . '/../vendor/autoload.php';

use Aquila\Config\AppConfig;
use Aquila\Config\Database;

$db = Database::getConnection();
$fbUrl = rtrim(AppConfig::getFirebaseUrl(), '/');

$profiles = $db->query("SELECT * FROM HOUSEHOLD_PROFILE")->fetchAll(PDO::FETCH_ASSOC);

foreach ($profiles as $p) {
    $nodeId = $p['node_id'];
    $payload = json_encode([
        'expected_night_flow_lpm'   => (float)$p['expected_night_flow_lpm'],
        'typical_max_duration_mins' => (float)$p['typical_max_duration_mins'],
        'mean_daily_volume_liters'  => (float)$p['mean_daily_volume_liters']
    ]);

    $ch = curl_init("{$fbUrl}/nodes/{$nodeId}/profile.json");
    curl_setopt_array($ch, [
        CURLOPT_CUSTOMREQUEST  => 'PUT',
        CURLOPT_POSTFIELDS     => $payload,
        CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 3
    ]);
    curl_exec($ch);
    curl_close($ch);
}

echo "✔ Synced " . count($profiles) . " household profiles to Firebase Hot Store.\n";
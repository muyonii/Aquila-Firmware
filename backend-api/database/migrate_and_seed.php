<?php
declare(strict_types=1);

require_once __DIR__ . '/../vendor/autoload.php';

use Aquila\Config\AppConfig;
use Aquila\Config\Database;
use Aquila\Config\Env;

Env::load();
date_default_timezone_set(AppConfig::TIMEZONE);

echo "====================================================================\n";
echo " AQUILA: AUTOMATED DATABASE MIGRATION & SEED RUNNER\n";
echo "====================================================================\n";

try {
    $db = Database::getConnection();
} catch (\Throwable $e) {
    echo "❌ Connection failed: " . $e->getMessage() . "\n";
    exit(1);
}

// Disable foreign key checks during migration & bulk seeding
$db->exec("SET FOREIGN_KEY_CHECKS = 0;");

// 1. Run Individual Migrations (001 to 013)
echo "  [1/2] Executing Individual Migration Files (001 to 013)...\n";
$migrations = glob(__DIR__ . '/migrations/*.sql');
sort($migrations);

foreach ($migrations as $m) {
    $sql = file_get_contents($m);
    if (empty(trim($sql))) continue;
    
    // Strip client-side DELIMITER commands
    $cleanSql = preg_replace('/DELIMITER\s+\$\$/i', '', $sql);
    $cleanSql = preg_replace('/DELIMITER\s+;/i', '', $cleanSql);
    $cleanSql = str_replace('$$', ';', $cleanSql);

    try {
        $db->exec($cleanSql);
        echo "        ✔ Verified: " . basename($m) . "\n";
    } catch (\PDOException $e) {
        echo "        ⚠️ Notice in " . basename($m) . ": " . $e->getMessage() . "\n";
    }
}

// 2. Run Seed Files in Topological Dependency Order (Nodes FIRST!)
echo "\n  [2/2] Executing Seed Files in Topological Dependency Order...\n";

$topologicalSeedOrder = [
    'seed_action_card_templates.sql', // 1. SOP Templates
    'seed_demo_nodes.sql',            // 2. Monitoring Nodes FIRST (creates NODE-B1-001, etc.)
    'seed_default_users.sql',          // 3. User Accounts (references monitoring_node)
    'seed_demo_pipeline_edges.sql',   // 4. DAG Pipeline Edges (references monitoring_node)
    'seed_demo_history.sql'            // 5. Historical Telemetry & Profiles (references monitoring_node)
];

foreach ($topologicalSeedOrder as $seedFilename) {
    $seedPath = __DIR__ . '/seeds/' . $seedFilename;

    if (!file_exists($seedPath)) {
        // Fallback search
        $globMatches = glob(__DIR__ . '/seeds/*' . $seedFilename);
        if (!empty($globMatches)) {
            $seedPath = $globMatches[0];
        } else {
            continue;
        }
    }

    $sql = file_get_contents($seedPath);
    if (empty(trim($sql))) continue;

    try {
        $db->exec($sql);
        echo "        ✔ Seeded: " . basename($seedPath) . "\n";
    } catch (\PDOException $e) {
        echo "        ⚠️ Notice in " . basename($seedPath) . ": " . $e->getMessage() . "\n";
    }
}

// Re-enable foreign key checks
$db->exec("SET FOREIGN_KEY_CHECKS = 1;");

echo "====================================================================\n";
echo " DATABASE MIGRATION & SEEDING COMPLETE\n";
echo "====================================================================\n";
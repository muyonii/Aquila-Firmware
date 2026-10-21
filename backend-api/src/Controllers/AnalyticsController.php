<?php
declare(strict_types=1);

namespace Aquila\Controllers;

use Aquila\Config\Database;
use Aquila\Middleware\JwtAuthMiddleware;
use PDO;

class AnalyticsController
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getConnection();
    }

    // GET /api/v1/analytics/summary
    public function getClusterSummary(): void
    {
        header('Content-Type: application/json');
        JwtAuthMiddleware::authenticate();

        // 1. Registered Nodes count & status
        $nodesStmt = $this->db->query(
            "SELECT node_id, household_label, purok_cluster, is_physical, status 
             FROM monitoring_node ORDER BY node_id ASC"
        );
        $nodes = $nodesStmt->fetchAll();

        // 2. Incident counters by status and severity (Joined action_card_templates)
        $ticketStmt = $this->db->query(
            "SELECT t.status, act.severity_level, COUNT(*) as total 
             FROM incident_ticket t
             JOIN action_card_templates act ON t.template_id = act.template_id
             GROUP BY t.status, act.severity_level"
        );
        $ticketStats = $ticketStmt->fetchAll();

        // 3. Breakdown by Academic Taxonomy classification (Joined action_card_templates)
        $taxonomyStmt = $this->db->query(
            "SELECT act.academic_classification, act.display_name, COUNT(*) as count 
             FROM incident_ticket t
             JOIN action_card_templates act ON t.template_id = act.template_id
             WHERE t.status IN ('OPEN', 'DISPATCHED', 'PENDING_VERIFICATION')
             GROUP BY act.academic_classification, act.display_name"
        );
        $taxonomyStats = $taxonomyStmt->fetchAll();

        // 4. Past 24h community water volume
        $volumeStmt = $this->db->query(
            "SELECT COALESCE(SUM(total_volume_liters), 0) as community_24h_liters 
             FROM hourly_summary 
             WHERE hour_timestamp >= NOW() - INTERVAL 24 HOUR"
        );
        $communityVolume = (float)$volumeStmt->fetchColumn();

        echo json_encode([
            "success" => true,
            "data" => [
                "total_nodes"          => count($nodes),
                "community_24h_liters" => round($communityVolume, 2),
                "nodes"                => $nodes,
                "incident_breakdown"   => $ticketStats,
                "taxonomy_breakdown"   => $taxonomyStats,
                "system_status"        => "OPERATIONAL",
                "timestamp"            => time()
            ]
        ], JSON_PRETTY_PRINT);
    }
}
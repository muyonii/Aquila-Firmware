<?php
declare(strict_types=1);

namespace Aquila\Controllers;

use Aquila\Config\AppConfig;
use Aquila\Config\Database;
use Aquila\Domain\Enums\UserRole;
use Aquila\Middleware\RoleMiddleware;
use PDO;

class ReportController
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getConnection();
    }

    // 1. GET /api/v1/reports/consumption
    public function getConsumptionReport(): void
    {
        header('Content-Type: application/json');
        RoleMiddleware::enforce(UserRole::ADMIN);

        $startDate = $_GET['start_date'] ?? date('Y-m-d', strtotime('-30 days'));
        $endDate   = $_GET['end_date'] ?? date('Y-m-d');
        $purok     = $_GET['purok'] ?? null;

        $daysCount = max(1, (int)((strtotime($endDate) - strtotime($startDate)) / 86400) + 1);

        $sql = "SELECT h.node_id, n.household_label, n.purok_cluster,
                       COALESCE(ROUND(SUM(h.total_volume_liters), 2), 0.0) as total_liters,
                       COALESCE(ROUND(SUM(h.total_volume_liters) / 1000.0, 3), 0.0) as total_cubic_meters,
                       COALESCE(ROUND(MAX(h.peak_flow_rate_lpm), 2), 0.0) as peak_flow_rate_lpm
                FROM monitoring_node n
                LEFT JOIN hourly_summary h ON n.node_id = h.node_id AND DATE(h.hour_timestamp) BETWEEN :start AND :end";
        
        $params = [':start' => $startDate, ':end' => $endDate];
        if (!empty($purok)) {
            $sql .= " WHERE n.purok_cluster = :purok";
            $params[':purok'] = $purok;
        }
        $sql .= " GROUP BY n.node_id, n.household_label, n.purok_cluster ORDER BY total_liters DESC";

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll();

        $totalCommunityLiters = array_reduce($rows, fn($carry, $r) => $carry + (float)$r['total_liters'], 0.0);
        $nodeCount = count($rows) ?: 1;
        $meanDailyLiters = ($totalCommunityLiters / $nodeCount) / $daysCount;

        $householdBreakdown = [];
        $disadvantagedCount = 0;

        foreach ($rows as $row) {
            $liters = (float)$row['total_liters'];
            $nodeDailyMean = $liters / $daysCount;
            
            $rdi = $totalCommunityLiters > 0 ? $liters / (($totalCommunityLiters / $nodeCount) + 0.0001) : 1.0;
            $rdi = round($rdi, 3);

            $status = 'NORMAL';
            if ($rdi < AppConfig::RAWLSIAN_RDI_CUTOFF) {
                $status = 'DISADVANTAGED';
                $disadvantagedCount++;
            } elseif ($rdi > 1.30) {
                $status = 'HIGH_CONSUMER';
            }

            $householdBreakdown[] = [
                'node_id'            => $row['node_id'],
                'household_label'    => $row['household_label'],
                'purok_cluster'      => $row['purok_cluster'],
                'total_liters'       => $liters,
                'total_cubic_meters' => (float)$row['total_cubic_meters'],
                'mean_daily_liters'  => round($nodeDailyMean, 2),
                'peak_flow_rate_lpm' => (float)$row['peak_flow_rate_lpm'],
                'rdi_score'          => $rdi,
                'equity_status'      => $status
            ];
        }

        echo json_encode([
            "success" => true,
            "data" => [
                "report_title" => "BAWASA Community Water Distribution & Equity Report",
                "period" => ["start_date" => $startDate, "end_date" => $endDate, "total_days" => $daysCount],
                "community_summary" => [
                    "total_community_liters"      => round($totalCommunityLiters, 2),
                    "total_cubic_meters"          => round($totalCommunityLiters / 1000.0, 3),
                    "community_mean_daily_liters" => round($meanDailyLiters, 2),
                    "disadvantaged_nodes_count"   => $disadvantagedCount
                ],
                "household_breakdown" => $householdBreakdown
            ]
        ], JSON_PRETTY_PRINT);
    }

    // 2. GET /api/v1/reports/leaks
    public function getLeakLossReport(): void
    {
        header('Content-Type: application/json');
        RoleMiddleware::enforce(UserRole::ADMIN);

        $startDate = $_GET['start_date'] ?? date('Y-m-d', strtotime('-30 days'));
        $endDate   = $_GET['end_date'] ?? date('Y-m-d');

        $stmt = $this->db->prepare(
            "SELECT t.incident_id, t.node_id, t.status, t.detected_at, t.resolved_at,
                    act.incident_type, act.severity_level,
                    act.academic_classification, act.academic_term, act.display_name,
                    n.household_label, n.purok_cluster,
                    TIMESTAMPDIFF(MINUTE, t.detected_at, COALESCE(t.resolved_at, NOW())) as duration_minutes
             FROM incident_ticket t
             JOIN monitoring_node n ON t.node_id = n.node_id
             JOIN action_card_templates act ON t.template_id = act.template_id
             WHERE DATE(t.detected_at) BETWEEN :start AND :end
             ORDER BY t.detected_at DESC"
        );
        $stmt->execute([':start' => $startDate, ':end' => $endDate]);
        $incidents = $stmt->fetchAll();

        $totalLeaks = 0;
        $cancelledFalseAlarms = 0;
        $totalLossLiters = 0.0;
        $resolutionMinutesSum = 0;
        $resolvedCount = 0;

        foreach ($incidents as $inc) {
            if ($inc['status'] === 'CANCELLED') {
                $cancelledFalseAlarms++;
                continue;
            }

            if ($inc['incident_type'] === 'CRITICAL_LEAK') {
                $totalLeaks++;
                $duration = (int)$inc['duration_minutes'];
                $loss = $duration * 3.4; // Average 3.4 L/min leak velocity approximation
                $totalLossLiters += $loss;
            }

            if ($inc['resolved_at'] !== null) {
                $resolutionMinutesSum += (int)$inc['duration_minutes'];
                $resolvedCount++;
            }
        }

        $mttrMinutes = $resolvedCount > 0 ? round($resolutionMinutesSum / $resolvedCount, 1) : 0.0;

        echo json_encode([
            "success" => true,
            "data" => [
                "report_title" => "Non-Revenue Water (NRW) Leak Loss & Response Analysis",
                "period" => ["start_date" => $startDate, "end_date" => $endDate],
                "leak_loss_summary" => [
                    "total_leaks_detected"        => $totalLeaks,
                    "false_alarms_dismissed"      => $cancelledFalseAlarms,
                    "estimated_water_lost_liters" => round($totalLossLiters, 2),
                    "estimated_cubic_meters_lost" => round($totalLossLiters / 1000.0, 3),
                    "mean_time_to_repair_minutes" => $mttrMinutes
                ],
                "incidents" => $incidents
            ]
        ], JSON_PRETTY_PRINT);
    }

    // 3. GET /api/v1/reports/maintenance
    public function getMaintenanceReport(): void
    {
        header('Content-Type: application/json');
        RoleMiddleware::enforce(UserRole::ADMIN);

        $stmt = $this->db->query(
            "SELECT u.user_id, u.full_name as technician_name,
                    COUNT(t.incident_id) as total_assigned,
                    SUM(CASE WHEN t.status = 'CLOSED_VERIFIED' THEN 1 ELSE 0 END) as completed_verified,
                    SUM(CASE WHEN t.status = 'REPAIR_FAILED' THEN 1 ELSE 0 END) as failed_inspections,
                    SUM(CASE WHEN t.status IN ('DISPATCHED', 'PENDING_VERIFICATION') THEN 1 ELSE 0 END) as in_progress
             FROM user_account u
             LEFT JOIN incident_ticket t ON u.user_id = t.assigned_technician_id
             WHERE u.role = 'technician'
             GROUP BY u.user_id, u.full_name
             ORDER BY completed_verified DESC"
        );
        $techStats = $stmt->fetchAll();

        echo json_encode([
            "success" => true,
            "data" => [
                "report_title" => "Field Maintenance & Technician Performance Report",
                "technicians"  => $techStats
            ]
        ], JSON_PRETTY_PRINT);
    }

    // 4. GET /api/v1/reports/export (Supports all 4 export types: consumption, leaks, maintenance, audit)
    public function exportCsv(): void
    {
        RoleMiddleware::enforce(UserRole::ADMIN);
        $type = strtolower($_GET['type'] ?? 'consumption');

        $filename = "AQUILA_" . strtoupper($type) . "_REPORT_" . date('Ymd_His') . ".csv";
        header('Content-Type: text/csv; charset=utf-8');
        header("Content-Disposition: attachment; filename=\"{$filename}\"");

        $output = fopen('php://output', 'w');

        if ($type === 'leaks') {
            fputcsv($output, ['Incident ID', 'Node ID', 'Household Label', 'Incident Type', 'Severity', 'Academic Term', 'Display Title', 'Status', 'Detected At', 'Resolved At', 'Duration (Mins)']);
            $stmt = $this->db->query(
                "SELECT t.incident_id, t.node_id, n.household_label, act.incident_type, act.severity_level, 
                        act.academic_term, act.display_name, t.status, t.detected_at, t.resolved_at,
                        TIMESTAMPDIFF(MINUTE, t.detected_at, COALESCE(t.resolved_at, NOW()))
                 FROM incident_ticket t
                 JOIN monitoring_node n ON t.node_id = n.node_id
                 JOIN action_card_templates act ON t.template_id = act.template_id
                 ORDER BY t.detected_at DESC"
            );
            while ($row = $stmt->fetch(PDO::FETCH_NUM)) {
                fputcsv($output, $row);
            }
        } elseif ($type === 'maintenance') {
            fputcsv($output, ['Technician ID', 'Technician Name', 'Total Assigned Work Orders', 'Verified Completed Repairs', 'Failed Inspection Repairs', 'In-Progress Tasks']);
            $stmt = $this->db->query(
                "SELECT u.user_id, u.full_name,
                        COUNT(t.incident_id),
                        SUM(CASE WHEN t.status = 'CLOSED_VERIFIED' THEN 1 ELSE 0 END),
                        SUM(CASE WHEN t.status = 'REPAIR_FAILED' THEN 1 ELSE 0 END),
                        SUM(CASE WHEN t.status IN ('DISPATCHED', 'PENDING_VERIFICATION') THEN 1 ELSE 0 END)
                 FROM user_account u
                 LEFT JOIN incident_ticket t ON u.user_id = t.assigned_technician_id
                 WHERE u.role = 'technician'
                 GROUP BY u.user_id, u.full_name
                 ORDER BY u.user_id ASC"
            );
            while ($row = $stmt->fetch(PDO::FETCH_NUM)) {
                fputcsv($output, $row);
            }
        } elseif ($type === 'audit') {
            fputcsv($output, ['Log ID', 'Incident ID', 'Actor ID', 'Actor Name', 'Actor Role', 'Action Executed', 'Client IP', 'Remarks', 'Execution Timestamp']);
            $stmt = $this->db->query(
                "SELECT a.log_id, COALESCE(a.incident_id, 'N/A'), a.performed_by, u.full_name, u.role, a.action_taken, a.client_ip, COALESCE(a.remarks, ''), a.logged_at
                 FROM audit_log_entry a
                 JOIN user_account u ON a.performed_by = u.user_id
                 ORDER BY a.logged_at DESC"
            );
            while ($row = $stmt->fetch(PDO::FETCH_NUM)) {
                fputcsv($output, $row);
            }
        } else {
            fputcsv($output, ['Node ID', 'Household Label', 'Purok Cluster', 'Total Liters', 'Cubic Meters (m3)', 'Peak Flow (L/min)']);
            $stmt = $this->db->query(
                "SELECT h.node_id, n.household_label, n.purok_cluster,
                        ROUND(SUM(h.total_volume_liters), 2),
                        ROUND(SUM(h.total_volume_liters) / 1000.0, 3),
                        ROUND(MAX(h.peak_flow_rate_lpm), 2)
                 FROM hourly_summary h
                 JOIN monitoring_node n ON h.node_id = n.node_id
                 GROUP BY h.node_id, n.household_label, n.purok_cluster
                 ORDER BY h.node_id ASC"
            );
            while ($row = $stmt->fetch(PDO::FETCH_NUM)) {
                fputcsv($output, $row);
            }
        }

        fclose($output);
        exit;
    }
}
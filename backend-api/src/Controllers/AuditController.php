<?php
declare(strict_types=1);

namespace Aquila\Controllers;

use Aquila\Config\Database;
use Aquila\Domain\Enums\UserRole;
use Aquila\Middleware\RoleMiddleware;
use PDO;

class AuditController
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getConnection();
    }

    // GET /api/v1/audit-logs
    public function listAuditLogs(): void
    {
        header('Content-Type: application/json');
        RoleMiddleware::enforce(UserRole::ADMIN);

        // Chapter III: Filter audit records by user, incident, or action
        $userId     = isset($_GET['user_id']) ? (int)$_GET['user_id'] : null;
        $incidentId = isset($_GET['incident_id']) ? trim((string)$_GET['incident_id']) : null;
        $action     = isset($_GET['action']) ? trim((string)$_GET['action']) : null;
        $limit      = min(100, max(10, isset($_GET['limit']) ? (int)$_GET['limit'] : 50));

        $sql = "SELECT a.log_id, a.incident_id, a.performed_by, a.action_taken, a.client_ip, a.remarks, a.logged_at,
                       u.full_name AS performed_by_name, u.role AS performed_by_role
                FROM audit_log_entry a
                JOIN user_account u ON a.performed_by = u.user_id
                WHERE 1=1";
        
        $params = [];
        if ($userId) {
            $sql .= " AND a.performed_by = :user_id";
            $params[':user_id'] = $userId;
        }
        if ($incidentId) {
            $sql .= " AND a.incident_id = :incident_id";
            $params[':incident_id'] = $incidentId;
        }
        if ($action) {
            $sql .= " AND a.action_taken = :action";
            $params[':action'] = $action;
        }

        $sql .= " ORDER BY a.logged_at DESC LIMIT :limit";

        $stmt = $this->db->prepare($sql);
        foreach ($params as $k => $v) {
            $stmt->bindValue($k, $v);
        }
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();

        $logs = $stmt->fetchAll();

        echo json_encode([
            "success" => true,
            "data" => [
                "total_records" => count($logs),
                "audit_logs"    => $logs
            ]
        ], JSON_PRETTY_PRINT);
    }
}
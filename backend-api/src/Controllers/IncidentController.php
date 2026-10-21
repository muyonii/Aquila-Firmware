<?php
declare(strict_types=1);

namespace Aquila\Controllers;

use Aquila\Config\AppConfig;
use Aquila\Config\Database;
use Aquila\Domain\Entities\IncidentTicket;
use Aquila\Domain\Enums\IncidentSeverity;
use Aquila\Domain\Enums\IncidentStatus;
use Aquila\Domain\Enums\UserRole;
use Aquila\Domain\ValueObjects\FlowRate;
use Aquila\Infrastructure\Repositories\MySQLIncidentRepository;
use Aquila\Middleware\JwtAuthMiddleware;
use Aquila\Middleware\RoleMiddleware;
use Aquila\Services\AuditLogger;
use Aquila\Services\NotificationDispatchService;
use Aquila\Services\RepairVerificationService;
use Aquila\Utils\Uuid;
use PDO;

class IncidentController
{
    private PDO $db;
    private MySQLIncidentRepository $incidentRepo;
    private RepairVerificationService $verificationService;

    public function __construct()
    {
        $this->db = Database::getConnection();
        $this->incidentRepo = new MySQLIncidentRepository($this->db);
        $this->verificationService = new RepairVerificationService();
    }

    private function json(int $status, array $data): void
    {
        http_response_code($status);
        header('Content-Type: application/json');
        echo json_encode($data, JSON_PRETTY_PRINT);
        exit;
    }

    // 1. GET /api/v1/incidents
    public function listIncidents(): void
    {
        $user = JwtAuthMiddleware::authenticate();
        $role = $user['role'];
        $activeOnly = isset($_GET['active']) && ($_GET['active'] === '1' || $_GET['active'] === 'true');

        if ($activeOnly && $role === UserRole::ADMIN->value) {
            $stmt = $this->db->query("SELECT * FROM v_active_incident_queue ORDER BY detected_at DESC");
            $this->json(200, ["success" => true, "data" => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
        }

        $baseSql = "SELECT t.*, act.incident_type, act.severity_level, act.academic_classification, 
                           act.academic_term, act.display_name, act.action_card_title, act.action_directive,
                           n.household_label, n.location_name, n.purok_cluster, u.full_name AS assigned_technician_name
                    FROM incident_ticket t 
                    JOIN monitoring_node n ON t.node_id = n.node_id
                    JOIN action_card_templates act ON t.template_id = act.template_id
                    LEFT JOIN user_account u ON t.assigned_technician_id = u.user_id";

        if ($role === UserRole::TECHNICIAN->value) {
            $stmt = $this->db->prepare($baseSql . " WHERE t.assigned_technician_id = :id ORDER BY FIELD(t.status, 'DISPATCHED', 'PENDING_VERIFICATION', 'REPAIR_FAILED', 'OPEN', 'CLOSED_VERIFIED', 'CANCELLED'), t.detected_at DESC");
            $stmt->execute([':id' => $user['user_id']]);
        } elseif ($role === UserRole::RESIDENT->value) {
            $stmt = $this->db->prepare($baseSql . " WHERE t.node_id = :id ORDER BY t.detected_at DESC");
            $stmt->execute([':id' => (string)($user['assigned_node_id'] ?? '')]);
        } else {
            $stmt = $this->db->query($baseSql . " ORDER BY FIELD(t.status, 'OPEN', 'REPAIR_FAILED', 'DISPATCHED', 'PENDING_VERIFICATION', 'CLOSED_VERIFIED', 'CANCELLED'), t.detected_at DESC");
        }

        $this->json(200, ["success" => true, "data" => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    }

    // 2. GET /api/v1/incidents/{id}
    public function getIncidentDetails(string $id): void
    {
        JwtAuthMiddleware::authenticate();
        $stmt = $this->db->prepare(
            "SELECT t.*, act.incident_type, act.severity_level, act.academic_classification, 
                    act.academic_term, act.display_name, act.action_card_title, act.action_directive,
                    n.household_label, n.location_name, n.purok_cluster, n.latitude, n.longitude, 
                    u.full_name AS assigned_technician_name
             FROM incident_ticket t 
             JOIN monitoring_node n ON t.node_id = n.node_id
             JOIN action_card_templates act ON t.template_id = act.template_id
             LEFT JOIN user_account u ON t.assigned_technician_id = u.user_id 
             WHERE t.incident_id = :id LIMIT 1"
        );
        $stmt->execute([':id' => $id]);
        $ticket = $stmt->fetch();

        if (!$ticket) {
            $this->json(404, ["success" => false, "error" => ["code" => "NOT_FOUND", "message" => "Incident not found."]]);
        }

        $histStmt = $this->db->prepare(
            "SELECT h.*, u.full_name AS changed_by_name
             FROM incident_status_history h
             LEFT JOIN user_account u ON h.changed_by_user_id = u.user_id
             WHERE h.incident_id = :id
             ORDER BY h.created_at ASC"
        );
        $histStmt->execute([':id' => $id]);
        $history = $histStmt->fetchAll();

        $this->json(200, [
            "success" => true, 
            "data" => [
                "incident"       => $ticket, 
                "status_history" => $history
            ]
        ]);
    }

    // 3. POST /api/v1/incidents (Manual Citizen Complaint Entry)
    public function createManualIncident(): void
    {
        $user = JwtAuthMiddleware::authenticate();
        $data = json_decode(file_get_contents('php://input'), true) ?? [];
        $nodeId = trim((string)($data['node_id'] ?? ($user['assigned_node_id'] ?? '')));
        $notes = trim((string)($data['complaint_notes'] ?? 'Citizen walk-in complaint reported at BAWASA hall.'));

        if (empty($nodeId)) {
            $this->json(400, ["success" => false, "error" => ["code" => "MISSING_NODE", "message" => "node_id is required."]]);
        }

        $nodeExists = $this->db->prepare("SELECT COUNT(*) FROM monitoring_node WHERE node_id = :id");
        $nodeExists->execute([':id' => $nodeId]);
        if ((int)$nodeExists->fetchColumn() === 0) {
            $this->json(404, ["success" => false, "error" => ["code" => "NODE_NOT_FOUND", "message" => "Node does not exist."]]);
        }

        $severityStr = (string)($data['severity_level'] ?? 'P1');
        $severity = IncidentSeverity::tryFrom($severityStr) ?? IncidentSeverity::P1;
        $incidentType = (string)($data['incident_type'] ?? 'CRITICAL_LEAK');

        $tplStmt = $this->db->prepare(
            "SELECT template_id FROM action_card_templates 
             WHERE incident_type = :type AND severity_level = :sev LIMIT 1"
        );
        $tplStmt->execute([':type' => $incidentType, ':sev' => $severity->value]);
        $templateId = (int)($tplStmt->fetchColumn() ?: 1);

        $incidentId = Uuid::v4();

        $ticket = new IncidentTicket(
            incidentId: $incidentId,
            nodeId: $nodeId,
            templateId: $templateId,
            severityLevel: $severity,
            detectedAt: date('Y-m-d H:i:s'),
            status: IncidentStatus::OPEN,
            repairNotes: "[Manual Complaint]: " . $notes
        );
        
        $actorId = (int)($user['user_id'] ?? 1);
        $this->incidentRepo->save($ticket, $actorId);

        if ($severity === IncidentSeverity::P1) {
            $notifService = new NotificationDispatchService($this->db);
            $notifService->notifyBurstAlert($ticket);
        }

        AuditLogger::log('INCIDENT_MANUALLY_CREATED', $actorId, $ticket->incidentId, "Manual report on {$nodeId}: {$notes}");

        $this->json(201, [
            "success" => true, 
            "data" => [
                "incident_id"    => $ticket->incidentId, 
                "node_id"        => $nodeId, 
                "status"         => "OPEN", 
                "severity_level" => $severity->value
            ]
        ]);
    }

    // 4. POST /api/v1/incidents/{id}/dispatch
    public function dispatchTechnician(string $id): void
    {
        $admin = RoleMiddleware::enforce(UserRole::ADMIN);
        $techId = (int)(json_decode(file_get_contents('php://input'), true)['technician_id'] ?? 0);

        $techCheck = $this->db->prepare("SELECT role FROM user_account WHERE user_id = :id");
        $techCheck->execute([':id' => $techId]);
        if ($techCheck->fetchColumn() !== UserRole::TECHNICIAN->value) {
            $this->json(400, ["success" => false, "error" => ["code" => "INVALID_TECHNICIAN", "message" => "Assigned user is not an active technician."]]);
        }

        $ticket = $this->incidentRepo->findById($id);
        if (!$ticket) {
            $this->json(400, ["success" => false, "error" => ["code" => "CANNOT_DISPATCH", "message" => "Ticket not found."]]);
        }

        try {
            $ticket->dispatchTo($techId);
        } catch (\InvalidArgumentException $e) {
            $this->json(400, ["success" => false, "error" => ["code" => "CANNOT_DISPATCH", "message" => $e->getMessage()]]);
        }

        $this->incidentRepo->save($ticket, (int)$admin['user_id']);

        $notifService = new NotificationDispatchService($this->db);
        $notifService->notifyTechnicianDispatched($ticket, $techId);

        AuditLogger::log('TICKET_DISPATCHED', (int)$admin['user_id'], $id, "Assigned to technician ID {$techId}");
        $this->json(200, ["success" => true, "data" => ["incident_id" => $id, "status" => "DISPATCHED", "assigned_to" => $techId]]);
    }

    // 5. PATCH /api/v1/incidents/{id}/cancel
    public function cancelIncident(string $id): void
    {
        $admin = RoleMiddleware::enforce(UserRole::ADMIN);
        $reason = trim((string)(json_decode(file_get_contents('php://input'), true)['cancellation_reason'] ?? 'False alarm verified.'));

        $ticket = $this->incidentRepo->findById($id);
        if (!$ticket) {
            $this->json(400, ["success" => false, "error" => ["code" => "CANNOT_CANCEL", "message" => "Ticket not found."]]);
        }

        try {
            $ticket->cancel($reason);
        } catch (\InvalidArgumentException $e) {
            $this->json(400, ["success" => false, "error" => ["code" => "CANNOT_CANCEL", "message" => $e->getMessage()]]);
        }

        $this->incidentRepo->save($ticket, (int)$admin['user_id']);

        AuditLogger::log('INCIDENT_CANCELLED', (int)$admin['user_id'], $id, "Dismissed: {$reason}");
        $this->json(200, ["success" => true, "data" => ["incident_id" => $id, "status" => "CANCELLED", "message" => "Incident dismissed."]]);
    }

    // 6. POST /api/v1/incidents/{id}/verify-flow
    public function evaluateVerification(string $id): void
    {
        RoleMiddleware::enforce(UserRole::ADMIN, UserRole::TECHNICIAN);
        
        $ticket = $this->incidentRepo->findById($id);
        if (!$ticket || $ticket->status !== IncidentStatus::PENDING_VERIFICATION) {
            $this->json(400, ["success" => false, "error" => ["code" => "NOT_PENDING", "message" => "Ticket is not in PENDING_VERIFICATION state."]]);
        }

        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        if (isset($body['current_flow_rate_lpm'])) {
            $flowRate = (float)$body['current_flow_rate_lpm'];
        } else {
            $raw = @file_get_contents(AppConfig::getFirebaseUrl() . "/nodes/{$ticket->nodeId}/telemetry.json");
            $flowRate = (float)(json_decode((string)$raw, true)['flow_rate_lpm'] ?? 0.0);
        }

        $since = !empty($ticket->pendingVerificationSince) ? strtotime($ticket->pendingVerificationSince) : time();
        $elapsed = isset($body['elapsed_seconds']) ? (int)$body['elapsed_seconds'] : (time() - $since);

        $newStatus = $this->verificationService->evaluateQuiescentFlow($ticket, new FlowRate($flowRate), $elapsed);

        if ($newStatus !== IncidentStatus::PENDING_VERIFICATION) {
            $this->incidentRepo->save($ticket, 1);

            $notifService = new NotificationDispatchService($this->db);
            if ($newStatus === IncidentStatus::CLOSED_VERIFIED) {
                $notifService->notifyRepairSuccess($ticket);
            } elseif ($newStatus === IncidentStatus::REPAIR_FAILED) {
                $notifService->notifyRepairFailed($ticket);
            }

            AuditLogger::log('REPAIR_' . $newStatus->value, 1, $id, "Verification outcome: {$newStatus->value}");
            $this->json(200, ["success" => true, "data" => ["status" => $newStatus->value, "observed_lpm" => $flowRate]]);
        }

        $this->json(200, [
            "success" => true, 
            "data" => [
                "status"            => "PENDING_VERIFICATION", 
                "remaining_seconds" => $this->verificationService->calculateRemainingSeconds($elapsed), 
                "observed_lpm"      => $flowRate
            ]
        ]);
    }
}
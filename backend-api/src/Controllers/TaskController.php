<?php
declare(strict_types=1);

namespace Aquila\Controllers;

use Aquila\Config\AppConfig;
use Aquila\Config\Database;
use Aquila\Domain\DTOs\SubmitRepairDTO;
use Aquila\Domain\Enums\UserRole;
use Aquila\Infrastructure\Repositories\MySQLIncidentRepository;
use Aquila\Middleware\JwtAuthMiddleware;
use Aquila\Middleware\RoleMiddleware;
use Aquila\Services\AuditLogger;
use Aquila\Services\NotificationDispatchService;
use PDO;

class TaskController
{
    private PDO $db;
    private MySQLIncidentRepository $incidentRepo;

    public function __construct()
    {
        $this->db = Database::getConnection();
        $this->incidentRepo = new MySQLIncidentRepository($this->db);
    }

    private function json(int $status, array $data): void
    {
        http_response_code($status);
        header('Content-Type: application/json');
        echo json_encode($data, JSON_PRETTY_PRINT);
        exit;
    }

    private function syncNodeStatus(string $nodeId, string $status): void
    {
        $this->db->prepare("UPDATE monitoring_node SET status = :status WHERE node_id = :id")
                 ->execute([':status' => $status, ':id' => $nodeId]);

        $firebaseUrl = rtrim(AppConfig::getFirebaseUrl(), '/');
        $ch = curl_init("{$firebaseUrl}/nodes/{$nodeId}/status.json");
        curl_setopt_array($ch, [
            CURLOPT_CUSTOMREQUEST  => 'PUT',
            CURLOPT_POSTFIELDS     => json_encode($status),
            CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 4
        ]);
        curl_exec($ch);
        curl_close($ch);
    }

    // 1. GET /api/v1/tasks (Returns Plumber's Assigned Tasks + Available Unassigned OPEN Calls)
    public function getMyTasks(): void
    {
        $currentUser = RoleMiddleware::enforce(UserRole::TECHNICIAN, UserRole::ADMIN);
        $techId = (int)$currentUser['user_id'];

        $stmt = $this->db->prepare(
            "SELECT t.incident_id, t.node_id, t.assigned_technician_id,
                    act.incident_type, act.severity_level, 
                    act.academic_classification, act.academic_term, act.display_name, 
                    act.action_card_title, act.action_directive,
                    t.detected_at, t.verified_at, t.resolved_at, t.status, t.repair_notes, 
                    t.pending_verification_since,
                    n.household_label, n.location_name, n.purok_cluster, n.latitude, n.longitude,
                    n.is_physical, n.status AS node_status
             FROM incident_ticket t
             JOIN monitoring_node n ON t.node_id = n.node_id
             JOIN action_card_templates act ON t.template_id = act.template_id
             WHERE (t.assigned_technician_id = :tech_id 
                    AND t.status IN ('DISPATCHED', 'PENDING_VERIFICATION', 'REPAIR_FAILED', 'CLOSED_VERIFIED'))
                OR (t.assigned_technician_id IS NULL AND t.status = 'OPEN')
             ORDER BY FIELD(t.status, 'REPAIR_FAILED', 'DISPATCHED', 'OPEN', 'PENDING_VERIFICATION', 'CLOSED_VERIFIED'), 
                      FIELD(act.severity_level, 'P1', 'P2', 'P3'),
                      t.detected_at DESC
             LIMIT 50"
        );
        $stmt->execute([':tech_id' => $techId]);
        $tasks = $stmt->fetchAll();

        $activeCount = count(array_filter(
            $tasks,
            fn($r) => in_array($r['status'], ['DISPATCHED', 'REPAIR_FAILED'], true)
        ));

        $this->json(200, [
            "success" => true,
            "data" => [
                "technician_id"   => $techId,
                "technician_name" => $currentUser['full_name'],
                "active_tasks"    => $activeCount,
                "tasks"           => $tasks
            ]
        ]);
    }

    // 2. POST /api/v1/tasks/{id}/claim (Plumber Self-Claims an Unassigned OPEN Ticket)
    public function claimOpenTask(string $id): void
    {
        $currentUser = RoleMiddleware::enforce(UserRole::TECHNICIAN, UserRole::ADMIN);
        $techId = (int)$currentUser['user_id'];

        $ticket = $this->incidentRepo->findById($id);
        if (!$ticket) {
            $this->json(404, ["success" => false, "error" => ["code" => "TASK_NOT_FOUND", "message" => "Work order not found."]]);
        }

        try {
            $ticket->dispatchTo($techId);
        } catch (\InvalidArgumentException $e) {
            $this->json(400, ["success" => false, "error" => ["code" => "CANNOT_CLAIM", "message" => $e->getMessage()]]);
        }

        $this->incidentRepo->save($ticket, $techId);

        AuditLogger::log(
            'TASK_SELF_CLAIMED',
            $techId,
            $id,
            "Technician {$currentUser['full_name']} self-claimed open work order on {$ticket->nodeId}."
        );

        $this->json(200, [
            "success" => true,
            "data" => [
                "incident_id" => $id,
                "status"      => "DISPATCHED",
                "assigned_to" => $techId,
                "message"     => "Work order claimed and assigned to you."
            ]
        ]);
    }

    // 3. GET /api/v1/tasks/{id}
    public function getTaskDetails(string $id): void
    {
        $currentUser = JwtAuthMiddleware::authenticate();
        $techId = (int)$currentUser['user_id'];
        $isAdmin = ($currentUser['role'] === UserRole::ADMIN->value);

        $stmt = $this->db->prepare(
            "SELECT t.*, act.incident_type, act.severity_level, act.academic_classification, 
                    act.academic_term, act.display_name, act.action_card_title, act.action_directive,
                    n.household_label, n.location_name, n.purok_cluster, n.latitude, n.longitude, 
                    n.is_physical, n.status AS node_status, n.parent_node_id
             FROM incident_ticket t
             JOIN monitoring_node n ON t.node_id = n.node_id
             JOIN action_card_templates act ON t.template_id = act.template_id
             WHERE t.incident_id = :id AND (:is_admin = 1 OR t.assigned_technician_id = :tech_id OR t.status = 'OPEN')
             LIMIT 1"
        );
        $stmt->execute([':id' => $id, ':is_admin' => $isAdmin ? 1 : 0, ':tech_id' => $techId]);
        $task = $stmt->fetch();

        if (!$task) {
            $this->json(404, ["success" => false, "error" => ["code" => "TASK_NOT_FOUND", "message" => "Task not found or not assigned to you."]]);
        }

        $histStmt = $this->db->prepare(
            "SELECT h.*, u.full_name AS changed_by_name
             FROM incident_status_history h
             LEFT JOIN user_account u ON h.changed_by_user_id = u.user_id
             WHERE h.incident_id = :id
             ORDER BY h.created_at ASC"
        );
        $histStmt->execute([':id' => $id]);
        $task['status_history'] = $histStmt->fetchAll();

        $this->json(200, ["success" => true, "data" => $task]);
    }

    // 4. PATCH /api/v1/tasks/{id}/arrive
    public function arriveOnSite(string $id): void
    {
        $currentUser = RoleMiddleware::enforce(UserRole::TECHNICIAN, UserRole::ADMIN);
        $actorId = (int)$currentUser['user_id'];

        $ticket = $this->incidentRepo->findById($id);
        if (!$ticket) {
            $this->json(404, ["success" => false, "error" => ["code" => "TASK_NOT_FOUND", "message" => "Task not found."]]);
        }

        $this->syncNodeStatus($ticket->nodeId, 'MAINTENANCE');

        AuditLogger::log(
            'TECHNICIAN_ARRIVED_ONSITE',
            $actorId,
            $id,
            "Technician arrived at {$ticket->nodeId}. Node switched to MAINTENANCE mode."
        );

        $this->json(200, [
            "success" => true,
            "data" => [
                "incident_id" => $id,
                "node_id"     => $ticket->nodeId,
                "node_status" => "MAINTENANCE",
                "message"     => "Checked in on-site. Meter {$ticket->nodeId} placed in Maintenance Mode."
            ]
        ]);
    }

    // 5. PATCH /api/v1/tasks/{id}/repair
    public function submitRepair(string $id): void
    {
        $currentUser = RoleMiddleware::enforce(UserRole::TECHNICIAN, UserRole::ADMIN);
        $rawBody = json_decode(file_get_contents('php://input'), true) ?? [];

        try {
            $dto = SubmitRepairDTO::fromArray($id, $rawBody);
        } catch (\InvalidArgumentException $e) {
            $this->json(400, ["success" => false, "error" => ["code" => "INVALID_INPUT", "message" => $e->getMessage()]]);
        }

        $ticket = $this->incidentRepo->findById($id);
        if (!$ticket) {
            $this->json(404, ["success" => false, "error" => ["code" => "TASK_NOT_FOUND", "message" => "Task not found."]]);
        }

        try {
            $ticket->submitRepair($dto->repairNotes);
        } catch (\InvalidArgumentException $e) {
            $this->json(400, ["success" => false, "error" => ["code" => "INVALID_STATE", "message" => $e->getMessage()]]);
        }

        $actorId = (int)$currentUser['user_id'];
        $this->incidentRepo->save($ticket, $actorId);

        $this->syncNodeStatus($ticket->nodeId, 'ACTIVE');

        $notifService = new NotificationDispatchService($this->db);
        $notifService->notifyRepairSubmitted($ticket, (string)($currentUser['full_name'] ?? 'Field Technician'));

        AuditLogger::log('REPAIR_SUBMITTED', $actorId, $id, "Submitted repair notes: {$dto->repairNotes}");

        $this->json(200, [
            "success" => true,
            "data" => [
                "incident_id"                 => $id,
                "status"                      => $ticket->status->value,
                "node_status"                 => "ACTIVE",
                "pending_verification_since"  => $ticket->pendingVerificationSince,
                "verification_window_seconds" => AppConfig::getRepairVerificationSeconds(),
                "message"                     => "Repair submitted & node restored to ACTIVE. Initiated 15-minute post-repair observation."
            ]
        ]);
    }
}
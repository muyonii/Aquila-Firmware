<?php
declare(strict_types=1);

namespace Aquila\Controllers;

use Aquila\Config\Database;
use Aquila\Domain\Entities\HourlySummary;
use Aquila\Domain\Entities\IncidentTicket;
use Aquila\Domain\Enums\IncidentSeverity;
use Aquila\Domain\Enums\IncidentStatus;
use Aquila\Domain\ValueObjects\ConsumptionVolume;
use Aquila\Infrastructure\Repositories\MySQLIncidentRepository;
use Aquila\Infrastructure\Repositories\MySQLNodeRepository;
use Aquila\Middleware\JwtAuthMiddleware;
use Aquila\Middleware\RowLevelSecurityMiddleware;
use Aquila\Services\AuditLogger;
use Aquila\Services\NotificationDispatchService;
use Aquila\Utils\Uuid;
use PDO;

class ResidentController
{
    private PDO $db;
    private MySQLNodeRepository $nodeRepo;
    private MySQLIncidentRepository $incidentRepo;

    public function __construct()
    {
        $this->db = Database::getConnection();
        $this->nodeRepo = new MySQLNodeRepository($this->db);
        $this->incidentRepo = new MySQLIncidentRepository($this->db);
    }

    private function json(int $status, array $data): void
    {
        http_response_code($status);
        header('Content-Type: application/json');
        echo json_encode($data, JSON_PRETTY_PRINT);
        exit;
    }

    // 1. GET /api/v1/resident/my-water (Tenant-isolated consumption history)
    public function getMyWater(): void
    {
        $nodeId = RowLevelSecurityMiddleware::enforceTenantIsolation();

        $node = $this->nodeRepo->findById($nodeId);
        if (!$node) {
            $this->json(404, ["success" => false, "error" => ["code" => "NODE_NOT_FOUND", "message" => "Assigned household meter not found."]]);
        }

        $stmt = $this->db->prepare(
            "SELECT * FROM hourly_summary 
             WHERE node_id = :node_id 
             ORDER BY hour_timestamp DESC LIMIT 24"
        );
        $stmt->execute([':node_id' => $nodeId]);
        $rows = $stmt->fetchAll();

        $summaries = array_map(fn($r) => HourlySummary::fromArray($r), $rows);

        $totalVolume = new ConsumptionVolume(0.0);
        foreach ($summaries as $summary) {
            $totalVolume = $totalVolume->add(new ConsumptionVolume($summary->totalVolumeLiters));
        }

        // Fetch baseline profile for resident comparison (Table 3.5)
        $profStmt = $this->db->prepare("SELECT * FROM household_profile WHERE node_id = :node_id LIMIT 1");
        $profStmt->execute([':node_id' => $nodeId]);
        $profile = $profStmt->fetch() ?: null;

        $this->json(200, [
            "success" => true,
            "data" => [
                "node_id"              => $node->nodeId,
                "household_label"      => $node->householdLabel,
                "location_name"        => $node->locationName,
                "purok_cluster"        => $node->purokCluster,
                "node_status"          => $node->status->value,
                "total_24h_liters"     => $totalVolume->liters,
                "total_24h_m3"         => $totalVolume->toCubicMeters(),
                "baseline_profile"     => $profile,
                "hourly_records_count" => count($summaries),
                "history"              => $rows
            ]
        ]);
    }

    // 2. POST /api/v1/resident/concern (Residents submit water concerns -> notifies Admin)
    public function submitConcern(): void
    {
        $currentUser = JwtAuthMiddleware::authenticate();
        $userId = (int)$currentUser['user_id'];
        $nodeId = trim((string)($currentUser['assigned_node_id'] ?? ''));

        if (empty($nodeId)) {
            $this->json(403, ["success" => false, "error" => ["code" => "NO_NODE", "message" => "Account has no assigned meter to file concerns against."]]);
        }

        $data = json_decode(file_get_contents('php://input'), true) ?? [];
        $concernText = trim((string)($data['complaint_notes'] ?? $data['concern'] ?? ''));
        $incidentType = strtoupper(trim((string)($data['incident_type'] ?? 'CRITICAL_LEAK')));
        $severityStr = strtoupper(trim((string)($data['severity_level'] ?? 'P1')));
        $severity = IncidentSeverity::tryFrom($severityStr) ?? IncidentSeverity::P1;

        if (empty($concernText) || strlen($concernText) < 5) {
            $this->json(400, ["success" => false, "error" => ["code" => "INVALID_INPUT", "message" => "Please describe your water concern in detail (min 5 characters)."]]);
        }

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
            repairNotes: "[Resident Concern]: " . $concernText
        );

        $this->incidentRepo->save($ticket, $userId);

        $notifService = new NotificationDispatchService($this->db);
        $notifService->notifyResidentConcern(
            $ticket,
            (string)($currentUser['full_name'] ?? 'Resident'),
            $concernText
        );

        AuditLogger::log('RESIDENT_CONCERN_SUBMITTED', $userId, $incidentId, "Resident filed concern for {$nodeId}: {$concernText}");

        $this->json(201, [
            "success" => true,
            "data" => [
                "incident_id" => $incidentId,
                "node_id"     => $nodeId,
                "status"      => "OPEN",
                "message"     => "Water concern submitted successfully. A BAWASA technician will inspect your service line."
            ]
        ]);
    }
}
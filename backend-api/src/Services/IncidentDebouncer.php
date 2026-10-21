<?php
declare(strict_types=1);

namespace Aquila\Services;

use Aquila\Config\Database;
use Aquila\Domain\Entities\IncidentTicket;
use Aquila\Domain\Enums\IncidentSeverity;
use Aquila\Domain\Enums\IncidentStatus;
use Aquila\Infrastructure\Repositories\MySQLIncidentRepository;
use Aquila\Utils\Uuid;
use PDO;

class IncidentDebouncer
{
    private PDO $db;
    private MySQLIncidentRepository $incidentRepo;

    public function __construct(?PDO $db = null)
    {
        $this->db = $db ?? Database::getConnection();
        $this->incidentRepo = new MySQLIncidentRepository($this->db);
    }

    public function processIncident(array $payload): array
    {
        $nodeId = trim((string)($payload['node_id'] ?? ''));
        $incidentType = (string)($payload['incident_type'] ?? 'CRITICAL_LEAK');
        $severityStr = (string)($payload['severity_level'] ?? 'P1');
        $severity = IncidentSeverity::tryFrom($severityStr) ?? IncidentSeverity::P1;

        if (empty($nodeId)) {
            return ["action" => "REJECTED", "message" => "Missing required field: node_id."];
        }

        // 1. Verify Node Exists
        $nodeCheck = $this->db->prepare("SELECT COUNT(*) FROM monitoring_node WHERE node_id = :id");
        $nodeCheck->execute([':id' => $nodeId]);
        if ((int)$nodeCheck->fetchColumn() === 0) {
            return ["action" => "REJECTED", "message" => "Node '{$nodeId}' is not registered."];
        }

        // 2. Resolve action_card_templates.template_id (Table 3.9)
        $tplStmt = $this->db->prepare(
            "SELECT template_id FROM action_card_templates 
             WHERE incident_type = :type AND severity_level = :sev LIMIT 1"
        );
        $tplStmt->execute([':type' => $incidentType, ':sev' => $severity->value]);
        $templateId = (int)($tplStmt->fetchColumn() ?: 1);

        // 3. Check for existing active ticket
        $existingTicket = $this->incidentRepo->findActiveByNodeId($nodeId);

        if ($existingTicket) {
            $severityRank = ['P1' => 3, 'P2' => 2, 'P3' => 1];
            $newRank = $severityRank[$severity->value] ?? 1;
            $oldRank = $severityRank[$existingTicket->severityLevel->value] ?? 1;

            if ($newRank > $oldRank) {
                // Escalate ticket priority
                $existingTicket->templateId = $templateId;
                $this->incidentRepo->save($existingTicket, 1);

                AuditLogger::log('INCIDENT_ESCALATED', 1, $existingTicket->incidentId, "Escalated to {$severity->value}");
                return [
                    "action" => "ESCALATED",
                    "incident_id" => $existingTicket->incidentId,
                    "message" => "Active ticket escalated to {$severity->value}."
                ];
            }

            return [
                "action" => "DEBOUNCED",
                "incident_id" => $existingTicket->incidentId,
                "message" => "Active ticket already exists. Debounced under Rule BR-03."
            ];
        }

        // 4. Create New Incident Ticket (Table 3.11)
        $suppliedId = isset($payload['incident_id']) ? (string)$payload['incident_id'] : null;
        $incidentId = ($suppliedId !== null && Uuid::isValid($suppliedId)) ? $suppliedId : Uuid::v4();

        $ticket = new IncidentTicket(
            incidentId: $incidentId,
            nodeId: $nodeId,
            templateId: $templateId,
            severityLevel: $severity,
            detectedAt: date('Y-m-d H:i:s'),
            status: IncidentStatus::OPEN
        );

        // Saves to incident_ticket AND logs NULL -> OPEN to incident_status_history
        $this->incidentRepo->save($ticket, 1);

        AuditLogger::log('INCIDENT_CREATED', 1, $incidentId, "Anomaly ticket logged for {$nodeId}");

        return [
            "action" => "CREATED",
            "incident_id" => $incidentId,
            "message" => "Incident ticket successfully registered."
        ];

        $this->incidentRepo->save($ticket, 1);

        // AUTOMATED BURST ALERT (Table 3.13)
        if ($severity === IncidentSeverity::P1) {
            $notifService = new NotificationDispatchService($this->db);
            $notifService->notifyBurstAlert($ticket);
        }
    }
}
<?php
declare(strict_types=1);

namespace Aquila\Controllers;

use Aquila\Config\Database;
use Aquila\Domain\Entities\IncidentTicket;
use Aquila\Domain\Enums\IncidentStatus;
use Aquila\Infrastructure\Repositories\MySQLIncidentRepository;
use Aquila\Middleware\WebhookSignatureMiddleware;
use Aquila\Services\AuditLogger;
use Aquila\Services\IncidentDebouncer;
use PDO;

class WebhookController
{
    private PDO $db;
    private MySQLIncidentRepository $incidentRepo;

    public function __construct()
    {
        $this->db = Database::getConnection();
        $this->incidentRepo = new MySQLIncidentRepository($this->db);
    }

    public function handleIncident(): void
    {
        header('Content-Type: application/json');

        // 1. Enforce HMAC-SHA256 Signature and 300s Replay Verification
        $rawPayload = WebhookSignatureMiddleware::verify();
        $event = json_decode((string)$rawPayload, true);

        if (!$event || !isset($event['payload'])) {
            http_response_code(400);
            echo json_encode([
                "success" => false,
                "error" => ["code" => "MALFORMED_EVENT", "message" => "Invalid event payload structure."]
            ]);
            return;
        }

        $eventType = $event['event_type'] ?? 'INCIDENT_DETECTED';
        $payload   = (array)$event['payload'];
        $nodeId    = trim((string)($payload['node_id'] ?? ''));

        // 2. Handle INCIDENT_CLEARED from CoordinatorAgent (Water Flow Normalized)
        if ($eventType === 'INCIDENT_CLEARED') {
            $activeTicket = $this->incidentRepo->findActiveByNodeId($nodeId);

            if ($activeTicket) {
                $prevStatus = $activeTicket->status->value;
                $activeTicket->status = IncidentStatus::CLOSED_VERIFIED;
                $activeTicket->resolvedAt = date('Y-m-d H:i:s');
                $activeTicket->verifiedAt = date('Y-m-d H:i:s');
                $activeTicket->repairNotes = ($activeTicket->repairNotes ? $activeTicket->repairNotes . "\n" : '') 
                    . "[Coordinator Agent]: Flow normalized back to baseline. Anomaly resolved automatically.";

                $this->incidentRepo->save($activeTicket, 1);

                AuditLogger::log(
                    'INCIDENT_AUTO_RESOLVED', 
                    1, 
                    $activeTicket->incidentId, 
                    "Coordinator Agent cleared active incident on {$nodeId} (Flow normalized)."
                );

                http_response_code(200);
                echo json_encode([
                    "success" => true,
                    "data" => [
                        "action"      => "CLEARED",
                        "incident_id" => $activeTicket->incidentId,
                        "message"     => "Incident auto-resolved as flow returned to baseline."
                    ]
                ], JSON_PRETTY_PRINT);
                return;
            }

            http_response_code(200);
            echo json_encode([
                "success" => true,
                "data" => ["action" => "NO_OP", "message" => "No active ticket found to clear on node {$nodeId}."]
            ], JSON_PRETTY_PRINT);
            return;
        }

        // 3. Handle INCIDENT_DETECTED (Delegate to Rule BR-03 Debouncer)
        $debouncer = new IncidentDebouncer($this->db);
        $result = $debouncer->processIncident($payload);

        http_response_code(200);
        echo json_encode([
            "success" => true,
            "data" => $result
        ], JSON_PRETTY_PRINT);
    }
}
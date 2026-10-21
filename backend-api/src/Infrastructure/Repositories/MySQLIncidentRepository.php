<?php
declare(strict_types=1);

namespace Aquila\Infrastructure\Repositories;

use Aquila\Config\Database;
use Aquila\Domain\Entities\IncidentTicket;
use Aquila\Domain\Repositories\IncidentRepositoryInterface;
use PDO;

class MySQLIncidentRepository implements IncidentRepositoryInterface
{
    private PDO $db;

    public function __construct(?PDO $db = null)
    {
        $this->db = $db ?? Database::getConnection();
    }

    public function findById(string $incidentId): ?IncidentTicket
    {
        $stmt = $this->db->prepare(
            "SELECT t.*, act.incident_type, act.severity_level, act.academic_classification, 
                    act.academic_term, act.display_name, act.action_card_title, act.action_directive
             FROM incident_ticket t
             JOIN action_card_templates act ON t.template_id = act.template_id
             WHERE t.incident_id = :id LIMIT 1"
        );
        $stmt->execute([':id' => $incidentId]);
        $row = $stmt->fetch();

        return $row ? IncidentTicket::fromArray($row) : null;
    }

    public function findActiveByNodeId(string $nodeId): ?IncidentTicket
    {
        $stmt = $this->db->prepare(
            "SELECT t.*, act.incident_type, act.severity_level, act.academic_classification, 
                    act.academic_term, act.display_name, act.action_card_title, act.action_directive
             FROM incident_ticket t
             JOIN action_card_templates act ON t.template_id = act.template_id
             WHERE t.node_id = :node_id 
               AND t.status IN ('OPEN', 'DISPATCHED', 'PENDING_VERIFICATION') 
             LIMIT 1"
        );
        $stmt->execute([':node_id' => $nodeId]);
        $row = $stmt->fetch();

        return $row ? IncidentTicket::fromArray($row) : null;
    }

    public function save(IncidentTicket $incident, ?int $changedByUserId = null): void
    {
        // 1. Fetch current status before upserting to detect state changes (Table 3.10)
        $stmtPrev = $this->db->prepare("SELECT status FROM incident_ticket WHERE incident_id = :id");
        $stmtPrev->execute([':id' => $incident->incidentId]);
        $prevStatus = $stmtPrev->fetchColumn(); // false if new ticket, string if existing

        // 2. Upsert incident_ticket
        $stmt = $this->db->prepare(
            "INSERT INTO incident_ticket 
             (incident_id, node_id, template_id, assigned_technician_id, status, detected_at, 
              verified_at, pending_verification_since, resolved_at, repair_notes)
             VALUES (:id, :node_id, :template_id, :tech_id, :status, :detected_at, 
                     :verified_at, :pending_since, :resolved_at, :notes)
             ON DUPLICATE KEY UPDATE
                 template_id                = VALUES(template_id),
                 assigned_technician_id     = VALUES(assigned_technician_id),
                 status                     = VALUES(status),
                 verified_at                = VALUES(verified_at),
                 pending_verification_since = VALUES(pending_verification_since),
                 resolved_at                = VALUES(resolved_at),
                 repair_notes               = VALUES(repair_notes)"
        );

        $stmt->execute([
            ':id'            => $incident->incidentId,
            ':node_id'       => $incident->nodeId,
            ':template_id'   => $incident->templateId,
            ':tech_id'       => $incident->assignedTechnicianId,
            ':status'        => $incident->status->value,
            ':detected_at'   => $incident->detectedAt,
            ':verified_at'   => $incident->verifiedAt,
            ':pending_since' => $incident->pendingVerificationSince,
            ':resolved_at'   => $incident->resolvedAt,
            ':notes'         => $incident->repairNotes
        ]);

        // 3. Log to incident_status_history whenever ticket is created or status transitions
        if ($prevStatus === false || $prevStatus !== $incident->status->value) {
            $hist = $this->db->prepare(
                "INSERT INTO incident_status_history 
                 (incident_id, previous_status, new_status, changed_by_user_id, notes, created_at)
                 VALUES (:inc_id, :prev_status, :new_status, :user_id, :notes, NOW())"
            );
            $hist->execute([
                ':inc_id'      => $incident->incidentId,
                ':prev_status' => $prevStatus !== false ? $prevStatus : null,
                ':new_status'  => $incident->status->value,
                ':user_id'     => $changedByUserId,
                ':notes'       => $incident->repairNotes
            ]);
        }
    }

    public function findAll(): array
    {
        $stmt = $this->db->query(
            "SELECT t.*, act.incident_type, act.severity_level, act.academic_classification, 
                    act.academic_term, act.display_name, act.action_card_title, act.action_directive
             FROM incident_ticket t
             JOIN action_card_templates act ON t.template_id = act.template_id
             ORDER BY t.detected_at DESC"
        );
        return array_map(fn($row) => IncidentTicket::fromArray($row), $stmt->fetchAll());
    }
}
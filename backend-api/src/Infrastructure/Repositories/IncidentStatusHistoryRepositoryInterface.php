<?php
declare(strict_types=1);

namespace Aquila\Infrastructure\Repositories;

use Aquila\Config\Database;
use Aquila\Domain\Entities\IncidentStatusHistory;
use Aquila\Domain\Repositories\IncidentStatusHistoryRepositoryInterface;
use PDO;

class MySQLIncidentStatusHistoryRepository implements IncidentStatusHistoryRepositoryInterface
{
    private PDO $db;

    public function __construct(?PDO $db = null)
    {
        $this->db = $db ?? Database::getConnection();
    }

    public function recordTransition(
        string $incidentId, 
        ?string $previousStatus, 
        string $newStatus, 
        ?int $changedByUserId = null, 
        ?string $notes = null
    ): IncidentStatusHistory {
        $stmt = $this->db->prepare(
            "INSERT INTO incident_status_history 
             (incident_id, previous_status, new_status, changed_by_user_id, notes, created_at)
             VALUES (:incident_id, :prev_status, :new_status, :user_id, :notes, NOW())"
        );
        $stmt->execute([
            ':incident_id'  => $incidentId,
            ':prev_status' => $previousStatus,
            ':new_status'  => $newStatus,
            ':user_id'     => $changedByUserId,
            ':notes'       => $notes
        ]);

        $historyId = (int)$this->db->lastInsertId();

        return new IncidentStatusHistory(
            historyId: $historyId,
            incidentId: $incidentId,
            previousStatus: $previousStatus,
            newStatus: $newStatus,
            changedByUserId: $changedByUserId,
            notes: $notes,
            createdAt: date('Y-m-d H:i:s')
        );
    }

    /**
     * @return IncidentStatusHistory[]
     */
    public function findByIncidentId(string $incidentId): array
    {
        $stmt = $this->db->prepare(
            "SELECT h.*, u.full_name AS changed_by_name
             FROM incident_status_history h
             LEFT JOIN user_account u ON h.changed_by_user_id = u.user_id
             WHERE h.incident_id = :id
             ORDER BY h.created_at ASC"
        );
        $stmt->execute([':id' => $incidentId]);

        return array_map(fn($row) => IncidentStatusHistory::fromArray($row), $stmt->fetchAll());
    }
}
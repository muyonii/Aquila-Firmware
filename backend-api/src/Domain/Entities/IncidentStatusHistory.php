<?php
declare(strict_types=1);

namespace Aquila\Domain\Entities;

readonly class IncidentStatusHistory
{
    public function __construct(
        public ?int $historyId,
        public string $incidentId,
        public ?string $previousStatus,
        public string $newStatus,
        public ?int $changedByUserId,
        public ?string $notes = null,
        public ?string $createdAt = null,
        public ?string $changedByName = null // Joined user full_name for UI display
    ) {}

    public static function fromArray(array $row): self
    {
        return new self(
            historyId: isset($row['history_id']) ? (int)$row['history_id'] : null,
            incidentId: (string)$row['incident_id'],
            previousStatus: isset($row['previous_status']) ? (string)$row['previous_status'] : null,
            newStatus: (string)$row['new_status'],
            changedByUserId: isset($row['changed_by_user_id']) ? (int)$row['changed_by_user_id'] : null,
            notes: isset($row['notes']) ? (string)$row['notes'] : null,
            createdAt: isset($row['created_at']) ? (string)$row['created_at'] : null,
            changedByName: isset($row['changed_by_name']) ? (string)$row['changed_by_name'] : null
        );
    }

    public function toArray(): array
    {
        return [
            'history_id'         => $this->historyId,
            'incident_id'        => $this->incidentId,
            'previous_status'    => $this->previousStatus,
            'new_status'         => $this->newStatus,
            'changed_by_user_id' => $this->changedByUserId,
            'changed_by_name'    => $this->changedByName,
            'notes'              => $this->notes,
            'created_at'         => $this->createdAt
        ];
    }
}
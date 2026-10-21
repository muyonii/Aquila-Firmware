<?php
declare(strict_types=1);

namespace Aquila\Domain\Entities;

readonly class AuditLogEntry
{
    public function __construct(
        public ?int $logId,
        public ?string $incidentId,
        public int $performedBy,
        public string $actionTaken,
        public string $clientIp,
        public ?string $remarks,
        public string $loggedAt,
        public ?string $performedByName = null,
        public ?string $performedByRole = null
    ) {}

    public static function fromArray(array $row): self
    {
        return new self(
            logId: isset($row['log_id']) ? (int)$row['log_id'] : null,
            incidentId: isset($row['incident_id']) ? (string)$row['incident_id'] : null,
            performedBy: (int)$row['performed_by'],
            actionTaken: (string)$row['action_taken'],
            clientIp: (string)$row['client_ip'],
            remarks: isset($row['remarks']) ? (string)$row['remarks'] : null,
            loggedAt: (string)$row['logged_at'],
            performedByName: isset($row['performed_by_name']) ? (string)$row['performed_by_name'] : null,
            performedByRole: isset($row['performed_by_role']) ? (string)$row['performed_by_role'] : null
        );
    }

    public function toArray(): array
    {
        return [
            'log_id'            => $this->logId,
            'incident_id'       => $this->incidentId,
            'performed_by'      => $this->performedBy,
            'performed_by_name' => $this->performedByName,
            'performed_by_role' => $this->performedByRole,
            'action_taken'      => $this->actionTaken,
            'client_ip'         => $this->clientIp,
            'remarks'           => $this->remarks,
            'logged_at'         => $this->loggedAt
        ];
    }
}
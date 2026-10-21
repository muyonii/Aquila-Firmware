<?php
declare(strict_types=1);

namespace Aquila\Domain\DTOs;

use Aquila\Utils\Uuid;
use InvalidArgumentException;

readonly class DispatchTechnicianDTO
{
    public function __construct(
        public string $incidentId,
        public int $technicianId
    ) {}

    public static function fromArray(string $incidentId, array $body): self
    {
        $cleanIncidentId = trim($incidentId);
        if (empty($cleanIncidentId) || !Uuid::isValid($cleanIncidentId)) {
            throw new InvalidArgumentException("A valid canonical UUIDv4 incident_id is required.");
        }

        $techId = (int)($body['technician_id'] ?? 0);
        if ($techId <= 0) {
            throw new InvalidArgumentException("A valid positive technician_id is required.");
        }

        return new self(
            incidentId: $cleanIncidentId,
            technicianId: $techId
        );
    }
}
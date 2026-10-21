<?php
declare(strict_types=1);

namespace Aquila\Domain\DTOs;

use Aquila\Utils\Uuid;
use InvalidArgumentException;

readonly class SubmitRepairDTO
{
    public function __construct(
        public string $incidentId,
        public string $repairNotes
    ) {}

    public static function fromArray(string $incidentId, array $body): self
    {
        $cleanIncidentId = trim($incidentId);
        if (empty($cleanIncidentId) || !Uuid::isValid($cleanIncidentId)) {
            throw new InvalidArgumentException("A valid canonical UUIDv4 incident_id is required.");
        }

        $notes = trim((string)($body['repair_notes'] ?? ''));
        if (empty($notes)) {
            throw new InvalidArgumentException("repair_notes cannot be empty.");
        }
        if (strlen($notes) < 5) {
            throw new InvalidArgumentException("repair_notes must be at least 5 characters to ensure descriptive documentation.");
        }

        return new self(
            incidentId: $cleanIncidentId,
            repairNotes: $notes
        );
    }
}
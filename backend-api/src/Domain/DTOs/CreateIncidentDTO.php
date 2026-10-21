<?php
declare(strict_types=1);

namespace Aquila\Domain\DTOs;

use Aquila\Utils\Uuid;
use InvalidArgumentException;

readonly class CreateIncidentDTO
{
    public function __construct(
        public string $nodeId,
        public string $incidentType,
        public string $severityLevel,
        public array $recommendation,
        public ?string $incidentId = null,
        public ?int $templateId = null,
        public ?string $academicClassification = 'HIGH_VELOCITY_BURST',
        public ?string $academicTerm = 'High-Velocity Laminar Pipe Burst',
        public ?string $displayName = 'Sudden Pipe Rupture'
    ) {}

    public static function fromArray(array $payload): self
    {
        $nodeId = strtoupper(trim((string)($payload['node_id'] ?? '')));
        if (empty($nodeId)) {
            throw new InvalidArgumentException("node_id is required.");
        }

        $type = strtoupper(trim((string)($payload['incident_type'] ?? 'CRITICAL_LEAK')));
        $validTypes = ['CRITICAL_LEAK', 'FAIRNESS_DEFICIT', 'SUSPICIOUS_USAGE'];
        if (!in_array($type, $validTypes, true)) {
            throw new InvalidArgumentException("Invalid incident_type. Allowed: " . implode(', ', $validTypes));
        }

        $severity = strtoupper(trim((string)($payload['severity_level'] ?? 'P1')));
        $validSeverities = ['P1', 'P2', 'P3'];
        if (!in_array($severity, $validSeverities, true)) {
            throw new InvalidArgumentException("Invalid severity_level. Allowed: P1, P2, P3.");
        }

        $incidentId = isset($payload['incident_id']) ? (string)$payload['incident_id'] : null;
        if ($incidentId !== null && !Uuid::isValid($incidentId)) {
            throw new InvalidArgumentException("incident_id must be a valid canonical UUIDv4.");
        }

        $recommendation = (array)($payload['recommendation'] ?? []);
        $templateId = isset($payload['template_id']) ? (int)$payload['template_id'] : null;

        return new self(
            nodeId: $nodeId,
            incidentType: $type,
            severityLevel: $severity,
            recommendation: $recommendation,
            incidentId: $incidentId,
            templateId: $templateId,
            academicClassification: (string)($payload['academic_classification'] ?? 'HIGH_VELOCITY_BURST'),
            academicTerm: (string)($payload['academic_term'] ?? 'High-Velocity Laminar Pipe Burst'),
            displayName: (string)($payload['display_name'] ?? ($recommendation['title'] ?? 'Sudden Pipe Rupture'))
        );
    }
}
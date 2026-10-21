<?php
declare(strict_types=1);

namespace Aquila\Domain\Entities;

readonly class ActionCardTemplate
{
    public function __construct(
        public int $templateId,
        public string $incidentType,
        public string $severityLevel,
        public string $academicClassification,
        public string $academicTerm,
        public string $displayName,
        public ?string $actionCardTitle,
        public ?string $actionDirective
    ) {}

    public static function fromArray(array $row): self
    {
        return new self(
            templateId: (int)$row['template_id'],
            incidentType: (string)$row['incident_type'],
            severityLevel: (string)$row['severity_level'],
            academicClassification: (string)($row['academic_classification'] ?? 'HIGH_VELOCITY_BURST'),
            academicTerm: (string)$row['academic_term'],
            displayName: (string)$row['display_name'],
            actionCardTitle: isset($row['action_card_title']) ? (string)$row['action_card_title'] : null,
            actionDirective: isset($row['action_directive']) ? (string)$row['action_directive'] : null
        );
    }

    public function toArray(): array
    {
        return [
            'template_id'             => $this->templateId,
            'incident_type'           => $this->incidentType,
            'severity_level'          => $this->severityLevel,
            'academic_classification' => $this->academicClassification,
            'academic_term'           => $this->academicTerm,
            'display_name'            => $this->displayName,
            'action_card_title'       => $this->actionCardTitle,
            'action_directive'        => $this->actionDirective
        ];
    }
}
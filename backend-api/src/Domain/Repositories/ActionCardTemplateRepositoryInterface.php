<?php
declare(strict_types=1);

namespace Aquila\Domain\Repositories;

use Aquila\Domain\Entities\ActionCardTemplate;

interface ActionCardTemplateRepositoryInterface
{
    public function findById(int $templateId): ?ActionCardTemplate;

    public function findByClassification(string $academicClassification): ?ActionCardTemplate;

    public function findByTypeAndSeverity(string $incidentType, string $severityLevel): ?ActionCardTemplate;

    /** @return ActionCardTemplate[] */
    public function findAll(): array;
}
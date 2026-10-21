<?php
declare(strict_types=1);

namespace Aquila\Domain\Repositories;

use Aquila\Domain\Entities\IncidentStatusHistory;

interface IncidentStatusHistoryRepositoryInterface
{
    public function recordTransition(
        string $incidentId, 
        ?string $previousStatus, 
        string $newStatus, 
        ?int $changedByUserId = null, 
        ?string $notes = null
    ): IncidentStatusHistory;

    /** @return IncidentStatusHistory[] */
    public function findByIncidentId(string $incidentId): array;
}
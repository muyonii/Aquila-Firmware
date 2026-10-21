<?php
declare(strict_types=1);

namespace Aquila\Domain\Repositories;

use Aquila\Domain\Entities\IncidentTicket;

interface IncidentRepositoryInterface
{
    public function findById(string $incidentId): ?IncidentTicket;

    public function findActiveByNodeId(string $nodeId): ?IncidentTicket;

    public function save(IncidentTicket $incident, ?int $changedByUserId = null): void;

    /** @return IncidentTicket[] */
    public function findAll(): array;
}
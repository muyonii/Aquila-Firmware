<?php
declare(strict_types=1);

namespace Aquila\Domain\Repositories;

use Aquila\Domain\Entities\MonitoringNode;

interface NodeRepositoryInterface
{
    public function findById(string $nodeId): ?MonitoringNode;

    /** @return MonitoringNode[] */
    public function findAll(): array;

    public function save(MonitoringNode $node): void;

    public function delete(string $nodeId): void;

    public function getNextSequentialId(): string;

    public function exists(string $nodeId): bool;
}
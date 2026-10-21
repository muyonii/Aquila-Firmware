<?php
declare(strict_types=1);

namespace Aquila\Domain\Repositories;

use Aquila\Domain\Entities\HouseholdProfile;

interface HouseholdProfileRepositoryInterface
{
    public function findByNodeId(string $nodeId): ?HouseholdProfile;

    /** @return HouseholdProfile[] */
    public function findAll(): array;

    public function save(HouseholdProfile $profile): void;

    public function deleteByNodeId(string $nodeId): void;
}
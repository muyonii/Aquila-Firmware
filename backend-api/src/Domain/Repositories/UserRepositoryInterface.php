<?php
declare(strict_types=1);

namespace Aquila\Domain\Repositories;

use Aquila\Domain\Entities\UserAccount;
use Aquila\Domain\Enums\UserRole;

interface UserRepositoryInterface
{
    public function findById(int $userId): ?UserAccount;

    public function findByEmail(string $email): ?UserAccount;

    /** @return UserAccount[] */
    public function findByRole(?UserRole $role = null): array;

    public function countAdmins(): int;

    public function save(UserAccount $user, ?string $newPasswordHash = null): int;

    public function delete(int $userId): void;

    public function existsByEmail(string $email): bool;
}
<?php
declare(strict_types=1);

namespace Aquila\Domain\Repositories;

use Aquila\Domain\Entities\PasswordReset;

interface PasswordResetRepositoryInterface
{
    public function createResetRequest(int $userId, string $hashedToken, string $ipAddress, int $ttlSeconds = 3600): PasswordReset;

    public function findActiveByToken(string $hashedToken): ?PasswordReset;

    public function markAsUsed(int $resetId): void;

    public function purgeExpiredForUser(int $userId): void;
}
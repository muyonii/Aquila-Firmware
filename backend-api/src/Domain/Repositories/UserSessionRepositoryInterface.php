<?php
declare(strict_types=1);

namespace Aquila\Domain\Repositories;

use Aquila\Domain\Entities\UserSession;

interface UserSessionRepositoryInterface
{
    public function createSession(int $userId, string $refreshToken, string $ipAddress, ?string $userAgent, int $ttlDays = 30): UserSession;

    public function findByRefreshToken(string $refreshToken): ?UserSession;

    /** @return UserSession[] */
    public function findActiveByUserId(int $userId): array;

    public function revokeSession(string $refreshToken): void;

    public function revokeAllForUser(int $userId): void;

    public function purgeExpired(): int;
}
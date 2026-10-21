<?php
declare(strict_types=1);

namespace Aquila\Domain\Repositories;

use Aquila\Domain\Entities\VerificationCode;

interface VerificationCodeRepositoryInterface
{
    public function generateOtp(int $userId, string $channel, string $target, int $ttlMinutes = 10): string;

    public function verifyOtp(int $userId, string $channel, string $candidateCode): bool;

    public function purgeExpired(): int;
}
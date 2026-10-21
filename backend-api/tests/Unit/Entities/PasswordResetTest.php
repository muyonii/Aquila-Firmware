<?php
declare(strict_types=1);

namespace Aquila\Tests\Unit\Entities;

use Aquila\Domain\Entities\PasswordReset;

class PasswordResetTest
{
    public function testValidTokenExpirationCalculation(): void
    {
        $validReset = new PasswordReset(
            resetId: 1,
            userId: 1,
            resetToken: 'hashed_token_abc',
            ipAddress: '127.0.0.1',
            isUsed: false,
            expiresAt: date('Y-m-d H:i:s', time() + 3600)
        );

        assert($validReset->isValid() === true);

        $usedReset = new PasswordReset(
            resetId: 2,
            userId: 1,
            resetToken: 'hashed_token_def',
            ipAddress: '127.0.0.1',
            isUsed: true, // Already used
            expiresAt: date('Y-m-d H:i:s', time() + 3600)
        );

        assert($usedReset->isValid() === false);
    }
}
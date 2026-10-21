<?php
declare(strict_types=1);

namespace Aquila\Tests\Unit\Entities;

use Aquila\Domain\Entities\VerificationCode;

class VerificationCodeTest
{
    public function testOtpExpiration(): void
    {
        $activeOtp = new VerificationCode(
            id: 1,
            userId: 2,
            channel: 'whatsapp',
            target: '+639171234567',
            code: '123456',
            expiresAt: date('Y-m-d H:i:s', time() + 300)
        );

        assert($activeOtp->isExpired() === false);

        $expiredOtp = new VerificationCode(
            id: 2,
            userId: 2,
            channel: 'email',
            target: 'user@test.com',
            code: '654321',
            expiresAt: date('Y-m-d H:i:s', time() - 10)
        );

        assert($expiredOtp->isExpired() === true);
    }
}
<?php
declare(strict_types=1);

namespace Aquila\Tests\Unit\Entities;

use Aquila\Domain\Entities\UserSession;

class UserSessionTest
{
    public function testActiveSessionIsNotExpired(): void
    {
        $futureTime = date('Y-m-d H:i:s', time() + 3600); // 1 hour from now

        $session = new UserSession(
            sessionId: 5,
            userId: 1,
            refreshToken: 'token_abc_123',
            ipAddress: '192.168.1.10',
            userAgent: 'Mozilla/5.0 Chrome/120.0',
            expiresAt: $futureTime
        );

        assert($session->isExpired() === false, 'Session in the future must not be expired');
    }

    public function testPastSessionIsExpired(): void
    {
        $pastTime = date('Y-m-d H:i:s', time() - 3600); // 1 hour ago

        $session = new UserSession(
            sessionId: 6,
            userId: 1,
            refreshToken: 'token_expired_999',
            ipAddress: '127.0.0.1',
            userAgent: 'Mobile Safari',
            expiresAt: $pastTime
        );

        assert($session->isExpired() === true, 'Session in the past must be expired');
    }
}
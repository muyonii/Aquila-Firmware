<?php
declare(strict_types=1);

namespace Aquila\Tests\Unit\Entities;

use Aquila\Domain\Entities\UserAccount;
use Aquila\Domain\Enums\UserRole;

class UserAccountTest
{
    public function testSanitizedArrayExcludesPasswordHash(): void
    {
        $user = new UserAccount(
            userId: 3,
            firstName: 'Maria',
            middleName: 'Dela',
            lastName: 'Cruz',
            fullName: 'Maria Dela Cruz',
            email: 'resident1@gmail.com',
            passwordHash: '$2y$10$SecretHashNotToExpose',
            role: UserRole::RESIDENT,
            assignedNodeId: 'NODE-B1-001',
            emailVerifiedAt: '2026-09-01 10:00:00'
        );

        $safe = $user->toSafeArray();
        assert(!isset($safe['password_hash']), 'Password hash must never be in toSafeArray()');
        assert($safe['email_verified'] === true);
        assert($safe['assigned_node_id'] === 'NODE-B1-001');
    }
}
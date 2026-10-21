<?php
declare(strict_types=1);

namespace Aquila\Tests\Unit\Entities;

use Aquila\Domain\Entities\AuditLogEntry;

class AuditLogEntryTest
{
    public function testAuditEntryHydration(): void
    {
        $entry = new AuditLogEntry(
            logId: 50,
            incidentId: 'test-uuid-002',
            performedBy: 1,
            actionTaken: 'INCIDENT_AUTO_CREATED',
            clientIp: '127.0.0.1',
            remarks: 'Pipe rupture detected on NODE-B1-002',
            loggedAt: '2026-09-28 10:00:00',
            performedByName: 'System Admin',
            performedByRole: 'admin'
        );

        assert($entry->logId === 50);
        assert($entry->actionTaken === 'INCIDENT_AUTO_CREATED');
        assert($entry->clientIp === '127.0.0.1');
    }
}
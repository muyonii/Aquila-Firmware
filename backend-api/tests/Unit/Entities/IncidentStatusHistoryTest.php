<?php
declare(strict_types=1);

namespace Aquila\Tests\Unit\Entities;

use Aquila\Domain\Entities\IncidentStatusHistory;

class IncidentStatusHistoryTest
{
    public function testStatusHistoryHydration(): void
    {
        $history = new IncidentStatusHistory(
            historyId: 10,
            incidentId: 'test-uuid-001',
            previousStatus: 'OPEN',
            newStatus: 'DISPATCHED',
            changedByUserId: 1,
            notes: 'Assigned to Juan Plumber',
            createdAt: '2026-09-28 10:15:00',
            changedByName: 'BAWASA System Admin'
        );

        assert($history->previousStatus === 'OPEN');
        assert($history->newStatus === 'DISPATCHED');
        assert($history->changedByUserId === 1);
        assert($history->changedByName === 'BAWASA System Admin');
    }
}
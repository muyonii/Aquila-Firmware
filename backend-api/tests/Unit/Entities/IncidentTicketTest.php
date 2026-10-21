<?php
declare(strict_types=1);

namespace Aquila\Tests\Unit\Entities;

use Aquila\Domain\Entities\IncidentTicket;
use Aquila\Domain\Enums\IncidentSeverity;
use Aquila\Domain\Enums\IncidentStatus;
use InvalidArgumentException;

class IncidentTicketTest
{
    private function createTicket(): IncidentTicket
    {
        return new IncidentTicket(
            incidentId: 'test-uuid-001',
            nodeId: 'NODE-B1-002',
            templateId: 1, // FIXED: Explicit template_id matching Chapter III Table 3.11
            severityLevel: IncidentSeverity::P1,
            detectedAt: '2026-09-28 10:00:00',
            verifiedAt: null,
            resolvedAt: null,
            assignedTechnicianId: null,
            status: IncidentStatus::OPEN,
            repairNotes: null
        );
    }

    public function testNormalLifecycleTransitions(): void
    {
        $ticket = $this->createTicket();
        assert($ticket->status === IncidentStatus::OPEN);
        assert($ticket->templateId === 1);

        $ticket->dispatchTo(2);
        assert($ticket->status === IncidentStatus::DISPATCHED);
        assert($ticket->assignedTechnicianId === 2);

        $ticket->submitRepair('Replaced 3/4-inch PVC elbow.');
        assert($ticket->status === IncidentStatus::PENDING_VERIFICATION);
        assert(str_contains((string)$ticket->repairNotes, 'Replaced 3/4-inch PVC elbow'));

        $ticket->verifySuccess();
        assert($ticket->status === IncidentStatus::CLOSED_VERIFIED);
        assert($ticket->resolvedAt !== null);
    }

    public function testInvalidTransitionThrowsException(): void
    {
        $ticket = $this->createTicket();
        $ticket->verifySuccess();

        try {
            $ticket->dispatchTo(3);
            assert(false, 'Dispatching a closed ticket must throw InvalidArgumentException');
        } catch (InvalidArgumentException $e) {
            assert(str_contains($e->getMessage(), 'Cannot dispatch ticket from'));
        }
    }

    public function testTicketCancellation(): void
    {
        $ticket = $this->createTicket();
        $ticket->cancel('False alarm; resident water hose left running.');
        assert($ticket->status === IncidentStatus::CANCELLED);
        assert($ticket->resolvedAt !== null);
    }

    public function testDefaultTemplateIdFallback(): void
    {
        // When templateId is omitted, default must be 1 per Chapter III Table 3.11
        $ticket = new IncidentTicket(
            incidentId: 'test-uuid-003',
            nodeId: 'NODE-B1-003'
        );

        assert($ticket->templateId === 1, 'Default template_id must be 1');
        assert($ticket->status === IncidentStatus::OPEN);
    }
}
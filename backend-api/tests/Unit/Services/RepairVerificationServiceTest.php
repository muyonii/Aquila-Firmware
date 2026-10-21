<?php
declare(strict_types=1);

namespace Aquila\Tests\Unit\Services;

use Aquila\Config\AppConfig;
use Aquila\Domain\Entities\IncidentTicket;
use Aquila\Domain\Enums\IncidentSeverity;
use Aquila\Domain\Enums\IncidentStatus;
use Aquila\Domain\ValueObjects\FlowRate;
use Aquila\Services\RepairVerificationService;

class RepairVerificationServiceTest
{
    private function createPendingTicket(): IncidentTicket
    {
        return new IncidentTicket(
            incidentId: 'test-uuid-002',
            nodeId: 'NODE-B1-003',
            templateId: 1,
            severityLevel: IncidentSeverity::P1,
            detectedAt: '2026-09-28 10:00:00',
            verifiedAt: null,
            resolvedAt: null,
            assignedTechnicianId: 2,
            status: IncidentStatus::PENDING_VERIFICATION,
            repairNotes: 'Pipe coupling clamped.'
        );
    }

    public function testSuccessfulAutoClosureAfterQuiescentWindow(): void
    {
        $service = new RepairVerificationService();
        $ticket = $this->createPendingTicket();
        $window = $service->getVerificationWindowSeconds();

        // Flow <= 0.05 LPM and elapsed seconds >= window
        $outcome = $service->evaluateQuiescentFlow($ticket, new FlowRate(0.02), $window);

        assert($outcome === IncidentStatus::CLOSED_VERIFIED, 'Ticket must be CLOSED_VERIFIED when quiescent');
        assert($ticket->status === IncidentStatus::CLOSED_VERIFIED);
        assert($ticket->verifiedAt !== null);
    }

    public function testStillPendingWhenUnderVerificationDuration(): void
    {
        $service = new RepairVerificationService();
        $ticket = $this->createPendingTicket();
        $window = $service->getVerificationWindowSeconds();

        // 0.02 LPM (quiescent), but elapsed seconds is half the window
        $halfWindow = (int)($window / 2);
        $outcome = $service->evaluateQuiescentFlow($ticket, new FlowRate(0.02), $halfWindow);

        assert($outcome === IncidentStatus::PENDING_VERIFICATION);
        assert($service->calculateRemainingSeconds($halfWindow) === ($window - $halfWindow));
    }

    public function testRecurrentFlowFailsRepairImmediately(): void
    {
        $service = new RepairVerificationService();
        $ticket = $this->createPendingTicket();

        // Recurrent burst: 2.10 LPM >= 1.0 LPM floor (even after only 10s)
        $outcome = $service->evaluateQuiescentFlow($ticket, new FlowRate(2.10), 10);

        assert($outcome === IncidentStatus::REPAIR_FAILED, 'Recurrent burst must fail repair immediately');
        assert($ticket->status === IncidentStatus::REPAIR_FAILED);
        assert(str_contains((string)$ticket->repairNotes, 'Recurrent fluid burst'));
    }

    public function testUnsealedWeepingPipeFailsAfterWindowExpires(): void
    {
        $service = new RepairVerificationService();
        $ticket = $this->createPendingTicket();
        $window = $service->getVerificationWindowSeconds();

        // Weeping flow: 0.35 LPM (above 0.05 quiescent floor, but below 1.0 burst) after window expired
        $outcome = $service->evaluateQuiescentFlow($ticket, new FlowRate(0.35), $window);

        assert($outcome === IncidentStatus::REPAIR_FAILED, 'Pipe failing to reach quiescent seal must be marked REPAIR_FAILED');
        assert($ticket->status === IncidentStatus::REPAIR_FAILED);
        assert(str_contains((string)$ticket->repairNotes, 'Conduit unsealed'));
    }
}
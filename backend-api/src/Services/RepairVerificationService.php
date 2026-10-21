<?php
declare(strict_types=1);

namespace Aquila\Services;

use Aquila\Config\AppConfig;
use Aquila\Domain\Entities\IncidentTicket;
use Aquila\Domain\Enums\IncidentStatus;
use Aquila\Domain\ValueObjects\FlowRate;

class RepairVerificationService
{
    /**
     * Evaluates instantaneous flow against the post-repair verification window.
     */
    public function evaluateQuiescentFlow(
        IncidentTicket $ticket, 
        FlowRate $observedRate, 
        int $elapsedSeconds
    ): IncidentStatus {
        $windowSeconds = $this->getVerificationWindowSeconds();

        // 1. Recurrence Invariant: If flow spikes >= 1.0 LPM, fail immediately (regardless of elapsed time)
        if ($observedRate->litersPerMinute >= AppConfig::MECHANICAL_SENSOR_FLOOR_LPM) {
            $ticket->markFailed(
                sprintf("Recurrent fluid burst of %.2f LPM detected during observation window.", $observedRate->litersPerMinute)
            );
            return IncidentStatus::REPAIR_FAILED;
        }

        // 2. Closure Invariant: Flow is quiescent (<= 0.05 LPM) AND countdown has elapsed
        if ($observedRate->isQuiescent() && $elapsedSeconds >= $windowSeconds) {
            $ticket->verifySuccess();
            return IncidentStatus::CLOSED_VERIFIED;
        }

        // 3. Persistent Weeping / Unsealed Pipe: Window elapsed, but flow is still leaking above quiescent floor
        if ($elapsedSeconds >= $windowSeconds && !$observedRate->isQuiescent()) {
            $ticket->markFailed(
                sprintf("Conduit unsealed: Flow remained at %.2f LPM after observation window.", $observedRate->litersPerMinute)
            );
            return IncidentStatus::REPAIR_FAILED;
        }

        // 4. Observation In Progress: Countdown is still active
        return IncidentStatus::PENDING_VERIFICATION;
    }

    /**
     * Calculates remaining seconds in the verification window (for UI countdown timers)
     */
    public function calculateRemainingSeconds(int $elapsedSeconds): int
    {
        return max(0, $this->getVerificationWindowSeconds() - $elapsedSeconds);
    }

    /**
     * Returns the verification duration (reads from .env for Demo Mode)
     */
    public function getVerificationWindowSeconds(): int
    {
        return AppConfig::getRepairVerificationSeconds();
    }
}
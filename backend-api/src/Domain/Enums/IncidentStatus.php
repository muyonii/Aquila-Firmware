<?php
declare(strict_types=1);

namespace Aquila\Domain\Enums;

enum IncidentStatus: string
{
    case OPEN = 'OPEN';
    case DISPATCHED = 'DISPATCHED';
    case PENDING_VERIFICATION = 'PENDING_VERIFICATION';
    case CLOSED_VERIFIED = 'CLOSED_VERIFIED';
    case REPAIR_FAILED = 'REPAIR_FAILED';
    case CANCELLED = 'CANCELLED';

    public function isTerminal(): bool
    {
        return in_array($this, [self::CLOSED_VERIFIED, self::CANCELLED], true);
    }

    public function isActive(): bool
    {
        return in_array($this, [self::OPEN, self::DISPATCHED, self::PENDING_VERIFICATION, self::REPAIR_FAILED], true);
    }

    /**
     * Validates state-machine transitions (Rule BR-07)
     */
    public function canTransitionTo(self $target): bool
    {
        return match ($this) {
            self::OPEN => in_array($target, [self::DISPATCHED, self::CLOSED_VERIFIED, self::CANCELLED], true),
            self::DISPATCHED => in_array($target, [self::PENDING_VERIFICATION, self::OPEN, self::CANCELLED], true),
            self::PENDING_VERIFICATION => in_array($target, [self::CLOSED_VERIFIED, self::REPAIR_FAILED], true),
            self::REPAIR_FAILED => in_array($target, [self::DISPATCHED, self::PENDING_VERIFICATION, self::CANCELLED], true),
            self::CLOSED_VERIFIED, self::CANCELLED => false,
        };
    }

    public function label(): string
    {
        return match ($this) {
            self::OPEN                 => 'Open (Pending Dispatch)',
            self::DISPATCHED           => 'Dispatched to Field Technician',
            self::PENDING_VERIFICATION => 'Repair Submitted (Under Observation)',
            self::CLOSED_VERIFIED      => 'Resolved & Verified (Flow Quiescent)',
            self::REPAIR_FAILED        => 'Repair Failed (Flow Recurrent)',
            self::CANCELLED            => 'Cancelled / False Alarm Dismissed',
        };
    }
}
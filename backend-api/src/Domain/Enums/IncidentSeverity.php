<?php
declare(strict_types=1);

namespace Aquila\Domain\Enums;

enum IncidentSeverity: string
{
    case P1 = 'P1'; // Critical Pipe Rupture / Massive Discrepancy
    case P2 = 'P2'; // Severe Equity Deficit / Unpaused Internal Draw
    case P3 = 'P3'; // Pre-convergence Suspicious Usage Anomaly

    public function requiresImmediateDispatch(): bool
    {
        return $this === self::P1;
    }

    /**
     * Numerical rank for escalation comparison (P1: 3, P2: 2, P3: 1)
     */
    public function rank(): int
    {
        return match ($this) {
            self::P1 => 3,
            self::P2 => 2,
            self::P3 => 1,
        };
    }

    public function isHigherPriorityThan(self $other): bool
    {
        return $this->rank() > $other->rank();
    }

    public function maxResolutionHours(): int
    {
        return match ($this) {
            self::P1 => 4,
            self::P2 => 24,
            self::P3 => 72,
        };
    }

    public function label(): string
    {
        return match ($this) {
            self::P1 => 'Critical Priority (Immediate Response)',
            self::P2 => 'Moderate Priority (Next Dispatch Cycle)',
            self::P3 => 'Low Priority (Monitoring & Advisory)',
        };
    }
}
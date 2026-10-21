<?php
declare(strict_types=1);

namespace Aquila\Domain\Enums;

enum IncidentType: string
{
    case CRITICAL_LEAK = 'CRITICAL_LEAK';
    case FAIRNESS_DEFICIT = 'FAIRNESS_DEFICIT';
    case SUSPICIOUS_USAGE = 'SUSPICIOUS_USAGE';

    public function defaultSeverity(): IncidentSeverity
    {
        return match ($this) {
            self::CRITICAL_LEAK   => IncidentSeverity::P1,
            self::FAIRNESS_DEFICIT => IncidentSeverity::P2,
            self::SUSPICIOUS_USAGE => IncidentSeverity::P3,
        };
    }

    public function label(): string
    {
        return match ($this) {
            self::CRITICAL_LEAK   => 'Critical Pipe Rupture / Leak',
            self::FAIRNESS_DEFICIT => 'Rawlsian Water Equity Deficit',
            self::SUSPICIOUS_USAGE => 'Suspicious Domestic Draw',
        };
    }
}
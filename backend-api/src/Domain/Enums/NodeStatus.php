<?php
declare(strict_types=1);

namespace Aquila\Domain\Enums;

enum NodeStatus: string
{
    case ACTIVE = 'ACTIVE';
    case INACTIVE = 'INACTIVE'; 
    case MAINTENANCE = 'MAINTENANCE';
    case FAULT = 'FAULT';
    case DECOMMISSIONED = 'DECOMMISSIONED';

    public function isOperational(): bool
    {
        return $this === self::ACTIVE;
    }

    public function suppressesAlarms(): bool
    {
        return in_array($this, [self::INACTIVE, self::MAINTENANCE, self::FAULT, self::DECOMMISSIONED], true);
    }

    public function canTransmitTelemetry(): bool
    {
        return in_array($this, [self::ACTIVE, self::MAINTENANCE], true);
    }
}
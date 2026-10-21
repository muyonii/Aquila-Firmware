<?php
declare(strict_types=1);

namespace Aquila\Domain\Enums;

enum NotificationType: string
{
    case CRITICAL_BURST_ALERT  = 'CRITICAL_BURST_ALERT';
    case WORK_ORDER_DISPATCHED = 'WORK_ORDER_DISPATCHED';
    case REPAIR_FAILED_ALERT   = 'REPAIR_FAILED_ALERT';
    case SENSOR_FAULT_ALERT    = 'SENSOR_FAULT_ALERT';
    case EQUITY_DEFICIT_ALERT  = 'EQUITY_DEFICIT_ALERT';
    case SYSTEM_UPDATE         = 'SYSTEM_UPDATE';

    public function requiresImmediateSms(): bool
    {
        return in_array($this, [self::CRITICAL_BURST_ALERT, self::WORK_ORDER_DISPATCHED], true);
    }

    public function label(): string
    {
        return match ($this) {
            self::CRITICAL_BURST_ALERT  => 'Critical Pipe Burst Emergency',
            self::WORK_ORDER_DISPATCHED => 'Technician Dispatched',
            self::REPAIR_FAILED_ALERT   => 'Post-Repair Verification Failed',
            self::SENSOR_FAULT_ALERT    => 'IoT Monitoring Sensor Fault',
            self::EQUITY_DEFICIT_ALERT  => 'Rawlsian Water Equity Warning',
            self::SYSTEM_UPDATE         => 'System Update & Maintenance Notice',
        };
    }
}
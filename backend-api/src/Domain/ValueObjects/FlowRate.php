<?php
declare(strict_types=1);

namespace Aquila\Domain\ValueObjects;

use Aquila\Config\AppConfig;
use InvalidArgumentException;

readonly class FlowRate
{
    public float $litersPerMinute;

    public function __construct(float $value)
    {
        if ($value < 0.0) {
            throw new InvalidArgumentException("Flow rate cannot be negative. Received: {$value}");
        }
        if ($value > 45.0) {
            // FIXED: Added "hydraulic capacity" to match domain invariant and test assertion
            throw new InvalidArgumentException("Flow rate {$value} LPM exceeds maximum conduit hydraulic capacity (45.0 LPM).");
        }
        $this->litersPerMinute = round($value, 2);
    }

    /**
     * Rule BR-07 Quiescent Seal Floor: <= 0.05 L/min indicates physical pipe seal integrity
     */
    public function isQuiescent(): bool
    {
        return $this->litersPerMinute <= AppConfig::QUIESCENT_FLOW_FLOOR_LPM;
    }

    /**
     * Rule EXC-02 Mechanical Sensor Noise Floor: Flows < 1.0 L/min cannot rotate YF-S201 turbine
     */
    public function isBelowMechanicalFloor(): bool
    {
        return $this->litersPerMinute < AppConfig::MECHANICAL_SENSOR_FLOOR_LPM;
    }

    /**
     * Immediate Verification Failure: Recurrent burst >= 1.0 L/min fails repair
     */
    public function isRecurrentBurst(): bool
    {
        return $this->litersPerMinute >= AppConfig::MECHANICAL_SENSOR_FLOOR_LPM;
    }

    public function toHourlyLiters(): float
    {
        return round($this->litersPerMinute * 60.0, 2);
    }

    public function equals(self $other): bool
    {
        return abs($this->litersPerMinute - $other->litersPerMinute) < 0.005;
    }
}
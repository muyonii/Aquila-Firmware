<?php
declare(strict_types=1);

namespace Aquila\Domain\ValueObjects;

use Aquila\Config\AppConfig;
use InvalidArgumentException;

readonly class RdiScore
{
    public float $score;

    public function __construct(float $score)
    {
        if ($score < 0.0) {
            throw new InvalidArgumentException("RDI score cannot be negative. Received: {$score}");
        }
        $this->score = round($score, 3);
    }

    /**
     * Rule BR-04: Household is disadvantaged if receiving less than 70% of community mean
     */
    public function isDisadvantaged(): bool
    {
        return $this->score < AppConfig::RAWLSIAN_RDI_CUTOFF;
    }

    /**
     * High consumer threshold (> 130% of community mean)
     */
    public function isHighConsumer(): bool
    {
        return $this->score > 1.30;
    }

    public function getClassification(): string
    {
        if ($this->isDisadvantaged()) {
            return 'DISADVANTAGED';
        }
        if ($this->isHighConsumer()) {
            return 'HIGH_CONSUMER';
        }
        return 'NORMAL';
    }

    /**
     * Calculates equity deficit percentage (e.g., score of 0.50 yields 28.6% deficit from 0.70 baseline)
     */
    public function getDeficitPercentage(): float
    {
        if (!$this->isDisadvantaged()) {
            return 0.0;
        }
        return round(((AppConfig::RAWLSIAN_RDI_CUTOFF - $this->score) / AppConfig::RAWLSIAN_RDI_CUTOFF) * 100.0, 1);
    }

    public function equals(self $other): bool
    {
        return abs($this->score - $other->score) < 0.001;
    }
}
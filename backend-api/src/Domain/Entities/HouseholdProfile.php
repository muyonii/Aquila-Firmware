<?php
declare(strict_types=1);

namespace Aquila\Domain\Entities;

readonly class HouseholdProfile
{
    public function __construct(
        public ?int $profileId,
        public string $nodeId,
        public float $expectedNightFlowLpm = 0.00,
        public float $typicalMaxDurationMins = 15.00,
        public float $meanDailyVolumeLiters = 350.00,
        public ?string $lastProfiledAt = null
    ) {}

    public static function fromArray(array $row): self
    {
        return new self(
            profileId: isset($row['profile_id']) ? (int)$row['profile_id'] : null,
            nodeId: (string)$row['node_id'],
            expectedNightFlowLpm: (float)($row['expected_night_flow_lpm'] ?? 0.00),
            typicalMaxDurationMins: (float)($row['typical_max_duration_mins'] ?? 15.00),
            meanDailyVolumeLiters: (float)($row['mean_daily_volume_liters'] ?? 350.00),
            lastProfiledAt: isset($row['last_profiled_at']) ? (string)$row['last_profiled_at'] : null
        );
    }

    /**
     * Calculates the dynamic continuous draw ceiling (2x typical duration, bounded >= 30 mins)
     * Evaluated by LeakDetectionAgent (Rule TIER_2_ZERO_FLOW).
     */
    public function getContinuousDrawCeilingMins(): float
    {
        return max(30.0, $this->typicalMaxDurationMins * 2.0);
    }

    /**
     * Calculates nocturnal MNF floor with noise tolerance (+0.50 LPM)
     */
    public function getNocturnalMnfThresholdLpm(): float
    {
        return $this->expectedNightFlowLpm + 0.50;
    }

    public function toArray(): array
    {
        return [
            'profile_id'                => $this->profileId,
            'node_id'                   => $this->nodeId,
            'expected_night_flow_lpm'   => $this->expectedNightFlowLpm,
            'typical_max_duration_mins' => $this->typicalMaxDurationMins,
            'mean_daily_volume_liters'  => $this->meanDailyVolumeLiters,
            'last_profiled_at'          => $this->lastProfiledAt
        ];
    }
}
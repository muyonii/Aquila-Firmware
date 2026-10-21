<?php
declare(strict_types=1);

namespace Aquila\Domain\Entities;

readonly class HourlySummary
{
    public function __construct(
        public ?int $summaryId,
        public string $nodeId,
        public string $hourTimestamp,
        public float $totalVolumeLiters,
        public float $peakFlowRateLpm,
        public int $leakFlagCount,
        public float $cumulativeMeterReading = 0.0,
        public ?string $createdAt = null
    ) {}

    public static function fromArray(array $row): self
    {
        return new self(
            summaryId: isset($row['summary_id']) ? (int)$row['summary_id'] : null,
            nodeId: (string)$row['node_id'],
            hourTimestamp: (string)$row['hour_timestamp'],
            totalVolumeLiters: (float)($row['total_volume_liters'] ?? 0.0),
            peakFlowRateLpm: (float)($row['peak_flow_rate_lpm'] ?? 0.0),
            leakFlagCount: (int)($row['leak_flag_count'] ?? 0),
            cumulativeMeterReading: isset($row['cumulative_meter_reading']) 
                ? (float)$row['cumulative_meter_reading'] 
                : 0.0,
            createdAt: isset($row['created_at']) ? (string)$row['created_at'] : null
        );
    }

    /**
     * Converts volume to cubic meters (m³)
     * 1,000 Liters = 1.000 m³ (Standard Utility Metric)
     */
    public function toCubicMeters(): float
    {
        return round($this->totalVolumeLiters / 1000.0, 3);
    }

    public function toArray(): array
    {
        return [
            'summary_id'               => $this->summaryId,
            'node_id'                  => $this->nodeId,
            'hour_timestamp'           => $this->hourTimestamp,
            'total_volume_liters'      => $this->totalVolumeLiters,
            'total_cubic_meters'       => $this->toCubicMeters(),
            'peak_flow_rate_lpm'       => $this->peakFlowRateLpm,
            'leak_flag_count'          => $this->leakFlagCount,
            'cumulative_meter_reading' => $this->cumulativeMeterReading,
            'created_at'               => $this->createdAt
        ];
    }
}
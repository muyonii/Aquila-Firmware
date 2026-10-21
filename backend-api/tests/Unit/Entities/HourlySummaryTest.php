<?php
declare(strict_types=1);

namespace Aquila\Tests\Unit\Entities;

use Aquila\Domain\Entities\HourlySummary;

class HourlySummaryTest
{
    public function testCompactionMetricsAndCubicMeterConversion(): void
    {
        $summary = new HourlySummary(
            summaryId: 101,
            nodeId: 'NODE-B1-002',
            hourTimestamp: '2026-09-28 17:00:00',
            totalVolumeLiters: 1250.00,
            peakFlowRateLpm: 4.50,
            leakFlagCount: 1,
            cumulativeMeterReading: 2250.00
        );

        assert($summary->totalVolumeLiters === 1250.00);
        // 1,250 Liters = 1.250 m³
        assert($summary->toCubicMeters() === 1.250);
        assert($summary->cumulativeMeterReading === 2250.00);
    }
}
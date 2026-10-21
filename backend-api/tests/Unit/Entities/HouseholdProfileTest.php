<?php
declare(strict_types=1);

namespace Aquila\Tests\Unit\Entities;

use Aquila\Domain\Entities\HouseholdProfile;

class HouseholdProfileTest
{
    public function testDynamicThresholdCalculations(): void
    {
        $profile = new HouseholdProfile(
            profileId: 1,
            nodeId: 'NODE-B1-001',
            expectedNightFlowLpm: 0.05,
            typicalMaxDurationMins: 20.0,
            meanDailyVolumeLiters: 400.00
        );

        // Continuous ceiling = max(30.0, 20.0 * 2) = 40.0 mins
        assert($profile->getContinuousDrawCeilingMins() === 40.0);
        // Nocturnal floor = 0.05 + 0.50 = 0.55 LPM
        assert($profile->getNocturnalMnfThresholdLpm() === 0.55);
    }

    public function testClampedMinimumDurationCeiling(): void
    {
        // For a very small household with typical duration of 10 mins:
        // 10 * 2 = 20, but ceiling floor must be clamped to >= 30 mins
        $profile = new HouseholdProfile(
            profileId: 2,
            nodeId: 'NODE-B1-003',
            expectedNightFlowLpm: 0.01,
            typicalMaxDurationMins: 10.0,
            meanDailyVolumeLiters: 150.00
        );

        assert($profile->getContinuousDrawCeilingMins() === 30.0);
    }
}
<?php
declare(strict_types=1);

namespace Aquila\Tests\Unit\ValueObjects;

use Aquila\Domain\ValueObjects\FlowRate;
use InvalidArgumentException;

class FlowRateTest
{
    public function testValidFlowRateRounding(): void
    {
        $flow = new FlowRate(3.424);
        assert($flow->litersPerMinute === 3.42, 'Flow rate should round to 2 decimal places');
    }

    public function testQuiescentDetection(): void
    {
        // Flow <= 0.05 LPM is quiescent (Rule BR-07)
        $stillFlow = new FlowRate(0.04);
        assert($stillFlow->isQuiescent() === true, 'Flow <= 0.05 LPM must be identified as quiescent');

        $boundary = new FlowRate(0.05);
        assert($boundary->isQuiescent() === true, 'Flow = 0.05 LPM must be identified as quiescent');

        $activeFlow = new FlowRate(0.06);
        assert($activeFlow->isQuiescent() === false, 'Flow > 0.05 LPM must not be quiescent');
    }

    public function testMechanicalInertiaFloorRuleExc02(): void
    {
        // Flows < 1.0 LPM cannot reliably rotate mechanical impeller
        $slowWeep = new FlowRate(0.85);
        assert($slowWeep->isBelowMechanicalFloor() === true);
        assert($slowWeep->isRecurrentBurst() === false);

        $measurableFlow = new FlowRate(1.20);
        assert($measurableFlow->isBelowMechanicalFloor() === false);
        assert($measurableFlow->isRecurrentBurst() === true);
    }

    public function testRecurrentBurstDetection(): void
    {
        // Recurrent burst >= 1.0 LPM aborts repair verification
        $burst = new FlowRate(2.50);
        assert($burst->isRecurrentBurst() === true);
    }

    public function testNegativeFlowThrowsException(): void
    {
        try {
            new FlowRate(-0.1);
            assert(false, 'Negative flow rate must throw InvalidArgumentException');
        } catch (InvalidArgumentException $e) {
            assert(str_contains($e->getMessage(), 'cannot be negative'));
        }
    }

    public function testExceedingHydraulicCapacityThrowsException(): void
    {
        try {
            new FlowRate(46.0);
            assert(false, 'Flow rate exceeding 45 LPM must throw InvalidArgumentException');
        } catch (InvalidArgumentException $e) {
            assert(str_contains($e->getMessage(), 'hydraulic capacity'));
        }
    }
}
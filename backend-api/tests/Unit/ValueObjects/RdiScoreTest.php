<?php
declare(strict_types=1);

namespace Aquila\Tests\Unit\ValueObjects;

use Aquila\Domain\ValueObjects\RdiScore;
use InvalidArgumentException;

class RdiScoreTest
{
    public function testRawlsianDisadvantagedCutoff(): void
    {
        // RDI < 0.70 is flagged as Disadvantaged (Rule BR-04)
        $disadvantaged = new RdiScore(0.650);
        assert($disadvantaged->isDisadvantaged() === true);
        assert($disadvantaged->isHighConsumer() === false);
        assert($disadvantaged->getClassification() === 'DISADVANTAGED');

        // Boundary check: 0.699 is still disadvantaged
        $boundary = new RdiScore(0.699);
        assert($boundary->isDisadvantaged() === true);
        assert($boundary->getClassification() === 'DISADVANTAGED');
    }

    public function testNormalDistributionRange(): void
    {
        // 0.70 to 1.30 is Normal
        $normal = new RdiScore(0.850);
        assert($normal->isDisadvantaged() === false);
        assert($normal->isHighConsumer() === false);
        assert($normal->getClassification() === 'NORMAL');

        $parity = new RdiScore(1.000);
        assert($parity->isDisadvantaged() === false);
        assert($parity->getClassification() === 'NORMAL');
    }

    public function testHighConsumerCutoff(): void
    {
        // RDI > 1.30 is High Consumer
        $high = new RdiScore(1.450);
        assert($high->isDisadvantaged() === false);
        assert($high->isHighConsumer() === true);
        assert($high->getClassification() === 'HIGH_CONSUMER');
    }

    public function testNegativeScoreThrowsException(): void
    {
        try {
            new RdiScore(-0.05);
            assert(false, 'Negative RDI score must throw InvalidArgumentException');
        } catch (InvalidArgumentException $e) {
            assert(str_contains($e->getMessage(), 'cannot be negative'));
        }
    }
}
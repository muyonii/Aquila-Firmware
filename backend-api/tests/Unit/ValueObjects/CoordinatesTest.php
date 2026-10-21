<?php
declare(strict_types=1);

namespace Aquila\Tests\Unit\ValueObjects;

use Aquila\Domain\ValueObjects\Coordinates;
use InvalidArgumentException;

class CoordinatesTest
{
    public function testValidCoordinatesInstantiation(): void
    {
        $coord = new Coordinates(14.6778000, 120.5412000);
        assert($coord->latitude === 14.6778000);
        assert($coord->longitude === 120.5412000);

        $arr = $coord->toArray();
        assert($arr['lat'] === 14.6778000);
        assert($arr['lng'] === 120.5412000);
    }

    public function testHaversineDistanceCalculation(): void
    {
        // Node 01 (Bougainvillea St) to Node 02 (Rosal Ext) in Purok 2
        $node1 = new Coordinates(14.6778000, 120.5412000);
        $node2 = new Coordinates(14.6772000, 120.5422000);

        $distanceMeters = $node1->distanceTo($node2);

        // Expected geodesic distance is approximately 126 to 130 meters
        assert($distanceMeters > 120.0 && $distanceMeters < 135.0, 
            "Expected distance ~127m, calculated: {$distanceMeters}m");
    }

    public function testLatitudeOutofBoundsThrowsException(): void
    {
        try {
            new Coordinates(91.5, 120.5);
            assert(false, 'Latitude > 90 must throw InvalidArgumentException');
        } catch (InvalidArgumentException $e) {
            assert(str_contains($e->getMessage(), 'Latitude must be between'));
        }

        try {
            new Coordinates(-90.1, 120.5);
            assert(false, 'Latitude < -90 must throw InvalidArgumentException');
        } catch (InvalidArgumentException $e) {
            assert(str_contains($e->getMessage(), 'Latitude must be between'));
        }
    }

    public function testLongitudeOutofBoundsThrowsException(): void
    {
        try {
            new Coordinates(14.5, 180.5);
            assert(false, 'Longitude > 180 must throw InvalidArgumentException');
        } catch (InvalidArgumentException $e) {
            assert(str_contains($e->getMessage(), 'Longitude must be between'));
        }

        try {
            new Coordinates(14.5, -180.1);
            assert(false, 'Longitude < -180 must throw InvalidArgumentException');
        } catch (InvalidArgumentException $e) {
            assert(str_contains($e->getMessage(), 'Longitude must be between'));
        }
    }

    public function testEqualityCheck(): void
    {
        $a = new Coordinates(14.6778000, 120.5412000);
        $b = new Coordinates(14.6778000, 120.5412000);
        
        // 8th decimal place precision rounds to 14.6778000 (sub-microdegree equal)
        $subMicroDelta = new Coordinates(14.67780003, 120.5412000);
        
        $different = new Coordinates(14.6788000, 120.5412000);

        assert($a->equals($b) === true, 'Identical coordinates must evaluate equal');
        assert($a->equals($subMicroDelta) === true, 'Coordinates rounding to the same 7 decimal places must evaluate equal');
        assert($a->equals($different) === false, 'Distinct coordinates must evaluate not equal');
    }
}
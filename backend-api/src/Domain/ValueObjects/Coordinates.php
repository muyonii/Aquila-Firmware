<?php
declare(strict_types=1);

namespace Aquila\Domain\ValueObjects;

use InvalidArgumentException;

readonly class Coordinates
{
    public float $latitude;
    public float $longitude;

    public function __construct(float $latitude, float $longitude)
    {
        if ($latitude < -90.0 || $latitude > 90.0) {
            throw new InvalidArgumentException("Latitude must be between -90.0 and +90.0 degrees. Received: {$latitude}");
        }
        if ($longitude < -180.0 || $longitude > 180.0) {
            throw new InvalidArgumentException("Longitude must be between -180.0 and +180.0 degrees. Received: {$longitude}");
        }

        $this->latitude = round($latitude, 7);
        $this->longitude = round($longitude, 7);
    }

    /**
     * Outputs Well-Known Text (WKT) for MySQL spatial POINT geometry
     */
    public function toWkt(): string
    {
        return sprintf('POINT(%f %f)', $this->longitude, $this->latitude);
    }

    public function toArray(): array
    {
        return [
            'lat' => $this->latitude,
            'lng' => $this->longitude
        ];
    }

    /**
     * Calculates direct geodesic distance in meters using the Haversine equation
     */
    public function distanceTo(self $target): float
    {
        $earthRadiusMeters = 6371000.0;

        $latFrom = deg2rad($this->latitude);
        $lonFrom = deg2rad($this->longitude);
        $latTo   = deg2rad($target->latitude);
        $lonTo   = deg2rad($target->longitude);

        $latDelta = $latTo - $latFrom;
        $lonDelta = $lonTo - $lonFrom;

        $angle = 2 * asin(sqrt(
            pow(sin($latDelta / 2), 2) +
            cos($latFrom) * cos($latTo) * pow(sin($lonDelta / 2), 2)
        ));

        return round($angle * $earthRadiusMeters, 2);
    }

    public function equals(self $other): bool
    {
        return abs($this->latitude - $other->latitude) < 0.0000001
            && abs($this->longitude - $other->longitude) < 0.0000001;
    }
}
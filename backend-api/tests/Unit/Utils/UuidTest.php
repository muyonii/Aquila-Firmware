<?php
declare(strict_types=1);

namespace Aquila\Tests\Unit\Utils;

use Aquila\Utils\Uuid;

class UuidTest
{
    public function testGeneratesValidFormatAndLength(): void
    {
        $uuid = Uuid::v4();
        assert(strlen($uuid) === 36, "UUID length must be exactly 36 characters, got " . strlen($uuid));
        assert(substr_count($uuid, '-') === 4, "UUID must contain exactly 4 hyphens");
        assert(Uuid::isValid($uuid) === true, "Generated UUID must pass isValid() check");
    }

    public function testConformsToRfc4122V4BitMasks(): void
    {
        $uuid = Uuid::v4();

        // 15th character (index 14) is the version: must strictly be '4'
        assert($uuid[14] === '4', "15th character must be '4' for UUIDv4, got '{$uuid[14]}'");

        // 20th character (index 19) is the variant: must be 8, 9, a, or b (RFC 4122)
        assert(in_array(strtolower($uuid[19]), ['8', '9', 'a', 'b'], true), 
            "Variant nibble must be 8, 9, a, or b, got '{$uuid[19]}'");
    }

    public function testRejectsMalformedStrings(): void
    {
        assert(Uuid::isValid('not-a-uuid') === false, "Must reject plain text");
        assert(Uuid::isValid('12345678-1234-1234-1234-123456789012') === false, "Must reject non-v4 UUID");
        assert(Uuid::isValid('') === false, "Must reject empty string");
        assert(Uuid::isValid('00000000-0000-0000-0000-000000000000') === false, "Must reject nil UUID");
    }

    public function testCollisionResistanceSample(): void
    {
        $seen = [];
        for ($i = 0; $i < 1000; $i++) {
            $id = Uuid::v4();
            assert(!isset($seen[$id]), "Collision detected at iteration {$i}: {$id}");
            $seen[$id] = true;
        }
        assert(count($seen) === 1000, "Expected 1000 unique UUIDs");
    }
}
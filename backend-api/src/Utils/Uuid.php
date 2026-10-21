<?php
declare(strict_types=1);

namespace Aquila\Utils;

use Exception;

class Uuid
{
    private const UUID_V4_PATTERN = '/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i';

    /**
     * Generates a cryptographically secure RFC 4122 compliant Version 4 UUID.
     *
     * @return string 36-character canonical UUID string
     * @throws Exception if system entropy source fails
     */
    public static function v4(): string
    {
        $bytes = random_bytes(16);

        // Set version to 0100 (UUIDv4)
        $bytes[6] = chr((ord($bytes[6]) & 0x0f) | 0x40);
        // Set variant to 10xxxxxx (RFC 4122)
        $bytes[8] = chr((ord($bytes[8]) & 0x3f) | 0x80);

        // Format into 8-4-4-4-12 representation
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($bytes), 4));
    }

    /**
     * Validates whether a given string is a valid canonical RFC 4122 UUIDv4.
     */
    public static function isValid(string $uuid): bool
    {
        return preg_match(self::UUID_V4_PATTERN, $uuid) === 1;
    }
}
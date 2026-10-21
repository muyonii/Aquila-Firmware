<?php
declare(strict_types=1);

namespace Aquila\Config;

class Env
{
    private static bool $loaded = false;

    /**
     * Loads and parses .env file into putenv(), $_ENV, and $_SERVER
     */
    public static function load(?string $filePath = null): void
    {
        if (self::$loaded && $filePath === null) {
            return;
        }

        // 1. Multi-Path Discovery: check root project folder, then backend-api folder, then cwd
        $path = $filePath;
        if ($path === null) {
            $candidatePaths = [
                dirname(__DIR__, 3) . '/.env',  // Project Root
                dirname(__DIR__, 2) . '/.env',  // backend-api Root
                getcwd() . '/.env'              // Working Directory
            ];

            foreach ($candidatePaths as $candidate) {
                if (file_exists($candidate) && is_readable($candidate)) {
                    $path = $candidate;
                    break;
                }
            }
        }

        if ($path === null || !file_exists($path) || !is_readable($path)) {
            self::$loaded = true;
            return;
        }

        $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($lines as $line) {
            $line = trim($line);
            if ($line === '' || str_starts_with($line, '#')) {
                continue;
            }

            if (str_contains($line, '=')) {
                [$key, $val] = explode('=', $line, 2);
                $key = trim($key);
                $val = trim($val);

                // Strip trailing comments (e.g. VAR=val # comment)
                if (str_contains($val, '#') && !str_starts_with($val, '"') && !str_starts_with($val, "'")) {
                    $val = trim(explode('#', $val)[0]);
                }

                // Strip surrounding quotes
                if ((str_starts_with($val, '"') && str_ends_with($val, '"')) ||
                    (str_starts_with($val, "'") && str_ends_with($val, "'"))) {
                    $val = substr($val, 1, -1);
                }

                // Populate all three PHP environment registries
                putenv("{$key}={$val}");
                $_ENV[$key] = $val;
                $_SERVER[$key] = $val;
            }
        }

        self::$loaded = true;
    }

    /**
     * Retrieves string value from environment
     */
    public static function get(string $key, ?string $default = null): ?string
    {
        self::load();

        if (array_key_exists($key, $_ENV)) {
            return (string)$_ENV[$key];
        }

        if (array_key_exists($key, $_SERVER)) {
            return (string)$_SERVER[$key];
        }

        $val = getenv($key);
        if ($val !== false) {
            return $val;
        }

        return $default;
    }

    /**
     * Retrieves integer value from environment
     */
    public static function getInt(string $key, int $default = 0): int
    {
        $val = self::get($key);
        return ($val !== null && is_numeric($val)) ? (int)$val : $default;
    }

    /**
     * Retrieves boolean value from environment
     */
    public static function getBool(string $key, bool $default = false): bool
    {
        $val = self::get($key);
        if ($val === null) {
            return $default;
        }
        $lower = strtolower(trim($val));
        return in_array($lower, ['true', '1', 'yes', 'on'], true);
    }

    /**
     * Resets loader state (useful for test isolation)
     */
    public static function reset(): void
    {
        self::$loaded = false;
    }
}
<?php
declare(strict_types=1);

namespace Aquila\Config;

use RuntimeException;

class Security
{
    public const JWT_ALGORITHM = 'HS256';
    public const JWT_EXPIRATION_SECONDS = 900; // 15 minutes (RFC 7519 Access Token)

    private const DEV_JWT_FALLBACK = 'aquila_super_secret_jwt_key_bpsu_2026';
    private const DEV_WEBHOOK_FALLBACK = 'aquila_internal_hmac_secret_key_2026';

    public static function getJwtExpirationSeconds(): int
    {
        $val = Env::get('JWT_EXPIRATION_SECONDS');
        return !empty($val) && is_numeric($val) ? (int)$val : self::JWT_EXPIRATION_SECONDS;
    }

    public static function getJwtSecret(): string
    {
        $secret = Env::get('JWT_SECRET');
        $isProd = strtolower((string)Env::get('APP_ENV', 'local')) === 'production';

        if (empty($secret)) {
            if ($isProd) {
                throw new RuntimeException("CRITICAL SECURITY ERROR: JWT_SECRET environment variable is not defined in production.");
            }
            return self::DEV_JWT_FALLBACK;
        }

        if ($isProd && $secret === self::DEV_JWT_FALLBACK) {
            throw new RuntimeException("CRITICAL SECURITY ERROR: Default development JWT_SECRET cannot be used in production.");
        }

        return $secret;
    }

    public static function getWebhookSecret(): string
    {
        $secret = Env::get('WEBHOOK_SECRET');
        $isProd = strtolower((string)Env::get('APP_ENV', 'local')) === 'production';

        if (empty($secret)) {
            if ($isProd) {
                throw new RuntimeException("CRITICAL SECURITY ERROR: WEBHOOK_SECRET environment variable is not defined in production.");
            }
            return self::DEV_WEBHOOK_FALLBACK;
        }

        if ($isProd && $secret === self::DEV_WEBHOOK_FALLBACK) {
            throw new RuntimeException("CRITICAL SECURITY ERROR: Default development WEBHOOK_SECRET cannot be used in production.");
        }

        return $secret;
    }

    /**
     * Generates a high-entropy cryptographically secure random token (hex string)
     */
    public static function generateSecureToken(int $bytes = 32): string
    {
        return bin2hex(random_bytes($bytes));
    }
}
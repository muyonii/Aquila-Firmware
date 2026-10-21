<?php
declare(strict_types=1);

namespace Aquila\Config;

class AppConfig
{
    public const TIMEZONE = 'Asia/Manila';
    public const MYSQL_TIMEZONE = '+08:00';
    
    // -------------------------------------------------------------------------
    // Operational & Verification Thresholds
    // -------------------------------------------------------------------------
    public const REPAIR_VERIFICATION_SECONDS     = 900;    // Fallback constant
    public const QUIESCENT_FLOW_FLOOR_LPM        = 0.05;
    public const MECHANICAL_SENSOR_FLOOR_LPM     = 1.0;
    public const STALE_TELEMETRY_TIMEOUT_SECONDS = 45;
    public const ZERO_FLOW_HANGOVER_SECONDS       = 30;
    public const MASS_BALANCE_TOLERANCE_LPM       = 1.5;
    public const TELEMETRY_TTL_SECONDS           = 7200;

    // Behavioral Baselines (Table 3.5)
    public const DEFAULT_NIGHT_FLOW_LPM          = 0.00;
    public const DEFAULT_MAX_DURATION_MINS       = 15.00;
    public const DEFAULT_DAILY_VOLUME_LITERS     = 350.00;

    // Multi-Agent & Theoretical Invariants
    public const RAWLSIAN_RDI_CUTOFF             = 0.70;
    public const MUNICIPAL_SHORTAGE_FLOOR_LPD    = 50.0;
    public const LEAK_PROBABILITY_THRESHOLD      = 0.40;
    public const PERSONAL_DEFICIT_THRESHOLD      = 0.60;
    public const CIRCUIT_BREAKER_TIMEOUT_SECONDS = 30.0;

    // Authentication Security & Lifespans
    public const PASSWORD_RESET_TTL_SECONDS      = 3600;
    public const REFRESH_TOKEN_TTL_DAYS          = 30;
    public const OTP_TTL_MINUTES                 = 10;

    /**
     * Reads dynamic duration from .env (e.g., 15s in Demo Mode, 900s in Production)
     */
    public static function getRepairVerificationSeconds(): int
    {
        $envSeconds = Env::getInt('REPAIR_VERIFICATION_SECONDS', 0);
        return $envSeconds > 0 ? $envSeconds : self::REPAIR_VERIFICATION_SECONDS;
    }

    public static function getFirebaseUrl(): string
    {
        return rtrim((string)Env::get(
            'FIREBASE_DATABASE_URL', 
            'https://aquila-system-default-rtdb.asia-southeast1.firebasedatabase.app'
        ), '/');
    }
}
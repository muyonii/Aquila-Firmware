import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadEnv() {
    const rootEnvPath = path.resolve(__dirname, '../../.env');
    const localEnvPath = path.resolve(__dirname, '../.env');
    const targetPath = fs.existsSync(rootEnvPath) ? rootEnvPath : (fs.existsSync(localEnvPath) ? localEnvPath : null);

    if (targetPath) {
        const content = fs.readFileSync(targetPath, 'utf8');
        for (const line of content.split('\n')) {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
                const [k, ...vParts] = trimmed.split('=');
                const key = k.trim();
                let val = vParts.join('=').trim();
                if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                    val = val.slice(1, -1);
                }
                if (!process.env[key]) {
                    process.env[key] = val;
                }
            }
        }
    }
}

loadEnv();

const isProduction = process.env.APP_ENV === 'production';
const webhookSecret = process.env.WEBHOOK_SECRET;

if (isProduction && (!webhookSecret || webhookSecret === 'aquila_internal_hmac_secret_key_2026')) {
    throw new Error('CRITICAL SECURITY ERROR: WEBHOOK_SECRET must be explicitly set to a strong value in production.');
}

export const SETTINGS = {
    // Endpoints
    FIREBASE_DB_URL: (process.env.FIREBASE_DATABASE_URL || process.env.FIREBASE_DB_URL || "https://aquila-system-default-rtdb.asia-southeast1.firebasedatabase.app").replace(/\/+$/, ''),
    BACKEND_WEBHOOK_URL: process.env.BACKEND_WEBHOOK_URL || "http://127.0.0.1/aquila-system/backend-api/public/api/v1/webhooks/incident",
    NODE_API_URL: process.env.NODE_API_URL || "http://127.0.0.1/aquila-system/backend-api/public/api/v1/nodes",
    WEBHOOK_SECRET: webhookSecret || "aquila_internal_hmac_secret_key_2026",

    // Execution Timers & Cadence
    CYCLE_INTERVAL_MS: 15000,                  // 15-second deliberation cycle
    NETWORK_TIMEOUT_MS: 5000,                  // 5-second HTTP request timeout budget
    CIRCUIT_BREAKER_TIMEOUT_SEC: 30.0,         // Watchdog timeout
    COMPACTION_INTERVAL_MS: parseInt(process.env.SQL_COMPACTION_INTERVAL_MS || '30000', 10), // 30s in demo, 5m in prod

    // Algorithmic Invariants (Mirrors AppConfig.php & Chapter III)
    LEAK_PROBABILITY_THRESHOLD: 0.40,          // Neyman-Pearson Recall >= 90%
    RDI_DISADVANTAGE_CUTOFF: 0.70,             // Rule BR-04: OECD 70% community mean
    MUNICIPAL_SHORTAGE_FLOOR_LPD: 50.0,        // Rule BR-05: WHO 50 L/household/day drought floor
    MECHANICAL_SENSOR_FLOOR_LPM: 1.0,          // Rule EXC-02: YF-S201 turbine inertia floor
    QUIESCENT_FLOW_FLOOR_LPM: 0.05,            // Rule BR-07: Quiescent pipe seal floor
    FAIRNESS_WINDOW_SECONDS: 86400,            // 24-hour evaluation horizon
    STALE_TELEMETRY_TIMEOUT_SECONDS: 45,       // Node declared offline after 45s of silence
    ZERO_FLOW_HANGOVER_SECONDS: 30,            // Hysteresis window for transient packet drops
    MASS_BALANCE_TOLERANCE_LPM: 1.5,           // Permissible discrepancy between parent and children
    PERSONAL_DEFICIT_THRESHOLD: parseFloat(process.env.PERSONAL_DEFICIT_THRESHOLD || '0.60')
};

export function getCurrentSystemHour() {
    const tz = process.env.APP_TIMEZONE || 'Asia/Manila';
    const formatter = new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        hour12: false,
        timeZone: tz
    });
    const hourStr = formatter.format(new Date());
    return parseInt(hourStr === '24' ? '0' : hourStr, 10);
}
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadEnv() {
    const rootEnv = path.resolve(__dirname, '../../.env');
    const localEnv = path.resolve(__dirname, '../.env');
    const targetPath = fs.existsSync(rootEnv) ? rootEnv : (fs.existsSync(localEnv) ? localEnv : null);

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

export const SETTINGS = {
    // Demo Acceleration Mode (Default: true for instant live demonstration on Tick 1)
    DEMO_MODE: process.env.DEMO_MODE !== 'false',

    // Endpoints
    FIREBASE_DB_URL: (process.env.FIREBASE_DATABASE_URL || process.env.FIREBASE_DB_URL || "https://aquila-system-default-rtdb.asia-southeast1.firebasedatabase.app").replace(/\/+$/, ''),
    BACKEND_API_URL: process.env.NODE_API_URL || "http://127.0.0.1/aquila-system/backend-api/public/api/v1/nodes",
    WEBHOOK_SECRET: process.env.WEBHOOK_SECRET || "aquila_internal_hmac_secret_key_2026",

    // Timings & Bounds
    TICK_INTERVAL_MS: 15000,                    // 15-second telemetry tick rate (DR-01)
    NETWORK_TIMEOUT_MS: 5000,                   // 5-second HTTP request timeout budget
    MECHANICAL_SENSOR_FLOOR_LPM: 1.0,           // YF-S201 turbine inertia floor (EXC-02)
    QUIESCENT_FLOW_FLOOR_LPM: 0.05,            // Quiescent pipe integrity seal floor (BR-07)
    LOW_BATTERY_WARNING_VOLTS: 3.35,            // Li-ion 18650 cell potential cutoff
    INITIAL_BATTERY_VOLTS: 4.20,                // Fully charged Li-ion cell potential

    DEFAULT_PUROK_CLUSTER: "Purok 2"
};
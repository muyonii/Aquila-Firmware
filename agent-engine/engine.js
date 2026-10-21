import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { SETTINGS } from './config/settings.js';
import { BlackboardService } from './src/services/BlackboardService.js';
import { WebhookDispatcher } from './src/services/WebhookDispatcher.js';
import { HeartbeatMonitor } from './src/services/HeartbeatMonitor.js';
import { LeakDetectionAgent } from './src/agents/LeakDetectionAgent.js';
import { FairnessEvaluationAgent } from './src/agents/FairnessEvaluationAgent.js';
import { CoordinatorAgent } from './src/agents/CoordinatorAgent.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("===============================================================");
console.log(" AQUILA Persistent Multi-Agent System Engine (CMP-MAS-01)");
console.log(` Target Blackboard : ${SETTINGS.FIREBASE_DB_URL}`);
console.log(` Transactional API  : ${SETTINGS.BACKEND_WEBHOOK_URL}`);
console.log(" Operational Agents : LDA, FEA, CA, RA (Template Method OOP)");
console.log(" Auto SQL Sync      : Active (Rolling 5-min Compaction Worker)");
console.log("===============================================================\n");

// 1. Initialize Core Shared Services
const blackboard = new BlackboardService(SETTINGS.FIREBASE_DB_URL);
const dispatcher = new WebhookDispatcher(SETTINGS.BACKEND_WEBHOOK_URL, SETTINGS.WEBHOOK_SECRET);
const monitor    = new HeartbeatMonitor(blackboard, SETTINGS.CIRCUIT_BREAKER_TIMEOUT_SEC);

// 2. Instantiate Autonomous Agents
const lda = new LeakDetectionAgent(blackboard);
const fea = new FairnessEvaluationAgent(blackboard);
const ca  = new CoordinatorAgent(blackboard, dispatcher);

let isCycleRunning = false;
let lastCompactionTime = 0;
// const COMPACTION_INTERVAL_MS = 5 * 60 * 1000; // Run every 5 minutes
const COMPACTION_INTERVAL_MS = SETTINGS.COMPACTION_INTERVAL_MS || 30000; // for demo

/**
 * Auto-detects PHP executable (supports both PATH and default XAMPP on Windows)
 */
function getPhpBinary() {
    if (process.platform === 'win32') {
        const xamppPhp = 'C:\\xampp\\php\\php.exe';
        if (fs.existsSync(xamppPhp)) {
            return `"${xamppPhp}"`;
        }
    }
    return 'php';
}

/**
 * Triggers the CQRS compaction worker to calculate and persist hourly deltas into MySQL
 */
function triggerHourlySqlCompaction() {
    const now = Date.now();
    // Throttle to once every 5 minutes
    if (now - lastCompactionTime < COMPACTION_INTERVAL_MS && lastCompactionTime !== 0) {
        return;
    }

    lastCompactionTime = now;
    const scriptPath = path.resolve(__dirname, '../backend-api/cron/compact_hourly_telemetry.php');
    const command = `${getPhpBinary()} "${scriptPath}"`;

    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.warn(`⚠️ [SQL Auto-Sync] Compaction trigger notice: ${error.message}`);
            return;
        }
        const lines = stdout.trim().split('\n');
        const summaryLine = lines.find(l => l.includes('Compacted Nodes')) || 'Compacted successfully';
        console.log(`💾 [SQL Auto-Sync] ${summaryLine.trim()} into MySQL HOURLY_SUMMARY.`);
    });
}

// 3. Synchronized Agent Coordination Cycle
async function runAgentSystem() {
    if (isCycleRunning) {
        console.warn('⚠️ [MAS Engine] Previous cycle still in progress; skipping overlapping tick.');
        return;
    }

    isCycleRunning = true;
    const startTime = Date.now();
    const timeStr = new Date().toLocaleTimeString();
    console.log(`[${timeStr}] --- Executing Agent Coordination Cycle ---`);

    try {
        // Step A: Watchdog Check
        const health = await monitor.checkLiveness();
        if (!health.systemHealthy) {
            console.warn(`⚠️ [Watchdog Alert] Degraded agents detected: ${health.degradedAgents.join(', ')}`);
        }

        // Step B: LDA — Flow & Leak Detection
        await lda.executeCycle();

        // Step C: FEA — Volume & Fairness Evaluation
        await fea.executeCycle();

        // Step D: CA — Graph Arbitration & Dispatch
        await ca.executeCycle();

        // Step E: Automatically save hourly usage to MySQL!
        triggerHourlySqlCompaction();

        const durationMs = Date.now() - startTime;
        console.log(`[${timeStr}] ✔ Coordination Cycle Completed in ${durationMs}ms`);

    } catch (cycleError) {
        console.error('❌ [MAS Engine] Critical Cycle Execution Error:', cycleError.message);
    } finally {
        isCycleRunning = false;
    }
}

// 4. Seed baseline heartbeats on startup, then start execution loop
let intervalHandle;

async function initEngine() {
    try {
        await blackboard.updateHeartbeat("CMP-LDA-01", "HEALTHY");
        await blackboard.updateHeartbeat("CMP-FEA-01", "HEALTHY");
        await blackboard.updateHeartbeat("CMP-CA-01", "HEALTHY");
    } catch (e) {
        // Safe fallback if Firebase is warming up
    }

    // Run first cycle and trigger initial compaction immediately
    await runAgentSystem();
    intervalHandle = setInterval(runAgentSystem, SETTINGS.CYCLE_INTERVAL_MS);
}

initEngine();

// 5. Graceful Process Termination (SIGINT / SIGTERM)
async function handleShutdown(signal) {
    console.log(`\n[MAS Engine] Received ${signal}. Shutting down coordination loop safely...`);
    clearInterval(intervalHandle);

    try {
        await blackboard.updateHeartbeat("CMP-LDA-01", "DEGRADED");
        await blackboard.updateHeartbeat("CMP-FEA-01", "DEGRADED");
        await blackboard.updateHeartbeat("CMP-CA-01", "DEGRADED");
    } catch (e) {
        // Ignore network errors during exit
    }

    console.log('[MAS Engine] Engine stopped safely.');
    process.exit(0);
}

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));

process.on('unhandledRejection', (reason, promise) => {
    console.error('⚠️ [MAS Engine] Unhandled Promise Rejection:', reason?.message || reason);
});

process.on('uncaughtException', (error) => {
    console.error('❌ [MAS Engine] Uncaught Exception:', error.message);
});
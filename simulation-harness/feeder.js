import readline from 'readline';
import { SETTINGS } from './config/settings.js';
import { NodeStateManager } from './src/core/NodeStateManager.js';
import { ScenarioEngine } from './src/scenarios/ScenarioEngine.js';
import { FirebaseStreamer } from './src/streaming/FirebaseStreamer.js';
import { ConsoleDashboard } from './src/ui/ConsoleDashboard.js';

console.log("Initializing AQUILA Digital Twin Feeder Engine...\n");

// 1. Instantiate Core Subsystems
const stateManager = new NodeStateManager();
const scenarioEngine = new ScenarioEngine(stateManager);
const streamer = new FirebaseStreamer(SETTINGS.FIREBASE_DB_URL);

let intervalHandle = null;

// 2. Main Simulation Tick Loop
async function tick() {
    const elapsedSeconds = scenarioEngine.isAccelerated ? 900 : 15; // Accelerated mode = 15m jump
    const tickResults = scenarioEngine.evaluateTick(elapsedSeconds);

    // Stream telemetry to Firebase Hot Store
    const streamResult = await streamer.streamTick(tickResults, scenarioEngine);

    // Redraw terminal interface
    ConsoleDashboard.render(scenarioEngine, streamResult);
}

// 3. Cadence Management (Switch between 15s and 250ms time-warp)
function restartInterval() {
    if (intervalHandle) clearInterval(intervalHandle);
    const intervalMs = scenarioEngine.isAccelerated 
        ? SETTINGS.ACCELERATED_TICK_MS 
        : SETTINGS.TICK_INTERVAL_MS;
    
    intervalHandle = setInterval(tick, intervalMs);
}

// 4. Interactive Keyboard Listener Setup
function setupKeyboardControls() {
    if (process.stdin.isTTY) {
        process.stdin.setRawMode(true);
        readline.emitKeypressEvents(process.stdin);

        process.stdin.on('keypress', (str, key) => {
            if (key.ctrl && key.name === 'c') {
                handleShutdown();
            }

            const k = (str || '').toLowerCase();

            // Preset shortcuts [1-7]
            if (['1', '2', '3', '4', '5', '6', '7'].includes(k)) {
                scenarioEngine.setPreset(k);
                tick();
            }

            // [A] Toggle Time-Warp Speed
            else if (k === 'a') {
                scenarioEngine.toggleAcceleration();
                restartInterval();
                tick();
            }

            // [C] Toggle Chaos Mode
            else if (k === 'c') {
                scenarioEngine.toggleChaosMode();
                tick();
            }

            // [R] Reset Odometer (Simulate Meter Replacement)
            else if (k === 'r') {
                stateManager.resetOdometer('NODE-B1-003', 10.0);
                console.log('\n🔄 [Feeder] Reset Node B1-003 Odometer to 10.0 Liters.');
                tick();
            }

            // [Q] Quit
            else if (k === 'q') {
                handleShutdown();
            }
        });
    }
}

// 5. Shutdown Handler
function handleShutdown() {
    console.log('\n\nShutting down AQUILA Digital Twin Feeder Engine...');
    if (intervalHandle) clearInterval(intervalHandle);
    if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
    }
    process.exit(0);
}

// Start Harness
setupKeyboardControls();
tick(); // First immediate tick
restartInterval();
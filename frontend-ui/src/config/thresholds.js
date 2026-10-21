/**
 * AQUILA System Thresholds & Invariants
 * Centralized constants matching backend AppConfig.php and .env
 */
export const THRESHOLDS = {
  // Operational Timers
  TELEMETRY_INTERVAL_SECONDS: 15,          // 15-second agent cycle
  REPAIR_VERIFICATION_SECONDS: 900,         // 15-minute observation window (Rule BR-07)
  CIRCUIT_BREAKER_TIMEOUT_SECONDS: 30.0,    // Watchdog liveness cutoff (FR-DSS-03)
  STALE_TELEMETRY_TIMEOUT_SECONDS: 45,      // Node declared offline after 45s of silence

  // Fluid Dynamics Floor Limits
  QUIESCENT_FLOW_FLOOR_LPM: 0.05,           // Seal integrity floor (BR-07)
  MECHANICAL_SENSOR_FLOOR_LPM: 1.0,         // YF-S201 turbine inertia floor (Rule EXC-02)

  // Battery Potential
  LOW_BATTERY_THRESHOLD_VOLTS: 3.35,        // Li-ion 18650 cell cutoff

  // Equity & Drought Override Floors
  RAWLSIAN_RDI_CUTOFF: 0.70,                // 70% community mean cutoff (Rule BR-04)
  MUNICIPAL_SHORTAGE_FLOOR_LPD: 50.0        // WHO 50 L/household/day drought override (Rule BR-05)
};
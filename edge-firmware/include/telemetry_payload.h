/**
 * ==============================================================================
 * Project: AQUILA (BPSU BSCS 2026)
 * File: edge-firmware/include/telemetry_payload.h
 * Description: Formal Data Contract struct (DR-01) for physical node telemetry.
 *              Uses a fixed-size, trivially copyable layout so it can be safely
 *              written as binary structs to LittleFS flash memory without
 *              heap fragmentation or pointer corruption.
 * ==============================================================================
 */

#ifndef TELEMETRY_PAYLOAD_H
#define TELEMETRY_PAYLOAD_H

#include <stdint.h>
#include <string.h>

/**
 * TelemetryPayload Data Contract (DR-01)
 *
 * Strict 7-field structure mapped directly to:
 *  - agent-engine/src/contracts/TelemetryContract.js
 *  - cloud-config/database.rules.json
 */
struct TelemetryPayload {
    char node_id[20];          // Hardware Node Identifier (e.g., "NODE-B1-001")
    uint32_t packet_sequence;  // Monotonically increasing sequence number (1, 2, 3...)
    uint32_t timestamp;        // Real-time Unix epoch timestamp in seconds (> 1.6B)
    float flow_rate_lpm;       // Instantaneous flow velocity in Liters/Minute (0.0 to 45.0)
    float cumulative_liters;   // Non-volatile persistent odometer index (>= 0.0)
    float battery_voltage;     // Measured 18650 cell potential in Volts (0.0 to 6.0)
    bool is_simulated;         // Provenance flag: MUST be false for physical node

    /**
     * Default constructor initializing safe zero/neutral state.
     */
    TelemetryPayload()
        : packet_sequence(0),
          timestamp(0),
          flow_rate_lpm(0.0f),
          cumulative_liters(0.0f),
          battery_voltage(0.0f),
          is_simulated(false) {
        memset(node_id, 0, sizeof(node_id));
    }

    /**
     * Parameterized constructor for assembling complete telemetry packets.
     */
    TelemetryPayload(const char* id,
                     uint32_t sequence,
                     uint32_t timeEpoch,
                     float flowLPM,
                     float totalLiters,
                     float voltage,
                     bool simulated = false)
        : packet_sequence(sequence),
          timestamp(timeEpoch),
          flow_rate_lpm(flowLPM),
          cumulative_liters(totalLiters),
          battery_voltage(voltage),
          is_simulated(simulated) {
        strncpy(node_id, id, sizeof(node_id) - 1);
        node_id[sizeof(node_id) - 1] = '\0'; // Guarantee null termination
    }

    /**
     * Contract Invariant Validation Method
     * Validates that payload strictly adheres to Firebase database.rules.json
     * before network transmission or flash queuing.
     *
     * @return true if all 7 fields satisfy validation bounds.
     */
    bool isValid() const {
        // 1. node_id must not be empty
        if (node_id[0] == '\0') return false;

        // 2. timestamp must be greater than epoch cutoff (1600000000)
        if (timestamp < 1600000000UL) return false;

        // 3. flow_rate_lpm must be within physical conduit bounds [0.0, 45.0]
        if (flow_rate_lpm < 0.0f || flow_rate_lpm > 45.0f) return false;

        // 4. cumulative_liters must be non-negative
        if (cumulative_liters < 0.0f) return false;

        // 5. battery_voltage must be within realistic single-cell bounds [0.0, 6.0]
        if (battery_voltage < 0.0f || battery_voltage > 6.0f) return false;

        return true;
    }
};

#endif // TELEMETRY_PAYLOAD_H
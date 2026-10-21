#ifndef TELEMETRY_PAYLOAD_H
#define TELEMETRY_PAYLOAD_H
#include <stdint.h>
#include <string.h>

// Data Contract DR-01 (unchanged from boss's file)
struct TelemetryPayload {
    char node_id[20];
    uint32_t packet_sequence;
    uint32_t timestamp;
    float flow_rate_lpm;
    float cumulative_liters;
    float battery_voltage;
    bool is_simulated;

    TelemetryPayload()
        : packet_sequence(0), timestamp(0), flow_rate_lpm(0.0f),
          cumulative_liters(0.0f), battery_voltage(0.0f), is_simulated(false) {
        memset(node_id, 0, sizeof(node_id));
    }

    TelemetryPayload(const char* id, uint32_t sequence, uint32_t timeEpoch,
                     float flowLPM, float totalLiters, float voltage, bool simulated = false)
        : packet_sequence(sequence), timestamp(timeEpoch), flow_rate_lpm(flowLPM),
          cumulative_liters(totalLiters), battery_voltage(voltage), is_simulated(simulated) {
        strncpy(node_id, id, sizeof(node_id) - 1);
        node_id[sizeof(node_id) - 1] = '\0';
    }

    bool isValid() const {
        if (node_id[0] == '\0') return false;
        if (timestamp < 1600000000UL) return false;
        if (flow_rate_lpm < 0.0f || flow_rate_lpm > 45.0f) return false;
        if (cumulative_liters < 0.0f) return false;
        if (battery_voltage < 0.0f || battery_voltage > 6.0f) return false;
        return true;
    }
};
#endif

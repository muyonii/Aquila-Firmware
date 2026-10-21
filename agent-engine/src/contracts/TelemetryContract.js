/**
 * TelemetryContract
 *
 * Checks incoming sensor data from the ESP32.
 * If any reading is corrupted, missing, or physically impossible, it rejects it.
 */
export class TelemetryContract {
    /**
     * Validates a sensor packet.
     *
     * @param {any} payload - The raw incoming sensor packet
     * @returns {boolean} true if data is clean and safe, false if bad data
     */
    static validate(payload) {
        // Check 1: Make sure the packet is a real object and not empty or text
        if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
            return false;
        }

        // The 6 required fields (battery_voltage removed since physical rig has no battery sensor)
        const requiredFields = [
            'node_id',            // The meter's name (e.g. "NODE-B1-001")
            'packet_sequence',    // Packet counter (1, 2, 3...)
            'timestamp',          // Date and time in seconds
            'flow_rate_lpm',      // Current water speed in Liters per minute
            'cumulative_liters',  // Total water used so far (odometer reading)
            'is_simulated'        // true if computer simulated, false if real hardware
        ];

        // Check 2: Verify that none of the 6 fields are missing, blank, or null
        const hasAllFields = requiredFields.every(
            field => field in payload && payload[field] !== null && payload[field] !== undefined
        );

        if (!hasAllFields) {
            return false;
        }

        // Check 3: Meter ID must be non-empty text
        if (typeof payload.node_id !== 'string' || payload.node_id.trim() === '') {
            return false;
        }

        // Check 4: Packet sequence number cannot be negative
        if (typeof payload.packet_sequence !== 'number' || payload.packet_sequence < 0) {
            return false;
        }

        // Check 5: Timestamp must be a valid time after the year 2020
        if (typeof payload.timestamp !== 'number' || payload.timestamp < 1600000000) {
            return false;
        }

        // Check 6: Water speed must be between 0.0 and 45.0 L/min (pipes can't flow faster than 45)
        if (typeof payload.flow_rate_lpm !== 'number' || payload.flow_rate_lpm < 0.0 || payload.flow_rate_lpm > 45.0) {
            return false;
        }

        // Check 7: Total water consumed cannot be negative
        if (typeof payload.cumulative_liters !== 'number' || payload.cumulative_liters < 0.0) {
            return false;
        }

        // Check 8: is_simulated must strictly be true or false
        if (typeof payload.is_simulated !== 'boolean') {
            return false;
        }

        // Optional Battery Voltage: Validated only if present (handles physical rig vs simulator)
        if ('battery_voltage' in payload && payload.battery_voltage !== null && payload.battery_voltage !== undefined) {
            if (typeof payload.battery_voltage !== 'number' || payload.battery_voltage < 0.0 || payload.battery_voltage > 6.0) {
                return false;
            }
        }

        // All checks passed! Packet is valid and safe to use.
        return true;
    }
}
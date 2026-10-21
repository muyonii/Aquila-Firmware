#ifndef FLOW_SENSOR_H
#define FLOW_SENSOR_H

#include <Arduino.h>
#include <Preferences.h>
#include "interfaces/ISensor.h"
#include "config.h"

/**
 * Implements ISensor. Hides hardware interrupts, spinlocks, and NVS wear management.
 */
class FlowSensor : public ISensor {
public:
    explicit FlowSensor(uint8_t sensorPin, float calibrationFactor, float pulsesPerLiter);
    ~FlowSensor() override = default;

    // ISensor interface overrides
    bool begin() override;
    float read() override; // Returns flow velocity in Liters/Minute (LPM)
    bool isHealthy() override;

    // Flow-specific domain methods
    float getCumulativeLiters() const;
    void resetOdometer();

    // Static Interrupt Service Routine (Must reside in IRAM)
    static void IRAM_ATTR onPulseInterrupt();

private:
    uint8_t pin;
    float calFactor;
    float pulsesPerLiter;
    
    // Encapsulated state
    float cumulativeLiters;
    float lastCommittedLiters;
    unsigned long lastMeasurementTime;

    // Thread-safe interrupt properties
    static volatile uint32_t pulseCount;
    static portMUX_TYPE spinlock;

    // Non-Volatile Storage (Preferences.h)
    Preferences nvs;

    // Encapsulated NVS storage helpers
    void commitOdometerToNVS(float liters);
    float loadOdometerFromNVS();
};

#endif // FLOW_SENSOR_H
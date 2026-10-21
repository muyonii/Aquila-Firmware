#ifndef BATTERY_MONITOR_H
#define BATTERY_MONITOR_H

#include <Arduino.h>
#include "interfaces/ISensor.h"
#include "config.h"

/**
 * Responsible exclusively for sampling cell voltage and evaluating power exhaustion.
 */
class BatteryMonitor : public ISensor {
public:
    explicit BatteryMonitor(uint8_t adcPin, float dividerRatio);
    ~BatteryMonitor() override = default;

    // ISensor interface overrides
    bool begin() override;
    float read() override; // Returns calibrated battery voltage (V)
    bool isHealthy() override;

    // Battery-specific domain methods
    bool isLowBattery() const;
    float getBatteryPercentage() const;

private:
    uint8_t pin;
    float dividerRatio;
    float currentVoltage;
    
    // Encapsulated low voltage threshold (3.35V cutoff)
    const float lowVoltageThreshold = 3.35f;

    // TODO: Private helper method to smooth analog jitter using moving average
    float sampleAdcAverage(uint8_t samples = 10);
};

#endif // BATTERY_MONITOR_H
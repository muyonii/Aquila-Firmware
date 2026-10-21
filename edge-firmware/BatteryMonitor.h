#ifndef BATTERY_MONITOR_H
#define BATTERY_MONITOR_H
#include <Arduino.h>
#include "ISensor.h"
#include "config.h"

class BatteryMonitor : public ISensor {
public:
    explicit BatteryMonitor(uint8_t adcPin, float dividerRatio);
    ~BatteryMonitor() override = default;

    bool begin() override;
    float read() override;   // Volts
    bool isHealthy() override;

    bool isLowBattery() const;
    float getBatteryPercentage() const;

private:
    uint8_t pin;
    float dividerRatio;
    float currentVoltage;
    const float lowVoltageThreshold = LOW_BATTERY_THRESHOLD_VOLTS;

    float sampleAdcAverageMv(uint8_t samples = 10);
};
#endif

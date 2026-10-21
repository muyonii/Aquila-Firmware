#include "BatteryMonitor.h"

BatteryMonitor::BatteryMonitor(uint8_t adcPin, float dividerRatio)
    : pin(adcPin), dividerRatio(dividerRatio), currentVoltage(4.2f) {}

bool BatteryMonitor::begin() {
    // TODO:
    // 1. Set pin mode to INPUT
    // 2. Configure ADC attenuation: analogSetAttenuation(ADC_11db)
    //    (CRITICAL: Allows ESP32 to read voltages up to ~2.6V-3.1V, preventing 4095 saturation)
    // 3. Perform initial read to populate currentVoltage
    return true;
}

float BatteryMonitor::read() {
    // TODO:
    // 1. Call sampleAdcAverage()
    // 2. Convert raw 12-bit ADC (0-4095) to pin voltage: (raw / 4095.0f) * 3.3f
    // 3. Multiply by dividerRatio (2.0f for 100k/100k) to get true cell voltage
    // 4. Update currentVoltage and return it
    return currentVoltage;
}

bool BatteryMonitor::isHealthy() {
    // TODO: Verify voltage is within physical bounds (between 2.5V and 4.35V)
    return (currentVoltage >= 2.5f && currentVoltage <= 4.35f);
}

bool BatteryMonitor::isLowBattery() const {
    return (currentVoltage <= lowVoltageThreshold);
}

float BatteryMonitor::getBatteryPercentage() const {
    // TODO: Map cell voltage (3.3V = 0%, 4.2V = 100%)
    return 100.0f;
}

float BatteryMonitor::sampleAdcAverage(uint8_t samples) {
    // TODO: Loop 'samples' times, accumulate analogRead(pin), return average
    return 0.0f;
}
#include "BatteryMonitor.h"

BatteryMonitor::BatteryMonitor(uint8_t adcPin, float dividerRatio)
    : pin(adcPin), dividerRatio(dividerRatio), currentVoltage(0.0f) {}

bool BatteryMonitor::begin() {
#if BATTERY_SENSOR_INSTALLED
    pinMode(pin, INPUT);
    analogSetPinAttenuation(pin, ADC_11db);
    read();
#endif
    return true;
}

float BatteryMonitor::read() {
#if BATTERY_SENSOR_INSTALLED
    // analogReadMilliVolts uses the ESP32's factory ADC calibration (more accurate than raw/4095*3.3)
    float pinVolts = sampleAdcAverageMv() / 1000.0f;
    currentVoltage = pinVolts * dividerRatio;
#else
    currentVoltage = 0.0f;  // no divider wired yet; avoids floating-pin garbage
#endif
    return currentVoltage;
}

bool BatteryMonitor::isHealthy() {
#if BATTERY_SENSOR_INSTALLED
    return (currentVoltage >= 2.5f && currentVoltage <= 4.35f);
#else
    return true;
#endif
}

bool BatteryMonitor::isLowBattery() const {
#if BATTERY_SENSOR_INSTALLED
    return currentVoltage <= lowVoltageThreshold;
#else
    return false;
#endif
}

float BatteryMonitor::getBatteryPercentage() const {
    float pct = (currentVoltage - 3.3f) / (4.2f - 3.3f) * 100.0f;
    return constrain(pct, 0.0f, 100.0f);
}

float BatteryMonitor::sampleAdcAverageMv(uint8_t samples) {
    uint32_t sum = 0;
    for (uint8_t i = 0; i < samples; i++) {
        sum += analogReadMilliVolts(pin);
        delay(2);
    }
    return sum / (float)samples;
}

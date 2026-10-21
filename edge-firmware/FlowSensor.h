#ifndef FLOW_SENSOR_H
#define FLOW_SENSOR_H
#include <Arduino.h>
#include <Preferences.h>
#include "ISensor.h"
#include "config.h"

class FlowSensor : public ISensor {
public:
    explicit FlowSensor(uint8_t sensorPin, float calibrationFactor, float pulsesPerLiter);
    ~FlowSensor() override = default;

    bool begin() override;
    float read() override;      // Liters/Minute
    bool isHealthy() override;

    float getCumulativeLiters() const;
    void resetOdometer();

    // Calibration (persisted in NVS)
    float getPulsesPerLiter() const;
    bool setPulsesPerLiter(float ppl);       // false if outside 50..5000
    uint32_t getTestPulses() const;          // free-running counter for calibration pours
    void resetTestPulses();

    static void IRAM_ATTR onPulseInterrupt();

private:
    uint8_t pin;
    float calFactor;
    float pulsesPerLiter;
    float cumulativeLiters;
    float lastCommittedLiters;
    unsigned long lastMeasurementTime;

    static volatile uint32_t pulseCount;
    static volatile uint32_t testPulses;
    static volatile uint32_t lastPulseUs;
    static portMUX_TYPE spinlock;

    Preferences nvs;
    void commitOdometerToNVS(float liters);
    float loadOdometerFromNVS();
    float loadPulsesPerLiterFromNVS(float fallback);
};
#endif

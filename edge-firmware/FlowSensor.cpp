#include "FlowSensor.h"

volatile uint32_t FlowSensor::pulseCount = 0;
volatile uint32_t FlowSensor::testPulses = 0;
volatile uint32_t FlowSensor::lastPulseUs = 0;
portMUX_TYPE FlowSensor::spinlock = portMUX_INITIALIZER_UNLOCKED;

FlowSensor::FlowSensor(uint8_t sensorPin, float calibrationFactor, float pulsesPerLiter)
    : pin(sensorPin), calFactor(calibrationFactor), pulsesPerLiter(pulsesPerLiter),
      cumulativeLiters(0.0f), lastCommittedLiters(0.0f), lastMeasurementTime(0) {}

void IRAM_ATTR FlowSensor::onPulseInterrupt() {
    uint32_t now = micros();
    portENTER_CRITICAL_ISR(&spinlock);
    if (now - lastPulseUs > PULSE_DEBOUNCE_US) {
        pulseCount++;
        testPulses++;
        lastPulseUs = now;
    }
    portEXIT_CRITICAL_ISR(&spinlock);
}

bool FlowSensor::begin() {
    pinMode(pin, INPUT);   // GPIO35 has no internal pull-up
    pulsesPerLiter = loadPulsesPerLiterFromNVS(pulsesPerLiter);
    calFactor = pulsesPerLiter / 60.0f;     // keeps L/min consistent with calibrated pulses/L (450 -> 7.5)
    attachInterrupt(digitalPinToInterrupt(pin), onPulseInterrupt, RISING);
    cumulativeLiters = loadOdometerFromNVS();
    lastCommittedLiters = cumulativeLiters;
    lastMeasurementTime = millis();
    return true;
}

float FlowSensor::read() {
    unsigned long now = millis();
    unsigned long elapsedMs = now - lastMeasurementTime;
    lastMeasurementTime = now;

    uint32_t pulses;
    portENTER_CRITICAL(&spinlock);
    pulses = pulseCount;
    pulseCount = 0;
    portEXIT_CRITICAL(&spinlock);

    if (elapsedMs == 0) return 0.0f;

    float freqHz  = (pulses * 1000.0f) / elapsedMs;
    float flowLPM = freqHz / calFactor;

    cumulativeLiters += pulses / pulsesPerLiter;

    if (cumulativeLiters - lastCommittedLiters >= NVS_COMMIT_VOLUME_DELTA_LITERS) {
        commitOdometerToNVS(cumulativeLiters);
    }

    if (flowLPM < MECHANICAL_FLOOR_LPM) return 0.0f;
    if (flowLPM > MAX_HYDRAULIC_CAPACITY_LPM) return MAX_HYDRAULIC_CAPACITY_LPM;
    return flowLPM;
}

bool FlowSensor::isHealthy() { return true; }

float FlowSensor::getCumulativeLiters() const { return cumulativeLiters; }

void FlowSensor::resetOdometer() {
    cumulativeLiters = 0.0f;
    commitOdometerToNVS(0.0f);
}

float FlowSensor::getPulsesPerLiter() const { return pulsesPerLiter; }

bool FlowSensor::setPulsesPerLiter(float ppl) {
    if (!(ppl >= 50.0f && ppl <= 5000.0f)) return false;
    pulsesPerLiter = ppl;
    calFactor = ppl / 60.0f;
    if (nvs.begin(NVS_NAMESPACE, false)) {
        nvs.putFloat(NVS_KEY_PPL, ppl);
        nvs.end();
    }
    return true;
}

uint32_t FlowSensor::getTestPulses() const { return testPulses; }

void FlowSensor::resetTestPulses() {
    portENTER_CRITICAL(&spinlock);
    testPulses = 0;
    portEXIT_CRITICAL(&spinlock);
}

void FlowSensor::commitOdometerToNVS(float liters) {
    if (nvs.begin(NVS_NAMESPACE, false)) {
        nvs.putFloat(NVS_KEY_ODOMETER, liters);
        nvs.end();
    }
    lastCommittedLiters = liters;
}

float FlowSensor::loadOdometerFromNVS() {
    float v = 0.0f;
    if (nvs.begin(NVS_NAMESPACE, false)) {
        v = nvs.getFloat(NVS_KEY_ODOMETER, 0.0f);
        nvs.end();
    }
    return v;
}

float FlowSensor::loadPulsesPerLiterFromNVS(float fallback) {
    float v = fallback;
    if (nvs.begin(NVS_NAMESPACE, false)) {
        v = nvs.getFloat(NVS_KEY_PPL, fallback);
        nvs.end();
    }
    if (!(v >= 50.0f && v <= 5000.0f)) v = fallback;
    return v;
}

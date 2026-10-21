#include "FlowSensor.h"

// Initialize static members
volatile uint32_t FlowSensor::pulseCount = 0;
portMUX_TYPE FlowSensor::spinlock = portMUX_INITIALIZER_UNLOCKED;

FlowSensor::FlowSensor(uint8_t sensorPin, float calibrationFactor, float pulsesPerLiter)
    : pin(sensorPin), calFactor(calibrationFactor), pulsesPerLiter(pulsesPerLiter),
      cumulativeLiters(0.0f), lastCommittedLiters(0.0f), lastMeasurementTime(0) {}

void IRAM_ATTR FlowSensor::onPulseInterrupt() {
    portENTER_CRITICAL_ISR(&spinlock);
    // TODO: Minimal ISR: Increment pulseCount by 1
    portEXIT_CRITICAL_ISR(&spinlock);
}

bool FlowSensor::begin() {
    // TODO:
    // 1. Set pin mode to INPUT_PULLUP
    // 2. Attach interrupt: attachInterrupt(digitalPinToInterrupt(pin), onPulseInterrupt, RISING)
    // 3. Load persistent odometer baseline from NVS via loadOdometerFromNVS()
    // 4. Record lastMeasurementTime = millis()
    return true;
}

float FlowSensor::read() {
    // TODO:
    // 1. Calculate elapsed time: elapsedMs = millis() - lastMeasurementTime
    // 2. Atomically grab pulseCount and reset pulseCount to 0 using critical section
    // 3. Compute pulse frequency: freqHz = (pulses * 1000.0f) / elapsedMs
    // 4. Compute flow LPM: flowLPM = freqHz / calFactor (7.5)
    // 5. Update odometer: volumeLiters = pulses / pulsesPerLiter (450.0)
    //    cumulativeLiters += volumeLiters
    // 6. FLASH WEAR PROTECTION:
    //    Only commit to NVS if (cumulativeLiters - lastCommittedLiters >= 1.0f)
    // 7. Mechanical Floor Exception (EXC-02):
    //    if (flowLPM < MECHANICAL_FLOOR_LPM) return 0.0f;
    //    else return flowLPM;
    return 0.0f;
}

bool FlowSensor::isHealthy() {
    // TODO: Sensor is healthy if pin is functional and NVS memory is writable
    return true;
}

float FlowSensor::getCumulativeLiters() const {
    return cumulativeLiters;
}

void FlowSensor::commitOdometerToNVS(float liters) {
    // TODO: Open NVS namespace "aquila_odometer", writeFloat("liters", liters), close NVS
    lastCommittedLiters = liters;
}

float FlowSensor::loadOdometerFromNVS() {
    // TODO: Open NVS namespace "aquila_odometer", readFloat("liters", 0.0f), close NVS
    return 0.0f;
}
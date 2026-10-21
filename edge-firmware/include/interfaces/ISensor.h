#ifndef I_SENSOR_H
#define I_SENSOR_H

/**
 * Base interface for all physical sensors (Flow, Battery Voltage, Pressure).
 * Allows main orchestrator to treat all sensors uniformly.
 */
class ISensor {
public:
    virtual ~ISensor() = default;

    // TODO: Pure virtual initialization method
    virtual bool begin() = 0;

    // TODO: Pure virtual read method returning the primary metric
    virtual float read() = 0;

    // TODO: Returns sensor health / operational state
    virtual bool isHealthy() = 0;
};

#endif // I_SENSOR_H
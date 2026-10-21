#ifndef I_STORAGE_BUFFER_H
#define I_STORAGE_BUFFER_H

#include "telemetry_payload.h"

/**
 * Decouples the queuing strategy from the underlying storage medium (LittleFS, SD Card, or EEPROM).
 */
class IStorageBuffer {
public:
    virtual ~IStorageBuffer() = default;

    // TODO: Pure virtual initialization of the storage medium
    virtual bool begin() = 0;

    // TODO: FIFO enqueue operation
    virtual bool push(const TelemetryPayload& payload) = 0;

    // TODO: FIFO dequeue operation
    virtual bool pop(TelemetryPayload& payload) = 0;

    // TODO: Status queries
    virtual bool isEmpty() const = 0;
    virtual bool isFull() const = 0;
    virtual uint32_t count() const = 0;
};

#endif // I_STORAGE_BUFFER_H
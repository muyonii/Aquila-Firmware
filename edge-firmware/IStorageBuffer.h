#ifndef I_STORAGE_BUFFER_H
#define I_STORAGE_BUFFER_H
#include "telemetry_payload.h"
class IStorageBuffer {
public:
    virtual ~IStorageBuffer() = default;
    virtual bool begin() = 0;
    virtual bool push(const TelemetryPayload& payload) = 0;
    virtual bool pop(TelemetryPayload& payload) = 0;
    virtual bool isEmpty() const = 0;
    virtual bool isFull() const = 0;
    virtual uint32_t count() const = 0;
};
#endif

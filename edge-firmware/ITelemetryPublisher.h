#ifndef I_TELEMETRY_PUBLISHER_H
#define I_TELEMETRY_PUBLISHER_H
#include "telemetry_payload.h"
class ITelemetryPublisher {
public:
    virtual ~ITelemetryPublisher() = default;
    virtual void begin() = 0;
    virtual bool isConnected() = 0;
    virtual bool publish(const TelemetryPayload& payload) = 0;
    virtual uint32_t getSynchronizedTimestamp() = 0;
};
#endif

#ifndef I_TELEMETRY_PUBLISHER_H
#define I_TELEMETRY_PUBLISHER_H

#include "telemetry_payload.h"

/**
 * High-level orchestration depends on this abstraction, not concrete Firebase or MQTT clients.
 */
class ITelemetryPublisher {
public:
    virtual ~ITelemetryPublisher() = default;

    // TODO: Initializes network interface and cloud endpoints
    virtual void begin() = 0;

    // TODO: Returns active network connectivity status
    virtual bool isConnected() = 0;

    // TODO: Dispatches standard telemetry payload to the cloud broker
    virtual bool publish(const TelemetryPayload& payload) = 0;

    // TODO: Synchronizes system epoch clock with real-time NTP source
    virtual uint32_t getSynchronizedTimestamp() = 0;
};

#endif // I_TELEMETRY_PUBLISHER_H
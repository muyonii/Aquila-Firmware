#ifndef NETWORK_CLIENT_H
#define NETWORK_CLIENT_H

#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>
#include "interfaces/ITelemetryPublisher.h"
#include "config.h"

/**
 * Implements ITelemetryPublisher. Responsible strictly for network handshake,
 * SNTP synchronization, JSON formatting, and encrypted HTTPS transmission.
 */
class NetworkClient : public ITelemetryPublisher {
public:
    NetworkClient(const char* ssid, const char* password, const char* firebaseHost);
    ~NetworkClient() override = default;

    // ITelemetryPublisher interface overrides
    void begin() override;
    bool isConnected() override;
    bool publish(const TelemetryPayload& payload) override;
    uint32_t getSynchronizedTimestamp() override;

private:
    const char* wifiSsid;
    const char* wifiPassword;
    const char* host;

    WiFiClientSecure secureClient;

    // TODO: Private helper to format and send HTTPS PUT request
    bool sendHttpPut(const char* path, const String& jsonBody);
};

#endif // NETWORK_CLIENT_H
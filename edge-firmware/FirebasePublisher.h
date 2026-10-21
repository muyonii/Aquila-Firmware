#ifndef FIREBASE_PUBLISHER_H
#define FIREBASE_PUBLISHER_H
#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>
#include "ITelemetryPublisher.h"
#include "config.h"

// WiFi itself is handled by DeviceUI; this class only does NTP, JSON and HTTPS.
// Node status and metadata are owned by the backend/admin dashboard, so the node never writes them.
class FirebasePublisher : public ITelemetryPublisher {
public:
    explicit FirebasePublisher(const char* firebaseHost);
    ~FirebasePublisher() override = default;

    void begin() override;
    bool isConnected() override;
    bool publish(const TelemetryPayload& payload) override;
    uint32_t getSynchronizedTimestamp() override;

private:
    const char* host;
    WiFiClientSecure secureClient;
    bool ntpStarted;

    bool sendHttpPut(const char* path, const String& jsonBody);
};
#endif

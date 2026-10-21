#include "FirebasePublisher.h"
#include <HTTPClient.h>
#include <time.h>

FirebasePublisher::FirebasePublisher(const char* firebaseHost)
    : host(firebaseHost), ntpStarted(false) {}

void FirebasePublisher::begin() {
    secureClient.setInsecure();   // NTP starts later, once WiFi is actually connected
}

bool FirebasePublisher::isConnected() { return WiFi.status() == WL_CONNECTED; }

uint32_t FirebasePublisher::getSynchronizedTimestamp() {
    if (WiFi.status() == WL_CONNECTED) {
        if (!ntpStarted) {
            configTime(NTP_TIMEZONE_OFFSET_SEC, NTP_DAYLIGHT_OFFSET_SEC,
                       NTP_SERVER_PRIMARY, NTP_SERVER_SECONDARY, NTP_SERVER_TERTIARY);
            ntpStarted = true;
            Serial.printf("[NET] WiFi connected, IP %s. Starting NTP time sync...\n",
                          WiFi.localIP().toString().c_str());
        }
    } else {
        ntpStarted = false;
        Serial.printf("[NET] WiFi NOT connected (status=%d)\n", (int)WiFi.status());
    }
    time_t now;
    time(&now);
    if ((uint32_t)now < MINIMUM_VALID_TIMESTAMP) return 0;
    return (uint32_t)now;
}

bool FirebasePublisher::publish(const TelemetryPayload& payload) {
    if (!isConnected()) return false;
    if (!payload.isValid()) return false;

    StaticJsonDocument<256> doc;
    doc["node_id"]           = payload.node_id;
    doc["packet_sequence"]   = payload.packet_sequence;
    doc["timestamp"]         = payload.timestamp;
    doc["flow_rate_lpm"]     = payload.flow_rate_lpm;
    doc["cumulative_liters"] = payload.cumulative_liters;
#if BATTERY_SENSOR_INSTALLED
    // Optional in the backend contract. Left out when no sensor is wired, because the dashboard
    // treats any number <= 3.35 V as "low battery" (a fake 0.0 V would raise a false alarm).
    doc["battery_voltage"]   = payload.battery_voltage;
#endif
    doc["is_simulated"]      = payload.is_simulated;

    String json;
    serializeJson(doc, json);
    return sendHttpPut(FIREBASE_TELEMETRY_PATH, json);
}

bool FirebasePublisher::sendHttpPut(const char* path, const String& jsonBody) {
    HTTPClient http;
    String url = String("https://") + host + path;
    http.setTimeout(8000);
    if (!http.begin(secureClient, url)) return false;
    http.addHeader("Content-Type", "application/json");
    int code = http.PUT(jsonBody);
    Serial.printf("[NET] PUT %s -> %d\n", path, code);
    http.end();
    return code == 200;
}

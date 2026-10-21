#include "NetworkClient.h"

NetworkClient::NetworkClient(const char* ssid, const char* password, const char* firebaseHost)
    : wifiSsid(ssid), wifiPassword(password), host(firebaseHost) {}

void NetworkClient::begin() {
    // TODO:
    // 1. Set WiFi mode: WiFi.mode(WIFI_STA)
    // 2. Initiate connection: WiFi.begin(wifiSsid, wifiPassword)
    // 3. Configure SNTP (UTC+8 Philippine Standard Time):
    //    configTime(NTP_TIMEZONE_OFFSET_SEC, NTP_DAYLIGHT_OFFSET_SEC, "pool.ntp.org", "time.google.com")
    // 4. Set secure client: secureClient.setInsecure() (avoids bulky root cert allocations)
}

bool NetworkClient::isConnected() {
    return (WiFi.status() == WL_CONNECTED);
}

uint32_t NetworkClient::getSynchronizedTimestamp() {
    // TODO:
    // time_t now;
    // time(&now);
    // return (uint32_t)now; (Must satisfy Firebase rule: > 1600000000)
    return 0;
}

bool NetworkClient::publish(const TelemetryPayload& payload) {
    // TODO:
    // 1. Return false if !isConnected()
    // 2. Build JSON string using StaticJsonDocument<256> doc:
    //    doc["node_id"]           = payload.node_id;
    //    doc["packet_sequence"]   = payload.packet_sequence;
    //    doc["timestamp"]         = payload.timestamp;
    //    doc["flow_rate_lpm"]     = payload.flow_rate_lpm;
    //    doc["cumulative_liters"] = payload.cumulative_liters;
    //    doc["battery_voltage"]   = payload.battery_voltage;
    //    doc["is_simulated"]      = false; // CRITICAL: Native boolean false!
    // 3. Serialize to String: serializeJson(doc, jsonString)
    // 4. Dispatch via sendHttpPut("/nodes/NODE-B1-001/telemetry.json", jsonString)
    return true;
}

bool NetworkClient::sendHttpPut(const char* path, const String& jsonBody) {
    // TODO: Connect to host:443, send PUT headers, send body, verify HTTP 200 OK response
    return true;
}
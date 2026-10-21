#ifndef DEVICE_UI_H
#define DEVICE_UI_H
#include <Arduino.h>
#include <WiFi.h>
#include <WebServer.h>
#include <DNSServer.h>
#include <Preferences.h>
#include "FlowSensor.h"
#include "status_snapshot.h"
#include "config.h"

/**
 * Owns WiFi provisioning and the phone-facing web pages (styled like the AQUILA admin dashboard):
 *  - no/failed WiFi  -> opens "AQUILA-Setup" hotspot with a captive setup page
 *  - connected       -> serves a status/control page at http://<ip> or http://aquila-b1-001.local
 */
class DeviceUI {
public:
    DeviceUI(FlowSensor& flowSensor, StatusSnapshot& snapshot);
    void begin();    // connect (or open portal) and start the web server; call from setup()
    void handle();   // call repeatedly from its own task
    bool isPortalActive() const { return portalActive; }

private:
    FlowSensor& flow;
    StatusSnapshot& status;
    WebServer server;
    DNSServer dns;
    Preferences cfg;

    String ssid, pass, label, scanHtml;
    bool portalActive;
    bool mdnsOn;
    unsigned long lastMdnsTry;
    unsigned long buttonDownSince;

    void loadConfig();
    void clearWifi();
    bool tryConnect(unsigned long timeoutMs);
    void startPortal();
    void stopPortal();
    void scanNetworks();
    void setupRoutes();

    String head(const String& title, const String& sub);
    String foot();
    void redirect(const char* path);
    void messagePage(const String& text);
    void pageHome();
    void pageWifi();
    void handleSaveWifi();
    void handleCalibrate();
    void handleStatusJson();
};
#endif

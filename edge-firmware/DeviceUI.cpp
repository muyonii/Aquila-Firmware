#include "DeviceUI.h"
#include <ESPmDNS.h>
#include <time.h>

// Styles copied from the AQUILA admin dashboard (frontend-ui: tailwind.config.js + index.css "aq-" system)
static const char CSS[] PROGMEM =
":root{--ink:#0f1f2b;--muted:#4a5b67;--line:#dde6ec;--brand:#0c4a6e}"
"*{box-sizing:border-box}"
"body{margin:0;background:#f2f6f9;color:var(--ink);font-family:Inter,'Segoe UI',system-ui,-apple-system,sans-serif;"
"line-height:1.5;-webkit-font-smoothing:antialiased}"
".top{height:56px;display:flex;align-items:center;gap:10px;padding:0 16px;background:#fff;border-bottom:1px solid var(--line)}"
".top svg{width:20px;height:20px;fill:none;stroke:var(--brand);stroke-width:1.75;stroke-linecap:round;stroke-linejoin:round}"
".top b{font-size:1.125rem;font-weight:600;color:var(--brand);letter-spacing:-.01em}"
".top span{font-size:.8125rem;color:var(--muted);margin-left:auto}"
".wrap{max-width:560px;margin:0 auto;padding:16px 16px 40px}"
".card{background:linear-gradient(160deg,#fff 0%,#e6f0f6 100%);border:1px solid var(--line);border-radius:16px;"
"box-shadow:0 1px 2px rgba(15,31,43,.04),0 4px 12px rgba(15,31,43,.04);padding:20px;margin-bottom:16px}"
".head{display:flex;align-items:center;gap:12px;margin-bottom:16px}"
".head h1,.head h2{margin:0;font-size:1rem;font-weight:600}"
".head small{display:block;font-weight:400}"
".ico{display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;flex-shrink:0;"
"background:#fff;border:1px solid var(--line);border-radius:12px;color:var(--ink)}"
".ico svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.75;stroke-linecap:round;stroke-linejoin:round}"
".lbl,small,.note{font-size:.875rem;color:var(--muted)}"
".val{font-size:2rem;line-height:1.2;font-weight:600;color:#0f172a;font-variant-numeric:tabular-nums}"
".grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:8px}"
".tile{background:#fff;border:1px solid var(--line);border-radius:12px;padding:14px}"
".row{display:flex;justify-content:space-between;gap:12px;padding:10px 0;font-size:.9375rem}"
".row+.row{border-top:1px solid var(--line)}"
".row span:first-child{color:var(--muted)}"
".row b{font-weight:600;text-align:right;word-break:break-word}"
"input{width:100%;height:44px;padding:0 14px;margin:6px 0;background:#fff;border:1px solid #74899b;border-radius:12px;"
"font:inherit;font-size:1rem;color:var(--ink)}"
"input::placeholder{color:#5b6b77}"
"input:focus{outline:2px solid var(--brand);outline-offset:1px}"
"form{margin:0}"
".btn{display:inline-flex;align-items:center;justify-content:center;height:40px;padding:0 18px;margin:4px 8px 4px 0;"
"border:0;border-radius:12px;background:linear-gradient(180deg,#0f5c85 0%,#0c4a6e 100%);color:#fff;font:inherit;"
"font-size:.875rem;font-weight:600;cursor:pointer;text-decoration:none}"
".btn:active{filter:brightness(1.08)}"
".btn.sec{background:#fff;border:1px solid var(--line);color:var(--ink)}"
".btn.danger{background:#fff;border:1px solid var(--line);color:#be123c}"
".net{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px 14px;margin-bottom:8px;"
"background:#fff;border:1px solid var(--line);border-radius:12px;cursor:pointer}"
".net:active{background:#f4f8fb}"
".net span{font-weight:600;word-break:break-all}"
".ok{color:#059669}.off{color:#475569}.warn{color:#d97706}"
"p{margin:6px 0}"
"h3{margin:14px 0 2px;font-size:.875rem;font-weight:600}";

// lucide-style icon paths (24x24, stroke)
#define ICON_DROPLET  "<svg viewBox='0 0 24 24'><path d='M12 2.7l5.7 5.7a8 8 0 1 1-11.4 0z'/></svg>"
#define ICON_ACTIVITY "<svg viewBox='0 0 24 24'><path d='M22 12h-4l-3 9L9 3l-3 9H2'/></svg>"
#define ICON_WIFI     "<svg viewBox='0 0 24 24'><path d='M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01'/></svg>"
#define ICON_SLIDERS  "<svg viewBox='0 0 24 24'><path d='M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6'/></svg>"
#define ICON_TAG      "<svg viewBox='0 0 24 24'><path d='M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8zM7 7h.01'/></svg>"
#define ICON_GAUGE    "<svg viewBox='0 0 24 24'><path d='M12 14l4-4M3.3 19a10 10 0 1 1 17.4 0'/></svg>"

static String htmlEscape(const String& s) {
    String o;
    o.reserve(s.length() + 8);
    for (size_t i = 0; i < s.length(); i++) {
        char c = s[i];
        switch (c) {
            case '&':  o += "&amp;";  break;
            case '<':  o += "&lt;";   break;
            case '>':  o += "&gt;";   break;
            case '"':  o += "&quot;"; break;
            case '\'': o += "&#39;";  break;
            default:   o += c;
        }
    }
    return o;
}

DeviceUI::DeviceUI(FlowSensor& flowSensor, StatusSnapshot& snapshot)
    : flow(flowSensor), status(snapshot), server(80),
      portalActive(false), mdnsOn(false), lastMdnsTry(0), buttonDownSince(0) {}

// ---------------------------------------------------------------- config / wifi

void DeviceUI::loadConfig() {
    cfg.begin(NVS_CFG_NAMESPACE, false);
    if (cfg.isKey("ssid")) {            // user has saved (or wiped) WiFi through the UI
        ssid = cfg.getString("ssid", "");
        pass = cfg.getString("pass", "");
    } else {                            // first ever boot: use config.h fallback
        ssid = WIFI_SSID;
        pass = WIFI_PASSWORD;
    }
    label = cfg.getString("label", "AQUILA Node");
    cfg.end();
}

void DeviceUI::clearWifi() {
    cfg.begin(NVS_CFG_NAMESPACE, false);
    cfg.putString("ssid", "");          // empty-but-present = "open the setup portal"
    cfg.putString("pass", "");
    cfg.end();
}

bool DeviceUI::tryConnect(unsigned long timeoutMs) {
    Serial.printf("[UI] Connecting to '%s'", ssid.c_str());
    WiFi.begin(ssid.c_str(), pass.length() ? pass.c_str() : nullptr);
    unsigned long start = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - start < timeoutMs) {
        delay(250);
        Serial.print(".");
    }
    Serial.println();
    if (WiFi.status() == WL_CONNECTED) {
        Serial.printf("[UI] Connected, IP %s\n", WiFi.localIP().toString().c_str());
        return true;
    }
    Serial.println("[UI] WiFi failed -> opening setup portal");
    return false;
}

void DeviceUI::scanNetworks() {
    bool wasTrying = portalActive && ssid.length() && WiFi.status() != WL_CONNECTED;
    if (wasTrying) WiFi.disconnect();

    int n = WiFi.scanNetworks();
    scanHtml = "";
    int shown = 0;
    for (int i = 0; i < n && shown < 15; i++) {
        String s = WiFi.SSID(i);
        if (s.length() == 0) continue;
        int rssi = WiFi.RSSI(i);
        const char* strength = rssi > -60 ? "Strong" : (rssi > -75 ? "Good" : "Weak");
        String esc = htmlEscape(s);
        scanHtml += "<div class=net data-s=\"";
        scanHtml += esc;
        scanHtml += "\" onclick=\"document.getElementById('s').value=this.dataset.s\"><span>";
        scanHtml += esc;
        scanHtml += "</span><small>";
        scanHtml += strength;
        scanHtml += (WiFi.encryptionType(i) == WIFI_AUTH_OPEN) ? " &middot; Open" : " &middot; Secured";
        scanHtml += "</small></div>";
        shown++;
    }
    if (shown == 0) scanHtml = "<p class=note>No networks found. Tap Rescan.</p>";
    WiFi.scanDelete();

    if (wasTrying) WiFi.begin(ssid.c_str(), pass.length() ? pass.c_str() : nullptr);
}

void DeviceUI::startPortal() {
    WiFi.mode(WIFI_AP_STA);
    WiFi.softAP(SETUP_AP_NAME);
    delay(200);
    dns.setErrorReplyCode(DNSReplyCode::NoError);
    dns.start(53, "*", WiFi.softAPIP());   // every domain -> us (captive portal)
    portalActive = true;
    scanNetworks();
    if (ssid.length()) WiFi.begin(ssid.c_str(), pass.length() ? pass.c_str() : nullptr);
    Serial.printf("[UI] Setup portal ready. Join WiFi '%s' on your phone, then open http://%s\n",
                  SETUP_AP_NAME, WiFi.softAPIP().toString().c_str());
}

void DeviceUI::stopPortal() {
    dns.stop();
    WiFi.softAPdisconnect(true);
    WiFi.mode(WIFI_STA);
    portalActive = false;
    Serial.printf("[UI] WiFi connected, setup portal closed. IP %s\n", WiFi.localIP().toString().c_str());
}

// ---------------------------------------------------------------- lifecycle

void DeviceUI::begin() {
    pinMode(SETUP_BUTTON_PIN, INPUT_PULLUP);
    loadConfig();

    WiFi.setHostname(HOSTNAME);
    WiFi.mode(WIFI_STA);
    WiFi.setAutoReconnect(true);

    setupRoutes();

    bool ok = false;
    if (ssid.length()) ok = tryConnect(WIFI_CONNECT_TIMEOUT_MS);
    else Serial.println("[UI] No WiFi saved -> opening setup portal");
    if (!ok) startPortal();

    server.begin();
}

void DeviceUI::handle() {
    server.handleClient();

    if (portalActive) {
        dns.processNextRequest();
        if (WiFi.status() == WL_CONNECTED) stopPortal();   // saved WiFi came back
    }

    bool connected = (WiFi.status() == WL_CONNECTED);
    if (connected && !mdnsOn && millis() - lastMdnsTry > 5000) {
        lastMdnsTry = millis();
        if (MDNS.begin(HOSTNAME)) {
            MDNS.addService("http", "tcp", 80);
            mdnsOn = true;
            Serial.printf("[UI] Status page: http://%s.local  or  http://%s\n",
                          HOSTNAME, WiFi.localIP().toString().c_str());
        }
    } else if (!connected && mdnsOn) {
        MDNS.end();
        mdnsOn = false;
    }

    // Hold BOOT for 3 s while running: wipe WiFi and reopen setup
    if (digitalRead(SETUP_BUTTON_PIN) == LOW) {
        if (buttonDownSince == 0) buttonDownSince = millis();
        else if (millis() - buttonDownSince >= SETUP_BUTTON_HOLD_MS) {
            Serial.println("[UI] BOOT held: wiping WiFi, restarting into setup");
            clearWifi();
            delay(300);
            ESP.restart();
        }
    } else {
        buttonDownSince = 0;
    }
}

// ---------------------------------------------------------------- html helpers

String DeviceUI::head(const String& title, const String& sub) {
    String h;
    h.reserve(3600);
    h += F("<!DOCTYPE html><html><head><meta charset=utf-8>"
           "<meta name=viewport content='width=device-width,initial-scale=1'>"
           "<meta name=theme-color content='#0c4a6e'><title>");
    h += htmlEscape(title);
    h += F("</title><style>");
    h += CSS;
    h += F("</style></head><body><div class=top>" ICON_DROPLET "<b>AQUILA</b><span>");
    h += htmlEscape(sub);
    h += F("</span></div><div class=wrap>");
    return h;
}

String DeviceUI::foot() { return String("</div></body></html>"); }

void DeviceUI::redirect(const char* path) {
    server.sendHeader("Location", path);
    server.send(303, "text/plain", "");
}

void DeviceUI::messagePage(const String& text) {
    String h = head("AQUILA", NODE_ID);
    h += F("<div class=card><p>");
    h += htmlEscape(text);
    h += F("</p><a class=btn href=/>Back</a></div>");
    h += foot();
    server.send(200, "text/html", h);
}

// ---------------------------------------------------------------- pages

void DeviceUI::pageWifi() {
    if (scanHtml.length() == 0) scanNetworks();
    String h = head("WiFi setup", NODE_ID);
    h += F("<div class=card><div class=head><span class=ico>" ICON_WIFI "</span><div>"
           "<h1>Connect to WiFi</h1><small>2.4 GHz networks only</small></div></div>"
           "<span class=lbl>Nearby networks &mdash; tap one</span><div style='margin-top:8px'>");
    h += scanHtml;
    h += F("</div><a class='btn sec' href=/rescan>Rescan</a></div>"
           "<div class=card><form method=POST action=/savewifi>"
           "<h3>Network name</h3><input id=s name=ssid placeholder='WiFi name' required>"
           "<h3>Password</h3><input name=pass type=password placeholder='WiFi password'>"
           "<h3>Device name (optional)</h3><input name=label maxlength=24 value=\"");
    h += htmlEscape(label);
    h += F("\"><div style='margin-top:12px'><button class=btn>Save &amp; connect</button>");
    if (!portalActive) h += F("<a class='btn sec' href=/>Cancel</a>");
    h += F("</div></form></div>");
    h += foot();
    server.send(200, "text/html", h);
}

void DeviceUI::pageHome() {
    float fl = status.flowLpm;
    float tl = status.totalLiters;
    float bv = status.batteryVolts;
    uint32_t bl = status.backlog;
    bool cloud = status.cloudOk;

    String tstr = "Not synced";
    time_t now;
    time(&now);
    if ((uint32_t)now >= MINIMUM_VALID_TIMESTAMP) {
        struct tm t;
        localtime_r(&now, &t);
        char buf[24];
        strftime(buf, sizeof(buf), "%Y-%m-%d %H:%M:%S", &t);
        tstr = buf;
    }

    String sub = NODE_ID;
    String h = head(label, sub);

    // ---- Live readings
    h += F("<div class=card><div class=head><span class=ico>" ICON_ACTIVITY "</span><div><h1>");
    h += htmlEscape(label);
    h += F("</h1><small>Live readings &middot; updates every 15 s</small></div></div>"
           "<div class=grid><div class=tile><span class=lbl>Flow rate</span><div class=val><span id=f>");
    h += String(fl, 2);
    h += F("</span></div><small>L/min</small></div><div class=tile><span class=lbl>Total used</span>"
           "<div class=val><span id=t>");
    h += String(tl, 3);
    h += F("</span></div><small>liters</small></div></div>"
           "<div class=row><span>Cloud</span><b id=c class=");
    h += cloud ? "ok>&#9679; Connected" : "off>&#9679; Offline";
    h += F("</b></div><div class=row><span>Battery</span><b id=b>");
#if BATTERY_SENSOR_INSTALLED
    h += String(bv, 2);
    h += F(" V");
#else
    h += F("Not installed");
#endif
    h += F("</b></div><div class=row><span>Offline backlog</span><b><span id=q>");
    h += String((unsigned long)bl);
    h += F("</span> readings</b></div></div>");

    // ---- Device
    h += F("<div class=card><div class=head><span class=ico>" ICON_WIFI "</span><div><h2>Device</h2></div></div>"
           "<div class=row><span>WiFi</span><b>");
    h += htmlEscape(WiFi.SSID());
    h += F(" (");
    h += String(WiFi.RSSI());
    h += F(" dBm)</b></div><div class=row><span>IP address</span><b>");
    h += WiFi.localIP().toString();
    h += F("</b></div><div class=row><span>Time</span><b>");
    h += tstr;
    h += F("</b></div><div class=row><span>Uptime</span><b>");
    h += String(millis() / 60000UL);
    h += F(" min</b></div><div class=row><span>Free memory</span><b>");
    h += String(ESP.getFreeHeap() / 1024);
    h += F(" KB</b></div>"
           "<p class=note style='margin-top:10px'>Node status and location are managed from the admin dashboard.</p></div>");

    // ---- Device name
    h += F("<div class=card><div class=head><span class=ico>" ICON_TAG "</span><div><h2>Device name</h2>"
           "<small>Shown on this page only</small></div></div>"
           "<form method=POST action=/label><input name=label maxlength=24 value=\"");
    h += htmlEscape(label);
    h += F("\"><button class=btn>Save name</button></form></div>");

    // ---- Calibration
    h += F("<div class=card><div class=head><span class=ico>" ICON_GAUGE "</span><div><h2>Flow calibration</h2>"
           "<small>Pulses per liter: <b>");
    h += String(flow.getPulsesPerLiter(), 1);
    h += F("</b> &middot; Test pulses: <b id=p>");
    h += String((unsigned long)flow.getTestPulses());
    h += F("</b></small></div></div>"
           "<form method=POST action=/zero><button class='btn sec'>1. Zero test counter</button></form>"
           "<p class=note>2. Pour an exact, known amount of water through the sensor.</p>"
           "<form method=POST action=/calibrate><input name=liters type=number step=any min=0.1 "
           "placeholder='3. Liters poured'><button class=btn>Calibrate</button></form>"
           "<h3>Or set pulses per liter directly</h3>"
           "<form method=POST action=/ppl><input name=ppl type=number step=any placeholder='e.g. 450'>"
           "<button class='btn sec'>Set</button></form></div>");

    // ---- Controls
    h += F("<div class=card><div class=head><span class=ico>" ICON_SLIDERS "</span><div><h2>Controls</h2></div></div>"
           "<a class='btn sec' href=/wifi>Change WiFi</a>"
           "<form method=POST action=/reset-odometer style='display:inline' "
           "onsubmit=\"return confirm('Reset total liters to 0?')\"><button class='btn danger'>Reset total liters</button></form>"
           "<form method=POST action=/forget style='display:inline' "
           "onsubmit=\"return confirm('Forget WiFi and reopen setup?')\"><button class='btn danger'>Forget WiFi</button></form></div>");

    h += F("<script>const $=i=>document.getElementById(i),BI=");
    h += BATTERY_SENSOR_INSTALLED ? "true" : "false";
    h += F(";async function u(){try{const j=await(await fetch('/status.json')).json();"
           "$('f').textContent=j.flow.toFixed(2);$('t').textContent=j.total.toFixed(3);"
           "if(BI)$('b').textContent=j.batt.toFixed(2)+' V';"
           "$('c').className=j.cloud?'ok':'off';$('c').innerHTML=j.cloud?'&#9679; Connected':'&#9679; Offline';"
           "$('q').textContent=j.backlog;$('p').textContent=j.pulses;}catch(e){}}"
           "setInterval(u,3000);</script>");
    h += foot();
    server.send(200, "text/html", h);
}

// ---------------------------------------------------------------- handlers

void DeviceUI::handleSaveWifi() {
    String s = server.arg("ssid");
    String p = server.arg("pass");
    String l = server.arg("label");
    s.trim();
    l.trim();
    if (s.length() == 0) { server.send(400, "text/plain", "Network name required"); return; }

    cfg.begin(NVS_CFG_NAMESPACE, false);
    cfg.putString("ssid", s);
    cfg.putString("pass", p);
    if (l.length()) cfg.putString("label", l);
    cfg.end();

    String h = head("Saved", NODE_ID);
    h += F("<div class=card><div class=head><span class=ico>" ICON_WIFI "</span><div><h1>Saved</h1></div></div>"
           "<p>Restarting and connecting to <b>");
    h += htmlEscape(s);
    h += F("</b>.</p><p class=note>Reconnect your phone to your normal WiFi, then open "
           "<b>http://" HOSTNAME ".local</b> (or check the Serial Monitor for the IP).</p></div>");
    h += foot();
    server.send(200, "text/html", h);
    delay(1500);
    ESP.restart();
}

void DeviceUI::handleCalibrate() {
    float liters = server.arg("liters").toFloat();
    uint32_t pulses = flow.getTestPulses();
    if (liters <= 0.0f || pulses < 10) {
        messagePage("Need liters greater than 0 and at least 10 test pulses. Zero the counter, pour, then try again.");
        return;
    }
    float ppl = pulses / liters;
    if (!flow.setPulsesPerLiter(ppl)) {
        messagePage("That gives " + String(ppl, 1) + " pulses/L, which looks wrong (allowed 50-5000). Check the pour and try again.");
        return;
    }
    flow.resetTestPulses();
    redirect("/");
}

void DeviceUI::handleStatusJson() {
    char buf[200];
    snprintf(buf, sizeof(buf),
             "{\"flow\":%.2f,\"total\":%.3f,\"batt\":%.2f,\"cloud\":%s,\"backlog\":%lu,\"pulses\":%lu}",
             (double)status.flowLpm, (double)status.totalLiters, (double)status.batteryVolts,
             status.cloudOk ? "true" : "false",
             (unsigned long)status.backlog, (unsigned long)flow.getTestPulses());
    server.send(200, "application/json", buf);
}

void DeviceUI::setupRoutes() {
    server.on("/", HTTP_GET, [this]() {
        if (portalActive) pageWifi(); else pageHome();
    });
    server.on("/wifi", HTTP_GET, [this]() { pageWifi(); });
    server.on("/rescan", HTTP_GET, [this]() { scanNetworks(); redirect("/wifi"); });
    server.on("/status.json", HTTP_GET, [this]() { handleStatusJson(); });

    server.on("/savewifi", HTTP_POST, [this]() { handleSaveWifi(); });

    server.on("/label", HTTP_POST, [this]() {
        String l = server.arg("label");
        l.trim();
        if (l.length()) {
            label = l;
            cfg.begin(NVS_CFG_NAMESPACE, false);
            cfg.putString("label", l);
            cfg.end();
        }
        redirect("/");
    });

    server.on("/zero", HTTP_POST, [this]() { flow.resetTestPulses(); redirect("/"); });
    server.on("/calibrate", HTTP_POST, [this]() { handleCalibrate(); });
    server.on("/ppl", HTTP_POST, [this]() {
        if (!flow.setPulsesPerLiter(server.arg("ppl").toFloat())) {
            messagePage("Pulses per liter must be between 50 and 5000.");
            return;
        }
        redirect("/");
    });

    server.on("/reset-odometer", HTTP_POST, [this]() {
        status.resetOdometerRequested = true;   // sensing task performs the reset
        redirect("/");
    });

    server.on("/forget", HTTP_POST, [this]() {
        clearWifi();
        server.send(200, "text/html", head("Restarting", NODE_ID) +
                    "<div class=card><p>WiFi forgotten. Restarting into setup mode. "
                    "Join the <b>" SETUP_AP_NAME "</b> WiFi to set it up again.</p></div>" + foot());
        delay(1500);
        ESP.restart();
    });

    server.onNotFound([this]() {
        if (portalActive) {   // captive-portal detection URLs land here -> send phone to setup page
            server.sendHeader("Location", String("http://") + WiFi.softAPIP().toString() + "/");
            server.send(302, "text/plain", "");
        } else {
            server.send(404, "text/plain", "Not found");
        }
    });
}

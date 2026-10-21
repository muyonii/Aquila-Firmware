// AQUILA NODE-B1-001 master config (Arduino IDE flat layout)
#ifndef CONFIG_H
#define CONFIG_H
#include <stdint.h>

// 1. Identity
#define NODE_ID "NODE-B1-001"
#define IS_SIMULATED false

// 2. Pins
#define FLOW_SENSOR_PIN 35      // CHANGED from boss's 4: your working wiring. GPIO35 is input-only, NO internal pull-up
#define BATTERY_ADC_PIN 34
#define STATUS_LED_PIN 2

// 3. Flow sensor (YF-S201)
#define FLOW_CALIBRATION_FACTOR 7.5f
#define PULSES_PER_LITER 450.0f
#define MECHANICAL_FLOOR_LPM 1.0f
#define MAX_HYDRAULIC_CAPACITY_LPM 45.0f
#define PULSE_DEBOUNCE_US 1000  // from your working sketch

// 4. Battery
// Set true only after the 100k/100k divider is wired to GPIO34.
// While false, battery_voltage is reported as 0.0 (allowed by Firebase rules).
#define BATTERY_SENSOR_INSTALLED false
#define VOLTAGE_DIVIDER_RATIO 2.0f
#define LOW_BATTERY_THRESHOLD_VOLTS 3.35f

// 5. Timing
#define TELEMETRY_INTERVAL_MS 15000
#define NVS_COMMIT_VOLUME_DELTA_LITERS 1.0f
#define SEQUENCE_COMMIT_EVERY 10   // sequence saved every N packets; boot jumps ahead by N so it never repeats
#define BACKLOG_DRAIN_PER_CYCLE 20

// 6. Offline storage
#define LITTLEFS_BACKLOG_FILE "/backlog.bin"
#define MAX_OFFLINE_BUFFER_RECORDS 2000
#define NVS_NAMESPACE "aquila_meter"
#define NVS_KEY_ODOMETER "total_liters"
#define NVS_KEY_SEQUENCE "pkt_sequence"

// 7. WiFi & Firebase
// Fallback WiFi used only until you save one through the setup page
#define WIFI_SSID "Loading..."
#define WIFI_PASSWORD "gigabyte135"
#define FIREBASE_HOST "aquila-system-default-rtdb.asia-southeast1.firebasedatabase.app"
#define FIREBASE_TELEMETRY_PATH "/nodes/NODE-B1-001/telemetry.json"
#define FIREBASE_STATUS_PATH    "/nodes/NODE-B1-001/status.json"

#define NTP_TIMEZONE_OFFSET_SEC 28800
#define NTP_DAYLIGHT_OFFSET_SEC 0
#define NTP_SERVER_PRIMARY   "pool.ntp.org"
#define NTP_SERVER_SECONDARY "time.google.com"
#define NTP_SERVER_TERTIARY  "time.nist.gov"
#define MINIMUM_VALID_TIMESTAMP 1600000000UL


// 8. Setup portal & web UI
#define SETUP_AP_NAME "AQUILA-Setup"        // hotspot the ESP32 opens when it has no WiFi
#define SETUP_BUTTON_PIN 0                  // BOOT button on most ESP32 dev boards
#define SETUP_BUTTON_HOLD_MS 3000           // hold while running to wipe WiFi and reopen setup
#define WIFI_CONNECT_TIMEOUT_MS 20000
#define HOSTNAME "aquila-b1-001"            // reachable at http://aquila-b1-001.local
#define NVS_CFG_NAMESPACE "aquila_cfg"      // WiFi + device name live here
#define NVS_KEY_PPL "ppl"                   // calibrated pulses-per-liter (in NVS_NAMESPACE)
#define STALE_TELEMETRY_TIMEOUT_SECONDS 45  // backend marks a node OFFLINE after this; older backlog is not replayed

#endif

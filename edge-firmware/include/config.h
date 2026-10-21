/**
 * ==============================================================================
 * Project: AQUILA (BPSU BSCS 2026)
 * File: edge-firmware/include/config.h
 * Description: Master configuration header for physical edge node NODE-B1-001.
 *              Centralizes all pinouts, calibration factors, timing intervals,
 *              and cloud credentials to prevent magic numbers in source files.
 * ==============================================================================
 */

#ifndef CONFIG_H
#define CONFIG_H

#include <stdint.h>

// ==============================================================================
// 1. NODE IDENTITY
// ==============================================================================
// Hardware identifier matching seed_demo_nodes.sql and database.rules.json
#define NODE_ID "NODE-B1-001"

// Node classification flag (false = physical edge device, true = synthetic feeder)
#define IS_SIMULATED false

// ==============================================================================
// 2. HARDWARE PIN ASSIGNMENTS (ESP32-WROOM-32)
// ==============================================================================
// YF-S201 Flow Sensor (Yellow Signal Wire)
// Uses GPIO 4 with hardware interrupt (INPUT_PULLUP)
#define FLOW_SENSOR_PIN 4

// 18650 Li-ion Battery Voltage Divider Tap
// Uses GPIO 34 (ADC1_CH6). Note: GPIO 34 is an input-only pin, ideal for ADC.
#define BATTERY_ADC_PIN 34

// Onboard System Status / Network Activity LED
// GPIO 2 is the standard onboard blue LED on most ESP32 Dev Modules
#define STATUS_LED_PIN 2

// ==============================================================================
// 3. FLUID DYNAMICS & SENSOR CALIBRATION (YF-S201)
// ==============================================================================
// Standard turbine equation: Frequency (Hz) = 7.5 * Q (L/min)
#define FLOW_CALIBRATION_FACTOR 7.5f

// Total electrical pulses generated per 1.0 Liter of water passing the impeller
// 7.5 Hz * 60 seconds = 450 pulses per Liter
#define PULSES_PER_LITER 450.0f

// Rule EXC-02: Mechanical Inertia Noise Floor
// Fluid velocity below 1.0 L/min cannot overcome static magnetic cogging torque.
// Readings below this threshold are filtered to 0.00 L/min to eliminate jitter.
#define MECHANICAL_FLOOR_LPM 1.0f

// Maximum hydraulic conduit capacity threshold (enforced by Firebase rules)
#define MAX_HYDRAULIC_CAPACITY_LPM 45.0f

// ==============================================================================
// 4. POWER & BATTERY SENSING (18650 Li-ion)
// ==============================================================================
// Voltage divider: R1 = 100kΩ, R2 = 100kΩ
// Divider Ratio = (R1 + R2) / R2 = (100k + 100k) / 100k = 2.0
#define VOLTAGE_DIVIDER_RATIO 2.0f

// ESP32 ADC Reference Voltage (calibrated with 11dB attenuation)
#define ADC_REFERENCE_VOLTAGE 3.3f
#define ADC_MAX_RESOLUTION 4095.0f

// Low-battery alarm threshold (matches .env LOW_BATTERY_THRESHOLD_VOLTS)
#define LOW_BATTERY_THRESHOLD_VOLTS 3.35f

// ==============================================================================
// 5. TIMING & SCHEDULING (TELEMETRY & WATCHDOG)
// ==============================================================================
// 15-second reporting cycle (matches TELEMETRY_INTERVAL_SECONDS in MAS engine)
#define TELEMETRY_INTERVAL_MS 15000

// Minimum volume advance required before committing odometer to NVS
// Prevents flash memory wear-out (avoids writing to flash every 15 seconds)
#define NVS_COMMIT_VOLUME_DELTA_LITERS 1.0f

// ==============================================================================
// 6. OFFLINE STORAGE & FILESYSTEM (LittleFS)
// ==============================================================================
// File path storing binary-serialized TelemetryPayload records
#define LITTLEFS_BACKLOG_FILE "/backlog.bin"

// Temporary file used during FIFO queue pop operations
#define LITTLEFS_TEMP_FILE "/backlog.tmp"

// Maximum offline records cached (2000 records * 15s ≈ 8.33 hours of offline data)
#define MAX_OFFLINE_BUFFER_RECORDS 2000

// NVS namespace for persistent total volume counter (Preferences.h)
#define NVS_NAMESPACE "aquila_meter"
#define NVS_KEY_ODOMETER "total_liters"
#define NVS_KEY_SEQUENCE "pkt_sequence"

// ==============================================================================
// 7. WI-FI & CLOUD CONFIGURATION (Firebase RTDB)
// ==============================================================================
// TODO: Replace with your actual local Wi-Fi SSID / mobile hotspot
#define WIFI_SSID "YOUR_WIFI_SSID"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"

// Target Firebase Realtime Database Host (without https:// prefix)
#define FIREBASE_HOST "aquila-system-default-rtdb.asia-southeast1.firebasedatabase.app"

// Firebase REST API endpoints for physical Node 01
#define FIREBASE_TELEMETRY_PATH "/nodes/NODE-B1-001/telemetry.json"
#define FIREBASE_STATUS_PATH    "/nodes/NODE-B1-001/status.json"

// Philippine Standard Time (PST) UTC+8 in seconds: 8 * 3600 = 28800
#define NTP_TIMEZONE_OFFSET_SEC 28800
#define NTP_DAYLIGHT_OFFSET_SEC 0

// Primary and fallback SNTP time servers
#define NTP_SERVER_PRIMARY   "pool.ntp.org"
#define NTP_SERVER_SECONDARY "time.google.com"
#define NTP_SERVER_TERTIARY  "time.nist.gov"

// Minimum valid Unix epoch timestamp (enforced by Firebase rules: > 1600000000)
#define MINIMUM_VALID_TIMESTAMP 1600000000UL

#endif // CONFIG_H
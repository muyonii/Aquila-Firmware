#include <Arduino.h>
#include "config.h"
#include "telemetry_payload.h"
#include "status_snapshot.h"

#include "ISensor.h"
#include "IStorageBuffer.h"
#include "ITelemetryPublisher.h"

#include "FlowSensor.h"
#include "BatteryMonitor.h"
#include "CircularFlashBuffer.h"
#include "FirebasePublisher.h"
#include "DeviceUI.h"

FlowSensor flowMeter(FLOW_SENSOR_PIN, FLOW_CALIBRATION_FACTOR, PULSES_PER_LITER);
BatteryMonitor batterySensor(BATTERY_ADC_PIN, VOLTAGE_DIVIDER_RATIO);
CircularFlashBuffer offlineQueue(LITTLEFS_BACKLOG_FILE, MAX_OFFLINE_BUFFER_RECORDS);
FirebasePublisher cloudPublisher(FIREBASE_HOST);

StatusSnapshot g_status;
DeviceUI ui(flowMeter, g_status);

ISensor* pFlowSensor = &flowMeter;
ISensor* pBatterySensor = &batterySensor;
IStorageBuffer* pStorage = &offlineQueue;
ITelemetryPublisher* pPublisher = &cloudPublisher;

QueueHandle_t telemetryQueue;
uint32_t g_sequence = 1;

static void saveSequence(uint32_t seq) {
    Preferences p;
    if (p.begin(NVS_NAMESPACE, false)) {
        p.putUInt(NVS_KEY_SEQUENCE, seq);
        p.end();
    }
}

static uint32_t loadSequenceStart() {
    Preferences p;
    uint32_t stored = 0;
    if (p.begin(NVS_NAMESPACE, false)) {
        stored = p.getUInt(NVS_KEY_SEQUENCE, 0);
        p.end();
    }
    uint32_t start = stored + SEQUENCE_COMMIT_EVERY;
    saveSequence(start);
    return start;
}

// ---------------- CORE 1: sensing ----------------
void sensingTask(void* pvParameters) {
    unsigned long lastTick = millis();

    while (true) {
        if (g_status.resetOdometerRequested) {          // requested from the phone page
            flowMeter.resetOdometer();
            g_status.totalLiters = 0.0f;
            g_status.resetOdometerRequested = false;
        }

        unsigned long now = millis();
        if (now - lastTick >= TELEMETRY_INTERVAL_MS) {
            lastTick = now;

            float flowLPM      = pFlowSensor->read();
            float batteryVolts = pBatterySensor->read();
            float cumulativeL  = flowMeter.getCumulativeLiters();
            uint32_t epochTime = pPublisher->getSynchronizedTimestamp();

            g_status.flowLpm = flowLPM;
            g_status.totalLiters = cumulativeL;
            g_status.batteryVolts = batteryVolts;

            if (epochTime == 0) {
                Serial.println("[SENSE] NTP not synced yet, skipping packet");
            } else {
                TelemetryPayload packet(NODE_ID, g_sequence, epochTime,
                                        flowLPM, cumulativeL, batteryVolts, IS_SIMULATED);
                if (!packet.isValid()) {
                    Serial.println("[SENSE] Packet failed validation, dropped");
                } else {
                    Serial.printf("[SENSE] seq=%lu flow=%.2f L/min total=%.3f L\n",
                                  (unsigned long)packet.packet_sequence, flowLPM, cumulativeL);
                    if (xQueueSend(telemetryQueue, &packet, pdMS_TO_TICKS(50)) != pdTRUE) {
                        Serial.println("[SENSE] Queue full, packet dropped");
                    }
                    g_status.sequence = g_sequence;
                    g_status.lastTimestamp = epochTime;
                    g_sequence++;
                    if (g_sequence % SEQUENCE_COMMIT_EVERY == 0) saveSequence(g_sequence);
                }
            }
        }
        vTaskDelay(pdMS_TO_TICKS(100));
    }
}

// ---------------- CORE 0: networking ----------------
void networkingTask(void* pvParameters) {
    TelemetryPayload packet;

    while (true) {
        if (!pPublisher->isConnected()) g_status.cloudOk = false;

        if (xQueueReceive(telemetryQueue, &packet, pdMS_TO_TICKS(1000)) == pdTRUE) {
            if (pPublisher->isConnected()) {
                // Replay only records the backend would still call "fresh". The cloud keeps just the
                // latest reading, and a stale timestamp makes the agents flag the node OFFLINE and
                // reset their fairness baseline, so anything older than the stale timeout is dropped.
                uint8_t drained = 0;
                uint16_t discarded = 0;
                while (!pStorage->isEmpty() && drained < BACKLOG_DRAIN_PER_CYCLE) {
                    TelemetryPayload backlogged;
                    if (!pStorage->pop(backlogged)) break;

                    uint32_t nowEpoch = pPublisher->getSynchronizedTimestamp();
                    bool stale = (nowEpoch == 0) ||
                                 ((int32_t)(nowEpoch - backlogged.timestamp) > STALE_TELEMETRY_TIMEOUT_SECONDS);
                    if (stale) { discarded++; continue; }

                    if (!pPublisher->publish(backlogged)) {
                        pStorage->push(backlogged);
                        break;
                    }
                    drained++;
                    vTaskDelay(pdMS_TO_TICKS(50));
                }
                if (discarded) Serial.printf("[NET] Dropped %u stale offline readings\n", discarded);

                if (pPublisher->publish(packet)) {
                    g_status.cloudOk = true;
                } else {
                    g_status.cloudOk = false;
                    pStorage->push(packet);
                }
            } else {
                pStorage->push(packet);
                Serial.printf("[NET] Offline, spooled. Backlog=%lu\n", (unsigned long)pStorage->count());
            }
        }

        g_status.backlog = pStorage->count();
        vTaskDelay(pdMS_TO_TICKS(10));
    }
}

// ---------------- CORE 0: phone web page ----------------
void uiTask(void* pvParameters) {
    while (true) {
        ui.handle();
        vTaskDelay(pdMS_TO_TICKS(5));
    }
}

void setup() {
    Serial.begin(115200);
    Serial.println("\n[AQUILA] NODE-B1-001 starting...");

    pFlowSensor->begin();
    pBatterySensor->begin();
    if (!pStorage->begin()) Serial.println("[AQUILA] LittleFS mount FAILED");
    ui.begin();                         // connects WiFi, or opens the setup hotspot
    pPublisher->begin();
    g_sequence = loadSequenceStart();

    telemetryQueue = xQueueCreate(10, sizeof(TelemetryPayload));

    xTaskCreatePinnedToCore(sensingTask, "SensingTask", 4096, NULL, 2, NULL, 1);
    xTaskCreatePinnedToCore(networkingTask, "NetworkingTask", 12288, NULL, 1, NULL, 0);
    xTaskCreatePinnedToCore(uiTask, "UITask", 8192, NULL, 1, NULL, 0);

    Serial.println("[AQUILA] Running.");
}

void loop() {
    vTaskDelete(NULL);
}

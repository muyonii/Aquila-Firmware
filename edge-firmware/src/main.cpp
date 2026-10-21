#include <Arduino.h>
#include "config.h"
#include "telemetry_payload.h"

// Interfaces
#include "interfaces/ISensor.h"
#include "interfaces/IStorageBuffer.h"
#include "interfaces/ITelemetryPublisher.h"

// Concrete Implementations
#include "FlowSensor.h"
#include "BatteryMonitor.h"
#include "CircularFlashBuffer.h"
#include "NetworkClient.h"

// OOP Principle: DEPENDENCY INVERSION
// Instantiate objects, but orchestrate them using pointers to their interfaces
FlowSensor flowMeter(FLOW_SENSOR_PIN, FLOW_CALIBRATION_FACTOR, PULSES_PER_LITER);
BatteryMonitor batterySensor(BATTERY_ADC_PIN, VOLTAGE_DIVIDER_RATIO);
CircularFlashBuffer offlineQueue("/backlog.bin", 2000);
NetworkClient cloudPublisher(WIFI_SSID, WIFI_PASSWORD, FIREBASE_HOST);

// Polymorphic Interface Pointers
ISensor* pFlowSensor = &flowMeter;
ISensor* pBatterySensor = &batterySensor;
IStorageBuffer* pStorage = &offlineQueue;
ITelemetryPublisher* pPublisher = &cloudPublisher;

// FreeRTOS Queue Handle
QueueHandle_t telemetryQueue;

// ==============================================================================
// CORE 1 TASK: SENSING & DATA CONTRACT CREATION
// ==============================================================================
void sensingTask(void* pvParameters) {
    uint32_t sequence = 1;
    unsigned long lastTick = millis();

    while (true) {
        unsigned long now = millis();
        if (now - lastTick >= TELEMETRY_INTERVAL_MS) {
            lastTick = now;

            // Polymorphic reads via ISensor interface
            float flowLPM = pFlowSensor->read();
            float batteryVolts = pBatterySensor->read();
            float cumulativeL = flowMeter.getCumulativeLiters();
            uint32_t epochTime = pPublisher->getSynchronizedTimestamp();

            // Assemble DTO
            TelemetryPayload packet;
            strncpy(packet.node_id, NODE_ID, sizeof(packet.node_id));
            packet.packet_sequence = sequence++;
            packet.timestamp = epochTime;
            packet.flow_rate_lpm = flowLPM;
            packet.cumulative_liters = cumulativeL;
            packet.battery_voltage = batteryVolts;
            packet.is_simulated = false;

            // Enqueue thread-safely
            xQueueSend(telemetryQueue, &packet, pdMS_TO_TICKS(50));
        }

        vTaskDelay(pdMS_TO_TICKS(100));
    }
}

// ==============================================================================
// CORE 0 TASK: NETWORKING, QUEUE DRAINING & DISPATCH
// ==============================================================================
void networkingTask(void* pvParameters) {
    TelemetryPayload packet;

    while (true) {
        if (xQueueReceive(telemetryQueue, &packet, pdMS_TO_TICKS(1000)) == pdTRUE) {
            
            if (pPublisher->isConnected()) {
                // Drain offline backlog first (FIFO order)
                while (!pStorage->isEmpty()) {
                    TelemetryPayload backlogged;
                    if (pStorage->pop(backlogged)) {
                        pPublisher->publish(backlogged);
                        vTaskDelay(pdMS_TO_TICKS(50));
                    }
                }

                // Publish live telemetry
                pPublisher->publish(packet);
            } else {
                // Network unavailable: Spool to flash storage buffer
                pStorage->push(packet);
            }
        }

        // Reset Task Watchdog (TWDT)
        vTaskDelay(pdMS_TO_TICKS(10));
    }
}

void setup() {
    Serial.begin(115200);
    Serial.println("\n[AQUILA] Initializing OOP Embedded Architecture...");

    // Polymorphic initialization
    pFlowSensor->begin();
    pBatterySensor->begin();
    pStorage->begin();
    pPublisher->begin();

    // Create FreeRTOS Queue (10 items)
    telemetryQueue = xQueueCreate(10, sizeof(TelemetryPayload));

    // Launch Dual-Core Tasks
    xTaskCreatePinnedToCore(sensingTask, "SensingTask", 4096, NULL, 2, NULL, 1);
    xTaskCreatePinnedToCore(networkingTask, "NetworkingTask", 8192, NULL, 1, NULL, 0);

    Serial.println("[AQUILA] System Running via Abstracted Interfaces.");
}

void loop() {
    vTaskDelete(NULL); // FreeRTOS manages execution
}